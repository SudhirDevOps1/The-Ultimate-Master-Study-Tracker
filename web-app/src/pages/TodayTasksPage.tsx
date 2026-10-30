import { useMemo, useState, useEffect, useRef } from "react";
import { isSameDay, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, Target, Calendar, ChevronRight, Play, AlertCircle,
  Plus, Trash2, CheckSquare, Square, Zap, Search, Flame, Edit2, X,
  CheckCheck, ArrowUpDown, Filter, Sparkles
} from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { StudySession, Task } from "@/types/models";
import { toDurationLabel } from "@/utils/time";
import { Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";

export function TodayTasksPage() {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const dailyGoalHours = useAppStore((state: AppState) => state.dailyGoalHours);
  const timer = useAppStore((state: AppState) => state.timer);
  const updateSession = useAppStore((state: AppState) => state.updateSession);

  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // View & Filter States
  const [viewMode, setViewMode] = useState<"list" | "matrix">(() => {
    return (localStorage.getItem("flowtrack_tasks_view_mode") as "list" | "matrix") || "list";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "planned" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Custom Tasks State
  const [customTasks, setCustomTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskMins, setNewTaskMins] = useState(25);
  const [newTaskSubject, setNewTaskSubject] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");

  // Inline Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMins, setEditMins] = useState(25);

  // Eisenhower Quadrants State
  const [quadrants, setQuadrants] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("flowtrack_eisenhower_quadrants");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const today = useMemo(() => {
    const now = new Date();
    return sessions.filter((session: StudySession) => isSameDay(new Date(session.startTime), now));
  }, [sessions]);

  const todayDate = useMemo(() => format(new Date(), "EEEE, MMMM dd, yyyy"), []);

  const loadTasks = async () => {
    try {
      const items = await db.tasks.toArray();
      setCustomTasks(items);
    } catch {}
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Keyboard shortcut: '/' focuses search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleViewMode = (mode: "list" | "matrix") => {
    setViewMode(mode);
    localStorage.setItem("flowtrack_tasks_view_mode", mode);
  };

  const handleUpdateQuadrant = (itemId: string, quad: string) => {
    const next = { ...quadrants, [itemId]: quad };
    setQuadrants(next);
    try {
      localStorage.setItem("flowtrack_eisenhower_quadrants", JSON.stringify(next));
    } catch {}
  };

  // Add micro-task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: "task-" + Date.now(),
      title: newTaskTitle.trim(),
      subjectId: newTaskSubject || undefined,
      estimatedMinutes: newTaskMins || 25,
      actualMinutes: 0,
      status: "todo",
      priority: newTaskPriority,
      createdAt: new Date().toISOString(),
    };
    await db.tasks.add(task);
    setNewTaskTitle("");
    setNewTaskMins(25);
    loadTasks();
  };

  // Toggle micro-task status
  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    await db.tasks.update(task.id, {
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date().toISOString() : undefined,
    });
    loadTasks();
  };

  // Save inline task edit
  const handleSaveEditTask = async (id: string) => {
    if (!editTitle.trim()) return;
    await db.tasks.update(id, {
      title: editTitle.trim(),
      estimatedMinutes: editMins || 25
    });
    setEditingTaskId(null);
    loadTasks();
  };

  const handleDeleteTask = async (id: string) => {
    await db.tasks.delete(id);
    loadTasks();
  };

  // Batch actions
  const handleBatchCompleteAllTasks = async () => {
    const uncompleted = customTasks.filter(t => t.status !== "completed");
    for (const t of uncompleted) {
      await db.tasks.update(t.id, {
        status: "completed",
        completedAt: new Date().toISOString()
      });
    }
    loadTasks();
  };

  const handleClearCompletedTasks = async () => {
    const completed = customTasks.filter(t => t.status === "completed");
    for (const t of completed) {
      await db.tasks.delete(t.id);
    }
    loadTasks();
  };

  // Hand off task to focus timer
  const handleHandOffToTimer = (task: Task) => {
    try {
      localStorage.setItem("flowtrack_timer_task_hand_off", JSON.stringify({
        taskId: task.id,
        title: task.title,
        subjectId: task.subjectId,
        plannedMinutes: task.estimatedMinutes || 25,
      }));
    } catch {}
    navigate("/timer");
  };

  // Quick toggle session status
  const handleToggleSessionComplete = async (session: StudySession) => {
    const isCompleted = session.status === "completed";
    await updateSession({
      ...session,
      status: isCompleted ? "planned" : "completed",
      actualSeconds: isCompleted ? 0 : Math.max(session.actualSeconds, session.plannedMinutes * 60)
    });
  };

  // Subjects helpers
  const getSubject = (subjectId?: string) => subjects.find(s => s.id === subjectId);
  const getSubjectName = (subjectId?: string) => getSubject(subjectId)?.name || "General Study";
  const getSubjectColor = (subjectId?: string) => getSubject(subjectId)?.color || "#06b6d4";
  const getSubjectEmoji = (subjectId?: string) => getSubject(subjectId)?.emoji || "📚";

  // Comprehensive Daily Stats & Remaining Workload
  const stats = useMemo(() => {
    const actualSeconds = today.reduce((sum, s) => sum + s.actualSeconds, 0);
    const plannedMinutes = today.reduce((sum, s) => sum + s.plannedMinutes, 0);
    const completedSessions = today.filter(s => s.status === "completed").length;
    const inProgressSessions = today.filter(s => s.status === "in_progress").length;
    const plannedSessions = today.filter(s => s.status === "planned").length;
    const pausedSessions = today.filter(s => s.status === "paused").length;

    const completedTasks = customTasks.filter(t => t.status === "completed").length;
    const pendingTasks = customTasks.filter(t => t.status !== "completed");
    const remainingTaskMins = pendingTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 25), 0);
    const remainingSessionMins = today.filter(s => s.status === "planned").reduce((sum, s) => sum + s.plannedMinutes, 0);
    const totalRemainingMinutes = remainingTaskMins + remainingSessionMins;

    const totalItems = today.length + customTasks.length;
    const totalCompleted = completedSessions + completedTasks;
    const goalMins = Math.max(1, (dailyGoalHours || 4) * 60);

    return {
      actualSeconds,
      actualMinutes: Math.round(actualSeconds / 60),
      actualHours: (actualSeconds / 3600).toFixed(1),
      plannedMinutes,
      plannedHours: (plannedMinutes / 60).toFixed(1),
      completedSessions,
      inProgressSessions,
      plannedSessions,
      pausedSessions,
      completedTasks,
      totalTasks: customTasks.length,
      totalItems,
      totalCompleted,
      totalRemainingMinutes,
      remainingHoursLabel: toDurationLabel(totalRemainingMinutes),
      goalMinutes: goalMins,
      progress: Math.min(100, Math.round(((actualSeconds / 60) / goalMins) * 100)) || 0,
      completionRate: totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
    };
  }, [today, customTasks, dailyGoalHours]);

  // Filtered Sessions & Tasks
  const filteredSessions = useMemo(() => {
    return today.filter(session => {
      const sub = getSubject(session.subjectId);
      const matchesSearch = !searchQuery.trim() || 
        sub?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.notes && session.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSubject = selectedSubjectId === "all" || session.subjectId === selectedSubjectId;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && (session.status === "in_progress" || session.status === "paused")) ||
        (statusFilter === "planned" && session.status === "planned") ||
        (statusFilter === "completed" && session.status === "completed");

      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [today, searchQuery, selectedSubjectId, statusFilter, subjects]);

  const filteredTasks = useMemo(() => {
    return customTasks.filter(task => {
      const sub = getSubject(task.subjectId);
      const matchesSearch = !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub && sub.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSubject = selectedSubjectId === "all" || task.subjectId === selectedSubjectId;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && task.status === "in_progress") ||
        (statusFilter === "planned" && task.status === "todo") ||
        (statusFilter === "completed" && task.status === "completed");
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

      return matchesSearch && matchesSubject && matchesStatus && matchesPriority;
    });
  }, [customTasks, searchQuery, selectedSubjectId, statusFilter, priorityFilter, subjects]);

  const groupedSessions = useMemo(() => {
    return {
      active: filteredSessions.filter(s => s.status === "in_progress"),
      paused: filteredSessions.filter(s => s.status === "paused"),
      planned: filteredSessions.filter(s => s.status === "planned"),
      completed: filteredSessions.filter(s => s.status === "completed")
    };
  }, [filteredSessions]);

  return (
    <div className="min-h-screen space-y-6 pb-16">
      {/* Sticky Header with Date & View Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 space-y-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 py-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  Today&apos;s <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Tasks & Focus Hub</span>
                </h1>
                <p className="text-xs font-medium text-slate-400">{todayDate}</p>
              </div>
            </div>
          </div>

          {/* View Switcher Segment */}
          <div className="flex items-center gap-2">
            <div className="f7-segmented bg-slate-900 border border-white/10 p-1 rounded-xl flex items-center">
              <button
                onClick={() => handleToggleViewMode("list")}
                className={`f7-segmented-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "list" ? "bg-cyan-500 text-slate-950 shadow-md active" : "text-slate-400 hover:text-white"
                }`}
              >
                List View
              </button>
              <button
                onClick={() => handleToggleViewMode("matrix")}
                className={`f7-segmented-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "matrix" ? "bg-cyan-500 text-slate-950 shadow-md active" : "text-slate-400 hover:text-white"
                }`}
              >
                Eisenhower Matrix
              </button>
            </div>
          </div>
        </div>

        {/* Backlog Carry Forward Handler */}
        <BacklogCarryForwardPanel />

        {/* Executive KPI Progress Deck */}
        <Panel className="bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-cyan-950/20 border-cyan-500/20 shadow-xl p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Completion</span>
              </div>
              <p className="text-2xl font-black text-emerald-400">
                {stats.totalCompleted} <span className="text-xs font-normal text-slate-500">/ {stats.totalItems} done</span>
              </p>
              <p className="text-[11px] text-slate-400">{stats.completionRate}% achieved today</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Focus Logged</span>
              </div>
              <p className="text-2xl font-black text-cyan-400">
                {stats.actualHours}h <span className="text-xs font-normal text-slate-500">of {dailyGoalHours}h goal</span>
              </p>
              <p className="text-[11px] text-slate-400">planned: {stats.plannedHours}h</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Remaining Workload</span>
              </div>
              <p className="text-2xl font-black text-amber-400">
                {stats.totalRemainingMinutes > 0 ? stats.remainingHoursLabel : "All Clear! 🎉"}
              </p>
              <p className="text-[11px] text-slate-400">uncompleted blocks</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Focus Efficiency</span>
              </div>
              <p className="text-2xl font-black text-purple-400">
                {stats.plannedMinutes > 0
                  ? `${Math.min(100, Math.round((stats.actualMinutes / stats.plannedMinutes) * 100))}%`
                  : "100%"}
              </p>
              <p className="text-[11px] text-slate-400">actual vs planned</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800 border border-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          {/* Focus Tip */}
          {stats.totalItems > 0 && stats.actualMinutes < stats.plannedMinutes * 0.5 && (
            <div className="mt-3.5 pt-3 border-t border-white/5 flex items-start gap-2 text-[11px] text-amber-400/90 leading-relaxed">
              <span className="shrink-0">💡</span>
              <span>
                Focus tip: Your actual study time is currently below planned block durations. Use **Strict Focus Mode** in the Timer to minimize context switching.
              </span>
            </div>
          )}
        </Panel>

        {/* Live Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks, sessions, or notes... (Press '/' to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Segment */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 pretty-scrollbar">
            {(["all", "active", "planned", "completed"] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                    : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {st === "all" ? "All Status" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Filter Chips */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pretty-scrollbar">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Subject:</span>
            <button
              onClick={() => setSelectedSubjectId("all")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                selectedSubjectId === "all"
                  ? "bg-white/15 text-white border border-white/20 font-bold shadow-sm"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              All Subjects
            </button>
            {subjects.map(s => {
              const isSelected = selectedSubjectId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubjectId(s.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? "ring-1 ring-cyan-400 bg-cyan-500/15 text-white font-bold"
                      : "bg-slate-900 border border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{s.emoji || "📚"}</span>
                  <span style={{ color: isSelected ? "#38bdf8" : s.color }}>{s.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Main View Layout */}
      {viewMode === "list" ? (
        <div className="space-y-6">
          {/* Active / In Progress Sessions */}
          {groupedSessions.active.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-cyan-300">
                <Play className="h-4 w-4" />
                Currently Active Session
              </h2>
              {groupedSessions.active.map((session, idx) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  subjectName={getSubjectName(session.subjectId)}
                  subjectColor={getSubjectColor(session.subjectId)}
                  subjectEmoji={getSubjectEmoji(session.subjectId)}
                  isActive={timer.activeSessionId === session.id}
                  index={idx}
                  onToggleComplete={() => handleToggleSessionComplete(session)}
                />
              ))}
            </motion.div>
          )}

          {/* Paused Sessions */}
          {groupedSessions.paused.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-amber-300">
                <AlertCircle className="h-4 w-4" />
                Paused Sessions ({groupedSessions.paused.length})
              </h2>
              {groupedSessions.paused.map((session, idx) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  subjectName={getSubjectName(session.subjectId)}
                  subjectColor={getSubjectColor(session.subjectId)}
                  subjectEmoji={getSubjectEmoji(session.subjectId)}
                  isPaused
                  index={idx}
                  onToggleComplete={() => handleToggleSessionComplete(session)}
                />
              ))}
            </motion.div>
          )}

          {/* Upcoming Planned Sessions */}
          {groupedSessions.planned.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-200">
                <Target className="h-4 w-4 text-cyan-400" />
                Scheduled Study Blocks ({groupedSessions.planned.length})
              </h2>
              {groupedSessions.planned.map((session, idx) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  subjectName={getSubjectName(session.subjectId)}
                  subjectColor={getSubjectColor(session.subjectId)}
                  subjectEmoji={getSubjectEmoji(session.subjectId)}
                  index={idx}
                  onToggleComplete={() => handleToggleSessionComplete(session)}
                />
              ))}
            </motion.div>
          )}

          {/* Completed Sessions */}
          {groupedSessions.completed.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Completed Sessions ({groupedSessions.completed.length})
              </h2>
              {groupedSessions.completed.map((session, idx) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  subjectName={getSubjectName(session.subjectId)}
                  subjectColor={getSubjectColor(session.subjectId)}
                  subjectEmoji={getSubjectEmoji(session.subjectId)}
                  isCompleted
                  index={idx}
                  onToggleComplete={() => handleToggleSessionComplete(session)}
                />
              ))}
            </motion.div>
          )}
        </div>
      ) : (
        /* Eisenhower Matrix View */
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Q1: Urgent & Important */}
          <Panel className="border-rose-500/20 bg-rose-500/5 space-y-3 shadow-lg">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🔥</span> Urgent & Important (Do First)
              </span>
              <span className="text-[10px] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                Q1 ({today.filter(s => quadrants[s.id] === "Q1").length})
              </span>
            </h3>
            <div className="space-y-2">
              {today.filter(s => quadrants[s.id] === "Q1").map((session) => (
                <SessionCardMini
                  key={session.id}
                  session={session}
                  currentQuadrant={quadrants[session.id] || "Q2"}
                  onMove={(q) => handleUpdateQuadrant(session.id, q)}
                />
              ))}
              {today.filter(s => quadrants[s.id] === "Q1").length === 0 && (
                <p className="text-[11px] text-slate-600 italic py-3 text-center">No Q1 high-urgency items</p>
              )}
            </div>
          </Panel>

          {/* Q2: Important but Not Urgent */}
          <Panel className="border-indigo-500/20 bg-indigo-500/5 space-y-3 shadow-lg">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📚</span> Important, Not Urgent (Schedule)
              </span>
              <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                Q2 ({today.filter(s => !quadrants[s.id] || quadrants[s.id] === "Q2").length})
              </span>
            </h3>
            <div className="space-y-2">
              {today.filter(s => !quadrants[s.id] || quadrants[s.id] === "Q2").map((session) => (
                <SessionCardMini
                  key={session.id}
                  session={session}
                  currentQuadrant={quadrants[session.id] || "Q2"}
                  onMove={(q) => handleUpdateQuadrant(session.id, q)}
                />
              ))}
              {today.filter(s => !quadrants[s.id] || quadrants[s.id] === "Q2").length === 0 && (
                <p className="text-[11px] text-slate-600 italic py-3 text-center">No Q2 study items</p>
              )}
            </div>
          </Panel>

          {/* Q3: Urgent & Not Important */}
          <Panel className="border-amber-500/20 bg-amber-500/5 space-y-3 shadow-lg">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>⚡</span> Urgent, Not Important (Delegate/Quick)
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                Q3 ({today.filter(s => quadrants[s.id] === "Q3").length})
              </span>
            </h3>
            <div className="space-y-2">
              {today.filter(s => quadrants[s.id] === "Q3").map((session) => (
                <SessionCardMini
                  key={session.id}
                  session={session}
                  currentQuadrant={quadrants[session.id] || "Q2"}
                  onMove={(q) => handleUpdateQuadrant(session.id, q)}
                />
              ))}
              {today.filter(s => quadrants[s.id] === "Q3").length === 0 && (
                <p className="text-[11px] text-slate-600 italic py-3 text-center">No Q3 tasks prioritized</p>
              )}
            </div>
          </Panel>

          {/* Q4: Not Urgent & Not Important */}
          <Panel className="border-emerald-500/20 bg-emerald-500/5 space-y-3 shadow-lg">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🌱</span> Not Urgent & Not Important (Low Priority)
              </span>
              <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                Q4 ({today.filter(s => quadrants[s.id] === "Q4").length})
              </span>
            </h3>
            <div className="space-y-2">
              {today.filter(s => quadrants[s.id] === "Q4").map((session) => (
                <SessionCardMini
                  key={session.id}
                  session={session}
                  currentQuadrant={quadrants[session.id] || "Q2"}
                  onMove={(q) => handleUpdateQuadrant(session.id, q)}
                />
              ))}
              {today.filter(s => quadrants[s.id] === "Q4").length === 0 && (
                <p className="text-[11px] text-slate-600 italic py-3 text-center">No Q4 low-priority tasks</p>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Task Backlog & Micro-Task Studio */}
      <Panel className="p-6 space-y-5 border-white/10 bg-slate-900/60 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Daily Micro-Task Studio & Timeboxer
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rapidly capture actionable tasks, assign focus blocks, and hand off straight to the Pomodoro timer.
            </p>
          </div>

          {/* Batch Actions Toolbar */}
          {customTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchCompleteAllTasks}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 flex items-center gap-1 transition-colors"
                title="Mark all tasks as completed"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Done</span>
              </button>
              <button
                type="button"
                onClick={handleClearCompletedTasks}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 text-xs font-medium hover:bg-rose-500/10 flex items-center gap-1 transition-colors"
                title="Clear finished tasks"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Done</span>
              </button>
            </div>
          )}
        </div>

        {/* Omni Quick-Add Form */}
        <form onSubmit={handleAddTask} className="space-y-3 bg-slate-950/60 border border-white/5 p-3.5 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="What do you want to accomplish next? (e.g. Solve 10 calculus problems)"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            {/* Duration chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Duration:</span>
              {[15, 25, 45, 60].map(mins => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setNewTaskMins(mins)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors ${
                    newTaskMins === mins
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {mins}m
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={180}
                step={5}
                value={newTaskMins}
                onChange={e => setNewTaskMins(parseInt(e.target.value, 10) || 25)}
                className="w-14 bg-slate-900 border border-white/10 rounded-lg px-1.5 py-0.5 text-[11px] text-center text-white font-mono outline-none focus:border-cyan-400"
              />
            </div>

            {/* Priority & Subject selects */}
            <div className="flex items-center gap-2">
              <select
                value={newTaskPriority}
                onChange={e => setNewTaskPriority(e.target.value as any)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-cyan-400"
              >
                <option value="high">🔥 High Priority</option>
                <option value="medium">⚡ Medium Priority</option>
                <option value="low">🌱 Low Priority</option>
              </select>

              <select
                value={newTaskSubject}
                onChange={e => setNewTaskSubject(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-cyan-400 max-w-[140px] truncate"
              >
                <option value="">No Subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Task List */}
        {filteredTasks.length > 0 ? (
          <div className="divide-y divide-white/5 pt-1 space-y-2">
            <AnimatePresence>
              {filteredTasks.map(t => {
                const subj = getSubject(t.subjectId);
                const isDone = t.status === "completed";
                const isEditing = editingTaskId === t.id;

                const priorityStyles: Record<string, { badge: string; label: string }> = {
                  high: { badge: "bg-rose-500/15 border-rose-500/30 text-rose-300", label: "🔥 High" },
                  medium: { badge: "bg-amber-500/15 border-amber-500/30 text-amber-300", label: "⚡ Med" },
                  low: { badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300", label: "🌱 Low" },
                };
                const priority = priorityStyles[t.priority || "medium"];

                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 group"
                  >
                    {/* Left: Checkbox & Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t)}
                        className="text-slate-400 hover:text-cyan-400 transition-colors shrink-0 p-1"
                        title={isDone ? "Mark incomplete" : "Mark completed"}
                      >
                        {isDone ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 hover:text-cyan-400" />
                        )}
                      </button>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="flex-1 bg-slate-950 border border-cyan-400 rounded-lg px-2 py-1 text-xs text-white outline-none"
                            autoFocus
                          />
                          <input
                            type="number"
                            min={5}
                            max={180}
                            step={5}
                            value={editMins}
                            onChange={e => setEditMins(parseInt(e.target.value, 10) || 25)}
                            className="w-14 bg-slate-950 border border-cyan-400 rounded-lg px-1.5 py-1 text-xs text-center text-white font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditTask(t.id)}
                            className="px-2 py-1 rounded bg-cyan-500 text-slate-950 text-[10px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="px-2 py-1 rounded bg-white/10 text-white text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <p
                            onClick={() => {
                              setEditingTaskId(t.id);
                              setEditTitle(t.title);
                              setEditMins(t.estimatedMinutes || 25);
                            }}
                            className={`text-xs font-medium truncate cursor-pointer hover:underline ${
                              isDone ? "line-through text-slate-500" : "text-white"
                            }`}
                            title="Click to edit task"
                          >
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${priority.badge}`}>
                              {priority.label}
                            </span>
                            {subj && (
                              <span className="font-semibold flex items-center gap-1" style={{ color: subj.color || "#06b6d4" }}>
                                <span>{subj.emoji}</span>
                                <span>{subj.name}</span>
                              </span>
                            )}
                            <span className="font-mono">{t.estimatedMinutes || 25}m est.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => handleHandOffToTimer(t)}
                          className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                          title="Start Focus Timer on this task"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start Focus</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(t.id);
                          setEditTitle(t.title);
                          setEditMins(t.estimatedMinutes || 25);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            {customTasks.length === 0 ? "No micro-tasks added yet. Add one above!" : "No tasks match your active filters."}
          </div>
        )}
      </Panel>

      {/* Empty State when no sessions planned */}
      {today.length === 0 && customTasks.length === 0 && (
        <Panel className="border-slate-800 bg-slate-900/40 text-center py-12 shadow-xl">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <p className="text-lg font-bold text-white">No tasks or sessions scheduled for today</p>
          <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto">
            Plan study blocks in the Calendar or add instant micro-tasks in the Task Studio above.
          </p>
          <Link
            to="/calendar"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 shadow-lg transition-transform active:scale-95"
          >
            Go to Calendar
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Panel>
      )}
    </div>
  );
}

// Session Card with Quick-Complete & Focus Handoff
function SessionCard({
  session,
  subjectName,
  subjectColor,
  subjectEmoji,
  isActive,
  isPaused,
  isCompleted,
  index,
  onToggleComplete
}: {
  session: StudySession;
  subjectName: string;
  subjectColor: string;
  subjectEmoji: string;
  isActive?: boolean;
  isPaused?: boolean;
  isCompleted?: boolean;
  index: number;
  onToggleComplete: () => void;
}) {
  const startTime = format(new Date(session.startTime), "h:mm a");
  const endTime = format(new Date(session.endTime), "h:mm a");
  const actualTime = toDurationLabel(Math.round(session.actualSeconds / 60));
  const plannedTime = toDurationLabel(session.plannedMinutes);

  const statusColor = isActive
    ? "border-cyan-500/50 bg-cyan-950/20 shadow-cyan-500/10 shadow-lg"
    : isPaused
    ? "border-amber-500/40 bg-amber-950/20"
    : isCompleted
    ? "border-emerald-500/40 bg-emerald-950/15"
    : "border-white/10 bg-slate-900/40 hover:border-cyan-500/30";

  const statusBadge = isActive
    ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300"
    : isPaused
    ? "bg-amber-500/20 border border-amber-400/40 text-amber-300"
    : isCompleted
    ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
    : "bg-white/5 border border-white/10 text-slate-400";

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Panel className={`group border transition-all p-4 rounded-2xl ${statusColor}`}>
        <div className="flex items-center justify-between gap-4">
          {/* Quick-Complete Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleComplete();
            }}
            className="p-1 text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
            title={isCompleted ? "Mark session incomplete" : "Quick complete session"}
          >
            {isCompleted ? (
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            ) : (
              <Square className="w-5 h-5 hover:text-cyan-400" />
            )}
          </button>

          {/* Left: Subject Info */}
          <Link to={`/timer#${session.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="text-3xl flex-shrink-0">{subjectEmoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                {subjectName}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <Clock className="h-3 w-3 text-cyan-400" />
                <span>{startTime} - {endTime}</span>
              </div>
              {session.notes && (
                <p className="mt-1.5 text-xs text-slate-400 line-clamp-1 italic">{session.notes}</p>
              )}
            </div>
          </Link>

          {/* Center & Right: Time Info */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}>
              {isActive ? "Active Now" : isPaused ? "Paused" : isCompleted ? "Completed" : "Planned"}
            </span>
            <div className="text-right">
              <p className="text-xs font-bold text-cyan-300 font-mono">{actualTime}</p>
              <p className="text-[10px] text-slate-500 font-mono">plan: {plannedTime}</p>
            </div>
          </div>

          {/* Right: Quick Start Link */}
          <Link
            to={`/timer#${session.id}`}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-400/40 transition-all shrink-0"
            title="Open Focus Timer"
          >
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Panel>
    </motion.div>
  );
}

// Mini Session Card for Eisenhower Matrix View
function SessionCardMini({
  session,
  currentQuadrant,
  onMove
}: {
  session: StudySession;
  currentQuadrant: string;
  onMove: (q: string) => void;
}) {
  const subjects = useAppStore((state: AppState) => state.subjects);
  const sub = subjects.find(s => s.id === session.subjectId);
  const startTime = format(new Date(session.startTime), "h:mm a");
  const statusColors: Record<string, string> = {
    completed: "border-emerald-500/30 bg-emerald-900/10",
    in_progress: "border-cyan-500/30 bg-cyan-900/10",
    paused: "border-amber-500/30 bg-amber-900/10",
    planned: "border-white/5 bg-slate-900/40",
  };

  return (
    <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${statusColors[session.status] ?? "border-white/5 bg-slate-900/40"}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-lg shrink-0">{sub?.emoji || "📚"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">{sub?.name || "Study Session"}</p>
          <span className="text-[9px] text-slate-400 font-mono">{startTime} • {toDurationLabel(session.plannedMinutes)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <select
          value={currentQuadrant}
          onChange={(e) => onMove(e.target.value)}
          className="bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 text-[8px] font-bold text-slate-300 outline-none cursor-pointer"
        >
          <option value="Q1">🔥 Q1: Urgent & Important</option>
          <option value="Q2">📚 Q2: Important, Not Urgent</option>
          <option value="Q3">⚡ Q3: Urgent, Not Important</option>
          <option value="Q4">🌱 Q4: Low Priority</option>
        </select>
        <Link to={`/timer#${session.id}`} className="text-[9px] text-cyan-400 font-bold hover:underline whitespace-nowrap">
          Start →
        </Link>
      </div>
    </div>
  );
}

// Backlog carry forward component
function BacklogCarryForwardPanel() {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const updateSession = useAppStore((state: AppState) => state.updateSession);
  const initApp = useAppStore((state: AppState) => state.initApp);
  const [isDismissed, setIsDismissed] = useState(false);

  const overdue = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return sessions.filter((s: StudySession) => {
      const sessionDate = format(new Date(s.startTime), "yyyy-MM-dd");
      return sessionDate < todayStr && s.status === "planned";
    });
  }, [sessions]);

  const handleCarryForward = async () => {
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
    setIsDismissed(true);
  };

  if (overdue.length === 0 || isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-lg"
    >
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>⚠️ Pending Backlog Detected</span>
        </h4>
        <p className="text-xs text-slate-300">
          You have <strong className="text-amber-300 font-bold">{overdue.length} unfinished planned sessions</strong> from previous days.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setIsDismissed(true)}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
        >
          Dismiss
        </button>
        <button
          onClick={handleCarryForward}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/10"
        >
          Carry Forward →
        </button>
      </div>
    </motion.div>
  );
}
