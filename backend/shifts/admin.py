from django.contrib import admin
from .models import Shift, ShiftTransaction


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['id', 'cashier', 'branch', 'opening_time', 'closing_time', 'status', 'cash_difference', 'total_sales']
    list_filter = ['status', 'branch', 'opening_time']
    search_fields = ['cashier__username', 'branch__name']
    readonly_fields = ['expected_cash', 'cash_difference', 'opening_time', 'created_at', 'updated_at', 'created_by', 'updated_by']
    date_hierarchy = 'opening_time'
    fieldsets = (
        ('Shift Information', {
            'fields': ('cashier', 'branch', 'status')
        }),
        ('Timing', {
            'fields': ('opening_time', 'closing_time')
        }),
        ('Cash Management', {
            'fields': ('opening_cash', 'closing_cash', 'expected_cash', 'cash_difference')
        }),
        ('Summary', {
            'fields': ('total_sales', 'total_transactions', 'notes')
        }),
        ('Closure', {
            'fields': ('closed_by',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ShiftTransaction)
class ShiftTransactionAdmin(admin.ModelAdmin):
    list_display = ['shift', 'sale', 'payment_method', 'amount', 'created_at']
    list_filter = ['payment_method', 'created_at']
    search_fields = ['shift__id', 'sale__sale_number']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
