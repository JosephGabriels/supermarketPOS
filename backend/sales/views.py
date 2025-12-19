from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from .models import Sale, SaleItem, Discount, Return
from inventory.models import Product, StockMovement
from customers.models import Customer, LoyaltyTransaction
from shifts.models import Shift
from .serializers import (SaleSerializer, SaleCreateSerializer, SaleCompleteSerializer,
                          DiscountSerializer, ReturnSerializer, ReturnCreateSerializer)
from core.permissions import IsCashier, IsManager


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = Sale.objects.all()
        
        if self.request.user.role != 'admin':
            queryset = queryset.filter(branch=self.request.user.branch)
        
        status_filter = self.request.query_params.get('status', None)
        cashier = self.request.query_params.get('cashier', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if cashier:
            queryset = queryset.filter(cashier_id=cashier)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset.select_related('cashier', 'branch', 'customer').prefetch_related('items').order_by('-created_at')
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = SaleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        current_shift = Shift.objects.filter(
            cashier=request.user,
            status='open'
        ).first()
        
        if not current_shift:
            return Response({'error': 'No open shift found. Please open a shift first.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        customer = None
        if data.get('customer_id'):
            try:
                customer = Customer.objects.get(id=data['customer_id'])
            except Customer.DoesNotExist:
                return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        
        sale = Sale.objects.create(
            branch=request.user.branch,
            cashier=request.user,
            customer=customer,
            shift=current_shift,
            subtotal=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            discount_amount=data.get('discount_amount', Decimal('0.00')),
            total_amount=Decimal('0.00'),
            notes=data.get('notes', ''),
            created_by=request.user
        )
        
        for item_data in data['items']:
            product = None
            unit_price = item_data.get('unit_price')
            
            if item_data.get('product_id'):
                try:
                    product = Product.objects.get(id=item_data['product_id'])
                    if not unit_price:
                        unit_price = product.price
                except Product.DoesNotExist:
                    sale.delete()
                    return Response({'error': f'Product {item_data["product_id"]} not found'}, 
                                  status=status.HTTP_404_NOT_FOUND)
            elif item_data.get('barcode'):
                try:
                    product = Product.objects.get(barcode=item_data['barcode'], branch=request.user.branch)
                    if not unit_price:
                        unit_price = product.price
                except Product.DoesNotExist:
                    sale.delete()
                    return Response({'error': f'Product with barcode {item_data["barcode"]} not found'}, 
                                  status=status.HTTP_404_NOT_FOUND)
            
            if not product and not item_data.get('is_ad_hoc'):
                sale.delete()
                return Response({'error': 'Product is required for non-ad-hoc items'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            quantity = item_data['quantity']
            discount = item_data.get('discount', Decimal('0.00'))
            
            tax_rate = product.tax_rate if product else Decimal('16.00')
            item_subtotal = (unit_price * quantity) - discount
            item_tax = item_subtotal * (tax_rate / 100)
            
            sale_item = SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                discount=discount,
                subtotal=item_subtotal,
                tax_rate=tax_rate,
                tax_amount=item_tax,
                is_ad_hoc=item_data.get('is_ad_hoc', False),
                ad_hoc_name=item_data.get('ad_hoc_name', '')
            )
            
            subtotal += item_subtotal
            tax_amount += item_tax
        
        discount_code = data.get('discount_code')
        if discount_code:
            try:
                discount = Discount.objects.get(code=discount_code, is_active=True)
                if discount.is_valid:
                    if discount.discount_type == 'percentage':
                        sale.discount_amount = subtotal * (discount.value / 100)
                    else:
                        sale.discount_amount = discount.value
                    
                    discount.times_used += 1
                    discount.save()
            except Discount.DoesNotExist:
                pass
        
        sale.subtotal = subtotal
        sale.tax_amount = tax_amount
        sale.total_amount = subtotal + tax_amount - sale.discount_amount
        sale.save()
        
        response_serializer = SaleSerializer(sale)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        sale = self.get_object()
        
        if sale.status != 'pending':
            return Response({'error': 'Sale is already completed or cancelled'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        for item in sale.items.all():
            if not item.is_ad_hoc and item.product:
                product = item.product
                previous_quantity = product.stock_quantity
                product.stock_quantity -= item.quantity
                product.save()
                
                StockMovement.objects.create(
                    product=product,
                    movement_type='sale',
                    quantity=-item.quantity,
                    previous_quantity=previous_quantity,
                    new_quantity=product.stock_quantity,
                    reason=f'Sale {sale.sale_number}',
                    reference_id=sale.sale_number,
                    branch=sale.branch,
                    created_by=request.user
                )
        
        if sale.customer:
            points_earned = int(sale.total_amount / 100)
            
            if points_earned > 0:
                previous_points = sale.customer.total_points
                sale.customer.total_points += points_earned
                sale.customer.lifetime_purchases += sale.total_amount
                sale.customer.save()
                
                LoyaltyTransaction.objects.create(
                    customer=sale.customer,
                    points=points_earned,
                    transaction_type='earn',
                    sale=sale,
                    description=f'Earned from sale {sale.sale_number}',
                    previous_points=previous_points,
                    new_points=sale.customer.total_points,
                    created_by=request.user
                )
                
                sale.customer.update_tier()
        
        sale.status = 'completed'
        sale.save()
        
        shift = sale.shift
        if shift:
            shift.total_sales += sale.total_amount
            shift.total_transactions += 1
            shift.save()
        
        serializer = SaleSerializer(sale)
        return Response(serializer.data)


class DiscountViewSet(viewsets.ModelViewSet):
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated(), IsCashier()]
    
    def get_queryset(self):
        queryset = Discount.objects.all()
        
        code = self.request.query_params.get('code', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if code:
            queryset = queryset.filter(code=code)
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def validate_code(self, request):
        code = request.data.get('code', None)
        if not code:
            return Response({'error': 'Code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            discount = Discount.objects.get(code=code)
            if discount.is_valid:
                serializer = DiscountSerializer(discount)
                return Response(serializer.data)
            else:
                return Response({'error': 'Discount code is not valid'}, status=status.HTTP_400_BAD_REQUEST)
        except Discount.DoesNotExist:
            return Response({'error': 'Discount code not found'}, status=status.HTTP_404_NOT_FOUND)


class ReturnViewSet(viewsets.ModelViewSet):
    queryset = Return.objects.all()
    serializer_class = ReturnSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = Return.objects.all()
        
        if self.request.user.role != 'admin':
            queryset = queryset.filter(branch=self.request.user.branch)
        
        return queryset.select_related('original_sale', 'customer', 'manager_approval').order_by('-created_at')
