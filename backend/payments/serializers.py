from rest_framework import serializers
from .models import Payment, MpesaTransaction


class MpesaTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaTransaction
        fields = ['id', 'merchant_request_id', 'checkout_request_id', 'phone_number', 
                  'amount', 'mpesa_receipt_number', 'transaction_date', 'result_code', 
                  'result_desc', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    processed_by_name = serializers.SerializerMethodField()
    mpesa_details = MpesaTransactionSerializer(source='mpesa_transaction', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'sale', 'payment_method', 'payment_method_display', 'amount', 
                  'reference_number', 'status', 'status_display', 'phone_number', 
                  'processed_by', 'processed_by_name', 'processed_at', 'notes', 'mpesa_details']
        read_only_fields = ['processed_at', 'processed_by']
    
    def get_processed_by_name(self, obj):
        return obj.processed_by.get_full_name() if obj.processed_by else None


class PaymentCreateSerializer(serializers.Serializer):
    sale_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=['cash', 'mpesa', 'card', 'airtel_money', 'bank_transfer'])
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    reference_number = serializers.CharField(max_length=200, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class MpesaSTKPushSerializer(serializers.Serializer):
    sale_id = serializers.IntegerField()
    phone_number = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)


class MpesaCallbackSerializer(serializers.Serializer):
    merchant_request_id = serializers.CharField(max_length=100)
    checkout_request_id = serializers.CharField(max_length=100)
    result_code = serializers.CharField(max_length=10)
    result_desc = serializers.CharField()
    mpesa_receipt_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
