from django.contrib import admin
from .models import LoyaltyTier, Customer, LoyaltyTransaction


@admin.register(LoyaltyTier)
class LoyaltyTierAdmin(admin.ModelAdmin):
    list_display = ['get_name_display', 'min_purchase_amount', 'points_multiplier', 'discount_percentage']
    ordering = ['min_purchase_amount']


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'tier', 'total_points', 'lifetime_purchases', 'is_active']
    list_filter = ['tier', 'is_active', 'created_at']
    search_fields = ['name', 'phone', 'email']
    readonly_fields = ['total_points', 'lifetime_purchases', 'created_at', 'updated_at', 'created_by', 'updated_by']
    fieldsets = (
        ('Contact Information', {
            'fields': ('name', 'phone', 'email', 'address')
        }),
        ('Loyalty', {
            'fields': ('tier', 'total_points', 'lifetime_purchases', 'birthday')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    list_display = ['customer', 'transaction_type', 'points', 'previous_points', 'new_points', 'sale', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['customer__name', 'customer__phone', 'description']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    date_hierarchy = 'created_at'
