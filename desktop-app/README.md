<!-- ╔══════════════════════════════════════════════════════════════════╗ -->
<!-- ║      FlowTrack Pro — Desktop App Edition README.md               ║ -->
<!-- ║   github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker   ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════╝ -->

<div align="center">

# 🖥️ FlowTrack Pro — Standalone Windows Desktop App

### Production-Grade Native Electron 43 + Win32 Kernel Suite

**The 100% offline, native Windows application edition of FlowTrack Pro.**
Built with Electron 43, React 19, TypeScript 5.7, and precompiled C# Win32 kernel helper (`win-tracker.exe`).
Requires zero Python installation, zero cloud servers, and zero subscription fees.

<br/>

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white)](#-system--resource-requirements)
&nbsp;
[![Electron](https://img.shields.io/badge/Electron-43-47848F?style=for-the-badge&logo=electron&logoColor=white)](#%EF%B8%8F-technology-stack)
&nbsp;
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#%EF%B8%8F-technology-stack)
&nbsp;
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#%EF%B8%8F-technology-stack)

<br/>

[![Master Root README](https://img.shields.io/badge/🏠%20Root%20README-README.md-blue?style=for-the-badge&logo=readme)](../README.md)
&nbsp;&nbsp;
[![Web App README](https://img.shields.io/badge/🌐%20Web%20App%20README-web--app%2FREADME.md-green?style=for-the-badge&logo=vercel)](../web-app/README.md)
&nbsp;&nbsp;
[![Live Web App](https://img.shields.io/badge/🌐%20Live%20Web%20Link-Click%20Here-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://the-ultimate-master-study-tracker.vercel.app/)

</div>

---

## 📋 Table of Contents

- [👤 Project Metadata & Author](#-project-metadata--author)
- [🖥️ System & Resource Requirements](#%EF%B8%8F-system--resource-requirements)
- [✨ All 14 Desktop Pages Breakdown](#-all-14-desktop-pages-breakdown)
- [🚀 How to Load, Run & Package Desktop App](#-how-to-load-run--package-desktop-app)
- [⚙️ Technical Native Win32 Architecture](#%EF%B8%8F-technical-native-win32-architecture)
- [🛌 Dual-Layer Hybrid Inactivity Detector](#-dual-layer-hybrid-inactivity-detector)
- [🛠️ Technology Stack](#%EF%B8%8F-technology-stack)
- [🔒 Data Sovereignty & Storage](#-data-sovereignty--storage)

---

## 👤 Project Metadata & Author

| Metadata | Details |
|:---|:---|
| **Application Name** | FlowTrack Pro (Desktop Application Edition) |
| **Creator / Author** | **Sudhir Singh** ([@SudhirDevOps1](https://github.com/SudhirDevOps1)) |
| **Version** | v1.0.0 Desktop Release |
| **License** | MIT License — Free & Open Source |
| **Source Repository** | [`https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git`](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git) |

---

## 🖥️ System & Resource Requirements

| Component | Minimum Requirement | Recommended Specification |
|:---|:---|:---|
| **Operating System** | Windows 10 (64-bit) or Windows 11 | Windows 11 (64-bit) |
| **RAM / Memory** | **2 GB** available system RAM | **4 GB - 8 GB** RAM |
| **CPU / Processor** | Intel Core i3 / AMD Ryzen 3 (Dual-core 2.0 GHz) | Intel Core i5 / AMD Ryzen 5 (Quad-core 2.5 GHz+) |
| **Disk Storage** | 300 MB for App Installation | 1 GB (for PDF OCR caching & historical activity logs) |
| **Display Resolution** | 1280 x 720 pixels | 1920 x 1080 (Full HD) |
| **Python Requirement** | **NONE** (Zero Python required) | None |

---

## ✨ All 14 Desktop Pages Breakdown

Desktop Edition includes **14 full modules**, including 4 Desktop-Exclusive features:

| Page Module | Route | Type | Description |
|:---|:---|:---:|:---|
| 🏠 **Dashboard** | `/dashboard` | Standard | Overview, weekly summaries, focus score algorithm, live green process badge |
| 📅 **Today's Tasks** | `/today` | 🖥️ **Desktop Exclusive** | Daily session planner, status buckets, goal completion progress ring |
| ⏱️ **Timer Center** | `/timer` | Standard | Precision target timer, Pomodoro engine, window title countdown sync |
| 📖 **Study Workspace** | `/study-workspace` | 🖥️ **Desktop Exclusive** | PDF reader (`pdfjs-dist`), offline Tesseract.js OCR scanner, Speech synthesis |
| 📝 **Notes Board** | `/notes-board` | 🖥️ **Desktop Exclusive** | Kanban sticky notes board with Hindi typography (*Rozha One*, *Yatra One*) & PNG export |
| 🖥️ **App Tracking** | `/app-tracking` | 🖥️ **Desktop Exclusive** | 24-hr Gantt usage timeline, web tab domain extractor, app process blocker |
| 📊 **Analytics** | `/analytics` | Standard | Recharts multi-axis performance graphs, subject attachment metrics |
| 🗓️ **History** | `/history` | Standard | Filterable session log, session cloning, date shifting tools |
| 📚 **Subjects** | `/subjects` | Standard | Subject manager with weekly goal hours and template selector |
| 🗺️ **Calendar** | `/calendar` | Standard | Visual monthly and yearly drag-and-drop calendar planner |
| 🏆 **Achievements** | `/achievements` | Standard | Rank titles and milestone badge unlocking system |
| ⚙️ **Settings** | `/settings` | Standard | App configuration, JSON import/export, CSV logging exports |
| 📖 **Guide** | `/guide` | Standard | In-app user visual guide |
| 🤖 **AI Assistant** | `/ai` | Standard | Local AI coach supporting Ollama and WebLLM |

---

## 🚀 How to Load, Run & Package Desktop App

### Step 1: Open Desktop App Directory
```bash
cd desktop-app
```

### Step 2: Install Desktop Node Dependencies
```bash
npm install
```

### Step 3: Run Live Development Mode (Vite + Electron)
```bash
npm run electron:dev
```
Launches Vite dev server and opens native Electron window with live hot-reloading.

### Step 4: Package Production `.exe` Installer
```bash
npm run electron:build
```
- **Installer Output**: `desktop-app/dist-electron/FlowTrackPro Setup 1.0.0.exe`
- **Unpacked Portable Executable**: `desktop-app/dist-electron/win-unpacked/FlowTrackPro.exe`

---

## ⚙️ Technical Native Win32 Architecture

Unlike web browsers that run inside security sandboxes, Desktop Edition executes native Win32 calls via `win-tracker.exe` (a precompiled C# helper):

```
[Electron Main Process (electron.js)]
         │
         ├── Spawns win-tracker.exe (C# Win32 Binary)
         │     ├── GetForegroundWindow()
         │     ├── GetWindowText()
         │     └── GetWindowThreadProcessId()  ===> Returns: { title: "VS Code", process: "Code.exe" }
         │
         ├── Polls every 2 seconds
         └── Logs data to %AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json
```

---

## 🛌 Dual-Layer Hybrid Inactivity Detector

- **Layer 1 (Win32 Kernel)**: Queries `GetLastInputInfo` via PowerShell IPC. Detects physical hardware mouse/keyboard movement even when FlowTrack is minimized to the System Tray.
- **Layer 2 (Instant DOM Listener)**: Monitors in-app user interactions with 0ms response.
- **Auto-Resume**: Auto-pauses active study session after 10 minutes of idle time and **auto-resumes as soon as you touch your mouse or keyboard**.

---

## 🛠️ Technology Stack

| Component | Technology | Version |
|:---|:---|:---|
| **Desktop Shell** | Electron | 43.1.1 |
| **UI Framework** | React | 19.2.3 |
| **Language** | TypeScript | 5.9.3 |
| **Bundler** | Vite | 7.2.4 |
| **Native API** | Win32 Kernel C# (`win-tracker.exe`) | .NET 4.8 / Win32 |
| **OCR Engine** | Tesseract.js (WASM) | 7.0.0 |
| **PDF Renderer** | PDF.js (`pdfjs-dist`) | 6.1.200 |
| **Packaging Tool** | electron-builder | 26.15.3 |

---

## 🔒 Data Sovereignty & Storage

- **Storage Path**: `%AppData%\FlowTrackPro\`
- **Activity Logs**: Saved as daily JSON files inside `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json`.
- **Privacy Standard**: 100% offline. Zero external network transmission.

---

<div align="center">

**[View Master Ecosystem README →](../README.md)** &nbsp;|&nbsp; **[View Web App README →](../web-app/README.md)**

</div>
