# 🗺️ FlowTrack Pro — Future Features & Evolution Roadmap (2026–2027)

This document outlines the planned future features, upcoming modules, and feature enhancement roadmap for **FlowTrack Pro** across all **3 Operational Categories**.

---

## 📑 Roadmap Overview Graph

```
                                ┌───────────────────────────────┐
                                │   FUTURE ROADMAP (2026-2027)  │
                                └───────────────┬───────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌─────────────────────────┐        ┌─────────────────────────┐        ┌─────────────────────────┐
│       CATEGORY 1        │        │       CATEGORY 2        │        │       CATEGORY 3        │
│   Web App (Serverless)  │        │   Web + Python Daemon   │        │ Standalone Desktop App  │
└─────────────────────────┘        └─────────────────────────┘        └─────────────────────────┘
```

---

## 🌐 1. Category 1: Web App (No Backend / Pure Serverless PWA)

### 🚀 Upcoming Planned Features:
1. 🌐 **Chromium & Firefox Extension Component**:
   - Web Extension API integration (`chrome.tabs.onActivated`) to capture visited web tab URLs, page titles, and domain metrics directly inside browser storage without requiring any Python backend.
2. 🎙️ **Multi-Lingual Voice Command Engine**:
   - Expanding Web Speech Recognition API (`useVoiceTimer.ts`) to support Hindi, Spanish, French, and German voice commands (*"Physics timer pause karo"*, *"30 minutes break start karo"*).
3. 🤖 **In-Browser WebGPU WebLLM Local AI (Zero-Install AI)**:
   - On-device local LLM model execution via `@mlc-ai/web-llm` utilizing WebGPU. Allows offline AI coaching directly in the browser without running Ollama.
4. 📱 **Advanced PWA Offline Caching 2.0**:
   - Cache PDF WebAssembly workers, Tesseract WASM binaries, and ambient sound loops in Service Worker CacheStorage for 100% offline flight/travel studying.
5. 📊 **Canvas PDF Highlight & Annotations Exporter**:
   - Ability to draw, highlight, and write notes directly on top of textbook PDFs in `/study-workspace` and export annotated PDFs.

---

## 🐍 2. Category 2: Web App + Python Backend (`backend.py`)

### 🚀 Upcoming Planned Features:
1. 🛡️ **Active Distraction App Enforcer (Process Auto-Kill)**:
   - Python daemon (`backend.py`) will automatically terminate or minimize processes on your blocklist (e.g. `discord.exe`, `steam.exe`, `game.exe`) as soon as a Strict Study Session starts.
2. 📈 **24-Hour Gantt Timeline Visualizer for Web UI**:
   - Exposing new `/analytics/timeline` REST API endpoint in `backend.py` to render 24-hour visual Gantt timeline charts on the Web App frontend.
3. 📊 **Automated Productivity Score & Focus Window Forecast**:
   - Algorithm in `backend.py` calculating daily productivity ratio ($\frac{\text{Productive Time}}{\text{Total Active Time}} \times 100$) and forecasting peak study windows for the next day.
4. 💾 **Single-Click Full Database Archive (.zip)**:
   - `/backup/full` endpoint to download SQLite `app_tracker.db`, JSON logs, and configuration files in a single compressed archive.
5. 🌐 **Cross-Platform System Tray Companion for Python**:
   - Lightweight system tray icon for `backend.py` (via `pystray`) allowing users to pause tracking or toggle Python backend port directly from the OS taskbar.

---

## 🖥️ 3. Category 3: Standalone Desktop App (Electron Windows `.exe`)

### 🚀 Upcoming Planned Features:
1. 🪟 **Native Windows Mini-Widget (Always-On-Top Floating Timer)**:
   - Compact desktop widget floating over VS Code, Word, or Zoom with live countdown and XP progression.
2. 🛌 **Kernel Hardware Idle Threshold Tuning**:
   - Custom idle sensitivity slider (e.g. auto-pause after 3m, 5m, or 10m of hardware mouse/keyboard inactivity).
3. 📊 **Native Windows Toast Notification Quick Actions**:
   - Interactive Windows 10/11 Toast Notifications with inline buttons (*"Resume Session"*, *"Extend 5m"*, *"Finish Session"*).
4. 📦 **Portable Single-Executable (.exe) Release**:
   - Portable non-installer build option requiring zero administrative privileges.
5. 🎨 **Windows 11 Mica / Acrylic Translucent UI Theme**:
   - Windows 11 Fluent Design System integration utilizing native OS background blur effects.

---

## 🔗 Bound Documentation References

- 🏠 **Master Entry Gateway**: [Root README.md](../README.md)
- 🌐 **Web App Manual**: [web-app/README.md](../web-app/README.md)
- 🖥️ **Desktop App Manual**: [desktop-app/README.md](../desktop-app/README.md)
- 📑 **Full Technical Architecture Manual**: [docs/FULL_SYSTEM_GUIDE.md](FULL_SYSTEM_GUIDE.md)

---
*© 2026 FlowTrack Pro Ecosystem · MIT License.*
