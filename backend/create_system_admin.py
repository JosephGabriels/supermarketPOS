import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_config.settings')
django.setup()

from core.models import User, Branch

username = 'joesky'
password = 'Tavor@!07'
email = 'joesky@example.com'
first_name = 'Joe'
last_name = 'Sky'

try:
    existing_user = User.objects.filter(username=username).first()
    
    if existing_user:
        print(f"User '{username}' already exists")
        print(f"  - Email: {existing_user.email}")
        print(f"  - Role: {existing_user.get_role_display()}")
        print(f"  - Branch: {existing_user.branch}")
    else:
        branch = Branch.objects.first()
        
        if not branch:
            branch = Branch.objects.create(
                name="Main Branch",
                location="Head Office",
                phone="+254700000000",
                tax_id="P000000000A"
            )
            print(f"Created default branch: {branch.name}")
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='admin',
            branch=branch,
            employee_id='EMP001',
            is_staff=True,
            is_superuser=True
        )
        
        print(f"✅ Admin user '{username}' created successfully!")
        print(f"  - Email: {user.email}")
        print(f"  - Role: {user.get_role_display()}")
        print(f"  - Branch: {user.branch}")
        print(f"  - Employee ID: {user.employee_id}")
        
except Exception as e:
    print(f"❌ Error creating user: {e}")
