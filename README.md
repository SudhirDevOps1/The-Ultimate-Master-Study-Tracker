# 🌐 FlowTrack Multi-Platform Suite (Desktop & Web Applications)

> **Enterprise Study Tracker & Digital Wellbeing Platform**  
> Complete dual-edition solution supporting 100% Standalone Offline Windows Desktop App (`.exe`), Live Web Client (`Vercel/PWA`), and Web + Python Local PC Sync Engine.

---

## 🗂️ Platform Editions & Architecture Overview

```text
The-Ultimate-Master-Study-Tracker/
├── 🖥️ (Desktop App Core)               ← Primary Standalone Electron 43 Application
│   ├── electron.js                      # Main Process (Win32 APIs, System Tray, Local Storage IPC)
│   ├── win-tracker.exe                  # Compiled C# Win32 Native Helper (0ms active window query)
│   ├── src/                             # React 19 Frontend Components & Custom Hooks
│   ├── dist-electron/                   # Output folder containing FlowTrackPro Setup 1.0.0.exe
│   └── package.json                     # Desktop dependencies & electron-builder setup
│
├── 🌐 web-app/                          # Live Web Deployment & Hybrid Edition (Extracted v1.1.0)
│   ├── backend.py                       # Optional Python Screen-Time Sync Backend Engine
│   ├── START.bat                        # One-Click Windows Launcher for Web Client + Python Backend
│   ├── vercel.json                      # Single-click Vercel Deployment Configuration
│   ├── requirements.txt                 # Python dependencies (pywin32, psutil, flask)
│   ├── public/                          # PWA Assets, Web Workers & Web Manifests
│   ├── src/                             # Web Client React Frontend
│   └── docs/                            # Deep Technical Web Integration Documentation
│
├── WebApp_v1.1.0.zip                   # Original Archived Source Package for Web Release
├── README.md                            # Suite Architectural & Deployment Documentation
├── APP_ARCHITECTURE_MANUAL.md             # Complete Engineering & Operational Operations Manual
├── PROMPT_TO_RECREATE_APP.md             # Master AI Recreation Prompt (Local Only)
└── features.md                          # Local Future Enhancements Roadmap (Local Only)
```

---

## 🚀 Deployment Modes & Usage Guide

FlowTrack provides **3 flexible operation modes** depending on user preference:

| Operation Mode | Targeted User | Requirements | Capabilities & Features |
| :--- | :--- | :--- | :--- |
| **Mode 1: Desktop App (`.exe`)** *(Recommended)* | Windows 10/11 Desktop Users | Standalone `.exe` Installer | • 100% Offline, Privacy-First<br>• Win32 C# `win-tracker.exe` (0ms Latency, <0.5% CPU)<br>• Dual-Layer Hybrid Inactivity (Win32 + DOM)<br>• 24-hr Timeline & Web Tab Favicon Extractor<br>• System Tray background execution |
| **Mode 2: Pure Web App (Vercel)** | Mobile, Mac, Linux & Browser Users | Any Modern Web Browser | • Instant zero-install PWA access<br>• IndexedDB local study sessions & timer<br>• Gamified Focus Score & Heatmap<br>• Ambient Music Player & Notes Board |
| **Mode 3: Web Client + Local Python Backend** | Web Users wanting PC Screen-Time Sync | Python 3.9+ & `START.bat` | • Bridges web browser UI with local Windows PC processes<br>• `backend.py` polls foreground window & system idle<br>• Syncs screen-time stats to live web interface via localhost API |

---

## 📦 Mode 1: Installing Standalone Desktop App

To install the high-performance desktop installer:
```text
dist-electron\FlowTrackPro Setup 1.0.0.exe
```
1. Double-click the installer executable.
2. The application will launch instantly and minimize to your Windows System Tray.
3. No Python, internet, or external setup is required.

---

## 🌐 Mode 2 & 3: Web App Deployment & Setup (`/web-app`)

### 1. Deploying Pure Web Client to Vercel
```bash
cd web-app
npm install
npm run build
# Deploy to Vercel via CLI or GitHub integration using vercel.json
```

### 2. Running Web Client + Local Python Backend (`START.bat`)
For users who prefer using the web interface while tracking local PC screen-time:
1. Open the `web-app/` directory.
2. Double-click `START.bat`.
3. The script automatically creates a Python virtual environment (`.venv`), installs `pywin32` & `psutil`, starts `backend.py` on port `5001`, and launches the web client in your browser.

---

## ⚡ Technical Comparison: Desktop App vs. Web App

| Feature | Desktop App (`.exe`) | Web App (`Vercel`) | Web App + Python |
| :--- | :---: | :---: | :---: |
| **Offline Functionality** | ✅ 100% Offline | ✅ PWA Caching | ✅ Localhost Sync |
| **Native Active Window Tracking** | ✅ Direct `win-tracker.exe` | ❌ Browser Restricted | ✅ via `backend.py` |
| **Web Tab & Favicon Extractor** | ✅ Built-in | ❌ Restricted | ✅ Title Parsing |
| **Dual-Layer Inactivity (Hardware API)** | ✅ Win32 `GetLastInputInfo` | ⚠️ DOM Events Only | ✅ Win32 via Python |
| **System Tray Background Operation** | ✅ Yes | ❌ Browser Dependent | ❌ Console Window |
| **Installation Complexity** | **Zero Setup (Double-click)** | Zero Setup (URL) | Requires Python 3 |

---

## 🔒 Security & Privacy Standard

- **Zero Remote Data Transmissions:** All study records, process usage, and tab logs are stored 100% locally on the user's device.
- **Local Desktop App Data:** `%AppData%\FlowTrackPro\activity-log\`
- **Web App Data:** Browser `IndexedDB` (`Dexie.js`)

---

*FlowTrack Multi-Platform Suite — Engineered by SudhirDevOps1 for serious productivity.*
