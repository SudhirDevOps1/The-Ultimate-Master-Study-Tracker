# 🚀 FlowTrack Pro: The Ultimate Master Study Tracker

> **The professional-grade, strict productivity ecosystem built for relentless learners.**

---

## 🌟 Executive Summary

**FlowTrack Pro** is not just a timer; it is a full-scale study ecosystem. Built to solve the problems of digital distraction, it combines high-precision engineering with gamified psychology. It is designed for students, developers, and researchers who need a tool that is as serious about their time as they are.

---

## 💎 Premium Design Philosophy

FlowTrack and its "Pro" iterations are built on three core pillars of modern software design:

### 1. Minimalist Immersive UI
- **Glassmorphism**: Subtle translucency and blurred background elements create a sense of depth without distraction.
- **Dynamic Theming**: Six curated professional themes (Ocean, Forest, Sunset, Galaxy, Neon, Cyber) to match your mood and focus level.
- **Framer Motion Integration**: Every transition is mathematically smoothed to ensure the UI feels "alive" and premium.

### 2. The "Strict Focus" Engine
Most trackers fail because they rely on simple browser timers. FlowTrack Pro uses a **Delta-Sync Logic**:
- It tracks the exact millisecond you started.
- It calculates elapsed time against the system hardware clock.
- It is resilient to browser crashes, tab sleeps, and OS-level battery saving.

### 3. Privacy-First Sovereignty
In an era of data harvesting, FlowTrack Pro is a fortress.
- **No Cloud Required**: 100% of your data stays in your browser's IndexedDB.
- **Zero Tracking**: No telemetry, no ads, no external cookies.
- **Local Ownership**: You own your database. Export it, back it up, or clear it whenever you want.

---

## 🔥 Master Feature Breakdown

### ⏲️ Ultra-Precision Timer System
*The heart of the application.*
- **System-Level Accuracy**: Derived from `Date.now()` timestamps, not JS intervals.
- **Auto-Pause Awareness**: Detects visibility changes and pauses instantly when the tab is hidden to prevent "cheating".
- **Resilient Recovery**: Automatically picks up exactly where it left off after a refresh or crash.

### 📺 Advanced Picture-in-Picture (Floating Timer)
*Study over any app.*
- **Always-on-Top**: Using the Document PiP API, it floats above VS Code, PDF Readers, and YouTube.
- **Mini-Controller**: Control music, skip tracks, and monitor progress without leaving your study app.
- **Real-Time Heartbeat**: Keeps the browser process active even when minimized.
- **Interaction passthrough**: Mouse movements over the mini-timer reset the idle countdown.

### 🎮 Gamification & The XP Economy
*Turning focus into progress.*
- **XP Calculation**: Fixed rate of 1 XP/Minute, ensuring fair progress tracking.
- **Leveling Curve**: A custom logarithmic formula (`Math.floor(Math.sqrt(totalXP / 10))`) that makes early levels fast and late levels prestigious.
- **The "Rank" System**: Progress through titles:
  - 🌱 **Novice Seeker** (Level 1-5)
  - 📖 **Focused Scholar** (Level 6-15)
  - 🧠 **Master Learner** (Level 16-30)
  - 👑 **Flow Sovereign** (Level 31+)
- **Streak Heatmap**: A 90-day GitHub-style contribution map to visualize your consistency.
- **Daily Focus Score**: Machine learning-inspired formula that calculates a 0-100 score based on targeted hours, completion %, and distraction deductions.

### 📊 Professional Analytics Suite
- **Granular Filtering**: Filter sessions by subject, completion status, or date ranges.
- **Visual Trends**: Multi-axis Recharts displaying Daily, Weekly, Monthly, and Yearly performance.
- **Subject Mastery**: Pie charts and bar graphs showing which subjects you are dominating.
- **Planned vs. Performance**: Automatic calculation of "Goal Attachment" (did you study as much as you planned?).

### 🎧 Immersive Ambience & Soundscapes
- **Focus LO-FI**: Built-in streaming focus music.
- **Floating YouTube Ambience**: Add custom YouTube URLs to a personal playlist that floats natively across the app via a Picture-in-Picture window.
- **Curated Environmental Audio**: Heavy Rain, Paris Cafe, Ancient Forest, White Noise.
- **Layered Controls**: Independent volume sliders.

### 📳 OS-Native Push Notifications & Background Service
- The tracker runs a dedicated Service Worker allowing it to send Native OS Web Push Alerts (macOS/Windows/Android) even when the browser is minimized or sleeping.

### 🌐 Dual-Mode Database (Guest vs Cloud)
- **Guest Mode**: 100% Offline IndexedDB data storage. No login required.
- **Cloud Sync Mode**: Authenticate to seamlessly synchronize local data to Firebase/Supabase, ensuring zero data loss across devices.

