<!-- ╔══════════════════════════════════════════════════════════════════╗ -->
<!-- ║      FlowTrack Pro — Desktop App README.md                      ║ -->
<!-- ║   github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker   ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════╝ -->

<div align="center">

# 🖥️ FlowTrack Pro — Standalone Desktop App

### Windows Native Application (Electron 43 + React 19)

**A 100% standalone, offline-first Windows desktop application.**
Built with Electron 43 + React 19 + Win32 native APIs (`win-tracker.exe`).
Zero Python servers required. Zero cloud database dependencies. 100% private data.

<br/>

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white)](#-installation)
&nbsp;
[![Electron](https://img.shields.io/badge/Electron-43-47848F?style=for-the-badge&logo=electron&logoColor=white)](#%EF%B8%8F-tech-stack)
&nbsp;
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#%EF%B8%8F-tech-stack)
&nbsp;
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#%EF%B8%8F-tech-stack)

[![Master Guide](https://img.shields.io/badge/📑%20Master%20Production%20Guide-FULL_SYSTEM_GUIDE.md-purple?style=for-the-badge&logo=markdown)](../docs/FULL_SYSTEM_GUIDE.md)
&nbsp;
[![Root README](https://img.shields.io/badge/🏠%20Root%20README-README.md-blue?style=for-the-badge&logo=readme)](../README.md)
&nbsp;
[![Live Web App](https://img.shields.io/badge/🌐%20Live%20Web%20Version-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://study-tracker-app-pied.vercel.app/)

<br/>

> ⭐ **If FlowTrack Pro helps you focus better, star the main repository — it motivates continued development!**

</div>

---

## 📋 Table of Contents

<details>
<summary><b>Click to expand full navigation</b></summary>

&nbsp;

| Section | Description |
|---------|-------------|
| [📦 Quick Installation](#-quick-installation) | How to install and run |
| [🆚 Desktop vs Web App](#-desktop-vs-web-app) | Feature comparison matrix |
| [✅ Full 14-Page Navigation](#-full-14-page-navigation) | Desktop module breakdown |
| [⏱️ Precision Timer & Pomodoro](#%EF%B8%8F-1-study-timer--pomodoro-engine) | Freeze-proof timer details |
| [🖥️ Win32 Native App Tracker](#%EF%B8%8F-2-native-desktop--web-activity-monitor) | Native window tracking |
| [🛌 Dual-Layer Inactivity Engine](#-3-dual-layer-hybrid-smart-inactivity-detector) | Smart hardware idle detection |
| [📖 PDF & Tesseract OCR Reader](#-4-study-workspace--pdf--ocr-reader) | Local OCR & speech synthesis |
| [📝 Sticky Notes Kanban Board](#-5-sticky-notes-kanban-board) | Notes with Hindi font support |
| [📅 Today's Task Dashboard](#-6-todays-task-dashboard) | Daily session planner |
| [🪟 System Tray Execution](#-7-system-tray-background-execution) | Tray minimization behavior |
| [🏗️ Directory & Code Architecture](#%EF%B8%8F-directory--code-architecture) | Internal file map |
| [🔧 IPC API Reference](#-ipc-api-reference) | Electron IPC channels |
| [🛠️ Dev & Build Commands](#%EF%B8%8F-dev--build-commands) | Run dev & build .exe |

</details>

---

## 📦 Quick Installation

### Option 1 — Pre-Compiled Windows Installer (.exe)
```text
dist-electron\FlowTrackPro Setup 1.0.0.exe
```

### Option 2 — Developer Execution
```bash
# 1. Open terminal in desktop-app folder
cd desktop-app

# 2. Install dependencies
npm install

# 3. Launch live development mode (Vite + Electron)
npm run electron:dev

# 4. Package standalone Windows installer
npm run electron:build
```

---

## 🆚 Desktop vs Web App

| Feature Module | 🌐 Web App (Vercel Live) | 🖥️ Desktop App (Electron .exe) |
|:---------------|:------------------------:|:------------------------------:|
| **Executable Type** | Browser / PWA | Windows Executable (.exe) |
| **Storage Path** | Browser IndexedDB | `%AppData%\FlowTrackPro` |
| **Total Pages** | 10 Pages | **14 Pages** (4 Desktop Exclusive) |
| **Today's Tasks (`/today`)** | ❌ | ✅ **Desktop Exclusive** |
| **PDF & Tesseract OCR Reader** | ❌ | ✅ **Desktop Exclusive** |
| **Sticky Notes Board** | ❌ | ✅ **Desktop Exclusive** |
| **Native Foreground App Tracker** | Python Required | ✅ Win32 Native (`win-tracker.exe`) |
| **System Tray Background Run** | ❌ | ✅ **Desktop Exclusive** |
| **Dual-Layer Inactivity Engine** | DOM Events Only | ✅ Win32 Kernel + DOM Events |
| **Auto-Resume on Interaction** | Manual | ✅ Automatic on mouse movement |
| **Background Execution** | Browser Throttled | ✅ `backgroundThrottling: false` |

---

## ✅ Full 14-Page Navigation

| Page Module | Route | Description |
|:------------|:------|:------------|
| 🏠 **Dashboard** | `/dashboard` | Weekly summary, focus score, level/XP, live activity widgets |
| 📅 **Today's Tasks** | `/today` | 🖥️ **Desktop Exclusive**: Daily planner & progress ring |
| ⏱️ **Timer** | `/timer` | Precision study target timer & Pomodoro center |
| 📖 **Study Workspace** | `/study-workspace` | 🖥️ **Desktop Exclusive**: PDF reader, Tesseract OCR, TTS |
| 📝 **Notes Board** | `/notes-board` | 🖥️ **Desktop Exclusive**: Sticky notes board with Hindi fonts |
| 🖥️ **App Tracking** | `/app-tracking` | 🖥️ **Desktop Exclusive**: Native window monitor & 24-hr Gantt |
| 📊 **Analytics** | `/analytics` | Deep charts, focus metrics, subject mastery, study reports |
| 🗓️ **History** | `/history` | Full session log with filters and clone tools |
| 📚 **Subjects** | `/subjects` | Color-coded subject manager & template selector |
| 🗺️ **Calendar** | `/calendar` | Visual monthly calendar with session entries |
| 🏆 **Achievements** | `/achievements` | Badge system, XP milestones |
| ⚙️ **Settings** | `/settings` | Application configuration & JSON/CSV import/export |
| 📖 **Guide** | `/guide` | In-app user guide |
| 🤖 **AI Assistant** | `/ai` | Local AI coach (Ollama / WebLLM) |

---

## 🛠️ Feature Deep-Dives

### ⏱️ 1. Study Timer & Pomodoro Engine
- **Delta-Sync Hardware Clock**: Calculated via `Date.now() - startedAtMs` to prevent timer slowdowns when windows are minimized.
- **Title Bar Sync**: Real-time window title updates: `[24:15] Physics - FlowTrack`.

### 🖥️ 2. Native Desktop & Web Activity Monitor (`/app-tracking`)
- **Win32 Kernel Integration**: Reads foreground window titles and `.exe` process names in $<5\text{ ms}$ via embedded `win-tracker.exe`.
- **4 Dedicated Tracking Tabs**: Overview, 24-Hour Gantt Timeline, Web Sites & Tabs Monitor (identifies YouTube, GitHub, StackOverflow, ChatGPT), and Windows History Log.

### 🛌 3. Dual-Layer Hybrid Smart Inactivity Detector
- **Layer 1 (Win32 Kernel)**: Tracks hardware-level mouse, keyboard, touchpad input via `GetLastInputInfo`.
- **Layer 2 (DOM Watcher)**: Instant in-app DOM event watcher.
- **Auto-Resume**: Auto-pauses after 10 minutes of inactivity and auto-resumes as soon as hardware input is detected.

### 📖 4. Study Workspace — PDF & OCR Reader (`/study-workspace`)
- Renders local PDF files via `pdfjs-dist`.
- Converts image/PDF pages to text offline using `tesseract.js` WebAssembly.
- Built-in Text-to-Speech (TTS) voice reader.

### 📝 5. Sticky Notes Kanban Board (`/notes-board`)
- Customizable sticky notes with background themes, typography choices (including Hindi fonts: *Rozha One*, *Poppins*, *Kurale*, *Yatra One*).
- One-click PNG export via `html2canvas`.

---

## 🏗️ Directory & Code Architecture

```text
desktop-app/
├── .gitignore                     # Custom Desktop Ignore Rules
├── README.md                      # This Technical Document
├── electron.js                    # Main Process (Win32, Tray, IPC, Activity Tracker)
├── win-tracker.exe                # Embedded C# Win32 helper binary
├── package.json                   # Dependencies & build scripts
├── vite.config.ts                 # Vite bundler config
└── src/
    ├── main.tsx                   # React entrypoint
    ├── App.tsx                    # Main router & window title bar sync
    ├── store/useAppStore.ts       # Zustand master store (~49KB)
    ├── hooks/
    │   ├── useTimer.ts            # Delta clock timer hook
    │   ├── usePomodoro.ts         # Pomodoro cycle hook
    │   └── useInactivityDetector.ts# Dual-layer hardware inactivity engine
    └── pages/                     # 14 React Page Views
```

---

## 🔗 Linked Documentation Ecosystem

- 📑 **Master Ecosystem & Integration Guide**: [`../COMPARISON_AND_GUIDE.md`](../COMPARISON_AND_GUIDE.md)
- 🏠 **Root Repository README**: [`../README.md`](../README.md)

---
*© 2026 FlowTrack Pro Desktop Edition · MIT License.*
