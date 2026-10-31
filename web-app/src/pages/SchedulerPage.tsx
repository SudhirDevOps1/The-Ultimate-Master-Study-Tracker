import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Star,
  Info,
  Award,
  Zap,
  Flame,
  Play,
  Sparkles,
  ShieldCheck,
  BatteryCharging,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  LayoutGrid,
  Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";
import { format, addDays, isPast, differenceInDays } from "date-fns";
import { useToast } from "@/components/common/Toast";

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface StudyGoal {
  id: string;
  subjectId: string;
  targetDate: string; // Target exam/deadline date
  totalHoursTarget: number;
  completedHours: number;
  priority?: "high" | "medium" | "low";
}

const GOALS_STORAGE_KEY = "flowtrack_study_scheduler_goals_v1";

function loadStudyGoals(): StudyGoal[] {
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStudyGoals(goals: StudyGoal[]) {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
}

export function SchedulerPage() {
  const navigate = useNavigate();
  const subjects = useAppStore((s: AppState) => s.subjects);
  const sessions = useAppStore((s: AppState) => s.sessions);
  const createSession = useAppStore((s: AppState) => s.createSession);
  const { showToast } = useToast();

  const [goals, setGoals] = useState<StudyGoal[]>(loadStudyGoals);
  const [activeTab, setActiveTab] = useState<"timeline" | "goals" | "analytics">("timeline");
  const [completedSlotKeys, setCompletedSlotKeys] = useState<Set<string>>(new Set());
  const [recoveryPaceMode, setRecoveryPaceMode] = useState<"smooth" | "sprint">("smooth");

  // New goal input
  const [selectedSubId, setSelectedSubId] = useState("");
  const [targetDateInput, setTargetDateInput] = useState("");
  const [targetHoursInput, setTargetHoursInput] = useState(20);

  // Load/save timeline
  useEffect(() => {
    saveStudyGoals(goals);
  }, [goals]);

  // Sync actual hours studied from sessions database on mount/change
  useEffect(() => {
    setGoals(prev => 
      prev.map(g => {
        const actualSeconds = sessions
          .filter(s => s.subjectId === g.subjectId && s.status === "completed")
          .reduce((sum, s) => sum + s.actualSeconds, 0);
        const actualHours = Number((actualSeconds / 3600).toFixed(1));
        return {
          ...g,
          completedHours: actualHours,
        };
      })
    );
  }, [sessions]);

  // Quick preset loader
  const handleApplyPreset = (hours: number, daysFromNow: number) => {
    setTargetHoursInput(hours);
    const target = addDays(new Date(), daysFromNow);
    setTargetDateInput(format(target, "yyyy-MM-dd"));
    showToast(`⚡ Preset applied: ${hours}h across ${daysFromNow} days`, "info");
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId || !targetDateInput || targetHoursInput <= 0) return;
    
    // Check duplicate
    if (goals.some(g => g.subjectId === selectedSubId)) {
      showToast("⚠️ Target plan already exists for this subject. Delete or update the existing one.", "warning");
      return;
    }

    const newGoal: StudyGoal = {
      id: crypto.randomUUID(),
      subjectId: selectedSubId,
      targetDate: targetDateInput,
      totalHoursTarget: Number(targetHoursInput),
      completedHours: 0,
      priority: "medium",
    };

    setGoals(prev => [...prev, newGoal]);
    setSelectedSubId("");
    setTargetDateInput("");
    showToast("🎯 Study target plan established successfully!", "success");
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    showToast("Target plan removed.", "info");
  };

  // ─── AI TIMELINE ENGINE WITH ENERGY-AWARE SLOTS ──────────────────────────────
  const dailyTimelineTasks = useMemo(() => {
    const today = new Date();
    const tasks: {
      subjectId: string;
      subjectName: string;
      emoji: string;
      color: string;
      durationMins: number;
      urgency: string;
      urgencyKey: "critical" | "warning" | "standard";
      remainingDays: number;
      remainingHours: number;
      energySlot: {
        label: string;
        tag: string;
        timeWindow: string;
        bgGradient: string;
        borderGlow: string;
      };
    }[] = [];

    const energyProfiles = [
      {
        label: "Peak Cognitive Deep Work",
        tag: "⚡ Morning Focus",
        timeWindow: "09:00 AM - 10:45 AM",
        bgGradient: "from-cyan-950/30 to-slate-900/40",
        borderGlow: "border-cyan-500/30"
      },
      {
        label: "Applied Practice & Problem Sets",
        tag: "🌿 Midday Sprint",
        timeWindow: "11:30 AM - 01:00 PM",
        bgGradient: "from-emerald-950/30 to-slate-900/40",
        borderGlow: "border-emerald-500/30"
      },
      {
        label: "Systematic Review & Consolidation",
        tag: "🎯 Afternoon Session",
        timeWindow: "02:30 PM - 04:00 PM",
        bgGradient: "from-indigo-950/30 to-slate-900/40",
        borderGlow: "border-indigo-500/30"
      },
      {
        label: "Active Recall & Flashcard Synthesis",
        tag: "🌙 Evening Recall",
        timeWindow: "05:30 PM - 07:00 PM",
        bgGradient: "from-purple-950/30 to-slate-900/40",
        borderGlow: "border-purple-500/30"
      }
    ];

    goals.forEach(goal => {
      const sub = subjects.find(s => s.id === goal.subjectId);
      if (!sub) return;

      const remainingHours = Math.max(0, goal.totalHoursTarget - goal.completedHours);
      const remainingDays = Math.max(1, differenceInDays(new Date(goal.targetDate), today));

      if (remainingHours > 0) {
        // Required minutes per day with recovery pace modifier
        let rawMins = (remainingHours / remainingDays) * 60;
        if (recoveryPaceMode === "sprint") {
          rawMins *= 1.15; // 15% catch-up sprint boost
        }
        const requiredMins = Math.round(rawMins);

        let urgency = "Standard Pace";
        let urgencyKey: "critical" | "warning" | "standard" = "standard";
        if (remainingDays <= 3) {
          urgency = "🔴 Critical Prep";
          urgencyKey = "critical";
        } else if (remainingDays <= 7) {
          urgency = "🟡 Approaching Deadline";
          urgencyKey = "warning";
        }

        if (requiredMins >= 5) {
          tasks.push({
            subjectId: sub.id,
            subjectName: sub.name,
            emoji: sub.emoji || "📚",
            color: sub.color || "#6366f1",
            durationMins: requiredMins,
            urgency,
            urgencyKey,
            remainingDays,
            remainingHours: Number(remainingHours.toFixed(1)),
            energySlot: energyProfiles[0] // fallback
          });
        }
      }
    });

    // Sort by urgency and duration descending
    const sorted = tasks.sort((a, b) => {
      if (a.urgencyKey === "critical" && b.urgencyKey !== "critical") return -1;
      if (b.urgencyKey === "critical" && a.urgencyKey !== "critical") return 1;
      return b.durationMins - a.durationMins;
    });

    // Assign sequential energy slots
    return sorted.map((task, idx) => ({
      ...task,
      energySlot: energyProfiles[idx % energyProfiles.length]
    }));
  }, [goals, subjects, recoveryPaceMode]);

  // Total daily planned study minutes
  const totalDailyStudyMins = useMemo(() => {
    return dailyTimelineTasks.reduce((sum, t) => sum + t.durationMins, 0);
  }, [dailyTimelineTasks]);

  const totalDailyStudyHours = (totalDailyStudyMins / 60).toFixed(1);

  // Dynamic Schedule Health Score (40 - 100)
  const scheduleHealthScore = useMemo(() => {
    if (goals.length === 0) return 100;
    let score = 96;

    // Daily load penalties
    const dailyHours = totalDailyStudyMins / 60;
    if (dailyHours > 8) score -= 25;
    else if (dailyHours > 6) score -= 12;

    // Deadline crunch penalties
    const criticalCount = dailyTimelineTasks.filter(t => t.urgencyKey === "critical").length;
    score -= criticalCount * 8;

    return Math.max(45, Math.min(100, score));
  }, [goals, totalDailyStudyMins, dailyTimelineTasks]);

  // Recovery Redistribution logic
  const handleTriggerRecovery = () => {
    const newMode = recoveryPaceMode === "smooth" ? "sprint" : "smooth";
    setRecoveryPaceMode(newMode);
    if (newMode === "sprint") {
      showToast("⚡ Catch-Up Sprint activated (+15% pace to recover backlog ahead of schedule).", "info");
    } else {
      showToast("🛡️ Smooth Recovery active: Evenly redistributes hours across remaining days.", "success");
    }
  };

  // 1-Click Deploy Schedule to Planned Study Sessions
  const handleDeployToSessions = async () => {
    if (dailyTimelineTasks.length === 0) {
      showToast("No active study targets to schedule. Add a target goal first!", "warning");
      return;
    }

    const today = new Date();
    const startHourSlots = [9, 11.5, 14.5, 17, 19.5];

    let count = 0;
    for (let i = 0; i < dailyTimelineTasks.length; i++) {
      const task = dailyTimelineTasks[i];
      const slotHourFloat = startHourSlots[i % startHourSlots.length];
      const startHour = Math.floor(slotHourFloat);
      const startMin = Math.round((slotHourFloat - startHour) * 60);

      const startDate = new Date(today);
      startDate.setHours(startHour, startMin, 0, 0);
      const endDate = new Date(startDate.getTime() + task.durationMins * 60 * 1000);

      try {
        await createSession({
          subjectId: task.subjectId,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          colorTag: task.color,
          notes: `AI Scheduled: ${task.energySlot.tag} • ${task.subjectName} (${task.durationMins}m)`,
          tags: ["ai-schedule", task.urgencyKey]
        });
        count++;
      } catch (err) {
        console.error("Failed to deploy slot:", err);
      }
    }

    showToast(`🚀 Successfully deployed ${count} study block${count > 1 ? "s" : ""} to your timeline!`, "success");
  };

  // Launch a slot immediately in the Focus Timer
  const handleLaunchInTimer = (task: typeof dailyTimelineTasks[0]) => {
    try {
      localStorage.setItem("flowtrack_active_task_goal", `${task.subjectName}: ${task.energySlot.tag} (${task.durationMins}m focus)`);
    } catch {}
    showToast(`⏱️ Launching ${task.subjectName} session in Focus Timer...`, "info");
    navigate("/timer");
  };

  // Toggle slot completion visual check
  const toggleSlotCompletion = (slotKey: string) => {
    setCompletedSlotKeys(prev => {
      const next = new Set(prev);
      if (next.has(slotKey)) {
        next.delete(slotKey);
      } else {
        next.add(slotKey);
        showToast("✅ Study slot marked as completed!", "success");
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ─── Modern Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Clock className="h-5 w-5" />
            </span>
            AI Study Scheduler & Timeline Matrix
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Dynamic, energy-aware timeblocking that balances syllabus targets and prevents burnout.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTriggerRecovery}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
              recoveryPaceMode === "sprint"
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10"
                : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-cyan-300"
            }`}
            title="Recalculate pace and redistribute remaining hours"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recoveryPaceMode === "sprint" ? "animate-spin" : ""}`} />
            <span>{recoveryPaceMode === "sprint" ? "⚡ Catch-Up Sprint (+15%)" : "🛡️ Recovery Mode"}</span>
          </button>

          <button
            onClick={handleDeployToSessions}
            disabled={dailyTimelineTasks.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Deploy Schedule</span>
          </button>
        </div>
      </div>

      {/* ─── Top Stats & Burnout Health Bar ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Daily Planned Load</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">{totalDailyStudyHours} <span className="text-xs font-normal text-slate-400">hours/day</span></div>
          <div className="text-[10px] text-slate-500 mt-0.5">{dailyTimelineTasks.length} active focus slots</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Schedule Health</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{scheduleHealthScore}<span className="text-xs text-slate-400 font-normal"> / 100</span></div>
          <div className="text-[10px] text-slate-500 mt-0.5">{scheduleHealthScore >= 80 ? "Optimal workload balance" : "High pace demand"}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Target Goals</span>
            <Award className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">{goals.length} <span className="text-xs text-slate-400 font-normal">configured</span></div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tracked dynamically</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pace Strategy</span>
            <BatteryCharging className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-white capitalize mt-1 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${recoveryPaceMode === "sprint" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            {recoveryPaceMode === "sprint" ? "Catch-Up Sprint" : "Balanced Flow"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Adaptive recovery active</div>
        </div>
      </div>

      {/* ─── Navigation View Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "timeline"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Daily Adaptive Timeline ({dailyTimelineTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("goals")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "goals"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Target Goals & Exams ({goals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "analytics"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Workload & Burnout Balance</span>
        </button>
      </div>

      {/* ─── TAB 1: DAILY ADAPTIVE TIMELINE ───────────────────────── */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          <Panel className="space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  Today's AI Energy-Aware Study Timeline
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological study slots optimized for circadian cognitive retention.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {completedSlotKeys.size} of {dailyTimelineTasks.length} slots completed
                </span>
              </div>
            </div>

            {dailyTimelineTasks.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-2xl text-cyan-400">
                  🗓️
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-300">Your Study Timeline is Clear</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Configure your subject target hours and exam dates in the Targets tab to automatically generate an optimal study timeline.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("goals")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-lg shadow-cyan-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Configure First Target Plan
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {dailyTimelineTasks.map((task, idx) => {
                  const slotKey = `${task.subjectId}-${idx}`;
                  const isDone = completedSlotKeys.has(slotKey);

                  return (
                    <motion.div
                      key={slotKey}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative rounded-2xl border p-4 transition-all ${
                        isDone
                          ? "bg-slate-950/40 border-white/5 opacity-60"
                          : `bg-gradient-to-r ${task.energySlot.bgGradient} ${task.energySlot.borderGlow} shadow-lg shadow-black/20`
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Completion checkbox button */}
                          <button
                            onClick={() => toggleSlotCompletion(slotKey)}
                            className={`mt-1 h-6 w-6 rounded-lg flex items-center justify-center border transition-all ${
                              isDone
                                ? "bg-emerald-500 border-emerald-400 text-slate-950"
                                : "bg-slate-900 border-white/20 text-transparent hover:border-cyan-400"
                            }`}
                            title="Mark slot as complete"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          {/* Slot Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-lg">{task.emoji}</span>
                              <span className={`text-sm font-bold text-white ${isDone ? "line-through text-slate-400" : ""}`}>
                                {task.subjectName} Focus Block
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 border border-white/10">
                                {task.energySlot.timeWindow}
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                                {task.energySlot.tag}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 flex items-center gap-2">
                              <span><strong>{task.durationMins} mins</strong> recommended today</span>
                              <span>•</span>
                              <span>{task.remainingHours}h remaining total</span>
                              <span>•</span>
                              <span className={task.urgencyKey === "critical" ? "text-rose-400 font-bold" : "text-slate-400"}>
                                {task.remainingDays} days to target
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleLaunchInTimer(task)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-all active:scale-95 shadow-sm"
                            title="Open in Study Timer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Start Now</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ─── TAB 2: TARGET GOALS & EXAMS ─────────────────────────── */}
      {activeTab === "goals" && (
        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          {/* Target Creator Form */}
          <Panel className="space-y-4">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-400" />
                Configure Subject Target Plan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set a target study volume and deadline for any course or exam.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Goal Presets:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(15, 7)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-white/5 text-[11px] text-slate-300 transition-all"
                >
                  ⚡ Sprint (15h / 7d)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(40, 21)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-white/5 text-[11px] text-slate-300 transition-all"
                >
                  🎯 Mastery (40h / 21d)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(80, 45)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-white/5 text-[11px] text-slate-300 transition-all"
                >
                  🏆 Finals Prep (80h / 45d)
                </button>
              </div>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-3.5 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Subject</label>
                <select
                  value={selectedSubId}
                  onChange={e => setSelectedSubId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">Select a subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Target Date / Exam Deadline</label>
                <input
                  type="date"
                  value={targetDateInput}
                  min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                  onChange={e => setTargetDateInput(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Total Target Study Hours</label>
                <input
                  type="number"
                  value={targetHoursInput}
                  min={1}
                  max={500}
                  onChange={e => setTargetHoursInput(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-cyan-600/20 active:scale-95"
              >
                Establish Target Plan
              </button>
            </form>
          </Panel>

          {/* Active Goals List */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-cyan-400" />
                Active Target Progress ({goals.length})
              </h3>
            </div>

            {goals.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No active targets set. Create your first subject goal on the left to start auto-scheduling.
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map(goal => {
                  const sub = subjects.find(s => s.id === goal.subjectId);
                  const progressPct = goal.totalHoursTarget > 0 ? Math.min(100, Math.round((goal.completedHours / goal.totalHoursTarget) * 100)) : 0;
                  const remainingDays = differenceInDays(new Date(goal.targetDate), new Date());

                  return (
                    <div
                      key={goal.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{sub?.emoji || "📚"}</span>
                            <span className="text-sm font-bold text-white">{sub?.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Target Date: <strong>{format(new Date(goal.targetDate), "d MMM yyyy")}</strong> ({Math.max(0, remainingDays)} days left)
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete target plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>{goal.completedHours}h completed / {goal.totalHoursTarget}h target</span>
                          <span className="font-mono font-bold text-cyan-400">{progressPct}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              backgroundColor: sub?.color || "#06b6d4",
                              width: `${progressPct}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ─── TAB 3: WORKLOAD & BURNOUT BALANCE ────────────────────── */}
      {activeTab === "analytics" && (
        <div className="grid gap-5 md:grid-cols-2">
          {/* Burnout Defense Gauge */}
          <Panel className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Cognitive Workload & Burnout Defense
            </h3>
            
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Planned Study Load:</span>
                <span className="font-bold text-white text-sm">{totalDailyStudyHours} hrs / day</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    Number(totalDailyStudyHours) > 7
                      ? "bg-rose-500"
                      : Number(totalDailyStudyHours) > 5
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`} 
                  style={{ width: `${Math.min(100, (Number(totalDailyStudyHours) / 8) * 100)}%` }} 
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {Number(totalDailyStudyHours) > 7 ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    High cognitive overload risk. Consider spacing out your target dates.
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Optimal workload pace. Maintains long-term focus and retention.
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Circadian Scheduling:</strong> Heavy analytical topics are automatically placed in morning slots when prefrontal cortex energy is highest.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Dynamic Recovery:</strong> If a session is missed, Recovery Mode recalculates the exact minutes required to keep you on schedule without stress.
                </span>
              </div>
            </div>
          </Panel>

          {/* AI Insights & Recommendation Deck */}
          <Panel className="space-y-4 bg-gradient-to-br from-indigo-950/20 to-slate-900/40 border-indigo-500/20">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-400" />
              AI Schedule Health & Optimization Tips
            </h3>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">Schedule Health Rating:</span>
                <span className="font-bold text-emerald-400 text-sm">{scheduleHealthScore} / 100</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all" 
                  style={{ width: `${scheduleHealthScore}%` }} 
                />
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                  1-Click Schedule Deployment
                </p>
                <p className="text-[11px] text-slate-400">
                  Click <strong>Deploy Schedule</strong> at the top to instantly write all calculated focus blocks into your planned study calendar. FlowTrack will notify you before each block starts!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  Exam Countdown Alerts
                </p>
                <p className="text-[11px] text-slate-400">
                  When a target deadline is within 3 days, it automatically receives a <strong>🔴 Critical Prep</strong> badge to ensure maximum priority.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
