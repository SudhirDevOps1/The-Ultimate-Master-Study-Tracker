import { StudySession, Subject } from "@/types/models";
import { isSameDay, subDays, getHours } from "date-fns";

export interface Insight {
  type: "peak_time" | "neglected_subject" | "streak_milestone" | "recommendation";
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  icon: string;
}

export function generateInsights(sessions: StudySession[], subjects: Subject[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  
  // 1. Peak Focus Time Analysis
  const hourCounts = new Array(24).fill(0);
  sessions.forEach(s => {
    if (s.actualSeconds > 0) {
      const hour = getHours(new Date(s.startTime));
      hourCounts[hour] += s.actualSeconds;
    }
  });

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakTimeStr = peakHour >= 12 
    ? `${peakHour === 12 ? 12 : peakHour - 12} PM` 
    : `${peakHour === 0 ? 12 : peakHour} AM`;

  if (Math.max(...hourCounts) > 0) {
    insights.push({
      type: "peak_time",
      title: "Peak Focus Window",
      description: `Aap sabse zyada focused ${peakTimeStr} ke aas-pass hote hain. Try to schedule your hardest tasks then!`,
      importance: "medium",
      icon: "⚡"
    });
  }

  // 2. Neglected Subject Detection (Last 7 days)
  const last7Days = sessions.filter(s => new Date(s.startTime) > subDays(now, 7));
  const subjectTimeMap = new Map<string, number>();
  
  subjects.forEach(sub => {
    const time = last7Days
      .filter(s => s.subjectId === sub.id)
      .reduce((acc, s) => acc + s.actualSeconds, 0);
    subjectTimeMap.set(sub.id, time);
  });

  // Find subject with 0 time in last 7 days
  const neglected = subjects.find(sub => (subjectTimeMap.get(sub.id) || 0) === 0);
  if (neglected) {
    insights.push({
      type: "neglected_subject",
      title: "Neglected Subject",
      description: `Aapne pichle 1 hafte se "${neglected.name}" par focus nahi kiya hai. Consider a 30-min session tomorrow.`,
      importance: "high",
      icon: "⚠️"
    });
  }

  // 3. Consistency Recommendation
  const todaySessions = sessions.filter(s => isSameDay(new Date(s.startTime), now));
  const todaySeconds = todaySessions.reduce((acc, s) => acc + s.actualSeconds, 0);
  
  if (todaySeconds === 0) {
    insights.push({
      type: "recommendation",
      title: "Start Small",
      description: "Consistency is key! Aaj ek chota 15-minute session start karke apna flow banayein.",
      importance: "medium",
      icon: "🌱"
    });
  } else if (todaySeconds > 14400) { // 4 hours
    insights.push({
      type: "recommendation",
      title: "Zen Reminder",
      description: "Aaj aapne kaafi hard work kiya hai! Thoda rest lein aur dhyaan rakhein ki burn-out na ho.",
      importance: "low",
      icon: "🧘"
    });
  }

  // Fallback if no specific insights
  if (insights.length === 0) {
    insights.push({
      type: "recommendation",
      title: "Keep Tracking",
      description: "Jaise-jaise aap sessions complete karenge, AI aapke patterns ko analyze karke personalized tips dega!",
      importance: "low",
      icon: "📈"
    });
  }

  return insights;
}
