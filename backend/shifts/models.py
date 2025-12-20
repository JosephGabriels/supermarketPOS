from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import AuditMixin, Branch, User


class Shift(AuditMixin):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
    ]
    
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name='shifts')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name='shifts', null=True, blank=True)
    
    opening_time = models.DateTimeField(auto_now_add=True)
    closing_time = models.DateTimeField(null=True, blank=True)
    
    opening_cash = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    closing_cash = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    expected_cash = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    cash_difference = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, help_text="Positive=overage, Negative=shortage")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    total_sales = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_transactions = models.IntegerField(default=0)
    
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='closed_shifts')
    
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-opening_time']
        indexes = [
            models.Index(fields=['cashier', '-opening_time']),
            models.Index(fields=['branch', 'status']),
            models.Index(fields=['status', '-opening_time']),
        ]
    
    def __str__(self):
        return f"Shift {self.id} - {self.cashier.username} ({self.opening_time.strftime('%Y-%m-%d %H:%M')})"
    
    def calculate_expected_cash(self):
        from payments.models import Payment
        cash_payments = Payment.objects.filter(
            sale__shift=self,
            payment_method='cash',
            status='completed'
        ).aggregate(total=models.Sum('amount'))
        
        total_cash = cash_payments['total'] or Decimal('0.00')
        self.expected_cash = self.opening_cash + total_cash
        return self.expected_cash
    
    def close_shift(self, closing_cash, closed_by_user):
        self.closing_time = models.functions.Now()
        self.closing_cash = closing_cash
        self.calculate_expected_cash()
        self.cash_difference = self.closing_cash - self.expected_cash
        self.status = 'closed'
        self.closed_by = closed_by_user
        self.save()


class ShiftTransaction(models.Model):
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='transactions')
    sale = models.ForeignKey('sales.Sale', on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_method = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shift', '-created_at']),
        ]
    
    def __str__(self):
        return f"Shift {self.shift.id} - {self.payment_method} KES {self.amount}"
