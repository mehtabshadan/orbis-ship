# ===========================================
# INSTALL NEXT.JS AS WINDOWS TASK SCHEDULER
# ===========================================
# This script installs your Next.js server as a Windows Scheduled Task
# that runs automatically on PC startup
#
# REQUIREMENTS:
# 1. Run PowerShell as Administrator
#
# ===========================================

# Set console encoding to UTF-8 to prevent character display issues
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# Configuration
$taskName = "Orbis Ship"
$taskDisplayName = "Orbis Ship Next.js Server"
$taskDescription = "Orbis Ship - Next.js production server running automatically on system startup"

# Detect script location dynamically
if ($args.Count -gt 0) {
    $baseDir = $args[0]
} else {
    # Get the directory where this script is located, then go up one level
    if ($PSScriptRoot) {
        $baseDir = Split-Path $PSScriptRoot -Parent
    } else {
        # Fallback to current directory if PSScriptRoot is not available
        $baseDir = (Get-Location).Path
    }
}

$standaloneDir = Join-Path $baseDir ".next\standalone"
$serverFile = Join-Path $standaloneDir "server.js"
$batchFile = Join-Path $baseDir "run.bat"
$logDir = Join-Path $baseDir "logs"

# ===========================================
# STEP 1: Check Administrator Privileges
# ===========================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ORBIS SHIP SETUP - WINDOWS SERVICE INSTALLER" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "App Directory: $baseDir" -ForegroundColor Green
Write-Host "Standalone Directory: $standaloneDir" -ForegroundColor Green
Write-Host ""

Write-Host "Checking administrator privileges..." -ForegroundColor Cyan
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ADMINISTRATOR PRIVILEGES REQUIRED!" -ForegroundColor Red
    Write-Host "Requesting elevation..." -ForegroundColor Yellow
    
    # Get the script path and its directory
    $scriptPath = $MyInvocation.MyCommand.Path
    
    # Determine the base directory (where the script is located)
    if ($PSScriptRoot) {
        $currentDir = $PSScriptRoot
    } else {
        $currentDir = (Get-Location).Path
    }
    
    # If script path is null (running from console), use current directory
    if (-not $scriptPath) {
        Write-Host "ERROR: Cannot auto-elevate when running commands directly in console." -ForegroundColor Red
        Write-Host "Please save this as a .ps1 file and run it, or manually run PowerShell as Administrator." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    try {
        # Restart the script with admin privileges, passing the script directory
        Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" `"$currentDir`""
        exit 0
    }
    catch {
        Write-Host "ERROR: Failed to request administrator privileges." -ForegroundColor Red
        Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "[OK] Running with administrator privileges" -ForegroundColor Green
Write-Host ""

# ===========================================
# STEP 2: Verify Files Exist
# ===========================================
Write-Host "Verifying server files..." -ForegroundColor Cyan

$allFilesExist = $true

if (-not (Test-Path $serverFile)) {
    Write-Host "[ERROR] server.js not found at: $serverFile" -ForegroundColor Red
    $allFilesExist = $false
}
else {
    Write-Host "[OK] Found server.js at: $serverFile" -ForegroundColor Green
}

if (-not (Test-Path $batchFile)) {
    Write-Host "[ERROR] run.bat not found at: $batchFile" -ForegroundColor Red
    $allFilesExist = $false
}
else {
    Write-Host "[OK] Found run.bat at: $batchFile" -ForegroundColor Green
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "SETUP FAILED: Required files are missing!" -ForegroundColor Red
    Write-Host "Please ensure you extracted the full package correctly." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# ===========================================
# STEP 3: Create Log Directory
# ===========================================
Write-Host "Setting up log directory..." -ForegroundColor Cyan
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "[OK] Created log directory: $logDir" -ForegroundColor Green
}
else {
    Write-Host "[OK] Log directory exists: $logDir" -ForegroundColor Green
}
Write-Host ""

# ===========================================
# STEP 4: Remove Existing Task
# ===========================================
Write-Host "Checking for existing scheduled task..." -ForegroundColor Cyan

try {
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "[INFO] Found existing task. Removing..." -ForegroundColor Yellow
        
        # Stop the task if running
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # Unregister the task
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Write-Host "[OK] Existing task removed successfully" -ForegroundColor Green
    }
    else {
        Write-Host "[INFO] No existing task found" -ForegroundColor Gray
    }
}
catch {
    Write-Host "[WARNING] Could not remove existing task: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# ===========================================
# STEP 5: Create Scheduled Task
# ===========================================
Write-Host "Creating scheduled task..." -ForegroundColor Cyan

try {
    # Create task action
    $action = New-ScheduledTaskAction -Execute $batchFile -WorkingDirectory $baseDir
    
    # Create task trigger (at startup)
    $trigger = New-ScheduledTaskTrigger -AtStartup
    
    # Create task settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 0)
    
    # Create task principal (run as SYSTEM with highest privileges)
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    # Register the task
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $taskDescription -Force | Out-Null
    
    Write-Host "[OK] Scheduled task created successfully" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Failed to create scheduled task" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# ===========================================
# STEP 6: Start the Task
# ===========================================
Write-Host "Starting the task..." -ForegroundColor Cyan

try {
    Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
    Start-Sleep -Seconds 3
    
    # Check task status
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    if ($taskInfo.LastTaskResult -eq 0 -or $taskInfo.LastRunTime -gt (Get-Date).AddMinutes(-1)) {
        Write-Host "[OK] Task started successfully!" -ForegroundColor Green
        Write-Host "[INFO] Orbis Ship is now running as a Windows service" -ForegroundColor Green
        Write-Host "[INFO] The application will start automatically on system boot" -ForegroundColor Green
    }
    else {
        Write-Host "[WARNING] Task may not have started correctly" -ForegroundColor Yellow
        Write-Host "Last Result: $($taskInfo.LastTaskResult)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "[ERROR] Failed to start scheduled task" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "TROUBLESHOOTING STEPS:" -ForegroundColor White
    Write-Host "1. Test the batch file manually:" -ForegroundColor Gray
    Write-Host "   & `"$batchFile`"" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "2. Check task logs:" -ForegroundColor Gray
    Write-Host "   Get-Content $logDir\service.log -Tail 20" -ForegroundColor DarkGray
    Write-Host ""
}
Write-Host ""

# ===========================================
# FINAL STATUS
# ===========================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor White
Write-Host "1. The Orbis Ship service is now installed and running" -ForegroundColor Gray
Write-Host "2. Access your application at: http://localhost:3000" -ForegroundColor Gray
Write-Host "3. The service will start automatically when Windows boots" -ForegroundColor Gray
Write-Host ""
Write-Host "MANAGEMENT COMMANDS:" -ForegroundColor White
Write-Host ""
Write-Host "  Check Status:" -ForegroundColor White
Write-Host "    Get-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  Start Service:" -ForegroundColor White
Write-Host "    Start-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  Stop Service:" -ForegroundColor White
Write-Host "    Stop-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  Remove Service:" -ForegroundColor White
Write-Host "    Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false" -ForegroundColor Gray
Write-Host ""
Write-Host "  View Logs:" -ForegroundColor White
Write-Host "    Get-Content $logDir\service.log -Tail 50" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"