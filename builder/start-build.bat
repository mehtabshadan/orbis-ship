@echo off
echo.
echo =============================================
echo    Next.js Build and Package Creator
echo =============================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available on this system
    pause
    exit /b 1
)

REM Get the script directory and go up one level to project root
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

REM Run the PowerShell build script from project root
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%build-packager.ps1" -BaseDir "%PROJECT_ROOT%" %*

pause