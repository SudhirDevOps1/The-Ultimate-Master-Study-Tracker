import { useMemo } from "react";
import { motion } from "framer-motion";
import type { StudySession, Subject } from "@/types/models";

interface SubjectRankingProps {
  sessions: StudySession[];
  subjects: Subject[];
  timeRange: "week" | "month" | "all";
}

export function SubjectRanking({ sessions, subjects, timeRange }: SubjectRankingProps) {
  const ranking = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    
    if (timeRange === "week") {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeRange === "month") {
      cutoffDate.setMonth(now.getMonth() - 1);
    } else {
      cutoffDate.setFullYear(1970);
    }

    const rankedSubjects = subjects.map((subject) => {
      const relevantSessions = sessions.filter((session) => {
        const sessionDate = new Date(session.startTime);
        return session.subjectId === subject.id && sessionDate >= cutoffDate;
      });

      const totalMinutes = relevantSessions.reduce((acc, s) => acc + s.actualSeconds / 60, 0);
      const completedSessions = relevantSessions.filter(s => s.status === "completed").length;
      const totalSessions = relevantSessions.length;
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      return {
        id: subject.id,
        name: subject.name,
        emoji: subject.emoji || "📚",
        color: subject.color,
        minutes: totalMinutes,
        hours: totalMinutes / 60,
        sessions: totalSessions,
        completed: completedSessions,
        completionRate,
      };
    }).filter(s => s.sessions > 0).sort((a, b) => b.minutes - a.minutes);

    return rankedSubjects;
  }, [sessions, subjects, timeRange]);

  if (ranking.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 p-8 text-center">
        <p className="text-slate-400">No study sessions in this time period</p>
      </div>
    );
  }

  const maxHours = Math.max(...ranking.map(r => r.hours), 1);

  return (
    <div className="space-y-3">
      {ranking.map((subject, index) => (
        <motion.div
          key={subject.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: `${subject.color}40` }}>
              {index + 1}
            </div>
            
            <span className="text-2xl">{subject.emoji}</span>
            
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white truncate">{subject.name}</p>
              <p className="text-xs text-slate-400">{subject.sessions} sessions • {subject.completed} completed</p>
            </div>

            <div className="flex flex-col items-end flex-shrink-0">
              <p className="text-lg font-bold text-cyan-300">{subject.hours.toFixed(1)}h</p>
              <p className="text-xs text-slate-400">{Math.round(subject.completionRate)}% done</p>
            </div>
          </div>

          <div className="mt-3 flex gap-2 items-center">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (subject.hours / maxHours) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: index * 0.05 + 0.3 }}
                className="h-full rounded-full transition-all"
                style={{ backgroundColor: subject.color }}
              />
            </div>
            <p className="text-xs text-slate-400 min-w-fit">{Math.round((subject.hours / maxHours) * 100)}%</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
