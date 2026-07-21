import { useMemo } from "react";
import { buildHeatmapData, calculateDetailedStreaks, buildYearHeatmap } from "@/utils/analytics";
import { useAppStore } from "@/store/useAppStore";

export function useStreak() {
  const sessions = useAppStore((state) => state.sessions);

  return useMemo(() => {
    const detailed = calculateDetailedStreaks(sessions);
    const heatmap = buildHeatmapData(sessions, 90);
    return { 
      ...detailed, 
      heatmap,
    };
  }, [sessions]);
}

export function useYearHeatmap(year: number) {
  const sessions = useAppStore((state) => state.sessions);
  
  return useMemo(() => {
    return buildYearHeatmap(sessions, year);
  }, [sessions, year]);
}

export function useSubjectStats(subjectId: string) {
  const sessions = useAppStore((state) => state.sessions);
  
  return useMemo(() => {
    const subjectSessions = sessions.filter((s) => s.subjectId === subjectId);
    const totalHours = subjectSessions.reduce((sum, s) => sum + s.actualSeconds / 3600, 0);
    const totalPlannedHours = subjectSessions.reduce((sum, s) => sum + s.plannedMinutes / 60, 0);
    const completionPct = totalPlannedHours > 0 ? (totalHours / totalPlannedHours) * 100 : 0;
    
    // Get hours per day of week
    const dayOfWeekHours = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    subjectSessions.forEach((s) => {
      const dayOfWeek = new Date(s.startTime).getDay();
      dayOfWeekHours[dayOfWeek] += s.actualSeconds / 3600;
    });
    
    // Best day of week
    let bestDayOfWeek = 0;
    let bestDayHours = 0;
    dayOfWeekHours.forEach((hours, day) => {
      if (hours > bestDayHours) {
        bestDayHours = hours;
        bestDayOfWeek = day;
      }
    });
    
    // Hour of day distribution
    const hourDistribution = new Array(24).fill(0);
    subjectSessions.forEach((s) => {
      const hour = new Date(s.startTime).getHours();
      hourDistribution[hour] += s.actualSeconds / 3600;
    });
    
    let bestHour = 0;
    let bestHourValue = 0;
    hourDistribution.forEach((hours, hour) => {
      if (hours > bestHourValue) {
        bestHourValue = hours;
        bestHour = hour;
      }
    });
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    return {
      totalHours: Number(totalHours.toFixed(1)),
      totalPlannedHours: Number(totalPlannedHours.toFixed(1)),
      completionPct: Number(Math.min(100, completionPct).toFixed(1)),
      sessionCount: subjectSessions.length,
      bestStudyHour: bestHour,
      bestDayOfWeek: dayNames[bestDayOfWeek],
      avgSessionLength: subjectSessions.length > 0 
        ? Number((totalHours / subjectSessions.length * 60).toFixed(0))
        : 0,
      dayOfWeekHours,
      hourDistribution,
    };
  }, [sessions, subjectId]);
}
