from django.contrib import admin
from .models import Discount, Sale, SaleItem, Return


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ['subtotal', 'tax_amount']


@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'discount_type', 'value', 'start_date', 'end_date', 'is_active', 'times_used']
    list_filter = ['discount_type', 'is_active', 'requires_approval']
    search_fields = ['code', 'name']
    readonly_fields = ['times_used', 'created_at', 'updated_at', 'created_by', 'updated_by', 'is_valid']
    filter_horizontal = ['applicable_products']
    date_hierarchy = 'start_date'


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['sale_number', 'cashier', 'customer', 'total_amount', 'status', 'created_at', 'branch']
    list_filter = ['status', 'branch', 'created_at']
    search_fields = ['sale_number', 'cashier__username', 'customer__name', 'customer__phone']
    readonly_fields = ['sale_number', 'created_at', 'updated_at', 'created_by', 'updated_by']
    inlines = [SaleItemInline]
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Sale Information', {
            'fields': ('sale_number', 'branch', 'cashier', 'customer', 'shift')
        }),
        ('Financial', {
            'fields': ('subtotal', 'tax_amount', 'discount_amount', 'total_amount')
        }),
        ('Status', {
            'fields': ('status', 'notes')
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ['return_number', 'original_sale', 'refund_amount', 'manager_approval', 'approved_at', 'created_at']
    list_filter = ['branch', 'created_at', 'approved_at']
    search_fields = ['return_number', 'original_sale__sale_number', 'customer__name']
    readonly_fields = ['return_number', 'created_at', 'updated_at', 'created_by', 'updated_by']
    date_hierarchy = 'created_at'
