import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatSeconds } from "@/utils/time";
import { Shield, Sparkles, Plus, Disc, LayoutGrid, ChevronDown, ChevronUp, FileText } from "lucide-react";

interface TimerDisplayProps {
  subject: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  strictMode?: boolean;
  subjectColor?: string;
  activeGoalTitle?: string;
  activeGoalNotes?: string;
  hideTitleHeader?: boolean;
  onQuickExtend?: (minutes: number) => void;
}

export function TimerDisplay({
  subject,
  elapsedSeconds,
  remainingSeconds,
  progress,
  strictMode = false,
  subjectColor = "#06b6d4",
  activeGoalTitle,
  activeGoalNotes,
  hideTitleHeader = false,
  onQuickExtend
}: TimerDisplayProps) {
  const [displayMode, setDisplayMode] = useState<"dial" | "digital">(() => {
    try {
      return (localStorage.getItem("flowtrack_timer_display_mode") as "dial" | "digital") || "dial";
    } catch {
      return "dial";
    }
  });

  const [showNotes, setShowNotes] = useState(false);

  const handleToggleDisplayMode = (mode: "dial" | "digital") => {
    setDisplayMode(mode);
    try {
      localStorage.setItem("flowtrack_timer_display_mode", mode);
    } catch {}
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = 92;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // ~578.05
  const strokeDashoffset = circumference * (1 - clampedProgress / 100);

  return (
    <div className="space-y-4">
      {/* Top Header & View Toggle */}
      {!hideTitleHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full animate-ping" style={{ backgroundColor: subjectColor }} />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-300/80">Active Focus</p>
              <h3 className="break-words text-xl sm:text-2xl font-black text-white leading-tight">{subject}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dial vs Digital Mode Selector */}
            <div className="flex items-center rounded-xl bg-slate-950/70 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => handleToggleDisplayMode("dial")}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  displayMode === "dial" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-white"
                }`}
                title="Circular Radial Dial Mode"
              >
                <Disc className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Radial Dial</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleDisplayMode("digital")}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  displayMode === "digital" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-white"
                }`}
                title="Classic Digital Cards Mode"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Digital</span>
              </button>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-right">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Completed</p>
              <p className="text-sm font-bold text-cyan-300 font-mono">{Math.round(clampedProgress)}%</p>
            </div>
          </div>
        </div>
      ) : (
        /* Compact Sub-bar when outer header is already rendered */
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: subjectColor }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: subjectColor }} />
            </span>
            <span className="text-[11px] font-semibold text-slate-300">Active Study Session</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Dial vs Digital Mode Selector */}
            <div className="flex items-center rounded-xl bg-slate-950/70 p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => handleToggleDisplayMode("dial")}
                className={`px-2 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  displayMode === "dial" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-white"
                }`}
                title="Circular Radial Dial Mode"
              >
                <Disc className="w-3 h-3" />
                <span className="text-[10px]">Dial</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleDisplayMode("digital")}
                className={`px-2 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  displayMode === "digital" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-white"
                }`}
                title="Classic Digital Cards Mode"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="text-[10px]">Digital</span>
              </button>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1 text-right">
              <span className="text-[11px] font-bold text-cyan-300 font-mono">{Math.round(clampedProgress)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Active Goal Intent & Notes Banner */}
      {(activeGoalTitle || activeGoalNotes) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold text-white shrink-0">Target:</span>
              <span className="truncate text-cyan-200 font-medium" title={activeGoalTitle}>{activeGoalTitle || "Deep Study Block"}</span>
            </div>
            {activeGoalNotes && (
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold transition-all"
                title="View full session roadmap & notes"
              >
                <FileText className="w-3 h-3" />
                <span>{showNotes ? "Hide Notes" : "View Notes"}</span>
                {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          <AnimatePresence>
            {showNotes && activeGoalNotes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/20 text-xs text-slate-300 leading-relaxed max-h-52 overflow-y-auto pretty-scrollbar whitespace-pre-line font-normal">
                  {activeGoalNotes}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Main Display: Radial Dial Mode */}
      {displayMode === "dial" ? (
        <div className="flex flex-col items-center justify-center py-2 relative">
          <div className="relative flex items-center justify-center">
            {/* SVG Circular Dial */}
            <svg width="220" height="220" className="transform -rotate-90">
              <defs>
                <linearGradient id="radialTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="timerGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Track */}
              <circle
                cx="110"
                cy="110"
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-800/80"
                fill="transparent"
              />

              {/* Animated Progress Ring */}
              <motion.circle
                cx="110"
                cy="110"
                r={radius}
                stroke="url(#radialTimerGradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                filter="url(#timerGlow)"
              />
            </svg>

            {/* Centered Time & Status Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                Remaining
              </span>
              <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                {formatSeconds(remainingSeconds)}
              </span>
              <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-white/10 text-[11px] text-cyan-300 font-mono">
                <span>Elapsed:</span>
                <span className="font-bold">{formatSeconds(elapsedSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Quick Time Extension Buttons */}
          {onQuickExtend && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Extend:</span>
              <button
                type="button"
                onClick={() => onQuickExtend(5)}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300 hover:text-cyan-300 hover:bg-white/10 transition-colors flex items-center gap-1"
                title="Add 5 minutes to current session"
              >
                <Plus className="w-3 h-3 text-cyan-400" /> 5m
              </button>
              <button
                type="button"
                onClick={() => onQuickExtend(15)}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300 hover:text-cyan-300 hover:bg-white/10 transition-colors flex items-center gap-1"
                title="Add 15 minutes to current session"
              >
                <Plus className="w-3 h-3 text-cyan-400" /> 15m
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Digital Dual Cards Mode */
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 text-slate-100">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3.5 shadow-lg">
              <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-cyan-400">Elapsed Focus</p>
              <p className="mt-1.5 text-3xl font-black text-white font-mono">{formatSeconds(elapsedSeconds)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Logged active study time</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3.5 shadow-lg">
              <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-amber-400">Remaining Time</p>
              <p className="mt-1.5 text-3xl font-black text-white font-mono">{formatSeconds(remainingSeconds)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Until current block target</p>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Session Completion</span>
              <span>{Math.round(clampedProgress)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800 border border-white/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400"
                animate={{ width: `${clampedProgress}%` }}
                transition={{ ease: "easeOut", duration: 0.6 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Strict Mode / Standard Mode Info Pill */}
      <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-[11px] text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className={`w-3.5 h-3.5 ${strictMode ? "text-rose-400" : "text-emerald-400"}`} />
          <span className="truncate">
            {strictMode
              ? "Strict Focus Active: Monitors system idle & stops overcounting."
              : "Standard Mode: Real timestamps with background tolerance."}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono shrink-0 hidden sm:inline">Space = Play/Pause</span>
      </div>
    </div>
  );
}
