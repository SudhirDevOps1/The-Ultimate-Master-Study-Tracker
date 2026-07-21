# 📗 FlowTrack Pro – Honest Technical Architecture & User Operations Manual

> **Honest Engineering Guarantee:**  
> FlowTrack Pro is built as a 100% offline, native Windows Electron desktop application. There are no dummy fallbacks, no cloud APIs, and no fake mocks. Everything operates on actual Win32 system APIs and local file storage.

---

## 🔍 HONEST ANSWER: Minimize, Maximize & Background Behavior

### ❓ "Jab hum study timer start karenge aur app MINIMIZE ya MAXIMIZE karenge, toh kya sab sach mein kaam karega?"

**YES! 100% HONESTLY WORKS.**  
Here is *exactly* how and why it works technically without freezing or stopping:

1. **Timer Minimization & Background Throttling Fix (`electron.js`):**
   - Standard browsers throttling/pause timers when a window is minimized to save CPU.
   - We explicitly set `backgroundThrottling: false` in Electron's `webPreferences`.
   - **Result:** The JavaScript engine runs at 100% full speed even when minimized to the taskbar or System Tray.

2. **Freeze-Proof Delta Timestamps (`usePomodoro.ts` & `useTimer.ts`):**
   - Instead of relying solely on `setInterval` ticks (which can lag), we record `startedAtMs = Date.now()`.
   - Every tick calculates `elapsed = Math.floor((Date.now() - startedAtMs) / 1000)`.
   - **Result:** Even if Windows suspends the app for a few milliseconds, the moment it wakes, `Date.now()` calculates the exact real-world elapsed time down to the second.

3. **System Tray Integration (`electron.js`):**
   - Clicking **Minimize** or pressing **Close (X)** hides the window to the Windows System Tray (near the clock).
   - The timer and app tracker continue running uninterrupted in the background.
   - Right-click tray icon → **Open** restores the app instantly without resetting anything.

4. **Background Hardware Activity Tracking (`electron.js`):**
   - Active process tracking uses Win32 `GetForegroundWindow` and `GetWindowThreadProcessId` running in a 5-second background loop inside the Node.js main process.
   - **Result:** It tracks what app/website you are using *outside* FlowTrack (e.g. Chrome, VS Code, Games) while FlowTrack is minimized!

---

## 🗂️ FILE-BY-FILE MAP & HOW EACH COMPONENT WORKS

Below is the complete file breakdown showing what each file does, why it exists, and how to use it.

```text
The-Ultimate-Master-Study-Tracker/
├── electron.js                          # 🧠 Main Node.js/Win32 Process
├── README.md                            # 📖 Overview documentation
├── package.json                         # ⚙️ Project dependencies & scripts
├── vite.config.ts                       # ⚡ Vite build configuration
└── src/
    ├── main.tsx                         # 🚀 React entry point
    ├── App.tsx                          # 🔀 Router & Live Title Bar Handler
    ├── store/
    │   └── useAppStore.ts               # 💾 Global State & Session Lock Engine
    ├── hooks/
    │   ├── useTimer.ts                  # ⏱️ Core Study Timer Hook
    │   ├── usePomodoro.ts               # 🍅 Timestamp-based Pomodoro Hook
    │   └── useInactivityDetector.ts     # 🛌 Dual-Layer Hybrid Inactivity Detector
    ├── pages/
    │   ├── DashboardPage.tsx            # 📊 Main Overview & Gamification Dashboard
    │   ├── AppTrackingPage.tsx          # 🖥️ ActivityWatch 24-hr Gantt & Web Monitor
    │   ├── TimerPage.tsx                # 🎯 Primary Study Timer & Target Interface
    │   ├── HistoryPage.tsx              # 📜 Session Records & History Log
    │   ├── SubjectsPage.tsx             # 📚 Subject Manager & Color Codes
    │   ├── AnalyticsPage.tsx            # 📈 In-depth Study Charts
    │   └── SettingsPage.tsx             # ⚙️ App Preferences & Toggles
    └── components/
        ├── dashboard/
        │   └── BackendActivityPanel.tsx # 🔌 Dashboard Live Native IPC Widgets
        └── timer/
            ├── FloatingTimer.tsx        # 📺 Picture-in-Picture Floating Overlay
            └── AmbiencePlayer.tsx       # 🎵 Focus Sound & Ambience Player
```

---

## 🛠️ DETAILED EXPLANATION OF CORE FILES

### 1. `electron.js` (Main Desktop Engine)
- **Role:** Handles window creation, system tray, Win32 API calls, persistent JSON storage, and background activity polling.
- **Key Functions:**
  - `getForegroundWindow()`: Executes Win32 PowerShell queries to capture the exact active process (e.g., `chrome.exe`) and active window title.
  - `getSystemIdleMs()`: Executes Win32 `GetLastInputInfo` to get system-wide hardware idle time (Keyboard, Mouse, Touchpad, Stylus).
  - `startActivityTracker()`: Runs a 5-second polling loop. Filters out FlowTrack itself (`isSelf()`) and appends non-self activity to local storage.
  - `saveLogToFile()`: Automatically saves activity logs to `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json` every 30 seconds and on app exit.
  - `export-activity-csv`: Generates downloadable CSV spreadsheet reports.

