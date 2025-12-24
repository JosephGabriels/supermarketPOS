# PowerShell script to set up Supermarket POS as Windows services
# This script creates Windows services for automatic startup

Write-Host "Setting up Supermarket POS Windows Services..." -ForegroundColor Green

# Check if running as administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$adminRole = [Security.Principal.WindowsBuiltInRole]::Administrator

if (-not $principal.IsInRole($adminRole)) {
    Write-Host "Please run this script as Administrator to create Windows services." -ForegroundColor Red
    exit 1
}

# Define paths
$projectPath = "C:\supermarketPOS"
$nssmPath = "$projectPath\nssm.exe"
$pythonPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python313\python.exe"
$nginxPath = "C:\nginx\nginx.exe"

# Download NSSM if not present
if (-not (Test-Path $nssmPath)) {
    Write-Host "Downloading NSSM..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "$projectPath\nssm.zip"
        Expand-Archive -Path "$projectPath\nssm.zip" -DestinationPath "$projectPath\nssm-temp"
        Copy-Item "$projectPath\nssm-temp\nssm-2.24\win64\nssm.exe" $nssmPath
        Remove-Item "$projectPath\nssm.zip" -Recurse -Force
        Remove-Item "$projectPath\nssm-temp" -Recurse -Force
        Write-Host "NSSM downloaded successfully." -ForegroundColor Green
    } catch {
        Write-Host "Failed to download NSSM. Please download it manually from https://nssm.cc/" -ForegroundColor Red
        exit 1
    }
}

# Stop existing services if they exist
Write-Host "Stopping existing services..." -ForegroundColor Yellow
& $nssmPath stop "SupermarketPOS-Django" 2>$null
& $nssmPath stop "SupermarketPOS-Nginx" 2>$null
& $nssmPath remove "SupermarketPOS-Django" confirm 2>$null
& $nssmPath remove "SupermarketPOS-Nginx" confirm 2>$null

# Create Django service
Write-Host "Creating Django backend service..." -ForegroundColor Yellow
& $nssmPath install "SupermarketPOS-Django" $pythonPath
& $nssmPath set "SupermarketPOS-Django" AppParameters "run_production.py"
& $nssmPath set "SupermarketPOS-Django" AppDirectory "$projectPath\backend"
& $nssmPath set "SupermarketPOS-Django" DisplayName "Supermarket POS Django Backend"
& $nssmPath set "SupermarketPOS-Django" Description "Django REST API backend for Supermarket POS system"
& $nssmPath set "SupermarketPOS-Django" Start SERVICE_AUTO_START
& $nssmPath set "SupermarketPOS-Django" AppStdout "$projectPath\logs\django_service.log"
& $nssmPath set "SupermarketPOS-Django" AppStderr "$projectPath\logs\django_service_error.log"

# Create Nginx service
Write-Host "Creating Nginx service..." -ForegroundColor Yellow
& $nssmPath install "SupermarketPOS-Nginx" $nginxPath
& $nssmPath set "SupermarketPOS-Nginx" AppParameters "-c $projectPath\nginx.conf"
& $nssmPath set "SupermarketPOS-Nginx" AppDirectory "C:\nginx"
& $nssmPath set "SupermarketPOS-Nginx" DisplayName "Supermarket POS Nginx"
& $nssmPath set "SupermarketPOS-Nginx" Description "Nginx web server for Supermarket POS system"
& $nssmPath set "SupermarketPOS-Nginx" Start SERVICE_AUTO_START
& $nssmPath set "SupermarketPOS-Nginx" AppStdout "$projectPath\logs\nginx_service.log"
& $nssmPath set "SupermarketPOS-Nginx" AppStderr "$projectPath\logs\nginx_service_error.log"

# Set service dependencies (Django should start before Nginx)
& $nssmPath set "SupermarketPOS-Nginx" DependOnService "SupermarketPOS-Django"

# Start services
Write-Host "Starting services..." -ForegroundColor Yellow
& $nssmPath start "SupermarketPOS-Django"
Start-Sleep -Seconds 5  # Wait for Django to start
& $nssmPath start "SupermarketPOS-Nginx"

# Verify services are running
Write-Host "Verifying services..." -ForegroundColor Yellow
$djangoStatus = Get-Service "SupermarketPOS-Django" -ErrorAction SilentlyContinue
$nginxStatus = Get-Service "SupermarketPOS-Nginx" -ErrorAction SilentlyContinue

if ($djangoStatus.Status -eq "Running") {
    Write-Host "✓ Django service is running" -ForegroundColor Green
} else {
    Write-Host "✗ Django service failed to start" -ForegroundColor Red
}

if ($nginxStatus.Status -eq "Running") {
    Write-Host "✓ Nginx service is running" -ForegroundColor Green
} else {
    Write-Host "✗ Nginx service failed to start" -ForegroundColor Red
}

Write-Host "`nServices configured for automatic startup!" -ForegroundColor Green
Write-Host "The Supermarket POS system will now start automatically when the server restarts." -ForegroundColor Green
Write-Host "`nTo manually control services:" -ForegroundColor Cyan
Write-Host "  Start:  nssm start 'SupermarketPOS-Django' && nssm start 'SupermarketPOS-Nginx'" -ForegroundColor Cyan
Write-Host "  Stop:   nssm stop 'SupermarketPOS-Django' && nssm stop 'SupermarketPOS-Nginx'" -ForegroundColor Cyan
Write-Host "  Status: Get-Service 'SupermarketPOS-Django', 'SupermarketPOS-Nginx'" -ForegroundColor Cyan