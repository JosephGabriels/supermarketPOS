from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from inventory.models import Product
from core.models import Branch, Category
import random
import string


class Command(BaseCommand):
    help = 'Import products from ppob.txt file'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to ppob.txt file')
        parser.add_argument('--branch-id', type=int, default=1, help='Branch ID to assign products')
        parser.add_argument('--dry-run', action='store_true', help='Preview without saving')
        parser.add_argument('--generate-barcodes', action='store_true', help='Generate barcodes for missing ones')

    def generate_barcode(self, existing_barcodes):
        while True:
            barcode = str(random.randint(9000, 9999))
            if barcode not in existing_barcodes:
                return barcode

    def handle(self, *args, **options):
        file_path = options['file_path']
        branch_id = options['branch_id']
        dry_run = options['dry_run']
        generate_barcodes = options['generate_barcodes']

        try:
            branch = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Branch with ID {branch_id} not found'))
            return

        self.stdout.write(f'Starting import from {file_path}...')
        self.stdout.write(f'Target branch: {branch.name} (ID: {branch.id})')
        if generate_barcodes:
            self.stdout.write(self.style.SUCCESS('Generating barcodes for missing entries'))

        existing_barcodes = set(Product.objects.values_list('barcode', flat=True))
        
        created_count = 0
        updated_count = 0
        error_count = 0
        skipped_count = 0
        generated_barcode_count = 0

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        parts = line.split('\t')
                        if len(parts) < 7:
                            self.stdout.write(self.style.WARNING(f'Line {line_num}: Insufficient columns, skipping'))
                            skipped_count += 1
                            continue

                        category_name = parts[0].strip()
                        product_name = parts[1].strip()
                        
                        try:
                            selling_price = Decimal(parts[2].strip())
                        except:
                            self.stdout.write(self.style.WARNING(f'Line {line_num}: Invalid selling price, skipping'))
                            skipped_count += 1
                            continue

                        try:
                            stock_quantity = int(float(parts[4].strip()))
                        except:
                            self.stdout.write(self.style.WARNING(f'Line {line_num}: Invalid stock quantity, skipping'))
                            skipped_count += 1
                            continue

                        try:
                            cost_price = Decimal(parts[5].strip())
                        except:
                            self.stdout.write(self.style.WARNING(f'Line {line_num}: Invalid cost price, skipping'))
                            skipped_count += 1
                            continue

                        barcode = parts[6].strip()

                        if not product_name:
                            self.stdout.write(self.style.WARNING(f'Line {line_num}: Missing product name, skipping'))
                            skipped_count += 1
                            continue

                        if not barcode or barcode == '0':
                            if generate_barcodes:
                                barcode = self.generate_barcode(existing_barcodes)
                                existing_barcodes.add(barcode)
                                generated_barcode_count += 1
                            else:
                                self.stdout.write(self.style.WARNING(f'Line {line_num}: Missing barcode, skipping (use --generate-barcodes to auto-generate)'))
                                skipped_count += 1
                                continue

                        category, _ = Category.objects.get_or_create(name=category_name)

                        if dry_run:
                            self.stdout.write(f'[DRY RUN] Would create/update: {product_name} (Barcode: {barcode})')
                        else:
                            product, created = Product.objects.update_or_create(
                                barcode=barcode,
                                defaults={
                                    'name': product_name,
                                    'category': category,
                                    'price': selling_price,
                                    'cost_price': cost_price,
                                    'stock_quantity': stock_quantity,
                                    'branch': branch,
                                    'is_active': True,
                                    'reorder_level': 10,
                                }
                            )

                            if created:
                                created_count += 1
                            else:
                                updated_count += 1

                        if line_num % 500 == 0:
                            self.stdout.write(self.style.SUCCESS(f'Processed {line_num} lines...'))

                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Line {line_num}: Error - {str(e)}'))
                        error_count += 1
                        continue

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return

        self.stdout.write(self.style.SUCCESS('\n=== Import Complete ==='))
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No data was saved'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Created: {created_count}'))
            self.stdout.write(self.style.SUCCESS(f'Updated: {updated_count}'))
        if generated_barcode_count > 0:
            self.stdout.write(self.style.SUCCESS(f'Generated barcodes: {generated_barcode_count}'))
        self.stdout.write(self.style.WARNING(f'Skipped: {skipped_count}'))
        self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
