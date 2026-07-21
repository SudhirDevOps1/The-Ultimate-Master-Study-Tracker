# FlowTrack – Smart Study Tracker

> **Desktop-only Electron app** — All data stored locally, nothing uploaded to the cloud.

---

## 📦 Install karo (Bas itna karo)

```
dist-electron\FlowTrackPro Setup 1.0.0.exe
```

Double-click karo → install → done. 🎉

---

## 🗂️ Project Structure

```
FlowTrack/
├── electron.js              ← Electron main process (window, tray, IPC, activity tracker)
├── src/
│   ├── main.tsx             ← React app entry point
│   ├── App.tsx              ← Router + page layout
│   ├── store/
│   │   └── useAppStore.ts   ← Global state (Zustand) — timer, sessions, settings
│   ├── hooks/
│   │   ├── useTimer.ts      ← Timer tick loop, visibility handling
│   │   ├── usePomodoro.ts   ← Pomodoro cycle (timestamp-based, freeze-proof)
│   │   └── useInactivityDetector.ts  ← Windows API idle detection
│   ├── pages/
│   │   ├── TimerPage.tsx         ← Main study timer
│   │   ├── DashboardPage.tsx     ← Overview & stats
│   │   ├── AnalyticsPage.tsx     ← Charts & analytics
│   │   ├── AppTrackingPage.tsx   ← ActivityWatch-style app tracker ← NEW
│   │   ├── HistoryPage.tsx       ← Session history
│   │   ├── SubjectsPage.tsx      ← Subject management
│   │   ├── SettingsPage.tsx      ← App settings
│   │   └── ...other pages
│   └── components/
│       └── timer/
│           ├── FloatingTimer.tsx     ← PiP floating timer
│           └── AmbiencePlayer.tsx    ← Background sounds
├── public/
│   ├── favicon.png           ← App icon (also used for tray)
│   ├── icon-192.png          ← Notification icon
│   └── logo.svg              ← Logo
├── dist/                     ← Vite build output (auto-generated)
├── dist-electron/            ← Electron build output (.exe here)
├── package.json
└── vite.config.ts
```

---

## ✅ Features

### ⏱️ Study Timer
- **Start / Pause / Stop** session with subject selection
- Timer runs in background — window minimize karo, timer chalta rehta hai
- **Auto-pause on minimize** setting (Settings mein on/off)
- Planned session time — timer complete hone pe notification + auto-stop
- Real-time title bar countdown: `[24:15] Physics - FlowTrack`

### 🍅 Pomodoro Mode
- Work / Short Break / Long Break cycles
- **Timestamp-based countdown** — minimize/hide pe freeze nahi hoga
- Auto-start breaks and work sessions (configurable)
- Desktop notifications on phase change
- Cycle counter aur history

### 🖥️ App Activity Tracker (ActivityWatch-style)
- **Automatic** — kuch set nahi karna, sirf app kholo
- Har **5 seconds** mein Windows foreground window detect karta hai
- **FlowTrack khud track nahi hota** (self-excluded)
- Duration per app accumulate hoti hai
- **24-hour Gantt Timeline** — kab kaunsa app kitni der chala
- **Category classification** — Study / Browser / Social / Entertainment / System
- **3 Tabs**: Overview · Timeline · Windows Log
- **Date history** — purane din ka data dekho (breadcrumb navigation)
- **CSV Export** — kisi bhi din ka data export karo
- **Data survive karta hai restart ke baad** — AppData mein save hota hai

### 🛌 Inactivity Detection (Windows API)
- **`GetLastInputInfo` Windows API** use karta hai
- Keyboard, mouse, touchpad — **sab detect hota hai**
- **Window minimize pe bhi kaam karta hai** (DOM events se better!)
- 10 minute idle → session auto-pause + desktop notification
- User wapas aaye → session auto-resume
- Inactivity timer progress bar (App Tracking page pe)

### 🪟 System Tray
- App minimize karo ya X dabao → **tray mein chali jaati hai**
- Timer background mein chalta rehta hai
- Right-click → Open / Quit
- Double-click → app ko front pe laao
- Windows balloon notification pehli baar minimize hone pe

### 📺 PiP (Picture-in-Picture)
- Timer ko floating mini-window mein dekho
- Document PiP (native browser) → Video PiP (canvas stream) → fallback overlay
- **30fps canvas stream** — smooth updates
- **10-second heartbeat** — session auto-pause se protect karta hai PiP mein
- PiP khule hone pe minimize se auto-pause nahi hoga

### 🎵 Ambience / Focus Music
- Built-in tracks: Rain, Cafe, Forest, White Noise, etc.
- YouTube playlist support
- Local audio file upload
- Volume control
- Error display agar audio load na ho

### 📊 Analytics & History
- Daily / Weekly / Monthly study charts
- Subject-wise breakdown
- Streak tracking
- XP / Level / Rank gamification system
- Session history with edit support

