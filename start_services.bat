@echo off
REM Batch script to start Supermarket POS services
REM Run this manually or schedule it for automatic startup

echo Starting Supermarket POS Services...

REM Start Django backend in background
echo Starting Django backend...
start /B cmd /C "cd C:\supermarketPOS\backend && C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python313\python.exe run_production.py"

REM Wait a moment for backend to initialize
timeout /t 5 /nobreak > nul

REM Start Nginx
echo Starting Nginx...
C:\nginx\nginx.exe -c C:\supermarketPOS\nginx.conf

echo Services started successfully!
echo.
echo To stop services manually:
echo - Kill Python processes: taskkill /f /im python.exe
echo - Stop Nginx: nginx -s stop
echo.
pause