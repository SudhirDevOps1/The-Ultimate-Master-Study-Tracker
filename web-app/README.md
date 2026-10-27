# 🌐 FlowTrack Pro — Serverless Web Application (Browser & Local Hybrid Edition)

> **Version**: `v0.2.4` | **Platform**: Any Modern Web Browser (Desktop / Mobile / Tablet) | **Deployment**: Vercel CDN

Welcome to the **Web Application** module of FlowTrack Pro. This app operates 100% locally in your browser using IndexedDB for offline data persistence, Progressive Web App (PWA) installation, zero signup requirements, and optional smart auto-connection to the local Python tracker backend.

---

## 📌 Web App Features

- ⚡ **Vercel CDN Ready**: Instantly deployed on Vercel or any static web host.
- 💾 **100% In-Browser IndexedDB (Zero Data Loss)**: Sessions, flashcards, mind maps, PDF reader state, and settings stay completely persistent in browser storage. App updates and cache refreshes never wipe your study history.
- ⌨️ **Unified Command Palette (`Ctrl+K`)**: Instant offline keyboard search across tasks, flashcards, subjects, and settings using MiniSearch.
- 🔐 **Encrypted Database Backup & Privacy Vault**: Export and restore AES-256-GCM encrypted snapshots with PBKDF2 100k iteration derivation.
- ⏱️ **Flowtime Mode & Transparent Focus Score**: Unconstrained flowtime focus sessions with an auditable, honest 0–100 focus score breakdown.
- 📋 **Task Backlog & Timeboxing**: Timebox allocation for daily tasks and 1-click timer hand-off.
- ☕ **Break Engine & Video Sanctuary**: 20-20-20 eye strain, 50m desk, and 90m ultradian rest alerts + optional video rest modal.
- 📝 **1-Click Standup & Review Markdown**: Instant summary export (Yesterday / Today / Blockers / Focus stats) for agile developers.
- 📱 **Progressive Web App (PWA)**: Install directly to desktop or mobile home screen for offline travel/study mode.
- 🔄 **Smart Local Python Backend Integration**:
  - Automatically connects to `http://localhost:5001` when running `START.bat` on your local PC.
  - Pulls OS active window titles, process screen-time analytics, and browser tab tracking into the web app.
  - Mirrors WakaTime IDE heartbeats in SQLite database (`app_tracker.db`).
  - Automatically falls back to offline IndexedDB mode when local backend is not running.
- 🤖 **Multi-Provider AI Assistant**: Direct browser calls to Gemini, OpenAI, Groq, or local Ollama (via local backend CORS proxy).

---

## 🚀 One-Click Local Launcher (`START.bat`)

To run the Web App locally along with the Python Tracker Backend:

1. Double-click `START.bat` (or run `.\START.bat` in terminal).
2. The script automatically initializes the Python `.venv`, launches `backend.py` on `localhost:5001`, starts Vite dev server (`http://localhost:5173`), and opens your browser.

```bash
# Manual npm commands:
npm install --legacy-peer-deps
npm run dev      # Start Vite dev server on http://localhost:5173
npm run build    # Production build for Vercel deployment
```

---

*© 2026 FlowTrack Pro Ecosystem · Lead Architect: Sudhir Singh ([@SudhirDevOps1](https://github.com/SudhirDevOps1))*
