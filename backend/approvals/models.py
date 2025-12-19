from django.db import models
from core.models import AuditMixin, Branch, User


class ApprovalRequest(AuditMixin):
    REQUEST_TYPES = [
        ('return', 'Product Return'),
        ('discount', 'Discount Override'),
        ('ad_hoc_item', 'Ad-hoc Item'),
        ('price_override', 'Price Override'),
        ('void_sale', 'Void Sale'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPES)
    requester = models.ForeignKey(User, on_delete=models.PROTECT, related_name='approval_requests')
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_approvals')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    details = models.JSONField(help_text="Request-specific details (item info, reason, amounts, etc.)")
    reason = models.TextField()
    
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='approval_requests')
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    reference_id = models.CharField(max_length=100, blank=True, help_text="Sale ID, return ID, etc.")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['requester', '-created_at']),
            models.Index(fields=['manager', 'status']),
            models.Index(fields=['request_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.get_request_type_display()} - {self.requester.username} ({self.status})"
    
    def approve(self, manager_user, notes=''):
        from django.utils import timezone
        self.status = 'approved'
        self.manager = manager_user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()
    
    def reject(self, manager_user, notes=''):
        from django.utils import timezone
        self.status = 'rejected'
        self.manager = manager_user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()
