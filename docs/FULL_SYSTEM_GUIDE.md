# 📖 FlowTrack Pro — Master Technical Architecture & System Guide

> **Version**: `v0.3.0` | **Last Updated**: 2026-10-30 (v0.3.0 Production Release)

---

> [!NOTE]
> **Open-Source Architectural Inspiration**: FlowTrack Pro synthesizes paradigms from community-loved tools:
> - **ActivityWatch**: Automated local-first telemetry, safe query API & AFK idle detection.
> - **Super Productivity**: Timeboxing, Pomodoro synthesizer, break engine & flowtime focus.
> - **Anki / SuperMemo SM-2**: Spaced repetition memory engines with learning steps and leech detection.
> - **Dayflow / Wakapi**: Passive developer screen categorization and WakaTime heartbeat ingestion with 1-click IDE auto-configuration.
> - **Excalidraw & Miro**: Multi-slide canvas deck engine with auto-cleanup of orphan text and sticky note card geometry.
> - **MindMap Portal**: Fullscreen portal architecture with Radar mini-map navigator and dynamic branch palettes.

Welcome to the official technical manual for **FlowTrack Pro**. This document specifies the exact implementation details, architectural design, data storage mechanisms, and operational modes across **3 Operational Categories**.

---

## 📑 Table of Contents
1. [Operational Modes Overview](#1-operational-modes-overview)
2. [Category 1: Web App (Serverless PWA)](#2-category-1-web-app-serverless-pwa)
3. [Category 2: Web App + Python Backend](#3-category-2-web-app--python-backend)
4. [Category 3: Standalone Desktop App (Electron Windows/macOS)](#4-category-3-standalone-desktop-app-electron-windowsmacos)
5. [Comparative Feature Matrix](#5-comparative-feature-matrix)
6. [Win32 & Webview Tracking Specification](#6-win32--webview-tracking-specification)
7. [Full Application Navigation & Page Breakdown](#7-full-application-navigation--page-breakdown)
8. [Developer Protocols & Local Services](#8-developer-protocols--local-services)

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
│  - AES-256-GCM Backup Vault     │             │  - Mirrored Heartbeats Table    │             │  - Ghostery Ad Blocker          │
│  - Offline MiniSearch (Ctrl+K)  │             │  - FlowTrack Heartbeats Proxy   │             │  - Loopback Receiver (7777)     │
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
cd The-Ultimate-Master-Study-Tracker/web-app
npm install --legacy-peer-deps
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
  │                                                       ├── Ingests IDE Heartbeats into SQLite
  └── Polls REST API (every 5s) ────────────────────────► └── REST Endpoint (/active-window, /heartbeats)
      GET http://localhost:5001/active-window                 Returns: { "title": "VS Code", "process": "Code.exe" }
```

### How to Run (Category 2)
```bash
# Start backend service
python web-app/backend.py 5001 --poll 2 --idle 300

# In another terminal run Web UI
cd web-app
npm run dev
```

---

## 4. Category 3: Standalone Desktop App (Electron)

### Overview
Category 3 is a **100% Standalone Desktop Application** built with Electron 43.

- **Target Platform**: Windows 10/11 (64-bit) and macOS.
- **Data Storage**: `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json` and IndexedDB.
- **Zero Data Loss Guarantee**: Application updates overwrite binaries in `%LocalAppData%\Programs\FlowTrackPro` while preserving 100% of your user database and logs in `%AppData%\FlowTrackPro`.
- **Native Tracking Engine**: Embedded C# Win32 helper (`win-tracker.exe`) for fast foreground app detection.
- **Local WakaTime Receiver**: Binds strictly to `127.0.0.1:7777`, ingesting coding metrics directly from VS Code / Cursor plugins.
- **In-App Browser Shield**: Ghostery declarative ad-blocking engine preventing video and banner ads inside `<webview>` portals.
- **Dangerous Download Protection**: Guard intercepting executable downloads (.exe, .bat, .cmd, .msi, .ps1).
- **ActivityWatch AFK Guard**: Native `powerMonitor` OS idle check auto-pauses focus sessions after idle threshold.
- **Background Auto-Updater**: Silent update checking via `electron-updater` + GitHub Releases API with interactive changelog modal.

### How to Package (Category 3)
```bash
cd desktop-app
npm install --legacy-peer-deps
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
| **Data Storage Engine** | Browser IndexedDB | IndexedDB + SQLite `app_tracker.db` | `%AppData%\FlowTrackPro` + IndexedDB |
| **Study Target Timer** | Delta Clock (`Date.now()`) | Delta Clock (`Date.now()`) | Delta Clock + Background Priority |
| **Pomodoro & Flowtime Engine** | Timestamp-Based + Focus Score | Timestamp-Based + Focus Score | Timestamp-Based (Freeze-Proof) |
| **Active App Tracking** | ❌ None | ✅ Via `http://localhost:5001` | ✅ Native Win32 (`win-tracker.exe`) |
| **FlowTrack IDE Heartbeat Receiver** | ❌ None | ✅ Mirrored via backend.py | ✅ Embedded (`127.0.0.1:7777`) |
| **Network-Level Ad Blocker** | ❌ Browser Dependent | ❌ Browser Dependent | ✅ Ghostery Engine in Webview |
| **Dangerous Download Guard** | ❌ Browser Dependent | ❌ Browser Dependent | ✅ Guard Intercept (.exe, .bat, etc.) |
| **Reader Mode & In-Page Search** | ❌ Browser Dependent | ❌ Browser Dependent | ✅ Mozilla Readability + Ctrl+F |
| **Encrypted Database Backup Vault** | ✅ AES-256-GCM + PBKDF2 | ✅ AES-256-GCM + PBKDF2 | ✅ AES-256-GCM + PBKDF2 |
| **Unified Command Palette (Ctrl+K)** | ✅ MiniSearch Offline | ✅ MiniSearch Offline | ✅ MiniSearch Offline |
| **Break Engine Sanctuary** | ✅ 20-20-20 & Ultradian | ✅ 20-20-20 & Ultradian | ✅ AFK-Aware + powerMonitor |
| **Standup & Review Export** | ✅ 1-Click Markdown | ✅ 1-Click Markdown | ✅ 1-Click Markdown |
| **Opt-in OCR Timeline** | ✅ In-Memory Redaction | ✅ In-Memory Redaction | ✅ In-Memory Redaction |
| **Background Auto-Updater** | ❌ No | ❌ No | ✅ Background Silent Auto-Update |
| **System Tray Background Run** | ❌ No | ❌ No | ✅ Category 3 Exclusive |

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
2. 📅 **Today's Tasks (`/today`)**: Daily planner, goal completion ring, task backlog with timebox budgeting, and 1-click timer hand-off.
3. ⏱️ **Timer (`/timer`)**: Target timer, Pomodoro center, Flowtime mode with transparent focus score (0–100), Picture-in-Picture player, and Media Sandbox with auto-pause.
4. 📖 **Study Workspace (`/study-workspace`)**: PDF document reader, Tesseract WASM OCR text extractor, and text viewer.
5. 🧠 **Mind Map Whiteboard (`/mind-map`)**: Full Excalidraw infinite canvas drawing board.
6. 🌐 **Web Portals Browser (`/web-portals`)**: Modern Arc-style Chromium browser with 100% full-width view, Ghostery network-level ad blocking, Mozilla Readability reader mode, in-page search (`Ctrl+F`), dangerous download guard, lecture speed multiplier (1x-2x), and 1-click slide capture.
7. 📝 **Notes Board (`/notes-board`)**: Kanban sticky notes board with color tags and PNG export.
8. 🗓️ **Scheduler (`/scheduler`)**: Planned study block calendar and session scheduling.
9. 🃏 **Flashcards (`/flashcards`)**: SuperMemo SM-2 spaced repetition flashcard decks with learning steps (1m, 10m, 1d) and leech detection.
10. 🖥️ **App Tracking (`/app-tracking`)**: 24-hr Gantt timeline of app usage, domain breakdown, FlowTrack Developer Studio tab, and opt-in local OCR timeline search.
11. 📊 **Analytics (`/analytics`)**: Recharts multi-axis performance trends, streak analysis, study metrics, and 1-click Daily Standup & Weekly Review Markdown export.
12. 🗓️ **History (`/history`)**: Filterable session history logs, session cloning, and date range filters.
13. 📚 **Subjects (`/subjects`)**: Subject management, color coding, and weekly target goals.
14. 🎯 **Exam Countdown (`/exams`)**: Target exam countdown timers and preparation milestones.
15. 🗓️ **Calendar (`/calendar`)**: Visual monthly and yearly study calendar.
16. 🏆 **Achievements (`/achievements`)**: Gamified study XP levels, streak badges, and milestone rewards.
17. ⚙️ **Settings (`/settings`)**: Theme switcher, AES-256-GCM encrypted database backup/restore, break engine intervals, Third-Party Notices screen, and Auto-Updater controls.
18. 📖 **Guide (`/guide`)**: In-app operational guide and feature manual.
19. 🤖 **AI Assistant (`/ai`)**: AI study assistant powered by Google Gemini API.

---

## 8. Developer Protocols & Local Services

- **Local Heartbeat Receiver**: Listens on `http://127.0.0.1:7777/api/v1/heartbeats` with strict loopback binding and DNS-rebinding protection. Compatible with official WakaTime CLI and IDE extensions.
- **Local Query API**: Read-only query endpoints at `http://127.0.0.1:7777/api/v1/buckets` and `http://127.0.0.1:7777/api/v1/events` for external scripting and automation.
- **Unified Command Palette**: Triggerable anywhere via `Ctrl+K` for instant keyboard navigation across all records.
- **Privacy & Security Contract**: 100% local persistence. Zero unconsented telemetry, zero screenshots stored on disk, and sensitive secrets redacted before indexing.

---

## 🔗 Bound Documentation Links

- 🏠 **Master Entry Gateway**: [Root README.md](../README.md)
- 🌐 **Web App Manual**: [web-app/README.md](../web-app/README.md)
- 🖥️ **Desktop App Manual**: [desktop-app/README.md](../desktop-app/README.md)
- 📊 **Analytics Policy**: [docs/ANALYTICS_AND_TRACKING_POLICY.md](ANALYTICS_AND_TRACKING_POLICY.md)

---
*© 2026 FlowTrack Pro Ecosystem · MIT License.*

---

## 9. 2026 Production-Grade UI/UX & Architecture Overhaul

All core modules across both Desktop and Web editions have been hardened for high performance, accessibility, and zero-distraction focus:

### 1. Modernized Study Timer & Ambience Studio
- **SVG Circular Dial**: High-precision SVG ring with animated gradient stroke, reactive pulse states, and fluid progress mapping.
- **Speed Presets**: 1-click duration dials (15m, 25m, 45m, 60m, 90m) with automatic mode transitions (Pomodoro, Short Break, Long Break, Flowtime).
- **Ambience & Audio Synthesizer**: Web Audio API harmonic binaural/alpha chime synth with automated context suspension upon pause/unmount.
- **Strict Inactivity Guard & AFK Poller**: Monitors OS and user input events, auto-pausing after 5m AFK or 10m tab inactivity.

### 2. AI Smart Scheduler & Timeblocking Matrix
- **Visual Hourly Timeline**: 24-hour visual schedule blocks with instant drag-and-drop reordering.
- **Predictive Reminders**: Persistent multi-milestone alerts (5-minute pre-alert and exact start-time notification) with sessionStorage deduplication preventing alert storms.
- **1-Click Timer Launcher**: Deep link from scheduled task directly into the active focus timer.

### 3. SRS Flashcard Studio (SM-2 Algorithm)
- **Spaced Repetition Algorithm**: True SuperMemo SM-2 interval calculations ($I_n = I_{n-1} 	imes EF$) with dynamic ease factor adaptation.
- **Zen Review Mode**: High-contrast, keyboard-driven flip cards with LaTeX KaTeX formula rendering and syntax-highlighted code snippets.
- **Leech Detection**: Flags troublesome cards needing review restructuring.

### 4. Deep Analytics & Diagnostics Hub
- **Zero Mock Telemetry**: Replaced fake pulse simulations with genuine telemetry data streams and an explicit `🧪 Diagnostic Pulse Probe`.
- **Focus Efficiency Breakdown**: Dynamic ratio of targeted study sessions vs distraction incursions with trend analysis.
- **Subject Heatmap Matrix**: Multi-week study density heatmaps with interactive day inspections.

### 5. App & Website Distraction Blocker
- **Multi-Level Enforcement**: Configurable Soft (toast reminder), Medium (window minimization), and Hard (process termination) modes.
- **Zero Process Leaks**: Polling routines utilize compiled Win32 binaries (`win-tracker.exe`) with strict process handle disposal.

### 6. Unified Calendar & Exam Countdown Vault
- **High-Density Month/Week Grid**: Heatmap-shaded session clusters with direct day inspection and filterable subject tags.
- **Syllabus Readiness Vault**: Real-time readiness gauge calculated from completed topics, flashcard retention, and target exam deadlines.
