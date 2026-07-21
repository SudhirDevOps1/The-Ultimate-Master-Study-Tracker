@echo off
setlocal enabledelayedexpansion
title FlowTrack Pro - Backend Only Launcher
color 0A

echo ============================================================
echo      FlowTrack Pro - Backend Only Smart Launcher
echo ============================================================
echo.

set "BACKEND_PORT=5001"

:: Change directory safely
cd /d "%~dp0"

:: Check Python
echo [1/4] Checking Python...
set "PYTHON_OK=0"
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_OK=1"
    for /f "delims=" %%i in ('python --version') do echo [OK] %%i
) else (
    echo [ERROR] Python not found! Please install Python.
    pause
    exit /b 1
)

:: Setup Python venv + deps
if "%PYTHON_OK%"=="1" (
    echo [2/4] Setting up Python environment...

    if not exist ".venv" (
        echo Creating virtual environment...
        python -m venv .venv
        if !errorlevel! neq 0 (
            echo [ERROR] Failed to create venv.
            pause
            exit /b 1
        )
    )

    echo Installing dependencies...
    .venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
    .venv\Scripts\pip.exe install pywin32 psutil
    if !errorlevel! neq 0 (
        echo [WARN] Some Python packages failed to install.
    ) else (
        echo [OK] Python packages ready
    )

    :: Start Backend
    echo [3/4] Starting backend server...

    :: Kill any existing backend on the port
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING" 2^>nul') do (
        echo Stopping old process on port %BACKEND_PORT%...
        taskkill /PID %%a /F >nul 2>&1
    )

    :: Start backend in active window (will keep console window open for tracking output)
    echo.
    echo ============================================================
    echo  FlowTrack Backend is starting!
    echo  Backend is listening on: http://localhost:%BACKEND_PORT%
    echo  Press Ctrl+C to stop the backend tracker.
    echo ============================================================
    echo.

    .venv\Scripts\python.exe backend.py --poll 2 --idle 300
)

pause
