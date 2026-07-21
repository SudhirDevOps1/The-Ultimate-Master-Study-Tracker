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
Engineered into **3 distinct operational categories**: Serverless Web App, Web App + Python Backend, and Standalone Windows Desktop App.

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
&nbsp;&nbsp;
[![Future Roadmap](https://img.shields.io/badge/🗺️%20Future%20Roadmap-docs%2FFUTURE__ROADMAP.md-orange?style=for-the-badge&logo=markdown)](docs/FUTURE_ROADMAP.md)

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

## 🆕 Latest Project Updates & Enhancements

| Component | Recent Feature / Bugfix Added | Status |
|:---|:---|:---:|
| 🖥️ **Desktop App** | **Single Instance Lock**: Added `app.requestSingleInstanceLock()` in `electron.js` to prevent double-launch collisions and log corruptions | ✅ Shipped |
| 🌐 **Web App** | **PDF & Tesseract WASM OCR Reader**: Integrated local WASM OCR text scanner (`pdfjs-dist` + `tesseract.js`) and Text-to-Speech playback | ✅ Shipped |
| 📝 **Web App** | **Sticky Notes Kanban Board**: Added Kanban board with Hindi typography support (`Rozha One`, `Yatra One`, `Poppins`) & PNG export | ✅ Shipped |
| 📅 **Web App** | **Today's Tasks Dashboard**: Added daily planner dashboard with progress ring calculation | ✅ Shipped |
| 🎙️ **Web App** | **Hands-Free Voice-Controlled Timer**: Integrated Web Speech Recognition hook (`useVoiceTimer.ts`) for voice timer commands | ✅ Shipped |
| 🛡️ **Web App** | **Focus Shield Distraction Blocker**: Integrated Web site blocking panel connected to Python backend config (`http://localhost:5001/config`) | ✅ Shipped |
| 🎨 **Web & Desktop** | **Lucide Vector Icons Engine**: Upgraded all navigation links and header cards from string emojis to clean, high-precision SVG Lucide Vector Icons | ✅ Shipped |

FlowTrack Pro can be used in **3 distinct modes**:

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

## 🖥️ System & Resource Requirements (3 Modes)

| Resource / Spec | 🌐 Category 1: Web App (No Backend) | 🐍 Category 2: Web App + Python | 🖥️ Category 3: Desktop App (Electron) |
|:---|:---|:---|:---|
| **Target OS** | Any OS (Windows/Mac/Linux/iOS/Android) | Windows 10/11, macOS, Linux | Windows 10 (64-bit) / Windows 11 |
| **Minimum RAM** | **512 MB** available RAM | **1 GB** RAM | **2 GB** available RAM |
| **Recommended RAM**| **1 GB - 2 GB** RAM | **2 GB - 4 GB** RAM | **4 GB - 8 GB** RAM |
| **Disk Storage** | ~20 MB (IndexedDB cache) | ~100 MB (Python + SQLite) | ~300 MB App Installation |
| **Installation** | Zero Install (Browser / PWA) | Python 3.8+ (`START.bat` / `setup.sh`) | Double-click `.exe` installer |
| **Python Needed?** | ❌ None | ✅ Required (`backend.py`) | ❌ **NONE** (Embedded C# binary) |

---

## 📊 3-Category Feature Comparison Matrix

| Feature Module | 🌐 Category 1: Web App (No Backend) | 🐍 Category 2: Web App + Python | 🖥️ Category 3: Desktop App (Electron) |
|:---|:---:|:---:|:---:|
| **Navigable Pages** | 14 Pages | 14 Pages | 14 Pages |
| **Study Target Timer** | Delta Hardware Clock | Delta Hardware Clock | Delta Hardware Clock |
| **Pomodoro Engine** | Timestamp-based | Timestamp-based | Timestamp-based (Freeze-proof) |
| **AI Study Coach** | Ollama / WebLLM | Ollama / WebLLM | Ollama / WebLLM |
| **Active App Tracker** | ❌ | ✅ `http://localhost:5001` | ✅ Native Win32 (`win-tracker.exe`) |
| **System Tray Run** | ❌ | ❌ | ✅ **Category 3 Exclusive** |
| **Dual-Layer Inactivity** | DOM Events | DOM Events | ✅ **Category 3 Exclusive** (Win32 + DOM) |
| **Auto-Resume Timer** | Manual | Manual | ✅ **Category 3 Exclusive** |
| **Today's Tasks (`/today`)** | ✅ Progress Ring | ✅ Progress Ring | ✅ Progress Ring |
| **PDF OCR Reader (`/study-workspace`)** | ✅ WASM OCR | ✅ WASM OCR | ✅ WASM OCR |
| **Sticky Notes Board (`/notes-board`)** | ✅ Hindi Fonts & PNG | ✅ Hindi Fonts & PNG | ✅ Hindi Fonts & PNG |

---

## 🚀 How to Run Each Category

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

## 📖 Complete Manual Links

- 🌐 **Web App Detailed Manual**: [`web-app/README.md`](web-app/README.md)
- 🖥️ **Desktop App Detailed Manual**: [`desktop-app/README.md`](desktop-app/README.md)
- 📑 **Full Technical Guide & 3-Category Architecture**: [`docs/FULL_SYSTEM_GUIDE.md`](docs/FULL_SYSTEM_GUIDE.md)
- 🗺️ **Future Evolution Roadmap**: [`docs/FUTURE_ROADMAP.md`](docs/FUTURE_ROADMAP.md)

---

## 📜 Acknowledgments & Third-Party Credits

FlowTrack Pro is built upon the incredible work of the open-source community. We gratefully acknowledge the following core technologies, libraries, and assets:

| Technology / Library | Purpose / Usage | License | Link |
|:---|:---|:---:|:---|
| **React 19** | User Interface Engine | MIT | [react.dev](https://react.dev/) |
| **Electron 43** | Windows Native Application Container | MIT | [electronjs.org](https://www.electronjs.org/) |
| **Vite 6** | Frontend Bundler & HMR Server | MIT | [vite.dev](https://vite.dev/) |
| **Tailwind CSS v4** | Utility-First Styling System | MIT | [tailwindcss.com](https://tailwindcss.com/) |
| **Dexie.js** | IndexedDB Local Database Wrapper | Apache 2.0 | [dexie.org](https://dexie.org/) |
| **Tesseract.js** | Pure WebAssembly OCR Engine | Apache 2.0 | [tesseract.projectnaptha.com](https://tesseract.projectnaptha.com/) |
| **PDF.js (`pdfjs-dist`)** | In-Browser PDF Rendering Engine | Apache 2.0 | [mozilla.github.io/pdf.js](https://mozilla.github.io/pdf.js/) |
| **html2canvas** | HTML/Kanban Canvas Image Exporter | MIT | [html2canvas.hertzen.com](https://html2canvas.hertzen.com/) |
| **Lucide React** | UI Vector Icon System | ISC | [lucide.dev](https://lucide.dev/) |
| **Recharts** | Data Analytics & Heatmap Charts | MIT | [recharts.org](https://recharts.org/) |
| **Framer Motion** | Micro-Animations & Page Transitions | MIT | [motion.dev](https://motion.dev/) |
| **Zustand** | Global State Management Store | MIT | [zustand-demo.pmnd.rs](https://zustand-demo.pmnd.rs/) |
| **Google Fonts** | Hindi & English Typography (*Rozha One*, *Yatra One*, *Poppins*, *Kurale*) | OFL | [fonts.google.com](https://fonts.google.com/) |
| **psutil & pywin32** | Python OS Process & Win32 API Bindings | BSD / PSF | [github.com/giampaolo/psutil](https://github.com/giampaolo/psutil) |

---

<div align="center">

**Engineered by Sudhir Singh (@SudhirDevOps1)** · FlowTrack Pro v3.0.0 (2026 Edition) · MIT License

</div>
