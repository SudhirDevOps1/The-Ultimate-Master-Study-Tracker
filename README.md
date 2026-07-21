# 🌐 FlowTrack Multi-Platform Suite

> **Enterprise Monorepo Ecosystem**  
> Cleanly split into two isolated, independent application packages: **Desktop App (`desktop-app/`)** and **Web App (`web-app/`)**.

---

## 🗂️ Isolated Folder Structure

```text
The-Ultimate-Master-Study-Tracker/
│
├── 🖥️ desktop-app/                        # 100% Independent Standalone Windows App Package
│   ├── electron.js                      # Main Electron Engine (Win32 APIs, System Tray, Local Storage)
│   ├── win-tracker.exe                  # Compiled Native Win32 C# Binary Helper (0ms active window query)
│   ├── flowtrack_config.json            # Desktop Configuration
│   ├── dist-electron/                   # Output directory with FlowTrackPro Setup 1.0.0.exe installer
│   ├── src/                             # Desktop App React 19 Frontend
│   └── package.json                     # Desktop dependencies & electron-builder setup
│
├── 🌐 web-app/                          # 100% Independent Web Application Package
│   ├── vercel.json                      # Vercel deployment configuration
│   ├── index.html                       # Web client entrypoint
│   ├── START.bat                        # One-Click Windows launcher for Web + Python backend
│   ├── backend.py                       # Optional Python script to bridge local PC screen-time to Web
│   ├── requirements.txt                 # Python dependencies (pywin32, psutil, flask)
│   ├── src/                             # Web App React 19 Frontend
│   └── package.json                     # Web app dependencies & Vite bundler script
│
└── 📖 Root Documentation
    ├── README.md                        # Master Multi-Platform Suite Overview
    └── APP_ARCHITECTURE_MANUAL.md         # Detailed Technical Operations Manual
```

---

## 🚀 How to Run & Deploy Each Edition

### 1. 🖥️ Desktop Standalone App (`/desktop-app`)
For Windows 10/11 users who want a 100% offline, privacy-first desktop app:
```text
desktop-app\dist-electron\FlowTrackPro Setup 1.0.0.exe
```
- **Features:** 0ms `win-tracker.exe` Win32 tracking, Dual-layer hybrid inactivity (Win32 + DOM), Web tabs favicon monitor, System Tray background support, freeze-proof study timers.

---

### 2. 🌐 Web App Deployment (`/web-app`)
For hosting on Vercel, Netlify, or PWA browsers:
1. Open terminal and navigate to `web-app/`:
   ```bash
   cd web-app
   npm install
   npm run build
   ```
2. Deploy to Vercel by pointing Vercel Root Directory to `web-app/`.

---

### 3. 🐍 Web App + Local Python PC Sync (`/web-app/START.bat`)
For users using the Web edition who want to bridge local PC screen-time:
1. Open `web-app/` directory.
2. Double-click `START.bat`.

---

## 👨‍💻 Developer & Credits

- **Developer:** **[SudhirDevOps1](https://github.com/SudhirDevOps1)**
- **Repository:** [The-Ultimate-Master-Study-Tracker](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker)

---

*FlowTrack Suite — Clean Multi-Platform Architecture.*
