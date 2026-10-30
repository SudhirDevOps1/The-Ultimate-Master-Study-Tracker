import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  getYear,
  getMonth,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Play, 
  Edit3, 
  Copy, 
  ArrowRight, 
  BarChart2, 
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore } from "@/store/useAppStore";
import { toDurationLabel, formatTime12Hour } from "@/utils/time";
import { SessionEditor } from "@/components/session/SessionEditor";
import type { StudySession } from "@/types/models";

export function CalendarPage() {
  const sessions = useAppStore((state) => state.sessions) || [];
  const subjects = useAppStore((state) => state.subjects) || [];
  const theme = useAppStore((state) => state.theme);
  const startSession = useAppStore((state) => state.startSession);
  const cloneSession = useAppStore((state) => state.cloneSession);
  const rescheduleSession = useAppStore((state) => state.rescheduleSession);
  const moveSessionToNextDay = useAppStore((state) => state.moveSessionToNextDay);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [draggedSession, setDraggedSession] = useState<StudySession | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "year">("month");

  // Computed week days for week view
  const currentWeekDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  }, [weekStart]);

  // Stats for week view
  const weekStats = useMemo(() => {
    const weekEnd = addDays(weekStart, 6);
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const weekSessions = safeSessions.filter(s => {
      const d = new Date(s.startTime);
      return d >= weekStart && d <= weekEnd;
    });
    const totalMinutes = Math.round(weekSessions.reduce((sum, s) => sum + (s.actualSeconds || 0), 0) / 60);
    const completedCount = weekSessions.filter(s => s.status === "completed").length;
    const plannedCount = weekSessions.length;
    return { totalMinutes, completedCount, plannedCount };
  }, [weekStart, sessions]);

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

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    sessions.forEach((session) => {
      const dateKey = format(new Date(session.startTime), "yyyy-MM-dd");
      const existing = map.get(dateKey) ?? [];
      existing.push(session);
      map.set(dateKey, existing);
    });
    return map;
  }, [sessions]);

  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return sessionsByDate.get(dateKey) ?? [];
  }, [selectedDate, sessionsByDate]);

  const getDayStats = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const daySessions = sessionsByDate.get(dateKey) ?? [];
    const planned = daySessions.reduce((sum, s) => sum + s.plannedMinutes, 0);
    const actual = Math.round(daySessions.reduce((sum, s) => sum + s.actualSeconds, 0) / 60);
    return { planned, actual, count: daySessions.length };
  };

  const getIntensityColor = (actual: number) => {
    if (actual === 0) return "bg-white/[0.02] border-white/5";
    if (actual < 30) return "bg-emerald-500/15 border-emerald-500/20";
    if (actual < 60) return "bg-emerald-500/30 border-emerald-500/30";
    if (actual < 120) return "bg-emerald-500/45 border-emerald-500/40";
    if (actual < 180) return "bg-emerald-500/60 border-emerald-500/50 text-white font-bold";
    return "bg-emerald-500/80 border-emerald-400 text-white font-black";
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.name ?? "Independent Study";
  };

  const getSubjectColor = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.color ?? "#06b6d4";
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Available years from sessions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = getYear(new Date());
    years.add(currentYear - 2);
    years.add(currentYear - 1);
    years.add(currentYear);
    years.add(currentYear + 1);
    
    sessions.forEach((s) => {
      years.add(getYear(new Date(s.startTime)));
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [sessions]);

  // Month stats
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthSessions = sessions.filter((s) => {
      const date = new Date(s.startTime);
      return date >= monthStart && date <= monthEnd;
    });
    const totalMinutes = Math.round(monthSessions.reduce((sum, s) => sum + s.actualSeconds, 0) / 60);
    const plannedMinutes = monthSessions.reduce((sum, s) => sum + s.plannedMinutes, 0);
    const sessionCount = monthSessions.length;
    const avgPerDay = Math.round(totalMinutes / 30);
    const completionPct = plannedMinutes > 0 ? Math.round((totalMinutes / plannedMinutes) * 100) : 0;
    return { totalMinutes, plannedMinutes, sessionCount, avgPerDay, completionPct };
  }, [currentMonth, sessions]);

  // Year stats
  const yearStats = useMemo(() => {
    const year = getYear(currentMonth);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    const yearSessions = sessions.filter((s) => {
      const date = new Date(s.startTime);
      return date >= yearStart && date <= yearEnd;
    });
    const totalHours = Math.round(yearSessions.reduce((sum, s) => sum + s.actualSeconds, 0) / 3600);
    const sessionCount = yearSessions.length;
    const daysStudied = new Set(yearSessions.map(s => format(new Date(s.startTime), "yyyy-MM-dd"))).size;
    return { totalHours, sessionCount, daysStudied };
  }, [currentMonth, sessions]);

  // Month hours for year view
  const monthHours = useMemo(() => {
    const year = getYear(currentMonth);
    return months.map((_, monthIndex) => {
      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);
      const monthSessions = sessions.filter((s) => {
        const date = new Date(s.startTime);
        return date >= monthStart && date <= monthEnd;
      });
      return Math.round(monthSessions.reduce((sum, s) => sum + s.actualSeconds, 0) / 60);
    });
  }, [currentMonth, sessions, months]);

  const handleDragStart = (session: StudySession) => {
    setDraggedSession(session);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetDate: Date) => {
    if (!draggedSession) return;
    const targetDateStr = format(targetDate, "yyyy-MM-dd");
    try {
      await rescheduleSession(draggedSession.id, targetDateStr);
      showMessage(`📅 Moved to ${format(targetDate, "MMM d, yyyy")}`);
    } catch {
      showMessage("❌ Failed to move session");
    }
    setDraggedSession(null);
  };

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
      showMessage(`➡️ Moved to tomorrow`);
    } catch {
      showMessage("❌ Failed to move");
    }
  };

  const jumpToMonth = (monthIndex: number) => {
    const year = getYear(currentMonth);
    setCurrentMonth(new Date(year, monthIndex, 1));
    setViewMode("month");
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

      {/* Top Banner Toolbar */}
      <Panel className="relative overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900/95 to-cyan-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Schedule & Calendar</p>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              {viewMode === "month"
                ? format(currentMonth, "MMMM yyyy")
                : viewMode === "week"
                ? `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
                : `${getYear(currentMonth)} Annual Matrix`}
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Visual study time mapping with drag-and-drop rescheduling. Switch between Week, Month, and Year matrices.
            </p>
          </div>

          {/* Controls: Mode Switch & Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-white/10">
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "month" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "week" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "year" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Year
              </button>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-white/10">
              {viewMode === "month" && (
                <>
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {viewMode === "week" && (
                <>
                  <button
                    onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
                      setCurrentMonth(new Date());
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white transition-colors"
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Next Week"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {viewMode === "year" && (
                <>
                  <button
                    onClick={() => setCurrentMonth(subYears(currentMonth, 1))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Previous Year"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white transition-colors"
                  >
                    This Year
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addYears(currentMonth, 1))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Next Year"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Micro KPI Bar based on active view */}
        {viewMode === "month" && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-white/5">
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Month Studied</p>
              <p className="text-xl font-bold text-cyan-400 mt-0.5">{toDurationLabel(monthStats.totalMinutes)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Total Sessions</p>
              <p className="text-xl font-bold text-white mt-0.5">{monthStats.sessionCount}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Goal Completion</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{monthStats.completionPct}%</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Daily Average</p>
              <p className="text-xl font-bold text-yellow-400 mt-0.5">{toDurationLabel(monthStats.avgPerDay)}</p>
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="mt-6 grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Week Studied</p>
              <p className="text-xl font-bold text-cyan-400 mt-0.5">{toDurationLabel(weekStats.totalMinutes)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Completed Sessions</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{weekStats.completedCount}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Planned Sessions</p>
              <p className="text-xl font-bold text-white mt-0.5">{weekStats.plannedCount}</p>
            </div>
          </div>
        )}

        {viewMode === "year" && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-white/5">
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Year Study Time</p>
              <p className="text-xl font-bold text-cyan-400 mt-0.5">{yearStats.totalHours} hrs</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Days Studied</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{yearStats.daysStudied} days</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Total Sessions</p>
              <p className="text-xl font-bold text-white mt-0.5">{yearStats.sessionCount}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <p className="text-[11px] font-semibold text-slate-400">Avg / Active Day</p>
              <p className="text-xl font-bold text-yellow-400 mt-0.5">
                {yearStats.daysStudied > 0 ? (yearStats.totalHours / yearStats.daysStudied).toFixed(1) : 0} hrs
              </p>
            </div>
          </div>
        )}
      </Panel>

      {/* Week View */}
      {viewMode === "week" && (
        <Panel className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>7-Day Focused Week View</span>
            </h3>
            <span className="text-xs text-slate-400">Drag sessions across days to reschedule</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
            {currentWeekDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const daySessions = sessionsByDate.get(dateKey) ?? [];
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const totalMins = Math.round(daySessions.reduce((s, x) => s + (x.actualSeconds || 0), 0) / 60);

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(day)}
                  className={`rounded-2xl p-3 border min-h-[140px] cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                      : isToday
                      ? "border-white/20 bg-slate-900/90"
                      : "border-white/5 bg-slate-950/60 hover:bg-slate-900/50 hover:border-white/10"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{format(day, "EEE")}</span>
                      <span className={`text-base font-black ${isToday ? "text-cyan-400" : "text-white"}`}>{format(day, "d")}</span>
                    </div>

                    {totalMins > 0 && (
                      <p className="text-[10px] font-bold text-cyan-300 mt-0.5">{toDurationLabel(totalMins)}</p>
                    )}

                    <div className="mt-2.5 space-y-1.5">
                      {daySessions.slice(0, 3).map((s) => {
                        const sub = subjects.find((x) => x.id === s.subjectId);
                        const color = sub?.color || "#06b6d4";
                        return (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={() => handleDragStart(s)}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold text-white truncate cursor-grab active:cursor-grabbing shadow-sm"
                            style={{
                              backgroundColor: `${color}25`,
                              borderLeft: `3px solid ${color}`,
                            }}
                          >
                            {sub?.name ?? "Study Session"}
                          </div>
                        );
                      })}
                      {daySessions.length > 3 && (
                        <p className="text-[9px] text-slate-500 font-semibold">+{daySessions.length - 3} more</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Year View */}
      {viewMode === "year" && (
        <Panel className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">Annual Consistency Matrix — Click any month to drill down</h3>
            <span className="text-xs text-slate-400">Year {getYear(currentMonth)}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {months.map((month, index) => {
              const hours = Math.round(monthHours[index] / 60);
              const isCurrentMonth = index === getMonth(new Date()) && getYear(currentMonth) === getYear(new Date());

              return (
                <button
                  key={month}
                  onClick={() => jumpToMonth(index)}
                  className={`rounded-2xl p-4 text-center border transition-all hover:scale-105 active:scale-95 ${
                    isCurrentMonth
                      ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 text-white"
                      : hours > 0
                      ? "border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-200"
                      : "border-white/5 bg-slate-950/40 hover:bg-slate-900/40 text-slate-400"
                  }`}
                >
                  <p className="text-sm font-bold">{month}</p>
                  <p className={`mt-2 text-2xl font-black ${hours > 0 ? "text-cyan-400" : "text-slate-600"}`}>
                    {hours > 0 ? `${hours}h` : "—"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">{toDurationLabel(monthHours[index])}</p>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Month View & Selected Day Inspector */}
      {viewMode === "month" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <Panel className="lg:col-span-2 space-y-3">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 pb-1 border-b border-white/5">
              {weekDays.map((day) => (
                <div key={day} className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days matrix */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, i) => {
                const dayStats = getDayStats(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(day)}
                    className={`
                      relative aspect-square rounded-2xl p-2 text-left transition-all border
                      ${isCurrentMonth ? "text-white" : "text-slate-600 opacity-40"}
                      ${isToday ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 font-bold" : ""}
                      ${isSelected ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950" : ""}
                      ${getIntensityColor(dayStats.actual)}
                      hover:scale-105 active:scale-95
                    `}
                  >
                    <span className={`text-xs font-bold ${isToday ? "text-cyan-300" : ""}`}>
                      {format(day, "d")}
                    </span>

                    {/* Dot indicators */}
                    {dayStats.count > 0 && (
                      <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                        {[...Array(Math.min(4, dayStats.count))].map((_, idx) => (
                          <div
                            key={idx}
                            className="h-1 flex-1 rounded-full bg-cyan-400 shadow-sm"
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Intensity Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-white/5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Study Heatmap:</span>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-white/[0.02] border border-white/5" />
                <span>0m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/25" />
                <span>&lt;30m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-emerald-500/40 border border-emerald-500/40" />
                <span>30-60m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-emerald-500/60 border border-emerald-500/60" />
                <span>1-2h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-emerald-500/80 border border-emerald-400" />
                <span>2h+</span>
              </div>
            </div>
          </Panel>

          {/* Selected Day Inspector Panel */}
          <Panel className="space-y-4">
            <div className="pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a day"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedDateSessions.length} {selectedDateSessions.length === 1 ? "session" : "sessions"} recorded
              </p>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 pretty-scrollbar">
              {selectedDateSessions.length > 0 ? (
                selectedDateSessions.map((session) => {
                  const subColor = getSubjectColor(session.subjectId);
                  const subName = getSubjectName(session.subjectId);
                  const completion = session.plannedMinutes > 0
                    ? Math.round((session.actualSeconds / 60 / session.plannedMinutes) * 100)
                    : 0;

                  return (
                    <div
                      key={session.id}
                      draggable
                      onDragStart={() => handleDragStart(session)}
                      className="rounded-2xl p-3.5 border border-white/5 bg-slate-950/70 space-y-2.5 transition-all hover:border-white/15 cursor-grab active:cursor-grabbing"
                      style={{
                        borderLeft: `4px solid ${subColor}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{subName}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{formatTime12Hour(session.startTime)} → {formatTime12Hour(session.endTime)}</span>
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          session.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}>
                          {session.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Actual: <strong className="text-cyan-300">{toDurationLabel(Math.round(session.actualSeconds / 60))}</strong></span>
                        <span>Planned: <strong className="text-slate-200">{toDurationLabel(session.plannedMinutes)}</strong></span>
                        <span className="font-bold text-emerald-400">{completion}%</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                        <button
                          onClick={() => setEditingSession(session)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleMoveNext(session)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[10px] font-bold text-amber-300 transition-colors"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>+1d</span>
                        </button>
                        <button
                          onClick={() => handleQuickClone(session, 1)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-[10px] font-bold text-purple-300 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Clone</span>
                        </button>
                        <button
                          onClick={() => startSession(session.id)}
                          className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r ${getThemeGradient()} text-[10px] font-bold text-white shadow-sm`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-8 text-center space-y-1">
                  <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-white">No sessions recorded</p>
                  <p className="text-[11px] text-slate-400">Drag a session here or click start to log focus.</p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Session Editor Modal */}
      <SessionEditor session={editingSession} open={!!editingSession} onClose={() => setEditingSession(null)} />
    </div>
  );
}
