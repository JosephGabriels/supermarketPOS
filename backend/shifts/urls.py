from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, ShiftTransactionViewSet

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'shift-transactions', ShiftTransactionViewSet, basename='shift-transaction')

urlpatterns = [
    path('', include(router.urls)),
]
