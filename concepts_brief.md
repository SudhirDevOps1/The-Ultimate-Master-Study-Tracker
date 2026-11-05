# RFC Concepts Brief: FlowTrack Pro Next-Gen Workstation Capabilities

## 1. Executive Summary & Problem Context
FlowTrack Pro is a local-first study and productivity tracking workstation. To empower modern learners across intensive study workflows, three workstation capabilities have been engineered and stress-tested:
1. **In-App Chromium Browser Stabilization & Real-Auth Engine**: The current embedded `<webview>` in `WebPortalsPage.tsx` flickers and reloads on tab navigation because React re-render loops recreate the webview DOM element (`key={activeTab.id}`). In addition, key course and developer platforms (Google OAuth, LeetCode, Apna College) block embedded webviews with `disallowed_useragent` errors.
2. **Privacy-Preserving Discord Rich Presence (RPC)**: Learners want peer accountability and live focus stats on Discord profiles without compromising local-first privacy, telemetry limits, or RAM invariants.
3. **Offline-First Supabase Data Synchronization**: Cross-device users require seamless multi-device synchronization (Desktop + Web) for study sessions, streaks, tasks, and spaced repetition flashcards while maintaining strict offline-first zero-telemetry SQLite WAL / Dexie guarantees.

---

## 2. Capability Specifications & Architectural Blueprints

### Capability A: Decoupled In-App Browser & Real-Auth Engine
- **Decoupled DOM & LRU Webview Pool**:
  - Replace parent re-mounting with an LRU Webview Pool (capped at 3 concurrent instances to strictly protect the 128MB old-space RAM constraint).
  - Background tabs are visually preserved using off-screen CSS (`display: none` / `visibility: hidden`) rather than destroying the webview instance.
  - Tab state updates (`did-navigate`, `page-title-updated`) update React UI refs without triggering DOM recreation.
- **Authentic Google / LeetCode OAuth Flow**:
  - Intercept popup triggers via Electron's `webContents.setWindowOpenHandler` in `electron.js`:
    ```javascript
    webContents.setWindowOpenHandler(({ url }) => {
      if (isAuthUrl(url)) {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            width: 520,
            height: 680,
            autoHideMenuBar: true,
            webPreferences: {
              partition: "persist:browser_session",
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true
            }
          }
        };
      }
      shell.openExternal(url);
      return { action: "deny" };
    });
    ```
  - The child `BrowserWindow` shares the identical session partition (`persist:browser_session`) with pure Chrome desktop user-agent.
  - Post-auth cookie jar synchronization occurs natively; upon login completion, `window.close()` triggers and the active `<webview>` immediately inherits valid auth cookies.
- **Invariants Preserved**:
  - Zero removal of existing YouTube ad-skip scripts, distraction-free reader mode, custom site speed dials, and credential vault.
  - `webview-activity-report` IPC tracking remains intact to avoid misclassifying portal usage as generic app activity.

---

### Capability B: Privacy-Preserving Discord Rich Presence (RPC)
- **Local IPC Socket Daemon**:
  - Modularized into `desktop-app/electron-main/discord-rpc.js`.
  - Connects directly to local Discord client named pipes (`\\.\pipe\discord-ipc-0` through `discord-ipc-9` on Windows; `/run/user/{uid}/discord-ipc-0` or `$XDG_RUNTIME_DIR` on Linux/macOS).
  - Pure `node:net` stream architecture—zero C++ native addons (`node-gyp`), zero cloud bot tokens, zero HTTP telemetry.
- **Presence Payload & Rate Limiting**:
  - State: Current Focus Subject (e.g. "Data Structures & Algorithms")
  - Details: Active Task or Technique (e.g. "Pomodoro Focus (Round 2/4)")
  - Timestamps: Start timestamp for elapsed focus timer
  - Assets: FlowTrack Pro logo + Subject emoji badge
  - Rate Limiter: Updates throttled to a minimum of 15 seconds to respect Discord client socket quotas.
- **Failure Handling & Privacy Controls**:
  - **100% Opt-In**: Default disabled in Settings.
  - Privacy Toggle: "Mask Subject Names" (displays generic "Deep Focus" instead of sensitive task titles).
  - Silent Fallback: If Discord is closed, socket failures are handled with silent exponential backoff (no blocking event loop, no crash).
  - AFK & Power Monitor: Clears status to "Idle / Away" when `powerMonitor.getSystemIdleTime() > 120s`.

---

### Capability C: Offline-First Supabase Data Synchronization
- **Bidirectional Sync & The Duplication Trap**:
  - Core sync engine implemented in `desktop-app/src/lib/supabaseSync.ts` and byte-mirrored to `web-app/src/lib/supabaseSync.ts`.
  - Local Dexie IndexedDB and SQLite WAL remain the authoritative source of truth. The application remains 100% functional with zero network connectivity.
  - Supabase client (`@supabase/supabase-js`) handles cloud communication over HTTPS with Row-Level Security (`auth.uid() = user_id`).
- **Conflict Resolution & Spaced Repetition Merging**:
  - **Tombstone Architecture**: Deletions write to a local Dexie `tombstones` table `{ id, table_name, deleted_at }` to ensure deleted rows are not resurrected during sync.
  - **Monotonic Timestamps**: Standard entities (`subjects`, `sessions`, `tasks`, `notes`) resolve conflicts via Last-Write-Wins (LWW) on `updated_at`.
  - **Flashcard Interval Reconciliation**: Spaced repetition cards merge using deterministic SM-2 logic: highest `repetitions` and latest `next_review_date` wins, preventing review schedule resets.
- **Network Resilience & Failure Recovery**:
  - Local queue stores uncommitted mutations when offline.
  - Sync trigger lifecycle:
    1. On application launch (initial catch-up)
    2. Immediately after Pomodoro/Focus session completion
    3. On network recovery (`window.addEventListener("online")`)
    4. Debounced periodic sync (every 5 minutes during active use)

---

## 3. Out of Scope
- Full Chrome extension ecosystem support inside `<webview>`.
- Real-time peer-to-peer WebRTC collaborative whiteboard synchronization.
- Mandatory cloud accounts (strict zero-telemetry local-first invariant).

---

## 4. Verification & Evaluation Criteria
1. **In-App Browser**: Tab switching across 3 portals introduces 0ms whiteout or page reload; Google OAuth and LeetCode login succeed in 100% of attempts without `disallowed_useragent` blocks.
2. **Discord RPC**: Status reflects Pomodoro countdown accurately, clears on AFK/quit, and adds 0% CPU overhead when Discord is offline.
3. **Supabase Sync**: Interrupted network connections during a sync cycle recover automatically upon reconnection with 0 duplicate sessions and 0 lost flashcard reviews.
