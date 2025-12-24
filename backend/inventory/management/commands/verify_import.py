from django.core.management.base import BaseCommand
from inventory.models import Product
from core.models import Category


class Command(BaseCommand):
    help = 'Verify the ppob import'

    def handle(self, *args, **options):
        total_products = Product.objects.count()
        categories = Category.objects.count()
        print(f"Total Products: {total_products}")
        print(f"Total Categories: {categories}")

        sample_products = Product.objects.all()[:5]
        print("\nSample Products:")
        for p in sample_products:
            print(f"  - {p.name} (Barcode: {p.barcode}, Price: {p.price}, Stock: {p.stock_quantity})")

        category_distribution = {}
        for product in Product.objects.all():
            cat = product.category.name if product.category else "None"
            category_distribution[cat] = category_distribution.get(cat, 0) + 1

        print("\nCategory Distribution:")
        for cat, count in sorted(category_distribution.items()):
            print(f"  {cat}: {count}")
