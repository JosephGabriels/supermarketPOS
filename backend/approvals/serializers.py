from rest_framework import serializers
from .models import ApprovalRequest


class ApprovalRequestSerializer(serializers.ModelSerializer):
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    requester_name = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = ApprovalRequest
        fields = ['id', 'request_type', 'request_type_display', 'requester', 'requester_name', 
                  'manager', 'manager_name', 'status', 'status_display', 'details', 'reason', 
                  'branch', 'branch_name', 'resolved_at', 'resolution_notes', 'reference_id', 
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'resolved_at']
    
    def get_requester_name(self, obj):
        return obj.requester.get_full_name() or obj.requester.username
    
    def get_manager_name(self, obj):
        return obj.manager.get_full_name() if obj.manager else None


class ApprovalRequestCreateSerializer(serializers.Serializer):
    request_type = serializers.ChoiceField(choices=['return', 'discount', 'ad_hoc_item', 'price_override', 'void_sale'])
    details = serializers.JSONField()
    reason = serializers.CharField()
    reference_id = serializers.CharField(max_length=100, required=False, allow_blank=True)


class ApprovalActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True)
