import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, subDays, startOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  RotateCcw, 
  Trash2, 
  Play, 
  Edit3, 
  Copy, 
  ArrowRight, 
  Sparkles,
  BarChart2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { SessionEditor } from "@/components/session/SessionEditor";
import { useAppStore } from "@/store/useAppStore";
import { formatDate12Hour, formatTimeRange12Hour, toDurationLabel } from "@/utils/time";
import type { StudySession } from "@/types/models";

export function HistoryPage() {
  const sessions = useAppStore((state) => state.sessions) || [];
  const subjects = useAppStore((state) => state.subjects) || [];
  const theme = useAppStore((state) => state.theme);
  const cloneSession = useAppStore((state) => state.cloneSession);
  const moveSessionToNextDay = useAppStore((state) => state.moveSessionToNextDay);
  const startSession = useAppStore((state) => state.startSession);
  const deleteSession = useAppStore((state) => state.deleteSession);

  const [subjectId, setSubjectId] = useState("all");
  const [completion, setCompletion] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "7d" | "month">("all");

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

  const subjectMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((s) => map.set(s.id, s.name.toLowerCase()));
    return map;
  }, [subjects]);

  // Handle Quick Date Presets
  const applyDatePreset = (preset: "all" | "today" | "yesterday" | "7d" | "month") => {
    setDatePreset(preset);
    setVisibleCount(20);
    const today = new Date();
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const todayStr = format(today, "yyyy-MM-dd");
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const yestStr = format(subDays(today, 1), "yyyy-MM-dd");
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === "7d") {
      setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (preset === "month") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
    }
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endMs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

    return sessions
      .filter((session) => {
        const ratio = session.plannedMinutes > 0 ? (session.actualSeconds / 60 / session.plannedMinutes) * 100 : 0;
        if (ratio < completion) return false;
        if (subjectId !== "all" && session.subjectId !== subjectId) return false;

        const sessionDate = new Date(session.startTime).getTime();
        if (startMs !== null && sessionDate < startMs) return false;
        if (endMs !== null && sessionDate > endMs) return false;

        if (query) {
          const notesMatch = (session.notes || "").toLowerCase().includes(query);
          if (notesMatch) return true;
          const tagMatch = Array.isArray(session.tags) && session.tags.some((tag) => (tag || "").toLowerCase().includes(query));
          if (tagMatch) return true;
          const subName = subjectMap.get(session.subjectId);
          if (subName && subName.includes(query)) return true;
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [completion, endDate, searchQuery, sessions, startDate, subjectId, subjectMap]);

  // Aggregate Metrics for Filtered Sessions
  const stats = useMemo(() => {
    const totalActualSec = filtered.reduce((acc, s) => acc + (s.actualSeconds || 0), 0);
    const totalPlannedMin = filtered.reduce((acc, s) => acc + (s.plannedMinutes || 0), 0);
    const completedCount = filtered.filter(s => s.status === "completed").length;
    const avgCompletion = filtered.length > 0 && totalPlannedMin > 0
      ? Math.min(100, Math.round((totalActualSec / 60 / totalPlannedMin) * 100))
      : 0;

    return {
      totalHours: (totalActualSec / 3600).toFixed(1),
      completedCount,
      avgCompletion,
      totalCount: filtered.length
    };
  }, [filtered]);

  const handleQuickClone = async (session: StudySession, days: number) => {
    const targetDate = addDays(new Date(session.startTime), days);
    try {
      await cloneSession(session.id, format(targetDate, "yyyy-MM-dd"));
      showMessage(`📋 Cloned to ${format(targetDate, "MMM d")}`);
    } catch {
      showMessage("❌ Failed to clone");
    }
  };

  const handleClearUnstarted = async () => {
    const unstarted = sessions.filter((s) => (s.actualSeconds || 0) === 0 && s.status !== "in_progress");
    if (unstarted.length === 0) {
      showMessage("ℹ️ No unstarted sessions found");
      return;
    }
    if (window.confirm(`Found ${unstarted.length} unstarted sessions (0 mins studied). Delete all of them to clean up history?`)) {
      for (const s of unstarted) {
        await deleteSession(s.id);
      }
      showMessage(`🧹 Cleared ${unstarted.length} unstarted sessions!`);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">Completed</span>;
      case "in_progress":
        return <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">In Progress</span>;
      case "paused":
        return <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">Paused</span>;
      default:
        return <span className="rounded-full bg-slate-500/20 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-500/30">Planned</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Toast Alert */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900 border border-emerald-500/40 px-5 py-2.5 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & KPI Summary */}
      <Panel className="relative overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900/95 to-cyan-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Study Timeline & Log</p>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Session History</h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Chronological log of every focus session, study block, and milestone. Review, clone, reschedule, or export past sessions.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className="text-xl font-black text-cyan-400">{stats.totalHours} hrs</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Time Logged</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className="text-xl font-black text-emerald-400">{stats.completedCount}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Completed</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className="text-xl font-black text-white">{stats.totalCount}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Total Sessions</p>
            </div>
          </div>
        </div>

        {/* Date Presets Row */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Time Horizon:</span>
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  datePreset === p.id
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSubjectId("all");
                setCompletion(0);
                setDatePreset("all");
                setStartDate("");
                setEndDate("");
                setSearchQuery("");
                setVisibleCount(20);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleClearUnstarted}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-white px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
              title="Clean up 0-minute empty backlog sessions"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear 0m Backlog</span>
            </button>
          </div>
        </div>
      </Panel>

      {/* Filter Control Surface */}
      <Panel className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-center">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search notes, tags, subject titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setVisibleCount(20);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all">📚 All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Min Completion Slider */}
          <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Min completion</span>
              <span className="font-bold text-cyan-300">{completion}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={completion}
              onChange={(e) => {
                setCompletion(Number(e.target.value));
                setVisibleCount(20);
              }}
              className="w-full accent-cyan-400 h-1 mt-1"
            />
          </div>
        </div>

        {/* Date Pickers (Custom range) */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-400 shrink-0">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("all");
                setVisibleCount(20);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-400 shrink-0">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("all");
                setVisibleCount(20);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </Panel>

      {/* Session Stream List */}
      <div className="space-y-3">
        {filtered.slice(0, visibleCount).map((session, i) => {
          const subject = subjects.find((item) => item.id === session.subjectId);
          const pct = session.plannedMinutes > 0 ? (session.actualSeconds / 60 / session.plannedMinutes) * 100 : 0;
          const subjectColor = subject?.color || session.colorTag || "#06b6d4";

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 transition-all hover:border-white/15 hover:bg-slate-900"
              style={{
                borderLeft: `4px solid ${subjectColor}`,
              }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: `${subjectColor}40` }}
                    >
                      📖
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">{subject?.name ?? "Independent Study"}</h3>
                    {getStatusBadge(session.status)}
                    {session.manualEntry && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
                        ✍️ Manual
                      </span>
                    )}
                    {session.seriesId && (
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/20">
                        🔄 Series
                      </span>
                    )}
                  </div>

                  {/* Session Metrics Bar */}
                  <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 md:grid-cols-4 pt-1">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatDate12Hour(session.startTime)}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatTimeRange12Hour(session.startTime, session.endTime)}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Planned:</span>{" "}
                      <span className="font-semibold text-white">{toDurationLabel(session.plannedMinutes)}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Actual:</span>{" "}
                      <span className="font-semibold text-cyan-300">{toDurationLabel(Math.round(session.actualSeconds / 60))}</span>
                      <span className={`ml-1.5 text-[11px] font-bold ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                        ({pct.toFixed(0)}%)
                      </span>
                    </p>
                  </div>

                  {/* Notes & Tags */}
                  {session.notes && (
                    <p className="text-xs text-slate-400 bg-white/[0.02] p-2 rounded-xl border border-white/5 leading-relaxed">
                      💬 {session.notes}
                    </p>
                  )}

                  {Array.isArray(session.tags) && session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {session.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-white/5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Action Button Group */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingSession(session)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => startSession(session.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r ${getThemeGradient()} text-xs font-bold text-white shadow-sm transition-transform active:scale-95`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </button>

                  <button
                    onClick={() => handleMoveNext(session)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-bold text-amber-300 transition-colors"
                    title="Move to Tomorrow"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>+1d</span>
                  </button>

                  <button
                    onClick={() => handleQuickClone(session, 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-xs font-bold text-purple-300 transition-colors"
                    title="Clone session to tomorrow"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Clone</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete session for ${subject?.name || "session"}?`)) {
                        await deleteSession(session.id);
                        showMessage("🗑️ Session deleted");
                      }
                    }}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Load More Button */}
        {filtered.length > visibleCount && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="rounded-xl border border-white/10 bg-slate-900 px-6 py-2.5 text-xs font-bold text-cyan-300 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              Load More Sessions ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="mt-3 text-sm font-bold text-white">No sessions found</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your filters or date range.</p>
          </div>
        )}
      </div>

      <SessionEditor session={editingSession} open={Boolean(editingSession)} onClose={() => setEditingSession(null)} />
    </div>
  );
}
