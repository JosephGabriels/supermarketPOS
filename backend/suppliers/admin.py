from django.contrib import admin
from .models import Supplier, SupplierProduct


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'contact_person', 'email', 'phone']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SupplierProduct)
class SupplierProductAdmin(admin.ModelAdmin):
    list_display = ['supplier', 'product_name', 'supplier_sku', 'wholesale_price', 'is_preferred', 'created_at']
    list_filter = ['is_preferred', 'supplier']
    search_fields = ['product_name', 'supplier_sku', 'supplier__name']
    readonly_fields = ['created_at', 'updated_at']