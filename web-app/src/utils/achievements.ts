import type { Achievement, AchievementType } from "@/types/models";

export const allAchievements: Achievement[] = [
  {
    id: "first_session",
    name: "First Steps",
    description: "Complete your first study session",
    icon: "🎯",
    color: "#22d3ee",
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day study streak",
    icon: "🔥",
    color: "#f97316",
    unlockedAt: null,
    progress: 0,
    maxProgress: 7,
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintain a 30-day study streak",
    icon: "💪",
    color: "#a855f7",
    unlockedAt: null,
    progress: 0,
    maxProgress: 30,
  },
  {
    id: "streak_100",
    name: "Century Club",
    description: "Maintain a 100-day study streak",
    icon: "🏆",
    color: "#fbbf24",
    unlockedAt: null,
    progress: 0,
    maxProgress: 100,
  },
  {
    id: "hours_10",
    name: "Getting Started",
    description: "Study for 10 total hours",
    icon: "⏰",
    color: "#6366f1",
    unlockedAt: null,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: "hours_50",
    name: "Half Century",
    description: "Study for 50 total hours",
    icon: "📚",
    color: "#22c55e",
    unlockedAt: null,
    progress: 0,
    maxProgress: 50,
  },
  {
    id: "hours_100",
    name: "Century Scholar",
    description: "Study for 100 total hours",
    icon: "🎓",
    color: "#0ea5e9",
    unlockedAt: null,
    progress: 0,
    maxProgress: 100,
  },
  {
    id: "hours_500",
    name: "Knowledge Master",
    description: "Study for 500 total hours",
    icon: "👑",
    color: "#ec4899",
    unlockedAt: null,
    progress: 0,
    maxProgress: 500,
  },
  {
    id: "perfect_week",
    name: "Perfect Week",
    description: "Achieve 100% completion for a full week",
    icon: "✨",
    color: "#84cc16",
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Study past midnight 10 times",
    icon: "🦉",
    color: "#6366f1",
    unlockedAt: null,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Study before 6 AM 10 times",
    icon: "🌅",
    color: "#fbbf24",
    unlockedAt: null,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: "weekend_warrior",
    name: "Weekend Warrior",
    description: "Study on 20 weekends",
    icon: "📅",
    color: "#a855f7",
    unlockedAt: null,
    progress: 0,
    maxProgress: 20,
  },
  {
    id: "subject_master",
    name: "Subject Master",
    description: "Study 50 hours in a single subject",
    icon: "🔬",
    color: "#f43f5e",
    unlockedAt: null,
    progress: 0,
    maxProgress: 50,
  },
  {
    id: "focused_2h",
    name: "Deep Focus",
    description: "Complete a 2-hour focused session",
    icon: "🧘",
    color: "#22d3ee",
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "focused_4h",
    name: "Ultra Focus",
    description: "Complete a 4-hour focused session",
    icon: "💎",
    color: "#0ea5e9",
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "daily_goal_7",
    name: "Goal Getter",
    description: "Hit daily goal 7 days in a row",
    icon: "🎯",
    color: "#22c55e",
    unlockedAt: null,
    progress: 0,
    maxProgress: 7,
  },
  {
    id: "daily_goal_30",
    name: "Goal Crusher",
    description: "Hit daily goal 30 days in a row",
    icon: "🚀",
    color: "#f97316",
    unlockedAt: null,
    progress: 0,
    maxProgress: 30,
  },
  {
    id: "all_subjects",
    name: "Renaissance",
    description: "Study all subjects at least once",
    icon: "🎨",
    color: "#ec4899",
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "strict_focus_5",
    name: "Strict Scholar",
    description: "Complete 5 timed sessions in strict focus (min 30m each)",
    icon: "🔒",
    color: "#38bdf8",
    unlockedAt: null,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: "day_warrior",
    name: "Day Warrior",
    description: "Study for 6+ hours in a single day (timed only)",
    icon: "💪",
    color: "#f43f5e",
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "subject_diversity",
    name: "Polymath",
    description: "Study at least 4 different subjects in a single week",
    icon: "🧠",
    color: "#a78bfa",
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Complete a timed session of 1 hour or more without pause",
    icon: "⚡",
    color: "#fbbf24",
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "early_bird_champion",
    name: "Early Bird Champion",
    description: "Study before 5 AM 5 times (timed, min 30m each)",
    icon: "🦅",
    color: "#fb923c",
    unlockedAt: null,
    progress: 0,
    maxProgress: 5,
  },
];

export function getInitialAchievements(): Achievement[] {
  return allAchievements.map((a) => ({ ...a }));
}

