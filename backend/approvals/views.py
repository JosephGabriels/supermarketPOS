from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from .models import ApprovalRequest
from .serializers import ApprovalRequestSerializer, ApprovalRequestCreateSerializer, ApprovalActionSerializer
from core.permissions import IsCashier, IsManager


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = ApprovalRequest.objects.all()
    serializer_class = ApprovalRequestSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = ApprovalRequest.objects.all()
        
        if self.request.user.role == 'cashier':
            queryset = queryset.filter(requester=self.request.user)
        elif self.request.user.role != 'admin':
            queryset = queryset.filter(branch=self.request.user.branch)
        
        status_filter = self.request.query_params.get('status', None)
        request_type = self.request.query_params.get('request_type', None)
        requester = self.request.query_params.get('requester', None)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if request_type:
            queryset = queryset.filter(request_type=request_type)
        if requester:
            queryset = queryset.filter(requester_id=requester)
        
        return queryset.select_related('requester', 'manager', 'branch').order_by('-created_at')
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = ApprovalRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        approval_request = ApprovalRequest.objects.create(
            request_type=data['request_type'],
            requester=request.user,
            details=data['details'],
            reason=data['reason'],
            reference_id=data.get('reference_id', ''),
            branch=request.user.branch,
            status='pending',
            created_by=request.user
        )
        
        response_serializer = ApprovalRequestSerializer(approval_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @transaction.atomic
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManager])
    def approve(self, request, pk=None):
        approval_request = self.get_object()
        
        if approval_request.status != 'pending':
            return Response({'error': 'Approval request is already resolved'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ApprovalActionSerializer(data=request.data)
        if serializer.is_valid():
            notes = serializer.validated_data.get('notes', '')
            approval_request.approve(request.user, notes)
            
            response_serializer = ApprovalRequestSerializer(approval_request)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @transaction.atomic
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManager])
    def reject(self, request, pk=None):
        approval_request = self.get_object()
        
        if approval_request.status != 'pending':
            return Response({'error': 'Approval request is already resolved'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ApprovalActionSerializer(data=request.data)
        if serializer.is_valid():
            notes = serializer.validated_data.get('notes', '')
            approval_request.reject(request.user, notes)
            
            response_serializer = ApprovalRequestSerializer(approval_request)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsManager])
    def pending(self, request):
        queryset = ApprovalRequest.objects.filter(
            branch=request.user.branch,
            status='pending'
        ).select_related('requester', 'branch').order_by('-created_at')
        
        serializer = ApprovalRequestSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        queryset = ApprovalRequest.objects.filter(
            requester=request.user
        ).select_related('manager', 'branch').order_by('-created_at')[:20]
        
        serializer = ApprovalRequestSerializer(queryset, many=True)
        return Response(serializer.data)
