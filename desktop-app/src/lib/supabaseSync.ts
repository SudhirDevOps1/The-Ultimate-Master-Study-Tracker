import { db } from "@/lib/db";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
  userId?: string;
}

export interface SyncResult {
  success: boolean;
  pushed: { subjects: number; sessions: number; tasks: number; tombstones: number };
  pulled: { subjects: number; sessions: number; tasks: number };
  error?: string;
  timestamp: string;
}

export class SupabaseSyncEngine {
  private config: SupabaseConfig = {
    url: "",
    anonKey: "",
    enabled: false,
  };
  private isSyncing = false;

  constructor(config?: Partial<SupabaseConfig>) {
    if (config) {
      this.updateConfig(config);
    }
  }

  updateConfig(config: Partial<SupabaseConfig>) {
    this.config = { ...this.config, ...config };
    if (this.config.url) {
      this.config.url = this.config.url.replace(/\/+$/, "");
    }
  }

  getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  private getHeaders(): Record<string, string> {
    return {
      "apikey": this.config.anonKey,
      "Authorization": `Bearer ${this.config.anonKey}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation",
    };
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    if (!this.config.url || !this.config.anonKey) {
      return { ok: false, error: "Missing Supabase URL or Anon Key" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.url}/rest/v1/`, {
        method: "GET",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`,
        },
      });
      const latencyMs = Date.now() - start;
      if (res.ok || res.status === 200 || res.status === 404) {
        return { ok: true, latencyMs };
      }
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      return { ok: false, error: err.message || "Network error" };
    }
  }

  async sync(): Promise<SyncResult> {
    if (!this.config.enabled || !this.config.url || !this.config.anonKey) {
      return {
        success: false,
        error: "Supabase sync disabled or unconfigured",
        pushed: { subjects: 0, sessions: 0, tasks: 0, tombstones: 0 },
        pulled: { subjects: 0, sessions: 0, tasks: 0 },
        timestamp: new Date().toISOString(),
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        error: "Sync already in progress",
        pushed: { subjects: 0, sessions: 0, tasks: 0, tombstones: 0 },
        pulled: { subjects: 0, sessions: 0, tasks: 0 },
        timestamp: new Date().toISOString(),
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      pushed: { subjects: 0, sessions: 0, tasks: 0, tombstones: 0 },
      pulled: { subjects: 0, sessions: 0, tasks: 0 },
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Push Tombstones (deletions) first
      const localTombstones = await db.tombstones.toArray();
      if (localTombstones.length > 0) {
        for (const ts of localTombstones) {
          const endpoint = ts.tableName === "subjects" ? "subjects" : "study_sessions";
          try {
            await fetch(`${this.config.url}/rest/v1/${endpoint}?id=eq.${encodeURIComponent(ts.id)}`, {
              method: "DELETE",
              headers: this.getHeaders(),
            });
            result.pushed.tombstones++;
          } catch {
            // Network/row already gone
          }
        }
      }

      // 2. Push Local Subjects
      const localSubjects = await db.subjects.toArray();
      if (localSubjects.length > 0) {
        const payload = localSubjects.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          created_at: s.createdAt,
          updated_at: (s as any).updatedAt || s.createdAt || new Date().toISOString(),
          weekly_goal_minutes: s.weeklyGoalMinutes || 0,
          emoji: s.emoji || "",
        }));

        const pushRes = await fetch(`${this.config.url}/rest/v1/subjects`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });
        if (pushRes.ok) {
          result.pushed.subjects = payload.length;
        }
      }

      // 3. Push Local Study Sessions
      const localSessions = await db.sessions.toArray();
      if (localSessions.length > 0) {
        const payload = localSessions.map((s) => ({
          id: s.id,
          subject_id: s.subjectId,
          start_time: s.startTime,
          end_time: s.endTime,
          planned_minutes: s.plannedMinutes,
          actual_seconds: s.actualSeconds,
          status: s.status,
          updated_at: s.updatedAt || s.createdAt || new Date().toISOString(),
          notes: s.notes || "",
        }));

        const pushRes = await fetch(`${this.config.url}/rest/v1/study_sessions`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });
        if (pushRes.ok) {
          result.pushed.sessions = payload.length;
        }
      }

      // 4. Pull Remote Subjects (LWW)
      try {
        const getRes = await fetch(`${this.config.url}/rest/v1/subjects?select=*`, {
          method: "GET",
          headers: {
            "apikey": this.config.anonKey,
            "Authorization": `Bearer ${this.config.anonKey}`,
          },
        });
        if (getRes.ok) {
          const remoteSubs: any[] = await getRes.json();
          for (const rs of remoteSubs) {
            const isDeleted = localTombstones.some((t) => t.id === rs.id && t.tableName === "subjects");
            if (isDeleted) continue;

            const localSub = await db.subjects.get(rs.id);
            if (!localSub) {
              await db.subjects.put({
                id: rs.id,
                name: rs.name,
                color: rs.color || "#06b6d4",
                createdAt: rs.created_at || new Date().toISOString(),
                weeklyGoalMinutes: rs.weekly_goal_minutes || 0,
                emoji: rs.emoji || "",
              });
              result.pulled.subjects++;
            }
          }
        }
      } catch {
        // Continue to sessions
      }

      // 5. Pull Remote Sessions (LWW)
      try {
        const getRes = await fetch(`${this.config.url}/rest/v1/study_sessions?select=*`, {
          method: "GET",
          headers: {
            "apikey": this.config.anonKey,
            "Authorization": `Bearer ${this.config.anonKey}`,
          },
        });
        if (getRes.ok) {
          const remoteSessions: any[] = await getRes.json();
          for (const rs of remoteSessions) {
            const isDeleted = localTombstones.some((t) => t.id === rs.id && t.tableName === "sessions");
            if (isDeleted) continue;

            const local = await db.sessions.get(rs.id);
            const remoteUpdatedAt = rs.updated_at ? new Date(rs.updated_at).getTime() : 0;
            const localUpdatedAt = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;

            if (!local || remoteUpdatedAt > localUpdatedAt) {
              await db.sessions.put({
                id: rs.id,
                subjectId: rs.subject_id,
                startTime: rs.start_time,
                endTime: rs.end_time,
                plannedMinutes: rs.planned_minutes || 0,
                actualSeconds: rs.actual_seconds || 0,
                status: rs.status || "completed",
                updatedAt: rs.updated_at || new Date().toISOString(),
                createdAt: rs.created_at || rs.start_time || new Date().toISOString(),
                notes: rs.notes || "",
              });
              result.pulled.sessions++;
            }
          }
        }
      } catch {
        // Tolerated
      }
    } catch (err: any) {
      result.success = false;
      result.error = err.message || "Sync encountered an unexpected error";
    } finally {
      this.isSyncing = false;
    }

    return result;
  }
}

export const supabaseSync = new SupabaseSyncEngine();
