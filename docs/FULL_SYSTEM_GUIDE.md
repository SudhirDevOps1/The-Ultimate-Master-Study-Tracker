# 📖 FlowTrack Pro — Unified Production-Grade Technical Manual & Architecture Guide

Welcome to the definitive master guide for **FlowTrack Pro (v3.0.0)**. This document serves as the single source of truth for developers and end-users, providing a complete line-by-line analysis, system comparison, tracking specification, and step-by-step operational guide for both the **Live Web Application** and the **Standalone Windows Desktop Application**.

---

## 📑 Table of Contents
1. [Ecosystem & Connected Documentation Architecture](#1-ecosystem--connected-documentation-architecture)
2. [Web Application: Vercel Live + Local Python Backend Integration](#2-web-application-vercel-live--local-python-backend-integration)
   - [Architectural Design](#a-architectural-design)
   - [How Vercel Web App Connects with Local `backend.py`](#b-how-vercel-web-app-connects-with-local-backendpy)
   - [Running Python Backend (`backend.py`)](#c-running-python-backend-backendpy)
   - [Running Web App Locally](#d-running-web-app-locally)
3. [Desktop Application: Standalone Electron Native Suite](#3-desktop-application-standalone-electron-native-suite)
   - [Architectural Design](#a-architectural-design-1)
   - [Win32 Native Tracking (`win-tracker.exe`)](#b-win32-native-tracking-win-trackerexe)
   - [Dual-Layer Inactivity Engine](#c-dual-layer-inactivity-engine)
   - [Running & Packaging Desktop App (`.exe`)](#d-running--packaging-desktop-app-exe)
4. [Deep Tracking Specification & Log Logging Mechanism](#4-deep-tracking-specification--log-logging-mechanism)
   - [What FlowTrack Pro Tracks](#a-what-flowtrack-pro-tracks)
   - [How Activity Logs Are Created & Structured](#b-how-activity-logs-are-created--structured)
   - [Data Storage Engines & Schema](#c-data-storage-engines--schema)
5. [Web App vs Desktop App Feature Comparison Matrix](#5-web-app-vs-desktop-app-feature-comparison-matrix)
6. [Exclusive Desktop Modules Walkthrough](#6-exclusive-desktop-modules-walkthrough)
   - [PDF & Tesseract OCR Reader (`/study-workspace`)](#a-pdf--tesseract-ocr-reader-study-workspace)
   - [Sticky Notes Kanban Board (`/notes-board`)](#b-sticky-notes-kanban-board-notes-board)
   - [Today's Task Planner (`/today`)](#c-todays-task-planner-today)
   - [24-Hour Native Activity Timeline (`/app-tracking`)](#d-24-hour-native-activity-timeline-app-tracking)

---

## 1. Ecosystem & Connected Documentation Architecture

FlowTrack Pro documentation is structured into three clean, interconnected files:

```
                                ┌───────────────────────────────┐
                                │        Root README.md         │
                                │  (Master Repository Gateway)  │
                                └───────────────┬───────────────┘
                                                │
         ┌──────────────────────────────────────┴──────────────────────────────────────┐
         ▼                                                                             ▼
┌─────────────────────────────────────────────────┐                         ┌────────────────────────────────────┐
│         docs/FULL_SYSTEM_GUIDE.md               │ ◄─────────────────────► │       desktop-app/README.md        │
│ (Master Production Manual & Python Architecture)│                         │  (Windows Desktop App Specification│
└─────────────────────────────────────────────────┘                         └────────────────────────────────────┘
```

---

## 2. Web Application: Vercel Live + Local Python Backend Integration

### A. Architectural Design
The Web Application is designed with a **Hybrid Local-First Architecture**:
- **Frontend**: Built with React 19, Vite 6, and Tailwind CSS v4. Statically hosted on Vercel CDN ([study-tracker-app-pied.vercel.app](https://study-tracker-app-pied.vercel.app/)).
- **Primary Data Store**: Browser's local `IndexedDB` via Dexie.js. 100% functional without any server.
- **Optional Activity Daemon**: A local Python server (`backend.py`) running on `http://localhost:5001`.

```
[Vercel CDN / Browser]                                  [Local Machine]
https://study-tracker-app-pied.vercel.app              backend.py (Python Server)
  │                                                       │
  ├── Local Timer & IndexedDB  (100% In-Browser)          ├── win32gui / osascript / xdotool
  │                                                       │     └── Detects Active Window
  └── REST Fetch (every 5s) ────────────────────────────► └── CORS Enabled Endpoint
      GET http://localhost:5001/active-window                 http://localhost:5001/active-window
```

### B. How Vercel Web App Connects with Local `backend.py`
1. When you open the Vercel live link on your laptop, the browser executes the React client code.
2. The `useActivityDetection.ts` hook periodically sends an asynchronous `GET` request to `http://localhost:5001/active-window`.
3. Because `backend.py` includes `Access-Control-Allow-Origin: *` HTTP response headers, your browser allows the hosted Vercel site to read window status from your local `localhost:5001` daemon.
4. If `backend.py` is running, FlowTrack live web app shows an **"Active: VS Code"** badge. If Python is closed, it gracefully hides the badge without throwing errors.

### C. Running Python Backend (`backend.py`)
```bash
# Option 1: One-Click Launcher (Windows)
Double-click START.bat

# Option 2: Manual Execution
# Install required dependencies
pip install pywin32 psutil

# Start Python backend server on default port 5001
python backend.py

# Custom port or custom polling interval
python backend.py 5050 --poll 2
```

### D. Running Web App Locally
```bash
# 1. Install dependencies
npm install

# 2. Start Vite local server
npm run dev
# App will open at http://localhost:5173

# 3. Production Build
npm run build
```

---

## 3. Desktop Application: Standalone Electron Native Suite

### A. Architectural Design
The Desktop App (`/desktop-app`) is a **100% Standalone Windows Application** built with Electron 43. It requires **zero Python**, **zero Node installation for users**, and **zero external servers**.

### B. Win32 Native Tracking (`win-tracker.exe`)
Instead of invoking Python scripts via child processes, Electron executes an embedded precompiled C# binary (`win-tracker.exe`):
- Uses Win32 APIs: `GetForegroundWindow()`, `GetWindowText()`, `GetWindowThreadProcessId()`, and `GetModuleFileNameEx()`.
- Latency: **$<5\text{ ms}$** response time.
- Excludes self-process names (`flowtrackpro.exe`, `electron.exe`).

### C. Dual-Layer Inactivity Engine
```
┌──────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: Win32 Kernel API (Hardware-Level System Input)                  │
│  - Polls Windows GetLastInputInfo via Electron IPC                       │
│  - Tracks Mouse, Keyboard, Touchpad, Stylus, Gamepad                     │
│  - Works globally even when FlowTrack is minimized to System Tray        │
├──────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: In-App DOM Event Watcher (Instant Reaction Engine)              │
│  - Captures instant mousemove, keydown, scroll, wheel events             │
│  - Latency: 0ms — instant auto-resume on user movement                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### D. Running & Packaging Desktop App (`.exe`)
```bash
cd desktop-app

# Install dependencies
npm install

# Live Development Mode (Vite + Electron)
npm run electron:dev

# Package Standalone Windows .exe Installer
npm run electron:build
# Output: desktop-app/dist-electron/FlowTrackPro Setup 1.0.0.exe
```

---

## 4. Deep Tracking Specification & Log Logging Mechanism

### A. What FlowTrack Pro Tracks

| Category | Tracked Information | Source |
|:---------|:--------------------|:-------|
| 🪟 **Active Application** | Process name (e.g., `Code.exe`, `chrome.exe`, `vlc.exe`) | Win32 API / `psutil` |
| 🏷️ **Window Title** | Complete window caption (e.g., `App.tsx - FlowTrack Pro - Visual Studio Code`) | `win32gui.GetWindowText` |
| 🌐 **Web Tab Domains** | Extracted domain (`youtube.com`, `github.com`, `chatgpt.com`, `stackoverflow.com`, `leetcode.com`) | Title regex parsing |
| ⏱️ **Duration** | Start timestamp, end timestamp, total active seconds | High-resolution clock |
| 💤 **Inactivity / Idle** | Seconds of hardware idle time | `GetLastInputInfo` |

### B. How Activity Logs Are Created & Structured

#### 1. Daily JSON Activity Log Format (`%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json`)
Every time you switch application windows or focus a new web tab, a log entry is created:

```json
[
  {
    "appName": "Code.exe",
    "title": "useTimer.ts - FlowTrack - Visual Studio Code",
    "durationSeconds": 1420,
    "startTime": "2026-07-21T14:30:00.000Z",
    "date": "2026-07-21",
    "hour": 14,
    "minute": 30
  },
  {
    "appName": "chrome.exe",
    "title": "React 19 Documentation - Google Chrome",
    "durationSeconds": 680,
    "startTime": "2026-07-21T14:53:40.000Z",
    "date": "2026-07-21",
    "hour": 14,
    "minute": 53
  }
]
```

#### 2. CSV Log Export
Both Python backend and Desktop App support exporting logs to spreadsheet-ready CSV files via native save dialogs:
```csv
Date,App,Window Title,Duration (seconds),Duration (readable),Start Time,Hour
"2026-07-21","Code.exe","useTimer.ts - FlowTrack",1420,"23m 40s","2026-07-21T14:30:00.000Z",14
```

### C. Data Storage Engines & Schema

```
                   ┌──────────────────────────────────────────────┐
                   │               USER DATA STORE                │
                   └──────────────────────┬───────────────────────┘
                                          │
         ┌────────────────────────────────┴────────────────────────────────┐
         ▼                                                                 ▼
┌──────────────────────────────────────────┐                   ┌──────────────────────────────────────────┐
│      IndexedDB Database (Dexie.js)       │                   │   SQLite / JSON Activity Log Files       │
│  - Study Sessions (planned vs actual)    │                   │  - Daily App Usage Timelines             │
│  - Subjects & Color Customizations       │                   │  - Web Tab History Logs                  │
│  - User Profile, XP, Ranks & Achievements│                   │  - %AppData%\FlowTrackPro\activity-log\  │
└──────────────────────────────────────────┘                   └──────────────────────────────────────────┘
```

---

## 5. Web App vs Desktop App Feature Comparison Matrix

| Feature / Module | 🌐 Web App (Vercel Live) | 🌐 Web App + Python Backend | 🖥️ Desktop App (Electron .exe) |
| :--- | :---: | :---: | :---: |
| **Execution Host** | Modern Browser / PWA | Browser + Python Daemon | Native Windows App (.exe) |
| **Installation Requirement** | Zero Install | Python 3.8+ + pywin32 | Zero Python Needed |
| **Data Storage Location** | Browser IndexedDB | IndexedDB + `app_tracker.db` | `%AppData%\FlowTrackPro` |
| **Navigable Pages** | 10 Pages | 10 Pages | **14 Pages** (4 Desktop Exclusive) |
| **Active App Tracking** | ❌ | ✅ Via `localhost:5001` | ✅ Native Win32 (`win-tracker.exe`) |
| **System Tray Background Run** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **Dual-Layer Inactivity Engine** | DOM Events Only | DOM Events Only | ✅ **Desktop Exclusive** (Win32 + DOM) |
| **Auto-Resume on Mouse Move** | Manual | Manual | ✅ **Desktop Exclusive** |
| **Today's Tasks Dashboard (`/today`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **PDF & Tesseract OCR Reader (`/study-workspace`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **Sticky Notes Kanban Board (`/notes-board`)** | ❌ | ❌ | ✅ **Desktop Exclusive** (Hindi Fonts & PNG Export) |
| **24-Hr Gantt App Timeline (`/app-tracking`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |

---

## 6. Exclusive Desktop Modules Walkthrough

### A. PDF & Tesseract OCR Reader (`/study-workspace`)
- Open local textbook PDFs (`pdfjs-dist`).
- Execute in-browser OCR via `tesseract.js` WebAssembly to convert scanned textbook images into selectable text offline.
- Built-in Text-to-Speech (TTS) voice reader (`window.speechSynthesis`).

### B. Sticky Notes Kanban Board (`/notes-board`)
- Kanban sticky notes board with customizable color tags and Hindi typography support (*Rozha One*, *Poppins*, *Kurale*, *Yatra One*).
- One-click board export to PNG image (`html2canvas`).

### C. Today's Task Planner (`/today`)
- Daily focus progress ring calculating % of daily target hours completed.
- Status buckets for Active, Completed, Planned, and Paused sessions.

### D. 24-Hour Native Activity Timeline (`/app-tracking`)
- Real-time Gantt timeline visualization of application usage per hour.
- Web tabs monitor categorizing web domains (YouTube, GitHub, StackOverflow, ChatGPT, LeetCode).
- App blocking configuration panel.

---

## 🔗 Connected Documentation Links

- 🏠 **Master Entry Point**: [Root README.md](../README.md)
- 🖥️ **Desktop App Standalone Manual**: [desktop-app/README.md](../desktop-app/README.md)

---
*© 2026 FlowTrack Pro Ecosystem · MIT License.*
