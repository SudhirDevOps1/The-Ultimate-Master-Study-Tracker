import { describe, it, expect } from "vitest";
import { calculateFocusScore } from "../focusScore";

describe("Transparent Focus Score Engine (Commit E3)", () => {
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
    expect(res.explanation).toHaveLength(4);
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
    expect(res.components.focusTimePoints).toBe(40);
    expect(res.components.completionPoints).toBe(25);
    expect(res.components.breakAdherencePoints).toBe(20);
    expect(res.components.distractionPenalty).toBe(-1);
  });
});
