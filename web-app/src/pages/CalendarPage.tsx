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
  addYears,
  subYears,
  getYear,
  getMonth,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { useAppStore } from "@/store/useAppStore";
import { toDurationLabel, formatTime12Hour } from "@/utils/time";
import { SessionEditor } from "@/components/session/SessionEditor";
import type { StudySession } from "@/types/models";

export function CalendarPage() {
  const sessions = useAppStore((state) => state.sessions);
  const subjects = useAppStore((state) => state.subjects);
  const theme = useAppStore((state) => state.theme);
  const startSession = useAppStore((state) => state.startSession);
  const cloneSession = useAppStore((state) => state.cloneSession);
  const rescheduleSession = useAppStore((state) => state.rescheduleSession);
  const moveSessionToNextDay = useAppStore((state) => state.moveSessionToNextDay);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [draggedSession, setDraggedSession] = useState<StudySession | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

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
    if (actual === 0) return "bg-white/5";
    if (actual < 30) return "bg-emerald-500/20";
    if (actual < 60) return "bg-emerald-500/40";
    if (actual < 120) return "bg-emerald-500/60";
    if (actual < 180) return "bg-emerald-500/80";
    return "bg-emerald-500";
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.name ?? "Unknown";
  };

  const getSubjectColor = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.color ?? "#6366f1";
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Get available years from sessions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = getYear(new Date());
    // Always include current year and surrounding years
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

  // Get month hours for year view
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

  const jumpToYear = (year: number) => {
    setCurrentMonth(new Date(year, getMonth(currentMonth), 1));
  };

  return (
    <div className="space-y-5">
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

      {/* Calendar Header */}
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">📅 Calendar</p>
            <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">
              {viewMode === "month" ? format(currentMonth, "MMMM yyyy") : getYear(currentMonth)}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Click day to view • Drag session to reschedule • View past/future months & years
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* View Mode Toggle */}
            <div className="flex gap-1 rounded-xl bg-white/5 p-1">
              <button
                onClick={() => setViewMode("month")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "month" ? `bg-gradient-to-r ${getThemeGradient()} text-white` : "text-slate-400 hover:text-white"}`}
              >
                📆 Month
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "year" ? `bg-gradient-to-r ${getThemeGradient()} text-white` : "text-slate-400 hover:text-white"}`}
              >
                📅 Year
              </button>
            </div>

            {/* Year Selector */}
            <select
              value={getYear(currentMonth)}
              onChange={(e) => jumpToYear(Number(e.target.value))}
              className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Navigation */}
            <div className="flex gap-2">
              {viewMode === "month" ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentMonth(subYears(currentMonth, 1))}
                    className="rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    ⏪ -1Y
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    ← Prev
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentMonth(new Date())}
                    className={`rounded-xl bg-gradient-to-r ${getThemeGradient()} px-4 py-2 text-sm font-medium text-white shadow-lg`}
                  >
                    Today
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Next →
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentMonth(addYears(currentMonth, 1))}
                    className="rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    +1Y ⏩
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentMonth(subYears(currentMonth, 1))}
                    className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    ← {getYear(currentMonth) - 1}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentMonth(new Date())}
                    className={`rounded-xl bg-gradient-to-r ${getThemeGradient()} px-4 py-2 text-sm font-medium text-white shadow-lg`}
                  >
                    This Year
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentMonth(addYears(currentMonth, 1))}
                    className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {getYear(currentMonth) + 1} →
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {viewMode === "month" ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-xl bg-gradient-to-br ${getThemeGradient()} p-[2px]`}>
              <div className="rounded-xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-white">{toDurationLabel(monthStats.totalMinutes)}</p>
                <p className="text-xs text-slate-400">Studied</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-[2px]">
              <div className="rounded-xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-white">{toDurationLabel(monthStats.plannedMinutes)}</p>
                <p className="text-xs text-slate-400">Planned</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
              <div className="rounded-xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-white">{monthStats.sessionCount}</p>
                <p className="text-xs text-slate-400">Sessions</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 p-[2px]">
              <div className="rounded-xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-white">{monthStats.completionPct}%</p>
                <p className="text-xs text-slate-400">Completion</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className={`rounded-xl bg-gradient-to-br ${getThemeGradient()} p-[2px]`}>
              <div className="rounded-xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-white">{yearStats.totalHours}h</p>
                <p className="text-xs text-slate-400">Total Hours</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-[2px]">
              <div className="rounded-xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-white">{yearStats.sessionCount}</p>
                <p className="text-xs text-slate-400">Sessions</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
              <div className="rounded-xl bg-slate-900/90 p-3 text-center">
                <p className="text-2xl font-bold text-white">{yearStats.daysStudied}</p>
                <p className="text-xs text-slate-400">Days Studied</p>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {viewMode === "year" ? (
        /* Year View - Month Grid */
        <Panel>
          <h3 className="mb-4 text-lg font-semibold text-white">📅 {getYear(currentMonth)} Overview - Click month to view</h3>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {months.map((month, index) => {
              const hours = Math.round(monthHours[index] / 60);
              const isCurrentMonth = index === getMonth(new Date()) && getYear(currentMonth) === getYear(new Date());
              const isPast = new Date(getYear(currentMonth), index, 1) < new Date();
              
              return (
                <motion.button
                  key={month}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => jumpToMonth(index)}
                  className={`relative rounded-2xl p-4 text-center transition-all ${
                    isCurrentMonth 
                      ? `bg-gradient-to-br ${getThemeGradient()} text-white` 
                      : isPast 
                        ? "bg-white/5 text-slate-300 hover:bg-white/10" 
                        : "bg-white/3 text-slate-400 hover:bg-white/8"
                  }`}
                >
                  <p className="text-lg font-bold">{month}</p>
                  <p className={`mt-1 text-2xl font-bold ${hours > 0 ? "text-cyan-400" : "text-slate-500"}`}>
                    {hours > 0 ? `${hours}h` : "-"}
                  </p>
                  <p className="text-xs text-slate-400">{toDurationLabel(monthHours[index])}</p>
                  {isCurrentMonth && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Year Summary */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 p-4">
            <h4 className="font-semibold text-white">📊 {getYear(currentMonth)} Summary</h4>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-cyan-400">{yearStats.totalHours}h</p>
                <p className="text-xs text-slate-400">Total Study Hours</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{yearStats.sessionCount}</p>
                <p className="text-xs text-slate-400">Total Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{yearStats.daysStudied}</p>
                <p className="text-xs text-slate-400">Days Studied</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">
                  {yearStats.daysStudied > 0 ? (yearStats.totalHours / yearStats.daysStudied).toFixed(1) : 0}h
                </p>
                <p className="text-xs text-slate-400">Avg per Study Day</p>
              </div>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Calendar Grid */}
          <Panel className="lg:col-span-2">
            {/* Week days header */}
            <div className="mb-3 grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const stats = getDayStats(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isPast = day < new Date() && !isToday;

                return (
                  <motion.button
                    key={day.toISOString()}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.005 }}
                    onClick={() => setSelectedDate(day)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(day)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative aspect-square rounded-xl p-1 text-left transition-all
                      ${isCurrentMonth ? "text-white" : "text-slate-600"}
                      ${isPast && isCurrentMonth ? "opacity-80" : ""}
                      ${isToday ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900" : ""}
                      ${isSelected ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900" : ""}
                      ${draggedSession ? "hover:ring-2 hover:ring-emerald-400" : ""}
                      ${getIntensityColor(stats.actual)}
                    `}
                  >
                    <span className={`text-sm font-medium ${isToday ? "text-cyan-300" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {stats.count > 0 && (
                      <div className="absolute bottom-1 left-1 right-1 flex gap-0.5">
                        {[...Array(Math.min(5, stats.count))].map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-1 flex-1 rounded-full bg-gradient-to-r ${getThemeGradient()}`}
                          />
                        ))}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span>Intensity:</span>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded bg-white/5" />
                <span>0m</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded bg-emerald-500/20" />
                <span>&lt;30m</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded bg-emerald-500/40" />
                <span>30-60m</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded bg-emerald-500/60" />
                <span>1-2h</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded bg-emerald-500/80" />
                <span>2-3h</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded bg-emerald-500" />
                <span>3h+</span>
              </div>
            </div>
          </Panel>

          {/* Selected Day Sessions */}
          <Panel>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "📆 Select a day"}
              </h3>
              {selectedDate && (
                <p className="mt-1 text-sm text-slate-400">
                  {selectedDateSessions.length} session{selectedDateSessions.length !== 1 ? "s" : ""} • Drag to move
                </p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {selectedDate ? (
                selectedDateSessions.length > 0 ? (
                  <motion.div
                    key="sessions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3 max-h-[500px] overflow-y-auto pretty-scrollbar"
                  >
                    {selectedDateSessions.map((session, i) => {
                      const completion = session.plannedMinutes > 0 
                        ? Math.round((session.actualSeconds / 60 / session.plannedMinutes) * 100)
                        : 0;
                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          draggable
                          onDragStart={() => handleDragStart(session)}
                          className="rounded-xl p-3 text-left transition-all cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-white/20"
                          style={{
                            backgroundColor: `${getSubjectColor(session.subjectId)}15`,
                            borderLeft: `4px solid ${getSubjectColor(session.subjectId)}`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white truncate">{getSubjectName(session.subjectId)}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                ⏰ {formatTime12Hour(session.startTime)} → {formatTime12Hour(session.endTime)}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                session.status === "completed"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : session.status === "in_progress"
                                    ? "bg-cyan-500/20 text-cyan-300"
                                    : session.status === "paused"
                                      ? "bg-yellow-500/20 text-yellow-300"
                                      : "bg-slate-500/20 text-slate-300"
                              }`}
                            >
                              {session.status.replace("_", " ")}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="text-slate-400">
                              📊 {toDurationLabel(session.plannedMinutes)}
                            </span>
                            <span className="text-slate-400">
                              ✅ {toDurationLabel(Math.round(session.actualSeconds / 60))}
                            </span>
                            <span className={`font-medium ${completion >= 80 ? "text-emerald-400" : completion >= 50 ? "text-yellow-400" : "text-slate-400"}`}>
                              {completion}%
                            </span>
                          </div>

                          {/* Quick Actions */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setEditingSession(session)}
                              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                            >
                              ✏️ Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleMoveNext(session)}
                              className="rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30"
                            >
                              ➡️ Tomorrow
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleQuickClone(session, 1)}
                              className="rounded-lg bg-purple-500/20 px-2.5 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/30"
                            >
                              📋 Clone +1d
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => startSession(session.id)}
                              className={`rounded-lg bg-gradient-to-r ${getThemeGradient()} px-2.5 py-1.5 text-xs font-medium text-white`}
                            >
                              ▶️ Start
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl bg-white/5 p-6 text-center"
                  >
                    <p className="text-3xl">📭</p>
                    <p className="mt-2 text-sm text-slate-400">No sessions on this day</p>
                    <p className="mt-1 text-xs text-slate-500">Drag a session here to move it</p>
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="select"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl bg-white/5 p-6 text-center"
                >
                  <p className="text-3xl">👆</p>
                  <p className="mt-2 text-sm text-slate-400">Click on a day to view sessions</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        </div>
      )}

      {/* Session Editor Modal */}
      <SessionEditor session={editingSession} open={!!editingSession} onClose={() => setEditingSession(null)} />
    </div>
  );
}
