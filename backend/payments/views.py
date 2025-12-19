from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal
import requests
import base64
from datetime import datetime
from .models import Payment, MpesaTransaction
from sales.models import Sale
from .serializers import (PaymentSerializer, PaymentCreateSerializer, 
                          MpesaSTKPushSerializer, MpesaCallbackSerializer, 
                          MpesaTransactionSerializer)
from core.permissions import IsCashier


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = Payment.objects.all()
        
        sale = self.request.query_params.get('sale', None)
        payment_method = self.request.query_params.get('payment_method', None)
        status_filter = self.request.query_params.get('status', None)
        
        if sale:
            queryset = queryset.filter(sale_id=sale)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('sale', 'processed_by').order_by('-processed_at')
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = PaymentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            sale = Sale.objects.get(id=data['sale_id'])
        except Sale.DoesNotExist:
            return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if sale.status != 'pending':
            return Response({'error': 'Sale is already completed or cancelled'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        total_payments = Payment.objects.filter(
            sale=sale, 
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        if total_payments + data['amount'] > sale.total_amount:
            return Response({'error': 'Payment amount exceeds sale total'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        payment = Payment.objects.create(
            sale=sale,
            payment_method=data['payment_method'],
            amount=data['amount'],
            reference_number=data.get('reference_number', ''),
            phone_number=data.get('phone_number', ''),
            notes=data.get('notes', ''),
            status='completed' if data['payment_method'] in ['cash', 'card'] else 'pending',
            processed_by=request.user
        )
        
        total_paid = total_payments + data['amount']
        if total_paid >= sale.total_amount:
            sale.status = 'completed'
            sale.save()
        
        response_serializer = PaymentSerializer(payment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def mpesa_stk_push(self, request):
        serializer = MpesaSTKPushSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            sale = Sale.objects.get(id=data['sale_id'])
        except Sale.DoesNotExist:
            return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
        
        payment = Payment.objects.create(
            sale=sale,
            payment_method='mpesa',
            amount=data['amount'],
            phone_number=data['phone_number'],
            status='pending',
            processed_by=request.user
        )
        
        mpesa_transaction = MpesaTransaction.objects.create(
            payment=payment,
            phone_number=data['phone_number'],
            amount=data['amount']
        )
        
        return Response({
            'message': 'M-Pesa STK Push initiated',
            'payment_id': payment.id,
            'transaction_id': mpesa_transaction.id,
            'note': 'M-Pesa integration requires credentials. Proceeding with manual confirmation mode.'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def confirm_mpesa(self, request, pk=None):
        payment = self.get_object()
        
        if payment.payment_method != 'mpesa':
            return Response({'error': 'Payment is not an M-Pesa payment'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if payment.status == 'completed':
            return Response({'error': 'Payment already confirmed'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        mpesa_code = request.data.get('mpesa_receipt_number', None)
        if not mpesa_code:
            return Response({'error': 'M-Pesa receipt number is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        payment.status = 'completed'
        payment.reference_number = mpesa_code
        payment.save()
        
        if hasattr(payment, 'mpesa_transaction'):
            mpesa_transaction = payment.mpesa_transaction
            mpesa_transaction.mpesa_receipt_number = mpesa_code
            mpesa_transaction.transaction_date = timezone.now()
            mpesa_transaction.result_code = '0'
            mpesa_transaction.result_desc = 'Manually confirmed'
            mpesa_transaction.save()
        
        total_payments = Payment.objects.filter(
            sale=payment.sale,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        if total_payments >= payment.sale.total_amount:
            payment.sale.status = 'completed'
            payment.sale.save()
        
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback(request):
    serializer = MpesaCallbackSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        
        try:
            mpesa_transaction = MpesaTransaction.objects.get(
                checkout_request_id=data['checkout_request_id']
            )
            
            mpesa_transaction.result_code = data['result_code']
            mpesa_transaction.result_desc = data['result_desc']
            mpesa_transaction.mpesa_receipt_number = data.get('mpesa_receipt_number', '')
            mpesa_transaction.transaction_date = timezone.now()
            mpesa_transaction.save()
            
            payment = mpesa_transaction.payment
            
            if data['result_code'] == '0':
                payment.status = 'completed'
                payment.reference_number = data.get('mpesa_receipt_number', '')
            else:
                payment.status = 'failed'
            
            payment.save()
            
            if payment.status == 'completed':
                total_payments = Payment.objects.filter(
                    sale=payment.sale,
                    status='completed'
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                if total_payments >= payment.sale.total_amount:
                    payment.sale.status = 'completed'
                    payment.sale.save()
            
            return Response({'message': 'Callback processed successfully'})
        
        except MpesaTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
