from rest_framework import serializers


class DailySalesReportSerializer(serializers.Serializer):
    date = serializers.DateField()
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_transactions = serializers.IntegerField()
    cash_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    mpesa_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    card_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_tax = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_discounts = serializers.DecimalField(max_digits=15, decimal_places=2)


class CashierPerformanceSerializer(serializers.Serializer):
    cashier_id = serializers.IntegerField()
    cashier_name = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_transactions = serializers.IntegerField()
    average_transaction = serializers.DecimalField(max_digits=15, decimal_places=2)
    shifts_worked = serializers.IntegerField()


class StockAlertSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    barcode = serializers.CharField()
    current_stock = serializers.IntegerField()
    reorder_level = serializers.IntegerField()
    status = serializers.CharField()


class TaxReportSerializer(serializers.Serializer):
    date = serializers.DateField()
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    taxable_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    tax_collected = serializers.DecimalField(max_digits=15, decimal_places=2)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class SalesSummarySerializer(serializers.Serializer):
    period = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_transactions = serializers.IntegerField()
    average_transaction = serializers.DecimalField(max_digits=15, decimal_places=2)
    top_selling_products = serializers.ListField()
