"""
URL configuration for pos_config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, Http404
import os

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/', include('inventory.urls')),
    path('api/', include('sales.urls')),
    path('api/', include('customers.urls')),
    path('api/', include('suppliers.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('shifts.urls')),
    path('api/', include('approvals.urls')),
    path('api/reports/', include('reports.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

def serve_frontend(request, path=None):
    index_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'dist', 'index.html')
    with open(index_path, 'r') as f:
        return HttpResponse(f.read(), content_type='text/html')

def serve_asset(request, path):
    asset_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'dist', 'assets', path)
    if os.path.exists(asset_path):
        with open(asset_path, 'rb') as f:
            # Determine content type based on extension
            if path.endswith('.js'):
                content_type = 'application/javascript'
            elif path.endswith('.css'):
                content_type = 'text/css'
            elif path.endswith('.png'):
                content_type = 'image/png'
            elif path.endswith('.jpg') or path.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif path.endswith('.svg'):
                content_type = 'image/svg+xml'
            else:
                content_type = 'application/octet-stream'
            return HttpResponse(f.read(), content_type=content_type)
    else:
        raise Http404

urlpatterns += [
    path('assets/<path:path>', serve_asset),
    re_path(r'^(?!api/|static/|media/|assets/).*$', serve_frontend),
]
