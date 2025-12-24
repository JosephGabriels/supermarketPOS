# Supermarket POS Production Setup

This guide explains how to run the Supermarket POS system in production mode using Nginx and Waitress, accessible on the local network.

## Prerequisites

1. **Python Environment**: Ensure Python 3.8+ is installed and virtual environment is set up.
2. **Node.js**: Ensure Node.js is installed for building the frontend.
3. **Nginx**: Download and install Nginx for Windows from https://nginx.org/en/download.html
4. **PostgreSQL**: Ensure PostgreSQL is running with the database configured.

## Setup Steps

### 1. Install Dependencies

```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# Frontend dependencies (if not already done)
cd ../frontend
npm install
```

### 2. Build Frontend

```bash
cd frontend
npm run build
```

### 3. Configure Environment

The `.env` file in `backend/` is already configured for production:
- `DEBUG=False`
- `ALLOWED_HOSTS` includes local network ranges
- CORS origins allow localhost

### 4. Collect Static Files

```bash
cd backend
python manage.py collectstatic --noinput
```

### 5. Run Database Migrations (if needed)

```bash
python manage.py migrate
```

## Running in Production

### Option 1: Using the PowerShell Script (Recommended)

Run the provided PowerShell script:

```powershell
.\start_production.ps1
```

This will:
- Start the Django backend on port 8001 using Waitress
- Start Nginx on port 8000 serving the frontend and proxying API requests

### Option 2: Manual Start

1. **Start Backend**:
   ```bash
   cd backend
   python run_production.py
   ```

2. **Start Nginx**:
   ```bash
   nginx -c "C:\supermarketPOS\nginx.conf"
   ```

## Accessing the Application

- **Local Access**: http://localhost:8000
- **Network Access**: Replace `localhost` with your computer's IP address (e.g., `http://192.168.1.100:8000`)

To find your IP address:
```bash
ipconfig
```
Look for the IPv4 Address under your network adapter.

## API Endpoints

- Frontend: http://[IP]:8000
- Backend API: http://[IP]:8000/api

## Stopping the Servers

- If using the PowerShell script: Press Ctrl+C
- Manual stop:
  - Nginx: `nginx -s stop`
  - Backend: Kill the Python process

## Troubleshooting

1. **Port Conflicts**: Ensure ports 8000 and 8001 are not in use by other applications.
2. **Firewall**: Allow incoming connections on ports 8000 and 8001.
3. **Database Connection**: Verify PostgreSQL is running and credentials are correct.
4. **Static Files**: Ensure static files are collected and Nginx can access them.

## Security Notes

- Change the `SECRET_KEY` in `.env` for production.
- Consider using HTTPS in production (requires SSL certificates).
- Limit `ALLOWED_HOSTS` to specific IPs if possible.
- Use environment variables for sensitive data instead of `.env` file.