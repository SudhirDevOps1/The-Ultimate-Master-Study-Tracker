import { useEffect, useMemo, useState } from "react";
import { isSameDay, format, startOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Panel } from "@/components/common/Panel";
import { LevelSystem } from "@/components/gamification/LevelSystem";
import { WeeklySummary } from "@/components/dashboard/WeeklySummary";
import { BackendActivityPanel } from "@/components/dashboard/BackendActivityPanel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { StudySession } from "@/types/models";
import { useStreak } from "@/hooks/useStreak";
import { toDurationLabel, formatTime12Hour } from "@/utils/time";

// Progress Ring Component
function ProgressRing({ progress, size = 180, strokeWidth = 12, color = "cyan", children }: { progress: number; size?: number; strokeWidth?: number; color?: string; children?: React.ReactNode }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const gradientId = `progressGradient-${color}-${size}-${strokeWidth}`;
  const gradientColors: Record<string, string[]> = {
    cyan: ["#6366f1", "#a855f7", "#22d3ee"],
    emerald: ["#10b981", "#34d399", "#6ee7b7"],
    orange: ["#f97316", "#fb923c", "#fbbf24"],
    purple: ["#a855f7", "#c084fc", "#e879f9"],
  };

  const colors = gradientColors[color] || gradientColors.cyan;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="50%" stopColor={colors[1]} />
            <stop offset="100%" stopColor={colors[2]} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

function formatGoalMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function DashboardPage() {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const dailyGoalHours = useAppStore((state: AppState) => state.dailyGoalHours);
  const weeklyTargetHours = useAppStore((state: AppState) => state.weeklyTargetHours);
  const achievements = useAppStore((state: AppState) => state.achievements);
  const theme = useAppStore((state: AppState) => state.theme);
  const profile = useAppStore((state: AppState) => state.profile);
  const activeWindow = useAppStore((state: AppState) => state.activeWindow);
  const streakData = useStreak();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [liveClock, setLiveClock] = useState(() => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const today = useMemo(() => sessions.filter((session: StudySession) => isSameDay(new Date(session.startTime), new Date())), [sessions]);

  const activeSubjectObj = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);

  const dailyGoalMinutes = useMemo(() => {
    if (selectedSubjectId === "all") return dailyGoalHours * 60;
    if (activeSubjectObj?.weeklyGoalMinutes) return Math.round(activeSubjectObj.weeklyGoalMinutes / 7);
    return Math.round((dailyGoalHours * 60) / Math.max(1, subjects.length));
  }, [selectedSubjectId, activeSubjectObj, dailyGoalHours, subjects.length]);

  const weeklyGoalMinutes = useMemo(() => {
    if (selectedSubjectId === "all") return weeklyTargetHours * 60;
    if (activeSubjectObj?.weeklyGoalMinutes) return activeSubjectObj.weeklyGoalMinutes;
    return Math.round((weeklyTargetHours * 60) / Math.max(1, subjects.length));
  }, [selectedSubjectId, activeSubjectObj, weeklyTargetHours, subjects.length]);

  const monthlyGoalHours = useMemo(() => {
    const globalMonthly = Math.round(weeklyTargetHours * 4);
    if (selectedSubjectId === "all") return globalMonthly;
    if (activeSubjectObj?.weeklyGoalMinutes) return Math.round((activeSubjectObj.weeklyGoalMinutes * 4) / 60);
    return Math.round(globalMonthly / Math.max(1, subjects.length));
  }, [selectedSubjectId, activeSubjectObj, subjects.length, weeklyTargetHours]);

  const currentMonthHours = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    return sessions
      .filter((s) => (selectedSubjectId === "all" || s.subjectId === selectedSubjectId) && isWithinInterval(new Date(s.startTime), { start: currentMonthStart, end: currentMonthEnd }))
      .reduce((sum, s) => sum + s.actualSeconds / 3600, 0);
  }, [sessions, selectedSubjectId]);

  const actualTodayMinutes = Math.round(today.filter(s => selectedSubjectId === "all" || s.subjectId === selectedSubjectId).reduce((sum, session) => sum + session.actualSeconds, 0) / 60);
  const dailyGoalProgress = Math.min(100, (actualTodayMinutes / Math.max(1, dailyGoalMinutes)) * 100);

  // Weekly progress
  const thisWeekSessions = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return sessions.filter((s: StudySession) => new Date(s.startTime) >= start);
  }, [sessions]);
  const weeklyActualMinutes = Math.round(thisWeekSessions.filter(s => selectedSubjectId === "all" || s.subjectId === selectedSubjectId).reduce((sum, s) => sum + s.actualSeconds, 0) / 60);
  const weeklyProgress = Math.min(100, (weeklyActualMinutes / Math.max(1, weeklyGoalMinutes)) * 100);

  // Monthly progress
  const monthlyProgress = Math.min(100, (currentMonthHours / Math.max(1, monthlyGoalHours)) * 100); 

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt).length;
  const totalHours = Math.round(sessions.reduce((sum, s) => sum + s.actualSeconds, 0) / 3600);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s: StudySession) => s.status === "planned" && new Date(s.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  }, [sessions]);



  const getSubject = (subjectId: string) => subjects.find((s) => s.id === subjectId);

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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
    else if (hour >= 17 && hour < 22) timeGreeting = "Good evening";
    else if (hour >= 22 || hour < 5) timeGreeting = "Working late? Good night";

    if (profile && profile.name) {
      const goalMsg = profile.goal ? ` Ready to work towards your goal of "${profile.goal}"?` : "";
      return `${timeGreeting}, ${profile.name}!${goalMsg}`;
    }
    return `${timeGreeting}! Ready to crush your goals today?`;
  }, [profile]);

  const subjectBalanceReport = useMemo(() => {
    if (subjects.length <= 1) return null;

    const thisWeekSubjectSeconds = subjects.map(sub => {
      const seconds = thisWeekSessions
        .filter(s => s.subjectId === sub.id)
        .reduce((sum, s) => sum + s.actualSeconds, 0);
      return {
        id: sub.id,
        name: sub.name,
        emoji: sub.emoji || "📚",
        color: sub.color,
        seconds
      };
    });

    const totalSeconds = thisWeekSubjectSeconds.reduce((sum, s) => sum + s.seconds, 0);
    if (totalSeconds < 1800) return null;

    const sorted = [...thisWeekSubjectSeconds].sort((a, b) => b.seconds - a.seconds);
    const favorite = sorted[0];
    const favoritePct = (favorite.seconds / totalSeconds) * 100;

    const neglected = sorted.filter(s => s.id !== favorite.id && (s.seconds < 600 || (favorite.seconds > 0 && (s.seconds / favorite.seconds) < 0.15)));

    if (favoritePct > 55 && neglected.length > 0) {
      return {
        favorite,
        favoritePct: Math.round(favoritePct),
        neglected: neglected.map(n => `${n.emoji} ${n.name}`),
        neglectedCount: neglected.length
      };
    }
    return null;
  }, [thisWeekSessions, subjects]);

  return (
    <div className="space-y-6 pb-12">
      {/* Weekly Summary Card */}
      <WeeklySummary sessions={sessions} subjects={subjects} theme={theme} />

      {/* Backend Activity Tracker Panel */}
      <BackendActivityPanel />

      {/* Subject Filter & Optional Local activity tracker indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-300">📊 Filter Dashboard:</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-xl border border-white/15 bg-slate-950 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="all">📁 All Subjects Combined</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.emoji || "📚"} {sub.name}
              </option>
            ))}
          </select>
        </div>

        {activeWindow && activeWindow !== "win32gui not installed" && (
          <div className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 px-3 py-1.5 text-xs text-cyan-300 font-semibold">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Active: {activeWindow.length > 28 ? `${activeWindow.slice(0, 28)}...` : activeWindow}</span>
          </div>
        )}
      </div>

      {/* Hero Section with Progress Rings */}
      <Panel>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 xl:flex-row xl:items-center">
          {/* Progress Rings */}
          <div className="flex flex-wrap justify-center gap-6 xl:justify-start">
            <div className="text-center">
              <ProgressRing progress={dailyGoalProgress} size={140} strokeWidth={10} color="cyan">
                <p className="text-2xl font-bold text-white">{Math.round(dailyGoalProgress)}%</p>
                <p className="text-[10px] uppercase font-bold text-slate-500">Daily</p>
              </ProgressRing>
              <p className="mt-2 text-xs font-semibold text-slate-400">{toDurationLabel(actualTodayMinutes)} / {formatGoalMinutes(dailyGoalMinutes)}</p>
            </div>

            <div className="text-center">
              <ProgressRing progress={weeklyProgress} size={140} strokeWidth={10} color="emerald">
                <p className="text-2xl font-bold text-white">{Math.round(weeklyProgress)}%</p>
                <p className="text-[10px] uppercase font-bold text-slate-500">Weekly</p>
              </ProgressRing>
              <p className="mt-2 text-xs font-semibold text-slate-400">{toDurationLabel(weeklyActualMinutes)} / {formatGoalMinutes(weeklyGoalMinutes)}</p>
            </div>

            <div className="text-center max-md:hidden">
              <ProgressRing progress={monthlyProgress} size={140} strokeWidth={10} color="purple">
                <p className="text-2xl font-bold text-white">{Math.round(monthlyProgress)}%</p>
                <p className="text-[10px] uppercase font-bold text-slate-500">Monthly</p>
              </ProgressRing>
              <p className="mt-2 text-xs font-semibold text-slate-400">{Math.round(currentMonthHours)}h / {monthlyGoalHours}h</p>
            </div>
          </div>

          {/* Core Info */}
          <div className="flex-1 space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase font-bold tracking-[0.2em] text-cyan-400/80">📅 {format(new Date(), "EEEE, MMMM d")}</p>
                <p className="text-sm font-mono font-bold text-cyan-300/90 tabular-nums">{liveClock}</p>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl leading-tight">
                {greeting}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {actualTodayMinutes > 0 
                  ? `You've completed ${toDurationLabel(actualTodayMinutes)} of focus study today!` 
                  : "Time to lock in and focus."}
              </p>
            </div>

            {subjectBalanceReport && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 shadow-md"
              >
                <div className="flex gap-2.5 items-start">
                  <span className="text-base">⚖️</span>
                  <div>
                    <p className="font-bold text-white mb-0.5">Study Balance Warning</p>
                    <p className="leading-relaxed">
                      You are spending a high amount of time (<strong>{subjectBalanceReport.favoritePct}%</strong>) on <strong>{subjectBalanceReport.favorite.emoji} {subjectBalanceReport.favorite.name}</strong> this week.
                      Meanwhile, <strong>{subjectBalanceReport.neglected.join(", ")}</strong> {subjectBalanceReport.neglectedCount === 1 ? 'is' : 'are'} being neglected.
                      Try studying a neglected subject today to keep your progress balanced!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Level System */}
            <LevelSystem />

            {/* Daily Focus Score Metric Block */}
            {(() => {
              const studiedHoursWeight = Math.min(40, (actualTodayMinutes / 60) * 10); // up to 4 hrs = 40 pts
              const completionWeight = Math.min(45, dailyGoalProgress * 0.45); // up to 45 pts
              const pauseCount = sessions.filter(s => isSameDay(new Date(s.startTime), new Date()) && s.status === "paused").length;
              const distractionPenalty = Math.min(15, pauseCount * 3); // 3 pts penalty per pause, up to 15 pts
              const focusScore = Math.max(0, Math.round(studiedHoursWeight + completionWeight - distractionPenalty));
              
              let scoreColor = "text-rose-400";
              let scoreText = "Distracted 🥱";
              if (focusScore >= 80) { scoreColor = "text-cyan-400"; scoreText = "Flow State ⚡"; }
              else if (focusScore >= 60) { scoreColor = "text-emerald-400"; scoreText = "Focused 🧠"; }
              else if (focusScore >= 35) { scoreColor = "text-amber-400"; scoreText = "Standard 🕒"; }

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/10 bg-slate-900/30 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      📊 Daily Focus Score <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">Algorithm Metric</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
                      Formula: <strong>Studied Hours Weight (max 40) + Goal Attachment % (max 45) - Inactivity Pauses Penalty (max -15)</strong>. Measures your active focus depth.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <div className="text-right">
                      <p className={`text-2xl font-black ${scoreColor}`}>{focusScore}/100</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400/80">{scoreText}</p>
                    </div>
                    <div className="h-10 w-1 bg-white/10 rounded-full" />
                    <div className="flex flex-col text-[10px] text-slate-500 font-semibold font-mono">
                      <span>Time Pts: +{Math.round(studiedHoursWeight)}</span>
                      <span>Goal Pts: +{Math.round(completionWeight)}</span>
                      <span>Pause Penalty: -{distractionPenalty}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Today", value: toDurationLabel(actualTodayMinutes), grad: getThemeGradient() },
                { label: "Streak", value: `${streakData.daily}d`, grad: "from-emerald-500 to-teal-500" },
                { label: "All Time", value: `${totalHours}h`, grad: "from-purple-500 to-pink-500" },
                { label: "Badges", value: unlockedAchievements, grad: "from-amber-500 to-orange-500" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={`rounded-2xl bg-gradient-to-br ${stat.grad} p-[1px] shadow-lg`}
                >
                  <div className="rounded-2xl bg-slate-900/40 p-3 text-center backdrop-blur-sm">
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400/80">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </Panel>

      {/* ===== TODAY'S PLAN - Shows today's active sessions to complete ===== */}
      {(() => {
        const now = new Date();
        const todayStr = format(now, "yyyy-MM-dd");
        
        // Get today's sessions (planned, in_progress, paused, completed)
        const todaySessions = sessions.filter((s: StudySession) => {
          const sessionDate = format(new Date(s.startTime), "yyyy-MM-dd");
          return sessionDate === todayStr;
        });
        
        // Active tasks = planned + in_progress + paused for today
        const activeTasks = todaySessions.filter(
          (s: StudySession) => s.status === "planned" || s.status === "in_progress" || s.status === "paused"
        );
        
        // Completed today
        const completedToday = todaySessions.filter((s: StudySession) => s.status === "completed");
        
        // Overdue from previous days (planned sessions from past dates)
        const overdueSessions = sessions.filter((s: StudySession) => {
          const sessionDate = format(new Date(s.startTime), "yyyy-MM-dd");
          return sessionDate < todayStr && s.status === "planned";
        }).slice(0, 5);
        
        // Daily recurring sessions (sessions with recurrence type 'daily')
        const recurringDaily = sessions.filter((s: StudySession) => {
          if (!s.recurrence || s.recurrence.type !== "daily") return false;
          const sessionDate = format(new Date(s.startTime), "yyyy-MM-dd");
          return sessionDate !== todayStr && s.status === "planned";
        }).slice(0, 3);
        
        // Combine all tasks for today
        const allTodayTasks = [...activeTasks, ...recurringDaily];
        
        // Total planned time for today (in minutes)
        const totalPlannedMinutes = allTodayTasks.reduce((sum, s) => sum + (s.plannedMinutes || 0), 0);
        const totalCompletedMinutes = completedToday.reduce((sum, s) => sum + Math.round(s.actualSeconds / 60), 0);
        const planProgress = totalPlannedMinutes > 0 ? Math.min(100, (totalCompletedMinutes / totalPlannedMinutes) * 100) : 0;
        
        if (allTodayTasks.length === 0 && completedToday.length === 0 && overdueSessions.length === 0) return null;
        
        return (
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30">
                  <span className="text-xl">📋</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Today's Plan</h3>
                  <p className="text-xs text-slate-400">
                    {completedToday.length} completed • {activeTasks.length} remaining
                    {overdueSessions.length > 0 && <span className="text-amber-400 ml-1">• {overdueSessions.length} overdue</span>}
                  </p>
                </div>
              </div>
              <Link to="/today" className="text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors">View All →</Link>
            </div>

            {/* Planned vs Actual Progress */}
            {totalPlannedMinutes > 0 && (
              <div className="mb-4 rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">Planned Time Progress</span>
                  <span className="text-xs font-bold text-cyan-400">{formatGoalMinutes(totalCompletedMinutes)} / {formatGoalMinutes(totalPlannedMinutes)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${planProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{Math.round(planProgress)}% of today's planned study completed</p>
              </div>
            )}

            {/* Overdue Warning */}
            {overdueSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3"
              >
                <p className="text-xs font-bold text-rose-300 mb-1">⚠️ Overdue Sessions</p>
                <div className="flex flex-wrap gap-2">
                  {overdueSessions.map(s => {
                    const sub = getSubject(s.subjectId);
                    return (
                      <Link
                        key={s.id}
                        to="/timer"
                        className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/20 transition-colors"
                      >
                        <span>{sub?.emoji || "📚"}</span>
                        <span className="font-medium">{sub?.name || "Unknown"}</span>
                        <span className="text-rose-400/70">{toDurationLabel(s.plannedMinutes)}</span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Active Tasks Grid */}
            <div className="grid gap-2 sm:grid-cols-2">
              {allTodayTasks.map((session, i) => {
                const sub = getSubject(session.subjectId);
                const statusColors: Record<string, string> = {
                  planned: "border-slate-500/30 bg-slate-500/5",
                  in_progress: "border-cyan-500/30 bg-cyan-500/10",
                  paused: "border-amber-500/30 bg-amber-500/10",
                };
                const statusIcons: Record<string, string> = {
                  planned: "⏳",
                  in_progress: "▶️",
                  paused: "⏸️",
                };
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={`/timer#${session.id}`}
                      className={`flex items-center gap-3 rounded-xl border ${statusColors[session.status] || statusColors.planned} p-3 hover:bg-white/10 transition-all group`}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: `${sub?.color || "#6366f1"}15`, border: `1px solid ${sub?.color || "#6366f1"}30` }}
                      >
                        {sub?.emoji || "📚"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-white">{sub?.name || "Deleted Subject"}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatTime12Hour(session.startTime)} • {toDurationLabel(session.plannedMinutes)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm">{statusIcons[session.status] || "⏳"}</span>
                        <p className="text-[10px] font-semibold text-slate-400 capitalize">{session.status.replace("_", " ")}</p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
              
              {/* Completed Today */}
              {completedToday.slice(0, 4).map((session, i) => {
                const sub = getSubject(session.subjectId);
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (allTodayTasks.length + i) * 0.04 }}
                    className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 opacity-70"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                      style={{ backgroundColor: `${sub?.color || "#10b981"}15` }}
                    >
                      ✅
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white/70 line-through">{sub?.name || "Deleted Subject"}</p>
                      <p className="text-[10px] text-slate-500">{toDurationLabel(Math.round(session.actualSeconds / 60))} studied</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Panel>
        );
      })()}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Upcoming */}
        <Panel className="lg:col-span-1">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">📅 Upcoming</h3>
            <Link to="/timer" className="text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors">Schedule →</Link>
          </div>
          {upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {upcomingSessions.map((session, i) => {
                const sub = getSubject(session.subjectId);
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition-all"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xl shadow-inner group-hover:scale-110 transition-transform">
                      {sub?.emoji || "📚"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-white">{sub?.name || "Deleted Subject"}</p>
                      <p className="text-[10px] text-slate-400">{formatTime12Hour(session.startTime)} • {format(new Date(session.startTime), "MMM d")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-cyan-400">{toDurationLabel(session.plannedMinutes)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
              <p className="text-2xl mb-2">✨</p>
              <p className="text-sm text-slate-400">Clear for now!</p>
            </div>
          )}
        </Panel>

        {/* Subjects Overview */}
        <Panel className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">📚 Subject Progress (Weekly)</h3>
            <Link to="/subjects" className="text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors">Manage →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {subjects.map((subject) => {
              const weeklySubjectSeconds = thisWeekSessions
                .filter((s: StudySession) => s.subjectId === subject.id)
                .reduce((sum, s) => sum + s.actualSeconds, 0);
              const weeklyHours = (weeklySubjectSeconds / 3600).toFixed(1);
              const goalHours = (subject.weeklyGoalMinutes || 0) / 60;
              const progress = goalHours > 0 ? Math.min(100, (parseFloat(weeklyHours) / goalHours) * 100) : 0;

              return (
                <div 
                  key={subject.id} 
                  className="relative group rounded-2xl border border-white/5 bg-slate-900/30 p-4 transition-all hover:bg-slate-900/50"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-inner"
                      style={{ backgroundColor: `${subject.color}15`, border: `1px solid ${subject.color}30` }}
                    >
                      {subject.emoji || "📚"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-bold text-white">{subject.name}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{weeklyHours}h {goalHours > 0 ? `/ ${goalHours}h goal` : 'total'}</span>
                        {goalHours > 0 && <span>{Math.round(progress)}%</span>}
                      </div>
                      {goalHours > 0 && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div 
                            className="h-full rounded-full"
                            style={{ backgroundColor: subject.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Heatmap Section */}
      <Panel>
        <div className="mb-5">
          <h3 className="text-xl font-bold text-white">🔥 Focus Heatmap</h3>
          <p className="text-sm text-slate-400">Consistency is the key to mastery. Track your daily flow.</p>
        </div>
        <div className="pretty-scrollbar overflow-x-auto pb-4">
          <div className="flex gap-1.5 min-w-max">
            {streakData.heatmap.map((item, i) => (
              <motion.div
                key={item.day}
                title={`${format(new Date(item.day), "MMM d")}: ${toDurationLabel(item.minutes)}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.003 }}
                whileHover={{ scale: 1.3, zIndex: 10 }}
                className="h-4 w-4 rounded-sm"
                style={{
                  backgroundColor: item.minutes === 0 
                    ? "rgba(255,255,255,0.05)" 
                    : `rgba(34, 211, 238, ${Math.max(0.2, Math.min(1, item.minutes / 180))})`,
                  boxShadow: item.minutes > 0 ? '0 0 8px rgba(34, 211, 238, 0.2)' : 'none'
                }}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
             <span>Less</span>
             <div className="flex gap-1">
               {[0.05, 0.25, 0.5, 0.75, 1].map((o, i) => (
                 <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(34, 211, 238, ${o})` }} />
               ))}
             </div>
             <span>More</span>
          </div>
          <p className="text-xs text-slate-400">Showing last 90 days activity</p>
        </div>
      </Panel>
    </div>
  );
}
