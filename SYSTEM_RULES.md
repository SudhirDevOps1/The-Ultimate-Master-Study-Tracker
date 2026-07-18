# FlowTrack - System Rules & Comprehensive Guide

> **Master Study Tracker for Students** - A professional, privacy-first study management system designed for serious learners.

---

## Table of Contents

1. [Core System Rules](#core-system-rules)
2. [Activity Detection & Auto-Pause](#activity-detection--auto-pause)
3. [App Usage Tracking](#app-usage-tracking)
4. [Data Management](#data-management)
5. [AI Assistant Configuration](#ai-assistant-configuration)
6. [Time Tracking Rules](#time-tracking-rules)
7. [Study Session Management](#study-session-management)
8. [Gamification & Achievements](#gamification--achievements)
9. [Data Import/Export](#data-importexport)
10. [Browser Storage & Privacy](#browser-storage--privacy)
11. [Troubleshooting](#troubleshooting)

---

## Core System Rules

### 1. **Strict Focus Mode** (Recommended for Exams & Deadlines)

When **Strict Focus Mode** is enabled:

- **Auto-Pause on Inactivity**: If no user activity (mouse, keyboard, touchscreen) is detected for **10 minutes**, the current session **automatically pauses**.
- **Activity Tracking**: Every user interaction (click, scroll, keystroke, touch) resets the inactivity timer.
- **Notification**: A desktop notification is sent when auto-pause occurs.
- **Why**: Prevents inflated time tracking from idle time. Ensures accurate study hours logged.

**Enable Strict Focus Mode in Settings:**
```
Settings → Timer Options → Strict Focus Mode (Toggle ON)
```

**How it Works:**
```
Timeline:
├─ 0:00 → User studying (activity detected)
├─ 5:00 → Still active (keeps running)
├─ 8:00 → User steps away (no activity)
├─ 10:00 ← Session AUTO-PAUSES
│          ↓ Notification sent
│          ↓ `actualSeconds` frozen
└─ User returns → Resume session
```

### 2. **Daily Goal System**

- **Daily Goal (Default: 4 hours)**: Target study hours per day.
- **Weekly Target (Default: 20 hours)**: Total hours to study across 7 days.
- **Streaks**: Consecutive days with study >= 1 hour counts as a "streak day".
- **Progress Tracking**: Dashboard shows real-time progress toward daily/weekly goals.

**How it Works:**
1. Set your daily goal in Settings.
2. Plan study sessions on the Calendar.
3. Track time spent on each session.
4. System calculates completion % and provides insights.

### 3. **Session Status System**

Each study session has one of these statuses:

| Status | Meaning | User Action |
|--------|---------|-------------|
| **planned** | Session created but not started | Start session on Timer |
| **in_progress** | Session is currently running | Pause, Resume, or Stop |
| **paused** | Session paused (inactivity or manual) | Resume or Stop |
| **completed** | Session finished successfully | View in History & Analytics |

### 4. **Time Accuracy Rules**

- **Actual Seconds**: Only counts time when session is actively running (status = in_progress).
- **Idle Time NOT Counted**: If inactive for 10 mins (Strict Focus ON), timer pauses automatically.
- **Manual Entry**: Backdate study sessions with notes for offline study.
- **Rounding**: Time is stored in seconds for precision.

---

## Activity Detection & Auto-Pause

### Detected User Activities

FlowTrack monitors these user interactions:

```
✓ Mouse clicks
✓ Keyboard input (all keys)
✓ Touchscreen input
✓ Scrolling
✓ Mouse movement
```

### Auto-Pause Logic

**Threshold**: 10 minutes of NO activity

**When Strict Focus Mode is ON:**

```
Timeline:
├─ 0:00 → User studying (activity detected)
├─ 5:00 → Still active (keeps running)
├─ 8:00 → User steps away (no activity)
├─ 10:00 ← Session AUTO-PAUSES
│          ↓ Notification sent
│          ↓ actualSeconds frozen
└─ User returns → Resume session
```

**Notification:**
- Title: "FlowTrack - Auto Pause"
- Message: "No activity detected for 10 minutes. Your session has been paused."

---

## App Usage Tracking

### What FlowTrack Tracks

FlowTrack now monitors your app and browser tab usage to understand study patterns:

**Browser Tabs:**
- Domain/app name extracted from tab title and URL
- Duration spent on each tab
- Hourly breakdown

**Daily Stats Include:**
- Total time spent studying
- Breakdown by app/website
- Hourly usage patterns
- Activity summary

### View App Usage

1. Go to **Analytics** or **Today** page
2. See **App Usage Breakdown**
3. Identify which apps you spent the most time on
4. Export data for detailed analysis

### Privacy & Local Storage

- **Local Only**: All app activity data is stored locally in your browser
- **No Cloud Sync**: Data is not sent to servers
- **Full Control**: You can export or delete data anytime
- **GDPR Compliant**: Zero cloud data collection

---

## Data Management

### Daily Tasks View

Access **📋 Today** page to see:
- All tasks planned for today
- Current date and day
- Progress toward daily goal
- Active, paused, completed, and upcoming tasks
- Quick navigation to each session

### Import/Export Data

**Export Your Data:**
1. Go to **Settings → Data Management**
2. Click **Export All Data**
3. Choose format: **JSON** or **CSV**
4. Download your data

**Import Data:**
1. Go to **Settings → Data Management**
2. Click **Import Data**
3. Select file (JSON or CSV)
4. Review and confirm import

### Data Safety

- ✓ All data is stored locally in IndexedDB
- ✓ No encryption required (browser handles it)
- ✓ Backup by exporting regularly
- ✓ No automatic cloud backup

---

## AI Assistant Configuration

### Supported AI Providers

FlowTrack supports multiple AI providers for personalized study advice:

#### Tier 1: Free & Private
- **Local AI Rules**: Uses built-in rules engine (no API needed)
- **Ollama**: Private local LLM running on your computer

#### Tier 2: Premium APIs
- **OpenAI ChatGPT**: Most capable, costs money
- **Google Gemini**: Fast, requires API key
- **Groq**: Ultra-fast LLM API
- **Cerebras**: High-speed inference
- **Mistral AI**: European privacy-focused
- **xAI Grok**: Advanced reasoning model

### Setup Custom Provider

**Step 1: Get API Key**
- Visit provider's website
- Create account and generate API key
- Copy the key (keep it secret!)

**Step 2: Configure in FlowTrack**
1. Go to **🤖 AI Assistant**
2. Scroll to **⚙️ Configuration**
3. Select provider from dropdown
4. Paste API key in "API Key" field
5. Select model from list
6. Click **Test Connection** to verify

**Step 3: Save Settings**
- Click **Save Settings**
- Confirm "✅ AI Settings saved locally!"

### Testing Your Setup

1. Paste your API key
2. Select a model
3. Click **Test Connection**
4. Result shows if key is valid:
   - ✅ **Success**: "Successfully connected to [Provider]!"
   - ❌ **Error**: Message explains what's wrong

### Using AI Assistant

Once configured:
1. Type your study question
2. AI provides personalized advice based on your:
   - Study history
   - Goals and targets
   - Current streak and achievements
3. View token usage (for paid providers)

### Cost Control

**Free Providers:**
- Local AI Rules: $0/month
- Ollama: $0/month (local)

**Paid Providers (Approx):**
- Groq: $0.05-0.20 per 1M tokens
- Google Gemini: $0.075 per 1M tokens
- OpenAI: $0.30-3.00 per 1M tokens

**Pro Tip**: Use Groq for best balance of speed and cost.

---

## Time Tracking Rules

### Session Duration Rules

- **Minimum Duration**: 1 second counts
- **Maximum Per Session**: No limit
- **Fractional Minutes**: Stored as seconds for precision
- **Timezone**: Uses local browser timezone

### Planned vs Actual

- **Planned Minutes**: Duration set when creating session
- **Actual Seconds**: Time session actually ran
- **Difference**: Shown as variance for analysis

### Manual Entry

For offline study:
1. Go to **Calendar** or **Timer**
2. Click **Add Manual Entry**
3. Enter:
   - Date of study
   - Hours studied
   - Optional notes
4. Save - counts toward goals

---

## Study Session Management

### Creating a Session

1. Go to **📅 Calendar** or **⏱️ Timer**
2. Click **New Session**
3. Fill in:
   - **Subject**: Choose from your subjects
   - **Start Time**: When you'll study
   - **End Time**: Planned duration
   - **Color Tag**: For visual organization
   - **Notes**: Optional study notes
4. Click **Create**

### During a Session

- Click **Start** to begin timer
- Timer runs and counts `actualSeconds`
- Actions available:
  - ⏸️ **Pause**: Stop counting (manual)
  - ▶️ **Resume**: Continue counting
  - ⏹️ **Stop**: End session (auto-saves)

### After Session Completes

- Session auto-saves if timer reaches end
- Status changes to `completed`
- Counts toward daily/weekly goals
- Appears in History and Analytics

### Editing Sessions

- Click session → **Edit**
- Modify start/end time or notes
- Changes saved immediately

---

## Gamification & Achievements

### XP & Level System

- **XP**: Earned from study time (1 XP per 36 seconds)
- **Levels**: Based on total XP
- **Ranks**: Titles earned as you level up

### Achievements

**Study Milestones:**
- First Session: Complete 1 study session
- 10+ Hours: Study for 10 hours total
- Streak 7: 7 consecutive days with 1+ hour
- Perfect Week: Hit daily goal all 7 days

**Behavioral:**
- Strict Focus Master: 5 sessions with Strict Focus ON
- Early Bird: Study before 8 AM
- Night Owl: Study after 10 PM
- Subject Master: 50 hours on single subject

### Streaks

- **Daily Streak**: Count consecutive days with 1+ hour study
- **Lost Streak**: Missing one day resets it
- **Maintained Streak**: Shows in Dashboard

---

## Data Import/Export

### Export Formats

#### JSON Format
- Complete data structure
- Includes all metadata
- Best for backup and re-import
- Human-readable

#### CSV Format
- Spreadsheet compatible
- Open in Excel/Sheets
- Sessions list with times
- Good for analysis

### Export Steps

1. **Settings** → **Data Management**
2. Click **Export All Data**
3. Choose format
4. Download file
5. Save to safe location

### Import Steps

1. **Settings** → **Data Management**
2. Click **Import Data**
3. Select previously exported file
4. Review data preview
5. Click **Confirm Import**

---

## Browser Storage & Privacy

### Storage Technology

- **IndexedDB**: Main database for sessions, subjects
- **localStorage**: Settings and preferences
- **sessionStorage**: Temporary session data

### Storage Limits

- **Desktop Browser**: Typically 50-100 MB
- **Mobile Browser**: Typically 5-10 MB
- **Status**: Shown in Settings

### Clear Storage

**To clear all data:**
1. **Settings** → **Data Management**
2. Click **Clear All Data**
3. Confirm deletion
4. Cannot be undone

### Privacy Features

✓ **No Account Required** - Study anonymously
✓ **No Cloud Sync** - Everything stays local
✓ **No Analytics** - Your data isn't sold
✓ **No Ads** - Clean, distraction-free experience
✓ **No Tracking** - No cookies or fingerprinting

---

## Troubleshooting

### Sessions Not Saving

**Problem**: Sessions appear but disappear after reload

**Solution**:
1. Check browser allows IndexedDB (Settings → Storage)
2. Ensure sufficient storage space (5-20 MB free)
3. Clear browser cache and reload
4. Try different browser
5. Export data before clearing

### Auto-Pause Not Working

**Problem**: Session doesn't pause after 10 minutes of inactivity

**Solution**:
1. Verify **Strict Focus Mode** is ON in Settings
2. Check that session status is `in_progress`
3. Ensure desktop notifications allowed
4. Try refreshing page
5. Check browser permissions

### AI Assistant Returns Errors

**Problem**: Connection test fails or empty responses

**Solution**:
1. Verify API key is correct (don't include quotes)
2. Check internet connection
3. Confirm provider website is online
4. Try different provider
5. Check token/credit balance if paid service

### Data Not Exporting

**Problem**: Export button doesn't work or no file downloads

**Solution**:
1. Check pop-up permissions
2. Disable pop-up blockers
3. Try different browser
4. Ensure JavaScript enabled
5. Check browser console for errors

### Performance Issues

**Problem**: App slow or lagging

**Solution**:
1. Export data and clear storage
2. Close unnecessary browser tabs
3. Disable animations in Settings
4. Update browser to latest version
5. Try in Incognito mode

---

## Quick Reference Commands

### Keyboard Shortcuts (When Enabled)

- **Space**: Start/Pause session
- **Shift+Space**: Stop session
- **Ctrl+S**: Save settings
- **Ctrl+E**: Export data

### Settings Path Quick Links

```
Dashboard → Settings → Timer Options → Strict Focus Mode
Dashboard → Settings → Data Management → Export Data
Dashboard → 🤖 AI Assistant → ⚙️ Configuration
```

---

## Support & Feedback

For issues or suggestions:
1. Check **📖 Guide** page in app
2. Review this documentation
3. Check browser console for errors (`F12`)
4. Export your data before major changes

---

**Last Updated:** July 2026
**Version:** 2.0.0

---
