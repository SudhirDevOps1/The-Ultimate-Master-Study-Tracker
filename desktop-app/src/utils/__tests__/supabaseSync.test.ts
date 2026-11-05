import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SupabaseSyncEngine } from "@/lib/supabaseSync";
import { db } from "@/lib/db";

describe("Supabase Offline-First Sync Engine (Rule S11 / Pillar 3)", () => {
  let engine: SupabaseSyncEngine;
  const originalFetch = global.fetch;

  beforeEach(() => {
    engine = new SupabaseSyncEngine({
      url: "https://example.supabase.co/",
      anonKey: "test-anon-key",
      enabled: true,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("normalizes URL trailing slashes and maintains configuration", () => {
    expect(engine.getConfig().url).toBe("https://example.supabase.co");
    expect(engine.getConfig().enabled).toBe(true);

    engine.updateConfig({ url: "https://custom.supabase.co///" });
    expect(engine.getConfig().url).toBe("https://custom.supabase.co");
  });

  it("testConnection returns success with latency when remote endpoint responds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any);

    const result = await engine.testConnection();
    expect(result.ok).toBe(true);
    expect(typeof result.latencyMs).toBe("number");
  });

  it("testConnection handles network errors gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

    const result = await engine.testConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Network connection refused");
  });

  it("sync aborts early with clear error when disabled", async () => {
    engine.updateConfig({ enabled: false });
    const result = await engine.sync();
    expect(result.success).toBe(false);
    expect(result.error).toContain("disabled or unconfigured");
  });

  it("pushes local tombstones, subjects and sessions, then pulls remote entities", async () => {
    // Mock Dexie table methods to isolate from node indexedDB absence
    const mockTombstones = [
      { id: "del-subj-1", tableName: "subjects", deletedAt: new Date().toISOString() },
    ];
    const mockSubjects = [
      { id: "sub-1", name: "Computer Architecture", color: "#06b6d4", createdAt: new Date().toISOString(), weeklyGoalMinutes: 120 },
    ];
    const mockSessions = [
      { id: "sess-1", subjectId: "sub-1", startTime: "2026-11-05T10:00:00Z", endTime: "2026-11-05T10:50:00Z", plannedMinutes: 50, actualSeconds: 3000, status: "completed" as const, createdAt: "2026-11-05T10:00:00Z", updatedAt: "2026-11-05T10:50:00Z", notes: "" },
    ];

    vi.spyOn(db.tombstones, "toArray").mockResolvedValue(mockTombstones as any);
    vi.spyOn(db.subjects, "toArray").mockResolvedValue(mockSubjects as any);
    vi.spyOn(db.sessions, "toArray").mockResolvedValue(mockSessions as any);

    const subjectsPutSpy = vi.spyOn(db.subjects, "put").mockResolvedValue("remote-sub-2" as any);
    vi.spyOn(db.subjects, "get").mockImplementation(((id: any) => {
      if (id === "remote-sub-2") return Promise.resolve(undefined);
      return Promise.resolve(mockSubjects.find(s => s.id === id));
    }) as any);

    vi.spyOn(db.sessions, "get").mockResolvedValue(undefined as any);
    vi.spyOn(db.sessions, "put").mockResolvedValue("remote-sess-2" as any);

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method || "GET";
      if (url.includes("/rest/v1/subjects?id=eq.")) {
        return Promise.resolve({ ok: true, status: 204 });
      }
      if (url.endsWith("/rest/v1/subjects") && method === "POST") {
        return Promise.resolve({ ok: true, status: 201 });
      }
      if (url.endsWith("/rest/v1/study_sessions") && method === "POST") {
        return Promise.resolve({ ok: true, status: 201 });
      }
      if (url.includes("/rest/v1/subjects?select=*")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: "del-subj-1", name: "Should be filtered by tombstone" },
            { id: "remote-sub-2", name: "Operating Systems", color: "#3b82f6" },
          ],
        });
      }
      if (url.includes("/rest/v1/study_sessions?select=*")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: "remote-sess-2", subject_id: "remote-sub-2", start_time: "2026-11-05T11:00:00Z", end_time: "2026-11-05T11:45:00Z", planned_minutes: 45, actual_seconds: 2700, status: "completed", updated_at: "2026-11-05T11:45:00Z" }
          ],
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    });

    global.fetch = mockFetch;

    const result = await engine.sync();
    expect(result.success).toBe(true);
    expect(result.pushed.tombstones).toBe(1);
    expect(result.pushed.subjects).toBe(1);
    expect(result.pushed.sessions).toBe(1);
    expect(result.pulled.subjects).toBe(1);
    expect(result.pulled.sessions).toBe(1);

    expect(subjectsPutSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: "remote-sub-2",
      name: "Operating Systems",
    }));
  });
});
