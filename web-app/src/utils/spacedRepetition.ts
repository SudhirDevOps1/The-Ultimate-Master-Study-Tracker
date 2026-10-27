import { addDays, addMinutes, format } from "date-fns";

export interface SM2CardData {
  repetition: number;   // Consecutive successful repetitions
  easeFactor: number;   // Ease factor (floor: 1.3)
  interval: number;     // Days until next review
  nextReviewDate: string; // ISO date string (YYYY-MM-DD)
  lastReviewedAt?: string;
  // Enhanced SuperMemo-2 / Anki / FSRS Optional Fields
  phase?: "learning" | "review" | "relearning";
  learningStep?: number; // 0 = 1m, 1 = 10m
  lapses?: number;       // Number of times lapsed (failed with Again)
  leech?: boolean;       // Flagged when lapses >= 8
  nextReviewAt?: string; // High-precision ISO string for intra-day learning steps
}

export type ReviewGrade = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface ScheduleOptions {
  cardId?: string;
  maxInterval?: number; // Default: 365 days
  referenceDate?: Date; // Injected for deterministic testing without clock dependency
  scheduler?: "sm2" | "fsrs";
}

/**
 * Maps 1-4 UI ReviewGrade to standard SuperMemo-2 quality score (0..5):
 * 1 (Again) -> 0 (Complete failure / lapse)
 * 2 (Hard)  -> 3 (Pass with serious difficulty)
 * 3 (Good)  -> 4 (Pass with slight hesitation)
 * 4 (Easy)  -> 5 (Perfect recall)
 */
export function gradeToQuality(grade: ReviewGrade): number {
  switch (grade) {
    case 1: return 0;
    case 2: return 3;
    case 3: return 4;
    case 4: return 5;
    default: return 4;
  }
}

/**
 * Deterministic hash-based fuzzing (-5% to +5%) for intervals >= 7 days.
 * Pure function: uses cardId / seed instead of Math.random().
 */
export function calculateDeterministicFuzz(interval: number, seed: string): number {
  if (interval < 7) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  // Normalize hash to [-0.05, +0.05]
  const factor = (((Math.abs(hash) % 1000) / 1000) - 0.5) * 0.10;
  return Math.round(interval * factor);
}

/**
 * Calculates next review schedule using SuperMemo-2 (SM-2) Spaced Repetition Algorithm
 * with intra-day learning steps (1m -> 10m -> 1d), leech detection, and deterministic fuzzing.
 */
export function calculateSM2(
  grade: ReviewGrade,
  current: SM2CardData = {
    repetition: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReviewDate: format(new Date(), "yyyy-MM-dd"),
  },
  options: ScheduleOptions = {}
): SM2CardData {
  const refDate = options.referenceDate ?? new Date();
  const maxInterval = options.maxInterval ?? 365;
  const q = gradeToQuality(grade);

  let {
    repetition = 0,
    easeFactor = 2.5,
    interval = 0,
    phase = "review",
    learningStep = 0,
    lapses = 0,
    leech = false,
  } = current;

  // Lapses & Leech handling: Only Again (q = 0) counts as a failure/lapse
  if (q < 3) {
    lapses += 1;
    if (lapses >= 8) {
      leech = true;
    }
    repetition = 0;
    phase = "relearning";
    learningStep = 0;

    // Again drops EF by 0.8
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

    // 1-minute immediate review step
    const nextAt = addMinutes(refDate, 1);
    return {
      repetition: 0,
      easeFactor: Math.round(easeFactor * 100) / 100,
      interval: 0,
      nextReviewDate: format(nextAt, "yyyy-MM-dd"),
      nextReviewAt: nextAt.toISOString(),
      lastReviewedAt: refDate.toISOString(),
      phase,
      learningStep,
      lapses,
      leech,
    };
  }

  // --- PASSING GRADES (q >= 3: Hard, Good, Easy) ---

  // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // q=5 -> +0.10, q=4 -> 0.00 (no drop), q=3 -> -0.14
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Intra-day Learning / Relearning phase
  if (phase === "learning" || phase === "relearning") {
    if (q === 3) {
      // Hard: Repeat current learning step (1m or 10m)
      const waitMinutes = learningStep === 0 ? 1 : 10;
      const nextAt = addMinutes(refDate, waitMinutes);
      return {
        repetition: 0,
        easeFactor: Math.round(easeFactor * 100) / 100,
        interval: 0,
        nextReviewDate: format(nextAt, "yyyy-MM-dd"),
        nextReviewAt: nextAt.toISOString(),
        lastReviewedAt: refDate.toISOString(),
        phase,
        learningStep,
        lapses,
        leech,
      };
    } else if (q === 4) {
      // Good: Advance to step 1 (10m) or graduate to 1 day
      if (learningStep === 0) {
        learningStep = 1;
        const nextAt = addMinutes(refDate, 10);
        return {
          repetition: 0,
          easeFactor: Math.round(easeFactor * 100) / 100,
          interval: 0,
          nextReviewDate: format(nextAt, "yyyy-MM-dd"),
          nextReviewAt: nextAt.toISOString(),
          lastReviewedAt: refDate.toISOString(),
          phase,
          learningStep,
          lapses,
          leech,
        };
      }
      // Graduate from learning step 1 -> Review phase (1 day)
      phase = "review";
      repetition = 1;
      interval = 1;
    } else {
      // Easy (q = 5): Graduate immediately with bonus interval
      phase = "review";
      repetition = 1;
      interval = Math.max(1, Math.round(4 * easeFactor));
    }
  } else {
    // Standard Review Phase
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      if (q === 3) {
        // Hard: Increment interval modestly (1.2x) without resetting repetition
        interval = Math.max(repetition + 1, Math.round(interval * 1.2));
      } else if (q === 4) {
        // Good: Interval * EaseFactor
        interval = Math.round(interval * easeFactor);
      } else {
        // Easy: Interval * EaseFactor * 1.3 (Easy bonus)
        interval = Math.round(interval * easeFactor * 1.3);
      }
    }
    repetition += 1;
  }

  // Fuzzing for intervals >= 7 days
  const seed = options.cardId || `${repetition}-${interval}-${format(refDate, "yyyy-MM-dd")}`;
  const fuzz = calculateDeterministicFuzz(interval, seed);
  interval = Math.max(1, interval + fuzz);

  // Apply maximum interval cap
  interval = Math.min(interval, maxInterval);

  const nextDate = addDays(refDate, interval);
  const nextReviewDate = format(nextDate, "yyyy-MM-dd");

  return {
    repetition,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    nextReviewDate,
    nextReviewAt: nextDate.toISOString(),
    lastReviewedAt: refDate.toISOString(),
    phase,
    learningStep,
    lapses,
    leech,
  };
}

/**
 * Checks if a flashcard is due for review today or overdue.
 * Pure and clock-independent when referenceDate is provided.
 */
export function isCardDue(cardOrDate?: SM2CardData | string, referenceDate?: Date): boolean {
  if (!cardOrDate) return true; // New cards are due immediately

  const ref = referenceDate ?? new Date();
  const todayStr = format(ref, "yyyy-MM-dd");

  if (typeof cardOrDate === "string") {
    return cardOrDate <= todayStr;
  }

  // Check high-precision timestamp first if available
  if (cardOrDate.nextReviewAt) {
    return Date.parse(cardOrDate.nextReviewAt) <= ref.getTime();
  }

  if (cardOrDate.nextReviewDate) {
    return cardOrDate.nextReviewDate <= todayStr;
  }

  return true;
}
