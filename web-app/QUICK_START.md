# Quick Start Guide 🚀

## 3-Minute Setup

### Windows
```bash
# 1. Double-click this file:
setup_windows.bat

# 2. Wait for completion (~1-2 min)

# 3. Double-click this:
start_local.bat

# 4. Open http://localhost:5173
```

### macOS / Linux
```bash
# 1. Open terminal in project folder

# 2. Run setup
chmod +x setup.sh
./setup.sh

# 3. Run app
bash start_local.sh

# 4. Open http://localhost:5173
```

---

## ✅ What Just Happened?

### Installed
- ✅ Python 3.9+
- ✅ Virtual environment (`venv/`)
- ✅ Python packages (psutil + platform-specific tools)
- ✅ Node.js packages (React, Vite, Tailwind, etc.)

### Now Running
- **Backend**: http://localhost:5001 (Activity tracking)
- **Frontend**: http://localhost:5173 (React app)

---

## 🎯 Quick Commands

```bash
# Start everything
bash start_local.sh      # macOS/Linux
start_local.bat          # Windows

# Just backend
source venv/bin/activate  # macOS/Linux
python activity_tracker.py

# Just frontend
npm run dev

# Build for production
npm run build

# View database
sqlite3 flowtrack.db
```

---

## 🌐 API Endpoints

```bash
# Check if backend is running
curl http://localhost:5001/health

# Get current active window
curl http://localhost:5001/active-window

# Get today's stats
curl http://localhost:5001/stats?range=today

# Get app usage (NEW!)
curl http://localhost:5001/analytics/daily?days=7

# Get browser usage (NEW!)
curl http://localhost:5001/analytics/browser?days=7
```

---

## 📊 Features

- ✅ **App Tracking**: See which apps you use and how long
- ✅ **Browser Analytics**: Track website and tab usage
- ✅ **Study Sessions**: Create and track study sessions
- ✅ **Focus Score**: Auto-calculated based on productivity
- ✅ **Daily Streaks**: Maintain consistent study habits
- ✅ **XP & Levels**: Gamification system
- ✅ **Works Offline**: Local storage, syncs when online

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Python not found | [Install Python](https://www.python.org) |
| Node not found | [Install Node.js](https://nodejs.org) |
| Port 5001 in use | `python activity_tracker.py 5002` |
| Port 5173 in use | `npm run dev -- --port 5174` |
| Permissions denied | `chmod +x setup.sh start_local.sh` |

---

## 📖 Documentation

- **Setup Details**: See `SETUP_GUIDE.md`
- **Backend Info**: See `BACKEND_INTEGRATION.md`
- **Full Features**: See `README.md`

---

## 🚀 Deploy to Vercel

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for production"
git push

# 2. Go to https://vercel.com
# 3. Click "New Project"
# 4. Import your GitHub repo
# 5. Click "Deploy"
# Done! ✅
```

---

## 💡 Pro Tips

### Get Maximum Performance
```bash
# Reduce polling for less CPU
python activity_tracker.py --poll 3.0

# Or increase idle threshold
python activity_tracker.py --idle 600
```

### Clear Old Data
```bash
# Delete sessions older than 30 days
sqlite3 flowtrack.db "DELETE FROM sessions WHERE created_at < datetime('now', '-30 days');"
```

### Export Data
```bash
# Export to CSV
sqlite3 -header -csv flowtrack.db "SELECT * FROM sessions;" > export.csv
```

---

## ❓ Questions?

Check these files in order:
1. `QUICK_START.md` (this file)
2. `SETUP_GUIDE.md` (detailed setup)
3. `BACKEND_INTEGRATION.md` (technical details)
4. `README.md` (full documentation)
5. `BUGFIXES.md` (known issues)

---

**You're all set! Start studying! 📚**
