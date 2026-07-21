# 🚀 Ultimate AI Master Prompt — Recreate FlowTrack Pro Desktop App

> **Instructions for AI:** Copy and paste the prompt below into any AI agent (Cursor, Gemini Antigravity, Claude, ChatGPT) to recreate this exact 100% standalone, native desktop application from scratch.

---

```text
Build a complete, 100% standalone, production-ready desktop application for Windows 11 called "FlowTrack Pro".
The application must be a privacy-first Study Tracker and ActivityWatch-grade native digital wellbeing app.

==============================================================================
1. TECH STACK & ARCHITECTURE REQUIREMENTS
==============================================================================
- Shell: Electron 43+ (Windows 11 compatible)
- Frontend: React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + Framer Motion
- State Management: Zustand + Dexie (IndexedDB)
- Icons & Visuals: Lucide-react + Recharts / D3.js
- Local Storage: Daily JSON files stored strictly inside `%AppData%\FlowTrackPro\activity-log\YYYY-MM-DD.json`
- Privacy: 100% Local Device Storage. Zero cloud uploads, zero external Python backends, zero remote dependencies.

==============================================================================
2. NATIVE WIN32 ACTIVE WINDOW & IDLE ENGINE (CRITICAL)
==============================================================================
- DO NOT use slow/unreliable PowerShell polling or ffi-napi (to prevent CPU spikes & timeouts).
- Build a lightweight native C# Win32 helper binary (`win-tracker.exe`) compiled using `Add-Type` / C# compiler:
  * Uses `GetForegroundWindow`, `GetWindowText`, and `GetWindowThreadProcessId` via User32.dll.
  * Outputs compressed JSON string: {"process":"chrome","title":"GitHub - Page Title"} in under 2ms.
- Self-Exclusion Rule: Automatically exclude FlowTrack itself (`flowtrackpro.exe`, `electron.exe`) from activity logs.
- Web Browser Tab & Domain Extractor:
  * Automatically extract domain names (e.g. `youtube.com`, `github.com`, `stackoverflow.com`, `chatgpt.com`) and clean website titles from browser window titles (Chrome, Edge, Firefox, Brave).
  * Auto-load site favicons via Google Favicon API (`https://www.google.com/s2/favicons?domain=...`).

==============================================================================
3. DUAL-LAYER HYBRID SMART INACTIVITY DETECTOR
==============================================================================
- Implement a dual-layer hybrid inactivity engine in React hooks:
  * Layer 1 (Win32 Kernel API): Query Win32 `GetLastInputInfo` for hardware-level Mouse, Keyboard, Touchpad, and Stylus input (works globally even when minimized or in System Tray).
  * Layer 2 (In-App DOM Event Watcher): Listen to `mousemove`, `keydown`, `scroll`, `touch`, `wheel` with 0ms latency.
- Behavior:
  * 10 Minutes No Activity -> Auto-pause active study session + send Windows desktop notification.
  * Input/Movement Detected -> Instantly AUTO-RESUME active study session without manual clicks.

==============================================================================
4. CORE STUDY TIMER & POMODORO ENGINE
==============================================================================
- Study Timer: Target-based session timer per subject with live title bar sync `[24:15] Physics - FlowTrack`.
- Freeze-Proof Countdown: Set `backgroundThrottling: false` in Electron. Use `Date.now()` timestamp deltas to prevent timer lag when minimized.
- System Tray Integration: Minimizing or closing window sends app to System Tray. Background timer & process tracker run uninterrupted.
- Picture-in-Picture (PiP): 30fps canvas-stream floating overlay timer with a 10-second heartbeat to keep focus mode valid while watching video lectures.

==============================================================================
5. DASHBOARD & UI FEATURES
==============================================================================
- Dashboard Page:
  * Live Active Window widget (Native IPC connection).
  * App Category Breakdown bar chart (Productive / Distracting / Neutral).
  * Top 5 Applications & Top 5 Active Window Titles lists.
  * Algorithmic Focus Score (0-100) + Level/XP gamification system + 90-day GitHub-style focus heatmap.
  * Subject balance warnings (alerts if one subject is over-studied while others are neglected).
- App Tracking Page (4 Dedicated Tabs):
  1. 📊 Overview: Category percentage distribution & live `LIVE` app indicators.
  2. 📈 24-Hour Timeline: Gantt-style visual timeline chart per app.
  3. 🌐 Web Sites & Tabs: Real-time website domains, web tab titles, favicons, visit counts, and spent time.
  4. 🪟 Windows Log: Timestamped list of focused window titles.
  5. Date Breadcrumb History & Native CSV Data Export.
- Backup & Mobility: Complete 1-click JSON backup export/import + CSV export for sessions and subject statistics.
- Extras: Ambience Player (Rain, Cafe, White Noise + YouTube support), PDF Reader, Rich Text Notes Board (Export to PNG), Today Tasks list.

==============================================================================
6. BUILD & PACKAGING
==============================================================================
- Include `win-tracker.exe` inside `package.json` `extraResources` array for `electron-builder`.
- Package into standalone Windows NSIS installer `.exe` using `npm run electron:build`.
```
