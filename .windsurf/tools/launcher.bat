@echo off
setlocal enabledelayedexpansion
title dotSource Agent Skills

:: Resolve paths to absolute (avoids .. issues with spaces in paths)
set "TOOLS_DIR=%~dp0"
pushd "%TOOLS_DIR%"
set "TOOLS_DIR=%CD%\"
popd
pushd "%TOOLS_DIR%.."
set "WINDSURF_DIR=%CD%"
popd
pushd "%TOOLS_DIR%..\.."
set "PROJECT_ROOT=%CD%"
popd
set "SERVER_FILE=%TOOLS_DIR%config-server.js"
set "PORT=3847"

:menu
cls
echo.
echo   ============================================
echo.
echo     dotSource Agent Skills
echo.
echo   ============================================
echo.
echo     [1] Project Setup (Tech Stack Analysis)
echo     [2] Dashboard
echo     [3] Full Scan (SBOM + Security + License)
echo     [4] Workflow Runner
echo     [5] Exit
echo.
echo   ============================================
echo.
set /p "choice=  Select: "

if "%choice%"=="1" goto :project_setup
if "%choice%"=="2" goto :dashboard
if "%choice%"=="3" goto :full_scan
if "%choice%"=="4" goto :workflow_runner
if "%choice%"=="5" goto :exit
echo.
echo   [ERROR] Invalid selection. Try again.
timeout /t 2 /nobreak >nul
goto :menu

:: ---------------------------------------------------------------
:: [1] Project Setup
:: ---------------------------------------------------------------
:project_setup
cls
echo.
echo   ============================================
echo     Project Setup - Tech Stack Analysis
echo   ============================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [ERROR] Node.js is not installed or not in PATH.
    echo           Install from: https://nodejs.org/
    echo.
    pause
    goto :menu
)

if not exist "%SERVER_FILE%" (
    echo   [ERROR] config-server.js not found at %SERVER_FILE%
    pause
    goto :menu
)

:: Check for existing AGENTS.md
if not exist "%PROJECT_ROOT%\AGENTS.md" (
    echo   [INFO] No AGENTS.md found. Will be created automatically.
    goto :agents_check_done
)
findstr /C:"ASP:" "%PROJECT_ROOT%\AGENTS.md" >nul 2>nul
if !errorlevel! equ 0 (
    echo   [INFO] Existing AGENTS.md with ASP markers found.
    echo          ASP sections will be updated when config is saved.
) else (
    echo   [INFO] Existing AGENTS.md found ^(no ASP markers^).
    echo          A backup will be created, your content preserved.
)
:agents_check_done
echo.

:: Remember config file timestamp before UI
set "CONFIG_FILE=%WINDSURF_DIR%\project-init-config.json"
set "CONFIG_EXISTED=0"
set "CONFIG_TIME_BEFORE="
if exist "%CONFIG_FILE%" (
    set "CONFIG_EXISTED=1"
    for %%f in ("%CONFIG_FILE%") do set "CONFIG_TIME_BEFORE=%%~tf"
)

call :ensure_server

echo   [OPEN] Opening Tech Stack UI in browser...
echo.
start "" "%TOOLS_DIR%project-init-ui.html"
echo   -----------------------------------------------
echo   1. Click "Analyze Project" to detect your stack
echo   2. Adjust settings if needed
echo   3. Click "Save ^& Generate"
echo   -----------------------------------------------
echo.
echo   Waiting for config to be saved...

:: Poll for config file change
:wait_config
timeout /t 2 /nobreak >nul
if not exist "%CONFIG_FILE%" goto :wait_config

set "CONFIG_TIME_AFTER="
for %%f in ("%CONFIG_FILE%") do set "CONFIG_TIME_AFTER=%%~tf"

if "%CONFIG_EXISTED%"=="1" (
    if "%CONFIG_TIME_AFTER%"=="%CONFIG_TIME_BEFORE%" goto :wait_config
)

echo.
echo   ============================================
echo     Config saved! AGENTS.md merged.
echo   ============================================
echo.

:: Check if Devin CLI is available
where devin >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   Next step: generate stack-specific rules.
    echo.
    echo   Options:
    echo     - Windsurf: run /project-init
    echo     - Devin:    devin --prompt-file "%TOOLS_DIR%project-init-prompt.md"
    echo     - Install Devin CLI: https://cli.devin.ai
    echo.
    pause
    goto :menu
)

:: Launch Devin with the project-init prompt
echo   [INFO] Starting Devin for rule generation (Phase 2-4)...
echo.
devin --prompt-file "%TOOLS_DIR%project-init-prompt.md"
echo.
echo   ============================================
echo     Phase 2-4 complete!
echo   ============================================
echo.
pause
goto :menu

:: ---------------------------------------------------------------
:: [2] Dashboard
:: ---------------------------------------------------------------
:dashboard
cls
echo.
echo   ============================================
echo     Dashboard
echo   ============================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [ERROR] Node.js is not installed or not in PATH.
    pause
    goto :menu
)

if not exist "%SERVER_FILE%" (
    echo   [ERROR] config-server.js not found.
    pause
    goto :menu
)

call :ensure_server

echo   [SCAN] Running data aggregation...
curl -s http://localhost:%PORT%/dashboard-aggregate >nul 2>&1
echo   [OK] Data loaded.
echo.
echo   [OPEN] Opening dashboard at http://localhost:%PORT%/dashboard
start "" "http://localhost:%PORT%/dashboard"
echo.
echo   Press any key to return to menu...
pause >nul
goto :menu

