from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from .models import User, Branch, Category, SystemConfig
from .serializers import (UserSerializer, UserProfileSerializer, BranchSerializer, 
                          CategorySerializer, SystemConfigSerializer)
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


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role', None)
        branch = self.request.query_params.get('branch', None)
        
        if role:
            queryset = queryset.filter(role=role)
        if branch:
            queryset = queryset.filter(branch_id=branch)
        
        return queryset.order_by('-date_joined')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


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
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
