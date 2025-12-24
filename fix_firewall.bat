@echo off
REM Fix Windows Firewall for Supermarket POS
REM Run this as Administrator

echo Adding firewall rule for port 8000...

netsh advfirewall firewall add rule name="Supermarket POS HTTP" dir=in action=allow protocol=TCP localport=8000

if %errorlevel% equ 0 (
    echo Firewall rule added successfully!
    echo Port 8000 should now be accessible from other computers on the network.
) else (
    echo Failed to add firewall rule. Please run this script as Administrator.
)

echo.
echo Also adding rule for port 8001 (Django backend)...
netsh advfirewall firewall add rule name="Supermarket POS API" dir=in action=allow protocol=TCP localport=8001

echo.
echo Firewall configuration complete!
pause