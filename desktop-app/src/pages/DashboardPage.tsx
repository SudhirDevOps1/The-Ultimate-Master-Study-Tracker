import { useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Flame, UserCheck, Sparkles, BookOpen, Clock, 
  Target, Calendar, Activity, ChevronRight, Zap 
} from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { useStreak } from "@/hooks/useStreak";
import { formatTime12Hour } from "@/utils/time";

export function DashboardPage() {
  const profile = useAppStore((state: AppState) => state.profile);
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const weeklyTargetHours = useAppStore((state: AppState) => state.weeklyTargetHours);
  const streakData = useStreak();

  const [currentTime] = useState(new Date());

  const todaySessions = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return (sessions || []).filter((s) => format(new Date(s.startTime), "yyyy-MM-dd") === todayStr);
  }, [sessions]);

  const totalTodayMinutes = useMemo(() => 
    Math.floor(todaySessions.reduce((acc, s) => acc + (s.actualSeconds || 0), 0) / 60), 
  [todaySessions]);

  const thisWeekSessions = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return (sessions || []).filter((s) => {
      const d = new Date(s.startTime);
      return d >= weekStart && d <= weekEnd;
    });
  }, [sessions]);

  const totalWeeklyMinutes = useMemo(() => 
    Math.floor(thisWeekSessions.reduce((acc, s) => acc + (s.actualSeconds || 0), 0) / 60), 
  [thisWeekSessions]);

  const weeklyProgress = Math.min(100, Math.round((totalWeeklyMinutes / Math.max(1, weeklyTargetHours * 60)) * 100)) || 0;
  const weeklyActualHours = (totalWeeklyMinutes / 60).toFixed(1);
  
  const quote = profile?.dailyContext || profile?.goldenRule || "Consistency & Focused Grind lead to top performance. Track every focus hour!";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      
      {/* ── HEADER ── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Welcome back, {profile?.name || "Achiever"} <Sparkles className="w-6 h-6 text-indigo-400" />
          </h1>
          <p className="text-slate-400 mt-1 font-medium">
            {format(currentTime, "EEEE, MMMM do, yyyy")} • Let's crush today's goals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/timer" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
            <Target className="w-4 h-4" /> Start Focus Session
          </Link>
        </div>
      </motion.div>

      {/* ── BENTO GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(140px,auto)]">
        
        {/* Widget 1: Daily Motivation (Spans 2 cols on MD, 2 on LG) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 rounded-3xl relative overflow-hidden bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-slate-900/60 border border-white/10 p-6 flex flex-col justify-center backdrop-blur-xl"
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="flex items-start gap-4 z-10">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl shrink-0">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-1">Golden Rule</h3>
              <p className="text-lg font-bold text-slate-100 leading-snug">"{quote}"</p>
            </div>
          </div>
        </motion.div>

        {/* Widget 2: Streak (1 col) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className="col-span-1 rounded-3xl bg-slate-900/50 border border-white/5 p-6 flex flex-col items-center justify-center text-center backdrop-blur-xl hover:bg-slate-800/50 transition-colors"
        >
          <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-3">
            <Zap className="w-6 h-6 text-orange-400" />
          </div>
          <div className="text-3xl font-black text-white">{streakData.daily || 0}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Day Streak</div>
        </motion.div>

        {/* Widget 3: Quick Stats (1 col) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="col-span-1 rounded-3xl bg-slate-900/50 border border-white/5 p-6 flex flex-col justify-between backdrop-blur-xl hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Activity className="w-5 h-5" />
            <span className="font-bold uppercase tracking-wider text-xs">Today</span>
          </div>
          <div>
            <div className="text-3xl font-black text-white">{Math.floor(totalTodayMinutes / 60)}h {totalTodayMinutes % 60}m</div>
            <div className="text-sm font-medium text-slate-400 mt-1">Focused Time</div>
          </div>
        </motion.div>

        {/* Widget 4: Weekly Progress (Spans 2 cols) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 rounded-3xl bg-slate-900/50 border border-white/5 p-6 backdrop-blur-xl flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" /> Weekly Target
            </h3>
            <span className="text-xs font-bold px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg">
              {weeklyTargetHours} Hrs / Week
            </span>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Circular Progress (Simplified for Dashboard) */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="none" 
                  stroke="url(#purpleGradient)" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * weeklyProgress) / 100} 
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{weeklyProgress}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Completed</span>
                <span className="text-[11px] font-semibold text-indigo-300 mt-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  {weeklyActualHours}h / {weeklyTargetHours}h done
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Widget 5: Recent Sessions (Spans 2 cols) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 rounded-3xl bg-slate-900/50 border border-white/5 p-6 backdrop-blur-xl flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" /> Today's Sessions
            </h3>
            <Link to="/history" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {todaySessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No sessions scheduled for today.</p>
                <p className="text-xs">Plan new sessions in Calendar!</p>
              </div>
            ) : (
              todaySessions.map((session) => {
                const sub = subjects.find(s => s.id === session.subjectId);
                const durationMinutes = Math.floor((session.actualSeconds || 0) / 60);
                const plannedMin = session.plannedMinutes || 0;
                const isCompleted = session.status === "completed" || (plannedMin > 0 && durationMinutes >= plannedMin);
                return (
                  <div key={session.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub?.color || '#6366f1' }} />
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{sub?.name || "Focus Session"}</span>
                          {isCompleted && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✓ Done
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatTime12Hour(session.startTime)} {session.endTime ? `- ${formatTime12Hour(session.endTime)}` : ''} • Planned: {plannedMin >= 60 ? `${(plannedMin / 60).toFixed(1)}h` : `${plannedMin}m`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg ${durationMinutes > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 bg-white/5"}`}>
                        {durationMinutes}m {plannedMin > 0 ? `/ ${plannedMin >= 60 ? `${(plannedMin/60).toFixed(1)}h` : `${plannedMin}m`}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
