# 📑 FlowTrack Pro — Enterprise Master Documentation & Integration Manual

Welcome to the definitive production-grade documentation suite for **FlowTrack Pro**. This master manual binds the **Live Web Application** and the **Standalone Windows Desktop Application** into an interconnected, fully cross-referenced technical guide.

---

## 🔗 Connected Documentation Graph

All documentation artifacts within this codebase form a closed, bidirectional navigation graph:

```
                              ┌───────────────────────────────┐
                              │        Root README.md         │
                              │  (Ecosystem Overview & Entry) │
                              └───────────────┬───────────────┘
                                              │
         ┌────────────────────────────────────┴────────────────────────────────────┐
         ▼                                                                         ▼
┌──────────────────────────────────────────┐                   ┌──────────────────────────────────────────┐
│        COMPARISON_AND_GUIDE.md           │ ◄───────────────► │          desktop-app/README.md           │
│  (Deep Architecture & Python Integration)│                   │   (Standalone Electron Desktop Manual)   │
└──────────────────────────────────────────┘                   └──────────────────────────────────────────┘
```

---

## 🌟 Executive System Summary

**FlowTrack Pro (v3.0.0)** is a privacy-first, offline-capable study ecosystem built with React 19, Vite 6, Tailwind CSS v4, and Dexie.js (IndexedDB).

The codebase supports two distinct runtime environments:

1. 🌐 **Web Application (Root `/`)**: Hosted statically on Vercel CDN ([study-tracker-app-pied.vercel.app](https://study-tracker-app-pied.vercel.app/)). Runs 100% in-browser. Optional integration with `backend.py` Python daemon for active window tracking on Windows/macOS/Linux.
2. 🖥️ **Desktop Application (`/desktop-app`)**: A native Windows Electron 43 package. Requires zero Python installation, using a embedded C# Win32 binary (`win-tracker.exe`) for zero-latency active app tracking, system tray minimization, dual-layer hardware inactivity detection, and an offline PDF OCR workspace.

---

## 📊 Comprehensive Matrix: Web App vs. Desktop App

| Capability / Module | 🌐 Web App (Browser / Vercel) | 🌐 Web App + Python Backend (`backend.py`) | 🖥️ Standalone Desktop App (Electron) |
| :--- | :---: | :---: | :---: |
| **Execution Host** | Modern Web Browser | Web Browser + Local HTTP Daemon | Windows Desktop App (.exe) |
| **Installation Requirement** | Zero Install | Node.js + Python 3.8+ | Zero Python Needed (Electron Setup) |
| **Data Storage Location** | Browser IndexedDB | IndexedDB + SQLite DB (`app_tracker.db`) | `%AppData%\FlowTrackPro` |
| **Total Navigable Pages** | 10 Pages | 10 Pages | **14 Pages** (Includes 4 Desktop Exclusive) |
| **Foreground App Tracking** | ❌ Not available | ✅ Enabled via `http://localhost:5001` | ✅ Native Win32 (`win-tracker.exe` $<5\text{ ms}$) |
| **System Tray Background Run** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **Dual-Layer Inactivity Engine** | DOM Events Only | DOM Events Only | ✅ **Desktop Exclusive** (Win32 Kernel + DOM) |
| **Auto-Resume on Mouse Move** | Manual Click Required | Manual Click Required | ✅ **Desktop Exclusive** (Auto-resumes on movement) |
| **Today's Tasks Dashboard (`/today`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **PDF & Tesseract OCR Reader (`/study-workspace`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **Sticky Notes Kanban Board (`/notes-board`)** | ❌ | ❌ | ✅ **Desktop Exclusive** (Hindi Fonts & PNG Export) |
| **24-Hr Gantt App Timeline (`/app-tracking`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **CSV Activity Export** | Standard Export | HTTP CSV Stream | Native Windows Save Dialog CSV |

---

## 🌐 Web Application — Local Setup & Python Backend Integration

### 1. Standard In-Browser Execution (Zero Python Needed)
```bash
# Clone the repository
git clone https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git
cd The-Ultimate-Master-Study-Tracker

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
- Open `http://localhost:5173`. Everything runs 100% locally inside your browser's IndexedDB.

### 2. Optional Python Backend Mode (`backend.py`)
If you want **active desktop window tracking** inside your browser edition:

```bash
# Option A: One-Click Windows Automated Launcher
Double-click START.bat

# Option B: Manual Execution
# Install Python dependencies
pip install pywin32 psutil

# Run merged Python backend server (Default Port: 5001)
python backend.py
```

- **How `backend.py` Works**:
  - Starts a multi-threaded HTTP server on `http://localhost:5001`.
  - Endpoint `/active-window`: Polls active window title using `win32gui` (Windows), `osascript` (macOS), or `xdotool` (Linux).
  - Endpoint `/config`: Manages application process blocklists during strict study hours.
  - Automatically logs window duration into `app_tracker.db` SQLite database.

---

## 🖥️ Desktop Application — Architecture & Usage Guide

The Desktop App is completely self-contained within `/desktop-app`.

### 1. Developer Setup & Live Execution
```bash
# Navigate to desktop app directory
cd desktop-app

# Install dependencies
npm install

# Launch Electron + Vite in Live Reload Development Mode
npm run electron:dev
```

### 2. Compiling Standalone `.exe` Installer
```bash
npm run electron:build
```
- **Installer Package**: `desktop-app/dist-electron/FlowTrackPro Setup 1.0.0.exe`
- **Portable Folder**: `desktop-app/dist-electron/win-unpacked/FlowTrackPro.exe`

---

## 🔬 Line-by-Line Code Architecture Deep-Dive

### 1. Hardware Delta-Sync Timer (`src/hooks/useTimer.ts`)
Standard `setInterval` drift is eliminated by calculating remaining seconds against the hardware clock:

$$\text{Elapsed Time} = \text{isPaused} ? \text{savedElapsed} : \left( \text{Date.now()} - \text{startedAtMs} \right)$$

- **State Checkpointing**: Automatically updates IndexedDB every second.

### 2. Dual-Layer Hybrid Inactivity Detector (`desktop-app/src/hooks/useInactivityDetector.ts`)
- **Layer 1 (Win32 Kernel API)**: Queries `GetLastInputInfo` via PowerShell IPC to check hardware-level input. Works when minimized to System Tray.
- **Layer 2 (Instant DOM Watcher)**: Monitors `mousemove`, `keydown`, `scroll`, and `touchstart` with $0\text{ ms}$ latency.
- **Auto-Resume**: Automatically resumes paused timer as soon as user returns.

### 3. Native Win32 Active App Tracker (`desktop-app/electron.js`)
- Executes precompiled `win-tracker.exe` C# helper binary.
- Reads `HWND` foreground window title & process name in $<5\text{ ms}$.
- Filters out self-process names (`flowtrackpro.exe`, `electron.exe`).
- Auto-saves activity logs daily into `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json`.

---

## 📑 Bound Documentation Reference Index

- 🏠 **Master Ecosystem Overview**: [README.md](README.md)
- 🖥️ **Desktop App Standalone Manual**: [desktop-app/README.md](desktop-app/README.md)
- ⚙️ **Vercel Build Configuration**: [vercel.json](vercel.json)

---
*© 2026 FlowTrack Pro Ecosystem · MIT License.*
