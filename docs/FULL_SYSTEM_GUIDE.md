# 📖 FlowTrack Pro — Master Technical Architecture & System Guide

> **Version**: 7.2.0 | **Last Updated**: 2026-08-01 (v7.2.0 Production Release)

Welcome to the official technical manual for **FlowTrack Pro (v7.2.0)**. This document specifies the exact implementation details, architectural design, data storage mechanisms, and operational modes across **3 Operational Categories**.

---

## 📑 Table of Contents
1. [Operational Modes Overview](#1-operational-modes-overview)
2. [Category 1: Web App (Serverless PWA)](#2-category-1-web-app-serverless-pwa)
3. [Category 2: Web App + Python Backend](#3-category-2-web-app--python-backend)
4. [Category 3: Standalone Desktop App (Electron Windows/macOS)](#4-category-3-standalone-desktop-app-electron-windowsmacos)
5. [Comparative Feature Matrix](#5-comparative-feature-matrix)
6. [Win32 & Webview Tracking Specification](#6-win32--webview-tracking-specification)
7. [Full Application Navigation & Page Breakdown](#7-full-application-navigation--page-breakdown)

---

## 1. Operational Modes Overview

FlowTrack Pro is engineered to run seamlessly across **3 operational categories** depending on your platform and tracking requirements:

```
                                    ┌─────────────────────────────────────────┐
                                    │             FLOWTRACK PRO               │
                                    └────────────────────┬────────────────────┘
                                                         │
         ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
         ▼                                               ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│           CATEGORY 1            │             │           CATEGORY 2            │             │           CATEGORY 3            │
│       Web App (Serverless PWA)  │             │    Web App + Python Backend     │             │     Standalone Desktop App      │
│  - Live on Vercel CDN           │             │  - Browser UI + backend.py      │             │  - Standalone Electron .exe     │
│  - 100% In-Browser IndexedDB    │             │  - OS Active Window Tracking    │             │  - Kernel Win32 C# Tracking     │
│  - Zero Install & Zero Signup   │             │  - Local SQLite Database Sync   │             │  - Password Vault & AutoUpdate  │
└─────────────────────────────────┘             └─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 2. Category 1: Web App (Serverless PWA)

### Overview
Category 1 is the **zero-install, instant-access web version** hosted on Vercel ([the-ultimate-master-study-tracker.vercel.app](https://the-ultimate-master-study-tracker.vercel.app/)).

- **Target Platforms**: Any modern web browser (Chrome, Edge, Safari, Firefox) on Desktop, Mobile, or Tablet.
- **Data Storage Engine**: Stored 100% locally inside your browser's `IndexedDB` via Zustand state persistence and Dexie.js.
- **Privacy Standard**: 100% Local. Zero telemetry, zero external server tracking.

### How to Run Locally (Category 1)
```bash
git clone https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git
cd The-Ultimate-Master-Study-Tracker
npm install
npm run dev
# App opens at http://localhost:5173
```

---

## 3. Category 2: Web App + Python Backend (`backend.py`)

### Overview
Category 2 pairs the **Web App UI** with a **Local Python Daemon (`backend.py`)**.

- **Target Platform**: Windows 10/11, macOS, or Linux running Python 3.8+.
- **Data Storage**: Browser IndexedDB + Local SQLite Database (`app_tracker.db`).
- **Connection Mechanics**: The Web App frontend periodically polls `http://localhost:5001/active-window` via REST endpoints.

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
```bash
# Start backend service
python backend.py

# In another terminal run Web UI
npm run dev
```

---

## 4. Category 3: Standalone Desktop App (Electron)

### Overview
Category 3 is a **100% Standalone Desktop Application** built with Electron 43.

- **Target Platform**: Windows 10/11 (64-bit) and macOS.
- **Data Storage**: `%AppData%\FlowTrack Pro\activity-log\YYYY-MM-DD.json`.
- **Native Tracking Engine**: Embedded C# Win32 helper (`win-tracker.exe`) for fast foreground app detection.
- **Password Vault**: Local XOR encrypted credential manager with 1-click DOM auto-fill for embedded Chromium `<webview>` portals.
- **Background Auto-Updater**: Silent update checking via `electron-updater` with 1-click restart & install.

### How to Package (Category 3)
```bash
cd desktop-app
npm install
npm run electron:dev

# Build compressed LZMA standalone installers (~150MB)
npm run electron:build
```

---

## 5. Comparative Feature Matrix

| Feature / Capability | 🌐 Category 1: Web App | 🐍 Category 2: Web + Python | 🖥️ Category 3: Desktop App |
| :--- | :---: | :---: | :---: |
| **Execution Host** | Web Browser / PWA | Web Browser + Local Python | Standalone Electron App (.exe) |
| **Installation Required** | Zero Install | Python 3.8+ Setup | Double-click Installer |
| **Data Storage Engine** | Browser IndexedDB | IndexedDB + SQLite `app_tracker.db` | `%AppData%\FlowTrack Pro` |
| **Study Target Timer** | Delta Clock (`Date.now()`) | Delta Clock (`Date.now()`) | Delta Clock + Background Priority |
| **Pomodoro Engine** | Timestamp-Based | Timestamp-Based | Timestamp-Based (Freeze-Proof) |
| **AI Study Assistant** | Google Gemini API | Google Gemini API | Google Gemini API |
| **Active App Tracking** | ❌ None | ✅ Via `http://localhost:5001` | ✅ Native Win32 (`win-tracker.exe`) |
| **Encrypted Password Vault**| ⚠️ Web Storage Only | ⚠️ Web Storage Only | ✅ **Encrypted Vault + DOM Auto-Fill** |
| **Background Auto-Updater** | ❌ No | ❌ No | ✅ **Background Silent Auto-Update** |
| **System Tray Background Run**| ❌ No | ❌ No | ✅ **Category 3 Exclusive** |
| **Media Player Sandbox** | ✅ Web Video/Audio | ✅ Web Video/Audio | ✅ **Zero-CORS local-media:// & Auto-Pause** |
| **PDF & Tesseract OCR Reader** | ✅ WASM OCR | ✅ WASM OCR | ✅ WASM OCR |
| **Excalidraw Whiteboard** | ✅ Infinite Canvas | ✅ Infinite Canvas | ✅ Infinite Canvas |
| **Kanban Sticky Notes** | ✅ PNG Export | ✅ PNG Export | ✅ PNG Export |

---

## 6. Win32 & Webview Tracking Specification

### What FlowTrack Pro Tracks (Category 2 & 3)
- **Active Process Name**: `Code.exe`, `chrome.exe`, `vlc.exe`.
- **Window Title**: Truncated window text caption (max 60 characters).
- **Web Portals Browser Domains**: When using embedded webviews (`apnacollege.in`, `youtube.com`, `coursera.org`), active domain and page title are logged as study metrics.
- **Duration & Timestamps**: Start time, end time, active duration seconds.

---

## 7. Full Application Navigation & Page Breakdown

1. 🏠 **Dashboard (`/dashboard`)**: Daily focus score, streak heatmap, subject breakdown, and recent sessions.
2. 📅 **Today's Tasks (`/today`)**: Daily planner, goal completion ring, and task status toggles.
3. ⏱️ **Timer (`/timer`)**: Target timer, Pomodoro center, Picture-in-Picture player, and Media Sandbox with auto-pause.
4. 📖 **Study Workspace (`/study-workspace`)**: PDF document reader, Tesseract WASM OCR text extractor, and text viewer.
5. 🧠 **Mind Map Whiteboard (`/mind-map`)**: Full Excalidraw infinite canvas drawing board.
6. 🌐 **Web Portals & Password Vault (`/web-portals`)**: Embedded Chromium browser for course portals + local encrypted credential vault.
7. 📝 **Notes Board (`/notes-board`)**: Kanban sticky notes board with color tags and PNG export.
8. 🗓️ **Scheduler (`/scheduler`)**: Planned study block calendar and session scheduling.
9. 🃏 **Flashcards (`/flashcards`)**: SuperMemo SM-2 spaced repetition flashcard decks.
10. 🖥️ **App Tracking (`/app-tracking`)**: 24-hr Gantt timeline of app usage, domain breakdown, and application blocker.
11. 📊 **Analytics (`/analytics`)**: Recharts multi-axis performance trends, streak analysis, and study metrics.
12. 🗓️ **History (`/history`)**: Filterable session history logs, session cloning, and date range filters.
13. 📚 **Subjects (`/subjects`)**: Subject management, color coding, and weekly target goals.
14. 🎯 **Exam Countdown (`/exams`)**: Target exam countdown timers and preparation milestones.
15. 🗓️ **Calendar (`/calendar`)**: Visual monthly and yearly study calendar.
16. 🏆 **Achievements (`/achievements`)**: Gamified study XP levels, streak badges, and milestone rewards.
17. ⚙️ **Settings (`/settings`)**: Theme switcher, data import/export, and Auto-Updater controls.
18. 📖 **Guide (`/guide`)**: In-app operational guide and feature manual.
19. 🤖 **AI Assistant (`/ai`)**: AI study assistant powered by Google Gemini API.

---

## 🔗 Bound Documentation Links

- 🏠 **Master Entry Gateway**: [Root README.md](../README.md)
- 🌐 **Web App Manual**: [web-app/README.md](../web-app/README.md)
- 🖥️ **Desktop App Manual**: [desktop-app/README.md](../desktop-app/README.md)
- 📊 **Analytics Policy**: [docs/ANALYTICS_AND_TRACKING_POLICY.md](ANALYTICS_AND_TRACKING_POLICY.md)

---
*© 2026 FlowTrack Pro Ecosystem · MIT License.*
