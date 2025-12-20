from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, SupplierProductViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'supplier-products', SupplierProductViewSet)

urlpatterns = [
    path('', include(router.urls)),
]