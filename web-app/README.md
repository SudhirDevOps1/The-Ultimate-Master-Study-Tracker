# 🌐 FlowTrack Pro — Serverless Web Application (Browser & Local Hybrid Edition)

> **Version**: `v7.2.0` | **Platform**: Any Modern Web Browser (Desktop / Mobile / Tablet) | **Deployment**: Vercel CDN

Welcome to the **Web Application** module of FlowTrack Pro. This app operates 100% locally in your browser using IndexedDB for offline data persistence, Progressive Web App (PWA) installation, zero signup requirements, and optional smart auto-connection to the local Python tracker backend.

---

## 📌 Web App Features

- ⚡ **Vercel CDN Ready**: Instantly deployed on Vercel or any static web host.
- 💾 **100% In-Browser IndexedDB**: Sessions, flashcards, mind maps, PDF reader state, and settings stay private in local browser storage.
- 📱 **Progressive Web App (PWA)**: Install directly to desktop or mobile home screen for offline travel/study mode.
- 🔄 **Smart Local Python Backend Integration**:
  - Automatically connects to `http://localhost:5001` when running `START.bat` on your local PC.
  - Pulls OS active window titles, process screen-time analytics, and browser tab tracking into the web app.
  - Automatically falls back to offline IndexedDB mode when local backend is not running.
- 🤖 **Multi-Provider AI Assistant**: Direct browser calls to Gemini, OpenAI, Groq, or local Ollama (via local backend CORS proxy).

---

## 🚀 One-Click Local Launcher (`START.bat`)

To run the Web App locally along with the Python Tracker Backend:

1. Double-click `START.bat` (or run `.\START.bat` in terminal).
2. The script automatically initializes the Python `.venv`, launches `backend.py` on `localhost:5001`, starts Vite dev server (`http://localhost:5173`), and opens your browser.

```bash
# Manual npm commands:
npm install
npm run dev      # Start Vite dev server on http://localhost:5173
npm run build    # Production build for Vercel deployment
```

---

*© 2026 FlowTrack Pro Ecosystem · Lead Architect: Sudhir Singh ([@SudhirDevOps1](https://github.com/SudhirDevOps1))*
