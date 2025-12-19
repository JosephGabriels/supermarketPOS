from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Branch, Category, SystemConfig, SyncLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('POS Information', {'fields': ('role', 'branch', 'phone', 'employee_id')}),
        ('Audit', {'fields': ('created_at', 'updated_at', 'created_by', 'updated_by')}),
    )
    list_display = ['username', 'email', 'role', 'branch', 'is_active', 'is_staff']
    list_filter = ['role', 'branch', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'employee_id']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'phone', 'tax_id', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'location', 'tax_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'created_at']
    list_filter = ['parent']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ['key', 'value', 'updated_at', 'updated_by']
    search_fields = ['key', 'description']
    readonly_fields = ['updated_at']


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ['entity_type', 'entity_id', 'action', 'synced', 'created_at', 'branch', 'user']
    list_filter = ['synced', 'action', 'entity_type', 'branch']
    search_fields = ['entity_type', 'entity_id']
    readonly_fields = ['created_at', 'synced_at']
    date_hierarchy = 'created_at'
