from django.urls import path
from .views import (daily_sales_report, cashier_performance, stock_alerts, 
                    tax_report, sales_summary, dashboard_stats, recent_activity,
                    revenue_chart_data, sales_channels_data)

urlpatterns = [
    path('daily-sales/', daily_sales_report, name='daily_sales_report'),
    path('cashier-performance/', cashier_performance, name='cashier_performance'),
    path('stock-alerts/', stock_alerts, name='stock_alerts'),
    path('tax-report/', tax_report, name='tax_report'),
    path('sales-summary/', sales_summary, name='sales_summary'),
    path('dashboard-stats/', dashboard_stats, name='dashboard_stats'),
    path('recent-activity/', recent_activity, name='recent_activity'),
    path('revenue-chart/', revenue_chart_data, name='revenue_chart_data'),
    path('sales-channels/', sales_channels_data, name='sales_channels_data'),
]
