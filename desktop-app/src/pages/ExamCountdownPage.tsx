import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Bell, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Trophy, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Sparkles,
  BookOpen,
  CheckCircle2
} from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";
import { 
  format, 
  differenceInDays, 
  isPast, 
  isToday, 
  isTomorrow 
} from "date-fns";

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
  if (isPast(new Date(dateStr)) && !isToday(new Date(dateStr))) return "done";
  if (d <= 3) return "critical";
  if (d <= 7) return "warning";
  return "safe";
}

const urgencyStyle = {
  critical: { 
    border: "border-rose-500/40", 
    bg: "bg-rose-500/10", 
    badge: "bg-rose-500/20 text-rose-300 border border-rose-500/30", 
    glow: "shadow-rose-500/20" 
  },
  warning:  { 
    border: "border-amber-500/40", 
    bg: "bg-amber-500/10", 
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30", 
    glow: "shadow-amber-500/20" 
  },
  safe:     { 
    border: "border-emerald-500/40", 
    bg: "bg-emerald-500/10", 
    badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", 
    glow: "shadow-emerald-500/20" 
  },
  done:     { 
    border: "border-slate-800", 
    bg: "bg-slate-900/60", 
    badge: "bg-slate-800 text-slate-400 border border-slate-700", 
    glow: "" 
  },
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

  const urgencyLabel = urgency === "critical" ? "🚨 Critical Sprint"
    : urgency === "warning" ? "⚠️ Imminent"
    : urgency === "done"    ? "✅ Completed"
    : "🟢 On Schedule";

  const pad = (n: number) => String(n).padStart(2, "0");

  const handleShare = () => {
    const msg = expired
      ? `✅ Completed Exam: ${exam.name} (${format(new Date(exam.date), "d MMM yyyy")})`
      : `📅 ${exam.name} countdown: ${days}d ${hours}h ${minutes}m remaining!`;
    if (navigator.share) {
      void navigator.share({ title: "FlowTrack Exam Countdown", text: msg });
    } else {
      void navigator.clipboard.writeText(msg);
      alert("Countdown copied to clipboard!");
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative rounded-2xl border ${style.border} ${style.bg} p-5 shadow-lg ${style.glow} transition-all hover:border-white/20`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white/10"
              style={{ backgroundColor: subjectColor }}
            />
            <span className="text-xs text-slate-300 font-bold truncate">{subjectName}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
              {urgencyLabel}
            </span>
          </div>
          <h3 className="text-lg font-black text-white truncate">{exam.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{format(new Date(exam.date), "EEEE, d MMMM yyyy · h:mm a")}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleShare}
            title="Share countdown"
            className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-all"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(exam.id)}
            title="Delete exam"
            className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Countdown Digital Timer */}
      {!expired ? (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { val: days, label: "Days" },
            { val: hours, label: "Hours" },
            { val: minutes, label: "Mins" },
            { val: seconds, label: "Secs" }
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center justify-center rounded-xl bg-slate-950/80 py-3 border border-white/5">
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums font-mono">{pad(val)}</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 py-4 rounded-xl bg-slate-950/80 border border-white/5">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-bold text-slate-200">Exam completed! Hope it went great!</span>
        </div>
      )}

      {/* Urgency progress bar */}
      {!expired && (
        <div className="mt-3.5">
          <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden border border-white/5">
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
        <div className="mt-3.5 text-xs text-slate-400 border-t border-white/5 pt-2.5 leading-relaxed bg-white/[0.01] px-2.5 py-1.5 rounded-lg">
          📝 <span className="text-slate-300 font-semibold">Notes:</span> {exam.notes}
        </div>
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
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-white hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-rose-400" />
          <span>Add New Upcoming Exam or Milestone</span>
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
            className="overflow-hidden border-t border-white/5 bg-slate-950/60 p-5 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Exam / Milestone Title *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Physics Midterm, JEE Advanced, USMLE Step 1..."
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Target Subject *</label>
                <select
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  required
                >
                  <option value="">Select subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Exam Date *</label>
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Scheduled Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Syllabus Notes / Venue (optional)</label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Chapters 1-6, Room 302, Calculator permitted..."
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-6 py-2.5 text-xs font-bold text-white hover:from-rose-600 hover:to-red-700 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
              >
                + Save Exam Countdown
              </button>
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
  const [filter, setFilter] = useState<"all" | "upcoming" | "critical" | "done">("upcoming");

  // Persist on change
  useEffect(() => { saveExams(exams); }, [exams]);

  const handleAdd = (exam: Exam) => setExams(prev => [...prev, exam].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  const handleDelete = (id: string) => setExams(prev => prev.filter(e => e.id !== id));

  const filtered = useMemo(() => {
    if (filter === "upcoming") return exams.filter(e => !isPast(new Date(e.date)) || isToday(new Date(e.date)));
    if (filter === "critical") return exams.filter(e => getUrgency(e.date) === "critical");
    if (filter === "done") return exams.filter(e => isPast(new Date(e.date)) && !isToday(new Date(e.date)));
    return exams;
  }, [exams, filter]);

  const upcomingCount = exams.filter(e => !isPast(new Date(e.date)) || isToday(new Date(e.date))).length;
  const criticalCount = exams.filter(e => getUrgency(e.date) === "critical").length;
  const nextExam = exams.filter(e => !isPast(new Date(e.date)) || isToday(new Date(e.date))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <Panel className="relative overflow-hidden border border-rose-500/20 bg-gradient-to-br from-slate-900 via-slate-900/95 to-rose-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-rose-300">Milestone Deadlines</p>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Exam Countdown Vault</h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Precision live countdowns for exams, certification tests, and deadlines. Keep urgency in focus with real-time second updates.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className="text-xl font-black text-white">{upcomingCount}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Upcoming</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className={`text-xl font-black ${criticalCount > 0 ? "text-rose-400" : "text-slate-400"}`}>{criticalCount}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Critical (≤3d)</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className="text-xl font-black text-emerald-400">{exams.filter(e => isPast(new Date(e.date))).length}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Completed</p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "upcoming", label: "Upcoming Exams" },
              { key: "critical", label: "🚨 Critical (≤3d)" },
              { key: "done", label: "✅ Past / Done" },
              { key: "all", label: "All Milestones" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  filter === key
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing {filtered.length} {filtered.length === 1 ? "exam" : "exams"}
          </span>
        </div>
      </Panel>

      {/* Add Form */}
      <AddExamForm onAdd={handleAdd} />

      {/* Cards Grid */}
      <div className="space-y-3.5">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-white/5 bg-slate-900/40 p-12 text-center"
            >
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="mt-3 text-sm font-bold text-white">No exams in this filter</p>
              <p className="mt-1 text-xs text-slate-400">
                {filter === "upcoming" ? "Click 'Add New Upcoming Exam' above to schedule your first test countdown!" : "No completed milestones."}
              </p>
            </motion.div>
          ) : (
            filtered.map(exam => {
              const subject = subjects.find(s => s.id === exam.subjectId);
              return (
                <CountdownCard
                  key={exam.id}
                  exam={exam}
                  subjectName={subject?.name ?? "Independent Study"}
                  subjectColor={subject?.color ?? "#f43f5e"}
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
