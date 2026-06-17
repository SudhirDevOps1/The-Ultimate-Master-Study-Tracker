import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { Panel } from "@/components/common/Panel";
import { SessionEditor } from "@/components/session/SessionEditor";
import { SessionForm } from "@/components/session/SessionForm";
import { FloatingTimer } from "@/components/timer/FloatingTimer";
import { TimerDisplay } from "@/components/timer/TimerDisplay";
import { PomodoroTimer } from "@/components/timer/PomodoroTimer";
import { AmbiencePlayer } from "@/components/timer/AmbiencePlayer";
import { useTimer } from "@/hooks/useTimer";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { formatDate12Hour, formatTimeRange12Hour, toDurationLabel } from "@/utils/time";
import type { StudySession, Subject } from "@/types/models";

export function TimerPage() {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const timer = useAppStore((state: AppState) => state.timer);
  const pomodoroMode = useAppStore((state: AppState) => state.pomodoroMode);
  const theme = useAppStore((state: AppState) => state.theme);
  const startSession = useAppStore((state: AppState) => state.startSession);
  const pauseSession = useAppStore((state: AppState) => state.pauseSession);
  const resumeSession = useAppStore((state: AppState) => state.resumeSession);
  const stopSession = useAppStore((state: AppState) => state.stopSession);
  const setPomodoroMode = useAppStore((state: AppState) => state.setPomodoroMode);
  const strictFocusMode = useAppStore((state: AppState) => state.strictFocusMode);
  const markTimerInteraction = useAppStore((state: AppState) => state.markTimerInteraction);
  const cloneSession = useAppStore((state: AppState) => state.cloneSession);
  const moveSessionToNextDay = useAppStore((state: AppState) => state.moveSessionToNextDay);

  const { activeSession, elapsedSeconds, remainingSeconds, progress } = useTimer();
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [filter, setFilter] = useState<"all" | "planned" | "completed" | "in_progress">("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const showMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 2500);
  };

  const activeSubject = useMemo(
    () => subjects.find((subject: Subject) => subject.id === activeSession?.subjectId),
    [activeSession?.subjectId, subjects]
  );

  const filteredSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    if (filter === "all") return sorted;
    return sorted.filter((s) => s.status === filter);
  }, [sessions, filter]);

  // Redundant visibility listener removed as it is now handled by useTimer hook with PiP awareness.


  const getThemeGradient = () => {
    switch (theme) {
      case "ocean": return "from-sky-500 to-teal-400";
      case "forest": return "from-green-500 to-lime-400";
      case "sunset": return "from-orange-500 to-rose-500";
      case "galaxy": return "from-purple-500 to-pink-500";
      case "neon": return "from-cyan-400 to-fuchsia-500";
      case "paper": return "from-slate-100 to-slate-300 text-slate-900";
      case "cyber": return "from-yellow-400 to-rose-500";
      default: return "from-indigo-500 to-cyan-500";
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

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
        {/* Timer Section */}
        <Panel className="space-y-4">
          {activeSession ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className={`rounded-2xl bg-gradient-to-r ${getThemeGradient()} p-[2px]`}>
                <div className="rounded-2xl bg-slate-900/95 p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-12 w-12 flex items-center justify-center rounded-2xl text-2xl shadow-lg border border-white/10"
                        style={{ backgroundColor: activeSubject?.color, color: 'white' }}
                      >
                        {activeSubject?.emoji || "📚"}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white leading-tight">{activeSubject?.name}</h2>
                        <p className="text-slate-400 font-medium">Active Focus Session</p>
                      </div>
                    </div>
                    
                    <AmbiencePlayer />
                  </div>
                  <TimerDisplay
                    subject={activeSubject?.name ?? "Unknown Subject"}
                    elapsedSeconds={elapsedSeconds}
                    remainingSeconds={remainingSeconds}
                    progress={progress}
                    strictMode={strictFocusMode}
                  />
                </div>
              </div>
              {pomodoroMode && <PomodoroTimer />}
              <div className="flex flex-wrap items-center gap-2">
                <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${strictFocusMode ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}>
                  {strictFocusMode ? "🔒 Strict timing enabled" : "🟢 Standard timing enabled"}
                </div>
                {!timer.isPaused ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => void pauseSession()}
                    className="rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg"
                  >
                    ⏸️ Pause
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => void resumeSession()}
                    className="rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg"
                  >
                    ▶️ Resume
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => void stopSession()}
                  className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  ⏹️ Stop
                </motion.button>
                <button
                  onClick={() => setEditingSession(activeSession)}
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm text-white transition-colors hover:bg-white/8"
                >
                  ✏️ Edit
                </button>
                <FloatingTimer
                  subject={activeSubject?.name ?? "FlowTrack"}
                  elapsed={elapsedSeconds}
                  remaining={remainingSeconds}
                  progress={progress}
                  onHeartbeat={() => {
                    void markTimerInteraction(Date.now());
                  }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">⏱️ Strict Timer</p>
                <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Start a session and stay focused</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
                  FlowTrack counts real study time using timestamps, works across inactive tabs, and supports browser Picture-in-Picture floating mode.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className={`rounded-2xl bg-gradient-to-br ${getThemeGradient()} p-[2px]`}
                >
                  <div className="rounded-2xl bg-slate-900/90 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">📊 Sessions</p>
                    <p className="mt-2 text-3xl font-bold text-white">{sessions.length}</p>
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-[2px]"
                >
                  <div className="rounded-2xl bg-slate-900/90 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">📚 Subjects</p>
                    <p className="mt-2 text-3xl font-bold text-white">{subjects.length}</p>
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]"
                >
                  <div className="rounded-2xl bg-slate-900/90 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">🍅 Pomodoro</p>
                    <button
                      onClick={() => setPomodoroMode(!pomodoroMode)}
                      className={`mt-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${pomodoroMode
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/8 text-white hover:bg-white/12"
                        }`}
                    >
                      {pomodoroMode ? "✅ Enabled" : "❌ Disabled"}
                    </button>
                  </div>
                </motion.div>
              </div>
              {pomodoroMode && <PomodoroTimer />}
            </motion.div>
          )}
        </Panel>

        {/* Sessions List */}
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">📋 Study Sessions</h3>
              <p className="text-sm text-slate-400">All tasks visible with 12-hour timing • Click Edit for reschedule/clone</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "planned", "in_progress", "completed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${filter === f
                    ? `bg-gradient-to-r ${getThemeGradient()} text-white`
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {f === "all" ? "All" : f === "in_progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="pretty-scrollbar max-h-[36rem] space-y-3 overflow-y-auto pr-1">
            {filteredSessions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl bg-white/5 p-6 text-center"
              >
                <p className="text-3xl">📭</p>
                <p className="mt-2 text-sm text-slate-300">No sessions found. Create one below!</p>
              </motion.div>
            ) : (
              filteredSessions.map((session: StudySession, i: number) => {
                const subject = subjects.find((item: Subject) => item.id === session.subjectId);
                const completion = session.plannedMinutes > 0
                  ? Math.round((session.actualSeconds / 60 / session.plannedMinutes) * 100)
                  : 0;
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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                            style={{ backgroundColor: `${subject?.color ?? session.colorTag}30` }}
                          >
                            {subject?.emoji || "📖"}
                          </div>
                          <p className="break-words text-base font-semibold text-white">{subject?.name ?? "Unknown Subject"}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${getStatusColor(session.status)}`}>
                            {session.status.replace("_", " ")}
                          </span>
                          {session.seriesId && (
                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
                              🔄 Recurring
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                          <p>
                            <span className="text-slate-500">📅 Date:</span> {formatDate12Hour(session.startTime)}
                          </p>
                          <p>
                            <span className="text-slate-500">⏰ Time:</span> {formatTimeRange12Hour(session.startTime, session.endTime)}
                          </p>
                          <p>
                            <span className="text-slate-500">📊 Planned:</span> {toDurationLabel(session.plannedMinutes)}
                          </p>
                          <p>
                            <span className="text-slate-500">✅ Actual:</span> {toDurationLabel(Math.round(session.actualSeconds / 60))}
                            {completion > 0 && (
                              <span className={`ml-2 text-xs ${completion >= 80 ? "text-emerald-400" : completion >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                                ({completion}%)
                              </span>
                            )}
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
                            className="rounded-xl border border-cyan-400/25 px-3 py-2 text-xs text-cyan-200 transition-colors hover:bg-cyan-400/10"
                          >
                            ✏️ Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => void startSession(session.id)}
                            className={`rounded-xl bg-gradient-to-r ${getThemeGradient()} px-4 py-2 text-xs font-medium text-white shadow-lg`}
                          >
                            ▶️ Start
                          </motion.button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleMoveNext(session)}
                            className="rounded-xl bg-amber-500/20 px-3 py-2 text-xs text-amber-300 transition-colors hover:bg-amber-500/30"
                          >
                            ➡️ Tomorrow
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleQuickClone(session, 1)}
                            className="rounded-xl bg-purple-500/20 px-3 py-2 text-xs text-purple-300 transition-colors hover:bg-purple-500/30"
                          >
                            📋 Clone +1d
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </Panel>

        {/* Create Session Form */}
        <Panel className="xl:col-span-2">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white">➕ Create New Session</h3>
            <p className="mt-1 text-sm text-slate-400">Plan a study block with subject, time range, tags, and notes.</p>
          </div>
          <SessionForm />
        </Panel>
      </div>

      <SessionEditor session={editingSession} open={Boolean(editingSession)} onClose={() => setEditingSession(null)} />
    </>
  );
}
