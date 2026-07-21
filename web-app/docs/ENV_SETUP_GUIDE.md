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
