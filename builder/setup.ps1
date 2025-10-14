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
Write-Host "Checking administrator privileges..." -ForegroundColor Cyan
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Administrator privileges required. Requesting elevation..." -ForegroundColor Yellow
    
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
        exit
    }
    
    try {
        # Restart the script with admin privileges, passing the script directory
        Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" `"$currentDir`""
        exit
    }
    catch {
        Write-Host "ERROR: Failed to request administrator privileges." -ForegroundColor Red
        Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit
    }
}

Write-Host "Running with administrator privileges" -ForegroundColor Green
Write-Host ""

# ===========================================
# STEP 2: Verify Files Exist
# ===========================================
Write-Host "Verifying server files..." -ForegroundColor Cyan

if (-not (Test-Path $serverFile)) {
    Write-Host "ERROR: server.js not found at: $serverFile" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

if (-not (Test-Path $batchFile)) {
    Write-Host "ERROR: run.bat not found at: $batchFile" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Found server.js at: $serverFile" -ForegroundColor Green
Write-Host "Found run.bat at: $batchFile" -ForegroundColor Green
Write-Host ""

# ===========================================
# STEP 3: Create Log Directory
# ===========================================
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "Created log directory: $logDir" -ForegroundColor Green
    Write-Host ""
}

# ===========================================
# STEP 4: Remove Existing Task
# ===========================================
Write-Host "Checking for existing scheduled task..." -ForegroundColor Cyan

try {
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Found existing task. Removing..." -ForegroundColor Yellow
        
        # Stop the task if running
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # Unregister the task
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Write-Host "Existing task removed successfully" -ForegroundColor Green
        Write-Host ""
    }
    else {
        Write-Host "No existing task found" -ForegroundColor Gray
        Write-Host ""
    }
}
catch {
    Write-Host "Warning: Could not remove existing task: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

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
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $taskDescription -Force
    
    Write-Host "Scheduled task created successfully" -ForegroundColor Green
    Write-Host "  - Task Name: $taskName" -ForegroundColor Gray
    Write-Host "  - Trigger: At system startup" -ForegroundColor Gray
    Write-Host "  - Run Level: Highest privileges" -ForegroundColor Gray
    Write-Host "  - User: SYSTEM" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "ERROR: Failed to create scheduled task" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# ===========================================
# STEP 6: Start Task
# ===========================================
Write-Host "Starting scheduled task..." -ForegroundColor Cyan

try {
    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 3
    
    $task = Get-ScheduledTask -TaskName $taskName
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    
    Write-Host ""
    Write-Host "SUCCESS! Task installed and started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor White
    Write-Host "  Name: $taskName" -ForegroundColor Gray
    Write-Host "  State: $($task.State)" -ForegroundColor Green
    Write-Host "  Last Run: $($taskInfo.LastRunTime)" -ForegroundColor Gray
    Write-Host "  Next Run: $($taskInfo.NextRunTime)" -ForegroundColor Gray
    Write-Host "  Startup Type: Automatic (starts on PC restart)" -ForegroundColor Gray
    Write-Host "  Logs: $logDir\service.log" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Your Next.js server will now start automatically when Windows boots!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test your server by visiting: http://localhost:3000" -ForegroundColor Cyan
}
catch {
    Write-Host "ERROR: Failed to start scheduled task" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor White
    Write-Host "1. Check if the batch file exists and is executable:" -ForegroundColor Gray
    Write-Host "   Test-Path `"$batchFile`"" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "2. Test the batch file manually:" -ForegroundColor Gray
    Write-Host "   & `"$batchFile`"" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "3. Try starting the task manually:" -ForegroundColor Gray
    Write-Host "   Start-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "4. Check task logs:" -ForegroundColor Gray
    Write-Host "   Get-Content $logDir\service.log -Tail 20" -ForegroundColor DarkGray
    Write-Host ""
}
Write-Host ""

# ===========================================
# MANAGEMENT COMMANDS
# ===========================================
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "TASK MANAGEMENT COMMANDS:" -ForegroundColor White
Write-Host ""
Write-Host "  Check Status:" -ForegroundColor White
Write-Host "    Get-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor Gray
Write-Host "    Get-ScheduledTaskInfo -TaskName `"$taskName`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  Start Task:" -ForegroundColor White
Write-Host "    Start-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  Stop Task:" -ForegroundColor White
Write-Host "    Stop-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  Remove Task:" -ForegroundColor White
Write-Host "    Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false" -ForegroundColor Gray
Write-Host ""
Write-Host "  View Logs:" -ForegroundColor White
Write-Host "    Get-Content $logDir\service.log -Tail 50" -ForegroundColor Gray
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"