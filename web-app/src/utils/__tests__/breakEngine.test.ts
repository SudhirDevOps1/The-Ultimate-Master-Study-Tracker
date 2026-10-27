import { describe, it, expect } from "vitest";
import {
  shouldBreak,
  nextBreakAt,
  formatBreakReason,
  DEFAULT_BREAK_SETTINGS,
  type BreakEvaluationState,
} from "../breakEngine";

describe("AFK-Aware Break Engine", () => {
  const baseState: BreakEvaluationState = {
    nowMs: 1700000000000,
    sessionStartedAtMs: 1700000000000,
    lastBreakAtMs: 1700000000000,
    continuousSeconds: 0,
    idleMs: 0,
    inPomodoroBreak: false,
    isFullscreenVideo: false,
    dndEnabled: false,
    settings: DEFAULT_BREAK_SETTINGS,
  };

  it("triggers 20-20-20 eye care break at 1200 seconds (20 minutes)", () => {
    const decision = shouldBreak({
      ...baseState,
      continuousSeconds: 1200,
    });
    expect(decision.shouldTrigger).toBe(true);
    expect(decision.type).toBe("eye_care");
    expect(decision.durationSeconds).toBe(20);
    expect(decision.reason).toContain("20-20-20");
  });

  it("triggers 50-minute continuous focus milestone at 3000 seconds", () => {
    const decision = shouldBreak({
      ...baseState,
      continuousSeconds: 3000,
    });
    expect(decision.shouldTrigger).toBe(true);
    expect(decision.type).toBe("continuous_focus");
    expect(decision.durationSeconds).toBe(300);
  });

  it("triggers 90-minute ergonomic posture stretch at 5400 seconds", () => {
    const decision = shouldBreak({
      ...baseState,
      continuousSeconds: 5400,
    });
    expect(decision.shouldTrigger).toBe(true);
    expect(decision.type).toBe("posture_stretch");
    expect(decision.durationSeconds).toBe(120);
  });

  it("suppresses break when user is AFK (idle > 120s)", () => {
    const decision = shouldBreak({
      ...baseState,
      continuousSeconds: 1200,
      idleMs: 150_000, // 2.5 minutes idle
    });
    expect(decision.shouldTrigger).toBe(false);
    expect(decision.suppressedReason).toContain("AFK");
  });

  it("suppresses break when in active Pomodoro break", () => {
    const decision = shouldBreak({
      ...baseState,
      continuousSeconds: 1200,
      inPomodoroBreak: true,
    });
    expect(decision.shouldTrigger).toBe(false);
    expect(decision.suppressedReason).toContain("Pomodoro");
  });

  it("suppresses break when Do Not Disturb (DND) is active", () => {
    const decision = shouldBreak({
      ...baseState,
      continuousSeconds: 1200,
      dndEnabled: true,
    });
    expect(decision.shouldTrigger).toBe(false);
    expect(decision.suppressedReason).toContain("Do Not Disturb");
  });

  it("suppresses break when fullscreen video is active", () => {
    const decision = shouldBreak({
      ...baseState,
      continuousSeconds: 1200,
      isFullscreenVideo: true,
    });
    expect(decision.shouldTrigger).toBe(false);
    expect(decision.suppressedReason).toContain("Fullscreen video");
  });

  it("respects individual toggles when disabled in settings", () => {
    const decision = shouldBreak({
      ...baseState,
      continuousSeconds: 1200,
      settings: {
        ...DEFAULT_BREAK_SETTINGS,
        eyeCare2020Enabled: false,
      },
    });
    expect(decision.shouldTrigger).toBe(false);
  });

  it("calculates next scheduled break timestamp accurately", () => {
    const lastBreak = 1700000000000;
    const next = nextBreakAt(lastBreak, DEFAULT_BREAK_SETTINGS);
    expect(next.nextAtMs).toBe(lastBreak + 1200 * 1000);
    expect(next.type).toBe("eye_care");
  });

  it("formats human-readable break reasons for all types", () => {
    expect(formatBreakReason("eye_care")).toContain("20-20-20");
    expect(formatBreakReason("continuous_focus")).toContain("50-Minute");
    expect(formatBreakReason("posture_stretch")).toContain("90-Minute");
  });
});
