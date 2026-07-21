# 📗 FlowTrack Multi-Platform Suite – Complete Technical Operations Manual

> **Engineering Principles:**  
> FlowTrack is architected as a modular, multi-platform productivity ecosystem. It provides a Standalone Windows Native Application (`.exe`), a Live Deployable Web Client (`Vercel`), and a Hybrid Web + Python PC Sync Engine.

---

## 🗂️ Workspace Architecture & Module Map

```text
The-Ultimate-Master-Study-Tracker/
│
├── 🖥️ DIRECTORY: ROOT (Desktop Application Build)
│   ├── electron.js                      # Main Electron process (Win32 IPC, Tray, Native Storage)
│   ├── win-tracker.exe                  # Compiled C# Win32 helper binary (0ms active window query)
│   ├── package.json                     # Desktop app manifest & electron-builder NSIS script
│   └── src/                             # Desktop Frontend (React 19, Vite 7, Zustand)
│       ├── pages/
│       │   ├── DashboardPage.tsx        # Overview & Native IPC live activity widgets
│       │   ├── AppTrackingPage.tsx      # ActivityWatch-style 24-hr Gantt timeline & Web Tabs monitor
│       │   └── TimerPage.tsx            # Study Timer & Pomodoro interface
│       ├── hooks/
│       │   ├── useTimer.ts              # Core timer tick & title bar sync
│       │   └── useInactivityDetector.ts # Dual-layer hybrid inactivity engine
│       └── components/
│           └── dashboard/
│               └── BackendActivityPanel.tsx # Native IPC desktop widgets
│
├── 🌐 DIRECTORY: web-app/ (Web Release & Python Backend Edition)
│   ├── backend.py                       # Python Flask + PyWin32 local PC activity server
│   ├── START.bat                        # Automated Windows batch launcher for Web + Python backend
│   ├── vercel.json                      # Vercel deployment configuration
│   ├── requirements.txt                 # Python packages (pywin32, psutil, flask)
│   └── src/                             # Web Client React Frontend
│
└── 📦 ARCHIVES & LOCAL DOCS
    ├── WebApp_v1.1.0.zip               # Original source zip for web release
    ├── README.md                        # High-level suite architecture overview
    ├── APP_ARCHITECTURE_MANUAL.md         # Detailed technical operations manual
    ├── PROMPT_TO_RECREATE_APP.md         # Local AI master prompt (Git ignored)
    └── features.md                      # Local future roadmap ideas (Git ignored)
```

---

## 🛠️ COMPREHENSIVE MODULE OPERATIONS GUIDE

### 1. Standalone Desktop Edition (`.exe`)
- **Main Driver:** `electron.js` + `win-tracker.exe`
- **How Active Window Tracking Works:**
  - `startActivityTracker()` polls `win-tracker.exe` every 2-3 seconds.
  - `win-tracker.exe` executes Win32 `GetForegroundWindow` and `GetWindowText` in 2ms without PowerShell overhead.
  - Excludes FlowTrack itself (`isSelf()`) and commits entries to `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json`.
- **Dual-Layer Hybrid Inactivity:**
  - **Layer 1 (Win32 Kernel):** Win32 `GetLastInputInfo` hardware polling (works when minimized).
  - **Layer 2 (In-App DOM):** Instant DOM event listeners for mouse/keyboard inputs.
  - **10 Min Idle:** Auto-pauses active study session. Input detected ➔ Auto-resumes.

### 2. Live Web Edition (`web-app/`)
- **Target Platform:** Vercel, Netlify, Github Pages, PWA
- **Deployment Command:**
  ```bash
  cd web-app
  npm install
  npm run build
  ```
- **Features:** 100% browser-based IndexedDB storage, study timer, Pomodoro, AI assistant, subject analytics, PWA offline caching.

### 3. Web + Python Hybrid Edition (`web-app/START.bat`)
- **Target User:** Users using the Web interface who wish to track their Windows PC application usage.
- **Launcher:** Running `web-app/START.bat` performs the following steps:
  1. Checks Node.js and Python.
  2. Scaffolds Python `.venv` virtual environment.
  3. Installs `pywin32` and `psutil`.
  4. Starts `backend.py` on `http://localhost:5001`.
  5. Launches the React dev server and opens the browser.

---

## 🔒 Data Mobility & Privacy Protocols

- **Desktop Data Path:** `%AppData%\FlowTrackPro\activity-log\`
- **Web Data Path:** Browser `IndexedDB` (`Dexie.js`)
- **Backup Support:** Both editions include 1-click **Export JSON** and **Import JSON** in `Settings`, plus **CSV Export** for session analytics.

---

*FlowTrack Engineering Operations Manual — Multi-Platform Architecture.*
