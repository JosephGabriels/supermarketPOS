from django.core.management.base import BaseCommand
from inventory.models import Product


class Command(BaseCommand):
    help = 'Clean up duplicate/invalid products'

    def handle(self, *args, **options):
        invalid_products = Product.objects.filter(barcode='0')
        count = invalid_products.count()
        
        if count > 0:
            self.stdout.write(f'Found {count} products with barcode "0":')
            for p in invalid_products:
                self.stdout.write(f'  - {p.name} (ID: {p.id})')
            
            invalid_products.delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {count} products with invalid barcode "0"'))
        else:
            self.stdout.write(self.style.SUCCESS('No products with barcode "0" found'))
