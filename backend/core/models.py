from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.conf import settings


class AuditMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='%(class)s_created', blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='%(class)s_updated', blank=True)
    
    class Meta:
        abstract = True


class Branch(AuditMixin):
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=500)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    tax_id = models.CharField(max_length=50, unique=True, help_text="KRA PIN")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Branches"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class User(AbstractUser, AuditMixin):
    ROLE_CHOICES = [
        ('cashier', 'Cashier'),
        ('manager', 'Manager'),
        ('admin', 'Administrator'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='cashier')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, related_name='users')
    phone = models.CharField(max_length=20, blank=True)
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    
    class Meta:
        ordering = ['username']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
    
    @property
    def is_cashier(self):
        return self.role == 'cashier'
    
    @property
    def is_manager(self):
        return self.role == 'manager'
    
    @property
    def is_admin(self):
        return self.role == 'admin'


class Category(AuditMixin):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class SystemConfig(models.Model):
    key = models.CharField(max_length=200, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['key']
    
    def __str__(self):
        return self.key


class SyncLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
    ]
    
    entity_type = models.CharField(max_length=100)
    entity_id = models.IntegerField()
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    data = models.JSONField()
    synced = models.BooleanField(default=False)
    synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['synced', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.entity_type} {self.entity_id} - {self.action}"
