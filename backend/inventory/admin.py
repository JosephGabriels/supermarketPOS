from django.contrib import admin
from .models import Product, StockMovement


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'barcode', 'category', 'price', 'stock_quantity', 'is_low_stock', 'branch', 'is_active']
    list_filter = ['category', 'branch', 'is_active']
    search_fields = ['name', 'barcode', 'description']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'is_low_stock', 'price_with_tax']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'barcode', 'category', 'description', 'image')
        }),
        ('Pricing', {
            'fields': ('price', 'cost_price', 'tax_rate', 'price_with_tax')
        }),
        ('Inventory', {
            'fields': ('stock_quantity', 'reorder_level', 'is_low_stock', 'branch')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'quantity', 'previous_quantity', 'new_quantity', 'created_at', 'branch']
    list_filter = ['movement_type', 'branch', 'created_at']
    search_fields = ['product__name', 'product__barcode', 'reference_id', 'reason']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    date_hierarchy = 'created_at'
