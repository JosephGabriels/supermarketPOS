from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from .models import Shift, ShiftTransaction
from .serializers import (ShiftSerializer, ShiftDetailSerializer, ShiftOpenSerializer,
                          ShiftCloseSerializer, ShiftTransactionSerializer)
from core.permissions import IsCashier, IsManager


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ShiftDetailSerializer
        return ShiftSerializer
    
    def get_queryset(self):
        queryset = Shift.objects.all()
        
        if self.request.user.role == 'cashier':
            queryset = queryset.filter(cashier=self.request.user)
        elif self.request.user.role != 'admin' and self.request.user.branch:
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
            queryset = queryset.filter(opening_time__gte=date_from)
        if date_to:
            queryset = queryset.filter(opening_time__lte=date_to)
        
        return queryset.select_related('cashier', 'branch', 'closed_by').order_by('-opening_time')
    
    @transaction.atomic
    @action(detail=False, methods=['post'])
    def open_shift(self, request):
        open_shift = Shift.objects.filter(
            cashier=request.user,
            status='open'
        ).first()

        if open_shift:
            return Response({'error': 'You already have an open shift'},
                          status=status.HTTP_400_BAD_REQUEST)

        serializer = ShiftOpenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        shift = Shift.objects.create(
            cashier=request.user,
            branch=request.user.branch,
            opening_cash=data['opening_cash'],
            notes=data.get('notes', ''),
            status='open',
            created_by=request.user
        )

        response_serializer = ShiftSerializer(shift)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def close_shift(self, request, pk=None):
        shift = self.get_object()
        
        if shift.status != 'open':
            return Response({'error': 'Shift is already closed'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if shift.cashier != request.user and request.user.role not in ['manager', 'admin']:
            return Response({'error': 'You can only close your own shift'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        serializer = ShiftCloseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        shift.closing_time = timezone.now()
        shift.closing_cash = data['closing_cash']
        shift.notes += f"\n\nClosed: {data.get('notes', '')}" if data.get('notes') else ''
        shift.status = 'closed'
        shift.closed_by = request.user
        
        shift.calculate_expected_cash()
        
        shift.save()
        
        response_serializer = ShiftDetailSerializer(shift)
        return Response(response_serializer.data)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        shift = Shift.objects.filter(
            cashier=request.user,
            status='open'
        ).first()
        
        if not shift:
            return Response({'error': 'No open shift found'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        serializer = ShiftDetailSerializer(shift)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        shift = self.get_object()
        
        from sales.models import Sale
        from payments.models import Payment
        from django.db.models import Sum, Count
        
        sales = Sale.objects.filter(shift=shift, status='completed')
        sales_summary = sales.aggregate(
            total_sales=Count('id'),
            total_amount=Sum('total_amount'),
            total_tax=Sum('tax_amount'),
            total_discount=Sum('discount_amount')
        )
        
        payments = Payment.objects.filter(sale__shift=shift, status='completed')
        payment_summary = {}
        for method in ['cash', 'mpesa', 'card', 'airtel_money', 'bank_transfer']:
            total = payments.filter(payment_method=method).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            payment_summary[method] = total
            
        # Calculate expected cash dynamically
        # Expected Cash = Opening Cash + Cash Payments - Change Given
        # Change Given = Total Payments - Sale Total (where Total Payments > Sale Total)
        
        total_change = Decimal('0.00')
        for sale in sales:
            sale_payments = payments.filter(sale=sale)
            sale_total_paid = sale_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            if sale_total_paid > sale.total_amount:
                total_change += (sale_total_paid - sale.total_amount)
        
        # Update cash in payment summary to reflect net cash (after change)
        if 'cash' in payment_summary:
            payment_summary['cash'] -= total_change

        cash_total = payment_summary.get('cash', Decimal('0.00'))
        expected_cash = shift.opening_cash + cash_total
        
        shift_data = ShiftDetailSerializer(shift).data
        shift_data['expected_cash'] = expected_cash
        
        report_data = {
            'shift': shift_data,
            'sales_summary': sales_summary,
            'payment_summary': payment_summary,
            'cash_variance': shift.cash_difference if shift.cash_difference else Decimal('0.00')
        }
        
        return Response(report_data)


class ShiftTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ShiftTransaction.objects.all()
    serializer_class = ShiftTransactionSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = ShiftTransaction.objects.all()
        
        shift = self.request.query_params.get('shift', None)
        payment_method = self.request.query_params.get('payment_method', None)
        
        if shift:
            queryset = queryset.filter(shift_id=shift)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        return queryset.select_related('shift', 'sale').order_by('-created_at')
