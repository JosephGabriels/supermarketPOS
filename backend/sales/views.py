from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
from .models import Sale, SaleItem, Discount, Return
from inventory.models import Product, StockMovement
from customers.models import Customer, LoyaltyTransaction
from shifts.models import Shift
from .serializers import (SaleSerializer, SaleCreateSerializer, SaleCompleteSerializer,
                          DiscountSerializer, ReturnSerializer, ReturnCreateSerializer)
from core.permissions import IsCashier, IsManager
import subprocess
import shutil
from django.utils.html import escape
import io
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
try:
    from num2words import num2words
except Exception:
    num2words = None
from core.models import SystemConfig


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = Sale.objects.all()

        user = self.request.user
        if user.role == 'cashier':
            queryset = queryset.filter(cashier=user)
        elif user.role == 'manager' and user.branch:
            queryset = queryset.filter(branch=user.branch)
        elif user.role != 'admin' and user.branch:
             # Fallback for other roles if any, though currently only cashier/manager/admin
            queryset = queryset.filter(branch=user.branch)
        
        status_filter = self.request.query_params.get('status', None)
        cashier = self.request.query_params.get('cashier', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if cashier:
            queryset = queryset.filter(cashier_id=cashier)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset.select_related('cashier', 'branch', 'customer').prefetch_related('items').order_by('-created_at')

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        user = request.user
        queryset = Sale.objects.all()
        
        if user.role == 'cashier':
            queryset = queryset.filter(cashier=user)
        elif user.role == 'manager' and user.branch:
            # Managers see all sales for their branch
            queryset = queryset.filter(branch=user.branch)
        elif user.role != 'admin' and user.branch:
            # Other roles (if any) fallback to branch
            queryset = queryset.filter(branch=user.branch)
        # Admin can filter by branch, but if not provided, see all sales
        branch_id = request.query_params.get('branch')
        if user.role == 'admin' and branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        today = timezone.localtime(timezone.now()).date()
        start_of_week = today - timezone.timedelta(days=today.weekday())
        
        # Today's stats
        today_stats = queryset.filter(created_at__date=today).aggregate(
            count=Count('id'),
            total=Sum('total_amount')
        )
        
        # Week's stats
        week_stats = queryset.filter(created_at__date__gte=start_of_week).aggregate(
            count=Count('id'),
            total=Sum('total_amount')
        )
        
        response_data = {
            'today': {
                'count': today_stats['count'],
                'total': today_stats['total'] or 0
            },
            'week': {
                'count': week_stats['count'],
                'total': week_stats['total'] or 0
            }
        }
        
        # Custom date stats
        custom_date_str = request.query_params.get('date')
        if custom_date_str:
            try:
                custom_date = timezone.datetime.strptime(custom_date_str, '%Y-%m-%d').date()
                custom_stats = queryset.filter(created_at__date=custom_date).aggregate(
                    count=Count('id'),
                    total=Sum('total_amount')
                )
                response_data['custom'] = {
                    'date': custom_date_str,
                    'count': custom_stats['count'],
                    'total': custom_stats['total'] or 0
                }
            except ValueError:
                pass
                
        return Response(response_data)
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = SaleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data

        # Temporarily disabled shift requirement due to frontend issues
        current_shift = Shift.objects.filter(
            cashier=request.user,
            status='open'
        ).first()
        
        # if not current_shift:
        #     return Response({'error': 'No open shift found. Please open a shift first.'},
        #                   status=status.HTTP_400_BAD_REQUEST)

        # current_shift = None
        
        customer = None
        if data.get('customer_id'):
            try:
                customer = Customer.objects.get(id=data['customer_id'])
            except Customer.DoesNotExist:
                return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate all items before creating the sale
        validated_items = []
        for item_data in data['items']:
            product = None
            unit_price = item_data.get('unit_price')
            if item_data.get('product_id'):
                try:
                    product = Product.objects.get(id=item_data['product_id'])
                    if not unit_price:
                        unit_price = product.price
                except Product.DoesNotExist:
                    return Response({'error': f'Product {item_data["product_id"]} not found'}, 
                                    status=status.HTTP_404_NOT_FOUND)
            elif item_data.get('barcode'):
                try:
                    product = Product.objects.get(barcode=item_data['barcode'], branch=request.user.branch)
                    if not unit_price:
                        unit_price = product.price
                except Product.DoesNotExist:
                    return Response({'error': f'Product with barcode {item_data["barcode"]} not found'}, 
                                    status=status.HTTP_404_NOT_FOUND)
            if not product and not item_data.get('is_ad_hoc'):
                return Response({'error': 'Product is required for non-ad-hoc items'}, 
                                status=status.HTTP_400_BAD_REQUEST)
            validated_items.append({
                'product': product,
                'unit_price': unit_price,
                'quantity': item_data['quantity'],
                'discount': item_data.get('discount', Decimal('0.00')),
                'is_ad_hoc': item_data.get('is_ad_hoc', False),
                'ad_hoc_name': item_data.get('ad_hoc_name', '')
            })

        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        sale = Sale.objects.create(
            branch=request.user.branch,
            cashier=request.user,
            customer=customer,
            shift=current_shift,
            subtotal=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            discount_amount=data.get('discount_amount', Decimal('0.00')),
            total_amount=Decimal('0.00'),
            notes=data.get('notes', ''),
            created_by=request.user
        )
        for item in validated_items:
            tax_rate = Decimal('16.00')  # Prices are tax-inclusive
            item_subtotal = (item['unit_price'] * item['quantity']) - item['discount']
            item_tax = item_subtotal * (tax_rate / (Decimal('100.00') + tax_rate))
            SaleItem.objects.create(
                sale=sale,
                product=item['product'],
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                discount=item['discount'],
                subtotal=item_subtotal,
                tax_rate=tax_rate,
                tax_amount=item_tax,
                is_ad_hoc=item['is_ad_hoc'],
                ad_hoc_name=item['ad_hoc_name']
            )
            subtotal += item_subtotal
            tax_amount += item_tax
        
        discount_code = data.get('discount_code')
        if discount_code:
            try:
                discount = Discount.objects.get(code=discount_code, is_active=True)
                if discount.is_valid:
                    if discount.discount_type == 'percentage':
                        sale.discount_amount = subtotal * (discount.value / 100)
                    else:
                        sale.discount_amount = discount.value
                    
                    discount.times_used += 1
                    discount.save()
            except Discount.DoesNotExist:
                pass
        
        points_discount = data.get('points_discount', Decimal('0.00'))
        sale.subtotal = subtotal
        sale.tax_amount = tax_amount
        sale.total_amount = subtotal - sale.discount_amount - points_discount  # Prices are tax-inclusive
        sale.save()
        
        response_serializer = SaleSerializer(sale)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        sale = self.get_object()

        if sale.status == 'completed':
            return Response({'message': 'Sale already completed'}, status=status.HTTP_200_OK)
        elif sale.status in ['cancelled', 'refunded']:
            return Response({'error': 'Sale is already cancelled or refunded'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Delegate finalization to model method to ensure consistent behavior
        try:
            sale.finalize(user=request.user)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SaleSerializer(sale)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def print_receipt(self, request, pk=None):
        from django.http import FileResponse
        sale = self.get_object()

        # Ensure KRA eTIMS simulation exists for printing compliance
        if not sale.etims_response:
            try:
                sale.simulate_etims()
            except Exception:
                pass

        # Helper to read store metadata from SystemConfig (admin editable)
        def get_config(key, default=''):
            try:
                cfg = SystemConfig.objects.filter(key=key).first()
                return cfg.value if cfg else default
            except Exception:
                return default

        store_name = get_config('STORE_NAME', sale.branch.name if sale.branch else 'Supermarket')
        store_branch = get_config('STORE_BRANCH', '')
        store_address = get_config('STORE_ADDRESS', sale.branch.location if sale.branch and getattr(sale.branch, 'location', None) else '')
        store_phone = get_config('STORE_PHONE', sale.branch.phone if sale.branch and getattr(sale.branch, 'phone', None) else '')
        store_email = get_config('STORE_EMAIL', '')
        store_tax_id = get_config('STORE_TAX_ID', sale.branch.tax_id if sale.branch and getattr(sale.branch, 'tax_id', None) else '')
        store_website = get_config('STORE_WEBSITE', '')
        store_tagline = get_config('STORE_TAGLINE', '')

        # Generate PDF with all receipt details
        def generate_receipt_pdf():
            buffer = io.BytesIO()
            p_width = 80 * mm
            p_height = 297 * mm
            c = canvas.Canvas(buffer, pagesize=(p_width, p_height))
            y = p_height - 5 * mm
            left_margin = 2 * mm
            right_margin = p_width - 2 * mm
            line_height = 4 * mm
            
            def wrap_text(text, max_width, font="Courier", size=8):
                """Wrap text to fit within max_width in mm"""
                c.setFont(font, size)
                max_width_pts = max_width / mm * 2.834645669  # Convert mm to points
                words = str(text).split()
                lines = []
                current_line = ""
                
                for word in words:
                    test_line = (current_line + " " + word).strip()
                    if c.stringWidth(test_line, font, size) <= max_width_pts:
                        current_line = test_line
                    else:
                        if current_line:
                            lines.append(current_line)
                        current_line = word
                
                if current_line:
                    lines.append(current_line)
                return lines
            
            def draw_text_center(text, y_pos, font="Courier-Bold", size=10):
                c.setFont(font, size)
                w = c.stringWidth(text, font, size)
                c.drawString((p_width - w) / 2, y_pos, text)
                return y_pos - line_height

            def draw_row(left, right, y_pos, font="Courier", size=9):
                c.setFont(font, size)
                c.drawString(left_margin, y_pos, str(left))
                if right:
                    r_str = str(right)
                    w = c.stringWidth(r_str, font, size)
                    c.drawString(right_margin - w, y_pos, r_str)
                return y_pos - line_height

            def draw_separator(y_pos):
                c.setDash(1, 2)
                c.line(left_margin, y_pos + 2*mm, right_margin, y_pos + 2*mm)
                c.setDash([])
                return y_pos - 2*mm

            y = draw_text_center(store_name, y, size=12)
            if store_branch: y = draw_text_center(store_branch, y, "Courier", 9)
            if store_address: y = draw_text_center(store_address, y, "Courier", 9)
            if store_phone: y = draw_text_center(store_phone, y, "Courier", 9)
            if store_email: y = draw_text_center(store_email, y, "Courier", 9)
            y = draw_separator(y)
            
            y = draw_row(f"POS: 94", (sale.created_at or sale.updated_at).strftime('%d/%m/%Y %H:%M'), y, "Courier", 9)
            y = draw_row(f"Receipt: {sale.sale_number}", "", y, "Courier", 9)
            if store_tax_id:
                y = draw_row(f"Tax ID: {store_tax_id}", "", y, "Courier", 8)
            y = draw_separator(y)
            
            c.setFont("Courier-Bold", 9)
            c.drawString(left_margin, y, "DESCRIPTION")
            c.drawString(left_margin + 50*mm, y, "QTY")
            c.drawString(right_margin - 30*mm, y, "PRICE")
            c.drawString(right_margin - 15*mm, y, "EXT")
            y -= line_height
            
            c.setFont("Courier", 8)
            for item in sale.items.all():
                desc_text = item.ad_hoc_name or (item.product.name if item.product else 'Item')
                qty = str(item.quantity)
                price = str(getattr(item, 'unit_price', '0.00'))
                ext = str(getattr(item, 'subtotal', '0.00'))
                
                desc_lines = wrap_text(desc_text, 48*mm, "Courier", 8)
                
                for i, line in enumerate(desc_lines):
                    c.drawString(left_margin, y, line)
                    if i == 0:
                        c.drawString(left_margin + 50*mm, y, qty)
                        pw = c.stringWidth(price, "Courier", 8)
                        c.drawString(right_margin - 30*mm - pw, y, price)
                        ew = c.stringWidth(ext, "Courier", 8)
                        c.drawString(right_margin - ew, y, ext)
                    y -= line_height
            
            y = draw_separator(y)
            
            def fmt(val):
                try:
                    return f"{Decimal(val).quantize(Decimal('0.01')):,.2f}"
                except:
                    return str(val)
            
            y = draw_row("Subtotal", fmt(sale.subtotal), y)
            if sale.discount_amount > 0:
                y = draw_row("Discount", f"-{fmt(sale.discount_amount)}", y)
            
            y -= 1*mm
            y = draw_row("TOTAL", fmt(sale.total_amount), y, "Courier-Bold", 11)
            y -= 1*mm
            
            payments_total = sum([p.amount for p in sale.payments.all()]) if sale.payments.exists() else sale.total_amount
            change_amount = payments_total - sale.total_amount if sale.payments.exists() else Decimal('0.00')
            
            if sale.payments.exists():
                y = draw_row("Tendered", fmt(payments_total), y, "Courier", 9)
                if change_amount > 0:
                    y = draw_row("Change", fmt(change_amount), y, "Courier", 9)
            
            y = draw_separator(y)
            
            def amount_in_words(amount):
                try:
                    whole = int(amount)
                except:
                    return str(amount)
                if num2words:
                    try:
                        words = num2words(whole, to='cardinal').upper()
                        return f"{words} SHILLINGS ONLY"
                    except:
                        pass
                return f"{whole} KES"
            
            y = draw_text_center(amount_in_words(sale.total_amount), y, "Courier-Bold", 9)
            
            try:
                vat_rate = Decimal('16.00')
                vat_amount = (sale.total_amount * vat_rate) / (Decimal('100.00') + vat_rate)
                vat_amount = vat_amount.quantize(Decimal('0.01'))
                vatable_amount = (sale.total_amount - vat_amount).quantize(Decimal('0.01'))
            except:
                vat_amount = Decimal('0.00')
                vatable_amount = Decimal('0.00')
            
            y -= 2*mm
            c.setFont("Courier-Bold", 8)
            c.drawString(left_margin, y, "TAX DETAILS")
            y -= line_height
            c.setFont("Courier", 8)
            y = draw_row("VATABLE", fmt(vatable_amount), y, "Courier", 8)
            y = draw_row("VAT AMT", fmt(vat_amount), y, "Courier", 8)
            
            y = draw_separator(y)
            
            if sale.rcpt_signature:
                y -= 2*mm
                c.setFont("Courier-Bold", 8)
                c.drawString(left_margin, y, "KRA eTIMS")
                y -= line_height
                c.setFont("Courier", 7)
                sig_text = str(sale.rcpt_signature)[:40]
                c.drawString(left_margin, y, sig_text)
            
            y -= 3*mm
            c.setFont("Courier", 8)
            served_by = sale.created_by.get_full_name() if sale.created_by else (sale.cashier.get_full_name() if sale.cashier else 'N/A')
            y = draw_text_center(f"Served by: {served_by}", y, "Courier", 8)
            y = draw_text_center("Thank you for your purchase!", y, "Courier-Bold", 9)
            
            c.showPage()
            c.save()
            return buffer.getvalue()

        pdf_bytes = generate_receipt_pdf()
        
        lp = shutil.which('lp') or shutil.which('lpr')
        if lp:
            try:
                p = subprocess.Popen([lp], stdin=subprocess.PIPE)
                p.communicate(input=pdf_bytes)
            except Exception:
                pass
        
        return Response({'printed': True, 'message': 'Receipt sent to printer'})


class DiscountViewSet(viewsets.ModelViewSet):
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated(), IsCashier()]
    
    def get_queryset(self):
        queryset = Discount.objects.all()
        
        code = self.request.query_params.get('code', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if code:
            queryset = queryset.filter(code=code)
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def validate_code(self, request):
        code = request.data.get('code', None)
        if not code:
            return Response({'error': 'Code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            discount = Discount.objects.get(code=code)
            if discount.is_valid:
                serializer = DiscountSerializer(discount)
                return Response(serializer.data)
            else:
                return Response({'error': 'Discount code is not valid'}, status=status.HTTP_400_BAD_REQUEST)
        except Discount.DoesNotExist:
            return Response({'error': 'Discount code not found'}, status=status.HTTP_404_NOT_FOUND)


class ReturnViewSet(viewsets.ModelViewSet):
    queryset = Return.objects.all()
    serializer_class = ReturnSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = Return.objects.all()
        
        if self.request.user.role != 'admin':
            queryset = queryset.filter(branch=self.request.user.branch)
        
        return queryset.select_related('original_sale', 'customer', 'manager_approval').order_by('-created_at')
