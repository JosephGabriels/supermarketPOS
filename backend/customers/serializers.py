from rest_framework import serializers
from .models import Customer, LoyaltyTier, LoyaltyTransaction


class LoyaltyTierSerializer(serializers.ModelSerializer):
    tier_display = serializers.CharField(source='get_name_display', read_only=True)
    
    class Meta:
        model = LoyaltyTier
        fields = ['id', 'name', 'tier_display', 'min_purchase_amount', 'points_multiplier', 'discount_percentage']


class CustomerSerializer(serializers.ModelSerializer):
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'tier', 'tier_display', 'total_points', 
                  'lifetime_purchases', 'birthday', 'address', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'total_points', 'lifetime_purchases', 'tier']


class CustomerDetailSerializer(serializers.ModelSerializer):
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    recent_transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'tier', 'tier_display', 'total_points', 
                  'lifetime_purchases', 'birthday', 'address', 'is_active', 'recent_transactions',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'total_points', 'lifetime_purchases', 'tier']
    
    def get_recent_transactions(self, obj):
        transactions = obj.loyalty_transactions.all()[:10]
        return LoyaltyTransactionSerializer(transactions, many=True).data


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LoyaltyTransaction
        fields = ['id', 'customer', 'customer_name', 'points', 'transaction_type', 
                  'transaction_type_display', 'sale', 'description', 'previous_points', 
                  'new_points', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_at', 'previous_points', 'new_points']
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None


class CustomerLookupSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
