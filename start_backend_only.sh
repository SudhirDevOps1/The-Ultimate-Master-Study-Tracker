#!/bin/bash

# =====================================================================
# FlowTrack Pro - Backend Only Launcher (macOS / Linux)
# =====================================================================
set -e

BACKEND_PORT=5001

echo ""
echo "============================================================"
echo "  FlowTrack Pro - Backend Only Launcher (macOS/Linux)"
echo "============================================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is not installed."
    exit 1
fi

python3 --version

# Create virtual environment if missing
if [ ! -d "venv" ]; then
    echo "[1/3] Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

echo "[2/3] Installing Python dependencies..."
pip install --upgrade pip setuptools wheel > /dev/null 2>&1
pip install psutil

if [[ "$OSTYPE" == "darwin"* ]]; then
    pip install pyobjc > /dev/null 2>&1 || true
fi

echo "[3/3] Starting backend.py on port ${BACKEND_PORT}..."
python3 backend.py ${BACKEND_PORT}
