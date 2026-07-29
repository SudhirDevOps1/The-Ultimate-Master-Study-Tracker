import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, subDays, eachDayOfInterval, startOfWeek, isSameDay, parseISO } from "date-fns";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { StudySession, Subject } from "@/types/models";
import { toDurationLabel } from "@/utils/time";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function secondsForDay(sessions: StudySession[], date: Date, subjectId?: string): number {
  return sessions
    .filter(s => {
      const sameDay = isSameDay(parseISO(s.startTime), date);
      const matchSubject = subjectId ? s.subjectId === subjectId : true;
      return sameDay && matchSubject && s.actualSeconds > 0;
    })
    .reduce((sum, s) => sum + s.actualSeconds, 0);
}

function getIntensity(seconds: number, maxSeconds: number): 0 | 1 | 2 | 3 | 4 {
  if (seconds === 0) return 0;
  const ratio = seconds / Math.max(maxSeconds, 1);
  if (ratio < 0.15) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.65) return 3;
  return 4;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
interface TooltipInfo {
  date: Date;
  seconds: number;
  x: number;
  y: number;
}

// ─── Single Heatmap Grid ──────────────────────────────────────────────────────
function HeatmapGrid({
  days,
  sessions,
  color,
  subjectId,
  onHover,
}: {
  days: Date[];
  sessions: StudySession[];
  color: string;
  subjectId?: string;
  onHover: (info: TooltipInfo | null) => void;
}) {
  // Group days into weeks (columns)
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const daySeconds = useMemo(
    () => days.map(d => secondsForDay(sessions, d, subjectId)),
    [days, sessions, subjectId]
  );
  const maxSeconds = Math.max(...daySeconds, 1);

  const intensityOpacity: Record<number, string> = {
    0: "0.07",
    1: "0.3",
    2: "0.55",
    3: "0.78",
    4: "1",
  };

  return (
    <div className="flex gap-[3px]">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) => {
            const idx = wi * 7 + di;
            const secs = daySeconds[idx] ?? 0;
            const intensity = getIntensity(secs, maxSeconds);
            const isToday = isSameDay(day, new Date());

            return (
              <motion.div
                key={day.toISOString()}
                whileHover={{ scale: 1.3 }}
                onMouseEnter={(e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  onHover({ date: day, seconds: secs, x: rect.left, y: rect.top });
                }}
                onMouseLeave={() => onHover(null)}
                className={`h-3 w-3 rounded-sm cursor-pointer transition-transform ${
                  isToday ? "ring-1 ring-white/40" : ""
                }`}
                style={{
                  backgroundColor: intensity === 0 ? "rgba(255,255,255,0.07)" : color,
                  opacity: intensity === 0 ? 1 : intensityOpacity[intensity],
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Subject Heatmap Card ─────────────────────────────────────────────────────
function SubjectHeatmapCard({ subject, sessions, days }: {
  subject: Subject;
  sessions: StudySession[];
  days: Date[];
}) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const subjectSessions = sessions.filter(s => s.subjectId === subject.id && s.actualSeconds > 0);
  const totalSeconds = subjectSessions.reduce((sum, s) => sum + s.actualSeconds, 0);
  const totalDays = new Set(subjectSessions.map(s => format(parseISO(s.startTime), "yyyy-MM-dd"))).size;

  // Streak
  let streak = 0;
  let cursor = new Date();
  while (secondsForDay(subjectSessions, cursor, subject.id) > 0) {
    streak++;
    cursor = subDays(cursor, 1);
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/40 p-5 hover:border-white/15 transition-colors relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="h-9 w-9 flex items-center justify-center rounded-xl text-lg border border-white/10"
            style={{ backgroundColor: subject.color + "33" }}
          >
            {subject.emoji || "📚"}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">{subject.name}</h3>
            <p className="text-[11px] text-slate-400">{toDurationLabel(totalSeconds)} total · {totalDays} days active</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black" style={{ color: subject.color }}>🔥 {streak}</p>
          <p className="text-[10px] text-slate-500">day streak</p>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex gap-[3px] mb-1 overflow-hidden">
        {Array.from({ length: Math.ceil(days.length / 7) }, (_, wi) => {
          const day = days[wi * 7];
          if (!day) return null;
          const showLabel = wi === 0 || day.getDate() <= 7;
          return (
            <div key={wi} className="w-3 shrink-0">
              {showLabel && (
                <span className="text-[8px] text-slate-600 leading-none">
                  {format(day, "MMM")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <HeatmapGrid
          days={days}
          sessions={subjectSessions}
          color={subject.color}
          subjectId={subject.id}
          onHover={setTooltip}
        />
      </div>

      {/* Weekday labels */}
      <div className="flex gap-[3px] mt-1">
        <div className="flex flex-col gap-[3px] mr-[3px]">
          {["Mo","We","Fr"].map(d => (
            <div key={d} className="h-3 flex items-center">
              <span className="text-[8px] text-slate-600 w-3">{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
        <span className="text-[10px] text-slate-500">Less</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-sm"
            style={{
              backgroundColor: i === 0 ? "rgba(255,255,255,0.07)" : subject.color,
              opacity: i === 0 ? 1 : [0.07, 0.3, 0.55, 0.78, 1][i],
            }}
          />
        ))}
        <span className="text-[10px] text-slate-500">More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-800 border border-white/15 rounded-xl px-3 py-2 shadow-xl text-xs"
          style={{ left: tooltip.x - 80, top: tooltip.y - 55 }}
        >
          <p className="font-semibold text-white">{format(tooltip.date, "EEE, d MMM yyyy")}</p>
          <p className="text-slate-400 mt-0.5">
            {tooltip.seconds > 0 ? toDurationLabel(tooltip.seconds) + " studied" : "No study"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Combined All-Subjects Heatmap ────────────────────────────────────────────
function AllSubjectsHeatmap({ sessions, days }: { sessions: StudySession[]; days: Date[] }) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const totalSeconds = sessions.reduce((sum, s) => sum + s.actualSeconds, 0);
  const activeDays = new Set(sessions.filter(s => s.actualSeconds > 0).map(s => format(parseISO(s.startTime), "yyyy-MM-dd"))).size;

  // Current streak
  let streak = 0;
  let cursor = new Date();
  while (secondsForDay(sessions, cursor) > 0) {
    streak++;
    cursor = subDays(cursor, 1);
  }

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            📊 Overall Study Activity
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">{toDurationLabel(totalSeconds)} total · {activeDays} active days</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-amber-400">🔥 {streak}</p>
          <p className="text-[10px] text-slate-500">current streak</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <HeatmapGrid
          days={days}
          sessions={sessions}
          color="#6366f1"
          onHover={setTooltip}
        />
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-800 border border-white/15 rounded-xl px-3 py-2 shadow-xl text-xs"
          style={{ left: tooltip.x - 80, top: tooltip.y - 55 }}
        >
          <p className="font-semibold text-white">{format(tooltip.date, "EEE, d MMM yyyy")}</p>
          <p className="text-slate-400 mt-0.5">
            {tooltip.seconds > 0 ? toDurationLabel(tooltip.seconds) + " studied" : "No study"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Exported Component ──────────────────────────────────────────────────
export function SubjectHeatmap() {
  const subjects = useAppStore((s: AppState) => s.subjects);
  const sessions = useAppStore((s: AppState) => s.sessions);

  // 365 days grid (like GitHub contribution graph)
  const days = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 364);
    // Align to Monday of start week
    const alignedStart = startOfWeek(start, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: alignedStart, end });
  }, []);

  const activeSubjects = useMemo(
    () => subjects.filter(s => sessions.some(sess => sess.subjectId === s.id && sess.actualSeconds > 0)),
    [subjects, sessions]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-0.5">
          🔥 Study Heatmap
          <span className="text-xs font-normal text-slate-500">(last 365 days)</span>
        </h2>
        <p className="text-slate-400 text-xs">Each square = 1 day. Darker = more hours studied.</p>
      </div>

      {/* Overall heatmap */}
      <AllSubjectsHeatmap sessions={sessions} days={days} />

      {/* Per-subject heatmaps */}
      {activeSubjects.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {activeSubjects.map(subject => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SubjectHeatmapCard subject={subject} sessions={sessions} days={days} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-white/8 rounded-2xl">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-white font-semibold">No activity yet</p>
          <p className="text-slate-400 text-sm mt-1">Start studying to see your heatmap fill up!</p>
        </div>
      )}
    </div>
  );
}
