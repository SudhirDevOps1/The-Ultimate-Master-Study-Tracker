# 📊 FlowTrack Pro — Analytics, Tracking Policy & Limitations

> **Version**: 7.2.0 | **Last Updated**: 2026-08-01 (v7.2.0 Production Release)

This document explains **exactly what FlowTrack Pro tracks**, **why**, **where the data lives**, **what it does NOT track**, and all **limitations** of every feature in the app.

---

## 🔍 What IS Tracked (and Why)

### 1. Study Sessions
| Data Collected | Purpose | Storage |
|---|---|---|
| Session start/end time (ISO 8601) | Duration, history, streaks | IndexedDB |
| Subject ID | Analytics by subject | IndexedDB |
| Planned minutes | Timer countdown | IndexedDB |
| Actual duration (seconds) | XP, analytics | IndexedDB |
| Session status | History, calendar view | IndexedDB |
| Notes (optional) | Personal reference | IndexedDB |

**⚠️ NEVER sent to any server. 100% offline, local-only.**

---

### 2. App Usage Tracking (Desktop App Only — via win-tracker.exe)
Polls every **5 seconds** using native Win32 GetForegroundWindow().

#### ✅ TRACKED:
- External browsers (Chrome, Edge, Firefox, Brave)
- IDEs & editors (VS Code, IntelliJ, Notepad++)
- Productivity (Word, Excel, OneNote, Notion)
- Communication (Discord, Zoom, Teams, Slack)
- Media players (VLC, Spotify, PotPlayer)
- Terminal (Windows Terminal, PowerShell, CMD)
- 🌐 Web Portals Browser (domain + page title when active)

#### ❌ NEVER TRACKED / SKIPPED:
- FlowTrack Pro itself (self-app exclusion — no fake self-tracking)
- Unknown/empty process names (invalid readings)
- Desktop (idle) state
- 3rd-party tracker pixels (Facebook, Google Analytics — blocked at network level)

#### 🌐 Special: Web Portals Browser Tracking
When a site is open in Web Portals:
- FlowTrack logs the **domain + page title** (e.g. apnacollege.in — Delta DSA) as the tracked activity
- Tracked as: appName = "🌐 Web Portals Browser", title = "domain.com — Page Title"
- When browser closes → tracking reverts to normal (FlowTrack skipped again)

**Data location**: %APPDATA%\FlowTrack Pro\activity-log\YYYY-MM-DD.json
**Max in-memory**: 10,000 entries. **Max retention loaded**: last 30 days.
**Title privacy**: truncated to 60 characters max.

---

### 3. Flashcard SRS Data
- Card front/back, ease factor, interval, repetitions, next review date
- All stored locally in IndexedDB. Never transmitted.

### 4. Notifications
- Study target reached, auto-pause, schedule reminders, blocker alerts
- Content never logged or stored.

---

## ❌ What is NEVER Tracked

| Never Tracked | Reason |
|---|---|
| Passwords, form inputs, private URLs | No webpage content reading |
| Full window titles > 60 chars | Truncated at source |
| Audio/video file contents | Only filename used |
| Keystrokes or clipboard | No keylogger — only Win32 ForegroundWindow API |
| Individual browser tab URLs | Only process name (e.g. chrome.exe) |
| Location, IP address, device ID | 100% offline, no telemetry |
| Crashlytics / analytics events | No Sentry, Firebase, or telemetry SDK |
| Your notes / flashcard text | Never leaves your device |

---

## 🔒 Privacy Guarantees
1. 100% Offline — No internet required
2. No Accounts / Sign-in required
3. No Telemetry — Zero analytics SDKs
4. No Auto-Update Telemetry
5. Open Source — All tracking code auditable in electron.js
6. DevTools Blocked in Production

---

## 📐 Feature Limitations

