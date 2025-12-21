from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from core.models import AuditMixin, Branch, User
from customers.models import Customer
from inventory.models import Product
import uuid
from django.db import transaction
from inventory.models import StockMovement
from customers.models import LoyaltyTransaction
from django.utils import timezone
import hashlib
import shutil
import qrcode
import io
import base64


class Discount(AuditMixin):
    DISCOUNT_TYPES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]
    
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES)
    value = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    
    applicable_products = models.ManyToManyField(Product, blank=True, help_text="Leave empty for all products")
    min_purchase_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    requires_approval = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    max_uses = models.IntegerField(null=True, blank=True, help_text="Leave empty for unlimited")
    times_used = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def is_valid(self):
        from django.utils import timezone
        now = timezone.now()
        if not self.is_active:
            return False
        if now < self.start_date or now > self.end_date:
            return False
        if self.max_uses and self.times_used >= self.max_uses:
            return False
        return True


class Sale(AuditMixin):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    sale_number = models.CharField(max_length=50, unique=True, db_index=True)
    
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name='sales', null=True, blank=True)
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sales_as_cashier')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    shift = models.ForeignKey('shifts.Shift', on_delete=models.SET_NULL, null=True, related_name='sales')
    
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sale_number']),
            models.Index(fields=['branch', '-created_at']),
            models.Index(fields=['cashier', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"Sale {self.sale_number} - KES {self.total_amount}"
    
    def save(self, *args, **kwargs):
        if not self.sale_number:
            self.sale_number = f"SALE-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

    # eTIMS / KRA related fields
    etims_response = models.JSONField(null=True, blank=True)
    rcpt_signature = models.CharField(max_length=500, null=True, blank=True)
    etims_qr = models.TextField(null=True, blank=True)
    etims_qr_image = models.TextField(null=True, blank=True)
    etims_submitted = models.BooleanField(default=False)
    etims_submitted_at = models.DateTimeField(null=True, blank=True)

    @transaction.atomic
    def finalize(self, user=None):
        """Finalize the sale: decrement stock, create stock movements, award points, and update shift totals.
        Safe to call multiple times; if already completed, it's a no-op.
        """
        if self.status == 'completed':
            return

        # Decrement stock and create movements
        for item in self.items.select_related('product').all():
            if not item.is_ad_hoc and item.product:
                product = Product.objects.select_for_update().get(id=item.product.id)
                if product.stock_quantity < item.quantity:
                    raise ValueError(f'Insufficient stock for {product.name}.')
                previous_quantity = product.stock_quantity
                product.stock_quantity -= item.quantity
                product.save()

                StockMovement.objects.create(
                    product=product,
                    movement_type='sale',
                    quantity=-item.quantity,
                    previous_quantity=previous_quantity,
                    new_quantity=product.stock_quantity,
                    reason=f'Sale {self.sale_number}',
                    reference_id=self.sale_number,
                    branch=self.branch or product.branch,
                    created_by=user
                )

        # Award loyalty points
        if self.customer:
            points_earned = int(self.total_amount / 100)
            if points_earned > 0:
                previous_points = self.customer.total_points
                self.customer.total_points += points_earned
                self.customer.lifetime_purchases += self.total_amount
                self.customer.save()

                LoyaltyTransaction.objects.create(
                    customer=self.customer,
                    points=points_earned,
                    transaction_type='earn',
                    sale=self,
                    description=f'Earned from sale {self.sale_number}',
                    previous_points=previous_points,
                    new_points=self.customer.total_points,
                    created_by=user
                )

                self.customer.update_tier()

        # Mark sale completed and update shift totals
        self.status = 'completed'
        self.save()

        if self.shift:
            self.shift.total_sales += self.total_amount
            self.shift.total_transactions += 1
            self.shift.save()

    def simulate_etims(self):
        """Create a simulated eTIMS response (for testing / sandbox).
        Populates `etims_response`, `rcpt_signature`, `etims_qr`, and timestamps.
        """
        if self.etims_response:
            return self.etims_response

        # Create a deterministic but unique signature-like string
        seed = f"{self.sale_number}-{self.total_amount}-{self.created_at.isoformat() if self.created_at else timezone.now().isoformat()}"
        sig = hashlib.sha256(seed.encode('utf-8')).hexdigest().upper()[:64]
        rcpt_sig = f"RCPT-{sig}"

        qr_payload = f"KRA|{self.sale_number}|{self.total_amount}|{self.cashier_id if self.cashier_id else ''}|{self.created_at.isoformat() if self.created_at else timezone.now().isoformat()}"

        response = {
            'resultCd': '000',
            'resultDesc': 'Success - simulated',
            'RcptSignature': rcpt_sig,
            'RcptDate': (self.created_at or timezone.now()).isoformat(),
            'QRCodePayload': qr_payload,
        }

        # generate QR image (PNG) and store as data URL
        try:
            qr = qrcode.QRCode(box_size=3, border=2)
            qr.add_data(qr_payload)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            b64 = base64.b64encode(buf.getvalue()).decode('ascii')
            data_url = f'data:image/png;base64,{b64}'
            self.etims_qr_image = data_url
        except Exception:
            self.etims_qr_image = None

        self.etims_response = response
        self.rcpt_signature = rcpt_sig
        self.etims_qr = qr_payload
        self.etims_submitted = True
        self.etims_submitted_at = timezone.now()
        self.save()
        return response


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    
    is_ad_hoc = models.BooleanField(default=False, help_text="Item added without product barcode")
    ad_hoc_name = models.CharField(max_length=300, blank=True)
    
    class Meta:
        ordering = ['id']
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
    
    def calculate_totals(self):
        self.subtotal = (self.unit_price * self.quantity) - self.discount
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        return self.subtotal + self.tax_amount


class Return(AuditMixin):
    original_sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name='returns')
    return_number = models.CharField(max_length=50, unique=True)
    
    items_returned = models.JSONField(help_text="List of returned items with quantities")
    refund_amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    reason = models.TextField()
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    
    manager_approval = models.ForeignKey(User, on_delete=models.PROTECT, related_name='approved_returns')
    approved_at = models.DateTimeField()
    
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='returns')
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['return_number']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"Return {self.return_number} for Sale {self.original_sale.sale_number}"
    
    def save(self, *args, **kwargs):
        if not self.return_number:
            self.return_number = f"RTN-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)
