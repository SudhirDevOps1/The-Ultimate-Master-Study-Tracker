# ⚡ FlowTrack Pro — Enterprise Multi-Platform Study & Digital Wellbeing Suite

<div align="center">

![FlowTrack Pro Banner](web-app/public/images/flowtrack-banner.png)

**Privacy-First • Standalone Windows Executable • Live Web Client (Vercel/PWA) • Native C# Win32 Engine**

[![Developer](https://img.shields.io/badge/Developer-SudhirDevOps1-cyan?style=for-the-badge&logo=github)](https://github.com/SudhirDevOps1)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Web%20%7C%20PWA-indigo?style=for-the-badge&logo=windows)](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Version-v2.0.0--Standalone-purple?style=for-the-badge)]()

[📥 Download Windows App (.exe)](#-how-to-install--run) • [🌐 Live Web App Guide](#-how-to-deploy--run-web-app) • [📖 Documentation Manual](APP_ARCHITECTURE_MANUAL.md)

</div>

---

## 👨‍💻 Developer & Project Credits

- **Lead Architect & Developer:** **[SudhirDevOps1](https://github.com/SudhirDevOps1)**
- **Repository:** [The-Ultimate-Master-Study-Tracker](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker)
- **Special Thanks & Acknowledgments:**
  - **ActivityWatch Open-Source Community:** For pioneering local-first digital wellbeing heuristics.
  - **Electron & React Core Teams:** For modern desktop app foundation.
  - **Open-Source Contributors:** For icons, UI primitives (`Lucide-React`, `Framer Motion`, `Tailwind CSS`).

---

## 🛠️ Complete Tech Stack Used

| Layer | Technologies Used |
| :--- | :--- |
| **Desktop Shell** | Electron 43+, Node.js 22+, Win32 User32.dll Assembly APIs |
| **Native Helper Binary** | C# (.NET Win32 Assembly) compiled executable (`win-tracker.exe`) for 0ms active window query |
| **Frontend Framework** | React 19, TypeScript 5.9, Vite 7 Bundler |
| **UI & Styling** | Tailwind CSS v4, Framer Motion (Glassmorphic dark design) |
| **State & Database** | Zustand (Global State Lock Engine), Dexie.js (Browser IndexedDB) |
| **Charts & Analytics** | Recharts, D3.js, Lucide Icons |
| **Web Server (Optional)**| Python 3.9+ (Flask, PyWin32, Psutil) for Web-to-PC Screen-Time Bridge |
| **Deployment** | Electron-Builder (NSIS Installer), Vercel CLI, PWA Service Worker |

---

## 💻 System Requirements & Resource Specs

| Metric | Desktop Standalone (`.exe`) | Web Client (Vercel / PWA) |
| :--- | :--- | :--- |
| **Supported OS** | Windows 10 / Windows 11 (64-bit) | Any Modern Browser (Chrome, Edge, Safari, Firefox) |
| **Installer Size** | ~145 MB (`FlowTrackPro Setup 1.0.0.exe`) | 0 MB (Instant URL Access) |
| **Disk Space Needed**| ~350 MB (Post-installation) | ~5 MB (Browser Cache / IndexedDB) |
| **RAM Usage** | ~80 MB - 120 MB (Background Throttled) | ~40 MB - 60 MB |
| **CPU Usage** | < 0.5% (Compiled C# Win32 API execution) | Minimal |
| **Internet** | **100% Offline** (Zero cloud data sent) | Required for initial URL load |

---

## 📥 How to Install & Run (Step-by-Step)

### Option A: Installing Standalone Windows Desktop App (`.exe`) — *Recommended*

No Python, Node.js, or complex setup is required.

1. Navigate to the `dist-electron/` folder in this repository or download:
   ```text
   dist-electron/FlowTrackPro Setup 1.0.0.exe
   ```
2. **Double-click** `FlowTrackPro Setup 1.0.0.exe` to run the installer.
3. The app will install and open automatically.
4. Minimizing or clicking **Close (X)** moves the app to your **Windows System Tray** (near the clock), allowing background study timing and window tracking to run continuously.

---

## 🌐 How to Deploy & Run Web App (`web-app/`)

### Option B: Deploying Pure Web App to Vercel (Live Web Link)

To host your own live web application on Vercel:

1. Open your terminal and navigate to the `web-app/` directory:
   ```bash
   cd web-app
   ```
2. Install dependencies & test build:
   ```bash
   npm install
   npm run build
   ```
3. Deploy to Vercel:
   - Connect your GitHub repository `SudhirDevOps1/The-Ultimate-Master-Study-Tracker` to [Vercel](https://vercel.com).
   - Set Root Directory to `web-app`.
   - Vercel will automatically build and provide a live production URL!

### Option C: Web App + Local Python PC Tracker (`web-app/START.bat`)

If you want to use the Web interface while tracking your local Windows PC application usage:

1. Open the `web-app/` folder.
2. Double-click **`START.bat`**.
3. The script will automatically:
   - Create a Python virtual environment (`.venv`).
   - Install `pywin32` and `psutil`.
   - Start `backend.py` on `http://localhost:5001`.
   - Open the Web application in your browser connected to your local PC!

---

## 🚀 Key Features & Capabilities

### 1. ⏱️ Study Timer & Live Title Sync
- Real-time countdown on title bar: `[24:15] Physics - FlowTrack`.
- Background throttling disabled — minimizing never freezes your clock.

### 2. 🍅 Freeze-Proof Pomodoro Engine
- Timestamp-delta calculated Work/Break intervals.

### 3. 🖥️ Native Desktop & Web Activity Monitor
- **Native C# Win32 Helper (`win-tracker.exe`):** Captures active process names & window titles in 2ms.
- **FlowTrack Self-Exclusion:** Automatically filters out FlowTrack (`flowtrackpro.exe`, `electron.exe`).
- **4 Dedicated Tracking Tabs:**
  - 📊 **Overview:** App category distribution & live green `LIVE` badges.
  - 📈 **24-Hour Timeline:** Gantt-style hourly visual chart.
  - 🌐 **Web Sites & Tabs:** Browser domain extractor (`youtube.com`, `github.com`, `chatgpt.com`) with favicons & visit counters.
  - 🪟 **Windows Log:** Detailed timestamped window log history.

### 4. 🛌 Dual-Layer Hybrid Inactivity Engine
- Win32 `GetLastInputInfo` hardware API + In-App DOM event listeners.
- 10-Minute Idle ➔ Auto-Pause + Notification. Movement/Typing ➔ Instant Auto-Resume!

### 5. 💾 Backup & Data Mobility
- 1-Click JSON Import/Export + CSV Export for Excel reports.

---

## 🔗 Documentation Links Index

For deep technical specifications, design details, and AI guidelines:

- 📖 **[APP_ARCHITECTURE_MANUAL.md](APP_ARCHITECTURE_MANUAL.md)** — Complete Engineering & Operational Operations Manual.
- 🔮 **[features.md](features.md)** — Local Future Roadmap & Ideas (Local Only).
- 🤖 **[PROMPT_TO_RECREATE_APP.md](PROMPT_TO_RECREATE_APP.md)** — Master AI Recreation Prompt (Local Only).
- 🌐 **[web-app/README.md](web-app/README.md)** — Web Release & Python Backend Documentation.
- 📝 **[web-app/DOCUMENTATION_INDEX.md](web-app/DOCUMENTATION_INDEX.md)** — Full Index of Web Edition Technical Specs.

---

## 🛠️ Development & Build Commands

```bash
# Clone the repository
git clone https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git
cd The-Ultimate-Master-Study-Tracker

# Install dependencies
npm install

# Run Desktop Dev Mode
npm run dev

# Compile Production Desktop Installer (.exe)
npm run electron:build
```

---

<div align="center">

*Crafted with ❤️ and precision by **SudhirDevOps1** for dedicated learners worldwide.*

</div>
