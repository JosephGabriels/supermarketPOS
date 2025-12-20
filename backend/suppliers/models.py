from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import AuditMixin, Branch, User


class Supplier(AuditMixin):
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True, help_text="KRA PIN")
    payment_terms = models.CharField(max_length=100, blank=True, help_text="e.g., Net 30, COD")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Suppliers"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class SupplierProduct(AuditMixin):
    """Many-to-many relationship between suppliers and products with pricing"""
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='supplier_products')
    product_name = models.CharField(max_length=300, help_text="Product name as known to supplier")
    supplier_sku = models.CharField(max_length=100, blank=True, help_text="Supplier's SKU for this product")
    wholesale_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    minimum_order_quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    lead_time_days = models.IntegerField(default=7, help_text="Days to receive order")
    is_preferred = models.BooleanField(default=False, help_text="Preferred supplier for this product")
    
    class Meta:
        verbose_name = "Supplier Product"
        verbose_name_plural = "Supplier Products"
        unique_together = [['supplier', 'product_name']]
        ordering = ['-is_preferred', 'wholesale_price']
    
    def __str__(self):
        return f"{self.supplier.name} - {self.product_name}"