---

## 🏗️ Technical Architecture & Developer Map

### 📁 Detailed Directory Map
```text
FlowTrack-Pro/
├── .gemini/                # Configuration for advanced AI assistance
├── public/                 # Static Assets
│   ├── manifest.json       # PWA transformation settings
│   ├── sw.js               # Service Worker core logic (Caching & Offline)
│   └── icons/              # Multi-resolution branding assets
├── src/                    # The Engine Room
│   ├── components/         # Modular UI Components
│   │   ├── charts/         # Analytics layer (Recharts implementation)
│   │   │   ├── ActivityHeatmap.tsx
│   │   │   └── SubjectChart.tsx
│   │   ├── common/         # Foundation components
│   │   │   ├── Button.tsx
│   │   │   ├── Panel.tsx   # The "Glass" container base
│   │   │   └── Modal.tsx
│   │   ├── layout/         # High-level architecture
│   │   │   ├── Navbar.tsx
│   │   │   └── TabNavigation.tsx
│   │   ├── session/        # Business logic for session management
│   │   │   └── SessionForm.tsx
│   │   └── timer/          # Core timer functionality
│   │       ├── FloatingTimer.tsx # PiP Implementation
│   │       ├── TimerDisplay.tsx
│   │       └── AmbiencePlayer.tsx
│   ├── hooks/              # Custom Logic Containers
│   │   └── useTimer.ts     # The "Brain" of the time tracking system
│   ├── lib/                # Third-party integrations
│   │   └── db.ts           # Dexie/IndexedDB configuration
│   ├── pages/              # View layer
│   │   ├── TimerPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── HistoryPage.tsx
│   ├── store/              # Global State Management
│   │   └── useAppStore.ts  # Master State (Zustand)
│   ├── types/              # TypeScript Contract layer
│   │   └── models.ts       # Global interfaces (StudySession, Subject, etc.)
│   └── utils/              # Pure utility functions
│       ├── time.ts         # Formatting & Math
│       └── xp.ts           # Leveling logic
├── artifacts/              # Development history & Roadmap
├── package.json            # Dependency manifest
├── vite.config.ts          # Build system configuration
└── README.md               # The Master Document
```

---

## 🧠 Deep Logic Implementations

### 1. The Delta-Timer Algorithm
Instead of trusting `setInterval` (which is inconsistent in browsers), we use:
```typescript
elapsed = isPaused ? savedElapsed : (Date.now() - startedAtMs)
```
This ensures that even if the browser stops the JS execution for 5 minutes to save battery, when it wakes up, the math remains 100% correct.

### 2. IndexedDB Synchronization
Using **Dexie.js**, we implement a "Transactional Sync":
- Every 1 second of active study, the `activeSession` is updated in the database.
- This creates a "Checkpointed Save" system.
- If the user's laptop dies, they only ever lose a maximum of 1 second of data.

### 3. The PWA "Offline-First" Strategy
- **Service Worker**: Cache-first strategy for static assets.
- **Manifest**: Allows the "Install App" button in Chrome/Edge, making it look and feel like a native Windows/Mac app.
- **Offline Analytics**: Since Recharts and calculation logic are local, graphs work perfectly even in airplane mode.

---

## 🛠️ Technology Specification

