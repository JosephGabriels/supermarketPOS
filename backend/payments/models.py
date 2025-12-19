from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Branch, User
from sales.models import Sale


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('mpesa', 'M-Pesa'),
        ('airtel_money', 'Airtel Money'),
        ('card', 'Credit/Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name='payments')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    
    reference_number = models.CharField(max_length=200, blank=True, help_text="M-Pesa code, card transaction ID, etc.")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    phone_number = models.CharField(max_length=20, blank=True, help_text="For mobile money payments")
    
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='processed_payments')
    processed_at = models.DateTimeField(auto_now_add=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-processed_at']
        indexes = [
            models.Index(fields=['sale', '-processed_at']),
            models.Index(fields=['reference_number']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.get_payment_method_display()} - KES {self.amount} ({self.status})"


class MpesaTransaction(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='mpesa_transaction')
    
    merchant_request_id = models.CharField(max_length=100, blank=True)
    checkout_request_id = models.CharField(max_length=100, blank=True)
    
    phone_number = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    mpesa_receipt_number = models.CharField(max_length=100, blank=True)
    transaction_date = models.DateTimeField(null=True, blank=True)
    
    result_code = models.CharField(max_length=10, blank=True)
    result_desc = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['mpesa_receipt_number']),
            models.Index(fields=['checkout_request_id']),
        ]
    
    def __str__(self):
        return f"M-Pesa {self.phone_number} - {self.mpesa_receipt_number or 'Pending'}"
