from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from decimal import Decimal
from .models import Customer, LoyaltyTier, LoyaltyTransaction
from .serializers import (CustomerSerializer, CustomerDetailSerializer, LoyaltyTierSerializer,
                          LoyaltyTransactionSerializer, CustomerLookupSerializer)
from core.permissions import IsCashier


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CustomerDetailSerializer
        return CustomerSerializer
    
    def get_queryset(self):
        queryset = Customer.objects.filter(is_active=True)
        
        search = self.request.query_params.get('search', None)
        phone = self.request.query_params.get('phone', None)
        tier = self.request.query_params.get('tier', None)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )
        if phone:
            queryset = queryset.filter(phone=phone)
        if tier:
            queryset = queryset.filter(tier=tier)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def lookup(self, request):
        serializer = CustomerLookupSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone']
            try:
                customer = Customer.objects.get(phone=phone, is_active=True)
                response_serializer = CustomerDetailSerializer(customer)
                return Response(response_serializer.data)
            except Customer.DoesNotExist:
                return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_points(self, request, pk=None):
        customer = self.get_object()
        points = request.data.get('points', 0)
        description = request.data.get('description', 'Points added manually')
        
        try:
            points = int(points)
            previous_points = customer.total_points
            customer.total_points += points
            customer.save()
            
            LoyaltyTransaction.objects.create(
                customer=customer,
                points=points,
                transaction_type='earn' if points > 0 else 'redeem',
                description=description,
                previous_points=previous_points,
                new_points=customer.total_points,
                created_by=request.user
            )
            
            customer.update_tier()
            
            return Response({
                'message': 'Points updated successfully',
                'previous_points': previous_points,
                'new_points': customer.total_points,
                'tier': customer.tier
            })
        except ValueError:
            return Response({'error': 'Invalid points value'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def redeem_points(self, request, pk=None):
        customer = self.get_object()
        points = request.data.get('points', 0)
        sale_id = request.data.get('sale_id', None)
        
        try:
            points = int(points)
            if points > customer.total_points:
                return Response({'error': 'Insufficient points'}, status=status.HTTP_400_BAD_REQUEST)
            
            previous_points = customer.total_points
            customer.total_points -= points
            customer.save()
            
            from sales.models import Sale
            sale = Sale.objects.get(id=sale_id) if sale_id else None
            
            LoyaltyTransaction.objects.create(
                customer=customer,
                points=-points,
                transaction_type='redeem',
                sale=sale,
                description=f'Redeemed {points} points',
                previous_points=previous_points,
                new_points=customer.total_points,
                created_by=request.user
            )
            
            return Response({
                'message': 'Points redeemed successfully',
                'points_redeemed': points,
                'remaining_points': customer.total_points
            })
        except ValueError:
            return Response({'error': 'Invalid points value'}, status=status.HTTP_400_BAD_REQUEST)
        except Sale.DoesNotExist:
            return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)


class LoyaltyTierViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoyaltyTier.objects.all()
    serializer_class = LoyaltyTierSerializer
    permission_classes = [IsAuthenticated]


class LoyaltyTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoyaltyTransaction.objects.all()
    serializer_class = LoyaltyTransactionSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = LoyaltyTransaction.objects.all()
        
        customer = self.request.query_params.get('customer', None)
        transaction_type = self.request.query_params.get('transaction_type', None)
        
        if customer:
            queryset = queryset.filter(customer_id=customer)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        return queryset.order_by('-created_at')
