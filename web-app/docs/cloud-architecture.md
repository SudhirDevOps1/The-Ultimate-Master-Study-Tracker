# Cloud Sync Architecture (Guest vs Cloud Mode)

This document outlines the architecture for supporting a **Guest Mode** (local-only using IndexedDB) and a **Cloud Mode** (syncing securely with Firebase/Supabase). 

## Environment Setup for Production

To deploy this on **Vercel** or **Cloudflare Pages** with Cloud Sync enabled, you need to set up a Firebase project and add the following Environment Variables in your hosting dashboard:

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

## How It Works

1. **Guest Mode (Default)**:
   - When users open the app without logging in, they operate in Guest Mode.
   - All Study Sessions, Settings, and AI configs are saved *strictly* locally using `Dexie.js` (IndexedDB).
   - This ensures 100% privacy and offline capability.

2. **Cloud Sync Mode**:
   - The user clicks "Login" from the Settings page.
   - `src/lib/firebase.ts` handles the Google/Email authentication.
   - Once logged in, `src/hooks/useCloudSync.ts` actively mirrors the local Dexie DB to Firestore.
   - If the user logs into another browser, the app pulls the Firestore snapshot and merges it with their local DB.

3. **No Data Loss Guarantee**:
   - Guest data is preserved before login.
   - After a successful login, all guest data is merged into the Cloud account automatically.

## API Key Security

In Vite, environment variables prefixed with `VITE_` are bundled into the client app. This is safe for Firebase config keys because Firebase relies on **Security Rules**, not secret keys, to protect data. 

**Ensure you set up Firestore Security Rules like this:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      // Only the authenticated user can read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
