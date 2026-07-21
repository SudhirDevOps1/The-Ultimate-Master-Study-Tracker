# FlowTrack Pro - Complete Setup Guide

## 🎯 Overview

This is a cross-platform study tracker that works on **Windows, macOS, and Linux**. It features:
- ✅ Local app usage tracking
- ✅ Browser tab activity analytics
- ✅ Productivity scoring
- ✅ Study session management
- ✅ Works even if backend fails (graceful degradation)
- ✅ Vercel-ready deployment

---

## 🚀 Quick Start

### Windows Users

**Option 1: Automatic Setup (Recommended)**
```bash
# Double-click setup_windows.bat
setup_windows.bat

# Then run the app
start_local.bat
```

**Option 2: Manual Setup**
```bash
# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate.bat

# Install dependencies
pip install psutil pywin32
python -m pywin32_postinstall -install

# Install frontend
npm install

# Start backend (Terminal 1)
python activity_tracker.py

# Start frontend (Terminal 2)
npm run dev
```

---

### macOS / Linux Users

**Option 1: Automatic Setup (Recommended)**
```bash
# Make script executable
chmod +x setup.sh

# Run setup
./setup.sh

# Then start the app
source venv/bin/activate
python activity_tracker.py  # Terminal 1
npm run dev                # Terminal 2
```

**Option 2: Manual Setup**

**macOS:**
```bash
# Install Homebrew first (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python and system tools
brew install python3 xdotool

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install psutil pyobjc

# Install frontend
npm install

# Start backend
python activity_tracker.py

# In another terminal, start frontend
npm run dev
```

**Linux:**
```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install python3 python3-venv python3-pip xdotool xprintidle

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install psutil

# Install frontend
npm install

# Start backend
python activity_tracker.py

# In another terminal, start frontend
npm run dev
```

---

## 📊 Using App Analytics

The app includes detailed usage analytics in `app_analytics.py`:

### Track Daily App Usage
```bash
curl http://localhost:5001/analytics/daily?days=7
```

### Get Browser Usage Stats
```bash
curl http://localhost:5001/analytics/browser?days=7
```

### View Peak Usage Hours
```bash
curl http://localhost:5001/analytics/peak-hours?days=7
```

### Calculate Productivity Score
```bash
curl http://localhost:5001/analytics/productivity?days=7
```

---

## 🌐 Deployment to Vercel

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)

### Steps

1. **Push to GitHub:**
```bash
git add .
git commit -m "Setup FlowTrack with cross-platform support"
git push
```

2. **Deploy to Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select the repository
   - Click "Deploy"

3. **Environment Variables (Optional):**
   In Vercel Dashboard → Settings → Environment Variables:
   ```
   VITE_BACKEND_URL=http://localhost:5001  # For local development
   ```

**Note:** The frontend will deploy as a static site and work even if the backend is unavailable.

---

## 🔧 Troubleshooting

### Issue: `pywin32 not found` on Linux/macOS Vercel
**Solution:** ✅ Already fixed! The `requirements.txt` no longer requires `pywin32` globally.

### Issue: Backend won't start
```bash
# Check if port 5001 is in use
# Windows:
netstat -ano | findstr :5001

# macOS/Linux:
lsof -i :5001

# If in use, kill it or use a different port
python activity_tracker.py 5002
```

### Issue: Frontend can't find backend
The app is configured to handle backend failures gracefully:
- ✅ Frontend runs independently
- ✅ Timer and session features work locally
- ✅ Sync with backend when available

### Issue: `xdotool` not found on Linux
```bash
# Install system package
sudo apt-get install xdotool xprintidle
```

### Issue: Permission denied on macOS/Linux
```bash
# Make scripts executable
chmod +x setup.sh
chmod +x start_local.sh
```

---

## 📁 Project Structure

```
.
├── activity_tracker.py       # Main backend (Python HTTP server)
├── app_analytics.py          # App usage analytics module
├── requirements.txt          # Python dependencies
├── setup_windows.bat         # Windows auto-setup script
├── setup.sh                  # macOS/Linux auto-setup script
├── start_local.bat           # Windows app launcher
├── src/                      # Frontend (React + TypeScript)
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   └── ...
├── package.json              # Node.js dependencies
├── vite.config.ts           # Vite config
└── vercel.json              # Vercel deployment config
```

---

## 🔗 API Endpoints

### Activity Tracking
- `GET /health` - Health check
- `GET /active-window` - Current active window
- `GET /status` - Tracker status
- `GET /config` - Current configuration
- `GET /stats?range=today|week|month` - Study statistics

### Session Management
- `GET /sessions?range=today` - List sessions
- `POST /sessions` - Create new session
- `PATCH /sessions/{id}` - Update session
- `DELETE /sessions/{id}` - Delete session

### Analytics *(New!)*
- `GET /analytics/daily?days=7` - Daily app usage
- `GET /analytics/browser?days=7` - Browser usage
- `GET /analytics/peak-hours?days=7` - Peak usage times
- `GET /analytics/productivity?days=7` - Productivity score

---

## 🎯 Features

### Activity Tracking
- Real-time app monitoring
- Idle/AFK detection
- Automatic app categorization (productive/distracting/neutral)
- Cross-platform support (Win/Mac/Linux)

### Analytics
- Daily app usage breakdown
- Browser tab activity tracking
- Peak usage hours
- Productivity scoring (0-100)
- 90-day history retention

### Study Sessions
- Pomodoro timer integration
- Session notes and goals
- Completion tracking
- Subject-based organization

### Gamification
- XP and leveling system
- Focus score calculation
- Daily streak tracking
- Rank system

---

## 💡 Smart Features

### Graceful Degradation
- ✅ Frontend works without backend
- ✅ Local data persists in IndexedDB
- ✅ Auto-sync when backend available

### Cross-Platform
- ✅ Windows (win32 + psutil)
- ✅ macOS (osascript + psutil)
- ✅ Linux (xdotool + psutil)

### Vercel-Ready
- ✅ Static frontend deployment
- ✅ Optional backend integration
- ✅ Environment variable support

---

## 📝 Configuration

Edit `activity_tracker.py` to customize:

```python
DEFAULT_CATEGORIES = {
    "productive": {
        "processes": ["code.exe", "idea64.exe", ...],
        "keywords": ["github", "stackoverflow", ...],
    },
    "distracting": {
        "processes": ["netflix.exe", "steam.exe", ...],
        "keywords": ["youtube", "twitch", ...],
    },
    "neutral": {...}
}
```

---

## 🚀 Performance Tips

1. **Poll Interval**: Lower = more accurate, higher = less CPU
   ```bash
   python activity_tracker.py --poll 3.0  # Default: 2.0
   ```

2. **Idle Threshold**: Seconds before marking as idle
   ```bash
   python activity_tracker.py --idle 300  # Default: 300 (5 min)
   ```

3. **Database Optimization**:
   - Analytics cleans old data (>90 days) automatically
   - Indexes on common queries

---

## 📞 Support

- **Issues?** Check BUGFIXES.md
- **New features?** See FEATURE_IDEAS.md
- **Setup problems?** Run the setup script with verbose output

---

## 📄 License

See LICENSE file

---

**Happy studying! 📚**
