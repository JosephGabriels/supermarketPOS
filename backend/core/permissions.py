from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['manager', 'admin']


class IsCashier(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['cashier', 'manager', 'admin']


class IsManagerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role in ['manager', 'admin']


class IsSameBranch(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        return obj.branch == request.user.branch


class IsOwnerOrManager(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role in ['manager', 'admin']:
            return True
        if hasattr(obj, 'cashier'):
            return obj.cashier == request.user
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        return False
