@echo off
setlocal

REM Get the directory where this batch file is located (which is the app directory)
set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%"
set "STANDALONE_DIR=%APP_DIR%\.next\standalone"
set "LOG_DIR=%APP_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\service.log"

REM Create logs directory if it doesn't exist
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Log startup information
echo. >> "%LOG_FILE%"
echo ============================================== >> "%LOG_FILE%"
echo Service starting at %date% %time% >> "%LOG_FILE%"
echo Script Directory: %SCRIPT_DIR% >> "%LOG_FILE%"
echo App Directory: %APP_DIR% >> "%LOG_FILE%"
echo Standalone Directory: %STANDALONE_DIR% >> "%LOG_FILE%"
echo ============================================== >> "%LOG_FILE%"

REM Check if standalone directory exists
if not exist "%STANDALONE_DIR%" (
    echo ERROR: Standalone directory not found: %STANDALONE_DIR% >> "%LOG_FILE%"
    echo ERROR: Please build the Next.js application first >> "%LOG_FILE%"
    exit /b 1
)

REM Check if server.js exists
if not exist "%STANDALONE_DIR%\server.js" (
    echo ERROR: server.js not found in %STANDALONE_DIR% >> "%LOG_FILE%"
    echo ERROR: Please build the Next.js application with standalone output >> "%LOG_FILE%"
    exit /b 1
)

REM Change to standalone directory
cd /d "%STANDALONE_DIR%"

REM Log current directory and start server
echo Current Directory: %CD% >> "%LOG_FILE%"
echo Starting Node.js server... >> "%LOG_FILE%"

REM Start the Node.js server and redirect output to log
node server.js >> "%LOG_FILE%" 2>&1