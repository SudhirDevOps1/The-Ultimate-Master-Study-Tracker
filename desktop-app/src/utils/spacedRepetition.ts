import { addDays, format, isBefore, isToday } from "date-fns";

export interface SM2CardData {
  repetition: number;   // Consecutive successful repetitions
  easeFactor: number;   // Ease factor (min 1.3)
  interval: number;     // Days until next review
  nextReviewDate: string; // ISO date string (YYYY-MM-DD)
  lastReviewedAt?: string;
}

export type ReviewGrade = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

/**
 * Calculates next review schedule using SuperMemo-2 (SM-2) Spaced Repetition Algorithm.
 */
export function calculateSM2(
  grade: ReviewGrade,
  current: SM2CardData = { repetition: 0, easeFactor: 2.5, interval: 0, nextReviewDate: format(new Date(), "yyyy-MM-dd") }
): SM2CardData {
  let { repetition, easeFactor, interval } = current;

  if (grade >= 3) {
    // Correct response (Good / Easy)
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  } else {
    // Incorrect response (Again / Hard)
    repetition = 0;
    interval = 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const nextDate = addDays(new Date(), interval);
  const nextReviewDate = format(nextDate, "yyyy-MM-dd");

  return {
    repetition,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    nextReviewDate,
    lastReviewedAt: new Date().toISOString(),
  };
}

/**
 * Checks if a flashcard is due for review today or overdue.
 */
export function isCardDue(nextReviewDate?: string): boolean {
  if (!nextReviewDate) return true; // New cards are due immediately
  const todayStr = format(new Date(), "yyyy-MM-dd");
  return nextReviewDate <= todayStr;
}
