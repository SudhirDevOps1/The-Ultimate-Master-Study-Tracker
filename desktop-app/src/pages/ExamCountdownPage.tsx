import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Bell, Target, ChevronDown, ChevronUp, Share2, Trophy } from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast, isToday, isTomorrow, addDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Exam {
  id: string;
  name: string;
  subjectId: string;
  date: string; // ISO date string
  notes?: string;
  createdAt: string;
}

// ─── Local storage key ────────────────────────────────────────────────────────
const EXAMS_KEY = "flowtrack_exams_v1";

function loadExams(): Exam[] {
  try {
    const raw = localStorage.getItem(EXAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExams(exams: Exam[]) {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

// ─── Countdown display helper ─────────────────────────────────────────────────
function useCountdown(targetDate: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetDate).getTime();
  const totalMs = target - now;
  if (totalMs <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };

  const days    = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
  return { expired: false, days, hours, minutes, seconds, totalMs };
}

// ─── Urgency helpers ──────────────────────────────────────────────────────────
function getUrgency(dateStr: string): "critical" | "warning" | "safe" | "done" {
  const d = differenceInDays(new Date(dateStr), new Date());
  if (isPast(new Date(dateStr))) return "done";
  if (d <= 3) return "critical";
  if (d <= 7) return "warning";
  return "safe";
}

const urgencyStyle = {
  critical: { border: "border-rose-500/40", bg: "bg-rose-500/10", badge: "bg-rose-500/20 text-rose-300", glow: "shadow-rose-500/20" },
  warning:  { border: "border-amber-500/40", bg: "bg-amber-500/10", badge: "bg-amber-500/20 text-amber-300", glow: "shadow-amber-500/20" },
  safe:     { border: "border-emerald-500/40", bg: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-300", glow: "shadow-emerald-500/20" },
  done:     { border: "border-slate-700", bg: "bg-slate-900/50", badge: "bg-slate-700 text-slate-400", glow: "" },
};

// ─── Single Countdown Card ────────────────────────────────────────────────────
function CountdownCard({ exam, subjectName, subjectColor, onDelete }: {
  exam: Exam;
  subjectName: string;
  subjectColor: string;
  onDelete: (id: string) => void;
}) {
  const { expired, days, hours, minutes, seconds } = useCountdown(exam.date);
  const urgency = getUrgency(exam.date);
  const style   = urgencyStyle[urgency];

  const urgencyLabel = urgency === "critical" ? "🔴 Critical"
    : urgency === "warning" ? "🟡 Soon"
    : urgency === "done"    ? "✅ Done"
    : "🟢 Scheduled";

  const pad = (n: number) => String(n).padStart(2, "0");

  // Share card
  const handleShare = () => {
    const msg = expired
      ? `✅ Exam completed: ${exam.name} (${format(new Date(exam.date), "d MMM yyyy")})`
      : `📅 ${exam.name} in ${days}d ${hours}h ${minutes}m — FlowTrack Pro`;
    if (navigator.share) {
      void navigator.share({ title: "FlowTrack Exam Countdown", text: msg });
    } else {
      void navigator.clipboard.writeText(msg);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative rounded-2xl border ${style.border} ${style.bg} p-5 shadow-xl ${style.glow} transition-shadow`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white/10"
              style={{ backgroundColor: subjectColor }}
            />
            <span className="text-xs text-slate-400 font-medium truncate">{subjectName}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
              {urgencyLabel}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white truncate">{exam.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {format(new Date(exam.date), "EEEE, d MMMM yyyy · h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleShare}
            title="Share countdown"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-all"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(exam.id)}
            title="Delete exam"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Countdown display */}
      {!expired ? (
        <div className="grid grid-cols-4 gap-2">
          {[{ val: days, label: "Days" }, { val: hours, label: "Hours" }, { val: minutes, label: "Mins" }, { val: seconds, label: "Secs" }].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center justify-center rounded-xl bg-slate-900/60 py-3 border border-white/5">
              <span className="text-2xl font-black text-white tabular-nums font-mono">{pad(val)}</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 py-4 rounded-xl bg-slate-900/60 border border-white/5">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-semibold text-slate-300">Exam completed!</span>
        </div>
      )}

      {/* Urgency progress bar */}
      {!expired && (
        <div className="mt-3">
          <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: urgency === "critical" ? "#f43f5e" : urgency === "warning" ? "#f59e0b" : "#10b981" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(5, 100 - Math.min(100, days * 3.3))}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {exam.notes && (
        <p className="mt-3 text-xs text-slate-500 border-t border-white/5 pt-2 leading-relaxed">{exam.notes}</p>
      )}
    </motion.div>
  );
}

// ─── Add Exam Form ────────────────────────────────────────────────────────────
function AddExamForm({ onAdd }: { onAdd: (exam: Exam) => void }) {
  const subjects = useAppStore((s: AppState) => s.subjects);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date || !subjectId) return;
    const fullDate = `${date}T${time}:00`;
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      subjectId,
      date: fullDate,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setName(""); setDate(""); setTime("09:00"); setNotes(""); setSubjectId(""); setOpen(false);
  };

  const minDate = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-white hover:bg-white/5 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-cyan-400" />
          Add New Exam / Test
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-white/5 pt-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Exam / Test Name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. JEE Advanced, Physics Mid-term..."
                  className="w-full rounded-xl bg-slate-800/60 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Subject *</label>
                <select
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/60 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  required
                >
                  <option value="">Select subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Exam Date *</label>
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/60 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Exam Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/60 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Syllabus, venue, hall ticket..."
                  className="w-full rounded-xl bg-slate-800/60 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white hover:from-indigo-600 hover:to-cyan-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                >
                  + Add Exam
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ExamCountdownPage() {
  const subjects = useAppStore((s: AppState) => s.subjects);
  const [exams, setExams] = useState<Exam[]>(loadExams);
  const [filter, setFilter] = useState<"all" | "upcoming" | "done">("upcoming");

  // Persist on change
  useEffect(() => { saveExams(exams); }, [exams]);

  const handleAdd = (exam: Exam) => setExams(prev => [...prev, exam].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  const handleDelete = (id: string) => setExams(prev => prev.filter(e => e.id !== id));

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === "upcoming") return exams.filter(e => !isPast(new Date(e.date)) || isToday(new Date(e.date)));
    if (filter === "done") return exams.filter(e => isPast(new Date(e.date)) && !isToday(new Date(e.date)));
    return exams;
  }, [exams, filter]);

  const upcomingCount = exams.filter(e => !isPast(new Date(e.date))).length;
  const criticalCount = exams.filter(e => getUrgency(e.date) === "critical").length;
  const nextExam = exams.filter(e => !isPast(new Date(e.date))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-rose-400" />
            Exam Countdown
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Track upcoming exams, tests & deadlines with live countdowns</p>
        </div>
        <div className="flex gap-2">
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "done", label: "Done" },
            { key: "all", label: "All" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === key
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Panel className="text-center py-4">
          <p className="text-3xl font-black text-white">{upcomingCount}</p>
          <p className="text-xs text-slate-400 mt-1">Upcoming Exams</p>
        </Panel>
        <Panel className="text-center py-4">
          <p className={`text-3xl font-black ${criticalCount > 0 ? "text-rose-400" : "text-slate-500"}`}>{criticalCount}</p>
          <p className="text-xs text-slate-400 mt-1">Critical (≤3 days)</p>
        </Panel>
        <Panel className="text-center py-4">
          {nextExam ? (
            <>
              <p className="text-lg font-bold text-white truncate px-2">{nextExam.name}</p>
              <p className="text-xs text-cyan-400 mt-1">
                in {differenceInDays(new Date(nextExam.date), new Date())} days
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-black text-slate-600">—</p>
              <p className="text-xs text-slate-500 mt-1">No upcoming exams</p>
            </>
          )}
        </Panel>
      </div>

      {/* Add Form */}
      <AddExamForm onAdd={handleAdd} />

      {/* Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="text-5xl mb-4">📅</div>
              <p className="text-white font-semibold">No exams here</p>
              <p className="text-slate-400 text-sm mt-1">
                {filter === "upcoming" ? "Add your first exam using the form above!" : "No completed exams yet."}
              </p>
            </motion.div>
          ) : (
            filtered.map(exam => {
              const subject = subjects.find(s => s.id === exam.subjectId);
              return (
                <CountdownCard
                  key={exam.id}
                  exam={exam}
                  subjectName={subject?.name ?? "Unknown Subject"}
                  subjectColor={subject?.color ?? "#6366f1"}
                  onDelete={handleDelete}
                />
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
