from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import AuditMixin, Branch, User, Category
from suppliers.models import Supplier


class Product(AuditMixin):
    name = models.CharField(max_length=300)
    barcode = models.CharField(max_length=100, unique=True, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    description = models.TextField(blank=True)
    
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], help_text="Wholesale/purchase price")
    
    stock_quantity = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    reorder_level = models.IntegerField(default=10, help_text="Alert when stock falls below this level")
    
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='products')
    
    is_active = models.BooleanField(default=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="VAT percentage")
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['barcode']),
            models.Index(fields=['name']),
            models.Index(fields=['branch', 'is_active']),
        ]
        unique_together = [['barcode', 'branch']]
    
    def __str__(self):
        return f"{self.name} ({self.barcode})"
    
    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.reorder_level
    
    @property
    def price_with_tax(self):
        return self.price * (1 + self.tax_rate / 100)


class StockMovement(AuditMixin):
    MOVEMENT_TYPES = [
        ('sale', 'Sale'),
        ('purchase', 'Purchase'),
        ('adjustment', 'Adjustment'),
        ('return', 'Return'),
        ('damage', 'Damage/Loss'),
        ('transfer', 'Transfer'),
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField(help_text="Positive for additions, negative for deductions")
    previous_quantity = models.IntegerField()
    new_quantity = models.IntegerField()
    
    reason = models.TextField(blank=True)
    reference_id = models.CharField(max_length=100, blank=True, help_text="Sale ID, Purchase Order, etc.")
    
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='stock_movements', null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', '-created_at']),
            models.Index(fields=['movement_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.movement_type} ({self.quantity})"
