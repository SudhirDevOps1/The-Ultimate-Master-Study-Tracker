# 🌐 FlowTrack — Ultimate Study & Digital Wellbeing Platform

> **Live Web Application & Windows Desktop Companion**  
> Easily deployable to Vercel/Netlify as a live web client, with a dedicated standalone Windows Desktop Executable (`.exe`) package.

<div align="center">

[![Developer](https://img.shields.io/badge/Developer-SudhirDevOps1-cyan?style=for-the-badge&logo=github)](https://github.com/SudhirDevOps1)
[![Live Web Deploy](https://img.shields.io/badge/Deploy-Vercel%20%7C%20Netlify-emerald?style=for-the-badge&logo=vercel)](vercel.json)
[![Desktop App](https://img.shields.io/badge/Desktop%20App-Windows%20.exe-indigo?style=for-the-badge&logo=windows)](desktop-app/dist-electron)

</div>

---

## 🗂️ Project Structure

This repository is structured so that **the root folder serves as the Live Web App** (for instant Vercel/Netlify deployment), while **`desktop-app/` contains the Windows Desktop Executable Installer**.

```text
The-Ultimate-Master-Study-Tracker/
│
├── 🌐 (ROOT = Live Web Application for Vercel / Netlify Deployment)
│   ├── vercel.json                      # Vercel deployment configuration
│   ├── index.html                       # Web client entry point
│   ├── src/                             # Web Frontend components & state
│   ├── public/                          # Web assets, PWA icons, manifest
│   ├── START.bat                        # Windows 1-click launcher for Web + Python Backend
│   ├── backend.py                       # Optional Python script to bridge local PC screen-time
│   └── package.json                     # Web app dependencies & Vite bundler script
│
├── 🖥️ desktop-app/                      # Dedicated Windows Desktop Application Package
│   ├── electron.js                      # Main Electron engine (Win32 APIs, System Tray, Local Storage)
│   ├── win-tracker.exe                  # Compiled C# Win32 helper binary (0ms active window query)
│   ├── flowtrack_config.json            # Desktop runtime configuration
│   └── dist-electron/                   # Output folder containing FlowTrackPro Setup 1.0.0.exe
│
└── 📖 DOCUMENTATION
    ├── README.md                        # Front-page documentation & deployment guide
    └── APP_ARCHITECTURE_MANUAL.md         # Detailed technical operations manual
```

---

## 🚀 How to Deploy & Use

### 1. 🌐 Deploying Live Web App on Vercel
Since the web application resides directly in the root directory:
1. Connect your GitHub repository `SudhirDevOps1/The-Ultimate-Master-Study-Tracker` to **Vercel**.
2. Vercel will automatically detect `vercel.json` and build the live web application.
3. Your web app will be **LIVE instantly**!

### 2. 🖥️ Running / Installing Windows Desktop App
If you prefer a standalone desktop app that runs without internet:
1. Open the `desktop-app/dist-electron/` directory.
2. Run:
   ```text
   desktop-app\dist-electron\FlowTrackPro Setup 1.0.0.exe
   ```
3. The desktop installer will install FlowTrack Pro directly on your Windows PC with native System Tray support, freeze-proof study timers, and `win-tracker.exe` C# activity tracking.

### 3. 🐍 Web Client + Local Python PC Tracker (`START.bat`)
For users on the Web version who want to connect to their Windows PC's background process tracker:
1. Double-click `START.bat` in the root folder.
2. It launches `backend.py` on port `5001` and opens your browser.

---

## 👨‍💻 Developer & Credits

- **Developer:** **[SudhirDevOps1](https://github.com/SudhirDevOps1)**
- **Repository:** [The-Ultimate-Master-Study-Tracker](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker)

---

*FlowTrack Platform — Built for high-performance learning.*
