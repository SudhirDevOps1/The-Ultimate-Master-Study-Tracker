# 🚀 Future Feature Roadmap / Suggestions

A list of high-value features that can be added next to elevate FlowTrack:

### 1. 📂 File/Notes Attachment (Session Notes)
- **Concept**: Attach PDF notes, markdown files, links, or images directly to a study session.
- **Benefit**: Keep all material references tied to the studied logs.

### 2. 🤖 Local AI Flashcards Generator
- **Concept**: Generate dynamic revision flashcards from your study session notes using local rule structures or Ollama.
- **Benefit**: Active recall integrations inside Achievements.

### 3. 📊 Daily Focus Score (✅ Implemented in v1.3.0)
- **Concept**: Advanced rating calculation checking total duration studied against target, deducting distraction pauses.
- **Benefit**: Precise daily feedback rating on dashboard (0-100 score).

### 4. 📳 Background Push Notifications (✅ Implemented in v1.3.0)
- **Concept**: Send OS-level push notifications utilizing background Service Worker synchronization.
- **Benefit**: Resilient alarms even if the browser tab sleeps.

### 5. 📺 Floating Ambience Player (✅ Implemented in v1.3.0)
- **Concept**: Add a Custom YouTube Link saver to create focus playlists, floating in a Picture-in-Picture mode inside the app window.
- **Benefit**: Prevents the need to switch tabs to change music, eliminating distractions.

---

## 🌐 Hybrid Cloud Synchronization Architecture (Firebase / Supabase)

*(✅ The Structural Architecture has been implemented in v1.3.0)*

To support seamless cross-device syncing, the application now supports a Cloud DB backup layer alongside the local IndexedDB database.

### 🏗️ Guest Mode vs Cloud Auth Flow:
1. **Guest Mode (Default)**: Users can use the application without logging in. All data is stored purely in the browser's IndexedDB.
2. **Cloud Sync Mode**: Under Settings, users can authenticate. The local IndexedDB is synced securely to the cloud. If the browser cache is cleared, data is safely restored from the cloud.

### 🔌 Setup and Environment Configuration (Vercel / Cloudflare):

The `src/lib/firebase.ts` module is ready. To hook up **Firebase** backend:

In production (Vercel Dashboard or Cloudflare Pages Settings), add these keys under **Environment Variables** to securely enable cloud features:

```bash
# Firebase Configuration Variables
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="flowtrack.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="flowtrack"
VITE_FIREBASE_STORAGE_BUCKET="flowtrack.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender"
VITE_FIREBASE_APP_ID="your-app-id"
```
