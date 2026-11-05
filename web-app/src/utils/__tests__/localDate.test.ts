import { describe, it, expect } from "vitest";
import { toLocalDateKey, fromLocalDateKey, localHourMinute } from "../localDate";
const cjsLocalDate = require("../../../electron-main/local-date.js");

describe("localDate Single Source of Truth (Part E / F3)", () => {
  it("ensures TypeScript and CommonJS implementations produce 100% identical output", () => {
    const testTimestamps = [
      "2026-10-30T00:10:00.000Z",
      "2026-10-30T05:29:59.000Z",
      "2026-10-30T12:00:00.000Z",
      "2026-10-30T23:59:59.000Z",
      1700000000000,
      1750000000000,
      new Date(),
    ];

    for (const ts of testTimestamps) {
      const tsKey = toLocalDateKey(ts);
      const cjsKey = cjsLocalDate.toLocalDateKey(ts);
      expect(tsKey).toBe(cjsKey);

      const tsHm = localHourMinute(ts);
      const cjsHm = cjsLocalDate.localHourMinute(ts);
      expect(tsHm).toEqual(cjsHm);
    }
  });

  it("formats local calendar date consistently", () => {
    // Explicit local date constructed with year, month, date
    const d = new Date(2026, 9, 30, 0, 15, 0); // October 30, 2026 at 00:15 local
    expect(toLocalDateKey(d)).toBe("2026-10-30");

    const hm = localHourMinute(d);
    expect(hm.hour).toBe(0);
    expect(hm.minute).toBe(15);
  });

  it("fromLocalDateKey parses YYYY-MM-DD into 00:00:00 local Date object", () => {
    const parsed = fromLocalDateKey("2026-10-30");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9); // 0-indexed October
    expect(parsed.getDate()).toBe(30);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
    expect(parsed.getSeconds()).toBe(0);
  });

  it("handles boundary rollover at midnight (00:30 local) without yesterday-leak", () => {
    const midnightAfter = new Date(2026, 9, 31, 0, 30, 0);
    expect(toLocalDateKey(midnightAfter)).toBe("2026-10-31");
  });
});
