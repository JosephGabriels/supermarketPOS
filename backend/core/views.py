from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.db.models import Q
from .models import User, Branch, Category, SystemConfig
from .serializers import (UserSerializer, UserProfileSerializer, BranchSerializer,
                          CategorySerializer, SystemConfigSerializer, ChangePasswordSerializer,
                          ResetPasswordSerializer, UserCreateSerializer)
from .permissions import IsAdmin, IsManager


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(username=request.data.get('username'))
            response.data['user'] = UserProfileSerializer(user).data
        return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    if request.method == 'GET':
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Allow authenticated users to change their own password"""
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        if not user.check_password(serializer.validated_data['current_password']):
            return Response({'current_password': ['Wrong password.']}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password updated successfully'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'employee_id']
    ordering_fields = ['date_joined', 'username', 'role']
    ordering = ['-date_joined']
    
    def get_permissions(self):
        """
        Admins can do everything.
        Managers can view users in their branch.
        Admins can create admins/managers/cashiers.
        Managers can only create cashiers in their branch.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        queryset = User.objects.all()
        user = self.request.user
        
        # Filter by role for non-admins
        if user.role == 'manager':
            # Managers can only see users in their branch
            queryset = queryset.filter(branch=user.branch)
        elif user.role == 'cashier':
            # Cashiers can only see themselves
            queryset = queryset.filter(id=user.id)
        
        # Additional filters
        role = self.request.query_params.get('role', None)
        branch = self.request.query_params.get('branch', None)
        is_active = self.request.query_params.get('is_active', None)
        search = self.request.query_params.get('search', None)
        
        if role:
            queryset = queryset.filter(role=role)
        if branch and user.role == 'admin':
            queryset = queryset.filter(branch_id=branch)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(employee_id__icontains=search)
            )
        
        return queryset.order_by('-date_joined')
    
    def perform_create(self, serializer):
        """Create user with role restrictions"""
        user = self.request.user
        role = self.request.data.get('role', 'cashier')
        
        # Managers can only create cashiers
        if user.role == 'manager' and role != 'cashier':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Managers can only create cashiers.')
        
        # Only admins can create admins
        if role == 'admin' and user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only admins can create admin users.')
        
        # If manager creates user, assign to their branch
        if user.role == 'manager':
            serializer.save(created_by=user, branch=user.branch)
        else:
            serializer.save(created_by=user)
    
    def perform_update(self, serializer):
        """Update user with role restrictions"""
        user = self.request.user
        instance = self.get_object()
        new_role = self.request.data.get('role', instance.role)
        
        # Prevent self-demotion for admins
        if instance.id == user.id and instance.role == 'admin' and new_role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Admins cannot demote themselves.')
        
        # Managers cannot promote to admin/manager
        if user.role == 'manager' and new_role in ['admin', 'manager']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Managers cannot promote users to admin or manager.')
        
        serializer.save(updated_by=user)
    
    def destroy(self, request, *args, **kwargs):
        """Prevent self-deletion and deactivate instead of delete"""
        instance = self.get_object()
        
        if instance.id == request.user.id:
            return Response({'error': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Soft delete - deactivate instead
        instance.is_active = False
        instance.save()
        return Response({'message': 'User deactivated successfully'}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def reset_password(self, request, pk=None):
        """Admin endpoint to reset a user's password"""
        user = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': f'Password reset successfully for {user.username}'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def toggle_active(self, request, pk=None):
        """Admin endpoint to activate/deactivate a user"""
        user = self.get_object()
        
        if user.id == request.user.id:
            return Response({'error': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.is_active = not user.is_active
        user.save()
        status_text = 'activated' if user.is_active else 'deactivated'
        return Response({'message': f'User {status_text} successfully', 'is_active': user.is_active}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics"""
        queryset = self.get_queryset()
        return Response({
            'total': queryset.count(),
            'active': queryset.filter(is_active=True).count(),
            'inactive': queryset.filter(is_active=False).count(),
            'by_role': {
                'admin': queryset.filter(role='admin').count(),
                'manager': queryset.filter(role='manager').count(),
                'cashier': queryset.filter(role='cashier').count(),
            }
        })
    
    @action(detail=False, methods=['get'])
    def roles(self, request):
        """Get available user roles"""
        user = request.user
        roles = [
            {'value': 'cashier', 'label': 'Cashier'},
        ]
        
        if user.role in ['admin', 'manager']:
            roles.insert(0, {'value': 'manager', 'label': 'Manager'})
        
        if user.role == 'admin':
            roles.insert(0, {'value': 'admin', 'label': 'Administrator'})
        
        return Response(roles)


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Branch.objects.all()
        return Branch.objects.filter(id=self.request.user.branch_id)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class SystemConfigViewSet(viewsets.ModelViewSet):
    queryset = SystemConfig.objects.all()
    serializer_class = SystemConfigSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
