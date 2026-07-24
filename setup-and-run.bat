@echo off
title FlowTrack Pro - Automated Setup & Launch Tool
echo ===================================================
echo   🖥️  FlowTrack Pro: Setup and Launch Assistant
echo ===================================================
echo.
echo [1/3] Checking Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed! Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo [2/3] Installing dependencies for Desktop App (npm install)...
cd desktop-app
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install desktop app dependencies.
    pause
    exit /b
)
cd ..

echo [3/3] Verifying Desktop Environment Assets...
if not exist "desktop-app\win-tracker.exe" (
    echo [WARNING] win-tracker.exe is missing from desktop-app directory!
) else (
    echo [SUCCESS] win-tracker.exe verified.
)

echo.
echo ===================================================
echo Setup complete! What would you like to do?
echo ===================================================
echo 1. Start FlowTrack Pro Desktop (Dev Mode)
echo 2. Package / Build Desktop App (Production Installer)
echo 3. Exit
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo Starting FlowTrack Pro Desktop...
    cd desktop-app
    npm run electron:dev
) else if "%choice%"=="2" (
    echo Building production app package...
    cd desktop-app
    npm run electron:build
) else (
    echo Exiting. Goodbye!
)
