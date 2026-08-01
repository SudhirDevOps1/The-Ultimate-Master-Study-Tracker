<div align="center">

<img src="public/images/flowtrack-logo.png" alt="FlowTrack Pro Official App Logo" width="128" />

# 🚀 FlowTrack Pro (v7.1.0 — Encrypted Vault & Auto-Updater Edition)

### 💎 The Ultimate Master Study & Productivity Ecosystem — 2026 Edition

<img src="public/images/flowtrack-banner.png" alt="FlowTrack Pro Banner" width="100%" style="border-radius: 16px; margin: 16px 0;" />

**The professional-grade, AI-powered, strict study tracker built for relentless learners.**  
Engineered into **3 distinct operational categories**: Serverless Web App, Web App + Python Backend, and Standalone Windows Desktop App.

<p align="center">
  <img src="https://img.shields.io/badge/Release-v7.1.0-10B981?style=for-the-badge&logo=github&logoColor=white" alt="Release v7.1.0" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Vite-7.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 7.3" />
  <img src="https://img.shields.io/badge/Electron-43-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron 43" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

[🌐 Live Web Demo](https://the-ultimate-master-study-tracker.vercel.app/) • [📦 Download Latest Desktop Release](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/releases/latest) • [📖 Full System Architecture](docs/FULL_SYSTEM_GUIDE.md) • [📊 Analytics & Privacy Policy](docs/ANALYTICS_AND_TRACKING_POLICY.md) • [📬 Contact Support](#-official-developer-social-profiles)

</div>

---

## 📌 Quick Navigation Table of Contents

- [📸 Live Application Interface](#-live-application-interface)
- [👤 Author & Metadata](#-author--metadata)
- [🔗 Developer Social Profiles](#-official-developer-social-profiles)
- [✨ Key Features in v7.1.0](#-key-features-in-v710)
- [📂 Interlinked Repository Guides](#-interlinked-repository-guides)
- [📅 3-Category Operational Models](#-3-category-operational-models)
- [🖥️ System & Resource Requirements](#-system--resource-requirements)
- [🚀 How to Run Each Category](#-how-to-run-each-category)
  - [🌐 Category 1: Web App (Serverless)](#-category-1-web-app-no-backend)
  - [🐍 Category 2: Web App + Python Backend](#-category-2-web-app--python-backend)
  - [🖥️ Category 3: Standalone Desktop App (Electron)](#-category-3-standalone-desktop-app)
- [📜 License & Credits](#-license--credits)

---

## 📸 Live Application Interface

<div align="center">
  <img src="public/images/flowtrack-screenshot.png" alt="FlowTrack Pro Live Interface Showcase" width="100%" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5);" />
  <p><i>FlowTrack Pro v7.1.0 — Smart Study Timer, Encrypted Password Vault, Auto-Updater & In-App Web Browser</i></p>
</div>

---

## 👤 Author & Metadata

| Attribute | Specification & Official Link |
|:---|:---|
| 🖼️ **Official Brand Logo** | <img src="public/images/flowtrack-logo.png" width="48" height="48" /> **FlowTrack Brand Icon** ([view icon](public/images/flowtrack-logo.png)) |
| 👑 **Project Name** | **FlowTrack Pro** — The Ultimate Master Study Tracker |
| 🧑‍💻 **Lead Architect** | **Sudhir Singh** ([@SudhirDevOps1](https://github.com/SudhirDevOps1)) |
| 📦 **Release Version** | `v7.1.0` (2026 Edition) |
| ⚖️ **License** | [MIT Open Source License](LICENSE) |
| 🌐 **Live Web App** | [`https://the-ultimate-master-study-tracker.vercel.app/`](https://the-ultimate-master-study-tracker.vercel.app/) |
| 🐙 **Source Code Repository** | [`https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker`](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker) |
| 📥 **Latest Desktop Installers** | [`GitHub Releases`](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/releases/latest) |

---

## 🔗 Official Developer Social Profiles

Connect directly with the developer team & join the study ecosystem community:

<p align="left">
  <a href="https://github.com/SudhirDevOps1" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-SudhirDevOps1-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://www.linkedin.com/in/sudhirdevops1" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-Sudhir_DevOps-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="https://instagram.com/sudhirdevops1" target="_blank">
    <img src="https://img.shields.io/badge/Instagram-@sudhirdevops1-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" />
  </a>
  <a href="mailto:sudhirdevops1@gmail.com" target="_blank">
    <img src="https://img.shields.io/badge/Email-sudhirdevops1@gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
</p>

---

## ✨ Key Features in v7.1.0

### 🔐 1. Encrypted Password Vault & Proton Pass Auto-Fill
* 🔑 **Local Encrypted Vault:** Store logins for Apna College, PW, Coursera, YouTube, and course portals locally with XOR/Base64 obfuscated cipher encryption.
* ⚡ **1-Click Auto-Fill:** Glowing `🔑 Fill Login` button in browser address bar auto-injects saved credentials into portal login forms.

### 🔄 2. Background Silent Auto-Updater (`electron-updater`)
* 📦 **Automatic Updates:** Checks GitHub Releases silently 10 seconds after app launch.
* ⚡ **1-Click Restart & Install:** Downloads updates in background and provides a 1-click install button in Settings.

### 🛡️ 3. Anti-Cheat System Clock Guard & Security Hardening
* ⏱️ **Time Tampering Guard:** Prevents artificially advancing Windows system clock to gain fake study XP or complete sessions instantly.
* 🔒 **IPC Protocol Sanitization:** Enforces strict `http://`, `https://`, and `mailto:` protocol whitelists to prevent command execution vulnerabilities.

### 🌐 4. In-App Chromium Web Portals Browser Engine
* 🖥️ **Embedded Webview:** Access Apna College, PW, YouTube, and study sites without leaving FlowTrack Pro.
* 📊 **Webview Activity Tracking:** Automatically logs time spent on specific study domains (`apnacollege.in`, `youtube.com`) instead of logging FlowTrack itself.

### 🎬 5. Study Media Sandbox & Universal Local Media Engine
* ⚡ **Zero-CORS `local-media://` Protocol:** Plays local video and audio files from **ALL Windows Drive Letters (`C:\` to `Z:\`)** with zero security blocks.
* ⏸️ **Auto-Pause Sync:** Video and audio playback automatically pauses when the study timer is paused.

---

## 📂 Interlinked Repository Guides

Explore specific sub-documentation and guides according to your operational needs:

| Guide / Document | Location & Link | Purpose |
|:---|:---|:---|
| 🖥️ **Desktop App Guide** | [`desktop-app/README.md`](desktop-app/README.md) | Dedicated guide for Standalone Desktop App, Electron build, and Win32 hooks. |
| 🌐 **Web App Guide** | [`web-app/README.md`](web-app/README.md) | Guide for Serverless Web App deployment on Vercel and PWA offline storage. |
| 📊 **Analytics Policy & Specs** | [`docs/ANALYTICS_AND_TRACKING_POLICY.md`](docs/ANALYTICS_AND_TRACKING_POLICY.md) | Complete privacy policy, data storage locations, and active window tracking specs. |
| 📖 **Full System Architecture** | [`docs/FULL_SYSTEM_GUIDE.md`](docs/FULL_SYSTEM_GUIDE.md) | Deep technical architecture, IndexedDB schema, and C# Win32 helper details. |
| 📝 **Changelog & Releases** | [`CHANGELOG.md`](CHANGELOG.md) | Detailed version history from v1.0.0 to v7.1.0. |

---

## 📅 3-Category Operational Models

```
                                    ┌─────────────────────────────────────────┐
                                    │          🚀 FLOWTRACK PRO               │
                                    └────────────────────┬────────────────────┘
                                                         │
         ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
         ▼                                               ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│       🌐 CATEGORY 1             │             │       🐍 CATEGORY 2             │             │       🖥️ CATEGORY 3             │
│    Web App (Serverless CDN)     │             │    Web App + Python Backend     │             │     Standalone Desktop App      │
│  - Live on Vercel CDN           │             │  - Browser UI + backend.py      │             │  - Standalone Electron .exe     │
│  - 100% In-Browser IndexedDB    │             │  - OS Active Window Tracking    │             │  - Win32 Kernel Tracking        │
│  - Zero Install & Zero Signup   │             │  - SQLite Database Sync         │             │  - Password Vault & AutoUpdate  │
└─────────────────────────────────┘             └─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 🖥️ System & Resource Requirements

| Resource / Spec | 🌐 [Category 1: Web App](#-category-1-web-app-no-backend) | 🐍 [Category 2: Web App + Python](#-category-2-web-app--python-backend) | 🖥️ [Category 3: Desktop App](#-category-3-standalone-desktop-app) |
|:---|:---|:---|:---|
| 💻 **Target OS** | Any OS (Windows/Mac/Linux/iOS/Android) | Windows 10/11, macOS, Linux | Windows 10 (64-bit) / Windows 11 / macOS |
| ⚡ **Minimum RAM** | **512 MB** available RAM | **1 GB** RAM | **2 GB** available RAM |
| 🚀 **Recommended RAM**| **1 GB - 2 GB** RAM | **2 GB - 4 GB** RAM | **4 GB - 8 GB** RAM |
| 💾 **Disk Storage** | ~20 MB (IndexedDB cache) | ~100 MB (Python + SQLite) | ~150 MB App Installation |
| ⚙️ **Installation** | Zero Install (Browser / PWA) | Python 3.8+ (`START.bat` / `setup.sh`) | Double-click `.exe` installer |
| 🐍 **Python Needed?** | ❌ None | ✅ Required (`backend.py`) | ❌ **NONE** (Embedded C# binary) |

---

## 🚀 How to Run Each Category

### 🌐 Category 1: Web App (No Backend)
For quick web deployment or local serverless testing:
```bash
npm install
npm run dev
# Open http://localhost:5173 in any browser
```
👉 *Detailed Web App Documentation:* [`web-app/README.md`](web-app/README.md)

### 🐍 Category 2: Web App + Python Backend
For OS active window tracking in browser mode:
```bash
# Run backend tracker service
python backend.py

# In another terminal run web UI
npm run dev
```

### 🖥️ Category 3: Standalone Desktop App
For local active window tracking, Password Vault, & Auto-Updater without Python:
```bash
cd desktop-app
npm install
npm run electron:dev

# Build Portable Executables & Windows Installers (~150MB LZMA compressed)
npm run electron:build
```
👉 *Detailed Desktop App Documentation:* [`desktop-app/README.md`](desktop-app/README.md)

---

## 📜 License & Credits

Built with ❤️ by **Sudhir Singh** ([@SudhirDevOps1](https://github.com/SudhirDevOps1)).  
Licensed under the [MIT Open Source License](LICENSE).  
For issues, suggestions, or security disclosures, please reach out via [Support Email](mailto:sudhirdevops1@gmail.com) or file a [GitHub Issue](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/issues).
