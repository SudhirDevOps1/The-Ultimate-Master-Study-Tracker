import { useMemo } from "react";
import { isSameDay, format } from "date-fns";
import { Target, Calendar, Play } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { StudySession } from "@/types/models";
import { toDurationLabel } from "@/utils/time";
import { Link } from "react-router-dom";

export function TodayTasksPage() {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const dailyGoalHours = useAppStore((state: AppState) => state.dailyGoalHours);

  const today = useMemo(() => {
    const now = new Date();
    return sessions.filter((session: StudySession) => isSameDay(new Date(session.startTime), now));
  }, [sessions]);

  const todayDate = useMemo(() => format(new Date(), "EEEE, MMMM dd, yyyy"), []);
  
  const stats = useMemo(() => {
    const actualSeconds = today.reduce((sum, s) => sum + s.actualSeconds, 0);
    const plannedMinutes = today.reduce((sum, s) => sum + s.plannedMinutes, 0);
    const completed = today.filter(s => s.status === "completed").length;
    const inProgress = today.filter(s => s.status === "in_progress").length;
    const planned = today.filter(s => s.status === "planned").length;
    const paused = today.filter(s => s.status === "paused").length;

    return {
      actualSeconds,
      actualMinutes: Math.round(actualSeconds / 60),
      actualHours: (actualSeconds / 3600).toFixed(2),
      plannedMinutes,
      plannedHours: (plannedMinutes / 60).toFixed(2),
      completed,
      inProgress,
      planned,
      paused,
      total: today.length,
      goalMinutes: dailyGoalHours * 60,
      progress: Math.min(100, (actualSeconds / 60 / (dailyGoalHours * 60)) * 100)
    };
  }, [today, dailyGoalHours]);

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || "General Study";
  };

  return (
    <div className="space-y-6">
      <Panel className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              <Calendar className="w-4 h-4" /> Daily Planner
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">Today's Focus Dashboard</h2>
            <p className="text-xs text-slate-400 mt-1">{todayDate}</p>
          </div>
          <Link
            to="/timer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium text-xs shadow-lg hover:shadow-cyan-500/20 transition-all self-start md:self-auto"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Go to Timer
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-1">
            <p className="text-xs text-slate-400">Total Studied Today</p>
            <p className="text-2xl font-bold text-cyan-400">{stats.actualHours} hrs</p>
            <p className="text-[10px] text-slate-500">Planned: {stats.plannedHours} hrs</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-1">
            <p className="text-xs text-slate-400">Daily Goal Progress</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.progress.toFixed(0)}%</p>
            <p className="text-[10px] text-slate-500">Target: {dailyGoalHours} hours</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-1">
            <p className="text-xs text-slate-400">Completed Sessions</p>
            <p className="text-2xl font-bold text-purple-400">{stats.completed} / {stats.total}</p>
            <p className="text-[10px] text-slate-500">Completed Tasks</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-1">
            <p className="text-xs text-slate-400">Active / Planned</p>
            <p className="text-2xl font-bold text-amber-400">{stats.inProgress + stats.planned}</p>
            <p className="text-[10px] text-slate-500">Remaining Tasks</p>
          </div>
        </div>
      </Panel>

      <Panel className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" /> Today's Scheduled Sessions
        </h3>

        {today.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No study sessions scheduled for today yet. Create a session from the Timer page!
          </div>
        ) : (
          <div className="space-y-3">
            {today.map(session => (
              <div
                key={session.id}
                className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center justify-between gap-4 hover:border-white/15 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{getSubjectName(session.subjectId)}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      session.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                      session.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{session.notes || "No notes attached"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-semibold text-cyan-300">
                    {toDurationLabel(session.actualSeconds)} / {session.plannedMinutes}m
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
