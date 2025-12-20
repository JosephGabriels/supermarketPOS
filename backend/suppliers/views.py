from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Supplier, SupplierProduct
from .serializers import SupplierSerializer, SupplierProductSerializer, SupplierCreateSerializer, SupplierProductCreateSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'contact_person', 'email', 'phone']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'create':
            return SupplierCreateSerializer
        return SupplierSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active suppliers"""
        suppliers = Supplier.objects.filter(is_active=True)
        serializer = self.get_serializer(suppliers, many=True)
        return Response(serializer.data)


class SupplierProductViewSet(viewsets.ModelViewSet):
    queryset = SupplierProduct.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product_name', 'supplier_sku', 'supplier__name']
    ordering_fields = ['product_name', 'wholesale_price', 'created_at']
    ordering = ['-is_preferred', 'wholesale_price']

    def get_serializer_class(self):
        if self.action == 'create':
            return SupplierProductCreateSerializer
        return SupplierProductSerializer

    def get_queryset(self):
        queryset = SupplierProduct.objects.select_related('supplier')
        supplier_id = self.request.query_params.get('supplier', None)
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        return queryset