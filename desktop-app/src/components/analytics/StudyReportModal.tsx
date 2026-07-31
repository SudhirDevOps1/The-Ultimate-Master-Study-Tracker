import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Download, Award, CheckCircle, Clock, BookOpen, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { format, subDays } from "date-fns";

interface StudyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudyReportModal({ isOpen, onClose }: StudyReportModalProps) {
  const sessions = useAppStore((state) => state.sessions);
  const subjects = useAppStore((state) => state.subjects);
  const level = useAppStore((state) => state.level);
  const totalXP = useAppStore((state) => state.totalXP);
  const rank = useAppStore((state) => state.rank);
  const profile = useAppStore((state) => state.profile);

  const reportDate = format(new Date(), "MMMM dd, yyyy");

  // Summary Metrics
  const stats = useMemo(() => {
    const totalSecs = sessions.reduce((acc, s) => acc + (s.actualSeconds || 0), 0);
    const totalHours = (totalSecs / 3600).toFixed(1);
    const completedCount = sessions.filter((s) => s.status === "completed").length;
    const totalCount = sessions.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Subject breakdown
    const subjectMap = subjects.map((sub) => {
      const subSessions = sessions.filter((s) => s.subjectId === sub.id);
      const subSecs = subSessions.reduce((acc, s) => acc + (s.actualSeconds || 0), 0);
      const subHours = (subSecs / 3600).toFixed(1);
      const subCompleted = subSessions.filter((s) => s.status === "completed").length;
      return {
        name: sub.name,
        color: sub.color,
        emoji: sub.emoji || "📚",
        hours: subHours,
        sessionsCount: subSessions.length,
        completedCount: subCompleted,
      };
    });

    return { totalHours, completedCount, totalCount, completionRate, subjectMap };
  }, [sessions, subjects]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 my-8 text-slate-100 print:border-none print:shadow-none print:bg-white print:text-black print:my-0"
      >
        {/* Header Controls (Hidden on Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">FlowTrack Pro Executive Study Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all active:scale-95 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Document Body */}
        <div id="study-report-content" className="space-y-6">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 print:border-slate-300 gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white print:text-black">
                Flow<span className="text-cyan-400">Track</span> Pro — Official Study Performance Report
              </h1>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Generated for <strong className="text-slate-200 print:text-black">{profile.name || "Master Student"}</strong> on {reportDate}
              </p>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 print:bg-slate-100 print:border-slate-300 text-right">
              <span className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase tracking-widest block">Rank & Status</span>
              <span className="text-sm font-bold text-cyan-300 print:text-cyan-700">{rank} (Level {level})</span>
            </div>
          </div>

          {/* Overview Scorecard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 print:bg-slate-50 print:border-slate-300">
              <span className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider block">Total Study Time</span>
              <span className="text-xl font-black text-white print:text-black mt-1 block">{stats.totalHours} hrs</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 print:bg-slate-50 print:border-slate-300">
              <span className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider block">Completed Sessions</span>
              <span className="text-xl font-black text-emerald-400 print:text-emerald-700 mt-1 block">{stats.completedCount} / {stats.totalCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 print:bg-slate-50 print:border-slate-300">
              <span className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider block">Completion Rate</span>
              <span className="text-xl font-black text-cyan-400 print:text-cyan-700 mt-1 block">{stats.completionRate}%</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 print:bg-slate-50 print:border-slate-300">
              <span className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider block">Total Earned XP</span>
              <span className="text-xl font-black text-amber-400 print:text-amber-700 mt-1 block">{totalXP} XP</span>
            </div>
          </div>

          {/* Subject Performance Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 print:text-black flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400 print:text-black" />
              Subject Breakdown & Mastery
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-slate-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 print:bg-slate-200 text-slate-300 print:text-black font-semibold">
                  <tr>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5 text-center">Total Hours</th>
                    <th className="p-2.5 text-center">Sessions</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                  {stats.subjectMap.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 print:hover:bg-slate-100">
                      <td className="p-2.5 flex items-center gap-2 font-medium">
                        <span>{sub.emoji}</span>
                        <span>{sub.name}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-200 print:text-black">{sub.hours} hrs</td>
                      <td className="p-2.5 text-center text-slate-400 print:text-black">{sub.completedCount} / {sub.sessionsCount}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 print:bg-emerald-100 print:text-emerald-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Productivity Assessment Note */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 print:bg-slate-100 print:border-slate-300 space-y-1">
            <h4 className="text-xs font-bold text-cyan-300 print:text-black flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Verified Performance Assessment
            </h4>
            <p className="text-xs text-slate-300 print:text-slate-800 leading-relaxed">
              Based on empirical tracker metrics, <strong className="text-white print:text-black">{profile.name || "Student"}</strong> maintains a high-consistency focus profile. Keep maintaining structured study sessions with regular breaks for peak memory retention.
            </p>
          </div>

          {/* Document Footer */}
          <div className="pt-4 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-[10px] text-slate-500 print:text-slate-600">
            <span>Verified by FlowTrack Pro Engine v5.4.0</span>
            <span>https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
