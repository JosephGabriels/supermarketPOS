from rest_framework import serializers
from .models import Shift, ShiftTransaction


class ShiftTransactionSerializer(serializers.ModelSerializer):
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True)
    
    class Meta:
        model = ShiftTransaction
        fields = ['id', 'shift', 'sale', 'sale_number', 'amount', 'payment_method', 'created_at']
        read_only_fields = ['created_at']


class ShiftSerializer(serializers.ModelSerializer):
    cashier_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    closed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Shift
        fields = ['id', 'cashier', 'cashier_name', 'branch', 'branch_name', 'opening_time', 
                  'closing_time', 'opening_cash', 'closing_cash', 'expected_cash', 
                  'cash_difference', 'status', 'status_display', 'total_sales', 
                  'total_transactions', 'closed_by', 'closed_by_name', 'notes']
        read_only_fields = ['opening_time', 'closing_time', 'expected_cash', 'cash_difference', 
                           'total_sales', 'total_transactions']
    
    def get_cashier_name(self, obj):
        return obj.cashier.get_full_name() or obj.cashier.username

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None

    def get_closed_by_name(self, obj):
        return obj.closed_by.get_full_name() if obj.closed_by else None


class ShiftDetailSerializer(serializers.ModelSerializer):
    cashier_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    closed_by_name = serializers.SerializerMethodField()
    transactions = ShiftTransactionSerializer(many=True, read_only=True)
    sales_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Shift
        fields = ['id', 'cashier', 'cashier_name', 'branch', 'branch_name', 'opening_time', 
                  'closing_time', 'opening_cash', 'closing_cash', 'expected_cash', 
                  'cash_difference', 'status', 'status_display', 'total_sales', 
                  'total_transactions', 'closed_by', 'closed_by_name', 'notes', 
                  'transactions', 'sales_summary']
        read_only_fields = ['opening_time', 'closing_time', 'expected_cash', 'cash_difference', 
                           'total_sales', 'total_transactions']
    
    def get_cashier_name(self, obj):
        return obj.cashier.get_full_name() or obj.cashier.username

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None

    def get_closed_by_name(self, obj):
        return obj.closed_by.get_full_name() if obj.closed_by else None

    def get_sales_summary(self, obj):
        from sales.models import Sale
        from django.db.models import Count, Sum
        
        sales = Sale.objects.filter(shift=obj)
        summary = sales.aggregate(
            total_sales=Count('id'),
            total_amount=Sum('total_amount')
        )
        return summary


class ShiftOpenSerializer(serializers.Serializer):
    opening_cash = serializers.DecimalField(max_digits=15, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True)


class ShiftCloseSerializer(serializers.Serializer):
    closing_cash = serializers.DecimalField(max_digits=15, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True)
