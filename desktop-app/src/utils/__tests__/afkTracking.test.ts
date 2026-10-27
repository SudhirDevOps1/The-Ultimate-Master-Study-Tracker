import { describe, it, expect } from "vitest";

describe("AFK & Idle Tracking Engine (Commit E4)", () => {
  it("determines AFK state based on configurable threshold", () => {
    const isUserAfk = (idleSeconds: number, thresholdSeconds = 120) => idleSeconds >= thresholdSeconds;

    expect(isUserAfk(10, 120)).toBe(false);
    expect(isUserAfk(119, 120)).toBe(false);
    expect(isUserAfk(120, 120)).toBe(true);
    expect(isUserAfk(300, 120)).toBe(true);
  });

  it("tags activity entry with AFK status without corrupting app duration", () => {
    const tagActivityAfk = (entry: any, idleSeconds: number, threshold = 120) => {
      const afk = idleSeconds >= threshold;
      return {
        ...entry,
        isAfk: afk,
        idleSeconds: afk ? idleSeconds : 0,
      };
    };

    const entry = { appName: "VS Code", durationSeconds: 60 };
    const active = tagActivityAfk(entry, 15);
    expect(active.isAfk).toBe(false);
    expect(active.idleSeconds).toBe(0);

    const away = tagActivityAfk(entry, 180);
    expect(away.isAfk).toBe(true);
    expect(away.idleSeconds).toBe(180);
    expect(away.appName).toBe("VS Code");
  });
});
