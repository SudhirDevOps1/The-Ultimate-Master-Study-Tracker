import { describe, it, expect } from "vitest";
import {
  calculateSM2,
  gradeToQuality,
  calculateDeterministicFuzz,
  isCardDue,
  type SM2CardData,
} from "../spacedRepetition";

describe("Spaced Repetition Engine (SM-2 & Anki Parity)", () => {
  const baseDate = new Date("2026-10-27T12:00:00.000Z");

  it("correctly maps 1-4 UI grades to SuperMemo-2 quality scores (0..5)", () => {
    expect(gradeToQuality(1)).toBe(0); // Again = complete failure
    expect(gradeToQuality(2)).toBe(3); // Hard = pass with difficulty
    expect(gradeToQuality(3)).toBe(4); // Good = clean pass
    expect(gradeToQuality(4)).toBe(5); // Easy = perfect recall
  });

  it("Hard (grade 2) does NOT reset repetition count and increases interval", () => {
    const card: SM2CardData = {
      repetition: 3,
      easeFactor: 2.5,
      interval: 10,
      nextReviewDate: "2026-10-27",
    };

    const result = calculateSM2(2, card, { referenceDate: baseDate });
    expect(result.repetition).toBe(4); // Did not reset to 0
    expect(result.interval).toBeGreaterThanOrEqual(10); // Interval advanced
    expect(result.easeFactor).toBeLessThan(2.5); // EF decreased by 0.14
    expect(result.easeFactor).toBe(2.36);
  });

  it("Good (grade 3) preserves ease factor without dropping", () => {
    const card: SM2CardData = {
      repetition: 2,
      easeFactor: 2.5,
      interval: 6,
      nextReviewDate: "2026-10-27",
    };

    const result = calculateSM2(3, card, { referenceDate: baseDate });
    expect(result.repetition).toBe(3);
    expect(result.easeFactor).toBe(2.5); // EF does not drop on Good
    expect(result.interval).toBe(15); // 6 * 2.5 = 15
  });

  it("Easy (grade 4) increases ease factor above 2.5 and grants interval bonus", () => {
    const card: SM2CardData = {
      repetition: 2,
      easeFactor: 2.5,
      interval: 6,
      nextReviewDate: "2026-10-27",
    };

    const result = calculateSM2(4, card, { referenceDate: baseDate });
    expect(result.repetition).toBe(3);
    expect(result.easeFactor).toBe(2.6); // 2.5 + 0.1 = 2.6
    expect(result.interval).toBeGreaterThan(15); // Easy bonus: 6 * 2.5 * 1.3 ≈ 20
  });

  it("Again (grade 1) resets repetition count, triggers lapse, and respects EF floor of 1.3", () => {
    const card: SM2CardData = {
      repetition: 5,
      easeFactor: 1.4,
      interval: 30,
      nextReviewDate: "2026-10-27",
      lapses: 2,
    };

    const result = calculateSM2(1, card, { referenceDate: baseDate });
    expect(result.repetition).toBe(0);
    expect(result.lapses).toBe(3);
    expect(result.easeFactor).toBe(1.3); // Floor at 1.3 (1.4 - 0.8 would be 0.6)
    expect(result.phase).toBe("relearning");
    expect(result.nextReviewAt).toBeDefined();
  });

  it("flags leech when lapses reach 8 or more, without auto-suspending", () => {
    const card: SM2CardData = {
      repetition: 2,
      easeFactor: 2.0,
      interval: 5,
      nextReviewDate: "2026-10-27",
      lapses: 7,
      leech: false,
    };

    const result = calculateSM2(1, card, { referenceDate: baseDate });
    expect(result.lapses).toBe(8);
    expect(result.leech).toBe(true);
  });

  it("deterministic fuzzing produces identical results for identical seed without Math.random", () => {
    const fuzz1 = calculateDeterministicFuzz(20, "card-uuid-1234");
    const fuzz2 = calculateDeterministicFuzz(20, "card-uuid-1234");
    const fuzzDifferent = calculateDeterministicFuzz(20, "card-uuid-9999");

    expect(fuzz1).toBe(fuzz2);
    expect(typeof fuzz1).toBe("number");
    // Fuzz only applies to interval >= 7
    expect(calculateDeterministicFuzz(6, "card-uuid-1234")).toBe(0);
  });

  it("legacy card with all new optional fields undefined schedules seamlessly", () => {
    const legacyCard: SM2CardData = {
      repetition: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReviewDate: "2026-10-27",
      // phase, learningStep, lapses, leech, nextReviewAt are all undefined
    };

    const result = calculateSM2(3, legacyCard, { referenceDate: baseDate });
    expect(result.repetition).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBe(2.5);
    expect(result.nextReviewDate).toBe("2026-10-28");
  });

  it("isCardDue correctly evaluates due status without depending on clock", () => {
    const pastCard: SM2CardData = {
      repetition: 1,
      easeFactor: 2.5,
      interval: 1,
      nextReviewDate: "2026-10-26",
    };
    const futureCard: SM2CardData = {
      repetition: 1,
      easeFactor: 2.5,
      interval: 5,
      nextReviewDate: "2026-11-01",
    };

    expect(isCardDue(pastCard, baseDate)).toBe(true);
    expect(isCardDue(futureCard, baseDate)).toBe(false);
    expect(isCardDue(undefined, baseDate)).toBe(true); // New cards are due immediately
  });
});
