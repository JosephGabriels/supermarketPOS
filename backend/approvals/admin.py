from django.contrib import admin
from .models import ApprovalRequest


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'request_type', 'requester', 'manager', 'status', 'created_at', 'resolved_at']
    list_filter = ['request_type', 'status', 'branch', 'created_at']
    search_fields = ['requester__username', 'manager__username', 'reference_id', 'reason']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'resolved_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Request Information', {
            'fields': ('request_type', 'requester', 'branch', 'reference_id')
        }),
        ('Details', {
            'fields': ('reason', 'details')
        }),
        ('Resolution', {
            'fields': ('status', 'manager', 'resolved_at', 'resolution_notes')
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
