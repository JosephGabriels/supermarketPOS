import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_config.settings')

import django
django.setup()

from django.conf import settings

db_config = settings.DATABASES['default']
print("Database Configuration:")
print(f"Engine: {db_config['ENGINE']}")
print(f"Name: {db_config.get('NAME', 'N/A')}")
print(f"Host: {db_config.get('HOST', 'N/A')}")
print(f"Port: {db_config.get('PORT', 'N/A')}")
