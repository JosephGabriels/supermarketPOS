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
            queryset = queryset.filter(branch=user.branch)
        elif user.role != 'admin' and user.branch:
            queryset = queryset.filter(branch=user.branch)
            
        # Admin can filter by branch
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
        
        for item_data in data['items']:
            product = None
            unit_price = item_data.get('unit_price')
            
            if item_data.get('product_id'):
                try:
                    product = Product.objects.get(id=item_data['product_id'])
                    if not unit_price:
                        unit_price = product.price
                except Product.DoesNotExist:
                    sale.delete()
                    return Response({'error': f'Product {item_data["product_id"]} not found'}, 
                                  status=status.HTTP_404_NOT_FOUND)
            elif item_data.get('barcode'):
                try:
                    product = Product.objects.get(barcode=item_data['barcode'], branch=request.user.branch)
                    if not unit_price:
                        unit_price = product.price
                except Product.DoesNotExist:
                    sale.delete()
                    return Response({'error': f'Product with barcode {item_data["barcode"]} not found'}, 
                                  status=status.HTTP_404_NOT_FOUND)
            
            if not product and not item_data.get('is_ad_hoc'):
                sale.delete()
                return Response({'error': 'Product is required for non-ad-hoc items'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            quantity = item_data['quantity']
            discount = item_data.get('discount', Decimal('0.00'))
            
            tax_rate = Decimal('16.00')  # Prices are tax-inclusive
            item_subtotal = (unit_price * quantity) - discount
            # Calculate tax from tax-inclusive price: Tax = Price * (Rate / (100 + Rate))
            item_tax = item_subtotal * (tax_rate / (Decimal('100.00') + tax_rate))
            
            sale_item = SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                discount=discount,
                subtotal=item_subtotal,
                tax_rate=tax_rate,
                tax_amount=item_tax,
                is_ad_hoc=item_data.get('is_ad_hoc', False),
                ad_hoc_name=item_data.get('ad_hoc_name', '')
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
        """Generate a printable receipt for the sale. If `direct=true` is provided
        the server will attempt to send the receipt to the system's default printer
        using `lp` or `lpr`. If printing is not available, the HTML will be returned
        so the frontend can open the print dialog.
        """
        sale = self.get_object()

        # Ensure KRA eTIMS simulation exists for printing compliance
        if not sale.etims_response:
            try:
                sale.simulate_etims()
            except Exception:
                pass

        # Build a simple HTML receipt
        def row(label, value):
            return f"<div style='display:flex;justify-content:space-between'><strong>{escape(label)}</strong><span>{escape(str(value))}</span></div>"

        items_html = ""
        for it in sale.items.all():
            name = escape(it.ad_hoc_name or (it.product.name if it.product else 'Item'))
            items_html += f"<div style='display:flex;justify-content:space-between'><span>{name} x{it.quantity}</span><span>{it.subtotal}</span></div>"

        # include QR image if available (render slim using mm relative to receipt width)
        qr_img_html = ''
        if getattr(sale, 'etims_qr_image', None):
            qr_img_html = f"<div style='text-align:center;margin:6px 0'><img src='{escape(sale.etims_qr_image)}' style='width:60mm;max-width:100%;height:auto;display:block;margin:0 auto' /></div>"

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

        # amount in words (KES)
        def amount_in_words(amount):
            try:
                whole = int(amount)
            except Exception:
                return str(amount)
            if num2words:
                try:
                    words = num2words(whole, to='cardinal').upper()
                    return f"{words} SHILLINGS ONLY"
                except Exception:
                    pass
            return f"{whole} KES"

        # build detailed receipt HTML (narrow thermal width ~70mm)
        # prepare item rows including CODE (barcode), DESCRIPTION, QTY, PRICE, EXT
        item_rows = ''
        for it in sale.items.all():
            code = escape(it.product.barcode) if it.product else ''
            desc = escape((it.ad_hoc_name or (it.product.name if it.product else 'Item'))[:30])
            qty = escape(str(it.quantity))
            price = escape(str(getattr(it, 'unit_price', '0.00')))
            ext = escape(str(getattr(it, 'subtotal', '0.00')))
            # format: code left, description center (wrap), qty price ext right-aligned
            item_rows += f"<div style='display:flex;justify-content:space-between;gap:4px;font-size:11px'><div style='width:55px'>{code}</div><div style='flex:1;text-align:left'>{desc}</div><div style='width:28px;text-align:center'>{qty}</div><div style='width:55px;text-align:right'>{price}</div><div style='width:55px;text-align:right'>{ext}</div></div>"

        payments_total = sum([p.amount for p in sale.payments.all()]) if sale.payments.exists() else sale.total_amount
        change_amount = payments_total - sale.total_amount if sale.payments.exists() else Decimal('0.00')

        # VAT (assume 16% for receipt display). If prices are tax-inclusive, VAT component = total * 16/116
        try:
            vat_rate = Decimal('16.00')
            vat_amount = (sale.total_amount * vat_rate) / (Decimal('100.00') + vat_rate)
            vat_amount = vat_amount.quantize(Decimal('0.01'))
            vatable_amount = (sale.total_amount - vat_amount).quantize(Decimal('0.01'))
        except Exception:
            vat_amount = Decimal('0.00')
            vatable_amount = Decimal('0.00')

        def fmt(val):
            try:
                return f"{Decimal(val).quantize(Decimal('0.01')):,.2f}"
            except Exception:
                return str(val)

        html = f"""
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1'>
            <title>Receipt {escape(sale.sale_number)}</title>
            <style>
                @page {{ size: 80mm auto; margin:0; padding:0; }}
                * {{ box-sizing: border-box; margin: 0; padding: 0; }}
                html {{ width: 80mm; }}
                body {{ font-family: monospace; font-size:11px; line-height:1.2; margin:0; padding:4px; width:80mm; }}
                .receipt {{ width:80mm; margin:0 auto; }}
                .header {{ text-align:center; margin-bottom:8px; }}
                .header-main {{ font-size:12px; font-weight:700; margin-bottom:2px; }}
                .header-sub {{ font-size:10px; margin:1px 0; }}
                .section {{ margin-bottom:6px; }}
                .section-title {{ font-weight:700; font-size:10px; margin-bottom:3px; border-bottom:1px dashed #000; padding-bottom:2px; }}
                .items-header {{ display:flex; font-weight:700; font-size:10px; margin-bottom:2px; padding-bottom:2px; border-bottom:1px solid #000; }}
                .item-row {{ display:flex; font-size:10px; margin:1px 0; }}
                .col-code {{ width:50px; flex-shrink:0; }}
                .col-desc {{ flex:1; margin:0 4px; word-break:break-word; }}
                .col-qty {{ width:30px; text-align:center; flex-shrink:0; }}
                .col-price {{ width:50px; text-align:right; flex-shrink:0; }}
                .col-ext {{ width:60px; text-align:right; flex-shrink:0; }}
                .totals-row {{ display:flex; justify-content:space-between; margin:2px 0; font-size:10px; }}
                .totals-label {{ font-weight:700; }}
                .totals-value {{ text-align:right; }}
                .total-final {{ display:flex; justify-content:space-between; font-weight:700; font-size:11px; margin:4px 0; padding:2px 0; border-top:1px solid #000; border-bottom:1px solid #000; }}
                .hr {{ border: none; border-top:1px dashed #000; margin:4px 0; height:1px; }}
                .payment-section {{ display:flex; justify-content:space-between; margin:2px 0; font-size:10px; }}
                .amount-words {{ font-weight:700; font-size:11px; margin:4px 0; text-align:center; }}
                .center {{ text-align:center; }}
                .small {{ font-size:10px; }}
                .qr-container {{ text-align:center; margin:8px 0; }}
                .qr-img {{ width:60mm; max-width:100%; height:auto; display:block; margin:0 auto; }}
                .footer {{ text-align:center; font-size:9px; margin-top:6px; }}
                .footer-line {{ margin:2px 0; }}
                .muted {{ color:#666; }}
                @media print {{ * {{ margin: 0; padding: 0; }} html {{ width: 80mm; }} body {{ width: 80mm; margin: 0; padding: 4px; }} .receipt {{ width: 80mm; }} }}
            </style>
        </head>
        <body>
        <div class='receipt'>
            <!-- HEADER -->
            <div class='header'>
                <div class='header-main'>{escape(store_name)}</div>
                {f"<div class='header-sub'>{escape(store_branch)}</div>" if store_branch else ''}
                {f"<div class='header-sub'>{escape(store_address)}</div>" if store_address else ''}
                {f"<div class='header-sub'>{escape(store_phone)}</div>" if store_phone else ''}
                {f"<div class='header-sub'>{escape(store_email)}</div>" if store_email else ''}
                {f"<div class='header-sub' style='font-style:italic;font-size:9px'>{escape(store_tagline)}</div>" if store_tagline else ''}
                <div class='hr'></div>
                <div class='header-sub'>POS: {escape(str(sale.id))}</div>
                <div class='header-sub'>{escape((sale.created_at or sale.updated_at).strftime('%d/%m/%Y %H:%M:%S'))}</div>
                <div class='header-sub'>Receipt #: {escape(sale.sale_number)}</div>
                {f"<div class='header-sub' style='font-size:9px'>Tax ID: {escape(store_tax_id)}</div>" if store_tax_id else ''}
            </div>

            <!-- ITEMS SECTION -->
            <div class='section'>
                <div class='items-header'>
                    <div class='col-code'>CODE</div>
                    <div class='col-desc'>DESCRIPTION</div>
                    <div class='col-qty'>QTY</div>
                    <div class='col-price'>PRICE</div>
                    <div class='col-ext'>EXT</div>
                </div>
                {item_rows}
            </div>

            <div class='hr'></div>

            <!-- TOTALS SECTION -->
            <div class='section'>
                {row('Subtotal', fmt(sale.subtotal))}
                {row('Discount', fmt(sale.discount_amount))}
                <div class='total-final'>
                    <div>TOTAL</div>
                    <div>{fmt(sale.total_amount)}</div>
                </div>
            </div>

            <!-- PAYMENT SECTION -->
            <div class='section'>
                <div class='payment-section'>
                    <div>Tendered</div>
                    <div>{fmt(payments_total)}</div>
                </div>
                <div class='payment-section'>
                    <div>Change</div>
                    <div>{fmt(change_amount)}</div>
                </div>
            </div>

            <div class='amount-words'>{escape(amount_in_words(sale.total_amount))}</div>

            <!-- TAX DETAILS SECTION -->
            <div class='section'>
                <div class='section-title'>TAX DETAILS</div>
                <div style='display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px'>
                    <div style='flex:1'>CODE</div>
                    <div style='flex:1;text-align:right'>VATABLE</div>
                    <div style='flex:1;text-align:right'>VAT</div>
                </div>
                <div style='display:flex;justify-content:space-between;font-size:10px'>
                    <div style='flex:1'>V</div>
                    <div style='flex:1;text-align:right'>{fmt(vatable_amount)}</div>
                    <div style='flex:1;text-align:right'>{fmt(vat_amount)}</div>
                </div>
            </div>

            <div class='hr'></div>

            <!-- KRA ETIMS SECTION -->
            <div class='section'>
                <div class='section-title'>KRA eTIMS</div>
                <div class='small' style='word-break:break-all;margin-bottom:4px'>
                    <strong>Signature:</strong>
                    <div style='font-size:9px;word-break:break-all'>{escape(sale.rcpt_signature or '')}</div>
                </div>
            </div>

            <!-- QR CODE SECTION (AT BOTTOM) -->
            <div class='qr-container'>
                {qr_img_html}
            </div>

            <!-- FOOTER SECTION -->
            <div class='footer'>
                <div class='footer-line'>Served by: {escape(sale.created_by.get_full_name() if sale.created_by else (sale.cashier.get_full_name() if sale.cashier else 'N/A'))}</div>
                <div class='footer-line muted'>CU Serial: KRA{escape(sale.sale_number)}</div>
                {f"<div class='footer-line muted' style='font-size:8px'>{escape(store_website)}</div>" if store_website else ''}
                <div class='footer-line' style='margin-top:4px'>Thank you for your purchase!</div>
            </div>
        </div>
        </body>
        </html>
        """

        direct = request.query_params.get('direct', 'false').lower() == 'true' or request.data.get('direct', False)

        if direct:
            # Try server-side printing via lp or lpr
            lp = shutil.which('lp') or shutil.which('lpr')
            if lp:
                try:
                    p = subprocess.Popen([lp], stdin=subprocess.PIPE)
                    p.communicate(input=html.encode('utf-8'))
                    if p.returncode == 0:
                        return Response({'printed': True})
                except Exception as e:
                    # Fall through to returning HTML
                    pass

        # Return HTML for client-side printing
        return Response({'html': html})


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
