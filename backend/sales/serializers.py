from rest_framework import serializers
from .models import Sale, SaleItem, Discount, Return
from customers.serializers import CustomerSerializer
from inventory.serializers import ProductSerializer


class DiscountSerializer(serializers.ModelSerializer):
    discount_type_display = serializers.CharField(source='get_discount_type_display', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Discount
        fields = ['id', 'code', 'name', 'discount_type', 'discount_type_display', 'value', 
                  'min_purchase_amount', 'start_date', 'end_date', 'requires_approval', 
                  'is_active', 'max_uses', 'times_used', 'is_valid', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'times_used']


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    total = serializers.SerializerMethodField()
    
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'product_barcode', 'quantity', 'unit_price', 
                  'discount', 'subtotal', 'tax_rate', 'tax_amount', 'is_ad_hoc', 
                  'ad_hoc_name', 'total']
        read_only_fields = ['subtotal', 'tax_amount']
    
    def get_total(self, obj):
        return obj.subtotal + obj.tax_amount


class SaleItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, allow_null=True)
    barcode = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_ad_hoc = serializers.BooleanField(default=False)
    ad_hoc_name = serializers.CharField(max_length=300, required=False, allow_blank=True)


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    customer_details = CustomerSerializer(source='customer', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Sale
        fields = ['id', 'sale_number', 'branch', 'branch_name', 'cashier', 'cashier_name', 
                  'customer', 'customer_details', 'subtotal', 'tax_amount', 'discount_amount', 
                  'total_amount', 'status', 'status_display', 'shift', 'notes', 'items', 
                  'created_at', 'updated_at']
        read_only_fields = ['sale_number', 'created_at', 'updated_at']
    
    def get_cashier_name(self, obj):
        return obj.cashier.get_full_name() or obj.cashier.username


class SaleCreateSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=False, allow_null=True)
    items = SaleItemCreateSerializer(many=True)
    discount_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    discount_amount = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required")
        return value


class SaleCompleteSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=['cash', 'mpesa', 'card', 'airtel_money'])
    amount_paid = serializers.DecimalField(max_digits=15, decimal_places=2)
    reference_number = serializers.CharField(max_length=200, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)


class ReturnSerializer(serializers.ModelSerializer):
    original_sale_number = serializers.CharField(source='original_sale.sale_number', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    manager_name = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Return
        fields = ['id', 'return_number', 'original_sale', 'original_sale_number', 
                  'items_returned', 'refund_amount', 'reason', 'customer', 'customer_name', 
                  'manager_approval', 'manager_name', 'approved_at', 'branch', 'branch_name',
                  'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['return_number', 'created_at', 'approved_at']
    
    def get_manager_name(self, obj):
        return obj.manager_approval.get_full_name() if obj.manager_approval else None
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None


class ReturnCreateSerializer(serializers.Serializer):
    sale_id = serializers.IntegerField()
    items_returned = serializers.JSONField()
    reason = serializers.CharField()
