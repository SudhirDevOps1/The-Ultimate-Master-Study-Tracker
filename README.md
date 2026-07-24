<div align="center">

<img src="public/images/flowtrack-banner.png" alt="FlowTrack Pro Banner" width="100%" />

# 🚀 FlowTrack Pro (v3.3.0)

### The Ultimate Master Study & Productivity Ecosystem — 2026 Edition

**The professional-grade, AI-powered, strict study tracker built for relentless learners.**
Engineered into **3 distinct operational categories**: Serverless Web App, Web App + Python Backend, and Standalone Windows Desktop App.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Status](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-43-blue)](https://www.electronjs.org/)

[Live Web Demo](https://the-ultimate-master-study-tracker.vercel.app/) • [Setup Guide](#-how-to-run-each-category) • [Changelog](CHANGELOG.md) • [System Architecture](docs/FULL_SYSTEM_GUIDE.md)

</div>

---

## 👤 Author & Project Metadata

| Attribute | Specification |
|:---|:---|
| **Project Name** | FlowTrack Pro — The Ultimate Master Study Tracker |
| **Creator / Lead Architect** | **Sudhir Singh** ([@SudhirDevOps1](https://github.com/SudhirDevOps1)) |
| **Version** | v3.3.0 (2026 Edition) |
| **License** | MIT Open Source License |
| **Live Web App** | [`https://the-ultimate-master-study-tracker.vercel.app/`](https://the-ultimate-master-study-tracker.vercel.app/) |
| **Source Repository** | [`https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git`](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git) |

---

## ✨ Key Features

FlowTrack Pro is built to keep your studies organized, completely distraction-free, and synced.

### ⏱️ Timer Stability & Crash Resilience
* **Timestamp-Based Recovery:** Tracks and saves study elapsed time using absolute timestamps. If the application closes unexpectedly or crashes, the system computes the exact duration upon reload.
* **Quit Hook Sync:** Hooks directly into Electron's exit handler to pause and write database status updates before the application shuts down.

### 🌐 Advanced Website & App Monitoring
* **Win32 C# Tracker integration:** C-Sharp helper `win-tracker.exe` detects focused application window names natively with 0ms latency.
* **Browser Tab Dynamic Parsing:** Auto-extracts domains for **YouTube**, **Instagram**, and **Facebook**, classifying them instantly into social, study, or entertainment analytics logs.
* **500+ App Classifications:** Features an extensive mapping database covering popular Indian EdTech apps, developer IDEs, terminals, and distraction pages.

---

## 📅 3-Category Operational Models

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

## 🖥️ System & Resource Requirements

| Resource / Spec | 🌐 Category 1: Web App (No Backend) | 🐍 Category 2: Web App + Python | 🖥️ Category 3: Desktop App (Electron) |
|:---|:---|:---|:---|
| **Target OS** | Any OS (Windows/Mac/Linux/iOS/Android) | Windows 10/11, macOS, Linux | Windows 10 (64-bit) / Windows 11 |
| **Minimum RAM** | **512 MB** available RAM | **1 GB** RAM | **2 GB** available RAM |
| **Recommended RAM**| **1 GB - 2 GB** RAM | **2 GB - 4 GB** RAM | **4 GB - 8 GB** RAM |
| **Disk Storage** | ~20 MB (IndexedDB cache) | ~100 MB (Python + SQLite) | ~300 MB App Installation |
| **Installation** | Zero Install (Browser / PWA) | Python 3.8+ (`START.bat` / `setup.sh`) | Double-click `.exe` installer |
| **Python Needed?** | ❌ None | ✅ Required (`backend.py`) | ❌ **NONE** (Embedded C# binary) |

---

## 🚀 How to Run Each Category

### ⚡ One-Click Automated Setup (Recommended)
You can set up dependencies and launch the workspace using the interactive setup batch script:
```cmd
setup-and-run.bat
```

### 🌐 Category 1: Web App (No Backend)
```bash
npm install
npm run dev
# Open http://localhost:5173
```

### 🐍 Category 2: Web App + Python Backend
```cmd
:: Windows One-Click Setup
Double-click START.bat

:: macOS / Linux Setup
chmod +x setup.sh && ./setup.sh
```

### 🖥️ Category 3: Standalone Desktop App
```bash
cd desktop-app
npm install
npm run electron:dev

# Build Installer
npm run electron:build
```

---

## 📖 Technical Documentation

- 🌐 **Web App Detailed Manual**: [`web-app/README.md`](web-app/README.md)
- 🖥️ **Desktop App Detailed Manual**: [`desktop-app/README.md`](desktop-app/README.md)
- 📑 **Full Technical Guide**: [`docs/FULL_SYSTEM_GUIDE.md`](docs/FULL_SYSTEM_GUIDE.md)
- 🗺️ **Roadmap**: [`docs/FUTURE_ROADMAP.md`](docs/FUTURE_ROADMAP.md)

---

## 📜 Acknowledgments & Credits

FlowTrack Pro is built upon React, Electron, Vite, Tailwind CSS, Dexie.js, Tesseract.js, and Recharts.

<div align="center">

**Engineered by Sudhir Singh (@SudhirDevOps1)** · FlowTrack Pro v3.3.0 · MIT License

</div>
