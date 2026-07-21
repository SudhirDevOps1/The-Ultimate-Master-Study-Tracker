# 📖 FlowTrack Pro — Unified Production-Grade Technical Manual & Architecture Guide

Welcome to the definitive master guide for **FlowTrack Pro (v3.1.0)**. This document serves as the single source of truth for developers and end-users, providing a complete line-by-line analysis, system comparison, tracking specification, and step-by-step operational guide structured cleanly into **3 Operational Categories**.

---

## 📑 Table of Contents
1. [The 3 Operational Modes of FlowTrack Pro](#1-the-3-operational-modes-of-flowtrack-pro)
2. [Category 1: Web App (No Backend / Serverless PWA)](#2-category-1-web-app-no-backend--serverless-pwa)
3. [Category 2: Web App + Python Backend (`backend.py`)](#3-category-2-web-app--python-backend-backendpy)
4. [Category 3: Standalone Desktop App (Electron Windows `.exe`)](#4-category-3-standalone-desktop-app-electron-windows-exe)
5. [3-Category Comprehensive Comparison Matrix](#5-3-category-comprehensive-comparison-matrix)
6. [Deep Tracking Specification & Log Logging Mechanism](#6-deep-tracking-specification--log-logging-mechanism)
7. [Full 14 Pages Feature Breakdown](#7-full-14-pages-feature-breakdown)

---

## 1. The 3 Operational Modes of FlowTrack Pro

FlowTrack Pro can be used in **3 distinct operational categories** depending on your platform preferences, privacy requirements, and installation choices:

```
                                    ┌─────────────────────────────────────────┐
                                    │             FLOWTRACK PRO               │
                                    └────────────────────┬────────────────────┘
                                                         │
         ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
         ▼                                               ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│           CATEGORY 1            │             │           CATEGORY 2            │             │           CATEGORY 3            │
│       Web App (No Backend)      │             │    Web App + Python Backend     │             │     Standalone Desktop App      │
│  - Live on Vercel CDN           │             │  - Browser UI + backend.py      │             │  - Standalone Electron .exe     │
│  - 100% In-Browser IndexedDB    │             │  - OS Active Window Tracking    │             │  - Win32 Kernel Tracking        │
│  - Zero Install & Zero Signup   │             │  - SQLite Database Sync         │             │  - System Tray Minimization     │
└─────────────────────────────────┘             └─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 2. Category 1: Web App (No Backend / Serverless PWA)

### Overview
Category 1 is the **zero-install, instant-access web version** hosted on Vercel ([the-ultimate-master-study-tracker.vercel.app](https://the-ultimate-master-study-tracker.vercel.app/)).

- **Target Audience**: Users who want to study immediately on any device (Laptop, Mobile, Tablet) without installing any software or backend servers.
- **Data Storage**: Stored 100% inside your browser's local `IndexedDB` via Dexie.js.
- **Privacy Standard**: 100% Local. Zero cloud uploads.

### How to Run Locally (Category 1)
```bash
# Clone repository
git clone https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git
cd The-Ultimate-Master-Study-Tracker

# Install Node dependencies
npm install

# Start Vite local development server
npm run dev
# App opens at http://localhost:5173
```

---

## 3. Category 2: Web App + Python Backend (`backend.py`)

### Overview
Category 2 combines the **Vercel/Local Web App UI** with a **Local Python Background Daemon (`backend.py`)**.

- **Target Audience**: Web users who want real-time OS-level active window detection, browser tab domain tracking, and process logs while using the Web App interface.
- **Data Storage**: Browser IndexedDB + Local SQLite Database (`app_tracker.db`).
- **Connection Mechanics**: The Web App frontend periodically polls `http://localhost:5001/active-window` via CORS-enabled REST endpoints.

```
[Web Browser / Vercel Live App]                         [Local Machine]
https://the-ultimate-master-study-tracker.vercel.app   backend.py (Python Server @ Port 5001)
  │                                                       │
  ├── Browser Study Timer & IndexedDB                     ├── Detects Focused App via win32gui/psutil
  │                                                       │
  └── Polls REST API (every 5s) ────────────────────────► └── REST Endpoint (/active-window)
      GET http://localhost:5001/active-window                 Returns: { "title": "VS Code", "process": "Code.exe" }
```

### How to Run (Category 2)

#### 🪟 Windows (.bat Launchers):
- **`START.bat`**: One-click setup (checks Node, Python, creates `.venv`, starts backend server & opens Web App in browser).
- **`start_backend_only.bat`**: Launches only the Python backend service on port `5001`.

#### 🍎 macOS / Linux (.sh Launchers):
- **`setup.sh`**: Cross-platform bash setup script (`chmod +x setup.sh && ./setup.sh`).
- **`start_backend_only.sh`**: Backend daemon launcher (`chmod +x start_backend_only.sh && ./start_backend_only.sh`).

#### 🛠️ Manual Execution:
```bash
pip install psutil pywin32
python backend.py
```

---

## 4. Category 3: Standalone Desktop App (Electron Windows `.exe`)

### Overview
Category 3 is a **100% Standalone Windows Executable** built with Electron 43.

- **Target Audience**: Windows users who want a dedicated desktop application that minimizes to the System Tray, runs background timers without browser throttling, and requires **zero Python**.
- **Data Storage**: `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json`.
- **Native Engine**: Embedded C# Win32 binary (`win-tracker.exe`) for $<5\text{ ms}$ foreground app detection.

### How to Run & Package (Category 3)
```bash
cd desktop-app

# Install desktop dependencies
npm install

# Live Development Mode (Vite + Electron)
npm run electron:dev

# Package Windows Setup Installer (.exe)
npm run electron:build
# Output: desktop-app/dist-electron/FlowTrackPro Setup 1.0.0.exe
```

---

## 5. 3-Category Comprehensive Comparison Matrix

| Feature / Capability | 🌐 Category 1: Web App (No Backend) | 🐍 Category 2: Web App + Python Backend | 🖥️ Category 3: Desktop App (Electron) |
| :--- | :---: | :---: | :---: |
| **Execution Host** | Web Browser / PWA | Web Browser + Local Python Server | Windows Desktop App (.exe) |
| **Installation Required** | Zero Install | Python 3.8+ Setup | Double-click `.exe` installer |
| **Data Storage Engine** | Browser IndexedDB | IndexedDB + SQLite `app_tracker.db` | `%AppData%\FlowTrackPro` |
| **Navigable Pages** | 14 Pages | 14 Pages | 14 Pages |
| **Study Target Timer** | Delta Clock (`Date.now()`) | Delta Clock (`Date.now()`) | Delta Clock + Background Priority |
| **Pomodoro Engine** | Timestamp-Based | Timestamp-Based | Timestamp-Based (Freeze-Proof) |
| **AI Study Coach** | Ollama / WebLLM | Ollama / WebLLM | Ollama / WebLLM |
| **Active App Tracking** | ❌ | ✅ Via `http://localhost:5001` | ✅ Native Win32 (`win-tracker.exe` $<5\text{ ms}$) |
| **Web Tab Extractor** | ❌ | ✅ Domain Extractor | ✅ Domain Extractor |
| **System Tray Background Run** | ❌ | ❌ | ✅ **Category 3 Exclusive** |
| **Dual-Layer Hardware Inactivity** | DOM Events | DOM Events | ✅ **Category 3 Exclusive** (Win32 + DOM) |
| **Auto-Resume on Mouse Move** | Manual | Manual | ✅ **Category 3 Exclusive** |
| **PDF & Tesseract OCR Reader** | ✅ WASM OCR | ✅ WASM OCR | ✅ WASM OCR |
| **Sticky Notes Kanban Board** | ✅ Hindi Fonts & PNG | ✅ Hindi Fonts & PNG | ✅ Hindi Fonts & PNG |
| **Today's Tasks Dashboard** | ✅ Progress Ring | ✅ Progress Ring | ✅ Progress Ring |
| **CSV Activity Export** | Browser Download | HTTP Stream Download | Native OS Save Dialog CSV |

---

## 6. Deep Tracking Specification & Log Logging Mechanism

### What FlowTrack Pro Tracks (Category 2 & 3)
- **Active Process Name**: `Code.exe`, `chrome.exe`, `vlc.exe`.
- **Window Title**: Complete window text caption.
- **Web Tab Domains**: Extracted domains (`youtube.com`, `github.com`, `stackoverflow.com`, `chatgpt.com`, `leetcode.com`).
- **Duration & Timestamps**: ISO start timestamp, end timestamp, active duration seconds.

---

## 7. Full 14 Pages Feature Breakdown

1. 🏠 **Dashboard (`/dashboard`)**: Focus score, streak heatmap, weekly summaries, active app badge.
2. 📅 **Today's Tasks (`/today`)**: Daily planner, progress ring, goal completion percentage.
3. ⏱️ **Timer (`/timer`)**: Target timer, Pomodoro center, Picture-in-Picture mode, Voice commands.
4. 📖 **Study Workspace (`/study-workspace`)**: PDF reader, Tesseract WASM OCR text scanner, Text-to-Speech.
5. 📝 **Notes Board (`/notes-board`)**: Kanban sticky notes with Hindi fonts & PNG board export.
6. 🖥️ **App Tracking (`/app-tracking`)**: 24-hr Gantt usage timeline, web tab extractor, app blocker.
7. 📊 **Analytics (`/analytics`)**: Recharts multi-axis performance trends, subject attachment metrics.
8. 🗓️ **History (`/history`)**: Filterable session logs, session cloning, date shifting tools.
9. 📚 **Subjects (`/subjects`)**: Subject color tagger & weekly target hours.
10. 🗺️ **Calendar (`/calendar`)**: Visual monthly & yearly drag-and-drop calendar.
11. 🏆 **Achievements (`/achievements`)**: Rank titles & badge unlocking milestones.
12. ⚙️ **Settings (`/settings`)**: Theme customizer, goal settings, JSON & CSV backups.
13. 📖 **Guide (`/guide`)**: In-app operational guide.
14. 🤖 **AI Assistant (`/ai`)**: On-device local AI study coach (Ollama / WebLLM).

---

## 🔗 Bound Documentation Links

- 🏠 **Master Entry Point**: [Root README.md](../README.md)
- 🌐 **Web App Edition Manual**: [web-app/README.md](../web-app/README.md)
- 🖥️ **Desktop App Edition Manual**: [desktop-app/README.md](../desktop-app/README.md)

---
*© 2026 FlowTrack Pro Ecosystem · MIT License.*
