import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, BarChart2, ShieldAlert, CheckCircle, Brain, X, Calendar } from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { StudySession } from "@/types/models";
import { toDurationLabel } from "@/utils/time";

export function WeeklyReviewModal() {
  const sessions = useAppStore((s: AppState) => s.sessions);
  const subjects = useAppStore((s: AppState) => s.subjects);
  
  const [isOpen, setIsOpen] = useState(false);
  const [reflection, setReflection] = useState("");
  const [priority, setPriority] = useState("");

  // Check if it's Friday afternoon/evening to auto-suggest opening
  useEffect(() => {
    const today = new Date();
    const isFriday = today.getDay() === 5;
    const isEvening = today.getHours() >= 17; // 5:00 PM or later
    
    const hasReviewedThisWeek = localStorage.getItem("flowtrack_weekly_review_done");
    const currentWeekYear = `${today.getFullYear()}-w${Math.ceil(today.getDate() / 7)}`;

    if (isFriday && isEvening && hasReviewedThisWeek !== currentWeekYear) {
      setIsOpen(true);
    }
  }, []);

  // Calculate weekly summary stats (past 7 days)
  const stats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklySessions = sessions.filter(s => new Date(s.startTime) >= sevenDaysAgo && s.status === "completed");
    const totalSeconds = weeklySessions.reduce((sum, s) => sum + s.actualSeconds, 0);
    const count = weeklySessions.length;

    // Favorite/most studied subject
    const subjectMap: Record<string, number> = {};
    weeklySessions.forEach(s => {
      subjectMap[s.subjectId] = (subjectMap[s.subjectId] || 0) + s.actualSeconds;
    });

    let bestSubId = "";
    let maxSecs = 0;
    Object.entries(subjectMap).forEach(([subId, secs]) => {
      if (secs > maxSecs) {
        maxSecs = secs;
        bestSubId = subId;
      }
    });

    const favoriteSubject = subjects.find(s => s.id === bestSubId);

    return {
      totalHours: (totalSeconds / 3600).toFixed(1),
      count,
      favoriteSubjectName: favoriteSubject?.name ?? "None",
      favoriteSubjectEmoji: favoriteSubject?.emoji ?? "📚",
    };
  }, [sessions, subjects]);

  const handleSaveReview = () => {
    const today = new Date();
    const currentWeekYear = `${today.getFullYear()}-w${Math.ceil(today.getDate() / 7)}`;
    localStorage.setItem("flowtrack_weekly_review_done", currentWeekYear);
    
    // Save reflection values
    localStorage.setItem(`flowtrack_reflection_${currentWeekYear}`, reflection);
    localStorage.setItem(`flowtrack_priority_${currentWeekYear}`, priority);

    setIsOpen(false);
    alert("📝 Weekly review saved successfully! Keep building consistent study habits.");
  };

  return (
    <>
      {/* Floating Action Button on Dashboard if they want to review manually */}
      <div className="fixed bottom-6 right-24 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/30 hover:opacity-95 transition-all"
        >
          <BarChart2 className="h-4 w-4" />
          Weekly Review
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4 relative overflow-hidden"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                  🧘 Weekly Reflection & Shutdown
                </span>
                <h3 className="text-2xl font-black text-white">Your Weekly Summary</h3>
                <p className="text-xs text-slate-400">Review your consistency patterns before you close down for the weekend</p>
              </div>

              <hr className="border-white/5" />

              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xl font-bold text-purple-400">{stats.totalHours}h</p>
                  <p className="text-[9px] uppercase text-slate-500 mt-0.5">Time Studied</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xl font-bold text-emerald-400">{stats.count}</p>
                  <p className="text-[9px] uppercase text-slate-500 mt-0.5">Sessions Hit</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 truncate">
                  <p className="text-xl font-bold text-indigo-400 truncate">
                    {stats.favoriteSubjectEmoji} {stats.favoriteSubjectName}
                  </p>
                  <p className="text-[9px] uppercase text-slate-500 mt-0.5">Top Focus</p>
                </div>
              </div>

              {/* Input forms */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    What went well this week? (Self-Reflection)
                  </label>
                  <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    placeholder="E.g. Met target hours, stayed off distraction sites, did flashcards regularly..."
                    rows={2}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    What are your top priorities for next week?
                  </label>
                  <textarea
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    placeholder="E.g. Study Chemistry 4 hours, complete mock exam test cards..."
                    rows={2}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold transition-all"
                >
                  Skip Review
                </button>
                <button
                  onClick={handleSaveReview}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-500/20"
                >
                  Save Reflection
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
