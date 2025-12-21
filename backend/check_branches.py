import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_config.settings')
django.setup()

from core.models import Branch

def list_branches():
    branches = Branch.objects.all()
    for b in branches:
        print(f"ID: {b.id}, Name: {b.name}")

if __name__ == '__main__':
    list_branches()
