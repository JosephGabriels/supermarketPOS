from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Branch

User = get_user_model()

class Command(BaseCommand):
    help = 'Create test users for the SupermarketPOS application'

    def handle(self, *args, **options):
        # Get or create branches
        main_branch, _ = Branch.objects.get_or_create(
            name='Main Branch',
            defaults={
                'location': 'Downtown Plaza, Nairobi',
                'phone': '+254700123456',
                'email': 'main@supermarket.co.ke',
                'tax_id': 'KRA123456789',
                'is_active': True
            }
        )

        westlands_branch, _ = Branch.objects.get_or_create(
            name='Westlands Branch',
            defaults={
                'location': 'Westlands Shopping Mall, Nairobi',
                'phone': '+254700123457',
                'email': 'westlands@supermarket.co.ke',
                'tax_id': 'KRA123456790',
                'is_active': True
            }
        )

        # Create test users
        users_data = [
            {
                'username': 'admin',
                'email': 'admin@supermarket.co.ke',
                'first_name': 'System',
                'last_name': 'Administrator',
                'role': 'admin',
                'branch': main_branch,
                'phone': '+254700000001',
                'employee_id': 'EMP001',
                'is_active': True
            },
            {
                'username': 'manager1',
                'email': 'manager1@supermarket.co.ke',
                'first_name': 'John',
                'last_name': 'Manager',
                'role': 'manager',
                'branch': main_branch,
                'phone': '+254700000002',
                'employee_id': 'EMP002',
                'is_active': True
            },
            {
                'username': 'cashier1',
                'email': 'cashier1@supermarket.co.ke',
                'first_name': 'Mary',
                'last_name': 'Cashier',
                'role': 'cashier',
                'branch': main_branch,
                'phone': '+254700000003',
                'employee_id': 'EMP003',
                'is_active': True
            },
            {
                'username': 'cashier2',
                'email': 'cashier2@supermarket.co.ke',
                'first_name': 'Peter',
                'last_name': 'Worker',
                'role': 'cashier',
                'branch': westlands_branch,
                'phone': '+254700000004',
                'employee_id': 'EMP004',
                'is_active': True
            }
        ]

        for user_data in users_data:
            password = 'password123'
            
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults=user_data
            )
            
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Created user: {user.username} ({user.role})'))
            else:
                # Update existing user
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.WARNING(f'Updated user: {user.username} ({user.role})'))

        self.stdout.write(self.style.SUCCESS('Test users created successfully!'))
        self.stdout.write('Default password for all users: password123')
        self.stdout.write('\nLogin with:')
        self.stdout.write('- admin / password123 (Admin - sees all users)')
        self.stdout.write('- manager1 / password123 (Manager - sees users in Main Branch)')
        self.stdout.write('- cashier1 / password123 (Cashier - sees only self)')
        self.stdout.write('- cashier2 / password123 (Cashier - sees only self)')