### 2. `src/hooks/useInactivityDetector.ts` (Dual-Layer Hybrid Smart Engine)
- **Role:** Monitors inactivity and controls automatic Pause & Resume of your study session.
- **How It Works (Hybrid Dual-Layer):**
  - **Layer 1 (Hardware Win32):** Queries Electron IPC `get-idle-time-ms` every 5 seconds for global Windows idle time.
  - **Layer 2 (In-App DOM):** Listens to local `mousemove`, `keydown`, `scroll`, `touch` events with 0ms latency.
- **Behavior:**
  - **10 Minutes No Input:** Session auto-pauses + Windows desktop notification is sent.
  - **Movement/Input Detected:** Session **Auto-Resumes** instantly without manual clicks.

### 3. `src/pages/AppTrackingPage.tsx` (ActivityWatch-Style & Web Monitor)
- **Role:** Comprehensive UI for viewing app usage, website domain stats, Gantt timelines, and logs.
- **Tabs Explained:**
  - **📊 Overview:** Shows total hours, app usage breakdown with animated bars, category tags, and live green **`LIVE`** badges.
  - **📈 Timeline:** 24-hour Gantt chart showing hourly time blocks per application.
  - **🌐 Web Sites & Tabs:** Extracts domains (e.g., `youtube.com`, `github.com`, `chatgpt.com`), loads official favicons, and tracks clean web tab titles, duration, and visit counts.
  - **🪟 Windows:** Chronological timestamped list of every window title focused throughout the day.
  - **Breadcrumbs & Export:** Select any historical date to review past logs or click **Export CSV** to save data.

### 4. `src/hooks/useTimer.ts` & `src/hooks/usePomodoro.ts`
- **Role:** Controls session countdowns, Pomodoro intervals, and window title updates.
- **How It Works:**
  - `useTimer.ts` updates `document.title = "[24:15] Physics - FlowTrack"` live in real-time.
  - Respects the `autoPauseOnHidden` store setting — if disabled, minimizing the window keeps the timer running smoothly.
  - `usePomodoro.ts` manages Work/Short Break/Long Break phases using timestamp deltas so cycle countdowns remain 100% accurate.

### 5. `src/components/dashboard/BackendActivityPanel.tsx` & `DashboardPage.tsx`
- **Role:** Displays live widgets directly on your main Dashboard.
- **Widgets:**
  - **Live App Tracker:** Shows active window title with green `Connected` badge.
  - **Category Breakdown Bar Chart:** Productive vs Distracting vs Neutral time.
  - **Top Applications:** Top 5 apps by time spent.
  - **Top Window Titles:** Top 5 active window titles/tabs by time spent.

### 6. `src/components/timer/FloatingTimer.tsx` (PiP Mode)
- **Role:** Always-on-top mini floating overlay timer.
- **How It Works:** Uses a 30fps canvas stream. Fires a 10-second heartbeat to ensure Strict Focus Mode doesn't auto-pause your session while watching a floating video overlay.

---

## 🎯 HOW, WHEN & WHY TO USE EACH FEATURE

| Feature | When to Use | How it Helps You |
| :--- | :--- | :--- |
| **Study Timer (`/timer`)** | Before starting a study target (e.g., 2 hours Physics) | Keeps you accountable with live title bar countdowns & target completion alarms. |
| **Pomodoro Mode** | When studying dense or intense material | Prevents burnout by cycling 25m focus / 5m break automatically. |
| **App Tracking (`/app-tracking`)** | End of the day or during study reviews | Shows an honest 24-hr breakdown of where your time actually went (Study vs YouTube vs Games). |
| **Web Sites & Tabs Monitor** | When researching online | Tracks specific web tabs (GitHub, StackOverflow, ChatGPT) with favicons and visit counts. |
| **PiP Floating Overlay** | While watching lecture videos or reading PDFs | Keeps the countdown timer visible on top of your video or document. |
| **System Tray** | When working in other desktop applications | Keeps tracking your study session and app usage silently in the background. |
| **CSV Export** | End of the week/month | Allows exporting raw activity records for personal analysis in Excel. |

---

## 🔄 COMPLETE USER WORKFLOW (STEP-BY-STEP)

1. **Launch App:** Open `FlowTrack Pro` from your Desktop shortcut or run `FlowTrackPro Setup 1.0.0.exe`.
2. **Start a Session:** Go to **Timer**, select your Subject (e.g. Mathematics), set planned minutes, and click **Start Session**.
3. **Study / Work:** Minimize FlowTrack or switch to VS Code / Chrome.
   - The title bar will show `[59:30] Mathematics - FlowTrack`.
   - Native tracking logs your Chrome/VS Code usage automatically.
4. **Take a Break or Go Idle:**
   - If you leave your desk for 10 minutes, the Dual-Layer Hybrid Detector **Auto-Pauses** your session.
   - When you return and move the mouse, the session **Auto-Resumes** automatically.
5. **Review Activity:** Go to **App Tracking** to view your 24-hr Gantt timeline, top applications, and website domain statistics.

---

*FlowTrack Pro Engine Manual — 100% Offline, Privacy-First Desktop Architecture.*
