import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Smile, Frown, Meh, Sparkles, Heart, Save, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/components/common/Toast";

interface ReflectionJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MoodType = "awesome" | "focused" | "neutral" | "tired" | "distracted";

export function ReflectionJournalModal({ isOpen, onClose }: ReflectionJournalModalProps) {
  const [selectedMood, setSelectedMood] = useState<MoodType>("focused");
  const [journalNote, setJournalNote] = useState("");
  const [savedEntries, setSavedEntries] = useState<Array<{ date: string; mood: MoodType; note: string }>>([]);
  const { showToast } = useToast();

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("flowtrack_daily_reflections");
      if (stored) {
        setSavedEntries(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSave = () => {
    if (!journalNote.trim()) {
      showToast("Please write a quick note for your reflection journal!", "error");
      return;
    }

    const newEntry = { date: todayStr, mood: selectedMood, note: journalNote.trim() };
    const updated = [newEntry, ...savedEntries.filter((e) => e.date !== todayStr)];
    setSavedEntries(updated);
    localStorage.setItem("flowtrack_daily_reflections", JSON.stringify(updated));

    showToast("🌟 Daily Reflection Journal saved successfully!", "success");
    setJournalNote("");
    onClose();
  };

  if (!isOpen) return null;

  const moods: Array<{ id: MoodType; label: string; icon: string; color: string }> = [
    { id: "awesome", label: "Awesome", icon: "🤩", color: "border-amber-400 text-amber-300 bg-amber-500/10" },
    { id: "focused", label: "Super Focused", icon: "⚡", color: "border-cyan-400 text-cyan-300 bg-cyan-500/10" },
    { id: "neutral", label: "Okay / Balanced", icon: "😌", color: "border-teal-400 text-teal-300 bg-teal-500/10" },
    { id: "tired", label: "Tired / Rest Needed", icon: "😴", color: "border-indigo-400 text-indigo-300 bg-indigo-500/10" },
    { id: "distracted", label: "Distracted", icon: "🌀", color: "border-rose-400 text-rose-300 bg-rose-500/10" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Daily AI Study Reflection Journal</h2>
              <p className="text-xs text-slate-400">{format(new Date(), "EEEE, MMMM dd, yyyy")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mood Selector */}
        <div className="mb-5 space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">How was your focus and mood today?</label>
          <div className="grid grid-cols-5 gap-2">
            {moods.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMood(m.id)}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${
                  selectedMood === m.id ? m.color + " ring-2 ring-cyan-400/50 scale-105 font-bold" : "border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-400"
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span className="text-[10px] font-medium leading-tight">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Journal Reflection Textarea */}
        <div className="mb-5 space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Study Takeaways & Daily Reflections</label>
          <textarea
            rows={4}
            value={journalNote}
            onChange={(e) => setJournalNote(e.target.value)}
            placeholder="What key topics did you master today? What went well or needs improvement tomorrow?"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
          />
        </div>

        {/* Actions & Paid Equivalent Badge */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-[11px] text-teal-300 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            100% Free Equivalent of Reflectly ($9.99/mo journal)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Entry</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