:: ---------------------------------------------------------------
:: [3] Full Scan
:: ---------------------------------------------------------------
:full_scan
cls
echo.
echo   ============================================
echo     Full Scan (SBOM + Security + License)
echo   ============================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [ERROR] Node.js is not installed or not in PATH.
    pause
    goto :menu
)

if not exist "%SERVER_FILE%" (
    echo   [ERROR] config-server.js not found.
    pause
    goto :menu
)

call :ensure_server

echo   [1/4] Generating SBOM...
curl -s http://localhost:%PORT%/generate-sbom >nul 2>&1
echo   [OK] SBOM generated.

echo   [2/4] Running security scan...
curl -s http://localhost:%PORT%/security-scan >nul 2>&1
echo   [OK] Security scan complete.

echo   [3/4] Checking licenses...
curl -s http://localhost:%PORT%/license-check >nul 2>&1
echo   [OK] License check complete.

echo   [4/4] Aggregating dashboard data...
curl -s http://localhost:%PORT%/dashboard-aggregate >nul 2>&1
echo   [OK] Dashboard data updated.

echo.
echo   ============================================
echo     Full scan complete!
echo   ============================================
echo.
echo   Open the dashboard to see results (Option 2).
echo.
pause
goto :menu

:: ---------------------------------------------------------------
:: [4] Workflow Runner
:: ---------------------------------------------------------------
:workflow_runner
cls
echo.
echo   ============================================
echo     Workflow Runner
echo   ============================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [ERROR] Node.js is not installed or not in PATH.
    pause
    goto :menu
)

call :ensure_server

echo   Loading workflows...
echo.

:: Fetch workflow list and display
for /f "delims=" %%i in ('curl -s http://localhost:%PORT%/workflows 2^>nul') do set "WF_JSON=%%i"

echo   Available Workflows:
echo   -----------------------------------------------
echo   [1]  api-docs
echo   [2]  architecture-review
echo   [3]  bom
echo   [4]  changelog
echo   [5]  ci-pipeline
echo   [6]  code-review
echo   [7]  deep-security-audit
echo   [8]  docker-setup
echo   [9]  generate-tests
echo   [10] migration
echo   [11] refactor-legacy
echo   [12] validate-rules
echo   [0]  Back to menu
echo   -----------------------------------------------
echo.
set /p "wf_choice=  Select workflow: "

if "%wf_choice%"=="0" goto :menu
if "%wf_choice%"=="1" set "WF_NAME=api-docs"
if "%wf_choice%"=="2" set "WF_NAME=architecture-review"
if "%wf_choice%"=="3" set "WF_NAME=bom"
if "%wf_choice%"=="4" set "WF_NAME=changelog"
if "%wf_choice%"=="5" set "WF_NAME=ci-pipeline"
if "%wf_choice%"=="6" set "WF_NAME=code-review"
if "%wf_choice%"=="7" set "WF_NAME=deep-security-audit"
if "%wf_choice%"=="8" set "WF_NAME=docker-setup"
if "%wf_choice%"=="9" set "WF_NAME=generate-tests"
if "%wf_choice%"=="10" set "WF_NAME=migration"
if "%wf_choice%"=="11" set "WF_NAME=refactor-legacy"
if "%wf_choice%"=="12" set "WF_NAME=validate-rules"

if not defined WF_NAME (
    echo   [ERROR] Invalid selection.
    timeout /t 2 /nobreak >nul
    goto :workflow_runner
)

echo.
echo   [INFO] Workflow: %WF_NAME%
echo   [INFO] Fetching workflow details...
echo.

:: Show workflow description
curl -s http://localhost:%PORT%/workflow/%WF_NAME% 2>nul | node -e "process.stdin.setEncoding('utf8');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log('  Description: '+j.description);console.log('  Devin Skill: '+(j.hasDevinSkill?'Yes':'No'))}catch(e){console.log('  Could not parse workflow data.')}})"

echo.
echo   -----------------------------------------------
echo   To run this workflow:
echo.
echo   Windsurf:  /%WF_NAME%
echo   Devin:     "Run %WF_NAME%"
echo   API:       curl http://localhost:%PORT%/workflow/%WF_NAME%
echo   -----------------------------------------------
echo.

set "WF_NAME="
pause
goto :workflow_runner

:: ---------------------------------------------------------------
:: Shared: Ensure server is running
:: ---------------------------------------------------------------
:ensure_server
netstat -ano 2>nul | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [OK] Server already running on port %PORT%.
    goto :eof
)

echo   [START] Starting config server on port %PORT%...
start /b "" node "%SERVER_FILE%" >nul 2>&1

set "RETRIES=0"
:wait_server
if !RETRIES! geq 10 (
    echo   [ERROR] Server did not start within 5 seconds.
    goto :eof
)
timeout /t 1 /nobreak >nul
curl -s http://localhost:%PORT%/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    set /a RETRIES+=1
    goto :wait_server
)
echo   [OK] Server is running.
goto :eof

:: ---------------------------------------------------------------
:: Exit
:: ---------------------------------------------------------------
:exit
echo.
echo   Stopping server if running...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo   Done.
endlocal
exit /b 0
