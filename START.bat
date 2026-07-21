@echo off
setlocal enabledelayedexpansion
title FlowTrack Pro - One Click Launcher
color 0B

echo.
echo  ============================================================
echo   FlowTrack Pro ^| ONE CLICK LAUNCHER
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
echo [1/8] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed!
    echo         Download from: https://nodejs.org/
    pause & exit /b 1
)
for /f "delims=." %%a in ('node --version') do set "NODE_VER=%%a"
set "NODE_VER=!NODE_VER:v=!"
if !NODE_VER! LSS %NODE_MIN_MAJOR% (
    echo [WARN] Node.js v!NODE_VER! found. Recommended: v%NODE_MIN_MAJOR%+
) else (
    for /f "delims=" %%i in ('node --version') do echo [OK] Node.js %%i
)

:: ----------------------------------------------------------------
:: STEP 2 — Check Python
:: ----------------------------------------------------------------
echo [2/8] Checking Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_OK=1"
    for /f "delims=" %%i in ('python --version') do echo [OK] %%i
) else (
    echo [WARN] Python not found. Backend will be skipped.
    echo        Download from: https://www.python.org/
)

:: ----------------------------------------------------------------
:: STEP 3 — Setup Python venv (first time or if missing)
:: ----------------------------------------------------------------
if "!PYTHON_OK!"=="1" (
    echo [3/8] Setting up Python environment...

    if not exist ".venv" (
        echo        Creating virtual environment...
        python -m venv .venv >nul 2>&1
        if !errorlevel! neq 0 (
            echo [WARN] Failed to create venv. Skipping backend.
            goto :skip_backend
        )
        echo [OK] Virtual environment created.
    ) else (
        echo [OK] Virtual environment already exists.
    )

    :: ----------------------------------------------------------------
    :: STEP 4 — Install/upgrade Python packages
    :: ----------------------------------------------------------------
    echo [4/8] Installing Python packages ^(only if needed^)...
    .venv\Scripts\python.exe -m pip install --quiet --upgrade pip setuptools wheel >nul 2>&1
    .venv\Scripts\pip.exe install --quiet --upgrade pywin32 psutil >nul 2>&1
    if !errorlevel! neq 0 (
        echo [WARN] Some Python packages may have failed.
    ) else (
        echo [OK] Python packages ready ^(pywin32, psutil^)
    )

    :: Run pywin32 post-install silently
    .venv\Scripts\python.exe -m pywin32_postinstall -install >nul 2>&1

    :: ----------------------------------------------------------------
    :: STEP 5 — Start backend (backend.py = merged file)
    :: ----------------------------------------------------------------
    echo [5/8] Starting backend server...

    :: Kill any stale process on the backend port
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING" 2^>nul') do (
        echo        Stopping old process on port %BACKEND_PORT%...
        taskkill /PID %%a /F >nul 2>&1
    )

    start "FlowTrack Backend" /MIN .venv\Scripts\python.exe backend.py --poll 2 --idle 300

    :: ----------------------------------------------------------------
    :: STEP 6 — Wait for backend to be ready (max 15 attempts)
    :: ----------------------------------------------------------------
    echo [6/8] Waiting for backend to be ready...
    set "ATTEMPTS=0"
    :check_backend
    set /a ATTEMPTS+=1
    if !ATTEMPTS! GTR 15 (
        echo [WARN] Backend did not respond in time. Continuing without it...
        goto :skip_backend
    )
    .venv\Scripts\python.exe -c "import socket; s=socket.socket(); s.settimeout(1); s.connect(('127.0.0.1',%BACKEND_PORT%)); s.close()" >nul 2>&1
    if !errorlevel! neq 0 (
        echo        Attempt !ATTEMPTS!/15 — waiting...
        ping -n 2 127.0.0.1 >nul
        goto :check_backend
    )
    echo [OK] Backend is LIVE on http://localhost:%BACKEND_PORT%
    set "BACKEND_READY=1"
) else (
    echo [3/8] Skipping Python setup
    echo [4/8] Skipping Python packages
    echo [5/8] Skipping backend
    echo [6/8] Skipping backend health check
)

:skip_backend

:: ----------------------------------------------------------------
:: STEP 7 — Install Node.js dependencies (first time only)
:: ----------------------------------------------------------------
echo [7/8] Checking Node.js dependencies...
if not exist "node_modules" (
    echo        Running npm install — this may take a minute...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed!
        pause & exit /b 1
    )
    echo [OK] npm packages installed
) else (
    echo [OK] node_modules already present
)

:: ----------------------------------------------------------------
:: STEP 8 — Launch frontend
:: ----------------------------------------------------------------
echo [8/8] Starting frontend dev server...
echo.
echo  ============================================================
if "!BACKEND_READY!"=="1" (
echo   Backend  : http://localhost:%BACKEND_PORT%  [RUNNING]
) else (
echo   Backend  : OFFLINE
)
echo   Frontend : http://localhost:%FRONTEND_PORT%  [STARTING...]
echo   Browser will open automatically!
echo   Press Ctrl+C to stop.
echo  ============================================================
echo.

call npm run dev -- --open --port %FRONTEND_PORT%

:: ----------------------------------------------------------------
:: Cleanup on exit
:: ----------------------------------------------------------------
echo.
echo  [INFO] Shutting down backend...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  [INFO] Done. Goodbye!
pause
