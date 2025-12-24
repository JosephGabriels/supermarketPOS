from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F
from decimal import Decimal
from .models import Product, StockMovement
from .serializers import (ProductSerializer, ProductDetailSerializer, StockMovementSerializer, 
                          StockAdjustmentSerializer)
from core.permissions import IsManager, IsCashier


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated(), IsCashier()]
    
    def list(self, request, *args, **kwargs):
        # Check if pagination should be disabled
        page = request.query_params.get('page', None)
        limit = request.query_params.get('limit', None)
        
        if not page and not limit:
            # Return all results without pagination
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        # Use default pagination
        return super().list(request, *args, **kwargs)
    
    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).select_related('category', 'branch', 'supplier')
        user = self.request.user
        branch_id = None
        if user.role == 'admin':
            branch_id = self.request.query_params.get('branch')
        if not branch_id:
            branch_id = user.branch_id if hasattr(user, 'branch_id') else None
        if branch_id:
            queryset = queryset.filter(branch=branch_id)
        barcode = self.request.query_params.get('barcode', None)
        search = self.request.query_params.get('search', None)
        category = self.request.query_params.get('category', None)
        low_stock = self.request.query_params.get('low_stock', None)
        if barcode:
            queryset = queryset.filter(barcode=barcode)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(barcode__icontains=search) |
                Q(description__icontains=search)
            )
        if category:
            queryset = queryset.filter(category_id=category)
        if low_stock == 'true':
            queryset = queryset.filter(stock_quantity__lte=F('reorder_level'))
        return queryset.order_by('name')
    
    def perform_create(self, serializer):
        user = self.request.user
        branch_id = None
        if user.role == 'admin':
            branch_id = self.request.data.get('branch')
        if not branch_id:
            branch_id = user.branch_id if hasattr(user, 'branch_id') else None
        serializer.save(
            branch_id=branch_id,
            created_by=user
        )
    
    def perform_update(self, serializer):
        user = self.request.user
        branch_id = None
        if user.role == 'admin':
            branch_id = self.request.data.get('branch')
        if not branch_id:
            branch_id = user.branch_id if hasattr(user, 'branch_id') else None
        serializer.save(
            branch_id=branch_id,
            updated_by=user
        )
    
    @action(detail=False, methods=['get'])
    def lookup(self, request):
        barcode = request.query_params.get('barcode', None)
        branch_id = None
        user = request.user
        if user.role == 'admin':
            branch_id = request.query_params.get('branch')
        if not branch_id:
            branch_id = user.branch_id if hasattr(user, 'branch_id') else None
        if not barcode or not branch_id:
            return Response({'error': 'Barcode and branch are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product = Product.objects.get(
                barcode=barcode,
                branch=branch_id,
                is_active=True
            )
            serializer = ProductDetailSerializer(product)
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        queryset = Product.objects.filter(
            branch=request.user.branch,
            is_active=True,
            stock_quantity__lte=F('reorder_level')
        ).select_related('category', 'branch', 'supplier')
        serializer = ProductSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManager])
    def adjust_stock(self, request, pk=None):
        product = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)
        
        if serializer.is_valid():
            quantity = serializer.validated_data['quantity']
            reason = serializer.validated_data['reason']
            movement_type = serializer.validated_data['movement_type']
            
            previous_quantity = product.stock_quantity
            product.stock_quantity += quantity
            product.save()
            
            StockMovement.objects.create(
                product=product,
                movement_type=movement_type,
                quantity=quantity,
                previous_quantity=previous_quantity,
                new_quantity=product.stock_quantity,
                reason=reason,
                branch=request.user.branch,
                created_by=request.user
            )
            
            return Response({
                'message': 'Stock adjusted successfully',
                'previous_quantity': previous_quantity,
                'new_quantity': product.stock_quantity
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    # Allow cashiers to view stock movements for their branch as well as managers/admins
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = StockMovement.objects.all()
        
        if self.request.user.role != 'admin' and self.request.user.branch:
            queryset = queryset.filter(branch=self.request.user.branch)
        
        product = self.request.query_params.get('product', None)
        movement_type = self.request.query_params.get('movement_type', None)
        
        if product:
            queryset = queryset.filter(product_id=product)
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)
        
        return queryset.order_by('-created_at')
