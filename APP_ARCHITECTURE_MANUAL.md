# 📗 FlowTrack Suite – Technical Operations Manual

---

## 🗂️ Architectural Layout

- **Root Level (`/`):** Houses the Live Web Client deployable directly to Vercel/Netlify. Contains `index.html`, `src/`, `public/`, `vercel.json`, `START.bat`, and `backend.py`.
- **Desktop Level (`/desktop-app`):** Houses the Standalone Windows Electron Application Engine. Contains `electron.js`, `win-tracker.exe` (compiled C# Win32 active window helper binary), `flowtrack_config.json`, and `dist-electron/FlowTrackPro Setup 1.0.0.exe`.

---

## 🛠️ Deployment Workflows

### 🌐 Web App (Vercel)
- **Directory:** Root (`/`)
- **Config:** `vercel.json`
- **Command:** `npm run build`

### 🖥️ Desktop App Executable
- **Directory:** `desktop-app/`
- **Installer:** `desktop-app/dist-electron/FlowTrackPro Setup 1.0.0.exe`
- **Native Helper:** `desktop-app/win-tracker.exe`

---

*FlowTrack Engineering Architecture Manual.*
