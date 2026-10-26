# 🖥️ FlowTrack Pro — Standalone Desktop App (Electron Edition)

> **Version**: `v0.1.2` | **Platform**: Windows 10/11 (64-bit) & macOS | **License**: MIT

Welcome to the **Standalone Desktop Application** module of FlowTrack Pro. This edition is packaged with Electron 43, embedded C# Win32 active window tracking (`win-tracker.exe`), local Encrypted Password Vault with Chromium DOM Auto-Fill, and silent background auto-updates (`electron-updater`).

---

> [!NOTE]
> **Open-Source Architectural Heritage**: Designed with insights from open-source heavyweights:
> - **ActivityWatch** — Low-overhead active window tracking with zero telemetry.
> - **Super Productivity** — Flowtime / Pomodoro focus intervals with audio synthesizers.
> - **Anki SM-2** — SuperMemo spaced repetition algorithm for memory retention.

---

## 📌 Main Navigation & Master Docs

- 🏠 **[Master System README](../README.md)** — Full Ecosystem Guide, System Architecture & Features
- 📖 **[Full System Architecture Guide](../docs/FULL_SYSTEM_GUIDE.md)**
- 📊 **[Analytics & Win32 Tracking Policy](../docs/ANALYTICS_AND_TRACKING_POLICY.md)**

---

## ✨ Key Desktop Features

- 🌐 **Arc-Style In-App Web Browser**: 100% full-width view, smart omnibox Google search, lecture playback speed booster (1x-2x), 1-click slide capture to Downloads, and speed dial hub.
- 🔐 **Encrypted Password Vault & Auto-Fill**: Store login credentials locally with XOR ciphers and auto-fill embedded `<webview>` portal login forms with 1-click.
- 🔄 **Background Silent Auto-Updater**: Checks GitHub Releases automatically post-launch and provides 1-click restart & install.
- 🛡️ **Anti-Cheat Clock Guard**: Validates system time deltas to prevent user system time manipulation.
- ⚡ **Kernel Win32 Tracker (`win-tracker.exe`)**: Fast active window detection consuming < 0.5% CPU and ~40MB RAM.
- 📦 **LZMA Compressed Build Size**: Portable installers optimized down to ~150MB using maximum ASAR compression.

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
pnpm install
```

### 2. Run Local Development (Electron + Vite)
```bash
pnpm run electron:dev
```

### 3. Build Production Installer & Standalone Executable
```bash
pnpm run electron:build
# Output generated in: desktop-app/dist-electron/
```

---

*© 2026 FlowTrack Pro Ecosystem · Lead Architect: Sudhir Singh ([@SudhirDevOps1](https://github.com/SudhirDevOps1))*
