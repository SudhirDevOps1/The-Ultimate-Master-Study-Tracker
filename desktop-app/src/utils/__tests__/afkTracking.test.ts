import { describe, it, expect } from "vitest";
import { splitSegment, normalizeEntryDuration } from "../trackerMath";

describe("AFK & Idle Tracking Engine (Part H / F6 - Real Tracker Math)", () => {
  it("splits segments when idle duration meets or exceeds threshold", () => {
    // 300 seconds total, 180 seconds idle with 120s threshold
    const startMs = 1000000;
    const endMs = startMs + 300 * 1000;
    const res = splitSegment({
      startMs,
      endMs,
      lastPollMs: endMs - 3000,
      idleSec: 180,
      afkThresholdSec: 120,
    });

    expect(res.activeSeconds).toBe(120); // 300 - 180
    expect(res.afkSeconds).toBe(180);
    expect(res.totalSeconds).toBe(300);
    expect(res.isGap).toBe(false);
  });

  it("does not split segment if idle time is below threshold", () => {
    // 60 seconds total, 45 seconds idle with 120s threshold
    const startMs = 1000000;
    const endMs = startMs + 60 * 1000;
    const res = splitSegment({
      startMs,
      endMs,
      lastPollMs: endMs - 3000,
      idleSec: 45,
      afkThresholdSec: 120,
    });

    expect(res.activeSeconds).toBe(60);
    expect(res.afkSeconds).toBe(0);
    expect(res.totalSeconds).toBe(60);
  });

  it("correctly normalizes legacy entry durations without isAfk flag", () => {
    const legacyEntry = {
      appName: "Chrome",
      title: "Docs",
      durationSeconds: 100,
    };
    const norm = normalizeEntryDuration(legacyEntry as any);
    expect(norm.activeSeconds).toBe(100);
    expect(norm.afkSeconds).toBe(0);
  });

  it("correctly partitions active vs away duration for afk entries", () => {
    const afkEntry = {
      appName: "Chrome",
      title: "Docs",
      durationSeconds: 300,
      isAfk: true,
      idleSeconds: 200,
    };
    const norm = normalizeEntryDuration(afkEntry as any);
    expect(norm.activeSeconds).toBe(0);
    expect(norm.afkSeconds).toBe(300);
  });
});
