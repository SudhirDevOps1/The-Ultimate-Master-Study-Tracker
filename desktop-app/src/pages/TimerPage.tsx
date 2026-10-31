import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { Panel } from "@/components/common/Panel";
import { SessionEditor } from "@/components/session/SessionEditor";
import { SessionForm } from "@/components/session/SessionForm";
import { FloatingTimer } from "@/components/timer/FloatingTimer";
import { TimerDisplay } from "@/components/timer/TimerDisplay";
import { PomodoroTimer } from "@/components/timer/PomodoroTimer";
import { AmbiencePlayer } from "@/components/timer/AmbiencePlayer";
import { MediaSandbox } from "@/components/timer/MediaSandbox";
import { useTimer } from "@/hooks/useTimer";
import { useInactivityDetector } from "@/hooks/useInactivityDetector";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { formatDate12Hour, formatTimeRange12Hour, toDurationLabel } from "@/utils/time";
import type { StudySession, Subject } from "@/types/models";
import { Globe2, Maximize2, Minimize2, Sparkles, Play, Pause, Square, Flame, Zap, Waves, Rocket, X } from "lucide-react";

export function TimerPage() {
  const navigate = useNavigate();
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const timer = useAppStore((state: AppState) => state.timer);
  const pomodoroMode = useAppStore((state: AppState) => state.pomodoroMode);
  const theme = useAppStore((state: AppState) => state.theme);
  const startSession = useAppStore((state: AppState) => state.startSession);
  const createSession = useAppStore((state: AppState) => state.createSession);
  const pauseSession = useAppStore((state: AppState) => state.pauseSession);
  const resumeSession = useAppStore((state: AppState) => state.resumeSession);
  const stopSession = useAppStore((state: AppState) => state.stopSession);
  const updateSession = useAppStore((state: AppState) => state.updateSession);
  const setPomodoroMode = useAppStore((state: AppState) => state.setPomodoroMode);
  const strictFocusMode = useAppStore((state: AppState) => state.strictFocusMode);
  const markTimerInteraction = useAppStore((state: AppState) => state.markTimerInteraction);
  const cloneSession = useAppStore((state: AppState) => state.cloneSession);
  const moveSessionToNextDay = useAppStore((state: AppState) => state.moveSessionToNextDay);

  const { activeSession, elapsedSeconds, remainingSeconds, progress } = useTimer();
  useInactivityDetector(); // Enable auto-pause when Strict Focus Mode is active

  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [filter, setFilter] = useState<"all" | "planned" | "completed" | "in_progress">("all");
  const [dateScope, setDateScope] = useState<"today" | "all">("today");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeTaskGoal, setActiveTaskGoal] = useState<string | null>(null);

  // Check for task hand-off from TodayTasksPage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("flowtrack_timer_task_hand_off");
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.title) {
          setActiveTaskGoal(data.title);
          showMessage(`🎯 Focus task loaded: "${data.title}"`);
        }
      }
    } catch {}
  }, []);

  const showMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 2500);
  };

  const activeSubject = useMemo(
    () => subjects.find((subject: Subject) => subject.id === activeSession?.subjectId),
    [activeSession?.subjectId, subjects]
  );

  const currentGoalTitle = activeTaskGoal || activeSession?.notes || undefined;

  // Global Keyboard Shortcuts (Space for Play/Pause, F for Zen Mode, Esc to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
        return;
      }

      if (e.code === "Space" && activeSession) {
        e.preventDefault();
        if (timer.isPaused) {
          void resumeSession();
        } else {
          void pauseSession();
        }
      } else if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsZenMode(prev => !prev);
      } else if (e.key === "Escape" && isZenMode) {
        setIsZenMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession, timer.isPaused, isZenMode, resumeSession, pauseSession]);

  // Quick Extend Session
  const handleQuickExtend = useCallback(async (minutes: number) => {
    if (!activeSession) return;
    try {
      const nextPlanned = (activeSession.plannedMinutes || 25) + minutes;
      const end = new Date(activeSession.endTime);
      end.setMinutes(end.getMinutes() + minutes);

      await updateSession({
        ...activeSession,
        plannedMinutes: nextPlanned,
        endTime: end.toISOString()
      });
      showMessage(`⏱️ Extended session by +${minutes} minutes`);
    } catch (err) {
      console.warn("Failed to extend session", err);
    }
  }, [activeSession, updateSession]);

  // 1-Click Quick Preset starter
  const handleQuickPreset = async (presetMinutes: number, presetName: string) => {
    if (activeSession) {
      // If already active, adjust planned minutes
      try {
        const start = new Date(activeSession.startTime);
        const end = new Date(start.getTime() + presetMinutes * 60 * 1000);
        await updateSession({
          ...activeSession,
          plannedMinutes: presetMinutes,
          endTime: end.toISOString()
        });
        showMessage(`⏱️ Set focus session to ${presetMinutes}m (${presetName})`);
      } catch {}
      return;
    }

    // If no active session, create and start a quick focus block
    const defaultSubjectId = subjects[0]?.id || "general";
    const now = new Date();
    const end = new Date(now.getTime() + presetMinutes * 60 * 1000);

    try {
      await createSession({
        subjectId: defaultSubjectId,
        startTime: now.toISOString(),
        endTime: end.toISOString(),
        colorTag: subjects[0]?.color || "#06b6d4",
        notes: activeTaskGoal ? `Task: ${activeTaskGoal}` : `${presetName} block`,
        tags: [presetName.toLowerCase().replace(/\s+/g, "-")]
      });
      const latest = useAppStore.getState().sessions[0];
      if (latest) {
        void startSession(latest.id);
        showMessage(`🚀 Started ${presetMinutes}m ${presetName} block!`);
      }
    } catch {}
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const scopedSessions = useMemo(() => {
    if (dateScope === "all") return sessions;
    return sessions.filter((s) => {
      const sDate = new Date(s.startTime);
      const pad = (n: number) => String(n).padStart(2, "0");
      const sDateStr = `${sDate.getFullYear()}-${pad(sDate.getMonth() + 1)}-${pad(sDate.getDate())}`;
      return sDateStr === todayStr;
    });
  }, [sessions, dateScope, todayStr]);

  const counts = useMemo(() => {
    const all = scopedSessions.length;
    const planned = scopedSessions.filter(s => s.status === "planned").length;
    const active = scopedSessions.filter(s => s.status === "in_progress").length;
    const completed = scopedSessions.filter(s => s.status === "completed").length;
    return { all, planned, active, completed };
  }, [scopedSessions]);

  const filteredSessions = useMemo(() => {
    const sorted = [...scopedSessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    if (filter === "all") return sorted;
    return sorted.filter((s) => s.status === filter);
  }, [scopedSessions, filter]);

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
      {/* Toast Action Message */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-xs font-bold text-slate-950 shadow-2xl backdrop-blur-md"
          >
            {actionMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zen Fullscreen Focus Overlay */}
      <AnimatePresence>
        {isZenMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-12 overflow-hidden"
          >
            {/* Zen Header */}
            <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
                  ZEN MODE
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">Press &apos;F&apos; or &apos;Esc&apos; to exit</span>
              </div>
              <div className="flex items-center gap-3">
                <AmbiencePlayer />
                <button
                  onClick={() => setIsZenMode(false)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Exit Zen Fullscreen"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Zen Central Dial */}
            <div className="flex flex-col items-center justify-center my-auto w-full max-w-xl mx-auto text-center space-y-6">
              <TimerDisplay
                subject={activeSubject?.name ?? "Deep Focus"}
                elapsedSeconds={elapsedSeconds}
                remainingSeconds={remainingSeconds}
                progress={progress}
                strictMode={strictFocusMode}
                subjectColor={activeSubject?.color || "#06b6d4"}
                activeGoalTitle={currentGoalTitle}
                onQuickExtend={handleQuickExtend}
              />

              {/* Zen Action Controls */}
              <div className="flex items-center justify-center gap-4 pt-2">
                {!timer.isPaused ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => void pauseSession()}
                    className="rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-3 text-sm font-bold text-slate-950 shadow-xl flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4 fill-current" /> Pause
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => void resumeSession()}
                    className="rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-8 py-3 text-sm font-bold text-slate-950 shadow-xl flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" /> Resume
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    void stopSession();
                    setIsZenMode(false);
                  }}
                  className="rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 px-6 py-3 text-sm font-bold text-rose-300 flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" /> Stop Session
                </motion.button>
              </div>
            </div>

            {/* Zen Footer */}
            <div className="text-center text-xs text-slate-500 w-full max-w-md mx-auto">
              <span>FlowTrack Pro • Distraction-free Study Session</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
        {/* Main Timer Section */}
        <Panel className="space-y-4 shadow-2xl border-white/10">
          {/* Quick Presets Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Focus Presets:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickPreset(25, "Pomodoro")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-amber-300 flex items-center gap-1 transition-all active:scale-95"
                title="Start or set 25m Pomodoro"
              >
                <Flame className="w-3 h-3 text-amber-400" /> 25m Pomo
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(50, "Deep Work")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-indigo-300 flex items-center gap-1 transition-all active:scale-95"
                title="Start or set 50m Deep Work"
              >
                <Zap className="w-3 h-3 text-indigo-400" /> 50m Deep
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(90, "Flow State")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-cyan-300 flex items-center gap-1 transition-all active:scale-95"
                title="Start or set 90m Flow State"
              >
                <Waves className="w-3 h-3 text-cyan-400" /> 90m Flow
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(15, "Power Sprint")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-emerald-300 flex items-center gap-1 transition-all active:scale-95"
                title="Start or set 15m Sprint"
              >
                <Rocket className="w-3 h-3 text-emerald-400" /> 15m Sprint
              </button>
            </div>
          </div>

          {activeSession ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className={`rounded-2xl bg-gradient-to-r ${getThemeGradient()} p-[2px]`}>
                <div className="rounded-2xl bg-slate-900/95 p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-12 flex items-center justify-center rounded-2xl text-2xl shadow-lg border border-white/10"
                        style={{ backgroundColor: activeSubject?.color, color: "white" }}
                      >
                        {activeSubject?.emoji || "📚"}
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{activeSubject?.name}</h2>
                        <p className="text-xs text-slate-400 font-medium">Active Focus Block</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsZenMode(true)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 flex items-center gap-1.5 transition-all shadow-sm"
                        title="Enter Fullscreen Zen Mode (Press 'F')"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Zen Mode</span>
                      </button>
                      <AmbiencePlayer />
                    </div>
                  </div>

                  <TimerDisplay
                    subject={activeSubject?.name ?? "General Study"}
                    elapsedSeconds={elapsedSeconds}
                    remainingSeconds={remainingSeconds}
                    progress={progress}
                    strictMode={strictFocusMode}
                    subjectColor={activeSubject?.color || "#06b6d4"}
                    activeGoalTitle={currentGoalTitle}
                    onQuickExtend={handleQuickExtend}
                  />
                </div>
              </div>

              {pomodoroMode && <PomodoroTimer />}

              {/* Main Action Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${strictFocusMode ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}>
                  {strictFocusMode ? "🔒 Strict Timing" : "🟢 Standard Timing"}
                </div>
                {!timer.isPaused ? (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void pauseSession()}
                    className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void resumeSession()}
                    className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => void stopSession()}
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </motion.button>
                <button
                  onClick={() => setEditingSession(activeSession)}
                  className="rounded-xl border border-white/15 px-3.5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
                >
                  ✏️ Edit Block
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

              {/* Subject Media / URL handling */}
              {activeSubject?.url && (
                <div className="mt-4">
                  {/^[a-zA-Z]:[\\/]/i.test(activeSubject.url.trim().replace(/^["']|["']$/g, "")) ||
                  activeSubject.url.startsWith("file://") ||
                  activeSubject.url.startsWith("local-media://") ||
                  /\.(mp3|mp4|m4a|wav|aac|flac|ogg|mkv|avi|mov|webm|wmv|pdf|txt|epub)$/i.test(activeSubject.url.trim()) ? (
                    <MediaSandbox
                      url={activeSubject.url}
                      activeSubjectName={activeSubject.name}
                      color={activeSubject.color}
                      isPaused={timer.isPaused || !timer.activeSessionId}
                      onInteraction={() => void markTimerInteraction(Date.now())}
                    />
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-slate-900/60 px-4 py-3">
                      <div className="h-8 w-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
                        <Globe2 className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white">Subject Web Portal</p>
                        <p className="text-[10px] text-slate-400 truncate">{activeSubject.url.replace(/^https?:\/\//, "")}</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => navigate("/web-portals", { state: { url: activeSubject.url, name: activeSubject.name } })}
                        className="shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-2 text-[11px] font-bold text-white shadow hover:opacity-90 transition-all"
                      >
                        <Globe2 className="w-3.5 h-3.5" />
                        Open Web Portal
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* Standby State */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <p className="text-xs uppercase font-bold tracking-[0.24em] text-cyan-400">⏱️ Precision Study Timer</p>
                <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Ready for your next deep focus block?</h2>
                <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Choose a quick focus preset above or click <strong>Start</strong> on any scheduled session below. FlowTrack automatically tracks actual seconds, supports background audio, and keeps strict idle detection active.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <motion.div whileHover={{ scale: 1.02 }} className={`rounded-2xl bg-gradient-to-br ${getThemeGradient()} p-[2px]`}>
                  <div className="rounded-2xl bg-slate-900/90 p-4">
                    <p className="text-xs uppercase font-bold tracking-[0.18em] text-slate-400">📊 Sessions</p>
                    <p className="mt-2 text-3xl font-black text-white">{sessions.length}</p>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-[2px]">
                  <div className="rounded-2xl bg-slate-900/90 p-4">
                    <p className="text-xs uppercase font-bold tracking-[0.18em] text-slate-400">📚 Subjects</p>
                    <p className="mt-2 text-3xl font-black text-white">{subjects.length}</p>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
                  <div className="rounded-2xl bg-slate-900/90 p-4">
                    <p className="text-xs uppercase font-bold tracking-[0.18em] text-slate-400">🍅 Pomodoro</p>
                    <button
                      onClick={() => setPomodoroMode(!pomodoroMode)}
                      className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                        pomodoroMode ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/8 text-white hover:bg-white/12"
                      }`}
                    >
                      {pomodoroMode ? "✅ Active Cycles" : "❌ Disabled"}
                    </button>
                  </div>
                </motion.div>
              </div>

              {pomodoroMode && <PomodoroTimer />}
            </motion.div>
          )}
        </Panel>

        {/* Sessions List Deck */}
        <Panel className="space-y-4 shadow-2xl border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">📋 Study Schedule</h3>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
                  {dateScope === "today" ? "Today Only" : "All Dates"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Showing planned session blocks • Reschedule or clone with 1-click</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Date Scope Selector */}
              <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10">
                <button
                  onClick={() => setDateScope("today")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    dateScope === "today" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  📅 Today ({counts.all})
                </button>
                <button
                  onClick={() => setDateScope("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    dateScope === "all" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  🌐 All Dates ({sessions.length})
                </button>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1">
                {(["all", "planned", "in_progress", "completed"] as const).map((f) => {
                  const countVal = f === "all" ? counts.all : f === "planned" ? counts.planned : f === "in_progress" ? counts.active : counts.completed;
                  const label = f === "all" ? "All" : f === "in_progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1);
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                        filter === f
                          ? `bg-gradient-to-r ${getThemeGradient()} text-white shadow-md font-bold`
                          : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {label} ({countVal})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pretty-scrollbar max-h-[36rem] space-y-3 overflow-y-auto pr-1">
            {filteredSessions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-white/5 p-8 text-center">
                <p className="text-3xl">📭</p>
                <p className="mt-2 text-sm text-slate-300 font-medium">No sessions found in this view.</p>
                <p className="text-xs text-slate-500 mt-1">Use the quick presets above or the form below to plan one!</p>
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="rounded-2xl p-4 transition-all hover:bg-white/5 border border-white/5 shadow-md"
                    style={{
                      backgroundColor: `${subject?.color ?? session.colorTag}10`,
                      borderLeft: `4px solid ${subject?.color ?? session.colorTag}`,
                    }}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-base"
                            style={{ backgroundColor: `${subject?.color ?? session.colorTag}30` }}
                          >
                            {subject?.emoji || "📖"}
                          </div>
                          <p className="break-words text-sm font-bold text-white">{subject?.name ?? "Unknown Subject"}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusColor(session.status)}`}>
                            {session.status.replace("_", " ")}
                          </span>
                          {session.seriesId && (
                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] text-purple-300 font-bold">
                              🔄 Recurring
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 font-mono">
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
                              <span className={`ml-2 text-[11px] font-bold ${completion >= 80 ? "text-emerald-400" : completion >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                                ({completion}%)
                              </span>
                            )}
                          </p>
                        </div>

                        {session.notes && <p className="mt-2.5 break-words text-xs text-slate-400 italic">💬 {session.notes}</p>}

                        {Array.isArray(session.tags) && session.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {session.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-end shrink-0">
                        <div className="flex flex-wrap gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setEditingSession(session)}
                            className="rounded-lg border border-cyan-400/25 px-2.5 py-1 text-xs text-cyan-200 transition-colors hover:bg-cyan-400/10 font-medium"
                          >
                            ✏️ Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => void startSession(session.id)}
                            className={`rounded-lg bg-gradient-to-r ${getThemeGradient()} px-3.5 py-1 text-xs font-bold text-white shadow-md`}
                          >
                            ▶️ Start
                          </motion.button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleMoveNext(session)}
                            className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs text-amber-300 transition-colors hover:bg-amber-500/30 font-medium"
                          >
                            ➡️ Tomorrow
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleQuickClone(session, 1)}
                            className="rounded-lg bg-purple-500/20 px-2.5 py-1 text-xs text-purple-300 transition-colors hover:bg-purple-500/30 font-medium"
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
        <Panel className="xl:col-span-2 shadow-2xl border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">➕ Plan a Study Session</h3>
            <p className="mt-0.5 text-xs text-slate-400">Schedule custom focus blocks with exact time ranges, subjects, and tags.</p>
          </div>
          <SessionForm />
        </Panel>
      </div>

      <SessionEditor session={editingSession} open={Boolean(editingSession)} onClose={() => setEditingSession(null)} />
    </>
  );
}
