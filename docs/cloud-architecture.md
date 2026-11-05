# ☁️ FlowTrack Pro — Cloud & Sync Architecture

> **Version**: `v0.5.0` | **Status**: Active Dual Cloud Architecture (Supabase + Neon)

This document outlines the architectural specification for FlowTrack Pro's **Guest Mode** (local-first IndexedDB via Dexie.js) and **Cloud Modes** (Supabase Offline-First Replication + Serverless Neon PostgreSQL).

---

## 🏗️ Architecture Overview

FlowTrack Pro follows a **local-first, cloud-synchronized** model. The application remains 100% operational offline without requiring network access or mandatory user login.

```mermaid
graph TD
    UI["React 19 Application UI"] --> DEXIE["Dexie.js IndexedDB v3"]
    
    subgraph Local Storage Engine
        DEXIE --> SESSIONS["Study Sessions & Logs"]
        DEXIE --> CARDS["SRS Flashcards & Review State"]
        DEXIE --> TASKS["Task Matrix & Timeblocks"]
        DEXIE --> TOMBSTONES["Deleted Records Queue (Tombstones)"]
    end

    subgraph Dual Cloud Sync Pipeline
        DEXIE -.->|Offline Sync Queue| SUPA["Supabase Cloud Sync Engine"]
        SUPA -->|JWT Bearer Auth| PG_REST["Supabase PostgREST API"]
        PG_REST --> SUPA_DB[("Supabase PostgreSQL")]
        
        DEXIE -.->|Direct Pool (Desktop Only)| NEON["Neon Serverless Client"]
        NEON --> NEON_DB[("Neon Serverless PostgreSQL")]
    end
```

---

## 1. Guest Mode (Default — Zero Signup)

- **Zero Network Dependency**: When users open the app without signing in, they operate strictly in Guest Mode.
- **Local Persistence**: All study sessions, flashcards, distraction blocking rules, notes, and AI preferences are saved directly to `Dexie.js` (IndexedDB).
- **Privacy & Security**: Zero telemetry is sent across the wire. Data lives exclusively in the user's browser sandbox or desktop profile directory.
- **Portability**: Users can export full AES-256-GCM encrypted backup vaults (`.json`) at any time from the Settings modal.

---

## 2. Cloud Mode A: Supabase Offline-First Replication

Implemented in [`src/lib/supabaseSync.ts`](file:///d:/The-Ultimate-Master-Study-Tracker/desktop-app/src/lib/supabaseSync.ts).

### Environment Configuration

Configure the following variables in your hosting dashboard (Vercel) or local `.env`:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Core Engine Mechanics
1. **Offline-First Sync Queue**: Any mutation (creation, edit, completion) made while offline is written to Dexie IndexedDB and appended to the local sync queue.
2. **Tombstone Deletion Architecture**: Record deletions do not instantly purge rows. Instead, they mark `{ is_deleted: true, deleted_at: timestamp }` in Dexie schema version 3. This ensures that cross-device synchronization deletes the item on remote peers instead of resurrecting it.
3. **Last-Write-Wins (LWW) Conflict Resolution**: When records are updated concurrently across devices, the higher `updated_at` ISO timestamp takes precedence deterministically.
4. **Automatic Reconnection Drain**: When network connectivity returns (`window.addEventListener('online')`), pending sync queues are automatically flushed to Supabase PostgREST via batched upserts.

### Supabase Row Level Security (RLS) Policy
Ensure table security rules enforce strict user-level isolation:
```sql
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own study records"
ON study_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 3. Cloud Mode B: Neon Serverless PostgreSQL (Desktop Only)

Implemented in [`desktop-app/src/lib/neonSync.ts`](file:///d:/The-Ultimate-Master-Study-Tracker/desktop-app/src/lib/neonSync.ts).

- **Use Case**: Enterprise backup, external analytics dashboards, and direct SQL queries for power users.
- **Direct Connection Pooling**: Utilizes `@neondatabase/serverless` with WebSocket connection pooling to run zero-latency queries directly from Electron's main process.
- **Zero Ingress Open Ports**: Communicates securely over TLS 443; no direct database port exposure needed.

---

## 4. No Data Loss Guarantee

1. **Guest-to-Cloud Merge**: When a user registers or logs in after using Guest Mode, the local Dexie dataset is migrated seamlessly into their cloud account without overwriting existing cloud history.
2. **Local Fallback**: If Supabase or Neon are unreachable or experiencing downtime, FlowTrack Pro falls back to local IndexedDB silently without blocking UI operations.
