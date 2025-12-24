# PowerShell script to start production servers
# Run this script to start the Supermarket POS system in production mode

Write-Host "Starting Supermarket POS Production Servers..." -ForegroundColor Green

# Start Django backend with Waitress in background
Write-Host "Starting Django backend on port 8001..." -ForegroundColor Yellow
Start-Job -ScriptBlock {
    Set-Location "C:\supermarketPOS\backend"
    & python run_production.py
} -Name "DjangoBackend"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Nginx (assuming nginx.exe is in PATH or adjust path)
Write-Host "Starting Nginx on port 8000..." -ForegroundColor Yellow
# Note: Adjust the path to nginx.exe if not in PATH
# For example: & "C:\nginx\nginx.exe" -c "C:\supermarketPOS\nginx.conf"
& "C:\nginx\nginx.exe" -c "C:\supermarketPOS\nginx.conf"

Write-Host "Production servers started!" -ForegroundColor Green
Write-Host "Application: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API: http://localhost:8000/api" -ForegroundColor Cyan
Write-Host "To access from other computers on the network, use your computer's IP address (e.g., http://192.168.22.215:8000)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop servers" -ForegroundColor Red

# Keep script running to monitor
try {
    while ($true) {
        Start-Sleep -Seconds 10
        # Check if backend job is still running
        $job = Get-Job -Name "DjangoBackend"
        if ($job.State -ne "Running") {
            Write-Host "Django backend job stopped. State: $($job.State)" -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    # Stop Nginx
    & "C:\nginx\nginx.exe" -s stop
    # Stop Django job
    Stop-Job -Name "DjangoBackend"
    Remove-Job -Name "DjangoBackend"
    Write-Host "Servers stopped." -ForegroundColor Green
}