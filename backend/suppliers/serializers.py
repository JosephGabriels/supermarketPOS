from rest_framework import serializers
from .models import Supplier, SupplierProduct


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'contact_person', 'email', 'phone', 'address', 'tax_id', 
                  'payment_terms', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class SupplierProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    
    class Meta:
        model = SupplierProduct
        fields = ['id', 'supplier', 'supplier_name', 'product_name', 'supplier_sku', 
                  'wholesale_price', 'minimum_order_quantity', 'lead_time_days', 'is_preferred',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class SupplierCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['name', 'contact_person', 'email', 'phone', 'address', 'tax_id', 
                  'payment_terms', 'is_active']
    
    def validate(self, attrs):
        # Add any custom validation here
        return attrs


class SupplierProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierProduct
        fields = ['supplier', 'product_name', 'supplier_sku', 'wholesale_price', 
                  'minimum_order_quantity', 'lead_time_days', 'is_preferred']
    
    def validate(self, attrs):
        # Add any custom validation here
        return attrs