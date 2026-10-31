# Firebase Cloud Sync Setup Guide ☁️

If you want your data to sync across devices (mobile and desktop) instead of just staying on one browser, you need to set up Firebase and Vercel environment variables.

Here is a step-by-step guide to doing exactly that:

## Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add Project"** and name it `FlowTrack` (or anything you like).
3. Disable Google Analytics (optional, to keep it simple).
4. Once created, click on the **Web icon (`</>`)** to add an app.
5. Name the app, and click **Register app**.

## Step 2: Get Your Environment Keys
After registering, Firebase will give you a `firebaseConfig` object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD-xxxxxxxxxxxxxxxxxxxxx",
  authDomain: "flowtrack-xyz.firebaseapp.com",
  projectId: "flowtrack-xyz",
  storageBucket: "flowtrack-xyz.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

Keep this tab open, you will need these keys for Vercel.

## Step 3: Enable Authentication & Firestore
1. On the left menu, click **Build > Authentication**.
2. Click **Get Started**, go to **Sign-in method**, and enable **Email/Password** or **Google**.
3. Now, go to **Build > Firestore Database** on the left menu.
4. Click **Create Database** and start in **Test mode** (you can secure it later).

## Step 4: Add Variables to Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and open your `The-Ultimate-Master-Study-Tracker` project.
2. Click on **Settings** (at the top), then click **Environment Variables** (on the left menu).
3. You need to add these exact Keys and map them to your Firebase values:

| Key Name | Value (from your Firebase config) |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyD-xxxxxxxxxxxxxxxxxxxxx` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `flowtrack-xyz.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `flowtrack-xyz` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `flowtrack-xyz.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| `1234567890` |
| `VITE_FIREBASE_APP_ID` | `1:1234567890:web:abcdef123456` |

4. Hit **Save** for each one.
5. Finally, go to the **Deployments** tab in Vercel and click **Redeploy**.

## Done! 🎉
Once your app is redeployed, the **Sign In** button in the Settings page will work, and all your IndexedDB data will automatically sync to Firestore securely!

---

# Local Development & Full-Stack Environment Setup 💻

FlowTrack Pro can be developed and run entirely on your local machine with zero mandatory cloud dependencies.

## Prerequisites
- **Node.js**: v20 or v22 LTS
- **npm**: v10+ (use `npm install --legacy-peer-deps`, **never `npm ci`**)
- **Python**: 3.10+ (optional, for passive OS window tracking via `web-app/backend.py`)

## 1. Web Application (`web-app/`)
```bash
cd web-app
npm install --legacy-peer-deps
npm run dev
```
Runs at `http://localhost:5173`.

## 2. Desktop Application (`desktop-app/`)
```bash
cd desktop-app
npm install --legacy-peer-deps
npm run electron:dev
```
Launches Electron 43 + React 19 with hot module replacement and native Win32 window poller (`win-tracker.exe`).

## 3. Optional Local Python Backend (`backend.py`)
```bash
python web-app/backend.py 5001 --poll 2 --idle 300
```
- Listens on `http://localhost:5001`.
- Automatically detected by both web and desktop apps.
- Captures active window transitions, calculates idle times, and mirrors IDE heartbeats.

## 4. Verification & Testing Quality Gate
```bash
# Typecheck
npm --prefix desktop-app run typecheck
npm --prefix web-app run typecheck

# Lint (Zero Warnings Required)
npm --prefix desktop-app run lint

# Vitest Test Suite (21 suites, 114 tests)
npm --prefix desktop-app run test

# Python Compilation
python -m py_compile web-app/backend.py
```