### ⏱️ Timer & Sessions
- Max planned duration: 1440 min (24h)
- Timer accuracy: ±1 second (JS setInterval)
- Pomodoro: Fixed 25/5 min (not configurable in UI)
- Auto-pause: 10 min inactivity (Strict Focus Mode only)
- Background timer: Continues; syncs on tab focus

### 📊 App Tracking (Desktop Only)
- Polling: Every 5 seconds (not real-time)
- Min logged duration: 3 seconds (shorter ignored)
- Platform: Windows only (win-tracker.exe is Win32)
- Browser tab detection: Process name only — NOT individual URLs
- Webview tracking: Domain + page title only (not full URL path)
- Web App: NOT available (no native OS access)

### 🌐 Web Portals Browser
- Desktop App only (Electron <webview> tag)
- Web App: Opens in external browser instead
- X-Frame-Options / CSP stripped → most sites work
- Google/YouTube login: Works (persistent session cookies)
- DRM content (Netflix etc.): May not work (Widevine not in dev builds)
- Custom sites: Unlimited (localStorage)

### 📖 PDF & OCR
- Max size: Limited by available RAM
- OCR engine: Tesseract.js (offline, browser-based)
- OCR languages: English (default config)
- OCR accuracy: ~85-95% for printed text; handwriting NOT supported

### 🃏 Flashcards (SM-2 SRS)
- Algorithm: SuperMemo SM-2 (1987, proven)
- Buttons: Again / Hard / Good / Easy
- Import: Manual only (no Anki .apkg import)
- Image/audio cards: Not supported (text only)

### 📅 Scheduler / Calendar
- Recurring events: NOT supported
- External calendar sync: NOT supported (no Google Calendar)
- Reminders: OS notification (requires browser permission)

### 🧠 Mind Maps
- Engine: Excalidraw (infinite canvas)
- Export: PNG / SVG via Excalidraw toolbar
- Collaboration: NOT supported (local only)

### 🤖 AI Assistant
- Engine: Google Gemini API (requires API key + internet)
- Offline: NOT available
- Key storage: localStorage (not encrypted)

### 🛡️ App/Site Blocker
- Hard block: taskkill /F (terminates process)
- Medium block: PowerShell minimize
- Browser tabs: CANNOT block individual tabs (whole browser only)
- Platform: Windows only

---

## 📦 Tech Stack
React 19 + TypeScript + Vite 7 | Electron 34 | Zustand (IndexedDB) | Excalidraw | PDF.js | Tesseract.js | SuperMemo SM-2 | Win32 win-tracker.exe | Web Audio API | Google Gemini API

---

## 🗂️ Data Storage Locations
| Data | Location |
|---|---|
| Study sessions, subjects, tasks, flashcards, mind maps | IndexedDB (browser) |
| Activity logs | %APPDATA%\FlowTrack Pro\activity-log\*.json |
| Block rules | %APPDATA%\FlowTrack Pro\block-rules.json |
| Web portal bookmarks | localStorage (key: web_portals_custom_sites) |
| App settings | IndexedDB via Zustand persist |

---

## 🚀 What Can You Use FlowTrack Pro For?

✅ Track daily study hours by subject
✅ Pomodoro timer + ambient binaural beats
✅ Plan & schedule sessions on calendar
✅ Monitor real app usage (vs. intended study)
✅ Browse any course site in-app (Apna College, YouTube, PW, Coursera, etc.)
✅ Block distracting apps during study (Discord, Games, YouTube)
✅ Unlimited flashcard decks with SM-2 spaced repetition
✅ Mind maps & concept diagrams (Excalidraw)
✅ Session notes (Quill rich text editor)
✅ PDF viewer + OCR text extraction
✅ Local video/audio player (no external player needed)
✅ AI study assistant (Google Gemini)
✅ Export data as CSV or PDF report
✅ Full analytics (heatmap, subject breakdown, streaks, app usage)
✅ Works completely offline (except AI features)
✅ App/website blocker with 3 strictness levels
✅ XP + leveling gamification system

*FlowTrack Pro is built for serious students. All data stays on your machine.*
