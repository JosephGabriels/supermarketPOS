# Automatic Startup Setup for Supermarket POS

This guide explains how to configure the Supermarket POS system to start automatically when the server restarts.

## Option 1: Windows Services (Recommended)

### Using the PowerShell Setup Script

1. **Run as Administrator**:
   ```powershell
   .\setup_services.ps1
   ```

2. **What it does**:
   - Downloads NSSM (Non-Sucking Service Manager)
   - Creates Windows services for Django backend and Nginx
   - Configures automatic startup
   - Sets service dependencies

3. **Service Names**:
   - `SupermarketPOS-Django`
   - `SupermarketPOS-Nginx`

### Manual Service Management

```powershell
# Start services
nssm start "SupermarketPOS-Django"
nssm start "SupermarketPOS-Nginx"

# Stop services
nssm stop "SupermarketPOS-Django"
nssm stop "SupermarketPOS-Nginx"

# Check status
Get-Service "SupermarketPOS-Django", "SupermarketPOS-Nginx"
```

## Option 2: Windows Task Scheduler

### Create Startup Task

1. **Open Task Scheduler**:
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create New Task**:
   - Click "Create Task..." in the Actions panel
   - Name: `Supermarket POS Startup`
   - Check "Run with highest privileges"
   - Configure for: "Windows 10" (or your Windows version)

3. **Triggers Tab**:
   - Click "New..."
   - Begin the task: "At startup"
   - Check "Delay task for:" and set to "30 seconds"

4. **Actions Tab**:
   - Click "New..."
   - Action: "Start a program"
   - Program/script: `C:\supermarketPOS\start_services.bat`
   - Start in: `C:\supermarketPOS`

5. **Conditions Tab**:
   - Uncheck "Start the task only if the computer is on AC power"
   - Check "Wake the computer to run this task" (if applicable)

6. **Settings Tab**:
   - Check "Run task as soon as possible after a scheduled start is missed"
   - Check "If the task fails, restart every:" and set to "1 minute" for 3 times

7. **Save the Task**

### Test the Task

- Restart your computer to test automatic startup
- Or right-click the task and select "Run" to test manually

## Option 3: Startup Folder (Simple but Less Reliable)

1. **Create a shortcut** to `start_services.bat`
2. **Place it in the Startup folder**:
   - Press `Win + R`, type `shell:startup`, press Enter
   - Copy the shortcut there

**Note**: This method may not work reliably for services that require administrator privileges.

## Monitoring and Troubleshooting

### Check Service Status

```powershell
# Check if services are running
Get-Service "SupermarketPOS-Django", "SupermarketPOS-Nginx"

# View service logs
Get-Content "C:\supermarketPOS\logs\django_service.log" -Tail 20
Get-Content "C:\supermarketPOS\logs\nginx_service.log" -Tail 20
```

### Common Issues

1. **Services fail to start**:
   - Check that paths in the service configuration are correct
   - Ensure NSSM has proper permissions
   - Check Windows Event Viewer for error details

2. **Port conflicts**:
   - Ensure ports 8000 and 8001 are not used by other applications
   - Check with: `netstat -ano | findstr :8000` and `netstat -ano | findstr :8001`

3. **Permission issues**:
   - Services run under SYSTEM account by default
   - Ensure the service account has access to required files and directories

### Manual Startup (Fallback)

If automatic startup fails, you can always start manually:

```batch
# From project root directory
.\start_services.bat
```

Or use the original PowerShell script:
```powershell
.\start_production.ps1
```

## Service Dependencies

- Django backend must start before Nginx
- Nginx proxies API requests to Django
- Both services are configured to restart automatically on failure

## Logs Location

- Django service logs: `C:\supermarketPOS\logs\django_service.log`
- Nginx service logs: `C:\supermarketPOS\logs\nginx_service.log`
- General application logs: `C:\supermarketPOS\logs\`