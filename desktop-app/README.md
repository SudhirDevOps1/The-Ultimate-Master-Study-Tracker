# 🖥️ FlowTrack Pro — Standalone Desktop App (Electron Edition)

> **Version**: `v7.2.0` | **Platform**: Windows 10/11 (64-bit) & macOS | **License**: MIT

Welcome to the **Standalone Desktop Application** module of FlowTrack Pro. This edition is packaged with Electron 43, embedded C# Win32 active window tracking (`win-tracker.exe`), local Encrypted Password Vault with Chromium DOM Auto-Fill, and silent background auto-updates (`electron-updater`).

---

## 📌 Main Navigation & Master Docs

- 🏠 **[Master System README](../README.md)** — Full Ecosystem Guide, System Architecture & Features
- 📖 **[Full System Architecture Guide](../docs/FULL_SYSTEM_GUIDE.md)**
- 📊 **[Analytics & Win32 Tracking Policy](../docs/ANALYTICS_AND_TRACKING_POLICY.md)**

---

## ✨ Key Desktop Features in `v7.1.0`

- 🔐 **Encrypted Password Vault & Auto-Fill**: Store login credentials locally with XOR ciphers and auto-fill embedded `<webview>` portal login forms with 1-click.
- 🔄 **Background Silent Auto-Updater**: Checks GitHub Releases automatically post-launch and provides 1-click restart & install.
- 🛡️ **Anti-Cheat Clock Guard**: Validates system time deltas to prevent user system time manipulation.
- ⚡ **Kernel Win32 Tracker (`win-tracker.exe`)**: Fast active window detection consuming < 0.5% CPU and ~40MB RAM.
- 📦 **LZMA Compressed Build Size**: Portable installers optimized down to ~150MB using maximum ASAR compression.

---

## 🚀 Development & Build Commands

### 1. Install Dependencies
```bash
cd desktop-app
npm install
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
