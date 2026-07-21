import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  differenceInDays,
  getYear,
} from "date-fns";
import type { AnalyticsMetric, AnalyticsRange, StudySession } from "@/types/models";

export interface SummaryMetrics {
  plannedHours: number;
  actualHours: number;
  completionPct: number;
  focusRatio: number;
  totalSessions: number;
}

export interface DetailedStreak {
  daily: number;
  weekly: number;
  monthlyHours: number;
  longestStreak: number;
  totalDaysStudied: number;
  avgHoursPerDay: number;
  bestDay: { date: string; hours: number } | null;
  bestWeek: { weekStart: string; hours: number } | null;
  bestMonth: { month: string; hours: number } | null;
  currentWeekHours: number;
  lastWeekHours: number;
  currentMonthHours: number;
  lastMonthHours: number;
  thisYearHours: number;
  allTimeHours: number;
}

function toSummary(sessions: StudySession[]): SummaryMetrics {
  const plannedMinutes = sessions.reduce((sum, current) => sum + current.plannedMinutes, 0);
  const actualSeconds = sessions.reduce((sum, current) => sum + current.actualSeconds, 0);
  const plannedHours = plannedMinutes / 60;
  const actualHours = actualSeconds / 3600;
  const completionPct = plannedHours > 0 ? (actualHours / plannedHours) * 100 : 0;
  const focusRatio = sessions.length > 0 ? sessions.filter((item) => item.actualSeconds > 0).length / sessions.length : 0;
  return {
    plannedHours: Number(plannedHours.toFixed(2)),
    actualHours: Number(actualHours.toFixed(2)),
    completionPct: Number(Math.min(100, completionPct).toFixed(1)),
    focusRatio: Number((focusRatio * 100).toFixed(1)),
    totalSessions: sessions.length,
  };
}

export type ExtendedRange = AnalyticsRange | "last7days" | "last30days" | "last90days" | "last6months" | "last12months" | "alltime";

export function getRangeMetrics(sessions: StudySession[], range: AnalyticsRange | ExtendedRange): AnalyticsMetric[] {
  const now = new Date();

  if (range === "daily" || range === "last7days") {
    const dates = eachDayOfInterval({ start: subDays(now, 6), end: now });
    return dates.map((date) => {
      const start = startOfDay(date);
      const end = endOfDay(date);
      const byDate = sessions.filter((session) =>
        isWithinInterval(new Date(session.startTime), { start, end })
      );
      return {
        label: format(date, "EEE"),
        fullLabel: format(date, "MMM d, yyyy"),
        ...toSummary(byDate),
      };
    });
  }

  if (range === "last30days") {
    const dates = eachDayOfInterval({ start: subDays(now, 29), end: now });
    return dates.map((date) => {
      const start = startOfDay(date);
      const end = endOfDay(date);
      const byDate = sessions.filter((session) =>
        isWithinInterval(new Date(session.startTime), { start, end })
      );
      return {
        label: format(date, "d"),
        fullLabel: format(date, "MMM d, yyyy"),
        ...toSummary(byDate),
      };
    });
  }

  if (range === "last90days") {
    // Group by week for 90 days
    const weeks = eachWeekOfInterval({ start: subDays(now, 89), end: now }, { weekStartsOn: 1 });
    return weeks.map((weekDate) => {
      const start = startOfWeek(weekDate, { weekStartsOn: 1 });
      const end = endOfWeek(weekDate, { weekStartsOn: 1 });
      const byWeek = sessions.filter((session) =>
        isWithinInterval(new Date(session.startTime), { start, end })
      );
      return {
        label: format(start, "MMM d"),
        fullLabel: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
        ...toSummary(byWeek),
      };
    });
  }

  if (range === "weekly" || range === "last6months") {
    const weeks = eachWeekOfInterval({ start: subMonths(now, 6), end: now }, { weekStartsOn: 1 });
    return weeks.map((weekDate) => {
      const start = startOfWeek(weekDate, { weekStartsOn: 1 });
      const end = endOfWeek(weekDate, { weekStartsOn: 1 });
      const byWeek = sessions.filter((session) =>
        isWithinInterval(new Date(session.startTime), { start, end })
      );
      return {
        label: format(start, "MMM d"),
        fullLabel: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
        ...toSummary(byWeek),
      };
    });
  }

  if (range === "monthly" || range === "last12months") {
    const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return months.map((monthDate) => {
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const byMonth = sessions.filter((session) =>
        isWithinInterval(new Date(session.startTime), { start, end })
      );
      return {
        label: format(monthDate, "MMM"),
        fullLabel: format(monthDate, "MMMM yyyy"),
        ...toSummary(byMonth),
      };
    });
  }

  if (range === "yearly" || range === "alltime") {
    // Get all years with data
    const years = new Set<number>();
    sessions.forEach((s) => years.add(getYear(new Date(s.startTime))));
    const sortedYears = Array.from(years).sort();
    
    if (sortedYears.length === 0) {
      return [{
        label: format(now, "yyyy"),
        fullLabel: format(now, "yyyy"),
        ...toSummary([]),
      }];
    }

    return sortedYears.map((year) => {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      const byYear = sessions.filter((session) =>
        isWithinInterval(new Date(session.startTime), { start: yearStart, end: yearEnd })
      );
      return {
        label: String(year),
        fullLabel: String(year),
        ...toSummary(byYear),
      };
    });
  }

  // Default yearly
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  const byYear = sessions.filter((session) =>
    isWithinInterval(new Date(session.startTime), { start: yearStart, end: yearEnd })
  );
  return [
    {
      label: format(now, "yyyy"),
      fullLabel: format(now, "yyyy"),
      ...toSummary(byYear),
    },
  ];
}

