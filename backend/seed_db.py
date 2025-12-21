import os
import sys
import django
import random
from decimal import Decimal
from datetime import date, timedelta

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Branch, Category
from suppliers.models import Supplier
from inventory.models import Product, StockMovement
from customers.models import Customer, LoyaltyTier, LoyaltyTransaction
from sales.models import Sale, SaleItem, Return
from payments.models import Payment, MpesaTransaction
from shifts.models import Shift, ShiftTransaction

User = get_user_model()

def clean_database():
    print("Cleaning database...")
    # Delete in reverse order of dependencies
    MpesaTransaction.objects.all().delete()
    Payment.objects.all().delete()
    Return.objects.all().delete()
    SaleItem.objects.all().delete()
    ShiftTransaction.objects.all().delete()
    Sale.objects.all().delete()
    Shift.objects.all().delete()
    StockMovement.objects.all().delete()
    LoyaltyTransaction.objects.all().delete()
    
    Product.objects.all().delete()
    Supplier.objects.all().delete()
    Category.objects.all().delete()
    Customer.objects.all().delete()
    User.objects.all().delete()
    Branch.objects.all().delete()
    print("Database cleaned.")

def create_branches():
    print("Creating 5 branches...")
    branches = []
    locations = ['Nairobi CBD', 'Westlands', 'Karen', 'Kilimani', 'Mombasa Road']
    for i in range(5):
        branch = Branch.objects.create(
            name=f"Branch {locations[i]}",
            location=f"{locations[i]}, Kenya",
            phone=f"+25470000000{i}",
            email=f"branch{i}@supermarket.com",
            tax_id=f"KRA000000{i}",
            is_active=True
        )
        branches.append(branch)
    return branches

def create_users(branches):
    print("Creating 10 users...")
    # 1 Admin
    User.objects.create_superuser(
        username='admin',
        email='admin@supermarket.com',
        password='password123',
        role='admin',
        phone='+254711000000',
        employee_id='EMP001',
        branch=branches[0]
    )
    
    # 3 Managers
    for i in range(3):
        User.objects.create_user(
            username=f'manager{i+1}',
            email=f'manager{i+1}@supermarket.com',
            password='password123',
            role='manager',
            phone=f'+25472200000{i}',
            employee_id=f'EMP00{i+2}',
            branch=branches[i % len(branches)]
        )
        
    # 6 Cashiers
    for i in range(6):
        User.objects.create_user(
            username=f'cashier{i+1}',
            email=f'cashier{i+1}@supermarket.com',
            password='password123',
            role='cashier',
            phone=f'+25473300000{i}',
            employee_id=f'EMP01{i}',
            branch=branches[i % len(branches)]
        )

def create_categories():
    print("Creating 20 categories...")
    categories = []
    cat_names = [
        'Fruits', 'Vegetables', 'Dairy', 'Meat', 'Bakery', 
        'Beverages', 'Snacks', 'Canned Food', 'Frozen Food', 'Condiments',
        'Cleaning', 'Personal Care', 'Baby Care', 'Pet Food', 'Household',
        'Electronics', 'Stationery', 'Toys', 'Clothing', 'Automotive'
    ]
    
    for name in cat_names:
        cat = Category.objects.create(
            name=name,
            description=f"All kinds of {name}"
        )
        categories.append(cat)
    return categories

def create_suppliers():
    print("Creating 10 suppliers...")
    suppliers = []
    for i in range(10):
        sup = Supplier.objects.create(
            name=f"Supplier {i+1}",
            contact_person=f"Contact {i+1}",
            email=f"supplier{i+1}@example.com",
            phone=f"+25474400000{i}",
            address=f"Address {i+1}, Industrial Area",
            tax_id=f"SUPKRA{i}",
            payment_terms="Net 30",
            is_active=True
        )
        suppliers.append(sup)
    return suppliers

def create_products(categories, branches, suppliers):
    print("Creating 50 products...")
    for i in range(50):
        category = random.choice(categories)
        branch = random.choice(branches)
        supplier = random.choice(suppliers)
        price = Decimal(random.uniform(50, 5000)).quantize(Decimal('0.01'))
        cost_price = (price * Decimal('0.7')).quantize(Decimal('0.01'))
        
        Product.objects.create(
            name=f"Product {category.name} {i+1}",
            barcode=f"8000000000{i:02d}",
            category=category,
            description=f"Description for product {i+1}",
            price=price,
            cost_price=cost_price,
            stock_quantity=random.randint(10, 100),
            reorder_level=10,
            branch=branch,
            is_active=True,
            tax_rate=Decimal('16.00'),
            supplier=supplier
        )

def create_customers():
    print("Creating 50 customers...")
    # Ensure LoyaltyTiers exist
    tiers = [
        ('bronze', 'Bronze', 0, 1.0, 0),
        ('silver', 'Silver', 10000, 1.2, 2),
        ('gold', 'Gold', 50000, 1.5, 5)
    ]
    for name, display, min_amt, mult, disc in tiers:
        LoyaltyTier.objects.get_or_create(
            name=name,
            defaults={
                'min_purchase_amount': min_amt,
                'points_multiplier': mult,
                'discount_percentage': disc
            }
        )

    for i in range(50):
        Customer.objects.create(
            name=f"Customer {i+1}",
            phone=f"+2547550000{i:02d}",
            email=f"customer{i+1}@example.com",
            tier='bronze',
            total_points=random.randint(0, 500),
            lifetime_purchases=Decimal(random.uniform(0, 50000)).quantize(Decimal('0.01')),
            birthday=date(1990, 1, 1) + timedelta(days=random.randint(0, 10000)),
            address=f"Customer Address {i+1}",
            is_active=True
        )

def run():
    clean_database()
    branches = create_branches()
    create_users(branches)
    categories = create_categories()
    suppliers = create_suppliers()
    create_products(categories, branches, suppliers)
    create_customers()
    print("Database seeded successfully!")

if __name__ == '__main__':
    run()
