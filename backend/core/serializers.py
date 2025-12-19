from rest_framework import serializers
from .models import User, Branch, Category, SystemConfig, SyncLog


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'location', 'phone', 'email', 'tax_id', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'branch', 'branch_name', 
                  'phone', 'employee_id', 'is_active', 'date_joined']
        read_only_fields = ['date_joined']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    branch_details = BranchSerializer(source='branch', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'branch', 'branch_details',
                  'phone', 'employee_id', 'is_active', 'date_joined']
        read_only_fields = ['id', 'username', 'date_joined', 'role', 'employee_id']


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'parent', 'subcategories', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_subcategories(self, obj):
        if obj.subcategories.exists():
            return CategorySerializer(obj.subcategories.all(), many=True).data
        return []


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = ['id', 'key', 'value', 'description', 'updated_at', 'updated_by']
        read_only_fields = ['updated_at', 'updated_by']


class SyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncLog
        fields = ['id', 'entity_type', 'entity_id', 'action', 'data', 'synced', 'synced_at', 
                  'created_at', 'branch', 'user', 'error_message']
        read_only_fields = ['created_at', 'synced_at']