export function calculateDetailedStreaks(sessions: StudySession[]): DetailedStreak {
  const now = new Date();
  
  // Build a map of date -> hours
  const dayHoursMap = new Map<string, number>();
  sessions.forEach((session) => {
    if (session.actualSeconds > 0) {
      const dateKey = format(new Date(session.startTime), "yyyy-MM-dd");
      const existing = dayHoursMap.get(dateKey) ?? 0;
      dayHoursMap.set(dateKey, existing + session.actualSeconds / 3600);
    }
  });

  // Current daily streak
  let daily = 0;
  let cursor = new Date();
  
  // If the user hasn't studied today yet, check starting from yesterday
  const todayKey = format(cursor, "yyyy-MM-dd");
  if (!dayHoursMap.has(todayKey)) {
    cursor = subDays(cursor, 1);
  }
  
  while (dayHoursMap.has(format(cursor, "yyyy-MM-dd"))) {
    daily += 1;
    cursor = subDays(cursor, 1);
  }

  // Longest streak ever
  let longestStreak = 0;
  let currentStreakCount = 0;
  const sortedDays = Array.from(dayHoursMap.keys()).sort();
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      currentStreakCount = 1;
    } else {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diff = differenceInDays(currDate, prevDate);
      if (diff === 1) {
        currentStreakCount += 1;
      } else {
        longestStreak = Math.max(longestStreak, currentStreakCount);
        currentStreakCount = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreakCount);
  }

  // Weekly streak
  let weekly = 0;
  let weekCursor = startOfWeek(now, { weekStartsOn: 1 });
  while (true) {
    const weekStart = startOfWeek(weekCursor, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekCursor, { weekStartsOn: 1 });
    const hasFocusWeek = sessions.some((session) =>
      isWithinInterval(new Date(session.startTime), { start: weekStart, end: weekEnd }) && session.actualSeconds > 0
    );
    if (!hasFocusWeek) break;
    weekly += 1;
    weekCursor = subWeeks(weekStart, 1);
  }

  // Current month hours
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const currentMonthHours = sessions
    .filter((s) => isWithinInterval(new Date(s.startTime), { start: currentMonthStart, end: currentMonthEnd }))
    .reduce((sum, s) => sum + s.actualSeconds / 3600, 0);

  // Last month hours
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const lastMonthHours = sessions
    .filter((s) => isWithinInterval(new Date(s.startTime), { start: lastMonthStart, end: lastMonthEnd }))
    .reduce((sum, s) => sum + s.actualSeconds / 3600, 0);

  // Current week hours
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const currentWeekHours = sessions
    .filter((s) => isWithinInterval(new Date(s.startTime), { start: currentWeekStart, end: currentWeekEnd }))
    .reduce((sum, s) => sum + s.actualSeconds / 3600, 0);

  // Last week hours
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekHours = sessions
    .filter((s) => isWithinInterval(new Date(s.startTime), { start: lastWeekStart, end: lastWeekEnd }))
    .reduce((sum, s) => sum + s.actualSeconds / 3600, 0);

  // This year
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  const thisYearHours = sessions
    .filter((s) => isWithinInterval(new Date(s.startTime), { start: yearStart, end: yearEnd }))
    .reduce((sum, s) => sum + s.actualSeconds / 3600, 0);

  // All time
  const allTimeHours = sessions.reduce((sum, s) => sum + s.actualSeconds / 3600, 0);

  // Total days studied
  const totalDaysStudied = dayHoursMap.size;

  // Average hours per study day
  const avgHoursPerDay = totalDaysStudied > 0 ? allTimeHours / totalDaysStudied : 0;

  // Best day
  let bestDay: { date: string; hours: number } | null = null;
  dayHoursMap.forEach((hours, date) => {
    if (!bestDay || hours > bestDay.hours) {
      bestDay = { date, hours };
    }
  });

  // Best week
  const weekHoursMap = new Map<string, number>();
  sessions.forEach((s) => {
    if (s.actualSeconds > 0) {
      const weekStart = format(startOfWeek(new Date(s.startTime), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const existing = weekHoursMap.get(weekStart) ?? 0;
      weekHoursMap.set(weekStart, existing + s.actualSeconds / 3600);
    }
  });
  let bestWeek: { weekStart: string; hours: number } | null = null;
  weekHoursMap.forEach((hours, weekStart) => {
    if (!bestWeek || hours > bestWeek.hours) {
      bestWeek = { weekStart, hours };
    }
  });

  // Best month
  const monthHoursMap = new Map<string, number>();
  sessions.forEach((s) => {
    if (s.actualSeconds > 0) {
      const month = format(new Date(s.startTime), "yyyy-MM");
      const existing = monthHoursMap.get(month) ?? 0;
      monthHoursMap.set(month, existing + s.actualSeconds / 3600);
    }
  });
  let bestMonth: { month: string; hours: number } | null = null;
  monthHoursMap.forEach((hours, month) => {
    if (!bestMonth || hours > bestMonth.hours) {
      bestMonth = { month, hours };
    }
  });

  return {
    daily,
    weekly,
    monthlyHours: Number(currentMonthHours.toFixed(1)),
    longestStreak,
    totalDaysStudied,
    avgHoursPerDay: Number(avgHoursPerDay.toFixed(2)),
    bestDay,
    bestWeek,
    bestMonth,
    currentWeekHours: Number(currentWeekHours.toFixed(1)),
    lastWeekHours: Number(lastWeekHours.toFixed(1)),
    currentMonthHours: Number(currentMonthHours.toFixed(1)),
    lastMonthHours: Number(lastMonthHours.toFixed(1)),
    thisYearHours: Number(thisYearHours.toFixed(1)),
    allTimeHours: Number(allTimeHours.toFixed(1)),
  };
}

export function calculateStreaks(sessions: StudySession[]): { daily: number; weekly: number; monthlyHours: number } {
  const detailed = calculateDetailedStreaks(sessions);
  return {
    daily: detailed.daily,
    weekly: detailed.weekly,
    monthlyHours: detailed.monthlyHours,
  };
}

export function buildHeatmapData(sessions: StudySession[], days: number = 90): Array<{ day: string; minutes: number }> {
  return eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() }).map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const minutes = sessions
      .filter((session) => format(new Date(session.startTime), "yyyy-MM-dd") === dayKey)
      .reduce((sum, session) => sum + Math.round(session.actualSeconds / 60), 0);
    return { day: dayKey, minutes };
  });
}

