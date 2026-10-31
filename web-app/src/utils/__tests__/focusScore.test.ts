import { describe, it, expect } from "vitest";
import { calculateFocusScore } from "../focusScore";

describe("Transparent Focus Score Engine (Part H / F6)", () => {
  it("calculates honest 0 score when no study or sessions recorded", () => {
    const res = calculateFocusScore({
      studyMinutes: 0,
      completedSessions: 0,
      totalPlannedSessions: 0,
      breakAdherenceCount: 0,
      distractionSeconds: 0,
    });
    expect(res.score).toBe(0);
    expect(res.grade).toBe("D");
    expect(res.explanation[0]).toContain("No verified study activity");
  });

  it("calculates high score for consistent study with breaks and minimal distraction", () => {
    const res = calculateFocusScore({
      studyMinutes: 200,
      completedSessions: 4,
      totalPlannedSessions: 4,
      breakAdherenceCount: 4,
      distractionSeconds: 180, // 3 mins distraction
    });
    expect(res.score).toBeGreaterThanOrEqual(80);
    expect(["A", "A+"]).toContain(res.grade);
    expect(res.components.focusTimePoints).toBe(45);
    expect(res.components.completionPoints).toBe(30);
    expect(res.components.breakAdherencePoints).toBe(20);
    expect(res.components.distractionPenalty).toBe(-1);
  });

  it("dynamically re-normalizes weights when breaks and distractions are untracked (null)", () => {
    const res = calculateFocusScore({
      studyMinutes: 180,
      completedSessions: 3,
      totalPlannedSessions: 3,
      breakAdherenceCount: null,
      distractionSeconds: null,
    });

    // 180m / 3 = 60pts for study time, 40pts for 3/3 sessions = 100pts
    expect(res.score).toBe(100);
    expect(res.grade).toBe("A+");
    expect(res.components.breakAdherencePoints).toBeNull();
    expect(res.components.distractionPenalty).toBeNull();
    expect(res.explanation).toContain("Ergonomic Breaks: Untracked for this period");
    expect(res.explanation).toContain("Distraction: Untracked for this period");
  });
});
