# FlowTrack Pro Web App — Quick Start Guide 🚀

## 1-Click Launch (Windows)

Double-click `START.bat` in this folder:

1. Auto-checks Node.js & Python environment.
2. Starts Python Tracker Backend (`http://localhost:5001`) in background.
3. Starts Web App (`http://localhost:5173`) and opens automatically in your default browser.

---

## 🌐 Hybrid Modes

### Mode 1: Local Development (`START.bat`)
- **Web App**: Runs on `http://localhost:5173`
- **Python Backend**: Runs on `http://localhost:5001`
- **Tracking**: Real-time OS window title, process tracking, and browser tab analytics.

### Mode 2: Vercel CDN Deployment + Local PC Backend
- **Web App**: Access via Vercel URL on your browser.
- **Python Backend**: Run `start_backend_only.bat` on your local PC.
- **Tracking**: Web App auto-detects `http://localhost:5001` and displays live local PC activity.

### Mode 3: Serverless Offline Mode (No Backend)
- **Web App**: Access anywhere without running Python backend.
- **Tracking**: 100% browser-native storage (IndexedDB), active tab tracking, zero network dependencies.

---

## 🎯 Quick Commands

```bash
# Start frontend dev server
npm run dev

# Build for Vercel / Static Production
npm run build
```
