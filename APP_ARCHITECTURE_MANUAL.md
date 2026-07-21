# 📗 FlowTrack Suite – Technical Operations Manual

---

## 🗂️ Clean Isolated Folder Architecture

- **`desktop-app/` Directory:** Standalone Windows Electron Application. Contains `electron.js`, `win-tracker.exe` (native Win32 binary helper), `flowtrack_config.json`, React source, and `dist-electron/FlowTrackPro Setup 1.0.0.exe`.
- **`web-app/` Directory:** Live Web Application. Contains `index.html`, `src/`, `public/`, `vercel.json`, `START.bat`, `backend.py`, and `DOCUMENTATION_INDEX.md`.

---

## 🛠️ Workflows

### 🖥️ Desktop App
- Path: `desktop-app/`
- Run/Install: `desktop-app/dist-electron/FlowTrackPro Setup 1.0.0.exe`

### 🌐 Web App (Vercel Deploy)
- Path: `web-app/`
- Build: `cd web-app && npm run build`

---

*FlowTrack Engineering Architecture Manual.*
