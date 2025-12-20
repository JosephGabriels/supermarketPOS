from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from core.models import AuditMixin, Branch, User
from customers.models import Customer
from inventory.models import Product
import uuid


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
