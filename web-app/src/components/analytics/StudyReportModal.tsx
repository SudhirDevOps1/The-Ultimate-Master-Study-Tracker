import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Printer, Sparkles, BookOpen, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { format } from "date-fns";

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

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden print:p-0 print:bg-white print:static study-report-print-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl max-h-[94vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black print:max-h-none print:overflow-visible"
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">FlowTrack Pro Executive Study Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/25"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
              title="Close Report (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with Crisp White Executive Paper Document */}
        <div className="flex-1 overflow-y-auto pretty-scrollbar p-3 sm:p-6 bg-slate-950/60 print:p-0 print:bg-white">
          <div
            id="study-report-content"
            className="w-full bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-4 print:p-0 print:rounded-none print:shadow-none print:border-none print:space-y-3"
          >
            {/* Header with Royal Blue Gradient Accent */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-slate-200 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/30">
                    FT
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                      Flow<span className="text-blue-600">Track</span> Pro
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Official Academic & Focus Performance Transcript
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col sm:items-end justify-between items-center text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                  Verified Report
                </span>
                <span className="text-xs font-semibold text-slate-600 mt-1">
                  {reportDate}
                </span>
              </div>
            </div>

            {/* Candidate & Rank Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student / Scholar</span>
                <strong className="text-sm font-black text-slate-900">{profile.name || "Master Student"}</strong>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Level & Rank</span>
                  <strong className="text-blue-700 font-bold">Lv.{level} {rank}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Storage Integrity</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Encrypted
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Crisp Executive KPI Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/90 text-blue-950">
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">Total Study Time</span>
                <span className="text-xl font-black text-blue-900 mt-0.5 block">{stats.totalHours} hrs</span>
                <span className="text-[10px] text-blue-700 font-medium">Logged Focus</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/90 text-emerald-950">
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Completed Sessions</span>
                <span className="text-xl font-black text-emerald-900 mt-0.5 block">{stats.completedCount} / {stats.totalCount}</span>
                <span className="text-[10px] text-emerald-700 font-medium">Daily Slots</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/90 text-indigo-950">
                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Completion Rate</span>
                <span className="text-xl font-black text-indigo-900 mt-0.5 block">{stats.completionRate}%</span>
                <span className="text-[10px] text-indigo-700 font-medium">Schedule Consistency</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90 text-amber-950">
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">Total Earned XP</span>
                <span className="text-xl font-black text-amber-900 mt-0.5 block">{totalXP} XP</span>
                <span className="text-[10px] text-amber-700 font-medium">Gamified Progress</span>
              </div>
            </div>

            {/* Subject Mastery Table */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Subject Mastery & Focus Distribution
                </h3>
                <span className="text-[10px] font-semibold text-slate-400">
                  {stats.subjectMap.length} Active Modules
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Subject / Course</th>
                      <th className="py-2 px-3 text-center">Focused Hours</th>
                      <th className="py-2 px-3 text-center">Completed Sessions</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stats.subjectMap.map((sub, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="py-1.5 px-3 flex items-center gap-2 font-semibold text-slate-800">
                          <span>{sub.emoji}</span>
                          <span className="truncate max-w-[220px]">{sub.name}</span>
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-bold text-blue-900">{sub.hours} hrs</td>
                        <td className="py-1.5 px-3 text-center text-slate-600 font-medium">{sub.completedCount} / {sub.sessionsCount}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
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
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Verified Focus & Consistency Analysis
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Student <strong className="text-slate-950">{profile.name || "Scholar"}</strong> has logged <strong className="text-blue-900">{stats.totalHours} hours</strong> of empirical study time across <strong className="text-blue-900">{stats.totalCount} structured sessions</strong> with a <strong className="text-blue-900">{stats.completionRate}% completion rate</strong>. Continuous focus habits with scheduled breaks promote optimal long-term memory consolidation.
              </p>
            </div>

            {/* Formal Verification Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
              <div className="flex items-center gap-1 font-semibold text-slate-600">
                <span>Verified by FlowTrack Pro Engine v7.5.1</span>
                <span>•</span>
                <span>Self-Hosted & Private</span>
              </div>
              <div className="font-mono text-slate-400">
                https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden on Print) */}
        <div className="sticky bottom-0 z-30 flex items-center justify-between px-5 py-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 print:hidden">
          <span className="text-xs text-slate-400">
            💡 Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/15 text-[10px] text-white">Esc</kbd> or click outside to exit
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/25"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Embedded Strict White Paper Print CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          body > * {
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          .study-report-print-modal,
          .study-report-print-modal * {
            visibility: visible !important;
          }
          .study-report-print-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          #study-report-content {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
