import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Zap, AlertTriangle, ArrowRight, X, Sparkles, CheckCircle2 } from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { subDays, format } from "date-fns";

export interface PerformanceScorecardModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function PerformanceScorecardModal({ isOpen: controlledIsOpen, onClose: controlledOnClose }: PerformanceScorecardModalProps) {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);

  const [internalOpen, setInternalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalOpen;
  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  // Analyze performance over the past 7 days
  const metrics = useMemo(() => {
    const now = new Date();
    const past7DaysSessions = (sessions || []).filter(s => {
      const sDate = new Date(s.startTime);
      return sDate >= subDays(now, 7);
    });

    const completed = past7DaysSessions.filter(s => s.status === "completed");
    const totalActualSeconds = completed.reduce((sum, s) => sum + (s.actualSeconds || 0), 0);
    const totalPlannedMinutes = past7DaysSessions.reduce((sum, s) => sum + (s.plannedMinutes || 0), 0);

    const actualHours = Number((totalActualSeconds / 3600).toFixed(1));
    const plannedHours = Number((totalPlannedMinutes / 60).toFixed(1));
    const completionRate = totalPlannedMinutes > 0 ? Math.round(((totalActualSeconds / 60) / totalPlannedMinutes) * 100) : 0;

    // Real focus efficiency & distraction score based on actual vs planned ratio and session completion
    const completedCount = completed.length;
    const totalCount = past7DaysSessions.length;
    const incompleteCount = totalCount - completedCount;
    const rawDistraction = totalCount > 0 
      ? Math.round((incompleteCount / totalCount) * 100) 
      : Math.max(0, 100 - completionRate);
    const distractionScore = Math.max(5, Math.min(95, rawDistraction));

    // Detect neglected subject (least studied this week)
    const subjectSeconds: Record<string, number> = {};
    (subjects || []).forEach(sub => { subjectSeconds[sub.id] = 0; });
    completed.forEach(s => {
      if (s.subjectId in subjectSeconds) {
        subjectSeconds[s.subjectId] += (s.actualSeconds || 0);
      }
    });

    let neglectedSubject = "None! Good study balance.";
    let minSeconds = Infinity;
    Object.entries(subjectSeconds).forEach(([subId, secs]) => {
      if (secs < minSeconds) {
        minSeconds = secs;
        const sub = (subjects || []).find(s => s.id === subId);
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
    try {
      localStorage.setItem("flowtrack_weekly_scorecard_done", currentWeekKey);
      if (notes.trim()) {
        localStorage.setItem(`flowtrack_scorecard_note_${currentWeekKey}`, notes.trim());
      }
    } catch {}
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      handleClose();
    }, 1200);
  };

  // Grade classification
  const getGrade = () => {
    if (metrics.completionRate >= 90) return { letter: "A+", label: "Master Scholar", color: "text-amber-400 border-amber-400/40 bg-amber-500/10" };
    if (metrics.completionRate >= 75) return { letter: "A", label: "Focused Achiever", color: "text-emerald-400 border-emerald-400/40 bg-emerald-500/10" };
    if (metrics.completionRate >= 60) return { letter: "B+", label: "Consistent Learner", color: "text-cyan-400 border-cyan-400/40 bg-cyan-500/10" };
    if (metrics.completionRate >= 40) return { letter: "C", label: "Needs Momentum", color: "text-yellow-400 border-yellow-400/40 bg-yellow-500/10" };
    return { letter: "D", label: "Rebuild Routine", color: "text-rose-400 border-rose-400/40 bg-rose-500/10" };
  };

  const grade = getGrade();

  return (
    <>
      {!isControlled && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setInternalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:opacity-95 transition-all"
          >
            <Award className="h-4 w-4" />
            Scorecard
          </button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                    <Award className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">7-Day Study Performance Scorecard</h3>
                    <p className="text-xs text-slate-400">Holistic study audit, completion rate & distraction analysis</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grade Card */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Weekly Performance Grade</p>
                  <p className="text-sm font-semibold text-white mt-1">{grade.label}</p>
                </div>
                <div className={`px-4 py-2 rounded-2xl border text-2xl font-black ${grade.color}`}>
                  {grade.letter}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
                  <p className="text-[11px] font-semibold text-slate-400">Study Hours</p>
                  <p className="text-lg font-black text-white mt-1">{metrics.actualHours} <span className="text-xs font-normal text-slate-500">/ {metrics.plannedHours}h</span></p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
                  <p className="text-[11px] font-semibold text-slate-400">Goal Completion</p>
                  <p className="text-lg font-black text-emerald-400 mt-1">{metrics.completionRate}%</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 col-span-2 sm:col-span-1">
                  <p className="text-[11px] font-semibold text-slate-400">Distraction Score</p>
                  <p className="text-lg font-black text-rose-400 mt-1">{metrics.distractionScore}%</p>
                </div>
              </div>

              {/* Subject Balance Warning */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-200">Least Studied Area</p>
                  <p className="text-amber-200/80 mt-0.5 leading-relaxed">
                    {metrics.neglectedSubject === "None! Good study balance." 
                      ? "Great job maintaining an even balance across all subjects!" 
                      : `You gave the least time to ${metrics.neglectedSubject} this past week. Prioritize a dedicated block for it soon.`}
                  </p>
                </div>
              </div>

              {/* Action Note Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Actionable Note for Next Week</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Focus more on Mathematics problem sets before 2 PM..."
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  {saved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Saved to Review!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Acknowledge Scorecard</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
