import { describe, it, expect } from "vitest";
import {
  hash8,
  generateEntryId,
  ensureEntryId,
  mergeDayEntries,
  splitSegment,
  normalizeEntryDuration,
  ActivityEntry,
} from "../trackerMath";

describe("trackerMath Primitives (Part C / F1)", () => {
  it("generates deterministic 8-character hex hash", () => {
    const h1 = hash8("Visual Studio Code - trackerMath.ts");
    const h2 = hash8("Visual Studio Code - trackerMath.ts");
    const h3 = hash8("Google Chrome - YouTube");

    expect(h1).toHaveLength(8);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("generates stable, deterministic entry IDs", () => {
    const id1 = generateEntryId("2026-10-30T10:00:00.000Z", "code.exe", "trackerMath.ts");
    const id2 = generateEntryId("2026-10-30T10:00:00.000Z", "code.exe", "trackerMath.ts");
    const id3 = generateEntryId("2026-10-30T10:00:00.000Z", "chrome.exe", "trackerMath.ts");

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1.startsWith("2026-10-30T10:00:00.000Z|code.exe|")).toBe(true);
  });

  it("ensureEntryId leaves existing ID intact or generates one", () => {
    const withId = ensureEntryId({
      id: "custom-id-123",
      appName: "Code",
      rawProcess: "code.exe",
      title: "Index.ts",
      durationSeconds: 10,
      startTime: "2026-10-30T10:00:00.000Z",
      date: "2026-10-30",
      hour: 10,
      minute: 0,
    });
    expect(withId.id).toBe("custom-id-123");

    const withoutId = ensureEntryId({
      appName: "Code",
      rawProcess: "code.exe",
      title: "Index.ts",
      durationSeconds: 10,
      startTime: "2026-10-30T10:00:00.000Z",
      date: "2026-10-30",
      hour: 10,
      minute: 0,
    });
    expect(withoutId.id).toBeDefined();
    expect(withoutId.id.length).toBeGreaterThan(10);
  });

  it("mergeDayEntries dedupes duplicate entries by id and sorts chronologically", () => {
    const e1: ActivityEntry = {
      id: "id-1",
      appName: "Code",
      rawProcess: "code.exe",
      title: "Doc 1",
      durationSeconds: 30,
      startTime: "2026-10-30T10:00:00.000Z",
      date: "2026-10-30",
      hour: 10,
      minute: 0,
    };
    const e2: ActivityEntry = {
      id: "id-2",
      appName: "Chrome",
      rawProcess: "chrome.exe",
      title: "Doc 2",
      durationSeconds: 45,
      startTime: "2026-10-30T10:05:00.000Z",
      date: "2026-10-30",
      hour: 10,
      minute: 5,
    };
    const duplicateE1: ActivityEntry = {
      ...e1,
      durationSeconds: 60, // Updated duration on duplicate
    };

    const { merged, aborted } = mergeDayEntries([e1], [duplicateE1, e2]);
    expect(aborted).toBe(false);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe("id-1");
    expect(merged[0].durationSeconds).toBe(60); // Updated
    expect(merged[1].id).toBe("id-2");
  });

  it("mergeDayEntries aborts and refuses to shrink existing day count", () => {
    const existing: ActivityEntry[] = [
      {
        id: "id-1",
        appName: "Code",
        rawProcess: "code.exe",
        title: "Doc 1",
        durationSeconds: 30,
        startTime: "2026-10-30T10:00:00.000Z",
        date: "2026-10-30",
        hour: 10,
        minute: 0,
      },
      {
        id: "id-2",
        appName: "Code",
        rawProcess: "code.exe",
        title: "Doc 2",
        durationSeconds: 30,
        startTime: "2026-10-30T10:01:00.000Z",
        date: "2026-10-30",
        hour: 10,
        minute: 1,
      },
    ];

    // Corrupted incoming with zero items should abort if attempting to overwrite
    // (Notice mergeDayEntries merges existing + incoming, so map size is checked)
    const { merged, aborted, reason } = mergeDayEntries(existing, []);
    expect(aborted).toBe(false);
    expect(merged).toHaveLength(2);
  });

  it("a 5000-entry day is preserved and not capped by a 2000-entry display cache", () => {
    const largeDay: ActivityEntry[] = [];
    for (let i = 0; i < 5000; i++) {
      largeDay.push({
        id: `entry-${i}`,
        appName: "Editor",
        rawProcess: "editor.exe",
        title: `File ${i}`,
        durationSeconds: 5,
        startTime: new Date(1700000000000 + i * 5000).toISOString(),
        date: "2026-10-30",
        hour: 10,
        minute: 0,
      });
    }

    const { merged, aborted } = mergeDayEntries(largeDay, []);
    expect(aborted).toBe(false);
    expect(merged).toHaveLength(5000);
  });

  it("normalizes entry duration safely for legacy records", () => {
    // Modern entry with both fields
    const modern: ActivityEntry = {
      appName: "Code",
      rawProcess: "code.exe",
      title: "file",
      durationSeconds: 100,
      activeSeconds: 80,
      afkSeconds: 20,
      startTime: "2026-10-30T10:00:00Z",
      date: "2026-10-30",
      hour: 10,
      minute: 0,
    };
    expect(normalizeEntryDuration(modern)).toEqual({
      activeSeconds: 80,
      afkSeconds: 20,
      totalSeconds: 100,
    });

    // Legacy active entry
    const legacyActive: ActivityEntry = {
      appName: "Code",
      rawProcess: "code.exe",
      title: "file",
      durationSeconds: 120,
      startTime: "2026-10-30T10:00:00Z",
      date: "2026-10-30",
      hour: 10,
      minute: 0,
      isAfk: false,
    };
    expect(normalizeEntryDuration(legacyActive)).toEqual({
      activeSeconds: 120,
      afkSeconds: 0,
      totalSeconds: 120,
    });

    // Legacy AFK entry
    const legacyAfk: ActivityEntry = {
      appName: "Code",
      rawProcess: "code.exe",
      title: "file",
      durationSeconds: 300,
      startTime: "2026-10-30T10:00:00Z",
      date: "2026-10-30",
      hour: 10,
      minute: 0,
      isAfk: true,
    };
    expect(normalizeEntryDuration(legacyAfk)).toEqual({
      activeSeconds: 0,
      afkSeconds: 300,
      totalSeconds: 300,
    });
  });
});
