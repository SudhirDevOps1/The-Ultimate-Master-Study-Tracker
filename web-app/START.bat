@echo off
setlocal enabledelayedexpansion
title FlowTrack Pro - Web App + Local Backend Launcher
color 0B

echo.
echo  ============================================================
echo   FlowTrack Pro ^| WEB APP + LOCAL BACKEND LAUNCHER
echo  ============================================================
echo.

set "FRONTEND_PORT=5173"
set "BACKEND_PORT=5001"
set "NODE_MIN_MAJOR=18"
set "BACKEND_READY=0"
set "PYTHON_OK=0"

:: Always run from the script's own folder
cd /d "%~dp0"

:: ----------------------------------------------------------------
:: STEP 1 — Check Node.js
:: ----------------------------------------------------------------
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed!
    echo         Download from: https://nodejs.org/
    pause & exit /b 1
)
for /f "delims=" %%i in ('node --version') do echo [OK] Node.js %%i

:: ----------------------------------------------------------------
:: STEP 2 — Check Python
:: ----------------------------------------------------------------
echo [2/6] Checking Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_OK=1"
    for /f "delims=" %%i in ('python --version') do echo [OK] %%i
) else (
    echo [WARN] Python not found. Python tracker backend will be skipped.
    echo        Download from: https://www.python.org/
)

:: ----------------------------------------------------------------
:: STEP 3 — Setup Python venv + Dependencies
:: ----------------------------------------------------------------
if "!PYTHON_OK!"=="1" (
    echo [3/6] Setting up Python environment...

    if not exist ".venv" (
        echo        Creating virtual environment...
        python -m venv .venv >nul 2>&1
        if !errorlevel! neq 0 (
            echo [WARN] Failed to create venv. Skipping Python backend.
            goto :skip_backend
        )
        echo [OK] Virtual environment created.
    )

    echo [4/6] Installing Python packages...
    .venv\Scripts\python.exe -m pip install --quiet --upgrade pip setuptools wheel >nul 2>&1
    .venv\Scripts\pip.exe install --quiet --upgrade pywin32 psutil >nul 2>&1
    .venv\Scripts\python.exe -m pywin32_postinstall -install >nul 2>&1

    :: ----------------------------------------------------------------
    :: STEP 4 — Start Backend Server (localhost:5001)
    :: ----------------------------------------------------------------
    echo [5/6] Starting local Python tracker backend...

    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING" 2^>nul') do (
        echo        Stopping old process on port %BACKEND_PORT%...
        taskkill /PID %%a /F >nul 2>&1
    )

    start "FlowTrack Python Backend" /MIN .venv\Scripts\python.exe backend.py --poll 2 --idle 300
    set "BACKEND_READY=1"
    echo [OK] Python backend server launched on http://localhost:%BACKEND_PORT%
) else (
    echo [3/6] Skipping Python venv setup
    echo [4/6] Skipping Python packages
    echo [5/6] Skipping Python backend
)

:skip_backend

:: ----------------------------------------------------------------
:: STEP 5 — Check Node modules & Launch local web app
:: ----------------------------------------------------------------
echo [6/6] Launching local Web App frontend...
if not exist "node_modules" (
    echo        Running npm install — this may take a minute...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed!
        pause & exit /b 1
    )
)

echo.
echo  ============================================================
if "!BACKEND_READY!"=="1" (
echo   Python Backend : http://localhost:%BACKEND_PORT%  [RUNNING]
) else (
echo   Python Backend : OFFLINE (IndexedDB Local Mode)
)
echo   Local Web App  : http://localhost:%FRONTEND_PORT%  [STARTING...]
echo.
echo   Browser will open automatically!
echo   Press Ctrl+C to stop.
echo  ============================================================
echo.

call npm run dev -- --open --port %FRONTEND_PORT%

:: Cleanup backend on exit
echo.
echo [INFO] Shutting down Python backend...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo [INFO] Stopped. Bye!
pause
