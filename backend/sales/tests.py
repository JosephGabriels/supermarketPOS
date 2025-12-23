from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse

from core.models import Branch, User
from inventory.models import Product, StockMovement
from sales.models import Sale, SaleItem


class SalesAPITest(TestCase):
	def setUp(self):
		# Create branch and user
		self.branch = Branch.objects.create(name='Test Branch', location='Test', phone='000', email='t@example.com', tax_id='PIN123')
		self.user = User.objects.create_user(username='cashier', password='pass1234')
		self.user.role = 'cashier'
		self.user.branch = self.branch
		self.user.save()

		# Create product
		self.product = Product.objects.create(
			name='Test Product',
			barcode='TEST123456',
			category=None,
			description='Test',
			price=100.00,
			cost_price=60.00,
			stock_quantity=10,
			reorder_level=2,
			branch=self.branch,
			is_active=True,
			tax_rate=16.00
		)

		self.client = APIClient()
		self.client.force_authenticate(user=self.user)

	def test_create_and_complete_sale(self):
		# Create sale via API
		sale_payload = {
			'customer_id': None,
			'items': [
				{
					'product_id': self.product.id,
					'quantity': 2,
				}
			],
			'discount_amount': '0.00',
			'points_discount': '0.00',
			'notes': 'Test sale'
		}

		create_resp = self.client.post('/api/sales/', sale_payload, format='json')
		self.assertEqual(create_resp.status_code, 201, msg=f"Create sale failed: {create_resp.content}")
		sale_id = create_resp.data.get('id')
		self.assertIsNotNone(sale_id)

		# Ensure sale exists in DB
		sale = Sale.objects.filter(id=sale_id).first()
		self.assertIsNotNone(sale)
		self.assertEqual(sale.items.count(), 1)

		# Complete sale
		complete_resp = self.client.post(f'/api/sales/{sale_id}/complete/')
		self.assertEqual(complete_resp.status_code, 200, msg=f"Complete sale failed: {complete_resp.content}")

		# Refresh product from DB
		self.product.refresh_from_db()
		self.assertEqual(self.product.stock_quantity, 8)

		# Check StockMovement created
		movement = StockMovement.objects.filter(product=self.product).order_by('-created_at').first()
		self.assertIsNotNone(movement)
		self.assertEqual(movement.movement_type, 'sale')
		self.assertEqual(movement.quantity, -2)

	def test_sales_statistics(self):
		# Create a sale today
		sale = Sale.objects.create(
			branch=self.branch,
			cashier=self.user,
			total_amount=200.00,
			subtotal=200.00,
			tax_amount=0.00,
			discount_amount=0.00,
			created_by=self.user
		)
		
		response = self.client.get('/api/sales/statistics/')
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['today']['count'], 1)
		self.assertEqual(float(response.data['today']['total']), 200.00)
		self.assertEqual(response.data['week']['count'], 1)
		self.assertEqual(float(response.data['week']['total']), 200.00)

