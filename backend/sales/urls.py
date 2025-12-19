from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet, DiscountViewSet, ReturnViewSet

router = DefaultRouter()
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'discounts', DiscountViewSet, basename='discount')
router.register(r'returns', ReturnViewSet, basename='return')

urlpatterns = [
    path('', include(router.urls)),
]
