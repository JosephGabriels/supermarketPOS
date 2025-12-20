#!/usr/bin/env python3
"""
Sample data creation script for SupermarketPOS
Run this script to create basic categories, suppliers, and branches for testing
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/Users/josephgabriel/Development/SupermarketPOS/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Branch, Category
from suppliers.models import Supplier

def create_sample_data():
    """Create sample data for the application"""
    print("Creating sample data...")
    
    # Create sample branches
    print("Creating branches...")
    branches = [
        {
            'name': 'Main Branch',
            'location': 'Downtown Plaza, Nairobi',
            'phone': '+254700123456',
            'email': 'main@supermarket.co.ke',
            'tax_id': 'KRA123456789'
        },
        {
            'name': 'Westlands Branch', 
            'location': 'Westlands Shopping Mall, Nairobi',
            'phone': '+254700123457',
            'email': 'westlands@supermarket.co.ke',
            'tax_id': 'KRA123456790'
        }
    ]
    
    created_branches = []
    for branch_data in branches:
        branch, created = Branch.objects.get_or_create(
            name=branch_data['name'],
            defaults=branch_data
        )
        created_branches.append(branch)
        print(f"  {'Created' if created else 'Found existing'} branch: {branch.name}")
    
    # Create sample categories
    print("Creating categories...")
    categories = [
        'Electronics',
        'Food & Beverages', 
        'Household Items',
        'Personal Care',
        'Clothing',
        'Books & Stationery',
        'Toys & Games',
        'Health & Wellness'
    ]
    
    created_categories = []
    for cat_name in categories:
        category, created = Category.objects.get_or_create(
            name=cat_name,
            defaults={'description': f'{cat_name} products'}
        )
        created_categories.append(category)
        print(f"  {'Created' if created else 'Found existing'} category: {category.name}")
    
    # Create sample suppliers
    print("Creating suppliers...")
    suppliers = [
        {
            'name': 'Kenya Distributors Ltd',
            'contact_person': 'John Mwangi',
            'email': 'john@kenyadist.co.ke',
            'phone': '+254722123456',
            'address': 'Industrial Area, Nairobi',
            'tax_id': 'KRA987654321',
            'payment_terms': 'Net 30'
        },
        {
            'name': 'East African Suppliers',
            'contact_person': 'Mary Akinyi',
            'email': 'mary@easuppliers.co.ke',
            'phone': '+254733123457',
            'address': 'Mombasa Road, Nairobi',
            'tax_id': 'KRA987654322',
            'payment_terms': 'Net 15'
        },
        {
            'name': 'Premium Electronics Co.',
            'contact_person': 'Peter Kamau',
            'email': 'peter@premiumelec.co.ke',
            'phone': '+254744123458',
            'address': 'Yaya Centre, Nairobi',
            'tax_id': 'KRA987654323',
            'payment_terms': 'Net 45'
        }
    ]
    
    for supplier_data in suppliers:
        supplier, created = Supplier.objects.get_or_create(
            name=supplier_data['name'],
            defaults=supplier_data
        )
        print(f"  {'Created' if created else 'Found existing'} supplier: {supplier.name}")
    
    print("\nSample data creation completed!")
    print("\nYou can now:")
    print("1. Refresh the ProductModal to see the dropdown options")
    print("2. Create products with proper categories and suppliers")
    print("3. Test the full application functionality")
    
    return created_branches, created_categories

if __name__ == '__main__':
    try:
        create_sample_data()
    except Exception as e:
        print(f"Error creating sample data: {e}")
        sys.exit(1)