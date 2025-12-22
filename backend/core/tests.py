from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import User

# Create your tests here.

class UserUpdateTest(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username='manager',
            email='manager@example.com',
            password='password123',
            role='manager'
        )
        self.client.force_authenticate(user=self.manager)
        self.url = reverse('user-detail', args=[self.manager.id])

    def test_manager_can_update_own_profile(self):
        data = {
            'first_name': 'Updated Name'
        }
        response = self.client.patch(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manager.refresh_from_db()
        self.assertEqual(self.manager.first_name, 'Updated Name')

    def test_manager_cannot_promote_to_admin(self):
        # Create a cashier
        cashier = User.objects.create_user(
            username='cashier',
            email='cashier@example.com',
            password='password123',
            role='cashier',
            branch=self.manager.branch # Assuming manager has a branch or can see all?
        )
        # Manager tries to promote cashier to admin
        url = reverse('user-detail', args=[cashier.id])
        data = {
            'role': 'admin'
        }
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
