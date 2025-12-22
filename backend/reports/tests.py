from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from core.models import User, Branch
from sales.models import Sale
from datetime import datetime
from unittest.mock import patch
from decimal import Decimal

class DashboardStatsTimezoneTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name="Test Branch", tax_id="P001")
        self.cashier = User.objects.create_user(
            username='cashier', 
            password='password', 
            role='cashier',
            branch=self.branch
        )
        self.client.force_authenticate(user=self.cashier)

    def test_dashboard_stats_timezone_handling(self):
        # Nairobi is UTC+3
        # We want a time that is Day 1 in UTC but Day 2 in Nairobi
        # e.g., 2024-01-01 22:00:00 UTC = 2024-01-02 01:00:00 Nairobi
        
        utc_time = datetime(2024, 1, 1, 22, 0, 0, tzinfo=timezone.utc)
        
        with patch('django.utils.timezone.now', return_value=utc_time):
            # Create a sale at this time
            sale = Sale.objects.create(
                sale_number='TEST-TZ',
                cashier=self.cashier,
                total_amount=Decimal('100.00'),
                subtotal=Decimal('90.00'),
                tax_amount=Decimal('10.00'),
                status='completed'
            )
            
            # Call dashboard_stats
            # We need to make sure the URL is correct. 
            # Assuming /api/reports/dashboard-stats/ based on views.py function name dashboard_stats
            # I should check urls.py to be sure.
            
            # Let's check urls.py first, but I'll assume it's mapped.
            # If not, I'll fix the test.
            
            response = self.client.get('/api/reports/dashboard-stats/')
            
            self.assertEqual(response.status_code, 200)
            data = response.json()
            
            # With the fix, this should be 100.00 because:
            # Local time is Jan 2.
            # Sale created_at (UTC) -> Local is Jan 2.
            # Query filters by Local Date (Jan 2).
            # Match!
            
            # Without the fix:
            # Query filters by UTC Date (Jan 1).
            # No match.
            
            self.assertEqual(float(data['totalRevenue']), 100.0)
            self.assertEqual(data['totalOrders'], 1)
