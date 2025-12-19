from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from sales.models import Sale, SaleItem
from inventory.models import Product
from core.models import User
from shifts.models import Shift
from payments.models import Payment
from .serializers import (DailySalesReportSerializer, CashierPerformanceSerializer,
                          StockAlertSerializer, TaxReportSerializer, SalesSummarySerializer)
from core.permissions import IsManager


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def daily_sales_report(request):
    date_str = request.query_params.get('date', timezone.now().date().isoformat())
    try:
        report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    
    branch_id = request.user.branch_id if request.user.role != 'admin' else request.query_params.get('branch')
    
    sales = Sale.objects.filter(
        created_at__date=report_date,
        status='completed'
    )
    
    if branch_id:
        sales = sales.filter(branch_id=branch_id)
    
    total_sales = sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
    total_transactions = sales.count()
    total_tax = sales.aggregate(total=Sum('tax_amount'))['total'] or Decimal('0.00')
    total_discounts = sales.aggregate(total=Sum('discount_amount'))['total'] or Decimal('0.00')
    
    payments = Payment.objects.filter(
        sale__in=sales,
        status='completed'
    )
    
    cash_sales = payments.filter(payment_method='cash').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    mpesa_sales = payments.filter(payment_method='mpesa').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    card_sales = payments.filter(payment_method='card').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    report_data = {
        'date': report_date,
        'total_sales': total_sales,
        'total_transactions': total_transactions,
        'cash_sales': cash_sales,
        'mpesa_sales': mpesa_sales,
        'card_sales': card_sales,
        'total_tax': total_tax,
        'total_discounts': total_discounts
    }
    
    serializer = DailySalesReportSerializer(report_data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def cashier_performance(request):
    date_from_str = request.query_params.get('date_from', (timezone.now().date() - timedelta(days=30)).isoformat())
    date_to_str = request.query_params.get('date_to', timezone.now().date().isoformat())
    
    try:
        date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
        date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    
    branch_id = request.user.branch_id if request.user.role != 'admin' else request.query_params.get('branch')
    
    cashiers = User.objects.filter(role='cashier')
    if branch_id:
        cashiers = cashiers.filter(branch_id=branch_id)
    
    performance_data = []
    
    for cashier in cashiers:
        sales = Sale.objects.filter(
            cashier=cashier,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
            status='completed'
        )
        
        total_sales = sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        total_transactions = sales.count()
        average_transaction = total_sales / total_transactions if total_transactions > 0 else Decimal('0.00')
        
        shifts_worked = Shift.objects.filter(
            cashier=cashier,
            opening_time__date__gte=date_from,
            opening_time__date__lte=date_to
        ).count()
        
        performance_data.append({
            'cashier_id': cashier.id,
            'cashier_name': cashier.get_full_name() or cashier.username,
            'total_sales': total_sales,
            'total_transactions': total_transactions,
            'average_transaction': average_transaction,
            'shifts_worked': shifts_worked
        })
    
    serializer = CashierPerformanceSerializer(performance_data, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def stock_alerts(request):
    branch_id = request.user.branch_id if request.user.role != 'admin' else request.query_params.get('branch')
    
    products = Product.objects.filter(is_active=True)
    if branch_id:
        products = products.filter(branch_id=branch_id)
    
    alerts = []
    
    for product in products:
        if product.is_low_stock:
            status_text = 'Critical' if product.stock_quantity == 0 else 'Low' if product.stock_quantity < product.reorder_level / 2 else 'Reorder'
            
            alerts.append({
                'product_id': product.id,
                'product_name': product.name,
                'barcode': product.barcode,
                'current_stock': product.stock_quantity,
                'reorder_level': product.reorder_level,
                'status': status_text
            })
    
    alerts.sort(key=lambda x: x['current_stock'])
    
    serializer = StockAlertSerializer(alerts, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def tax_report(request):
    date_from_str = request.query_params.get('date_from', timezone.now().date().replace(day=1).isoformat())
    date_to_str = request.query_params.get('date_to', timezone.now().date().isoformat())
    
    try:
        date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
        date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    
    branch_id = request.user.branch_id if request.user.role != 'admin' else request.query_params.get('branch')
    
    sales = Sale.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
        status='completed'
    )
    
    if branch_id:
        sales = sales.filter(branch_id=branch_id)
    
    daily_reports = []
    current_date = date_from
    
    while current_date <= date_to:
        day_sales = sales.filter(created_at__date=current_date)
        
        total_sales = day_sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        taxable_amount = day_sales.aggregate(total=Sum('subtotal'))['total'] or Decimal('0.00')
        tax_collected = day_sales.aggregate(total=Sum('tax_amount'))['total'] or Decimal('0.00')
        
        daily_reports.append({
            'date': current_date,
            'total_sales': total_sales,
            'taxable_amount': taxable_amount,
            'tax_collected': tax_collected,
            'tax_rate': Decimal('16.00')
        })
        
        current_date += timedelta(days=1)
    
    serializer = TaxReportSerializer(daily_reports, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManager])
def sales_summary(request):
    period = request.query_params.get('period', 'today')
    branch_id = request.user.branch_id if request.user.role != 'admin' else request.query_params.get('branch')
    
    now = timezone.now()
    
    if period == 'today':
        start_date = now.date()
        end_date = now.date()
    elif period == 'week':
        start_date = now.date() - timedelta(days=7)
        end_date = now.date()
    elif period == 'month':
        start_date = now.date().replace(day=1)
        end_date = now.date()
    else:
        start_date = now.date()
        end_date = now.date()
    
    sales = Sale.objects.filter(
        created_at__date__gte=start_date,
        created_at__date__lte=end_date,
        status='completed'
    )
    
    if branch_id:
        sales = sales.filter(branch_id=branch_id)
    
    total_sales = sales.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
    total_transactions = sales.count()
    average_transaction = total_sales / total_transactions if total_transactions > 0 else Decimal('0.00')
    
    top_products = SaleItem.objects.filter(
        sale__in=sales
    ).values(
        'product__name'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum(F('subtotal') + F('tax_amount'))
    ).order_by('-total_revenue')[:10]
    
    top_selling_products = [
        {
            'product_name': item['product__name'],
            'quantity_sold': item['total_quantity'],
            'revenue': item['total_revenue']
        }
        for item in top_products
    ]
    
    summary_data = {
        'period': period,
        'total_sales': total_sales,
        'total_transactions': total_transactions,
        'average_transaction': average_transaction,
        'top_selling_products': top_selling_products
    }
    
    serializer = SalesSummarySerializer(summary_data)
    return Response(serializer.data)
