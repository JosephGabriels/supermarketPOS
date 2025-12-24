import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_config.settings')
django.setup()

from core.models import User, Branch

username = 'joesky'
password = 'Tavor@!07'

try:
    user = User.objects.get(username=username)
    
    branch = Branch.objects.first()
    
    if not branch:
        branch = Branch.objects.create(
            name="Main Branch",
            location="Head Office",
            phone="+254700000000",
            tax_id="P000000000A"
        )
        print(f"Created default branch: {branch.name}")
    
    user.role = 'admin'
    user.branch = branch
    user.employee_id = 'EMP001'
    user.is_staff = True
    user.is_superuser = True
    user.email = 'joesky@example.com'
    user.set_password(password)
    user.save()
    
    print(f"[SUCCESS] Admin user '{username}' updated successfully!")
    print(f"  - Email: {user.email}")
    print(f"  - Role: {user.get_role_display()}")
    print(f"  - Branch: {user.branch}")
    print(f"  - Employee ID: {user.employee_id}")
    print(f"  - is_staff: {user.is_staff}")
    print(f"  - is_superuser: {user.is_superuser}")
    
except User.DoesNotExist:
    print(f"User '{username}' not found")
except Exception as e:
    print(f"[ERROR] Error updating user: {e}")
