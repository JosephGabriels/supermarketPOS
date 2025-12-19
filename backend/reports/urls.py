from django.urls import path
from .views import (daily_sales_report, cashier_performance, stock_alerts, 
                    tax_report, sales_summary)

urlpatterns = [
    path('daily-sales/', daily_sales_report, name='daily_sales_report'),
    path('cashier-performance/', cashier_performance, name='cashier_performance'),
    path('stock-alerts/', stock_alerts, name='stock_alerts'),
    path('tax-report/', tax_report, name='tax_report'),
    path('sales-summary/', sales_summary, name='sales_summary'),
]
