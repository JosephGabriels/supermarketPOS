from rest_framework import serializers
from .models import Product, StockMovement
from core.serializers import CategorySerializer, BranchSerializer
from suppliers.serializers import SupplierSerializer


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    price_with_tax = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'barcode', 'category', 'category_name', 'description', 'price', 
                  'cost_price', 'stock_quantity', 'reorder_level', 'branch', 'branch_name', 
                  'supplier', 'supplier_name', 'is_active', 'tax_rate', 'image', 'is_low_stock', 
                  'price_with_tax', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ProductDetailSerializer(serializers.ModelSerializer):
    category_details = CategorySerializer(source='category', read_only=True)
    branch_details = BranchSerializer(source='branch', read_only=True)
    supplier_details = SupplierSerializer(source='supplier', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    price_with_tax = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    recent_movements = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'barcode', 'category', 'category_details', 'description', 
                  'price', 'cost_price', 'stock_quantity', 'reorder_level', 'branch', 
                  'branch_details', 'supplier', 'supplier_details', 'is_active', 'tax_rate', 
                  'image', 'is_low_stock', 'price_with_tax', 'recent_movements', 
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_recent_movements(self, obj):
        movements = obj.stock_movements.all()[:5]
        return StockMovementSerializer(movements, many=True).data


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = StockMovement
        fields = ['id', 'product', 'product_name', 'movement_type', 'quantity', 
                  'previous_quantity', 'new_quantity', 'reason', 'reference_id', 
                  'branch', 'branch_name', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_at', 'previous_quantity', 'new_quantity']
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None


class StockAdjustmentSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField()
    reason = serializers.CharField(max_length=500)
    movement_type = serializers.ChoiceField(choices=['adjustment', 'damage', 'purchase', 'return'])
