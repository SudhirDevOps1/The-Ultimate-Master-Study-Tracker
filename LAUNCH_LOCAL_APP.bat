@echo off
title FlowTrack Pro - Local Desktop App
echo ========================================================
echo   Launching FlowTrack Pro (Local-First Desktop App)
echo ========================================================
echo.

set "EXE_PATH=%~dp0desktop-app\dist-electron\win-unpacked\FlowTrackPro.exe"

if exist "%EXE_PATH%" (
    echo [OK] Found FlowTrack Pro executable.
    echo Starting app...
    start "" "%EXE_PATH%"
    exit /b 0
) else (
    echo [INFO] Unpacked executable not found. Checking installer...
    set "SETUP_PATH=%~dp0desktop-app\dist-electron\FlowTrackPro Setup 0.4.0.exe"
    if exist "%SETUP_PATH%" (
        echo Starting FlowTrack Pro Setup...
        start "" "%SETUP_PATH%"
        exit /b 0
    ) else (
        echo [ERROR] App executable not found.
        echo Please run: cd desktop-app ^&^& npm run electron:build
        pause
        exit /b 1
    )
)
