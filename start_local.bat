@echo off
title FlowTrack - Local Workspace Launcher
echo ===================================================
echo        FlowTrack Local Workspace Launcher
echo ===================================================
echo.

:: Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your system PATH.
    echo FlowTrack requires Node.js to run the web application.
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Python is not installed or not in your PATH.
    echo Local active window tracking will be disabled.
    echo [INFO] This is OPTIONAL - FlowTrack works fully without it.
    goto start_node
)

echo [INFO] Python detected. Setting up virtual environment...
if not exist .venv (
    echo [INFO] Creating Python virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [WARNING] Failed to create virtual environment.
        echo [INFO] Skipping activity tracker - FlowTrack will work without it.
        goto start_node
    )
)

echo [INFO] Activating virtual environment ^& installing dependencies...
call .venv\Scripts\activate.bat

pip install --quiet --upgrade pywin32 psutil 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Failed to install Python dependencies (pywin32, psutil).
    echo [INFO] Active window tracking requires these packages.
    echo [INFO] You can install them manually: pip install pywin32 psutil
    echo [INFO] Continuing without activity tracker...
    goto start_node
)

echo [INFO] Starting Local Activity Tracker in background on port 5001...
echo [INFO] This is OPTIONAL - provides active window tracking only.
:: Explicitly execute python inside the virtual environment to ensure libraries are loaded
start "FlowTrack Activity Tracker" cmd /c ".venv\Scripts\python.exe activity_tracker.py"

:start_node
echo.
echo [INFO] Checking Node.js dependencies...
if not exist node_modules (
    echo [INFO] Installing Node packages...
    npm install
)

echo [INFO] Starting Vite development server...
echo [INFO] FlowTrack will open in your default browser shortly.
start "" http://localhost:5173
npm run dev

pause
