@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo           Orbis Ship Application
echo ============================================
echo.

REM Get the directory where this batch file is located
REM This will be the application root when deployed
set "APP_DIR=%~dp0"
set "STANDALONE_DIR=%APP_DIR%.next\standalone"

echo App Directory: !APP_DIR!
echo Standalone Directory: !STANDALONE_DIR!
echo.

REM Check if standalone directory exists
if not exist "!STANDALONE_DIR!" (
    echo ERROR: Standalone directory not found: !STANDALONE_DIR!
    echo ERROR: Please ensure the application was built correctly
    echo.
    echo Expected structure:
    echo   !APP_DIR!
    echo   ├── .next\
    echo   │   └── standalone\
    echo   │       └── server.js
    echo   ├── public\
    echo   ├── run.bat (this file)
    echo   └── setup.ps1
    echo.
    pause
    exit /b 1
)

REM Check if server.js exists
if not exist "!STANDALONE_DIR!\server.js" (
    echo ERROR: server.js not found in !STANDALONE_DIR!
    echo ERROR: Please ensure the application was built with standalone output
    echo.
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Starting Orbis Ship application...
echo Server will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

REM Change to standalone directory and start server
cd /d "!STANDALONE_DIR!"
echo Starting server from: !CD!
echo.
node server.js