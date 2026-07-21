<!-- ╔══════════════════════════════════════════════════════════════════╗ -->
<!-- ║       FlowTrack Pro — Web Application Edition README.md          ║ -->
<!-- ║   github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker   ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════╝ -->

<div align="center">

# 🌐 FlowTrack Pro — Live Web Application Edition

### Production-Grade AI-Powered Study & Time Tracker

**The official Web & Progressive Web App (PWA) edition of FlowTrack Pro.**
Built with React 19, Vite 6, TypeScript 5.7, Tailwind CSS v4, and Dexie.js (IndexedDB).
Deployed live on Vercel with zero mandatory backend servers.

<br/>

[![Live Web App](https://img.shields.io/badge/🔴%20LIVE%20WEB%20APP-Click%20Here-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://the-ultimate-master-study-tracker.vercel.app/)
&nbsp;&nbsp;
[![GitHub Repo](https://img.shields.io/badge/📦%20Source%20Code-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker)

<br/>

[![Master Root README](https://img.shields.io/badge/🏠%20Root%20README-README.md-blue?style=for-the-badge&logo=readme)](../README.md)
&nbsp;&nbsp;
[![Desktop App README](https://img.shields.io/badge/🖥️%20Desktop%20App%20README-desktop--app%2FREADME.md-purple?style=for-the-badge&logo=electron)](../desktop-app/README.md)
&nbsp;&nbsp;
[![Future Roadmap](https://img.shields.io/badge/🗺️%20Future%20Roadmap-docs%2FFUTURE__ROADMAP.md-orange?style=for-the-badge&logo=markdown)](../docs/FUTURE_ROADMAP.md)

</div>

---

## 📋 Table of Contents

- [👤 Project Metadata & Author](#-project-metadata--author)
- [🖥️ System & Resource Requirements](#%EF%B8%8F-system--resource-requirements)
- [✨ Core Web Features (10 Pages)](#-core-web-features-10-pages)
- [🚀 How to Load & Run Web App Locally](#-how-to-load--run-web-app-locally)
- [🐍 Python Backend Integration (`backend.py`)](#-python-backend-integration-backendpy)
- [☁️ Vercel Deployment Guide](#%EF%B8%8F-vercel-deployment-guide)
- [🛠️ Technology Stack](#%EF%B8%8F-technology-stack)
- [💾 Data Storage Architecture](#-data-storage-architecture)

---

## 👤 Project Metadata & Author

| Metadata | Details |
|:---|:---|
| **Application Name** | FlowTrack Pro (Web Edition) |
| **Creator / Author** | **Sudhir Singh** ([@SudhirDevOps1](https://github.com/SudhirDevOps1)) |
| **Version** | v3.0.0 (2026 Edition) |
| **License** | MIT License — Free & Open Source Forever |
| **Live Production URL** | [`https://the-ultimate-master-study-tracker.vercel.app/`](https://the-ultimate-master-study-tracker.vercel.app/) |
| **GitHub Repository** | [`https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git`](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git) |

---

## 🆕 Recent Web App Enhancements

| Feature Added | Technical Detail |
|:---|:---|
| 📖 **PDF & WASM Tesseract OCR Reader** | Render PDFs (`pdfjs-dist`) & scan text offline (`tesseract.js`) with Web Speech TTS playback |
| 📝 **Sticky Notes Kanban Board** | Interactive notes board with Hindi typography (*Rozha One*, *Yatra One*) & `html2canvas` PNG export |
| 📅 **Today's Tasks Dashboard** | Daily planner page with progress ring calculation & session status buckets |
| 🎙️ **Voice-Controlled Timer** | Hands-free voice timer commands (`useVoiceTimer.ts`) for Web browsers |
| 🛡️ **Distraction Blocker** | Site blocking panel synced with Python backend config (`http://localhost:5001/config`) |

## 🖥️ System & Resource Requirements

The Web App runs entirely inside modern web browsers with minimal hardware overhead:

| Component | Minimum Requirement | Recommended Specification |
|:---|:---|:---|
| **Operating System** | Windows 10/11, macOS, Linux, Android, iOS | Any OS with modern browser |
| **RAM / Memory** | **512 MB** available RAM | **1 GB - 2 GB** RAM |
| **CPU / Processor** | Dual-core 1.5 GHz | Quad-core 2.0 GHz+ |
| **Disk Storage** | 20 MB (Browser Cache & IndexedDB) | 100 MB |
| **Browser Compatibility** | Google Chrome 110+, Microsoft Edge 110+, Brave, Firefox 115+, Safari 16+ | Chrome 120+ / Edge 120+ |
| **Network** | Offline First (Initial load requires internet) | Internet required for optional Cloud Sync / Vercel CDN |

---

## ✨ Core Web Features (10 Pages)

1. 🏠 **Dashboard (`/dashboard`)**: Daily progress ring, XP level system, 90-day streak heatmap, weekly bar chart summaries, and active subject rank.
2. ⏱️ **Timer Center (`/timer`)**: Precision target study timer using hardware delta clocking (`Date.now()`), Pomodoro cycle engine (25m/5m/15m), and Picture-in-Picture floating widget.
3. 📊 **Analytics (`/analytics`)**: Recharts multi-axis performance graphs, subject mastery distribution, and planned vs actual attachment ratios.
4. 🗓️ **Session History (`/history`)**: Comprehensive filterable study logs with one-click cloning and date shifting.
5. 📚 **Subject Customization (`/subjects`)**: Create subjects with custom emojis, HEX colors, and weekly study hour goals.
6. 🗺️ **Calendar View (`/calendar`)**: Drag-and-drop session rescheduling across monthly and yearly calendar grids.
7. 🏆 **Achievements & Ranks (`/achievements`)**: Unlock milestone badges (Novice Seeker → Flow Sovereign) based on total XP and streaks.
8. ⚙️ **Settings & Backup (`/settings`)**: Customize themes (Ocean, Forest, Sunset, Galaxy, Neon, Paper), configure goals, and export/import full JSON & CSV backups.
9. 📖 **In-App Guide (`/guide`)**: Complete visual walkthrough of all productivity mechanics.
10. 🤖 **AI Study Coach (`/ai`)**: Local on-device AI assistant connecting to Ollama (`http://localhost:11434`) or WebLLM in-browser.

---

## 🚀 How to Load & Run Web App Locally

### Step 1: Clone Repository
```bash
git clone https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git
cd The-Ultimate-Master-Study-Tracker
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Run Local Development Server
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:5173`**.

### Step 4: Production Build Test
```bash
npm run build
```
Generates optimized static assets inside the `dist/` directory.

---

## 🐍 Python Backend Integration (`backend.py`)

While the Web App runs 100% serverless on Vercel using IndexedDB, you can optionally run a local Python background daemon (`backend.py`) to enable **Foreground Active Window Tracking** on Windows, macOS, or Linux.

```
[Vercel Hosted Web App]                                 [Local Computer]
https://the-ultimate-master-study-tracker.vercel.app   backend.py (Python Server @ Port 5001)
         │                                                        │
         ├── Stores study sessions in IndexedDB                  ├── Detects focused window via win32gui/psutil
         │                                                        │
         └── Polls every 5s ────────────────────────────────────► └── CORS-enabled REST API
             GET http://localhost:5001/active-window                  Returns: { "title": "VS Code", "process": "Code.exe" }
```

### Running Python Backend:

#### 🪟 Windows Launchers:
- **`START.bat`**: One-click setup (checks Node, Python, creates venv, starts backend & opens web app).
- **`start_backend_only.bat`**: Starts only the Python backend service on port 5001.

#### 🍎 macOS / Linux Launchers:
- **`./setup.sh`**: Cross-platform bash setup script.
- **`./start_backend_only.sh`**: Starts backend daemon on macOS/Linux.

#### 🛠️ Manual CLI:
```bash
pip install psutil
python backend.py
```
- **Port**: `5001` (Default)
- **Features Enabled**: Active window title badge on Web Dashboard, process usage tracking, and automated process blocklists.

---

## ☁️ Vercel Deployment Guide

The Web App is pre-configured for one-click deployment on Vercel using `vercel.json`:

1. Push your code to GitHub.
2. Import repository into [Vercel Dashboard](https://vercel.com).
3. **Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**. Vercel will host your app on global CDN edge networks.

---

## 🛠️ Technology Stack

| Technology | Role / Purpose | Version |
|:---|:---|:---|
| **React** | User Interface Framework | 19.2.3 |
| **TypeScript** | Type Safety & Structural Contracts | 5.9.3 |
| **Vite** | Build Tool & Dev Server | 7.2.4 |
| **Tailwind CSS** | Utility-First Glassmorphism Styling | v4.1.17 |
| **Dexie.js** | IndexedDB Wrapper | 4.3.0 |
| **Zustand** | Global State Management | 5.0.11 |
| **Framer Motion** | Micro-Animations & Page Transitions | 12.35.0 |
| **Recharts** | Analytical Visualizations | 3.8.0 |

---

## 💾 Data Storage Architecture

- **Primary Store**: Browser `IndexedDB` (Database Name: `FlowTrackDB`).
- **Privacy Standard**: Zero cloud uploads. Data never leaves your machine unless you enable optional cloud sync or export JSON backups manually.

---

## 📜 Acknowledgments & Third-Party Credits

FlowTrack Pro Web Edition gratefully acknowledges the following core open-source projects:

- **React 19** ([react.dev](https://react.dev/)): UI Engine
- **Dexie.js** ([dexie.org](https://dexie.org/)): IndexedDB Storage Engine
- **PDF.js** ([mozilla.github.io/pdf.js](https://mozilla.github.io/pdf.js/)): Web PDF Renderer
- **Tesseract.js** ([tesseract.projectnaptha.com](https://tesseract.projectnaptha.com/)): Pure WebAssembly OCR Engine
- **html2canvas** ([html2canvas.hertzen.com](https://html2canvas.hertzen.com/)): Kanban PNG Exporter
- **Lucide Icons** ([lucide.dev](https://lucide.dev/)): Vector UI Icons
- **Recharts** ([recharts.org](https://recharts.org/)): Analytics Charts

---

<div align="center">

**[View Master Ecosystem README →](../README.md)** &nbsp;|&nbsp; **[View Desktop App README →](../desktop-app/README.md)**

</div>
