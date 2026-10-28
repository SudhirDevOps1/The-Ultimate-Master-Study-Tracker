# 🖥️ FlowTrack Pro — Standalone Desktop App (Electron Edition)

> **Version**: `v0.2.4` | **Platform**: Windows 10/11 (64-bit), Linux (AppImage / deb) & macOS | **License**: MIT

Welcome to the **Standalone Desktop Application** module of FlowTrack Pro. This edition is packaged with Electron 43, embedded C# Win32 active window tracking (`win-tracker.exe`), local Encrypted Password Vault with Chromium DOM Auto-Fill, and silent background auto-updates (`electron-updater`).

---

> [!NOTE]
> **Open-Source Architectural Heritage**: Designed with insights from open-source heavyweights:
> - **ActivityWatch** — Low-overhead active window tracking and OS-level AFK idle detection with zero remote server logging.
> - **Super Productivity** — Ergonomic 20-20-20 eye-care synthesizer, task timeboxing, and developer focus techniques.
> - **Anki / SuperMemo SM-2** — Spaced repetition algorithm ($I_n = I_{n-1} \times EF$) with dynamic interval calculation.
> - **Dayflow & Wakapi** — Passive screen and IDE project categorization (VS Code/JetBrains loopback receiver on `127.0.0.1:7777`).

---

## 📌 Main Navigation & Master Docs

- 🏠 **[Master System README](../README.md)** — Full Ecosystem Guide, System Architecture & Features
- 📖 **[Full System Architecture Guide](../docs/FULL_SYSTEM_GUIDE.md)**
- 📊 **[Analytics & Win32 Tracking Policy](../docs/ANALYTICS_AND_TRACKING_POLICY.md)**

---

## ✨ Key Desktop Features

- 🌐 **Arc-Style In-App Web Browser**: 100% full-width view, Ghostery network-level ad blocking, Mozilla Readability reader mode, in-page search (`Ctrl+F`), per-origin zoom, lecture playback speed booster (1x-2x), and 1-click slide capture.
- 🛑 **Dangerous Download Protection**: Guard modal intercepting executable and script files (.exe, .bat, .cmd, .msi, .ps1, .vbs) from web portals.
- 📡 **Local WakaTime-Compatible Heartbeat Receiver**: Binds strictly to `127.0.0.1:7777` with DNS-rebinding protection, accepting heartbeats from VS Code, Cursor, Antigravity, and JetBrains.
- 🔍 **Dayflow / Wakapi Query API**: Local read-only query endpoints (`/api/v1/buckets`, `/events`) for developer workflows.
- 👁️ **Opt-In In-Memory OCR Timeline**: Passive timeline text search with zero screenshot disk storage and automatic credentials redaction.
- ⌨️ **Unified Command Palette (`Ctrl+K`)**: Blazing-fast in-memory fuzzy search across tasks, flashcards, subjects, and settings.
- 🔐 **Encrypted Database Backup & Privacy Vault**: Export and restore AES-256-GCM encrypted snapshots with PBKDF2 100k iteration derivation.
- ⏳ **AFK-Aware Break Sanctuary**: Automated 20-20-20 eye strain prompts, 50m desk breaks, 90m ultradian cycles, and video rest breaks.
- 📊 **Auditable Focus Score & Flowtime**: Transparent 0–100 score breakdown and unconstrained flowtime mode alongside Pomodoro.
- 🔄 **Background Silent Auto-Updater**: Checks GitHub Releases automatically post-launch and provides 1-click restart & install with full changelog view and **100% Zero Data Loss Guarantee**.
- 🛡️ **Anti-Cheat Clock Guard**: Validates system time deltas to prevent user system time manipulation.
- ⚡ **Kernel Win32 Tracker (`win-tracker.exe`)**: Fast active window detection consuming < 0.5% CPU and ~40MB RAM.
- 📦 **LZMA Compressed Build Size**: Portable installers optimized down to ~150MB using maximum ASAR compression.

---

## 🛡️ Zero Data Loss Guarantee & Update Lifecycle

FlowTrack Pro is engineered with complete separation between application code and user databases:
- **Application Binaries**: `%LOCALAPPDATA%\Programs\FlowTrackPro` (updated seamlessly by electron-updater).
- **Persistent User Directory**: `%APPDATA%\FlowTrackPro` (completely untouched across updates).
  - `IndexedDB` & `localStorage`: Timer records, Pomodoro streaks, flashcard intervals, and subject targets.
  - `activity-log/*.json`: Win32 active window tracking history and Wakapi developer timeline metrics.
  - `notes/*.json`: Vector whiteboard annotations and study sheets.
- **Pre-Update Memory Flush**: Right before `restart-and-install-update` triggers, active memory logs are flushed to disk so not a single second of focus is lost.

---

> [!IMPORTANT]
> **Dynamic Webview RAM Management**: Inactive portal tabs are suspended out of the DOM. Only the active webview is mounted, slashing runtime memory usage from **~1GB down to ~120MB**.

> [!TIP]
> **Study Shortcuts Inside Web Portals**:
> - `F12` or `Ctrl+Shift+I` toggles developer inspection.
> - `Shift + S` triggers instant high-res slide/code screenshot to your Downloads folder.
> - Top-bar `⚡ Speed` controls video lecture rates (1x to 2x).

> [!WARNING]
> **Clock Manipulation Warning**: Do not modify system clock time during active study sessions. FlowTrack's clock guard will flag the session as anomalous.

> [!CAUTION]
> **Distraction Blocker Process Kill**: In "Hard Mode", blacklisted executables are forcefully terminated to protect your focus flow.

---

## 🚀 Development & Build Commands

### 1. Install Dependencies
```bash
cd desktop-app
npm install --legacy-peer-deps
```

### 2. Run Local Development (Electron + Vite)
```bash
npm run electron:dev
```

### 3. Build Production Installer & Standalone Executable
```bash
npm run electron:build
# Output generated in: desktop-app/dist-electron/
```

---

*© 2026 FlowTrack Pro Ecosystem · Lead Architect: Sudhir Singh ([@SudhirDevOps1](https://github.com/SudhirDevOps1))*
