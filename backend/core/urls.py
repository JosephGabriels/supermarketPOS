from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (CustomTokenObtainPairView, logout_view, user_profile, 
                    UserViewSet, BranchViewSet, CategoryViewSet, SystemConfigViewSet)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'system-config', SystemConfigViewSet, basename='system-config')

urlpatterns = [
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/profile/', user_profile, name='user_profile'),
    path('', include(router.urls)),
]
