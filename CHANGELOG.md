# 📜 FlowTrack Pro — Official Changelog & Release History

All notable changes, version updates, feature additions, architectural improvements, and bug fixes for **FlowTrack Pro** are documented in this file with exact timestamps and version tags.

---

## 🏷️ Version History Summary

- [v3.1.0 (2026-07-21)](#v310---2026-07-21) — 🖥️ Ultra-Smart Desktop Enhancements (Global OS Hotkeys, Always-On-Top Mini HUD & Windows Toast IPC)
- [v3.0.0 (2026-07-21)](#v300---2026-07-21) — 🚀 Master 3-Category Architecture & Full 14-Page Ecosystem Release
- [v2.1.0 (2026-07-20)](#v210---2026-07-20) — 🐍 Python REST Backend & SQLite WAL Database Integration
- [v2.0.0 (2026-07-19)](#v200---2026-07-19) — 🖥️ Standalone Electron Desktop App & Win32 C# Tracker Release
- [v1.0.0 (2026-07-15)](#v100---2026-07-15) — 🌐 Initial Serverless Web App Release

---

## [v3.1.0] — 2026-07-21

### 🖥️ Ultra-Smart Desktop Enhancements
- **⚡ Global System-Wide Hotkeys**:
  - Registered `CommandOrControl+Alt+P` OS hotkey to pause/resume study timer from any application across Windows.
- **🪟 Always-On-Top Floating HUD Mode**:
  - Added `toggle-always-on-top` IPC handler & connected to UI toggle switch inside Settings Page (`/settings`) to float study app over VS Code, Zoom, or PDF readers.
- **🚀 Windows Auto-Launch Startup Integration**:
  - Integrated `set-open-at-login` IPC for automatic background launch when Windows starts up.
- **🔔 Windows OS Toast Notifications**:
  - Added native Windows notification balloons for study session alerts and Pomodoro breaks.
- **🖼️ Hybrid PNG Notes Board Download Fix**:
  - Fixed PNG download logic in `src/pages/StudyNotesBoardPage.tsx` and `desktop-app/src/pages/StudyNotesBoardPage.tsx` to support both Web browser auto-downloads and Electron native `save-image-dialog` IPC dialogs.
- **🏷️ Production-Grade 500+ Global & Targeted Indian EdTech App Categorization Engine**:
  - Implemented `appCategorizer.ts` containing 500+ mapped Global & Indian EdTech apps (`Physics Wallah`, `Allen Digital`, `Unacademy`, `BYJU'S`, `Vedantu`, `Adda247`, `Testbook`, `Drishti IAS`, `Vision IAS`, `NextIAS`, `Scaler`, `Coding Ninjas`, `Chai aur Code`, `Gate Smashers`, `Striver TakeUForward`, `Apna College`, `CodeWithHarry`), developer IDEs (`VSCodium`, `Cursor`, `Windsurf`, `Zed`, `PyCharm`), terminals (`PowerShell`, `cmd`, `Antigravity`, `Warp`), AI coaching, and streaming apps.

---

## [v3.0.0] — 2026-07-21

### 🚀 Major Architectural Milestones
- **3 Operational Categories Model Formalized**:
  - **Category 1**: Web App Serverless PWA ([Live Vercel Link](https://the-ultimate-master-study-tracker.vercel.app/)).
  - **Category 2**: Web App + Python Backend (`START.bat` / `setup.sh` @ `http://localhost:5001`).
  - **Category 3**: Standalone Windows Desktop App (`/desktop-app` Electron 43 + `win-tracker.exe` Win32 C# binary).

### ✨ Added Features & Modules (Web App & Desktop App)
- **📖 PDF & WebAssembly Tesseract OCR Reader (`/study-workspace`)**:
  - In-browser PDF rendering via `pdfjs-dist@6.1.200`.
  - Offline text OCR scanning via pure WebAssembly `tesseract.js@7.0.0`.
  - Speech synthesis playback via `window.speechSynthesis`.
- **📝 Multi-Language Sticky Notes Kanban Board (`/notes-board`)**:
  - Drag-and-drop sticky notes board with 7 color themes.
  - Native Devanagari typography support (*Rozha One*, *Yatra One*, *Poppins*, *Kurale*).
  - One-click PNG image export via `html2canvas@1.4.1`.
- **📅 Today's Tasks Dashboard (`/today`)**:
  - Daily focus planner with progress ring completion percentage.
  - Session status buckets (Active 🔵, Completed ✅, Planned 📋, Paused ⏸️).
- **🖥️ App Tracking & Distraction Shield (`/app-tracking`)**:
  - Active application process breakdown.
  - Distraction Blocker panel synced with Python backend config (`http://localhost:5001/config`).
- **🎙️ Hands-Free Voice-Controlled Timer (`useVoiceTimer.ts`)**:
  - Native Web Speech Recognition hook for hands-free voice commands ("Pause", "Resume", "Finish").
- **🎨 Lucide Vector Icons UI Engine**:
  - Replaced text emojis with clean, high-precision SVG Lucide icons across navigation bars and header cards.

### 🐛 Bug Fixes & Stability Enhancements
- **🔒 Desktop App Single Instance Lock**:
  - Added `app.requestSingleInstanceLock()` in `electron.js` to prevent double-launch process collisions and JSON log write corruption.
- **🪟 Windows System Tray Disposal**:
  - Clean tray icon disposal on application exit.

---

## [v2.1.0] — 2026-07-20

### ✨ Python Daemon & REST API
- Created multi-threaded Python backend (`backend.py`) running on port `5001`.
- Integrated SQLite database (`app_tracker.db`) with Write-Ahead Logging (`PRAGMA journal_mode=WAL;`).
- Added REST endpoints for active window tracking (`/active-window`), session logs (`/sessions`), and CSV/JSON exports (`/export`).
- Created one-click Windows launchers (`START.bat`, `start_backend_only.bat`) and Unix launchers (`setup.sh`, `start_backend_only.sh`).

---

## [v2.0.0] — 2026-07-19

### 🖥️ Electron Desktop Release
- Initialized Standalone Electron 43 desktop application inside `/desktop-app`.
- Embedded precompiled C# Win32 binary (`win-tracker.exe`) for $<5\text{ ms}$ foreground process title logging.
- Integrated Windows System Tray minimization & Dual-Layer Inactivity Detector (`GetLastInputInfo`).

---

## [v1.0.0] — 2026-07-15

### 🌐 Initial Web Release
- Initial release of FlowTrack Web Edition built with React 19, Vite 6, Tailwind CSS v4, and Dexie.js (IndexedDB).
- Implemented core study timer, Pomodoro cycle engine, subject manager, and analytics charts.

---

## 🔗 Bound Documentation Links

- 🏠 **Master Entry Gateway**: [Root README.md](README.md)
- 🌐 **Web App Manual**: [web-app/README.md](web-app/README.md)
- 🖥️ **Desktop App Manual**: [desktop-app/README.md](desktop-app/README.md)
- 📑 **Full System Technical Guide**: [docs/FULL_SYSTEM_GUIDE.md](docs/FULL_SYSTEM_GUIDE.md)
- 🗺️ **Future Evolution Roadmap**: [docs/FUTURE_ROADMAP.md](docs/FUTURE_ROADMAP.md)

---
*© 2026 FlowTrack Pro Ecosystem · Lead Architect: Sudhir Singh (@SudhirDevOps1) · MIT License.*