export function calculateAchievements(
  sessions: { startTime: string; actualSeconds: number; subjectId: string; status: string; plannedMinutes: number; manualEntry?: boolean }[],
  subjects: { id: string }[],
  dailyStreak: number,
  unlockedIds: AchievementType[],
  dailyGoalHitStreak: number
): Achievement[] {
  const achievements = getInitialAchievements();
  
  // Strict: filter out manual entries for specific timed focus milestones!
  const timedSessions = sessions.filter(s => s.manualEntry !== true);
  const completedAll = sessions.filter((s) => s.status === "completed");
  const uniqueSubjects = new Set(sessions.map((s) => s.subjectId));

  const totalHours = sessions.reduce((sum, s) => sum + s.actualSeconds, 0) / 3600;

  // Night owl: study past midnight (must be timed)
  const nightOwlCount = timedSessions.filter((s) => {
    const hour = new Date(s.startTime).getHours();
    return hour >= 0 && hour < 5 && s.actualSeconds > 0;
  }).length;

  // Early bird: study before 6 AM (must be timed)
  const earlyBirdCount = timedSessions.filter((s) => {
    const hour = new Date(s.startTime).getHours();
    return hour >= 4 && hour < 6 && s.actualSeconds > 0;
  }).length;

  // Weekend warrior (must be timed)
  const weekendCount = timedSessions.filter((s) => {
    const day = new Date(s.startTime).getDay();
    return (day === 0 || day === 6) && s.actualSeconds > 0;
  }).length;

  // Focused sessions (must be timed)
  const has2hSession = timedSessions.some((s) => s.actualSeconds >= 2 * 3600);
  const has4hSession = timedSessions.some((s) => s.actualSeconds >= 4 * 3600);

  // Perfect week check (simplified)
  const hasPerfectWeek = dailyStreak >= 7 && sessions.length > 0;

  // Max hours per subject
  const subjectHours: Record<string, number> = {};
  sessions.forEach((s) => {
    subjectHours[s.subjectId] = (subjectHours[s.subjectId] ?? 0) + s.actualSeconds / 3600;
  });
  const maxSubjectHours = Math.max(0, ...Object.values(subjectHours));

  // NEW ACHIEVEMENTS CALCULATIONS:
  // 1. Strict Focus 5: completed timed sessions >= 30 mins
  const strictFocusCount = timedSessions.filter(s => s.status === "completed" && s.actualSeconds >= 30 * 60).length;

  // 2. Day Warrior: 6+ hours in a single day (timed completed sessions)
  const dayHoursMap: Record<string, number> = {};
  timedSessions.forEach(s => {
    if (s.status === "completed") {
      const dKey = new Date(s.startTime).toDateString();
      dayHoursMap[dKey] = (dayHoursMap[dKey] ?? 0) + s.actualSeconds / 3600;
    }
  });
  const has6hDay = Object.values(dayHoursMap).some(h => h >= 6) ? 1 : 0;

  // 3. Subject Diversity: study 4 different subjects in a single week
  const weekSubjects: Record<string, Set<string>> = {};
  sessions.forEach(s => {
    if (s.actualSeconds > 0) {
      const d = new Date(s.startTime);
      // Monday start of week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeekStr = new Date(d.setDate(diff)).toDateString();
      if (!weekSubjects[startOfWeekStr]) {
        weekSubjects[startOfWeekStr] = new Set();
      }
      weekSubjects[startOfWeekStr].add(s.subjectId);
    }
  });
  const has4SubjectsWeek = Object.values(weekSubjects).some(set => set.size >= 4) ? 1 : 0;

  // 4. Unstoppable: 1 hour completed timed session
  const hasUnstoppable = timedSessions.some(s => s.status === "completed" && s.actualSeconds >= 3600) ? 1 : 0;

  // 5. Early Bird Champion: study before 5 AM 5 times (timed, >= 30m each)
  const earlyBirdChampCount = timedSessions.filter((s) => {
    const hour = new Date(s.startTime).getHours();
    return hour >= 0 && hour < 5 && s.actualSeconds >= 1800;
  }).length;

  const progressMap: Record<AchievementType, number> = {
    first_session: completedAll.length >= 1 ? 1 : 0,
    streak_7: dailyStreak,
    streak_30: dailyStreak,
    streak_100: dailyStreak,
    hours_10: Math.min(10, Math.floor(totalHours)),
    hours_50: Math.min(50, Math.floor(totalHours)),
    hours_100: Math.min(100, Math.floor(totalHours)),
    hours_500: Math.min(500, Math.floor(totalHours)),
    perfect_week: hasPerfectWeek ? 1 : 0,
    night_owl: nightOwlCount,
    early_bird: earlyBirdCount,
    weekend_warrior: weekendCount,
    subject_master: Math.floor(maxSubjectHours),
    focused_2h: has2hSession ? 1 : 0,
    focused_4h: has4hSession ? 1 : 0,
    daily_goal_7: dailyGoalHitStreak,
    daily_goal_30: dailyGoalHitStreak,
    all_subjects: uniqueSubjects.size >= subjects.length && subjects.length > 0 ? 1 : 0,
    strict_focus_5: strictFocusCount,
    day_warrior: has6hDay,
    subject_diversity: has4SubjectsWeek,
    unstoppable: hasUnstoppable,
    early_bird_champion: earlyBirdChampCount,
  };

  achievements.forEach((a) => {
    a.progress = progressMap[a.id];
    if (unlockedIds.includes(a.id)) {
      a.unlockedAt = "unlocked";
    } else if (a.progress >= a.maxProgress) {
      a.unlockedAt = new Date().toISOString();
    }
  });

  return achievements;
}
