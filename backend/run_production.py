#!/usr/bin/env python
"""
Production server script using Waitress WSGI server
"""
import os
import sys
from pathlib import Path

# Add the project directory to the Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_config.settings')

# Setup Django
import django
django.setup()

from waitress import serve
from pos_config.wsgi import application

if __name__ == '__main__':
    print("Starting production server on 0.0.0.0:8001...")
    serve(application, host='0.0.0.0', port=8001)