- **Core**: [React 18](https://react.dev/)
- **Build System**: [Vite](https://vitejs.dev/)
- **Type Safety**: [TypeScript 5+](https://www.typescriptlang.org/)
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [Dexie](https://dexie.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Motion**: [Framer Motion](https://www.framer.com/motion/)
- **Date Math**: [date-fns](https://date-fns.org/)
- **Graphs**: [Recharts](https://recharts.org/)

---

## 🚀 Deployment & Setup

### 💻 Automatic Desktop Launcher (Windows - Recommended)
If you want to run FlowTrack with local activity tracking (foreground window / tab usage tracking):
1. Simply double-click `start_local.bat`.
2. This batch script will automatically:
   - Verify Python is installed and create a `.venv` virtual environment if it doesn't exist.
   - Install required dependencies (`pywin32`, `psutil`).
   - Run the background activity tracker on `http://localhost:5001`.
   - Install Node package dependencies (`npm install`).
   - Start the Vite server and open FlowTrack in your browser.

### 🌐 Manual Developer Setup
1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```
2. **Start the Web app developer server**:
   ```bash
   npm run dev
   ```
3. **Start the Python activity tracker (optional)**:
   ```bash
   python activity_tracker.py
   ```

---

## 🐍 Python Activity Tracker (`activity_tracker.py`) — OPTIONAL

> **⚠️ Important**: The Python backend is **100% OPTIONAL**. FlowTrack works perfectly fine without it. All core features (timer, analytics, subjects, AI assistant, PiP, gamification, export/import) are fully browser-based and do not depend on Python at all.

### What does it do?

The `activity_tracker.py` is a tiny local HTTP server that runs on `http://localhost:5001`. It provides **one single feature**: detecting which application window is currently in the foreground on your desktop.

### Why is it useful?

When the Python tracker is running, FlowTrack shows a **"Active: Chrome - YouTube"** or **"Active: VS Code"** badge on your dashboard. This tells you:

| Feature | Without Python | With Python |
|---------|---------------|-------------|
| Timer & Tracking | ✅ Full | ✅ Full |
| Analytics & Charts | ✅ Full | ✅ Full |
| AI Assistant | ✅ Full | ✅ Full |
| PiP Floating Timer | ✅ Full | ✅ Full |
| Gamification & XP | ✅ Full | ✅ Full |
| Export/Import | ✅ Full | ✅ Full |
| **Active Window Detection** | ❌ Not available | ✅ Shows current app name |

### How does it work?

```
[Browser / FlowTrack PWA]
        |
        | HTTP GET /active-window (every 5 seconds)
        ▼
[Python Server @ localhost:5001]
        |
        | Uses win32gui + psutil to read foreground window
        ▼
    Returns: { "title": "VS Code - main.tsx", "process": "Code.exe" }
```

- It uses Windows APIs (`win32gui`, `win32process`) to read the title of the currently focused window.
- It polls every 5 seconds from the browser side.
- If the Python server is not running, FlowTrack silently ignores it — no errors, no warnings.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/active-window` | GET | Returns current foreground window title and process name |
| `/health` | GET | Returns `{"status": "ok"}` for diagnostics |

### Requirements (only if you want to use it)

- **Python 3.8+**
- **Windows only** (uses `win32gui` which is Windows-specific)
- Packages: `pywin32`, `psutil` (auto-installed by `start_local.bat`)

### Running it manually

```bash
# Default port 5001
python activity_tracker.py

# Custom port
python activity_tracker.py 5002
```

---

## 🌐 Cloud Deployment (Vercel / Cloudflare Pages)

FlowTrack is designed to be fully static-hostable! You can deploy it to **Vercel** or **Cloudflare Pages** in less than 2 minutes.

### ⚡ Deployment with Vercel / Cloudflare:
1. **Push to GitHub**: Push your codebase to a private or public GitHub repository.
2. **Import Project**: Select the repository in the Vercel/Cloudflare Pages dashboard.
3. **Build settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Deploy**: Click deploy. Your app is now live on a global CDN!

### 🤔 What happens if I deploy online & don't use the `.py` backend?
- The app works **100% perfectly**! All data is saved inside your local browser database (IndexedDB).
- You can access FlowTrack on your phone, tablet, and laptop.
- The **only** difference is that online browser environments cannot track desktop window titles (e.g. VS Code, Chrome tabs) because of sandbox restrictions. The Python desktop daemon (`activity_tracker.py`) is only needed if you want automatic active window tracking on Windows desktop. If you don't run it, the system simply runs offline/local browser mode with zero errors.

---

## 🧠 Local AI & Ollama Integration

To use the AI Assistant fully offline and private with **Ollama**:
1. Install [Ollama](https://ollama.com).
2. Configure **CORS** so the browser-based FlowTrack client is allowed to connect to Ollama:
   - **Windows CMD**:
     ```cmd
     set OLLAMA_ORIGINS=*
     ollama serve
     ```
   - **Windows PowerShell**:
     ```powershell
     $env:OLLAMA_ORIGINS="*"
     ollama serve
     ```
   - **macOS/Linux**:
     ```bash
     OLLAMA_ORIGINS="*" ollama serve
     ```
3. Open FlowTrack, navigate to **AI Assistant > Settings (Gear Icon)**, select **Ollama**, click **Auto-Detect Models**, and save configuration.

---

## 📝 Usage & Strict Design Guidelines

- **Backup Naming**: Whenever you export your workspace data from the Settings page, FlowTrack generates the filename dynamically based on the current date, e.g., `15-06-2026.json`.
- **Cheat Prevention**: Actual time for timed sessions is locked in the editor. Only manual session logs can have their studied time directly edited.
- **Strict Inactivity auto-pause**: If Strict Focus Mode is enabled and a session is running, the timer will automatically pause and trigger a system notification after **10 minutes** of zero active mouse movement, touchpad interactions, keyboard inputs, or scroll/touch activity.
- **Floating Timer**: Click **Open Floating Timer** to launch a persistent window widget on top of all other windows (e.g. while studying offline PDFs or coding).

---

## 📜 Version Credits & Info
- **FlowTrack Pro v2.2.0**
- **Engineered by Sudhir Singh for the Global Student Community.**
- **Privacy Policy**: 100% Local. AI API keys are stored securely in your browser's IndexedDB and are never shared or uploaded.
