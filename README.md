# FlowTrack Pro – Smart Study Tracker & Native Activity Engine

> **100% Standalone Desktop Application** — Powered by Electron 43 + React 19. All data is stored 100% locally on your machine (`%AppData%\FlowTrackPro`). Zero cloud uploads, zero external Python servers, and zero dummy mocks.

---

## 📦 Quick Installation

Double-click the compiled Windows installer to run the desktop application:
```text
dist-electron\FlowTrackPro Setup 1.0.0.exe
```

---

## 🗂️ Real Project File Architecture

```text
The-Ultimate-Master-Study-Tracker/
├── electron.js                            # Main Electron Process (Win32 APIs, Tray, Native Tracker, IPC)
├── README.md                              # Technical & User Overview Documentation
├── APP_ARCHITECTURE_MANUAL.md             # Complete Engineering & Operational Manual
├── package.json                           # Dependencies & Build Scripts
├── vite.config.ts                         # Vite Bundler Config
└── src/
    ├── main.tsx                           # React Entrypoint
    ├── App.tsx                            # Main Router & Window Title Bar Sync
    ├── store/
    │   └── useAppStore.ts                 # Zustand State Manager (Timer, Sessions, XP, Settings)
    ├── hooks/
    │   ├── useTimer.ts                    # Core Study Timer Hook (Visibility & Delta Clock)
    │   ├── usePomodoro.ts                 # Timestamp-based Freeze-Proof Pomodoro Cycle Hook
    │   └── useInactivityDetector.ts       # Dual-Layer Hybrid Smart Inactivity Engine
    ├── pages/
    │   ├── DashboardPage.tsx              # Overview, Weekly Summaries, Focus Score, Native Widgets
    │   ├── AppTrackingPage.tsx            # ActivityWatch-style 24-hr Timeline & Web Tabs Monitor
    │   ├── TimerPage.tsx                  # Interactive Study Target & Pomodoro Control Center
    │   ├── HistoryPage.tsx                # Logged Study Session Records
    │   ├── SubjectsPage.tsx               # Subject Manager & Color Schemes
    │   ├── AnalyticsPage.tsx              # Deep Analytical Charts & Focus Metrics
    │   └── SettingsPage.tsx               # Native App Settings, Backup (Import/Export)
    └── components/
        ├── dashboard/
        │   └── BackendActivityPanel.tsx   # Dashboard Native IPC Live Activity Widgets
        ├── analytics/
        │   └── AppActivityList.tsx        # Native IPC Detailed Process Activity Breakdown
        └── timer/
            ├── FloatingTimer.tsx          # PiP Floating Overlay Timer
            └── AmbiencePlayer.tsx         # Focus Music & Sound Effects Player
```

---

## ✅ Core Real Features & Exact Behavior

### ⏱️ 1. Study Timer & Live Title Sync
- **Target Sessions:** Start, pause, or complete timed sessions linked to subjects.
- **Freeze-Proof Minimization:** Built with Electron `backgroundThrottling: false`. Window minimization never freezes or slows down your timer.
- **Title Bar Sync:** Real-time countdown on window title: `[24:15] Physics - FlowTrack`.

### 🍅 2. Timestamp-Based Pomodoro Engine
- **Work / Short Break / Long Break** cycles.
- Calculated using real-time timestamp deltas (`Date.now() - startedAtMs`) to prevent interval drift when minimized.
- Audio cues & system notifications on phase transition.

### 🖥️ 3. Native Desktop & Web Activity Monitor (`/app-tracking`)
- **Real-Time Polling (Every 3 seconds):** Automatically captures active foreground process names and window titles.
- **FlowTrack Self-Exclusion:** FlowTrack itself (`flowtrackpro.exe`, `electron.exe`) is automatically excluded so your study metrics stay accurate.
- **4 Dedicated Tracking Tabs:**
  1. 📊 **Overview:** App breakdown, animated category percentage bars, and live green **`LIVE`** badges.
  2. 📈 **24-Hour Gantt Timeline:** Hourly visual timeline chart of application usage.
  3. 🌐 **Web Sites & Tabs Monitor:** Domain extractor for browser tabs (YouTube, GitHub, StackOverflow, ChatGPT, etc.) with favicons, clean site titles, and visit counts.
  4. 🪟 **Windows Log:** Detailed timestamped history log of every focused window.
- **Persistent Storage:** Saves daily JSON files inside `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json`. Data survives system reboots.
- **CSV Data Export:** One-click CSV spreadsheet generation via native save dialogs.

### 🛌 4. Dual-Layer Hybrid Smart Inactivity Detector
- **Layer 1 (Win32 Kernel Input API):** Polls Windows `GetLastInputInfo` for hardware-level Mouse, Keyboard, Touchpad, and Stylus input (works globally even when minimized or in the tray).
- **Layer 2 (Instant DOM Event Watcher):** Captures in-app `mousemove`, `keydown`, `scroll`, `touch`, and `wheel` events with 0ms latency.
- **Smart Logic:**
  - **10 Minutes No Input:** Auto-pauses active study session + sends a Windows desktop notification.
  - **Movement Detected:** Instantly **Auto-Resumes** the session without requiring manual clicks!

### 🪟 5. System Tray Background Execution
- Clicking **Close (X)** or **Minimize** sends FlowTrack to the Windows System Tray (near the taskbar clock).
- Study timer and background process tracking continue uninterrupted.
- Right-click tray icon ➔ **`📖 Open FlowTrack`** or **`❌ Quit FlowTrack`**.

### 📺 6. Picture-in-Picture (PiP) Floating Overlay
- Renders an always-on-top mini floating timer window via a 30fps canvas stream.
- Includes a 10-second heartbeat to keep focus mode valid while watching video lectures.

### 📊 7. Dashboard & Focus Score Algorithm
- **Daily Focus Score:** Algorithmic metric: *Studied Hours Weight + Goal Attachment % - Inactivity Penalty*.
- **Gamified Level/XP:** Earn XP based on actual studied seconds to level up ranks.
- **Heatmap:** 90-day GitHub-style focus heatmap.

### 💾 8. Backup & Data Mobility (Import / Export)
- **📤 Export JSON:** One-click full app backup (sessions, subjects, settings, activities).
- **📥 Import JSON:** One-click complete data restoration.
- **📊 CSV Export:** Individual CSV export for sessions, subject statistics, or all data.

---

## 🛠️ Build & Dev Commands

```bash
# Install dependencies
npm install

# Run frontend in development mode
npm run dev

# Compile standalone Windows desktop .exe installer
npm run electron:build
```

---

## 🔒 Privacy & Architecture Notice

FlowTrack Pro is a 100% standalone, offline desktop app. It requires **no Python servers**, **no cloud databases**, and **no background subscriptions**. All data remains on your local storage.
