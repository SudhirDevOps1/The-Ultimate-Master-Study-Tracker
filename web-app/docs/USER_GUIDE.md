# FlowTrack Pro - Complete User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Feature Overview](#feature-overview)
3. [How Each Section Works](#how-each-section-works)
4. [Tips & Tricks](#tips--tricks)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## Getting Started

### First Time Setup

1. **Start the Backend (Optional but Recommended)**
   - **Windows:** Double-click `start_local.bat`
   - **macOS/Linux:** Run `bash start_local.sh`
   
   This enables real-time app tracking and analytics.

2. **Open the App**
   - Frontend automatically opens at `http://localhost:5173`
   - If not, paste this URL in your browser

3. **Create Your First Subject**
   - Go to **Subjects** tab
   - Click "Create New Subject"
   - Name it (e.g., "Math", "Biology", "Programming")

4. **Start a Study Session**
   - Go to **Timer** tab
   - Select your subject
   - Click "Start Focus Session"
   - Study for the timer duration

---

## Feature Overview

### 📊 Dashboard
**What it shows:** Your daily progress at a glance
- **Progress Ring:** How much of your daily goal you've completed
- **Daily Stats:** Total focus time, sessions, subjects studied
- **Weekly Summary:** Your study trends over the week
- **App & Tab Usage:** Which apps and websites you use most (requires backend)
- **PDF Companion Workspace:** Side-by-side textbook reader pane with workspace notes.
- **Multilingual Speech Reader (TTS):** Natural audio profile speech synthesizer for reading textbook pages aloud in Hindi & English (male/female selectable options).
- **Gamified Focus Quests:** Daily boss fights powered by your study XP statistics rewards.
- **Achievements:** Badges you've unlocked
- **Level & Rank:** Your current level and rank in the gamification system

**How to use:**
- Check here every morning to see your target
- Check throughout the day to stay motivated
- Click on stats to drill down into details

### ⏱️ Timer
**What it does:** Tracks focused study sessions with the Pomodoro technique
- Standard: 25 min focus + 5 min break
- Custom: Set your own session duration
- Auto-starts next session when break ends

**How to use:**
1. Select a **Subject**
2. Select **Session Duration** (25m, 45m, 90m, or custom)
3. Click **Start Focus Session**
4. Study while timer counts down
5. When it ends, take a break
6. Session auto-saves to your history

**Tips:**
- Use the 25-minute Pomodoro for focused sprints
- Use 45-60 minutes for deep work
- Use 90 minutes for complex problem-solving

### 📈 Analytics
**What it shows:** Your study patterns over time
- **Daily View:** How many hours you studied each day
- **Weekly View:** Total hours and session count per week
- **Monthly View:** Long-term trends and progress
- **Subject Breakdown:** Which subjects you spend most time on
- **Productivity Scores:** Your consistency and focus quality

**How to use:**
- Review weekly to identify patterns
- Compare weeks to see if you're improving
- Use this to set better goals
- Identify your peak productivity hours

### 📚 Subjects
**What it does:** Organize your studies by subject
- Create subjects for each class, course, or topic
- Track total time spent on each
- See top subjects by study time
- Color-code for easy identification

**How to use:**
1. Click "Create New Subject"
2. Name it (e.g., "Organic Chemistry", "JavaScript", "Spanish")
3. Optional: Add color, icon, and notes
4. Click "Save"
5. Select this subject when starting a timer

**Tips:**
- Create subjects matching your actual courses
- Use consistent naming (avoid "Class 1", "Class 2")
- Review your subject list each semester

### 📋 History
**What it shows:** All your past study sessions
- Complete list of every session
- Duration, subject, date, and time
- Session notes and feedback
- Search and filter by date or subject

**How to use:**
- Review past sessions to understand your habits
- Edit session notes if needed
- Look for patterns (best times, longest streaks, etc.)
- Delete sessions you want to remove

### 🎯 Goals
**What it shows:** Your daily and weekly study targets
- **Daily Goal:** Target study hours per day (e.g., 4 hours)
- **Weekly Goal:** Target hours per week (e.g., 25 hours)
- **Progress Tracking:** See how close you are to hitting goals
- **Streak Tracking:** Consecutive days meeting your goal

**How to set:**
1. Go to **Settings** → **Goals**
2. Set your **Daily Goal** (e.g., 4 hours)
3. Set your **Weekly Goal** (e.g., 25 hours)
4. Click **Save**

**Motivation tips:**
- Set realistic goals based on your schedule
- Build gradually (start small, increase over time)
- Celebrate reaching milestones
- Don't reset on missed days—just keep going!

### 🏆 Achievements
**What it shows:** Badges and milestones you've unlocked
- **Milestone Badges:** Time-based achievements (1h, 10h, 100h, etc.)
- **Streak Badges:** Consecutive days of studying
- **Speed Badges:** Completing sessions quickly
- **Consistency Badges:** Regular, habitual studying

**How to unlock:**
- Keep using the app and logging study sessions
- Achievements unlock automatically based on your progress
- Some are time-based, others are consistency-based

**Examples:**
- 🥚 Chick Egg: First 1-hour session
- 🚀 Rocket: 10 hours total study
- 🔥 Fire: 7-day study streak
- 👑 Crown: 100 hours total study

### 📱 Foreground App & Tab Usage
**What it shows:** Which applications and websites you use (requires backend)
- **Time by App:** Top 5 applications you use most
- **Time by Website:** Top 5 websites/browser tabs you visit
- **Category Breakdown:** Productive vs. Distracting vs. Neutral time
- **Focus Score:** Your focus percentage based on app usage
- **Streak:** Consecutive days of study focus

**How it works:**
1. **Enable:** Start backend using `start_local.bat` or `start_local.sh`
2. **Automatic:** Tracks active window every 5-10 seconds
3. **Display:** Updates every 10 seconds in real-time
4. **Categories:**
   - ✅ **PRODUCTIVE:** IDEs, editors, note apps, study tools
   - ❌ **DISTRACTING:** Social media, games, YouTube
   - ⚙️ **NEUTRAL:** File explorer, system tools, Slack
   - ⏸️ **IDLE/AFK:** Computer idle or screensaver

**Tips:**
- Use this to identify time-wasting apps
- Set goals to reduce distracting app time
- Notice your peak focus hours
- Share stats with study group for accountability

### ⚙️ Settings
**What you can configure:**
- **Theme:** Dark mode, light mode, custom colors
- **Daily Goal:** How many hours per day you want to study
- **Weekly Goal:** How many hours per week you target
- **App Preferences:** Notifications, sound, appearance
- **Data Management:** Export data, backup, import
- **About:** Version, credits, support links

---

## How Each Section Works

### Understanding Your Progress Ring

The progress ring on the dashboard shows you how close you are to your daily goal.

```
Progress Ring = (Hours Studied Today / Daily Goal) × 100%

Examples:
- Goal: 4 hours, Studied: 2 hours → 50% (half filled)
- Goal: 4 hours, Studied: 3 hours → 75% (3/4 filled)
- Goal: 4 hours, Studied: 4 hours → 100% (completely filled)
```

### Understanding Your Focus Score

Your focus score measures how productive your app usage is.

```
Focus Score = (Productive Time / Total Active Time) × 100%

Example:
- Productive time: 2.5 hours (studying, coding, writing)
- Distracting time: 0.5 hours (social media, games)
- Neutral time: 0.5 hours (file explorer, settings)
- Idle time: 0.5 hours (AFK, screensaver)

Focus Score = (2.5 / 4.0) × 100% = 62.5%
```

**Target:** Aim for 70%+ focus score for optimal productivity.

### Understanding Your Streak

Your **study streak** is the number of consecutive days you've met your daily goal.

```
Examples:
- Studied every day this week → 7-day streak
- Missed yesterday → streak resets to 0
- Study today → streak rebuilds to 1

Streaks are powerful for motivation!
```

### Understanding Your Level & XP

As you study, you gain XP which increases your level.

```
XP Gained Per Session = Duration (minutes) × Intensity Multiplier

Multipliers:
- Normal focus: 1.0x (e.g., 25m session = 25 XP)
- High focus (70%+): 1.5x (e.g., 25m session = 37.5 XP)
- Distraction-free: 2.0x (e.g., 25m session = 50 XP)

Levels:
- Level 1-5: Beginner (0-500 XP)
- Level 6-15: Intermediate (500-2000 XP)
- Level 16-30: Advanced (2000-5000 XP)
- Level 31+: Master (5000+ XP)
```

---

## Tips & Tricks

### Productivity Tips

1. **Start Small**
   - Don't aim for 10 hours on day 1
   - Start with 1-2 hours and build gradually
   - Consistency beats intensity

2. **Use the Pomodoro Technique**
   - 25 min focus + 5 min break = 1 Pomodoro
   - After 4 Pomodoros, take a 15-30 min break
   - Most people can do 6-8 Pomodoros per day

3. **Study During Peak Hours**
   - Check analytics to find your peak focus time
   - Schedule important subjects during these hours
   - Reserve low-energy hours for review or admin

4. **Minimize Distractions**
   - Close social media, gaming apps, and news sites
   - Use website blockers if needed
   - Put your phone in another room
   - Check the Focus Score in app usage section

5. **Build Streaks**
   - Consistency is key
   - Study every day to build your streak
   - Even 30 minutes counts!
   - Streaks create accountability

### Using Analytics Effectively

1. **Weekly Review (Sunday Evening)**
   - Check your weekly stats
   - Calculate: Total hours studied this week ÷ 7 = avg per day
   - Compare to your goal
   - Plan next week

2. **Monthly Analysis (End of Month)**
   - Look at month-over-month progress
   - Identify which subjects took most time
   - Check which weeks had highest productivity
   - Set goals for next month

3. **Subject Deep-Dive**
   - Review time spent per subject
   - Adjust based on exam dates or deadlines
   - Focus more on weak subjects
   - Balance your study across all subjects

### Optimization Tips

1. **Subject Organization**
   - Create subjects that match your actual courses
   - Use consistent naming
   - Review/update subjects every semester

2. **Goal Setting**
   - Make goals challenging but realistic
   - Base on your actual schedule
   - Adjust if not hitting consistently

3. **Regular Backups**
   - Export your data monthly
   - Save it to cloud storage or external drive
   - Helps if you switch computers

---

## Troubleshooting

### Backend is Offline
**Problem:** "Backend server is OFFLINE" message

**Solutions:**
1. Make sure backend is started:
   - **Windows:** Double-click `start_local.bat`
   - **macOS/Linux:** Run `bash start_local.sh`
2. Wait 30 seconds for backend to initialize
3. Refresh the page (Ctrl+R or Cmd+R)
4. Check console (F12) for errors

### No Activity Data
**Problem:** Backend is online but no app tracking data

**Solutions:**
1. Wait 1-2 minutes for data to accumulate
2. Use some applications (don't leave computer idle)
3. Switch between windows to trigger tracking
4. Check that your OS is supported (Windows, macOS, Linux)

### Timer Not Working
**Problem:** Timer won't start or isn't counting down

**Solutions:**
1. Refresh page (Ctrl+R)
2. Select a subject first
3. Check browser console (F12) for errors
4. Try different browser
5. Clear browser cache

### App Running Slowly
**Problem:** Lag or slow response times

**Solutions:**
1. Close unnecessary browser tabs
2. Clear browser cache (Ctrl+Shift+Delete)
3. Disable browser extensions
4. Check internet connection
5. Restart browser

### Lost Data
**Problem:** Sessions or data disappeared

**Solutions:**
1. Check browser's local storage isn't cleared
2. Check if using private/incognito mode (data doesn't persist)
3. Import from backup if you have one
4. Contact support with your email

### Backend Connection Issues
**Problem:** Backend keeps disconnecting

**Solutions:**
1. Ensure Windows Defender/Antivirus isn't blocking port 5000
2. Check firewall settings
3. Restart backend service
4. Check for error messages in terminal

---

## FAQ

### Q: Do I need the backend to use FlowTrack?
**A:** No, but it's recommended. Frontend works without it, but you won't get app/tab usage tracking.

### Q: Is my data private?
**A:** Yes, all data is stored locally on your computer. Nothing is sent to external servers (except when you export).

### Q: Can I use this on multiple computers?
**A:** Yes, but data is stored separately on each. You can export/import data between computers.

### Q: How often should I check my analytics?
**A:** Daily is motivating, weekly is optimal. Monthly gives you long-term perspective.

### Q: What if I miss a day?
**A:** Your streak resets, but that's okay! Just start fresh the next day. The goal is long-term consistency, not perfection.

### Q: Can I customize my daily goal?
**A:** Yes, go to Settings → Goals and set your target hours.

### Q: How many subjects should I have?
**A:** Usually match your actual courses. 3-8 is typical. More than 10 gets hard to manage.

### Q: What's a good daily goal?
**A:** Depends on your schedule:
- High school student: 1-3 hours
- College student: 2-4 hours
- Exam prep: 4-6 hours
- Professional learning: 0.5-2 hours

### Q: Why is my focus score low?
**A:** You're spending time on distracting apps. Try:
- Closing social media while studying
- Using website blockers
- Moving phone to another room
- Setting app limits

### Q: Can I delete a session?
**A:** Yes, go to History and delete individual sessions.

### Q: How do I export my data?
**A:** Go to Settings → Data Management → Export Data

### Q: Is there a mobile app?
**A:** Not yet, but you can use it in any modern browser on mobile devices.

---

## Support

If you need help:
1. Check this guide first
2. Review the Troubleshooting section
3. Check the GitHub repository for known issues
4. Contact support on GitHub Issues

Good luck with your studies! 🚀
