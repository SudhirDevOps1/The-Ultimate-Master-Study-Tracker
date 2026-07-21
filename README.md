<!-- ╔══════════════════════════════════════════════════════════════════╗ -->
<!-- ║           FlowTrack Pro — Master README.md                      ║ -->
<!-- ║     github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker  ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════╝ -->

<div align="center">

<img src="public/images/flowtrack-banner.png" alt="FlowTrack Pro Banner" width="100%" />

<br/>

# 🚀 FlowTrack Pro (v3.0.0)

### The Ultimate Master Study & Productivity Ecosystem — 2026 Edition

**The professional-grade, AI-powered, strict study tracker built for relentless learners.**
Engineered as a multi-platform suite featuring a **Live Web Application (Vercel)** and a **Standalone Windows Desktop Application (Electron)**.

<br/>

[![Live Web Demo](https://img.shields.io/badge/🌐%20LIVE%20WEB%20DEMO-the--ultimate--master--study--tracker-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://the-ultimate-master-study-tracker.vercel.app/)
&nbsp;&nbsp;
[![GitHub Repo](https://img.shields.io/badge/📦%20Source%20Code-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker)

<br/>

[![Web App README](https://img.shields.io/badge/🌐%20Web%20App%20Manual-web--app%2FREADME.md-green?style=for-the-badge&logo=vercel)](web-app/README.md)
&nbsp;&nbsp;
[![Desktop App README](https://img.shields.io/badge/🖥️%20Desktop%20App%20Manual-desktop--app%2FREADME.md-purple?style=for-the-badge&logo=electron)](desktop-app/README.md)
&nbsp;&nbsp;
[![Full Technical Manual](https://img.shields.io/badge/📑%20Full%20System%20Guide-docs%2FFULL__SYSTEM__GUIDE.md-blueviolet?style=for-the-badge&logo=markdown)](docs/FULL_SYSTEM_GUIDE.md)

</div>

---

## 👤 Author & Project Metadata

| Attribute | Specification |
|:---|:---|
| **Project Name** | FlowTrack Pro — The Ultimate Master Study Tracker |
| **Creator / Lead Architect** | **Sudhir Singh** ([@SudhirDevOps1](https://github.com/SudhirDevOps1)) |
| **Version** | v3.0.0 (2026 Edition) |
| **License** | MIT Open Source License |
| **Live Web App** | [`https://the-ultimate-master-study-tracker.vercel.app/`](https://the-ultimate-master-study-tracker.vercel.app/) |
| **Source Repository** | [`https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git`](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git) |

---

## 📑 Bound Documentation Suite Graph

All documentation within this repository is bidirectionally linked:

```
                                ┌───────────────────────────────┐
                                │        Root README.md         │
                                │   (Ecosystem Master Gateway)  │
                                └───────────────┬───────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌─────────────────────────┐        ┌─────────────────────────┐        ┌─────────────────────────┐
│    web-app/README.md    │ ◄────► │docs/FULL_SYSTEM_GUIDE.md│ ◄────► │  desktop-app/README.md  │
│(Web & PWA Architecture) │        │ (Production Tech Manual)│        │(Windows Native Electron)│
└─────────────────────────┘        └─────────────────────────┘        └─────────────────────────┘
```

---

## 🖥️ System & Resource Requirements (Web vs Desktop)

| Component | 🌐 Web Application | 🖥️ Standalone Desktop Application |
|:---|:---|:---|
| **Target OS** | Any (Windows, macOS, Linux, iOS, Android) | Windows 10 (64-bit) / Windows 11 |
| **Minimum RAM** | **512 MB** available RAM | **2 GB** available RAM |
| **Recommended RAM** | **1 GB - 2 GB** RAM | **4 GB - 8 GB** RAM |
| **Storage Overhead** | ~20 MB (IndexedDB cache) | ~300 MB App Installation + Logs |
| **CPU Requirement** | Dual-Core 1.5 GHz | Dual-Core 2.0 GHz (Intel i3 / Ryzen 3) |
| **Python Needed?** | Optional (`backend.py`) for active window tracking | **NONE** (Uses native embedded `win-tracker.exe`) |
| **Browser Version** | Chrome 110+, Edge 110+, Safari 16+, Firefox 115+ | Embedded Chromium (Electron 43) |

---

## 📊 Feature Comparison Matrix

| Feature Module | 🌐 Web App (Vercel Live) | 🌐 Web App + Python Daemon | 🖥️ Standalone Desktop App |
|:---|:---:|:---:|:---:|
| **Installation Required** | Zero (Browser / PWA) | Python 3.8+ Setup | Double-click `.exe` installer |
| **Data Storage Engine** | Browser IndexedDB | IndexedDB + SQLite | `%AppData%\FlowTrackPro` |
| **Navigable Pages** | 10 Pages | 10 Pages | **14 Pages** (4 Desktop Exclusive) |
| **Study Target Timer** | Delta Hardware Clock | Delta Hardware Clock | Delta Hardware Clock |
| **Pomodoro Engine** | Timestamp-based | Timestamp-based | Timestamp-based (Freeze-proof) |
| **AI Study Coach** | Ollama / WebLLM | Ollama / WebLLM | Ollama / WebLLM |
| **Foreground App Tracker** | ❌ | ✅ `http://localhost:5001` | ✅ Native Win32 (`win-tracker.exe`) |
| **System Tray Background Run** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **Dual-Layer Inactivity Engine** | DOM Events | DOM Events | ✅ **Desktop Exclusive** (Win32 + DOM) |
| **Auto-Resume on Mouse Move** | Manual | Manual | ✅ **Desktop Exclusive** |
| **Today's Tasks (`/today`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **PDF OCR Reader (`/study-workspace`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **Sticky Notes Board (`/notes-board`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |
| **24-Hr Gantt Chart (`/app-tracking`)** | ❌ | ❌ | ✅ **Desktop Exclusive** |

---

## 🚀 How to Load & Run Locally

### 🌐 Running Web App Edition
```bash
# 1. Clone repo
git clone https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git
cd The-Ultimate-Master-Study-Tracker

# 2. Install dependencies
npm install

# 3. Launch Vite local server
npm run dev
# Open http://localhost:5173
```

*(Optional Python Daemon for Web App)*:
- **🪟 Windows**: `START.bat` or `start_backend_only.bat`
- **🍎 macOS / Linux**: `chmod +x setup.sh && ./setup.sh` or `chmod +x start_backend_only.sh && ./start_backend_only.sh`
- **🛠️ Manual CLI**: `pip install psutil && python backend.py`

---

### 🖥️ Running Desktop App Edition
```bash
# 1. Open desktop directory
cd desktop-app

# 2. Install dependencies
npm install

# 3. Run Development Mode (Vite + Electron)
npm run electron:dev

# 4. Package Windows .exe Installer
npm run electron:build
```

---

## 🛠️ Unified Technology Stack

- **Core**: React 19, TypeScript 5.7, Vite 6, Tailwind CSS v4
- **State & Database**: Zustand 5.0, Dexie.js (IndexedDB)
- **Desktop Wrapper**: Electron 43, electron-builder 26, `win-tracker.exe` (Win32 C#)
- **OCR & Media**: Tesseract.js (WASM), PDF.js (`pdfjs-dist`), Web Speech Synthesis
- **Deployment**: Vercel CDN ([the-ultimate-master-study-tracker.vercel.app](https://the-ultimate-master-study-tracker.vercel.app/))

---

## 📖 Complete Manual Links

- 🌐 **Web App Detailed Manual**: [`web-app/README.md`](web-app/README.md)
- 🖥️ **Desktop App Detailed Manual**: [`desktop-app/README.md`](desktop-app/README.md)
- 📑 **Full Technical Guide & Analysis**: [`docs/FULL_SYSTEM_GUIDE.md`](docs/FULL_SYSTEM_GUIDE.md)

---

<div align="center">

**Engineered by Sudhir Singh (@SudhirDevOps1)** · FlowTrack Pro v3.0.0 (2026 Edition) · MIT License

</div>
