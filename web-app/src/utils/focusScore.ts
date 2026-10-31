export interface FocusScoreFactors {
  studyMinutes: number;
  completedSessions: number;
  totalPlannedSessions: number;
  breakAdherenceCount?: number | null;
  distractionSeconds?: number | null;
}

export interface FocusScoreBreakdown {
  score: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C" | "D";
  components: {
    focusTimePoints: number;
    completionPoints: number;
    breakAdherencePoints: number | null;
    distractionPenalty: number | null;
  };
  explanation: string[];
}

/**
 * Computes a transparent, auditable Focus Score based on real verifiable factors.
 * Re-normalizes component weights dynamically when optional factors are untracked (null),
 * and never manufactures or fabricates numbers.
 */
export function calculateFocusScore(factors: FocusScoreFactors): FocusScoreBreakdown {
  const {
    studyMinutes = 0,
    completedSessions = 0,
    totalPlannedSessions = 0,
    breakAdherenceCount = null,
    distractionSeconds = null,
  } = factors;

  if (studyMinutes <= 0 && completedSessions <= 0) {
    return {
      score: 0,
      grade: "D",
      components: {
        focusTimePoints: 0,
        completionPoints: 0,
        breakAdherencePoints: breakAdherenceCount !== null ? 0 : null,
        distractionPenalty: distractionSeconds !== null ? 0 : null,
      },
      explanation: ["No verified study activity recorded for this period."],
    };
  }

  const hasBreaks = breakAdherenceCount !== null && breakAdherenceCount !== undefined;
  const hasDistraction = distractionSeconds !== null && distractionSeconds !== undefined;

  let focusTimePoints = 0;
  let completionPoints = 0;
  let breakAdherencePoints: number | null = null;
  let distractionPenalty: number | null = null;

  if (hasBreaks) {
    // Standard 4-component model (Max 40 focus + 25 goals + 25 breaks = 90 base + 10 consistency = 100)
    focusTimePoints = Math.min(45, Math.round(studyMinutes / 4)); // 180m = 45pts
    if (totalPlannedSessions > 0) {
      completionPoints = Math.round(Math.min(1, completedSessions / totalPlannedSessions) * 30);
    } else if (completedSessions > 0) {
      completionPoints = 25;
    }
    breakAdherencePoints = Math.min(25, (breakAdherenceCount || 0) * 5);
  } else {
    // Re-normalized 2-component model: Scales Study Time (60 pts) and Session Goals (40 pts)
    focusTimePoints = Math.min(60, Math.round(studyMinutes / 3)); // 180m = 60pts
    if (totalPlannedSessions > 0) {
      completionPoints = Math.round(Math.min(1, completedSessions / totalPlannedSessions) * 40);
    } else if (completedSessions > 0) {
      completionPoints = 35;
    }
  }

  if (hasDistraction) {
    const distractionMins = Math.round((distractionSeconds || 0) / 60);
    distractionPenalty = Math.max(-20, -Math.floor(distractionMins / 3));
  }

  const positiveSubtotal = focusTimePoints + completionPoints + (breakAdherencePoints || 0);
  const netScore = positiveSubtotal + (distractionPenalty || 0);
  const score = Math.max(0, Math.min(100, netScore));

  let grade: "A+" | "A" | "B" | "C" | "D" = "D";
  if (score >= 90) grade = "A+";
  else if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";

  const explanation: string[] = [
    `Study Time: +${focusTimePoints} pts (${studyMinutes} mins focused)`,
    `Session Goals: +${completionPoints} pts (${completedSessions}/${totalPlannedSessions || completedSessions} sessions)`,
  ];

  if (hasBreaks) {
    explanation.push(`Ergonomic Breaks: +${breakAdherencePoints} pts (${breakAdherenceCount} breaks recorded)`);
  } else {
    explanation.push("Ergonomic Breaks: Untracked for this period");
  }

  if (hasDistraction) {
    const distractionMins = Math.round((distractionSeconds || 0) / 60);
    explanation.push(`Distraction: ${distractionPenalty} pts (${distractionMins} mins off-task)`);
  } else {
    explanation.push("Distraction: Untracked for this period");
  }

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
