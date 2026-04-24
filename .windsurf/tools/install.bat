@echo off
:: Windsurf Agent Skills - Setup Script (Windows)
:: Starts config server (if Node.js available) and opens the Tech Stack UI.
:: Detects existing AGENTS.md and performs smart merge with backup.

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "UI_PATH=%SCRIPT_DIR%project-init-ui.html"
set "SERVER_PATH=%SCRIPT_DIR%config-server.js"
set "PROJECT_ROOT=%SCRIPT_DIR%..\.."
set "AGENTS_MD=%PROJECT_ROOT%\AGENTS.md"

echo.
echo ========================================
echo   Windsurf Agent Skills - Setup
echo ========================================
echo.

:: Pre-flight: Check for existing AGENTS.md
if exist "%AGENTS_MD%" (
  findstr /C:"<!-- ASP:" "%AGENTS_MD%" >nul 2>nul
  if !errorlevel! equ 0 (
    echo [INFO] Existing AGENTS.md found with ASP markers.
    echo        ASP sections will be updated in-place when config is saved.
  ) else (
    echo [WARN] Existing AGENTS.md found WITHOUT ASP markers.
    echo        A backup will be created in .windsurf\backups\
    echo        Your project-specific content will be preserved.
  )
  echo.
) else (
  echo [INFO] No existing AGENTS.md found. Will create from template.
  echo.
)

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [INFO] Node.js not found -- starting in offline mode.
  echo        You can still configure your stack manually.
  echo        The config will be downloaded as a file.
  echo.
  start "" "%UI_PATH%"
  echo [OK] UI opened in browser.
  echo.
  echo Move the downloaded project-init-config.json to .windsurf\
  echo Then run /project-init in Windsurf.
  echo.
  goto :end
)

:: Check if port 3847 is already in use
netstat -an | findstr ":3847 " | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
  echo [WARN] Port 3847 is already in use.
  echo        Another config server may be running.
  echo        Opening UI anyway...
  echo.
  start "" "%UI_PATH%"
  goto :end
)

:: Open UI first (before server blocks)
start "" "%UI_PATH%"

:: Start config server in foreground (will exit after save)
echo [INFO] Starting Config Server on port 3847...
echo [OK] UI opened in browser.
echo.
echo Fill out the form and click "Save ^& Generate".
echo You can also click "Analyze Project" to auto-detect your stack.
echo The server will shut down automatically after saving.
echo AGENTS.md merge happens automatically when config is saved.
echo.

node "%SERVER_PATH%"
echo.
echo ========================================
echo   Config saved successfully!
echo ========================================
echo.
echo Run /project-init in Windsurf to generate skills.
echo.

:end
endlocal
