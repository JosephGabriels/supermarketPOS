from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, LoyaltyTierViewSet, LoyaltyTransactionViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'loyalty-tiers', LoyaltyTierViewSet, basename='loyalty-tier')
router.register(r'loyalty-transactions', LoyaltyTransactionViewSet, basename='loyalty-transaction')

urlpatterns = [
    path('', include(router.urls)),
]
