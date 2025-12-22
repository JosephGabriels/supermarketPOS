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
    date_str = request.query_params.get('date', timezone.localtime(timezone.now()).date().isoformat())
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
    date_from_str = request.query_params.get('date_from', (timezone.localtime(timezone.now()).date() - timedelta(days=30)).isoformat())
    date_to_str = request.query_params.get('date_to', timezone.localtime(timezone.now()).date().isoformat())
    
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
    date_from_str = request.query_params.get('date_from', timezone.localtime(timezone.now()).date().replace(day=1).isoformat())
    date_to_str = request.query_params.get('date_to', timezone.localtime(timezone.now()).date().isoformat())
    
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
    
    now = timezone.localtime(timezone.now())
    
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    now = timezone.localtime(timezone.now())
    today = now.date()
    month_start = today.replace(day=1)
    
    data = {}
    
    from customers.models import Customer
    total_customers = Customer.objects.filter(is_active=True).count()

    if user.role == 'admin':
        # Admin sees global stats
        sales_month = Sale.objects.filter(created_at__date__gte=month_start, status='completed')
        total_revenue = sales_month.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        total_orders = sales_month.count()
        active_users = User.objects.filter(is_active=True).count()

        # Calculate changes (mock logic for now or compare with previous month)
        prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
        prev_month_end = month_start - timedelta(days=1)
        sales_prev_month = Sale.objects.filter(
            created_at__date__gte=prev_month_start, 
            created_at__date__lte=prev_month_end, 
            status='completed'
        )
        prev_revenue = sales_prev_month.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        revenue_change = 0
        if prev_revenue > 0:
            revenue_change = ((total_revenue - prev_revenue) / prev_revenue) * 100

        data = {
            'role': 'admin',
            'totalRevenue': f"{total_revenue:.2f}",
            'totalRevenueChange': f"{revenue_change:+.1f}%" if revenue_change != 0 else "0%",
            'activeUsers': active_users,
            'activeUsersChange': '0%', # Placeholder
            'totalOrders': total_orders,
            'totalOrdersChange': '0%', # Placeholder
            'conversionRate': 'N/A',
            'conversionRateChange': '0%',
            'totalCustomers': total_customers,
        }

    elif user.role == 'manager':
        # Manager sees branch stats
        branch = user.branch
        sales_month = Sale.objects.filter(
            branch=branch,
            created_at__date__gte=month_start, 
            status='completed'
        )
        total_revenue = sales_month.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        total_orders = sales_month.count()
        active_users = User.objects.filter(branch=branch, is_active=True).count()

        data = {
            'role': 'manager',
            'branch': branch.name,
            'totalRevenue': f"{total_revenue:.2f}",
            'totalRevenueChange': '0%', # Placeholder
            'activeUsers': active_users,
            'activeUsersChange': '0%',
            'totalOrders': total_orders,
            'totalOrdersChange': '0%',
            'conversionRate': 'N/A',
            'conversionRateChange': '0%',
            'totalCustomers': total_customers,
        }

    elif user.role == 'cashier':
        # Cashier sees own stats for today
        my_sales_today = Sale.objects.filter(
            cashier=user,
            created_at__date=today,
            status='completed'
        )
        total_revenue = my_sales_today.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        total_orders = my_sales_today.count()

        # Shifts this month
        shifts_month = Shift.objects.filter(
            cashier=user,
            opening_time__date__gte=month_start
        ).count()

        data = {
            'role': 'cashier',
            'totalRevenue': f"{total_revenue:.2f}", # Today's revenue
            'totalRevenueChange': 'Today',
            'activeUsers': shifts_month, # Using this field for Shifts count
            'activeUsersChange': 'Shifts',
            'totalOrders': total_orders,
            'totalOrdersChange': 'Today',
            'conversionRate': 'N/A',
            'conversionRateChange': '0%',
            'totalCustomers': shifts_month, # Mapping shifts count to totalCustomers field for frontend compatibility
        }

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    user = request.user
    activities = []
    
    # Get recent sales
    sales_qs = Sale.objects.filter(status='completed').select_related('cashier').order_by('-created_at')
    
    if user.role == 'manager':
        sales_qs = sales_qs.filter(branch=user.branch)
    elif user.role == 'cashier':
        sales_qs = sales_qs.filter(cashier=user)
        
    # Get last 10 sales
    recent_sales = sales_qs[:10]
    
    from django.utils.timesince import timesince
    
    for sale in recent_sales:
        time_ago = timesince(sale.created_at)
        # Keep it short, e.g., "2 minutes" -> "2 min ago"
        time_display = f"{time_ago.split(',')[0]} ago"
        
        activities.append({
            'id': sale.id,
            'type': 'sale',
            'message': f"Sale #{sale.sale_number}",
            'time': time_display,
            'amount': f"KES {sale.total_amount}",
            'user': sale.cashier.get_full_name() or sale.cashier.username
        })
        
    return Response(activities)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def revenue_chart_data(request):
    user = request.user
    
    # Last 6 months
    today = timezone.localtime(timezone.now()).date()
    months = []
    for i in range(5, -1, -1):
        d = today.replace(day=1) - timedelta(days=i*30)
        months.append(d.replace(day=1))
        
    data = []
    
    for month_start in months:
        # Calculate month end
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)
            
        sales_qs = Sale.objects.filter(
            created_at__date__gte=month_start,
            created_at__date__lte=month_end,
            status='completed'
        )
        
        if user.role == 'manager':
            sales_qs = sales_qs.filter(branch=user.branch)
        # Cashiers don't see this chart usually, but if they did, filter by cashier?
        # For now assuming only Admin/Manager see charts as per Dashboard.tsx
            
        revenue = sales_qs.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        orders = sales_qs.count()
        
        # Unique customers (if we had customer tracking linked to sales properly)
        # For now, just count unique sales as a proxy or 0
        users = 0 
        
        data.append({
            'month': month_start.strftime('%b'),
            'revenue': float(revenue),
            'users': users,
            'orders': orders
        })
        
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_channels_data(request):
    user = request.user
    
    # In a real app, we might have 'channel' field on Sale (e.g. POS, Online, App)
    # For this system, we can simulate channels based on payment methods or just return mock data 
    # BUT the user asked for REAL data.
    # Since we don't have explicit "channels", let's use Payment Methods as a proxy for "Channels" 
    # or just group by something relevant.
    
    # Let's use Payment Methods as "Channels" for now as it's the closest real data we have
    
    sales_qs = Sale.objects.filter(status='completed')
    if user.role == 'manager':
        sales_qs = sales_qs.filter(branch=user.branch)
        
    # We need to join with Payment to get methods
    # This might be heavy, so let's just aggregate on Payment model directly
    
    payments_qs = Payment.objects.filter(status='completed')
    if user.role == 'manager':
        payments_qs = payments_qs.filter(sale__branch=user.branch)
        
    methods = payments_qs.values('payment_method').annotate(total=Count('id')).order_by('-total')
    
    data = []
    for item in methods:
        method_name = item['payment_method'].replace('_', ' ').title()
        data.append({
            'name': method_name,
            'value': item['total']
        })
        
    # If no data, return empty or defaults
    if not data:
        data = [
            {'name': 'Cash', 'value': 0},
            {'name': 'Mpesa', 'value': 0},
            {'name': 'Card', 'value': 0}
        ]
        
    return Response(data)
