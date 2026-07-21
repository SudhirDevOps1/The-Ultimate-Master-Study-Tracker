import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { Panel } from "@/components/common/Panel";
import { SessionEditor } from "@/components/session/SessionEditor";
import { useAppStore } from "@/store/useAppStore";
import { formatDate12Hour, formatTimeRange12Hour, toDurationLabel } from "@/utils/time";
import type { StudySession } from "@/types/models";

export function HistoryPage() {
  const sessions = useAppStore((state) => state.sessions);
  const subjects = useAppStore((state) => state.subjects);
  const theme = useAppStore((state) => state.theme);
  const cloneSession = useAppStore((state) => state.cloneSession);
  const moveSessionToNextDay = useAppStore((state) => state.moveSessionToNextDay);
  const startSession = useAppStore((state) => state.startSession);

  const [subjectId, setSubjectId] = useState("all");
  const [completion, setCompletion] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);

  const showMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 2500);
  };

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

  const filtered = useMemo(
    () =>
      [...sessions]
        .filter((session) => {
          const ratio = session.plannedMinutes > 0 ? (session.actualSeconds / 60 / session.plannedMinutes) * 100 : 0;
          const bySubject = subjectId === "all" || session.subjectId === subjectId;
          const sessionDate = new Date(session.startTime).getTime();
          const byStart = startDate ? sessionDate >= new Date(`${startDate}T00:00:00`).getTime() : true;
          const byEnd = endDate ? sessionDate <= new Date(`${endDate}T23:59:59`).getTime() : true;
          const bySearch = !searchQuery || 
            session.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
            subjects.find(s => s.id === session.subjectId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
          return bySubject && ratio >= completion && byStart && byEnd && bySearch;
        })
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [completion, endDate, searchQuery, sessions, startDate, subjectId, subjects]
  );

  const handleQuickClone = async (session: StudySession, days: number) => {
    const targetDate = addDays(new Date(session.startTime), days);
    try {
      await cloneSession(session.id, format(targetDate, "yyyy-MM-dd"));
      showMessage(`📋 Cloned to ${format(targetDate, "MMM d")}`);
    } catch {
      showMessage("❌ Failed to clone");
    }
  };

  const handleMoveNext = async (session: StudySession) => {
    try {
      await moveSessionToNextDay(session.id);
      const nextDay = addDays(new Date(session.startTime), 1);
      showMessage(`➡️ Moved to ${format(nextDay, "MMM d")}`);
    } catch {
      showMessage("❌ Failed to move");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "in_progress": return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "paused": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      default: return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <>
      {/* Action Message */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-emerald-500/90 px-6 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-md"
          >
            {actionMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <Panel className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">📜 History</p>
            <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Session History</h2>
            <p className="mt-1 text-sm text-slate-400">Review all past sessions • Edit, Clone, or Reschedule any session</p>
          </div>
          <div className={`rounded-2xl bg-gradient-to-r ${getThemeGradient()} p-[2px]`}>
            <div className="rounded-2xl bg-slate-900/90 px-4 py-2 text-sm text-white">
              📊 Showing <span className="font-bold">{filtered.length}</span> sessions
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            placeholder="Search notes, tags, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2 text-sm text-white placeholder-slate-400 focus:border-cyan-400/50 focus:outline-none"
          />
          <select 
            value={subjectId} 
            onChange={(event) => {
              setSubjectId(event.target.value);
              setVisibleCount(15);
            }} 
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="all">📚 All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Min completion</span>
              <span className="font-medium text-cyan-300">{completion}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={completion}
              onChange={(event) => {
                setCompletion(Number(event.target.value));
                setVisibleCount(15);
              }}
              className="mt-2 w-full accent-cyan-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(event) => {
                setStartDate(event.target.value);
                setVisibleCount(15);
              }} 
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(event) => {
                setEndDate(event.target.value);
                setVisibleCount(15);
              }} 
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" 
            />
          </div>
          <button
            onClick={() => {
              setSubjectId("all");
              setCompletion(0);
              setStartDate("");
              setEndDate("");
              setVisibleCount(15);
            }}
            className="rounded-2xl border border-white/15 px-4 py-3 text-sm text-white hover:bg-white/8 transition-colors"
          >
            🔄 Reset Filters
          </button>
        </div>

        {/* Sessions List */}
        <div className="pretty-scrollbar max-h-[42rem] space-y-3 overflow-y-auto pr-1 pb-4">
          {filtered.slice(0, visibleCount).map((session, i) => {
            const subject = subjects.find((item) => item.id === session.subjectId);
            const pct = session.plannedMinutes > 0 ? (session.actualSeconds / 60 / session.plannedMinutes) * 100 : 0;
            return (
              <motion.div 
                key={session.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="rounded-2xl p-4 transition-all hover:bg-white/5"
                style={{ 
                  backgroundColor: `${subject?.color ?? session.colorTag}10`,
                  borderLeft: `4px solid ${subject?.color ?? session.colorTag}`,
                }}
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div 
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                        style={{ backgroundColor: `${subject?.color ?? session.colorTag}30` }}
                      >
                        📖
                      </div>
                      <p className="break-words text-base font-semibold text-white">{subject?.name ?? "Unknown"}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${getStatusColor(session.status)}`}>
                        {session.status.replace("_", " ")}
                      </span>
                      {session.manualEntry && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                          ✍️ Manual
                        </span>
                      )}
                      {session.seriesId && (
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
                          🔄 Recurring
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-3">
                      <p><span className="text-slate-500">📅 Date:</span> {formatDate12Hour(session.startTime)}</p>
                      <p><span className="text-slate-500">⏰ Time:</span> {formatTimeRange12Hour(session.startTime, session.endTime)}</p>
                      <p><span className="text-slate-500">📊 Planned:</span> {toDurationLabel(session.plannedMinutes)}</p>
                      <p>
                        <span className="text-slate-500">✅ Actual:</span> {toDurationLabel(Math.round(session.actualSeconds / 60))}
                      </p>
                      <p>
                        <span className="text-slate-500">📈 Completion:</span>{" "}
                        <span className={`font-medium ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                          {pct.toFixed(1)}%
                        </span>
                      </p>
                    </div>

                    {session.notes && <p className="mt-3 break-words text-sm text-slate-400">💬 {session.notes}</p>}
                    
                    {session.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {session.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                    <div className="flex flex-wrap gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setEditingSession(session)} 
                        className="rounded-xl border border-cyan-400/25 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10"
                      >
                        ✏️ Edit
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startSession(session.id)} 
                        className={`rounded-xl bg-gradient-to-r ${getThemeGradient()} px-3 py-2 text-xs font-medium text-white`}
                      >
                        ▶️ Start
                      </motion.button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMoveNext(session)} 
                        className="rounded-xl bg-amber-500/20 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/30"
                      >
                        ➡️ Tomorrow
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickClone(session, 1)} 
                        className="rounded-xl bg-purple-500/20 px-3 py-2 text-xs text-purple-300 hover:bg-purple-500/30"
                      >
                        📋 Clone +1d
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filtered.length > visibleCount && (
            <div className="flex justify-center pt-4 pb-2">
              <button
                onClick={() => setVisibleCount(prev => prev + 15)}
                className="rounded-2xl bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-white/10 hover:border-cyan-500/30 px-6 py-3 text-sm font-medium text-cyan-200 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                📥 Load More Sessions ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}

          {filtered.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl bg-white/5 p-6 text-center"
            >
              <p className="text-3xl">📭</p>
              <p className="mt-2 text-sm text-slate-300">No sessions match the current filters.</p>
            </motion.div>
          )}
        </div>
      </Panel>

      <SessionEditor session={editingSession} open={Boolean(editingSession)} onClose={() => setEditingSession(null)} />
    </>
  );
}