export function buildYearHeatmap(sessions: StudySession[], year: number): Array<{ day: string; minutes: number }> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  
  return eachDayOfInterval({ start: yearStart, end: yearEnd }).map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const minutes = sessions
      .filter((session) => format(new Date(session.startTime), "yyyy-MM-dd") === dayKey)
      .reduce((sum, session) => sum + Math.round(session.actualSeconds / 60), 0);
    return { day: dayKey, minutes };
  });
}

// Get subject-wise analytics
export function getSubjectAnalytics(sessions: StudySession[], subjectId: string) {
  const subjectSessions = sessions.filter((s) => s.subjectId === subjectId);
  const totalHours = subjectSessions.reduce((sum, s) => sum + s.actualSeconds / 3600, 0);
  const totalPlannedHours = subjectSessions.reduce((sum, s) => sum + s.plannedMinutes / 60, 0);
  const completionPct = totalPlannedHours > 0 ? (totalHours / totalPlannedHours) * 100 : 0;
  
  // Best time to study (hour of day with most hours)
  const hourMap = new Map<number, number>();
  subjectSessions.forEach((s) => {
    const hour = new Date(s.startTime).getHours();
    const existing = hourMap.get(hour) ?? 0;
    hourMap.set(hour, existing + s.actualSeconds / 3600);
  });
  
  let bestHour = 0;
  let bestHourValue = 0;
  hourMap.forEach((hours, hour) => {
    if (hours > bestHourValue) {
      bestHourValue = hours;
      bestHour = hour;
    }
  });

  return {
    totalHours: Number(totalHours.toFixed(1)),
    totalPlannedHours: Number(totalPlannedHours.toFixed(1)),
    completionPct: Number(Math.min(100, completionPct).toFixed(1)),
    sessionCount: subjectSessions.length,
    bestStudyHour: bestHour,
    avgSessionLength: subjectSessions.length > 0 
      ? Number((totalHours / subjectSessions.length * 60).toFixed(0)) // in minutes
      : 0,
  };
}
