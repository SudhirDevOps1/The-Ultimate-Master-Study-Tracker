import { useEffect, useMemo, useState } from "react";
import { isSameDay, format, startOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Flame, UserCheck, Sparkles } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { LevelSystem } from "@/components/gamification/LevelSystem";
import { WeeklySummary } from "@/components/dashboard/WeeklySummary";
import { BackendActivityPanel } from "@/components/dashboard/BackendActivityPanel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { StudySession } from "@/types/models";
import { useStreak } from "@/hooks/useStreak";
import { toDurationLabel, formatTime12Hour } from "@/utils/time";
import { PDFStudyReader } from "@/components/common/PDFStudyReader";
import { GamifiedFocusQuest } from "@/components/goals/GamifiedFocusQuest";
import { WeeklyReviewModal } from "@/components/dashboard/WeeklyReviewModal";
import { PerformanceScorecardModal } from "@/components/dashboard/PerformanceScorecardModal";

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

function DailyContextHeroCard() {
  const profile = useAppStore((state: AppState) => state.profile);
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const weeklyTargetHours = useAppStore((state: AppState) => state.weeklyTargetHours);
  const streakData = useStreak();

  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const todaySessions = useMemo(() => {
    return sessions
      .filter((s) => {
        const sDate = new Date(s.startTime);
        const pad = (n: number) => String(n).padStart(2, "0");
        const sDateStr = `${sDate.getFullYear()}-${pad(sDate.getMonth() + 1)}-${pad(sDate.getDate())}`;
        return sDateStr === todayStr;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessions, todayStr]);

  const quote = profile?.dailyContext || profile?.goldenRule || "🔥 Consistency & Focused Grind lead to top performance. Plan your sessions and track every focus hour!";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/60 via-slate-900/90 to-indigo-950/60 p-6 shadow-2xl backdrop-blur-xl">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 space-y-4">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-xs font-bold text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Daily Context & Target
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-extrabold text-amber-300">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              {streakData.daily || 1}-Day Grind Streak
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Student: <strong className="text-white capitalize">{profile?.name || "Student Focus"}</strong> {profile?.age ? `(${profile.age} yrs)` : ""}</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-300 font-mono">Target: {profile?.goal || `${weeklyTargetHours}h / Week`}</span>
          </div>
        </div>

        {/* Golden Rule Motivation Quote */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Golden Motivation</p>
              <p className="text-base sm:text-lg font-black text-white leading-snug mt-0.5">
                "{quote}"
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Daily Schedule Blocks or Subjects */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1">
          {todaySessions.length > 0 ? (
            todaySessions.slice(0, 6).map((session, i) => {
              const sDate = new Date(session.startTime);
              const eDate = new Date(sDate.getTime() + session.plannedMinutes * 60 * 1000);
              const formatT = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
              const subObj = subjects.find(s => s.id === session.subjectId);
              return (
                <div key={session.id || i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
                  <div className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
                    {formatT(sDate)} - {formatT(eDate)}
                  </div>
                  <p className="text-xs font-semibold truncate text-white">{subObj?.emoji || "📚"} {session.notes || subObj?.name || "Study Session"}</p>
                </div>
              );
            })
          ) : (
            subjects.slice(0, 6).map((sub, i) => (
              <div key={sub.id || i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 text-purple-300">
                <div className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
                  {sub.weeklyGoalMinutes ? `${Math.round(sub.weeklyGoalMinutes / 60)}h/wk` : "Active"}
                </div>
                <p className="text-xs font-semibold truncate text-white">{sub.emoji || "📚"} {sub.name}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
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

  const handleRescheduleAllOverdue = async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const overdue = sessions.filter((s: StudySession) => {
      const sessionDate = format(new Date(s.startTime), "yyyy-MM-dd");
      return sessionDate < todayStr && s.status === "planned";
    });
    if (overdue.length === 0) return;
    const confirmReschedule = window.confirm(`Reschedule all ${overdue.length} overdue tasks to today?`);
    if (!confirmReschedule) return;

    const updateSession = useAppStore.getState().updateSession;
    const initApp = useAppStore.getState().initApp;

    for (const session of overdue) {
      const originalDate = new Date(session.startTime);
      const newDate = new Date();
      newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
      const newEndTime = new Date(session.endTime);
      newEndTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());

      await updateSession({
        ...session,
        startTime: newDate.toISOString(),
        endTime: newEndTime.toISOString()
      });
    }
    await initApp();
  };

  const handleClearAllOverdue = async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const overdue = sessions.filter((s: StudySession) => {
      const sessionDate = format(new Date(s.startTime), "yyyy-MM-dd");
      return sessionDate < todayStr && s.status === "planned";
    });
    if (overdue.length === 0) return;
    const confirmClear = window.confirm(`Permanently delete all ${overdue.length} overdue planned tasks?`);
    if (!confirmClear) return;

    const deleteSession = useAppStore.getState().deleteSession;
    const initApp = useAppStore.getState().initApp;

    for (const session of overdue) {
      await deleteSession(session.id);
    }
    await initApp();
  };

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

      {/* 🚀 Daily Context & Golden Rule Hero Card */}
      <DailyContextHeroCard />

      {/* 🚀 Welcome & Changelog Modal overlay */}
      <WelcomeChangelogModal />

      {/* 📊 Live Activity Tracker & Today App Usage Panel */}
      <LiveAppUsagePanel />

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

      {/* Desktop App Download Promo Banner */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900/60 p-4 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 rounded">
              💻 Native Desktop App Available
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">v7.4.1</span>
          </div>
          <p className="text-sm font-bold text-white">
            Want Native App & Browser Tab Blocker + PiP Floating Timer?
          </p>
          <p className="text-xs text-slate-400">
            Download FlowTrack Pro for Windows, Mac & Linux for 100% offline background activity tracking.
          </p>
        </div>

        <a
          href="https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/releases/tag/v7.4.1"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all text-center shrink-0"
        >
          📥 Download Desktop App (.exe)
        </a>
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-rose-300">⚠️ Overdue Sessions</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleRescheduleAllOverdue}
                      className="text-[10px] font-black uppercase text-cyan-400 hover:underline focus:outline-none"
                    >
                      Reschedule to Today
                    </button>
                    <span className="text-[10px] text-slate-600">|</span>
                    <button 
                      onClick={handleClearAllOverdue}
                      className="text-[10px] font-black uppercase text-rose-400 hover:underline focus:outline-none"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
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

      {/* Gamified Focus Quest */}
      <div className="grid gap-5 grid-cols-1">
        <GamifiedFocusQuest />
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
      <div className="flex gap-4 mt-6">
        <WeeklyReviewModal />
        <PerformanceScorecardModal />
      </div>
    </div>
  );
}

// ─── Welcome & Changelog Modal Component ─────────────────────────────────────
function WelcomeChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show only once per major release version update
    const seenVersion = localStorage.getItem("flowtrack_changelog_v7.4.1");
    if (!seenVersion) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("flowtrack_changelog_v7.4.1", "true");
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                🚀 Shipped: v7.4.1
              </span>
              <h3 className="text-2xl font-black text-white">
                What&apos;s New in FlowTrack Pro v7.4.1!
              </h3>
              <p className="text-xs text-slate-400">
                Explore the latest premium features and security updates added to your tracker.
              </p>
            </div>

            <hr className="border-white/5" />

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs text-slate-300 pretty-scrollbar">
              <div className="space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  📁 Categorized Web & Desktop Architecture
                </p>
                <p className="text-slate-400 pl-5">
                  Isolated web-app and desktop-app modules with dual 127.0.0.1 / localhost auto-connect fallback.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  📝 Real Notepad & 1-Click Note PNG Exporter
                </p>
                <p className="text-slate-400 pl-5">
                  Full-screen lined Notepad mode (.TXT exporter) + single note card PNG image download and image attachments.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  📄 Study Workspace (Dual-Mode PDF / OCR)
                </p>
                <p className="text-slate-400 pl-5">
                  Native PDF vector text layer reader + Canvas high-res OCR engine for scanned PDF textbooks.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  🎧 Separated Focus Audio & Soundscape Engine
                </p>
                <p className="text-slate-400 pl-5">
                  10Hz Alpha Binaural Beats and Ambience Soundscapes/Local Files play cleanly without background clashing.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  ⚡ 0ms Anti-Lag Analytics & Re-ordered Menu
                </p>
                <p className="text-slate-400 pl-5">
                  Instant memoized analytics charts and top navigation organized by daily study priority.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md"
              >
                Let&apos;s Start Studying!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Live App Usage Panel Component ──────────────────────────────────────────
const isElectron = typeof window !== "undefined" && !!(window as any).electron;
const getIpc = () => isElectron ? (window as any).require("electron").ipcRenderer : null;

function LiveAppUsagePanel() {
  const [liveApp, setLiveApp] = useState<{ process: string; title: string } | null>(null);
  const [todayApps, setTodayApps] = useState<{ name: string; seconds: number }[]>([]);
  const [todayWebs, setTodayWebs] = useState<{ title: string; seconds: number }[]>([]);

  const fetchLog = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const entries = await ipc.invoke("get-activity-log", { date: localTodayStr });
      if (Array.isArray(entries)) {
        // aggregate apps
        const appMap = new Map<string, number>();
        const webMap = new Map<string, number>();

        entries.forEach((e: any) => {
          const appName = e.appName || "Unknown";
          appMap.set(appName, (appMap.get(appName) || 0) + e.durationSeconds);

          // Web Domain extract if title contains browser details
          if (e.title && e.title !== "Desktop / Idle" && e.title !== "desktop is idle") {
            const cleanTitle = e.title
              .replace(/\s*-\s*(Google Chrome|Mozilla Firefox|Microsoft Edge|Brave|Safari|Opera|Vivaldi|Arc|Chromium)$/i, "")
              .trim() || "Web Page";
            
            // Try to extract dynamic domain name for cleaner group look
            let domain = "web-page";
            const titleLower = cleanTitle.toLowerCase();
            if (titleLower.includes("youtube.com") || titleLower.includes("youtube")) domain = "youtube.com";
            else if (titleLower.includes("instagram.com") || titleLower.includes("instagram")) domain = "instagram.com";
            else if (titleLower.includes("facebook.com") || titleLower.includes("facebook")) domain = "facebook.com";
            else if (titleLower.includes("github")) domain = "github.com";
            else if (titleLower.includes("google search") || titleLower.includes("google")) domain = "google.com";
            else if (titleLower.includes("stackoverflow")) domain = "stackoverflow.com";
            else if (titleLower.includes("chatgpt") || titleLower.includes("openai")) domain = "chatgpt.com";
            else if (titleLower.includes("leetcode")) domain = "leetcode.com";
            else if (titleLower.includes("geeksforgeeks")) domain = "geeksforgeeks.org";
            else if (titleLower.includes("apnacollege") || titleLower.includes("apna college")) domain = "apnacollege.in";
            else if (titleLower.includes("freecodecamp")) domain = "freecodecamp.org";
            else if (titleLower.includes("codewithharry")) domain = "codewithharry.com";
            else {
              try {
                const match = cleanTitle.match(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/i);
                if (match && match[0]) domain = match[0].toLowerCase();
              } catch { /* fallback */ }
            }

            const label = domain !== "web-page" ? domain : cleanTitle;
            webMap.set(label, (webMap.get(label) || 0) + e.durationSeconds);
          }
        });

        const sortedApps = [...appMap.entries()]
          .map(([name, seconds]) => ({ name, seconds }))
          .sort((a, b) => b.seconds - a.seconds)
          .slice(0, 5);

        const sortedWebs = [...webMap.entries()]
          .map(([title, seconds]) => ({ title, seconds }))
          .sort((a, b) => b.seconds - a.seconds)
          .slice(0, 5);

        setTodayApps(sortedApps);
        setTodayWebs(sortedWebs);
      }
    } catch (err) {
      console.warn("[LiveAppUsagePanel] Error fetching logs:", err);
    }
  };

  useEffect(() => {
    const poll = async () => {
      const ipc = getIpc();
      if (!ipc) return;
      try {
        const win = await ipc.invoke("get-active-window");
        if (win && !win.skip && win.appName) {
          setLiveApp({ process: win.appName, title: win.title });
        } else {
          setLiveApp(null);
        }
      } catch {
        setLiveApp(null);
      }
    };

    void poll();
    void fetchLog();

    const appInterval = setInterval(() => void poll(), 5000);
    const logInterval = setInterval(() => void fetchLog(), 10000);

    return () => {
      clearInterval(appInterval);
      clearInterval(logInterval);
    };
  }, []);

  const formatSec = (total: number) => {
    const m = Math.floor(total / 60);
    if (m > 0) return `${m}m`;
    return `${total}s`;
  };

  return (
    <Panel className="border-l-4 border-indigo-400 bg-slate-900/60 backdrop-blur-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            📊 Live App & Web Tracker
          </h3>
          <p className="text-[10px] text-slate-400">Autosynced every 5 seconds · Tracking what you are studying right now</p>
        </div>
        {liveApp && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-300 font-semibold animate-pulse self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Currently Active: {liveApp.process}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Apps usage today */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">📱 Apps Used Today (Top 5)</p>
          {todayApps.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No apps recorded yet</p>
          ) : (
            <div className="space-y-2">
              {todayApps.map((a, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 text-xs">
                  <span className="text-white font-bold truncate max-w-[180px]">{a.name}</span>
                  <span className="text-indigo-300 font-mono">{formatSec(a.seconds)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Web Sites today */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">🌐 Websites / Tabs Today (Top 5)</p>
          {todayWebs.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No web activity recorded yet</p>
          ) : (
            <div className="space-y-2">
              {todayWebs.map((w, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 rounded-xl px-3 py-2 text-xs">
                  <span className="text-white font-bold truncate max-w-[180px]">{w.title}</span>
                  <span className="text-cyan-300 font-mono">{formatSec(w.seconds)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

