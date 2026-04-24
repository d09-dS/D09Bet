@echo off
setlocal enabledelayedexpansion

echo.
echo  ===================================
echo   Windsurf Dashboard
echo  ===================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo          Install from: https://nodejs.org/
    pause
    exit /b 1
)

:: Get script directory
set "SCRIPT_DIR=%~dp0"
set "SERVER_FILE=%SCRIPT_DIR%config-server.js"

if not exist "%SERVER_FILE%" (
    echo  [ERROR] config-server.js not found at: %SERVER_FILE%
    pause
    exit /b 1
)

:: Check if port 3847 is already in use
set "PORT=3847"
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo  [INFO] Server already running on port %PORT%.
    echo         Opening dashboard...
    goto :open_dashboard
)

:: Start server in background
echo  [START] Starting config server on port %PORT%...
start /b "" node "%SERVER_FILE%" >nul 2>&1

:: Wait for server to be ready
set "RETRIES=0"
:wait_loop
if !RETRIES! geq 10 (
    echo  [ERROR] Server did not start within 5 seconds.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
curl -s http://localhost:%PORT%/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    set /a RETRIES+=1
    goto :wait_loop
)

echo  [OK] Server is running.

:: Run full scan
echo  [SCAN] Running full dashboard scan...
curl -s http://localhost:%PORT%/dashboard-full-scan >nul 2>&1
echo  [OK] Scan complete.

:open_dashboard
echo  [OPEN] Opening dashboard at http://localhost:%PORT%/dashboard
echo.
start "" "http://localhost:%PORT%/dashboard"

echo  Press any key to stop the server...
pause >nul

:: Kill the server
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo  [STOP] Server stopped.
