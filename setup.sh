#!/bin/bash

# =====================================================================
# FlowTrack Pro - Cross-Platform Setup Script (macOS/Linux)
# =====================================================================
# This script automatically:
#   1. Checks for Python 3.9+
#   2. Creates virtual environment
#   3. Installs all dependencies
#   4. Installs Node.js dependencies
#   5. Provides instructions for starting
# =====================================================================

set -e

echo ""
echo "============================================================"
echo "  FlowTrack Pro - Cross-Platform Setup"
echo "============================================================"
echo ""

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is not installed."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "On macOS, install Python with: brew install python3"
    else
        echo "On Linux, install Python with: sudo apt-get install python3 python3-venv python3-pip"
    fi
    exit 1
fi

python3 --version

echo ""

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "[1/4] Creating Python virtual environment..."
    python3 -m venv venv
    echo "[OK] Virtual environment created."
else
    echo "[1/4] Virtual environment already exists."
fi

echo ""

# Activate virtual environment
source venv/bin/activate

echo "[2/4] Upgrading pip, setuptools..."
pip install --upgrade pip setuptools wheel > /dev/null 2>&1

echo "[3/4] Installing Python dependencies..."
pip install psutil

# Platform-specific setup
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "[3.5/4] macOS: Installing optional dependencies..."
    pip install pyobjc > /dev/null 2>&1 || echo "[INFO] pyobjc optional (native osascript will be used)"
else
    # Linux
    echo "[3.5/4] Linux: Checking for system dependencies..."
    if ! command -v xdotool &> /dev/null; then
        echo "[WARNING] xdotool not installed. Install with: sudo apt-get install xdotool xprintidle"
    fi
fi

echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[WARNING] Node.js is not installed."
    echo "Install from https://nodejs.org/ for frontend support."
else
    node --version
    echo "[4/4] Installing Node.js dependencies..."
    npm install
fi

echo ""
echo "============================================================"
echo "  Setup Complete!"
echo "============================================================"
echo ""
echo "To start the application:"
echo "  1. Activate Python environment: source venv/bin/activate"
echo "  2. Start backend: python activity_tracker.py"
echo "  3. In another terminal: npm run dev"
echo ""
echo "Or run both: bash start_local.sh"
echo ""
