import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { Award, TrendingUp, X, Sparkles, AlertTriangle, Calendar, Save, CheckCircle2 } from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { format, subDays } from "date-fns";

export function PerformanceScorecardModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  
  // Reflections
  const [reflectionText, setReflectionText] = useState("");
  const [priorityText, setPriorityText] = useState("");
  const [savedReflections, setSavedReflections] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("flowtrack_weekly_reflections");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Automatically check if today is Sunday evening to auto-trigger the modal
  useEffect(() => {
    const today = new Date();
    const isSunday = today.getDay() === 0; // 0 = Sunday
    const hour = today.getHours();
    
    // Check if we already showed or saved a reflection for this week to avoid annoying popup
    const currentWeekKey = format(today, "yyyy-'w'w");
    const alreadySaved = savedReflections.some(r => r.weekKey === currentWeekKey);

    if (isSunday && hour >= 17 && !alreadySaved) {
      setIsOpen(true);
    }
  }, [savedReflections]);

  // Compute metrics for the past 7 days
  const metrics = useMemo(() => {
    const now = new Date();
    const past7DaysSessions = sessions.filter(s => {
      const sDate = new Date(s.startTime);
      return sDate >= subDays(now, 7);
    });

    const completed = past7DaysSessions.filter(s => s.status === "completed");
    const completedCount = completed.length;
    const totalCount = past7DaysSessions.length;
    const totalActualSeconds = completed.reduce((sum, s) => sum + s.actualSeconds, 0);
    const totalPlannedMinutes = past7DaysSessions.reduce((sum, s) => sum + (s.plannedMinutes || 0), 0);

    const actualHours = Number((totalActualSeconds / 3600).toFixed(1));
    const plannedHours = Number((totalPlannedMinutes / 60).toFixed(1));
    const completionRate = totalPlannedMinutes > 0 ? Math.round(((totalActualSeconds / 60) / totalPlannedMinutes) * 100) : 0;

    // Distraction score: incomplete sessions treated as distracted. Clamped 5-90.
    const incompleteRate = totalCount > 0 ? Math.round(((totalCount - completedCount) / totalCount) * 100) : 0;
    const distractionScore = Math.min(90, Math.max(5, incompleteRate));

    // Detect neglected subject (least studied this week)
    const subjectSeconds: Record<string, number> = {};
    subjects.forEach(sub => { subjectSeconds[sub.id] = 0; });
    completed.forEach(s => {
      if (s.subjectId in subjectSeconds) {
        subjectSeconds[s.subjectId] += s.actualSeconds;
      }
    });

    let neglectedSubject = "None! Good study balance.";
    let minSeconds = Infinity;
    Object.entries(subjectSeconds).forEach(([subId, secs]) => {
      if (secs < minSeconds) {
        minSeconds = secs;
        const sub = subjects.find(s => s.id === subId);
        if (sub) neglectedSubject = `${sub.emoji || "📚"} ${sub.name}`;
      }
    });

    return {
      actualHours,
      plannedHours,
      completionRate,
      distractionScore,
      neglectedSubject,
      totalCount
    };
  }, [sessions, subjects]);

  const handleSave = () => {
    const today = new Date();
    const currentWeekKey = format(today, "yyyy-'w'w");
    const newReflection = {
      id: crypto.randomUUID(),
      weekKey: currentWeekKey,
      date: today.toLocaleDateString(),
      reflection: reflectionText,
      priority: priorityText,
      metrics: {
        hours: metrics.actualHours,
        completion: metrics.completionRate,
        distraction: metrics.distractionScore
      }
    };

    const next = [newReflection, ...savedReflections];
    setSavedReflections(next);
    localStorage.setItem("flowtrack_weekly_reflections", JSON.stringify(next));
    setSaved(true);
    setTimeout(() => { setIsOpen(false); setSaved(false); }, 1800);
  };

  return (
    <>
      {/* Floating Scorecard trigger button on dashboard */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-4.5 py-3 text-xs font-bold text-cyan-300 shadow transition-all active:scale-95"
      >
        <Award className="w-4 h-4 text-cyan-400" />
        <span>Weekly Review Scorecard</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 bg-slate-950 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-black text-white">Sunday Study Scorecard</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[480px] overflow-y-auto pretty-scrollbar p-6 space-y-5">
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Study Time</p>
                    <p className="text-xl font-black text-white mt-1">{metrics.actualHours}h</p>
                    <span className="text-[8px] text-slate-500">of {metrics.plannedHours}h plan</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Completion</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">{metrics.completionRate}%</p>
                    <span className="text-[8px] text-slate-500">focus quotient</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Distraction</p>
                    <p className="text-xl font-black text-rose-400 mt-1">{metrics.distractionScore}%</p>
                    <span className="text-[8px] text-slate-500">distract score</span>
                  </div>
                </div>

                {/* Neglected subject alert */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-200">Balanced study checklist advice:</p>
                    <p className="text-slate-400 mt-0.5">
                      Your least studied subject this week was: <strong className="text-white">{metrics.neglectedSubject}</strong>. Consider scheduling an extra slot for it tomorrow!
                    </p>
                  </div>
                </div>

                {/* Input reflections */}
                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weekly Reflections & Summary</label>
                    <textarea
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      placeholder="What went well this week? Write down your key accomplishments..."
                      className="w-full h-18 rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Week Top Priorities</label>
                    <textarea
                      value={priorityText}
                      onChange={(e) => setPriorityText(e.target.value)}
                      placeholder="List 2-3 targeted goals for the upcoming week..."
                      className="w-full h-18 rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-950 border-t border-white/5 px-6 py-4 flex justify-end gap-2.5">
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-black transition-all shadow-md active:scale-95 ${saved ? "bg-emerald-500 text-white cursor-default" : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"}`}
                >
                  {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saved ? "🎉 Saved!" : "Save Scorecard"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
