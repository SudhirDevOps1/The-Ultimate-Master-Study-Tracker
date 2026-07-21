# FlowTrack - System Rules & Privacy Policy

> **Master Study Tracker for Students** - A professional, privacy-first study management system designed for serious learners.

---

## Table of Contents

1. [Core System Rules](#core-system-rules)
2. [Activity Detection & Auto-Pause](#activity-detection--auto-pause)
3. [Data Privacy & Security](#data-privacy--security)
4. [Time Tracking Rules](#time-tracking-rules)
5. [Study Session Management](#study-session-management)
6. [AI Assistant Guidelines](#ai-assistant-guidelines)
7. [Gamification & Achievements](#gamification--achievements)
8. [Data Import/Export](#data-importexport)
9. [Troubleshooting](#troubleshooting)

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

### How Activity Detection Works

FlowTrack monitors these user interactions:

```
✓ Mouse clicks
✓ Keyboard input
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
│          ↓ `actualSeconds` frozen
└─ User returns → Resume session
```

**When Strict Focus Mode is OFF:**

- Timer continues running even if inactive.
- User must manually pause/stop.
- Useful for passive study (watching lectures, reading).

### Re-activation

When user returns and performs any activity:

1. **Auto-Paused session detected**.
2. **Notification**: "Session was paused due to inactivity."
3. **Option 1**: Click "Resume" to continue.
4. **Option 2**: Click "Stop" to finish.

---

## Data Privacy & Security

### Storage Location

| Data | Storage Method | Encryption | Access |
|------|---|---|---|
| Sessions, Subjects | **IndexedDB** (Local) | Browser-native | Local only |
| AI API Keys | **IndexedDB** (Local) | Browser-native | Local only |
| Study Logs | **IndexedDB** (Local) | Browser-native | Local only |
| Cloud Sync (Optional) | Firebase | Server-side | User authentication only |

### Key Guarantees

✅ **All data stored locally by default** - No cloud transmission unless you explicitly enable Firebase sync.

✅ **API Keys NEVER transmitted** - Stored securely in browser IndexedDB.

✅ **Study logs are private** - Never shared with AI providers unless you explicitly send a message.

✅ **GDPR Compliant** - You can export all data as JSON/CSV and delete everything locally.

### What Gets Transmitted?

**Only when explicitly used:**

1. **AI Queries**: When you ask the AI assistant a question, your study context (name, goals, recent sessions) is sent to the selected AI provider.
2. **Cloud Sync**: If enabled, sessions/subjects are synced to Firebase with your Google account.
3. **Nothing else** - Analytics, timer data, and achievements stay local.

### How to Stay 100% Private

1. **Use Local AI Rules** - Free, offline, rule-based responses. No API calls made.
2. **Use Ollama** - Download & run locally. No internet required.
3. **Disable Cloud Sync** - Keep all data in your browser only.
4. **Disable Notifications** - No data leaves your device.

---

## Time Tracking Rules

### Planned vs Actual Time

```
Example Session:
┌─────────────────────────────────────┐
│ Subject: Mathematics                │
│ Planned: 2 hours (120 minutes)       │
│ Actual: 1h 45m 30s (studied time)    │
│ Status: Completed                    │
│ Completion %: 87.5%                  │
└─────────────────────────────────────┘
```

### Rules for Time Accuracy

1. **Only Running Time Counts**: Paused time does NOT add to actual seconds.
2. **Strict Accuracy**: Each second is counted when timer is active.
3. **No Backdating Auto-Pauses**: If Strict Focus auto-paused a session, that gap time is NOT counted.
4. **Manual Entries Supported**: Add past sessions with custom duration.

### Rounding & Display

- **Internal**: Seconds (highest precision)
- **Display**: Hours:Minutes:Seconds or HH:MM format
- **Export**: Full precision (seconds)

---

## Study Session Management

### Creating a Session

**Option 1: Manual Planning (Recommended for students)**
```
Steps:
1. Go to Timer → Select Subject
2. Set Start & End time
3. Add Notes (optional)
4. Click "Create Session"
5. Session appears on Calendar
```

**Option 2: Quick Manual Entry**
```
Steps:
1. Go to Analytics → Manual Entry
2. Select subject, date, hours studied
3. Add notes
4. System calculates actualSeconds
```

### Session Recurrence

Create recurring sessions for weekly routines:
```
Mathematics - 2 hours every Monday, Wednesday, Friday at 6 PM
Physics - 1.5 hours daily (except Sunday)
```

**How to Set Up:**
```
Timer → Edit Session → Recurrence
├─ Daily, Weekly, Monthly, Custom
├─ Set end date (optional)
└─ Copy to N occurrences
```

### Session Editing & Rescheduling

**Edit Planned Sessions:**
```
Calendar → Click Session → Edit
├─ Change time, duration, subject
├─ Modify notes/tags
└─ Save
```

**Reschedule Active Sessions:**
```
Timer (during session) → Options
├─ Pause & reschedule to tomorrow
├─ Clone to another date
└─ Cancel & delete
```

---

## AI Assistant Guidelines

### Strict Boundaries

The AI Study Coach is **restricted to study-related topics only**:

✅ **Allowed Topics:**
- Your study patterns & performance
- Study schedule recommendations
- Focus & time management tips
- Exam preparation strategies
- Subject-specific study advice (based on your logs)

❌ **Not Allowed:**
- General knowledge/trivia unrelated to your studies
- Cooking, sports, entertainment, politics
- Coding help unrelated to your studies
- General chat/conversation

### Using the AI Assistant

**Step 1: Set Up Provider**

Default: **Local AI Rules** (free, offline, 100% private)

Optional Providers:
- Google Gemini (free tier available)
- Groq Cloud (ultra-fast, generous free tier)
- OpenAI, Mistral, Cerebras, xAI Grok
- **Custom Provider** (your own API/local setup)

**Step 2: Configure API Key**

```
AI Assistant → AI Setup → Select Provider
├─ Paste API key (if required)
├─ Test Connection
└─ Save Settings
```

**Step 3: Ask Questions**

Suggested prompts:
- "Why did I study less this week?"
- "When is my peak study time?"
- "Generate a revision plan for my subjects"

### Custom Provider Setup

For advanced users:

```
AI Setup → Provider: Custom
├─ Provider Name: "My Custom API" (display name)
├─ API Endpoint: https://api.example.com/v1/chat/completions
├─ Model Name: gpt-4, claude-3, etc.
├─ API Key: (paste your key)
├─ Test Connection
└─ Save
```

**Requirements:**
- Must support OpenAI-compatible API format
- POST endpoint accepting `model`, `messages`, `temperature`
- Valid bearer token authentication

---

## Gamification & Achievements

### Achievements System

Unlock badges by reaching milestones:

| Achievement | Requirement | Reward |
|---|---|---|
| First Session | Complete 1 session | Badge + 10 XP |
| Streak 7 | 7 consecutive study days | Badge + 50 XP |
| Streak 30 | 30 consecutive study days | Badge + 200 XP |
| Focused 2H | Study 2 hours in one session | Badge + 25 XP |
| Focused 4H | Study 4 hours in one session | Badge + 100 XP |
| Daily Goal 7 | Hit daily goal 7 days | Badge + 75 XP |
| Daily Goal 30 | Hit daily goal 30 days | Badge + 300 XP |
| All Subjects | Study all your subjects | Badge + 150 XP |

### Level & Rank System

```
XP → Level → Rank

Total XP ÷ 1000 = Level
Level ÷ 10 = Rank progression

Ranks:
├─ Seeker (Level 1-10)
├─ Scholar (Level 11-20)
├─ Architect (Level 21-30)
├─ Master (Level 31-40)
├─ Grandmaster (Level 41-50)
└─ Zen Sage (Level 51+)
```

### XP Calculation

```
Studied Seconds ÷ 36 = XP earned

Example:
1 hour studied = 3,600 seconds ÷ 36 = 100 XP
1 week (20 hrs) = 72,000 seconds ÷ 36 = 2,000 XP
```

---

## Data Import/Export

### Export Your Data

**Step 1: Go to Analytics → Download**

Options:
- **JSON**: Full backup (all sessions, subjects, settings)
- **CSV**: Spreadsheet-friendly format for analysis
- **PDF**: Formatted report with charts

**Step 2: Save to Device**

File naming: `flowtrack_backup_[date].json`

### Import Data

**Step 1: Prepare File**

Must be valid JSON from a previous FlowTrack export.

**Step 2: Analytics → Import**

- Select file
- Review preview
- Confirm import
- System merges/overwrites based on selection

### Backup Best Practices

1. **Export weekly** to prevent data loss.
2. **Store backups** in cloud (Google Drive, Dropbox).
3. **Test import** on a spare device first.
4. **Keep previous exports** for version control.

### Data Safety Warnings

⚠️ **Before deleting subjects:**
- All associated sessions will be deleted.
- Data cannot be recovered.
- Export first if you want to keep records.

⚠️ **Before clearing all data:**
- This action is irreversible.
- Export all data first.
- You'll need to re-add subjects from scratch.

---

## Troubleshooting

### Issue: Auto-Pause Not Working

**Problem**: Session doesn't pause after 10 minutes of inactivity.

**Solution**:
1. Check Settings → **Strict Focus Mode is enabled** ✓
2. Verify **Notifications are enabled** (optional, for feedback)
3. Try moving your mouse → Timer should resume on any activity
4. Check browser console for errors: `F12 → Console`

### Issue: AI Assistant Says "Access Denied"

**Problem**: API returns error when sending messages.

**Solutions**:
- Verify API Key is correct (copy-paste from provider)
- Test Connection first: AI Setup → Test Connection
- Check if API key has expired (regenerate on provider's site)
- Ensure model name matches provider's available models
- Check internet connection

### Issue: Sessions Not Saving

**Problem**: Sessions disappear after refresh.

**Solutions**:
1. Check IndexedDB quota:
   ```
   F12 → Application → IndexedDB → flowtrack_db
   ```
2. Clear browser cache: Settings → Clear Browsing Data
3. Check if browser is in Private/Incognito mode (data lost on close)
4. Try a different browser
5. Export data and reimport

### Issue: Time Not Counting Correctly

**Problem**: Actual seconds seems too low or too high.

**Solutions**:
1. Check if session was paused (look for pause indicator)
2. Verify Strict Focus didn't auto-pause (check notifications)
3. If using multiple tabs, ensure only one tab is running timer
4. Refresh page to sync timer state
5. Check session status in History → Detailed view

### Issue: Import Fails

**Problem**: "Invalid JSON" or merge errors.

**Solutions**:
1. Verify file is from FlowTrack export (has correct fields)
2. Check for file corruption (try exporting from another device)
3. Try importing subjects first, then sessions separately
4. Use a JSON validator: https://jsonlint.com/
5. If still failing, clear data and reimport fresh

---

## Getting Help

### Documentation
- **In-App Guide**: Timer → Help icon → Feature walkthrough
- **This File**: Full system rules reference

### Reporting Issues
1. Check troubleshooting section above
2. Open browser console: `F12 → Console`
3. Note any error messages
4. Test in another browser/device
5. Contact support with:
   - Browser & OS version
   - Error message (if any)
   - Reproduction steps

### Feature Requests
Have an idea to improve FlowTrack?
- Suggest in-app via Settings → Feedback
- Document your use case clearly
- Include mockups/examples if possible

---

## Version Info

**Current Version**: 2.0.0  
**Last Updated**: July 2024  
**Compatibility**: Modern browsers (Chrome, Firefox, Safari, Edge)

**Features:**
- PWA (works offline)
- IndexedDB storage (local)
- Custom AI provider support
- Activity detection & auto-pause
- Import/Export (JSON, CSV, PDF)
- Gamification & achievements
- Calendar view & session planning

---

**FlowTrack** - Made for serious students who want to track their focus, analyze their study patterns, and achieve their academic goals with precision and privacy.

Happy studying! 📚✨
