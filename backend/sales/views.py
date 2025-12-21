from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
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


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, IsCashier]
    
    def get_queryset(self):
        queryset = Sale.objects.all()

        if self.request.user.role != 'admin' and self.request.user.branch:
            queryset = queryset.filter(branch=self.request.user.branch)
        
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
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = SaleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data

        # Temporarily disabled shift requirement due to frontend issues
        # current_shift = Shift.objects.filter(
        #     cashier=request.user,
        #     status='open'
        # ).first()
        #
        # if not current_shift:
        #     return Response({'error': 'No open shift found. Please open a shift first.'},
        #                   status=status.HTTP_400_BAD_REQUEST)

        current_shift = None
        
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
            
            tax_rate = Decimal('0.00')  # Prices are tax-inclusive
            item_subtotal = (unit_price * quantity) - discount
            item_tax = item_subtotal * (tax_rate / 100)
            
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

        # include QR image if available
        qr_img_html = ''
        if getattr(sale, 'etims_qr_image', None):
            qr_img_html = f"<div style='text-align:center;margin:6px 0'><img src='{escape(sale.etims_qr_image)}' style='width:140px;height:auto' /></div>"

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
        change_amount = payments_total - sale.total_amount if sale.payments.exists() else 0

        html = f"""
        <html>
        <head>
            <meta charset='utf-8'>
            <title>Receipt {escape(sale.sale_number)}</title>
            <style>
                @media print {{ @page {{ margin:0; }} }}
                body {{ font-family: monospace; font-size:12px; line-height:1.15; margin:6px; }}
                .receipt {{ max-width:70mm; width:70mm; margin:0 auto; }}
                .center {{ text-align:center; }}
                .row {{ display:flex; justify-content:space-between; margin:2px 0; }}
                hr {{ border: none; border-top:1px dashed #000; margin:6px 0; }}
                .small {{ font-size:11px; }}
                .muted {{ color:#666; font-size:11px }}
                .bold {{ font-weight:700 }}
            </style>
        </head>
        <body>
        <div class='receipt'>
        <div class='center bold' style='font-size:13px'>{escape(sale.branch.name if sale.branch else 'Supermarket')}</div>
        <div class='center small'>{escape(sale.branch.location if sale.branch and getattr(sale.branch, 'location', None) else '')}</div>
        <div class='center small'>{escape(sale.branch.phone if sale.branch and getattr(sale.branch, 'phone', None) else '')}</div>
        <div class='center small'>POS:{escape(str(sale.id))}  Time:{escape((sale.created_at or sale.updated_at).strftime('%d/%m/%Y %H:%M:%S'))}</div>
        <div class='center small'>Transaction #: {escape(sale.sale_number)}</div>
        <div style='margin-top:6px;font-size:11px;font-weight:700;display:flex;justify-content:space-between'><div style='width:55px'>CODE</div><div style='flex:1;text-align:left'>DESCRIPTION</div><div style='width:28px;text-align:center'>QTY</div><div style='width:55px;text-align:right'>PRICE</div><div style='width:55px;text-align:right'>EXT</div></div>
        {item_rows}
        <hr />
        {row('Totals', '')}
        {row('Subtotal', sale.subtotal)}
        {row('Discount', sale.discount_amount)}
        {row('Total', sale.total_amount)}
        <div style='margin-top:6px'>
        <div style='display:flex;justify-content:space-between'><div class='small'>Tendered</div><div class='small'>{escape(str(payments_total))}</div></div>
        <div style='display:flex;justify-content:space-between'><div class='small'>Change</div><div class='small'>{escape(str(change_amount))}</div></div>
        <div style='margin-top:6px' class='bold'>{escape(amount_in_words(sale.total_amount))}</div>
        </div>
        <div style='margin-top:6px' class='small'>
        <div><strong>KRA eTIMS</strong></div>
        <div>Signature: {escape(sale.rcpt_signature or '')}</div>
        </div>
        {qr_img_html}
        <div style='margin-top:8px;font-size:11px'>
        <div>You were served by: {escape(sale.created_by.get_full_name() if sale.created_by else (sale.cashier.get_full_name() if sale.cashier else ''))}</div>
        <div class='muted'>VortexPOS Ver:2.0.1</div>
        <div class='muted'>CU Serial No: KRA{escape(sale.sale_number)}</div>
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
