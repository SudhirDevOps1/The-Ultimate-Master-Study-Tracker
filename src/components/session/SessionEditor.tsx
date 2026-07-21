import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { calcPlannedMinutes, formatTime12Hour, toDurationLabel } from "@/utils/time";
import { checkSessionOverlap } from "@/utils/sessionValidation";
import { DuplicateSessionWarning } from "./DuplicateSessionWarning";
import { useAppStore } from "@/store/useAppStore";
import type { StudySession, RecurrenceType, RecurrenceConfig } from "@/types/models";

interface SessionEditorProps {
  session: StudySession | null;
  open: boolean;
  onClose: () => void;
}

function toLocalDateTimeInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalDateInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type EditorTab = "edit" | "reschedule" | "clone" | "recurring";

export function SessionEditor({ session, open, onClose }: SessionEditorProps) {
  const subjects = useAppStore((state) => state.subjects);
  const theme = useAppStore((state) => state.theme);
  const updateSession = useAppStore((state) => state.updateSession);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const cloneSession = useAppStore((state) => state.cloneSession);
  const rescheduleSession = useAppStore((state) => state.rescheduleSession);
  const moveSessionToNextDay = useAppStore((state) => state.moveSessionToNextDay);
  const createRecurringSessions = useAppStore((state) => state.createRecurringSessions);

  const [activeTab, setActiveTab] = useState<EditorTab>("edit");
  const [subjectId, setSubjectId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [actualMinutes, setActualMinutes] = useState(0);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<StudySession["status"]>("planned");

  // Reschedule/Clone
  const [targetDate, setTargetDate] = useState("");

  // Recurring
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(7);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<ReturnType<typeof checkSessionOverlap> | null>(null);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

  useEffect(() => {
    if (!session || !open) return;
    setSubjectId(session.subjectId);
    setStartTime(toLocalDateTimeInput(session.startTime));
    setEndTime(toLocalDateTimeInput(session.endTime));
    setActualMinutes(Math.round(session.actualSeconds / 60));
    setNotes(session.notes);
    setTags(session.tags.join(", "));
    setStatus(session.status);
    setActiveTab("edit");
    setTargetDate(toLocalDateInput(session.startTime));
    setMessage(null);
  }, [open, session]);

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId) ?? null, [subjectId, subjects]);
  const plannedMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return calcPlannedMinutes(new Date(startTime).toISOString(), new Date(endTime).toISOString());
  }, [endTime, startTime]);

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

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!session || !selectedSubject) return;
    
    // Validation: Check if end time is after start time
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    if (end <= start) {
      showMessage("error", "❌ End time must be after start time");
      return;
    }

    // Validation: Check if session duration is reasonable (max 12 hours)
    const durationMs = end - start;
    const maxDurationMs = 12 * 60 * 60 * 1000;
    if (durationMs > maxDurationMs) {
      showMessage("error", "❌ Session duration cannot exceed 12 hours");
      return;
    }

    // Validation: Check if session is at least 1 minute
    const minDurationMs = 60 * 1000;
    if (durationMs < minDurationMs) {
      showMessage("error", "❌ Session duration must be at least 1 minute");
      return;
    }

    // Validation: Check actual minutes is not negative or exceeds planned
    if (actualMinutes < 0) {
      showMessage("error", "❌ Actual study time cannot be negative");
      return;
    }

    if (actualMinutes > plannedMinutes) {
      showMessage("error", `❌ Actual time (${actualMinutes}m) cannot exceed planned time (${plannedMinutes}m)`);
      return;
    }

    // Check for duplicate sessions (excluding current session)
    if (!ignoreDuplicate && session) {
      const sessions = useAppStore.getState().sessions.filter(s => s.id !== session.id);
      const warning = checkSessionOverlap({ startTime, endTime, subjectId }, sessions);
      
      if (warning.isDuplicate || warning.overlappingSessions.length > 0) {
        setDuplicateWarning(warning);
        return;
      }
    }

    try {
      await updateSession({
        ...session,
        subjectId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        plannedMinutes,
        actualSeconds: Math.max(0, actualMinutes * 60),
        colorTag: selectedSubject.color,
        notes: notes.trim(),
        tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
        status,
      });
      showMessage("success", "✅ Session updated successfully!");
      setTimeout(onClose, 1000);
    } catch {
      showMessage("error", "❌ Failed to update session");
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    if (confirm("Are you sure you want to delete this session?")) {
      try {
        await deleteSession(session.id);
        showMessage("success", "🗑️ Session deleted");
        setTimeout(onClose, 500);
      } catch {
        showMessage("error", "❌ Failed to delete");
      }
    }
  };

  const handleClone = async () => {
    if (!session || !targetDate) return;
    try {
      await cloneSession(session.id, targetDate);
      showMessage("success", `📋 Session cloned to ${format(new Date(targetDate), "MMM d, yyyy")}`);
    } catch {
      showMessage("error", "❌ Failed to clone session");
    }
  };

  const handleReschedule = async () => {
    if (!session || !targetDate) return;
    try {
      await rescheduleSession(session.id, targetDate);
      showMessage("success", `📅 Session moved to ${format(new Date(targetDate), "MMM d, yyyy")}`);
      setTimeout(onClose, 1000);
    } catch {
      showMessage("error", "❌ Failed to reschedule");
    }
  };

  const handleMoveNextDay = async () => {
    if (!session) return;
    try {
      await moveSessionToNextDay(session.id);
      const nextDay = addDays(new Date(session.startTime), 1);
      showMessage("success", `➡️ Moved to ${format(nextDay, "MMM d, yyyy")}`);
      setTimeout(onClose, 1000);
    } catch {
      showMessage("error", "❌ Failed to move");
    }
  };

  const handleQuickMove = async (days: number) => {
    if (!session) return;
    const newDate = addDays(new Date(session.startTime), days);
    try {
      await rescheduleSession(session.id, newDate.toISOString().split("T")[0]);
      showMessage("success", `📅 Moved ${days > 0 ? "+" : ""}${days} day${Math.abs(days) !== 1 ? "s" : ""}`);
      setTimeout(onClose, 1000);
    } catch {
      showMessage("error", "❌ Failed to move");
    }
  };

  const handleCreateRecurring = async () => {
    if (!session || recurrenceType === "none") return;
    
    const config: RecurrenceConfig = {
      type: recurrenceType,
      interval: recurrenceInterval,
      endDate: recurrenceEndDate || undefined,
      occurrences: recurrenceOccurrences,
      daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
    };

    try {
      await createRecurringSessions(session.id, config);
      showMessage("success", `🔄 Created ${recurrenceOccurrences} recurring sessions`);
      setTimeout(onClose, 1500);
    } catch {
      showMessage("error", "❌ Failed to create recurring sessions");
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => 
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  if (!open || !session) return null;

  const tabs: { id: EditorTab; label: string; icon: string }[] = [
    { id: "edit", label: "Edit", icon: "✏️" },
    { id: "reschedule", label: "Move Date", icon: "📅" },
    { id: "clone", label: "Clone", icon: "📋" },
    { id: "recurring", label: "Repeat", icon: "🔄" },
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/15 bg-slate-900/95 shadow-2xl"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${getThemeGradient()} p-[2px]`}>
            <div className="rounded-t-3xl bg-slate-900/95 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${selectedSubject?.color ?? "#6366f1"}30` }}
                  >
                    📚
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Session Editor</p>
                    <h3 className="text-lg font-semibold text-white">{selectedSubject?.name ?? "Unknown"}</h3>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                >
                  ✕ Close
                </button>
              </div>

              {/* Session Info */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  📅 {format(new Date(session.startTime), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  ⏰ {formatTime12Hour(session.startTime)} → {formatTime12Hour(session.endTime)}
                </span>
                <span className="flex items-center gap-1">
                  📊 {toDurationLabel(session.plannedMinutes)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-slate-900/50 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "border-b-2 border-cyan-400 text-cyan-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`px-5 py-3 text-sm font-medium ${
                  message.type === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Duplicate Warning */}
          <AnimatePresence>
            {duplicateWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5 py-3"
              >
                <DuplicateSessionWarning
                  warning={duplicateWarning}
                  newSessionTime={{ startTime, endTime }}
                  onIgnore={() => {
                    setIgnoreDuplicate(true);
                    setDuplicateWarning(null);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh] p-5 pretty-scrollbar">
            {/* Edit Tab */}
            {activeTab === "edit" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm text-slate-200">
                    <span className="flex items-center gap-2">📚 Subject</span>
                    <select 
                      value={subjectId} 
                      onChange={(e) => setSubjectId(e.target.value)} 
                      className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                    >
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm text-slate-200">
                    <span className="flex items-center gap-2">📊 Status</span>
                    <select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value as StudySession["status"])} 
                      className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="planned">📋 Planned</option>
                      <option value="in_progress">▶️ In Progress</option>
                      <option value="paused">⏸️ Paused</option>
                      <option value="completed">✅ Completed</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm text-slate-200">
                    <span className="flex items-center gap-2">🕐 Start Time</span>
                    <input 
                      type="datetime-local" 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)} 
                      className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm text-slate-200">
                    <span className="flex items-center gap-2">🕑 End Time</span>
                    <input 
                      type="datetime-local" 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)} 
                      className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5 text-sm text-slate-200">
                    <span className="flex items-center gap-2">⏱️ Planned Duration</span>
                    <div className="rounded-xl border border-white/10 bg-slate-800/50 px-4 py-2.5 text-cyan-300">
                      {toDurationLabel(plannedMinutes)}
                    </div>
                  </div>
                  <label className="grid gap-1.5 text-sm text-slate-200">
                    <span className="flex items-center gap-2">✅ Actual Studied (minutes) {!session.manualEntry && "🔒"}</span>
                    <input 
                      type="number" 
                      min={0} 
                      value={actualMinutes} 
                      onChange={(e) => setActualMinutes(Number(e.target.value))} 
                      disabled={!session.manualEntry}
                      title={!session.manualEntry ? "Timed sessions cannot be edited manually to maintain strict tracking integrity." : ""}
                      className={`rounded-xl border px-4 py-2.5 focus:border-cyan-400 focus:outline-none ${
                        !session.manualEntry 
                          ? "border-white/10 bg-slate-900/50 text-slate-500 cursor-not-allowed" 
                          : "border-white/20 bg-slate-800/70 text-white"
                      }`}
                    />
                    {!session.manualEntry && (
                      <span className="text-[10px] text-slate-500 font-medium italic">
                        Timed sessions are locked to maintain tracking integrity.
                      </span>
                    )}
                  </label>
                </div>

                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span className="flex items-center gap-2">💬 Notes</span>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    rows={2}
                    className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none resize-none"
                  />
                </label>

                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span className="flex items-center gap-2">🏷️ Tags (comma separated)</span>
                  <input 
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)} 
                    placeholder="exam, deep work, revision"
                    className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                  />
                </label>

                <div className="flex flex-wrap justify-between gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDelete}
                    className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-500/20"
                  >
                    🗑️ Delete
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    className={`rounded-xl bg-gradient-to-r ${getThemeGradient()} px-6 py-2.5 text-sm font-medium text-white shadow-lg`}
                  >
                    💾 Save Changes
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Reschedule Tab */}
            {activeTab === "reschedule" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Current Date:</p>
                  <p className="text-lg font-medium text-white">
                    📅 {format(new Date(session.startTime), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-cyan-300">
                    ⏰ {formatTime12Hour(session.startTime)} → {formatTime12Hour(session.endTime)}
                  </p>
                </div>

                {/* Quick Move Buttons */}
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-300">⚡ Quick Move:</p>
                  <div className="flex flex-wrap gap-2">
                    {[-7, -1, 1, 2, 3, 7, 14, 30].map((days) => (
                      <motion.button
                        key={days}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickMove(days)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium ${
                          days < 0
                            ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        }`}
                      >
                        {days > 0 ? `+${days}` : days} day{Math.abs(days) !== 1 ? "s" : ""}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Move to Next Day */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMoveNextDay}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  ➡️ Move to Tomorrow ({format(addDays(new Date(session.startTime), 1), "MMM d")})
                </motion.button>

                {/* Custom Date */}
                <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-300">📆 Move to Specific Date:</p>
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="flex-1 rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReschedule}
                      className={`rounded-xl bg-gradient-to-r ${getThemeGradient()} px-6 py-2.5 text-sm font-medium text-white shadow-lg`}
                    >
                      📅 Move Here
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Clone Tab */}
            {activeTab === "clone" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4">
                  <p className="text-sm text-cyan-200">
                    📋 Clone creates a copy of this session with same subject, time, notes, and tags. 
                    The actual studied time will be reset to 0.
                  </p>
                </div>

                {/* Quick Clone Buttons */}
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-300">⚡ Quick Clone to:</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 7, 14, 30].map((days) => {
                      const targetDay = addDays(new Date(session.startTime), days);
                      return (
                        <motion.button
                          key={days}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => cloneSession(session.id, targetDay.toISOString().split("T")[0]).then(() => showMessage("success", `📋 Cloned to ${format(targetDay, "MMM d")}`))}
                          className="rounded-xl bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-500/30"
                        >
                          +{days} day{days !== 1 ? "s" : ""} ({format(targetDay, "MMM d")})
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Clone to Custom Date */}
                <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-300">📆 Clone to Specific Date:</p>
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="flex-1 rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClone}
                      className={`rounded-xl bg-gradient-to-r ${getThemeGradient()} px-6 py-2.5 text-sm font-medium text-white shadow-lg`}
                    >
                      📋 Clone Here
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recurring Tab */}
            {activeTab === "recurring" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                  <p className="text-sm text-amber-200">
                    🔄 Create multiple copies of this session on a recurring schedule. 
                    Same time slot will be used for all occurrences.
                  </p>
                </div>

                <label className="grid gap-1.5 text-sm text-slate-200">
                  <span className="flex items-center gap-2">🔁 Repeat Type</span>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                    className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom Interval</option>
                  </select>
                </label>

                {recurrenceType !== "none" && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm text-slate-200">
                        <span>Every X {recurrenceType === "daily" ? "days" : recurrenceType === "weekly" ? "weeks" : recurrenceType === "monthly" ? "months" : "days"}</span>
                        <input
                          type="number"
                          min={1}
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                          className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm text-slate-200">
                        <span>Number of Occurrences</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={recurrenceOccurrences}
                          onChange={(e) => setRecurrenceOccurrences(Number(e.target.value))}
                          className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                        />
                      </label>
                    </div>

                    {recurrenceType === "weekly" && (
                      <div>
                        <p className="mb-2 text-sm text-slate-300">Select Days of Week:</p>
                        <div className="flex flex-wrap gap-2">
                          {dayNames.map((day, idx) => (
                            <button
                              key={idx}
                              onClick={() => toggleDay(idx)}
                              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                                selectedDays.includes(idx)
                                  ? `bg-gradient-to-r ${getThemeGradient()} text-white`
                                  : "bg-white/5 text-slate-400 hover:bg-white/10"
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <label className="grid gap-1.5 text-sm text-slate-200">
                      <span>End Date (optional)</span>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        className="rounded-xl border border-white/20 bg-slate-800/70 px-4 py-2.5 focus:border-cyan-400 focus:outline-none"
                      />
                    </label>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateRecurring}
                      className={`w-full rounded-xl bg-gradient-to-r ${getThemeGradient()} px-6 py-3 text-sm font-semibold text-white shadow-lg`}
                    >
                      🔄 Create {recurrenceOccurrences} Recurring Sessions
                    </motion.button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
