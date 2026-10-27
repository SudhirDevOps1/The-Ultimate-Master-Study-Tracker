export interface FocusScoreFactors {
  studyMinutes: number;
  completedSessions: number;
  totalPlannedSessions: number;
  breakAdherenceCount: number;
  distractionSeconds: number;
}

export interface FocusScoreBreakdown {
  score: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C" | "D";
  components: {
    focusTimePoints: number; // Max 40
    completionPoints: number; // Max 25
    breakAdherencePoints: number; // Max 25
    distractionPenalty: number; // Negative or 0 (up to -20)
  };
  explanation: string[];
}

/**
 * Computes a transparent, auditable Focus Score based on clear, verifiable factors.
 * No black-box or invented numbers.
 */
export function calculateFocusScore(factors: FocusScoreFactors): FocusScoreBreakdown {
  const {
    studyMinutes,
    completedSessions,
    totalPlannedSessions,
    breakAdherenceCount,
    distractionSeconds,
  } = factors;

  // 1. Focus Time Points (1 pt per 5 mins, capped at 40 pts for 200 mins of focused work)
  const focusTimePoints = Math.min(40, Math.round(studyMinutes / 5));

  // 2. Session Completion Points (up to 25 pts)
  let completionPoints = 0;
  if (totalPlannedSessions > 0) {
    const ratio = Math.min(1, completedSessions / totalPlannedSessions);
    completionPoints = Math.round(ratio * 25);
  } else if (completedSessions > 0) {
    completionPoints = 20; // Unplanned spontaneous sessions completed
  }

  // 3. Break Adherence Points (5 pts per regular break taken, max 25 pts)
  const breakAdherencePoints = Math.min(25, breakAdherenceCount * 5);

  // 4. Distraction Penalty (1 pt deducted per 3 mins of idle/distraction, max -20 pts)
  const distractionMins = Math.round(distractionSeconds / 60);
  const distractionPenalty = Math.max(-20, -Math.floor(distractionMins / 3));

  // Total Score clamped between 0 and 100
  const rawScore = focusTimePoints + completionPoints + breakAdherencePoints + distractionPenalty;
  const score = Math.max(0, Math.min(100, rawScore));

  let grade: "A+" | "A" | "B" | "C" | "D" = "D";
  if (score >= 90) grade = "A+";
  else if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";

  const explanation = [
    `Study Time: +${focusTimePoints}/40 pts (${studyMinutes} mins focused)`,
    `Session Goals: +${completionPoints}/25 pts (${completedSessions}/${totalPlannedSessions || completedSessions} sessions)`,
    `Ergonomic Breaks: +${breakAdherencePoints}/25 pts (${breakAdherenceCount} breaks observed)`,
    `Distraction: ${distractionPenalty} pts (${distractionMins} mins off-task)`,
  ];

  return {
    score,
    grade,
    components: {
      focusTimePoints,
      completionPoints,
      breakAdherencePoints,
      distractionPenalty,
    },
    explanation,
  };
}
