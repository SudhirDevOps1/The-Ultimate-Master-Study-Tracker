import { useMemo } from "react";
import { motion } from "framer-motion";
import { startOfWeek } from "date-fns";
import type { StudySession, Subject } from "@/types/models";

interface WeeklySummaryProps {
  sessions: StudySession[];
  subjects: Subject[];
  theme: string;
}

export function WeeklySummary({ sessions, subjects, theme }: WeeklySummaryProps) {
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    
    const weekSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= weekStart && sessionDate <= now;
    });

    const totalMinutes = weekSessions.reduce((acc, s) => acc + s.actualSeconds / 60, 0);
    const completedSessions = weekSessions.filter(s => s.status === "completed").length;
    const totalSessions = weekSessions.length;
    
    const bySubject = subjects.map((subject) => {
      const subjectSessions = weekSessions.filter(s => s.subjectId === subject.id);
      const minutes = subjectSessions.reduce((acc, s) => acc + s.actualSeconds / 60, 0);
      return {
        name: subject.name,
        emoji: subject.emoji || "📚",
        minutes,
        count: subjectSessions.length,
        color: subject.color,
      };
    }).filter(s => s.minutes > 0).sort((a, b) => b.minutes - a.minutes);

    return {
      totalMinutes: Math.round(totalMinutes),
      totalHours: (totalMinutes / 60).toFixed(1),
      completedSessions,
      totalSessions,
      completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
      topSubjects: bySubject.slice(0, 3),
    };
  }, [sessions, subjects]);

  const getThemeGradient = () => {
    switch (theme) {
      case "ocean": return "from-sky-500 to-teal-400";
      case "forest": return "from-green-500 to-lime-400";
      case "sunset": return "from-orange-500 to-rose-500";
      case "galaxy": return "from-purple-500 to-pink-500";
      case "cyber": return "from-yellow-400 to-rose-500";
      default: return "from-indigo-500 to-cyan-500";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-gradient-to-r ${getThemeGradient()} p-[2px]`}
    >
      <div className="rounded-2xl bg-slate-900/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Weekly Summary</h3>
          <span className="text-3xl">📊</span>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-slate-400">Total Hours</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300">{weeklyStats.totalHours}h</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-slate-400">Sessions</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{weeklyStats.totalSessions}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-slate-400">Completed</p>
            <p className="mt-1 text-2xl font-bold text-yellow-300">{weeklyStats.completedSessions}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-slate-400">Completion Rate</p>
            <p className="mt-1 text-2xl font-bold text-purple-300">{weeklyStats.completionRate}%</p>
          </div>
        </div>

        {weeklyStats.topSubjects.length > 0 && (
          <div className="pt-2">
            <p className="text-sm font-medium text-slate-300 mb-3">Top Subjects This Week</p>
            <div className="space-y-2">
              {weeklyStats.topSubjects.map((subject) => (
                <div key={subject.name} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xl">{subject.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{subject.name}</p>
                      <p className="text-xs text-slate-400">{subject.count} session{subject.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-cyan-300 flex-shrink-0">{Math.round(subject.minutes)}m</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
