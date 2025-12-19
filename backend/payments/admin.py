from django.contrib import admin
from .models import Payment, MpesaTransaction


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['sale', 'payment_method', 'amount', 'status', 'reference_number', 'processed_at']
    list_filter = ['payment_method', 'status', 'processed_at']
    search_fields = ['sale__sale_number', 'reference_number', 'phone_number']
    readonly_fields = ['processed_at']
    date_hierarchy = 'processed_at'


@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = ['payment', 'phone_number', 'amount', 'mpesa_receipt_number', 'result_code', 'created_at']
    list_filter = ['created_at', 'result_code']
    search_fields = ['phone_number', 'mpesa_receipt_number', 'checkout_request_id', 'merchant_request_id']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
