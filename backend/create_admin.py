import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

if not User.objects.filter(username='joesky').exists():
    User.objects.create_superuser(
        username='joesky',
        email='admin@example.com',
        password='Tavor@!07',
        first_name='Joe',
        last_name='Sky'
    )
    print("Admin user 'joesky' created successfully!")
else:
    print("Admin user 'joesky' already exists")
