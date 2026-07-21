import { useMemo, useState } from "react";
import { isSameDay, format } from "date-fns";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Target, Calendar, ChevronRight, Play, AlertCircle } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { StudySession } from "@/types/models";
import { toDurationLabel } from "@/utils/time";
import { Link } from "react-router-dom";

export function TodayTasksPage() {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const dailyGoalHours = useAppStore((state: AppState) => state.dailyGoalHours);
  const timer = useAppStore((state: AppState) => state.timer);

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

  const groupedByStatus = useMemo(() => {
    return {
      active: today.filter(s => s.status === "in_progress"),
      completed: today.filter(s => s.status === "completed"),
      planned: today.filter(s => s.status === "planned"),
      paused: today.filter(s => s.status === "paused")
    };
  }, [today]);

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || "Unknown Subject";
  };

  const getSubjectColor = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.color || "#808080";
  };

  const getSubjectEmoji = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.emoji || "📚";
  };

  return (
    <div className="min-h-screen space-y-6 pb-12">
      {/* Header with Date */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 space-y-4 bg-gradient-to-b from-slate-900 via-slate-900 to-transparent pb-4"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Today&apos;s Tasks</h1>
          </div>
          <p className="text-lg text-slate-300">{todayDate}</p>
        </div>

        {/* Progress Overview */}
        <Panel className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/30">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-slate-400">Completed</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
              <p className="text-xs text-slate-500">of {stats.total} tasks</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Time Spent</p>
              <p className="text-2xl font-bold text-cyan-400">{stats.actualHours}h</p>
              <p className="text-xs text-slate-500">goal: {stats.plannedHours}h</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Progress</p>
              <p className="text-2xl font-bold text-amber-400">{Math.round(stats.progress)}%</p>
              <p className="text-xs text-slate-500">of {dailyGoalHours}h goal</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Status</p>
              <p className="text-2xl font-bold text-purple-400">{stats.inProgress + stats.paused}</p>
              <p className="text-xs text-slate-500">active/paused</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </Panel>
      </motion.div>

      {/* Active/In Progress Sessions */}
      {groupedByStatus.active.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-cyan-300">
            <Play className="h-5 w-5" />
            Currently Active
          </h2>
          {groupedByStatus.active.map((session, idx) => (
            <SessionCard
              key={session.id}
              session={session}
              subjectName={getSubjectName(session.subjectId)}
              subjectColor={getSubjectColor(session.subjectId)}
              subjectEmoji={getSubjectEmoji(session.subjectId)}
              isActive={timer.activeSessionId === session.id}
              index={idx}
            />
          ))}
        </motion.div>
      )}

      {/* Paused Sessions */}
      {groupedByStatus.paused.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-300">
            <AlertCircle className="h-5 w-5" />
            Paused Sessions
          </h2>
          {groupedByStatus.paused.map((session, idx) => (
            <SessionCard
              key={session.id}
              session={session}
              subjectName={getSubjectName(session.subjectId)}
              subjectColor={getSubjectColor(session.subjectId)}
              subjectEmoji={getSubjectEmoji(session.subjectId)}
              isPaused
              index={idx}
            />
          ))}
        </motion.div>
      )}

      {/* Completed Sessions */}
      {groupedByStatus.completed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            Completed ({groupedByStatus.completed.length})
          </h2>
          {groupedByStatus.completed.map((session, idx) => (
            <SessionCard
              key={session.id}
              session={session}
              subjectName={getSubjectName(session.subjectId)}
              subjectColor={getSubjectColor(session.subjectId)}
              subjectEmoji={getSubjectEmoji(session.subjectId)}
              isCompleted
              index={idx}
            />
          ))}
        </motion.div>
      )}

      {/* Planned Sessions */}
      {groupedByStatus.planned.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-300">
            <Target className="h-5 w-5" />
            Upcoming ({groupedByStatus.planned.length})
          </h2>
          {groupedByStatus.planned.map((session, idx) => (
            <SessionCard
              key={session.id}
              session={session}
              subjectName={getSubjectName(session.subjectId)}
              subjectColor={getSubjectColor(session.subjectId)}
              subjectEmoji={getSubjectEmoji(session.subjectId)}
              index={idx}
            />
          ))}
        </motion.div>
      )}

      {/* No Tasks */}
      {today.length === 0 && (
        <Panel className="border-slate-700 bg-slate-800/40 text-center py-12">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <p className="text-lg font-semibold text-slate-300">No tasks planned for today</p>
          <p className="mt-2 text-sm text-slate-500">Create a new session to get started</p>
          <Link
            to="/calendar"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Go to Calendar
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Panel>
      )}
    </div>
  );
}

function SessionCard({
  session,
  subjectName,
  subjectColor,
  subjectEmoji,
  isActive,
  isPaused,
  isCompleted,
  index
}: {
  session: StudySession;
  subjectName: string;
  subjectColor: string;
  subjectEmoji: string;
  isActive?: boolean;
  isPaused?: boolean;
  isCompleted?: boolean;
  index: number;
}) {
  const startTime = format(new Date(session.startTime), "h:mm a");
  const endTime = format(new Date(session.endTime), "h:mm a");
  const actualTime = toDurationLabel(Math.round(session.actualSeconds / 60));
  const plannedTime = toDurationLabel(session.plannedMinutes);

  const statusColor = isActive ? "border-cyan-500/50 bg-cyan-900/20" : isPaused ? "border-amber-500/50 bg-amber-900/20" : isCompleted ? "border-emerald-500/50 bg-emerald-900/20" : "border-slate-700 bg-slate-800/40";
  const statusBadge = isActive ? "bg-cyan-500/20 text-cyan-300" : isPaused ? "bg-amber-500/20 text-amber-300" : isCompleted ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/timer#${session.id}`}>
        <Panel className={`group border transition-all hover:border-cyan-400/50 ${statusColor}`}>
          <div className="flex items-center justify-between gap-4">
            {/* Left: Subject Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="text-3xl flex-shrink-0">{subjectEmoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{subjectName}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>{startTime} - {endTime}</span>
                </div>
                {session.notes && (
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2">{session.notes}</p>
                )}
              </div>
            </div>

            {/* Center: Time Info */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}>
                {isActive ? "Active" : isPaused ? "Paused" : isCompleted ? "Done" : "Planned"}
              </span>
              <div className="text-right">
                <p className="text-sm font-semibold text-cyan-300">{actualTime}</p>
                <p className="text-xs text-slate-500">planned: {plannedTime}</p>
              </div>
            </div>

            {/* Right: Arrow */}
            <ChevronRight className="h-5 w-5 text-slate-500 transition-all group-hover:text-cyan-400 group-hover:translate-x-1 flex-shrink-0" />
          </div>
        </Panel>
      </Link>
    </motion.div>
  );
}
