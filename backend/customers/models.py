from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import AuditMixin, Branch


class LoyaltyTier(models.Model):
    TIER_CHOICES = [
        ('bronze', 'Bronze'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
    ]
    
    name = models.CharField(max_length=20, choices=TIER_CHOICES, unique=True)
    min_purchase_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    points_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.00'), help_text="Points earned multiplier")
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    class Meta:
        ordering = ['min_purchase_amount']
    
    def __str__(self):
        return self.get_name_display()


class Customer(AuditMixin):
    name = models.CharField(max_length=300)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    email = models.EmailField(blank=True)
    
    tier = models.CharField(max_length=20, choices=LoyaltyTier.TIER_CHOICES, default='bronze')
    total_points = models.IntegerField(default=0)
    lifetime_purchases = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    
    birthday = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['phone']),
            models.Index(fields=['tier']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.phone})"
    
    def update_tier(self):
        tiers = LoyaltyTier.objects.order_by('-min_purchase_amount')
        for tier in tiers:
            if self.lifetime_purchases >= tier.min_purchase_amount:
                self.tier = tier.name
                self.save(update_fields=['tier'])
                break


class LoyaltyTransaction(AuditMixin):
    TRANSACTION_TYPES = [
        ('earn', 'Earn Points'),
        ('redeem', 'Redeem Points'),
        ('adjust', 'Manual Adjustment'),
        ('expire', 'Points Expired'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='loyalty_transactions')
    points = models.IntegerField(help_text="Positive for earning, negative for redemption")
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    
    sale = models.ForeignKey('sales.Sale', on_delete=models.SET_NULL, null=True, blank=True, related_name='loyalty_transactions')
    description = models.CharField(max_length=500)
    
    previous_points = models.IntegerField()
    new_points = models.IntegerField()
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.customer.name} - {self.transaction_type} ({self.points} points)"
