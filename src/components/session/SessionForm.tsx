import { useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { calcPlannedMinutes, toDurationLabel } from "@/utils/time";
import type { RecurrenceType, RecurrenceConfig } from "@/types/models";

export function SessionForm() {
  const subjects = useAppStore((state) => state.subjects);
  const theme = useAppStore((state) => state.theme);
  const createSession = useAppStore((state) => state.createSession);
  const createRecurringSessions = useAppStore((state) => state.createRecurringSessions);

  const [subjectId, setSubjectId] = useState("");
  const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("focus");
  
  // Recurring options
  const [enableRecurring, setEnableRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("daily");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(7);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId), [subjectId, subjects]);
  const plannedMinutes = useMemo(() => calcPlannedMinutes(new Date(startTime).toISOString(), new Date(endTime).toISOString()), [endTime, startTime]);

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

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => 
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subjectId || !selectedSubject) return;

    try {
      // Create the base session
      await createSession({
        subjectId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        colorTag: selectedSubject.color,
        notes,
        tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
      });

      // If recurring is enabled, create recurring sessions
      if (enableRecurring) {
        // Get the latest session (just created)
        const sessions = useAppStore.getState().sessions;
        const latestSession = sessions[0]; // First one after sorting

        if (latestSession) {
          const config: RecurrenceConfig = {
            type: recurrenceType,
            interval: recurrenceInterval,
            occurrences: recurrenceOccurrences,
            daysOfWeek: recurrenceType === "weekly" ? selectedDays : undefined,
          };
          await createRecurringSessions(latestSession.id, config);
          showMessage("success", `✅ Created ${recurrenceOccurrences} recurring sessions!`);
        }
      } else {
        showMessage("success", "✅ Session created!");
      }

      setNotes("");
    } catch {
      showMessage("error", "❌ Failed to create session");
    }
  };

  // Quick presets for time
  const setQuickTime = (hours: number) => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    setStartTime(format(now, "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
              📚 Subject
            </label>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
              required
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                🕐 Start time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
                required
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                🕑 End time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
                required
              />
            </div>
          </div>

          {/* Quick Time Presets */}
          <div>
            <p className="mb-2 text-xs text-slate-400">⚡ Quick duration:</p>
            <div className="flex flex-wrap gap-2">
              {[0.5, 1, 1.5, 2, 3, 4].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setQuickTime(h)}
                  className="rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`rounded-3xl bg-gradient-to-br ${getThemeGradient()} p-[2px]`}>
          <div className="rounded-3xl bg-slate-900/95 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">📊 Session summary</p>
            <p className="mt-3 text-4xl font-bold text-white">{toDurationLabel(plannedMinutes)}</p>
            <p className="mt-2 text-sm text-slate-400">
              {selectedSubject ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedSubject.color }} />
                  {selectedSubject.name}
                </span>
              ) : (
                "Select a subject to continue"
              )}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {format(new Date(startTime), "MMM d, yyyy")} • {format(new Date(startTime), "h:mm a")} → {format(new Date(endTime), "h:mm a")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
            💬 Notes
          </label>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Chapter goals, targets, reminders"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
            🏷️ Tags
          </label>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="focus, revision, test"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Recurring Toggle */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">🔄 Create Recurring Sessions</p>
            <p className="text-xs text-slate-400">Automatically repeat this session on multiple days</p>
          </div>
          <button
            type="button"
            onClick={() => setEnableRecurring(!enableRecurring)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              enableRecurring
                ? `bg-gradient-to-r ${getThemeGradient()} text-white`
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {enableRecurring ? "✅ Enabled" : "Enable"}
          </button>
        </div>

        <AnimatePresence>
          {enableRecurring && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-4 overflow-hidden"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs text-slate-400">Repeat Type</label>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs text-slate-400">
                    Every X {recurrenceType === "daily" ? "days" : recurrenceType === "weekly" ? "weeks" : "months"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-slate-400">Number of Sessions</label>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={recurrenceOccurrences}
                    onChange={(e) => setRecurrenceOccurrences(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {recurrenceType === "weekly" && (
                <div>
                  <label className="mb-2 block text-xs text-slate-400">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
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

              <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3">
                <p className="text-xs text-cyan-200">
                  📅 Will create sessions from {format(new Date(startTime), "MMM d")} to{" "}
                  {format(addDays(new Date(startTime), recurrenceOccurrences * recurrenceInterval), "MMM d, yyyy")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap gap-3">
        <motion.button 
          type="submit" 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`rounded-2xl bg-gradient-to-r ${getThemeGradient()} px-6 py-3 font-medium text-white shadow-lg`}
        >
          {enableRecurring ? `➕ Create ${recurrenceOccurrences} Sessions` : "➕ Add Study Session"}
        </motion.button>
      </div>
    </form>
  );
}