### 🏆 Achievements
- Automatically unlocked based on study milestones
- XP rewards
- Progress tracking

### 📅 Calendar
- Monthly study heatmap
- Day-wise session details

### 🤖 AI Assistant
- Built-in AI study assistant

### 📝 Study Notes / Whiteboard
- Rich text notes
- Sticky notes board
- Export board as PNG (native save dialog)

### 📋 Today Tasks
- Daily task list integrated with subjects
- Priority and completion tracking

---

## ⚙️ Settings

| Setting | Description |
|---------|-------------|
| Auto-pause on hide | Window minimize/hide pe timer pause karo |
| Strict Focus Mode | 10 min inactivity pe auto-pause (Windows API) |
| Notifications | Desktop notifications on/off |
| Daily Goal | Hours per day target |
| Weekly Target | Hours per week target |
| Pomodoro Settings | Work/break duration, auto-start |
| Theme | Dark theme (default) |
| Keyboard Shortcuts | Global shortcuts on/off |

---

## 🔧 Development

### Prerequisites
- Node.js 18+
- Windows 10/11 (for Windows API features)

### Dev mode chalao
```bash
npm install
npm run dev          # Vite dev server (browser mein)
npm run electron:dev # Electron dev mode (agar script ho)
```

### Production build banao (.exe)
```bash
npm run electron:build
# Output: dist-electron\FlowTrackPro Setup 1.0.0.exe
```

### Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+I` | DevTools toggle |

---

## 🗄️ Data Storage

Sab data **local** store hota hai — koi cloud nahi:

| Data | Location |
|------|----------|
| Study sessions, subjects, settings | Browser IndexedDB (`Dexie`) |
| App activity log | `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json` |
| Timer state | IndexedDB |
| Pomodoro settings | IndexedDB |

> **Privacy:** Koi bhi data internet pe nahi jata. Purely offline app.

---

## 🐛 Bugs Fixed (v2.0)

| Bug | Fix |
|-----|-----|
| Timer minimize pe band ho jaata tha | `backgroundThrottling: false` + `autoPauseOnHidden` check fix |
| Pomodoro minimize pe freeze hota tha | Timestamp-based countdown |
| Analytics Worker crash | Broken `analytics.worker.js` Worker call remove kiya |
| Notifications naye users ke liye OFF thi | Default `true` fallback fix |
| PiP black screen / not updating | Canvas stream 1fps → 30fps |
| PiP heartbeat bahut slow tha | 30s → 10s |
| `pauseSession` race condition | `withSessionLock` wrap |
| `withSessionLock` deadlock possible tha | 5-second timeout add kiya |
| App close karne se puri app band hoti thi | Minimize-to-tray implement kiya |
| Activity data restart pe delete hota tha | File-based persistent storage |
| Inactivity minimize pe detect nahi hoti thi | Windows `GetLastInputInfo` API |

---

## 📁 Deleted Files (Web/Python-only, Not Needed for Desktop)

Ye files delete kar diye kyunki sirf web/Python backend ke liye the:

- `START.bat` — Python backend + dev server launcher
- `start_backend_only.bat` — Python backend script
- `vercel.json` — Web deployment config
- `DOCUMENTATION_INDEX.md` — Old docs index
- `public/analytics.worker.js` — Broken web worker (never worked)
- `public/docs.html` — Web documentation page
- `public/showcase.html` — Web showcase page
- `public/manifest.webmanifest` — PWA manifest
- `public/sw.js` — Service worker
- `docs/` folder — All Python/web-specific documentation

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 43 |
| Frontend | React 19 + TypeScript |
| Build tool | Vite 7 |
| State | Zustand |
| Database | Dexie (IndexedDB) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts / D3 |
| Styling | Tailwind CSS |
| Windows APIs | PowerShell + Win32 via `child_process.exec` |

---

## 🆚 FlowTrack vs ActivityWatch

| Feature | ActivityWatch | FlowTrack |
|---------|--------------|-----------|
| App usage tracking | ✅ | ✅ |
| Idle / AFK detection | ✅ | ✅ (Windows API) |
| Privacy-first, local only | ✅ | ✅ |
| Data survives restart | ✅ | ✅ |
| 24-hour timeline | ✅ | ✅ |
| Date history | ✅ | ✅ |
| CSV export | ✅ | ✅ |
| Self-exclusion | ❌ | ✅ |
| Study timer built-in | ❌ | ✅ |
| Auto-pause on idle | ❌ | ✅ |
| Auto-resume on activity | ❌ | ✅ |
| Pomodoro timer | ❌ | ✅ |
| PiP floating timer | ❌ | ✅ |
| Python/server required | ✅ (required) | ❌ (not needed) |

---

*Built with ❤️ for serious students. All data stays on your device.*
