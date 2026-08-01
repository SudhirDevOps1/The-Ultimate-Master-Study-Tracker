# 📜 FlowTrack Pro — Official Changelog & Release History

All notable changes, version updates, feature additions, architectural improvements, and bug fixes for **FlowTrack Pro** are documented in this file with exact timestamps and version tags.

---

## 🏷️ Version History Summary

- [v7.2.0 (2026-08-01)](#v720---2026-08-01) — 🎨 New 3D App Icon, 🚀 Repository Optimization (~13MB Cleaned), 🔐 Password Vault & Auto-Updater
- [v7.1.0 (2026-08-01)](#v710---2026-08-01) — 🔐 Encrypted Password Vault, 🔄 Silent Auto-Updater, 🛡️ Anti-Cheat Clock Guard, 🎨 3D Brand Logo
- [v7.0.0 (2026-07-31)](#v700---2026-07-31) — 🌐 Web Portals Browser, Fullscreen Study Mode, Webview Activity Tracking, Bug Audit

---

## [v7.2.0] — 2026-08-01

### 📌 Study Notes & Saved Documents Suite Overhaul
- **👁️ Live Rendered Markdown Preview & 3-Way Split View**: Added a 3-way view mode switcher allowing users to toggle between `✏️ Edit`, `👁️ Live Preview` (styled HTML rendered markdown), and `⚖️ Split View` (editor + live preview side-by-side as you type).
- **📝 Multiple Saved Named Documents (Google Notes Style)**: Added a document manager sidebar where users can create, title, search, pin, edit, copy, and export multiple named notepad documents (e.g., `📖 Physics Formulas`, `📝 Daily Study Journal`). All documents auto-save in real-time to app database!
- **⚡ Quick Formatting & Live Stats**: Added quick markdown toolbar (Bold, Italic, Headings, Bullet Lists, Checkbox Tasks, Code blocks) with live word count and character count stats.
- **📌 Sticky Board (Google Keep Style)**: Preserved visual color-coded sticky notes board with title, subject tag, background themes, image attachments, 1-click text copy, pin to top, search, and PNG board export.

### 🎨 Brand New 3D Glassmorphism Logo & Assets
- **New Official App Icon**: High-res 3D Glassmorphism squircle app icon updated across Desktop App titlebar, system tray, Taskbar, Web App favicon, and GitHub README docs.
- **Titlebar Native Scaling**: Added `getAppIcon()` native scaling helper in `electron.js` for 100% crisp titlebar icon rendering on Windows 10/11.

### 🧹 Repository & Build Size Cleanup (~13 MB Saved)
- **Eliminated Duplicate Image Bloat**: Removed 8 MB of duplicate banner and screenshot images from sub-packages (`desktop-app/public/images/`, `web-app/public/images/`).
- **Removed Unused Video Files**: Deleted ~5 MB of obsolete sample video files (`video1.mp4`, `video2.mp4`) and redundant root setup scripts.
- **Dedicated Modular Documentation**: Replaced duplicated full READMEs with specialized sub-package guides for `desktop-app` and `web-app`.

### 🎬 Media Sandbox Auto-Pause Sync
- **Timer Pause Hook**: Local video and audio playback automatically pauses when the study timer is paused or completed.

- [v6.0.0 (2026-07-31)](#v600---2026-07-31) — 🚀 2026 Master Release: Excalidraw Canvas, Real Notepad, Dual PDF/OCR Engine, Fast Release Pipeline
- [v5.4.0 (2026-07-31)](#v540---2026-07-31) — 🛠️ Production Blank Screen Resolution & IPC Preload Security Overhaul
- [v5.3.0 (2026-07-30)](#v530---2026-07-30) — 🎨 Excalidraw, Secure Preload contextBridge, Brand Badges & Spam Delays
- [v5.1.0 (2026-07-29)](#v510---2026-07-29) — 📱 Framework7 v9.1.1 Look, Live Loop & OCR Decks Integration
- [v3.2.0 (2026-07-21)](#v320---2026-07-21) — 🐛 Critical Tracking Fix, App Data Import/Export, Friendly App Names
- [v3.1.0 (2026-07-21)](#v310---2026-07-21) — 🖥️ Ultra-Smart Desktop Enhancements (Global OS Hotkeys, Always-On-Top Mini HUD & Windows Toast IPC)
- [v3.0.0 (2026-07-21)](#v300---2026-07-21) — 🚀 Master 3-Category Architecture & Full 14-Page Ecosystem Release
- [v2.1.0 (2026-07-20)](#v210---2026-07-20) — 🐍 Python REST Backend & SQLite WAL Database Integration
- [v2.0.0 (2026-07-19)](#v200---2026-07-19) — 🖥️ Standalone Electron Desktop App & Win32 C# Tracker Release
- [v1.0.0 (2026-07-15)](#v100---2026-07-15) — 🌐 Initial Serverless Web App Release

---

## [v7.0.0] — 2026-07-31

### 🌐 Web Portals Browser (New Page)
- **Dedicated In-App Browser Page**: Brand new `WebPortalsPage.tsx` with Electron `<webview>` Chromium engine — load any website (Apna College, YouTube, PW, Coursera, ChatGPT, GitHub, etc.) inside the app without leaving FlowTrack.
- **12 Preset Portal Cards**: Course portals (Apna College, PW, Coursera, Udemy, Khan Academy, Unacademy), Video (YouTube), Dev Tools (GitHub, Stack Overflow, MDN), AI Tools (ChatGPT, Gemini) — one-click to open.
- **Custom Site Add/Delete**: Add any URL with custom name, emoji icon, and color. Sites persist in localStorage. Delete custom sites on hover.
- **Address Bar Navigation**: Type any URL (with or without `https://`) and press Enter or Go to load it.
- **Back / Forward / Reload**: Full browser navigation controls in the chrome bar.
- **Open in External Browser**: One-click button to open any site in the default OS browser.
- **Fullscreen Study Mode**: Maximize button hides the left portal grid + header — webview fills the full app window for distraction-free reading/study. `Escape` key exits fullscreen.
- **Portal Search**: Filter cards by name, URL, or category.

### 📊 Webview Activity Tracking (Smart Anti-Self-Track)
- **Sites Tracked, Not App**: When Web Portals Browser is active, the Activity Tracker now logs the actual website domain & page title (e.g. `apnacollege.in — Delta Web Development`) instead of FlowTrack itself.
- **IPC Channel `webview-activity-report`**: `WebPortalsPage` sends `did-navigate` + `page-title-updated` events from the `<webview>` to electron main process via IPC.
- **Smart `shouldSkip()` Override**: When `activeWebviewInfo` is set in `electron.js`, `isSelf()` match no longer triggers a skip — the webview domain/title is substituted as the tracked app name (`web-portal-browser`).
- **`webview-activity-clear` IPC**: Called when the browser is closed — resets tracking back to normal (FlowTrack is ignored again).
- **Friendly Name in Analytics**: `web-portal-browser` shows as `🌐 Web Portals Browser` with the page title as subtitle in App Tracking / Analytics pages.

### 🔇 Console Noise Elimination
- **Tracker Pixel Blocker**: `webRequest.onBeforeRequest` silently cancels requests to `facebook.com/tr`, `connect.facebook.net`, `google-analytics.com`, `googletagmanager.com`, `analytics.twitter.com`, `bat.bing.com`, `hotjar.com`, `clarity.ms` — eliminating `ERR_CONNECTION_REFUSED` noise from embedded course sites.

### 🔒 IPC Security Hardening (preload.js)
- **Whitelist Expansion**: Added missing channels to `preload.js` ALLOWED_INVOKE_CHANNELS: `get-foreground-window`, `open-activity-log-folder`, `get-data-directory-path`, `get-block-rules`, `save-block-rules`, `webview-activity-report`, `webview-activity-clear`, `get-active-webview-domain`.

### 🐛 Bug Fixes
- **`shouldSkip()` Logic**: Fixed incorrect self-skip when webview is active — webview domain is now properly substituted in tracking loop.
- **Close Button IPC Cleanup**: Browser close button now calls `closeBrowser()` which also sends `webview-activity-clear` IPC so tracking resets properly.
- **Duplicate `useEffect` Cleanup**: WebPortalsPage Escape key handler properly returns cleanup function to remove event listener.
- **Tracker loop variable shadowing**: Renamed `const info` → `let rawInfo` in `startActivityTracker()` to allow webview override without `const` redeclaration.

### 📦 Version Bump
- All `package.json` files (web-app, desktop-app, root) bumped: `6.0.0` → `7.0.0`
- Git tag: `v7.0.0`

---

## [v6.0.0] — 2026-07-31

### ❄️ Zero-Heat Laptop Thermal Optimization & Power Saver
- **Chromium Background Throttling (`backgroundThrottling: true`)**: Throttles CPU rendering when app is minimized or in background, reducing CPU usage to <0.5% and preventing laptop fan spin/heat.
- **Page Visibility Animation Pause**: Automatically pauses continuous Framer Motion canvas loops when app window is hidden.
- **AudioContext Power Saver**: Auto-suspends Web Audio context when focus audio is stopped to free up CPU audio threads.

### 📄 Executive PDF Study Performance Reports
- **1-Click PDF Report Export**: Created `StudyReportModal.tsx` allowing instant generation and printing/exporting of comprehensive study reports.

### 🎧 Web Audio AI Focus Ambient Synthesizer
- **Native Web Audio Synthesizer**: `audioSynthesizer.ts` & `FocusAudioMixer.tsx` for 100% offline Alpha Binaural Beats (10Hz Focus), Pink Noise Rain, and Sub-bass Space Drone.

### 🐲 Interactive Virtual Companion ("Aura")
- **Gamified Companion Pet**: Level-based evolving companion pet reacting dynamically to study states.

### 🧠 Anki SM-2 Spaced Repetition Algorithm
- **SuperMemo-2 Implementation**: Integrated SM-2 algorithm in Flashcards page for scientific review scheduling (`Again`, `Hard`, `Good`, `Easy`).

---

## [v5.4.0] — 2026-07-31

### 🛠️ Production Blank Screen Fix & Electron IPC Bridge Overhaul
- **Preload.js IPC Overhaul**: Complete rewrite of `preload.js` to safely expose `on`, `off`, `removeListener`, `send`, `invoke`, `shell.openExternal`, and `isElectron: true` flag. Fixes uncaught `TypeError: ipcRenderer.on is not a function` during React boot in packaged apps (`contextIsolation: true`).
- **Complete Removal of PWA Service Worker in Desktop App**: Removed PWA Service Worker invocation from Electron desktop app (`main.tsx` & `sw-register.ts`). Prevents `file://` protocol security crashes and unhandled Promise rejections.
- **IPC Whitelist Expansion**: Added missing channels (`set-taskbar-progress`, `toggle-always-on-top`, `set-open-at-login`, `send-windows-toast`) to the preload whitelist.
- **Native AI Chat Viewport Scroll Fix**: Configured height limits (`max-h-[calc(75vh-180px)]`) on AI Assistant page so chat messages scroll smoothly without overflowing or freezing.
- **Vite & Electron Parity**: Set `contextIsolation: true` and `base: "./"` consistently across dev and production builds for 100% environment parity.

---

## [v5.3.0] — 2026-07-30

### 🎨 Premium Excalidraw Integration & Fullscreen
- **Real Whiteboard Component:** Integrated official `@excalidraw/excalidraw` React component.
- **JSON Load/Save & Libraries:** Expose toolbar actions to save `.excalidraw` layouts, import `.excalidrawlib` bundles, and export image graphics (PNG/SVG).
- **Maximize View Control:** Fullscreen toggle to expand canvas whiteboard to a distraction-free view.

### 🔒 High Security Sandbox Bridge & CORS Bypass
- **Context Isolated Preloader:** Set `contextIsolation: true` / `nodeIntegration: false` and created `preload.js` to securely expose safe whitelisted IPC methods to the renderer.
- **Native net.request API Proxy:** Created secure `secure-proxy-fetch` event listener to bypass CORS limit blocks when using AI API connections.
- **Path Resolution Checks:** Resolved blank black screen freezes by checking packaged state rules.

### 🔔 Non-Blocking Reminders & Spam Triggers Pauser
- **Custom Global Toasts:** Mapped custom `showToast()` alerts to replace browser blocking dialogs.
- **Stable References check:** Hooked stable ref checks to prevent duplicate reminder spam loops when background states update.
- **Transition Delay:** Implemented 100ms safe transition delay to allow window focus before inactivity checks resume.

### 📈 Screen Time App-Usage Branding Badges
- **Brand Badges:** Replaced categorization emojis with specific color-coded logo text badges (W, X, VS, CHR, EDG, DIS, SPO) for popular productivity apps in tracked lists.

---

## [v5.1.0] — 2026-07-29

### 📱 Framework7 v9.1.1 Aesthetic Migration
- **iOS/Material Navbar & Cards Layout (`index.css`):** Styled the global container elements to follow Framework7 `v9.1.1` (July 2026 Stable) native mobile interface designs.
- **Segmented App Shell (`AppShell.tsx`):** Transformed horizontal top tab menus to native pill segments.
- **Custom Card Component Mapping (`Panel.tsx`):** Mapped all workspace panels directly to `f7-card` styles.

### 📈 Intelligent Live Logs & Warners (`AppTrackingPage.tsx`)
- **5s Activity Polling Loop:** Upgraded log cycles from 30s to 5s.
- **Dynamic Domain Classification:** Browser titles automatically match against key study/social targets.
- **Distraction Warning Banner:** Shows real-time warnings when social/entertainment metrics exceed study hours.

### 🧠 Workspace & Decks Pipeline (`PDFStudyReader.tsx`)
- **"Send to Flashcards" Connector:** Allows OCR result blocks to automatically populate the AI deck card generator page.
- **Task Cleanup:** Sunsama-style reschedule buttons to clean overdue plans.

---

## [v3.2.0] — 2026-07-21

### 🐛 Critical Bug Fixes — App Activity Tracker

- **🔴 ROOT CAUSE FIX — `win-tracker.exe` NOT bundled in production**:
  - Added `extraResources` in `desktop-app/package.json` to include `win-tracker.exe` in the packaged `.exe`. This was the primary reason tracking failed in production — the C# Win32 binary was missing from the installer, causing `getForegroundWindow()` to always return `null`.
- **🔴 Duplicate `isSelf` function removed**:
  - Fixed a broken duplicate `isSelf` definition in `electron.js` that was silently overriding the correct self-detection logic, causing FlowTrack itself to appear in tracked apps.
- **✅ Precise `isSelf` detection**:
  - Now matches all known FlowTrack process names: `electron` (dev), `flowtrackpro` (packaged productName), `flowtrack-pro-desktop`, and `the-ultimate-master*` prefix.
- **✅ Separate `shouldSkip()` function**:
  - Cleanly separates "is own app" (isSelf) from "is invalid reading" (unknown, idle, empty) so legitimate system apps are never over-filtered.
- **✅ App Name Normalizer (`FRIENDLY_NAMES` map)**:
  - Raw process names (`msedge`, `code`, `winword`, `discord`) now display as human-friendly names (`Microsoft Edge`, `VS Code`, `Microsoft Word`, `Discord`) — 60+ apps covered.
- **✅ Normalized names in live entry + committed entries**:
  - Both `isLive` real-time entries and finalized logged entries now show friendly display names.
- **✅ `get-active-window` IPC upgraded**:
  - Returns `appName` (normalized), `skip` flag, and `isSelf` — frontend now uses `skip` centrally instead of re-implementing filter logic.
- **✅ Frontend `classifyApp` updated**:
  - Category detection now matches friendly names (`Google Chrome`, `Microsoft Edge`, `VS Code`, `Discord`, etc.) instead of raw process names.
- **📦 Full App Data Import/Export**:
  - Added `export-app-data` IPC: exports all subjects, sessions, settings + all activity log dates as a single JSON backup file.
  - Added `import-app-data` IPC: restores complete app state from JSON backup — merges activity logs to disk, reloads Dexie IndexedDB, re-initializes store.
  - UI: Added `Backup` (cyan) and `Restore` (amber) buttons in App & Web Monitor header.
- **📅 Historical Activity Loading**:
  - Startup now loads last 30 days of activity logs from disk into memory (previously only today).
- **🧹 TypeScript audit**:
  - Removed unused imports (`BarChart2`, `Clock`, `AppState`) from `AppTrackingPage.tsx`.
- **📝 package.json metadata**:
  - Added `description` and `author` fields (were missing, causing electron-builder warnings).

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
- **🏷️ Master 1000+ Global & Indian EdTech App Categorization Engine**:
  - Encoded 1000+ mapped Global & Indian EdTech apps (`Apna College`, `CodeWithHarry`, `Love Babbar CodeHelp`, `Chai aur Code`, `TakeUForward Striver`, `Gate Smashers`, `Physics Wallah PW`, `Allen Digital`, `Unacademy`, `BYJU'S`, `Vedantu`, `Adda247`, `Testbook`, `Drishti IAS`, `Vision IAS`, `Khan Sir`, `Utkarsh`, `Exampur`, `JEE/NEET/UPSC/GATE Exam Portals`, `NPTEL`, `SWAYAM`, `Scaler`, `Coding Ninjas`), 500+ developer IDEs (`VSCodium`, `Cursor`, `Windsurf`, `Zed`), terminals (`PowerShell`, `cmd`, `Antigravity`, `Warp`), database tools, AI coaches (`ChatGPT`, `Claude`, `Ollama`), browsers, and streaming portals.
- **🎨 UI Layout & Navigation Auto-Scroll Fixes**:
  - Fixed top Navbar horizontal overflow scrollbar clipping. Added prominent `🖥️ Desktop Native App Controls` panel at the very top of Settings Page (`/settings`) for instant access to Always-On-Top Floating Mode, Startup Launching, and Toast Alerts. Disabled layout center-jumping auto-scroll.
- **🛡️ Production-Grade Crash Prevention Safety**:
  - Wrapped all local storage data retrievals (`workspace_sticky_notes`, `web_app_block_rules`) in strict JSON try-catch parsing blocks, eliminating potential launch-crash vectors when local user configurations are corrupted.
- **🚫 Self-App Activity Tracking Filter Fix**:
  - Implemented `isSelfApp` / `isSelf` process and window title filter in `electron.js` and `appCategorizer.ts`. FlowTrack no longer logs itself (`FlowTrack`, `react-vite-tailwind`, `Electron`), preserving 100% accurate time tracking for actual user study apps.

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
