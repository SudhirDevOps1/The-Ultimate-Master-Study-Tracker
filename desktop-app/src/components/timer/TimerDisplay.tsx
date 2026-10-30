import { useState } from "react";
import { motion } from "framer-motion";
import { formatSeconds } from "@/utils/time";
import { Shield, Sparkles, Plus, Disc, LayoutGrid, CheckCircle2 } from "lucide-react";

interface TimerDisplayProps {
  subject: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  strictMode?: boolean;
  subjectColor?: string;
  activeGoalTitle?: string;
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
  onQuickExtend
}: TimerDisplayProps) {
  const [displayMode, setDisplayMode] = useState<"dial" | "digital">(() => {
    try {
      return (localStorage.getItem("flowtrack_timer_display_mode") as "dial" | "digital") || "dial";
    } catch {
      return "dial";
    }
  });

  const handleToggleDisplayMode = (mode: "dial" | "digital") => {
    setDisplayMode(mode);
    try {
      localStorage.setItem("flowtrack_timer_display_mode", mode);
    } catch {}
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = 100;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius; // ~628.32
  const strokeDashoffset = circumference * (1 - clampedProgress / 100);

  return (
    <div className="space-y-5">
      {/* Top Header & View Toggle */}
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

      {/* Active Goal Intent Banner */}
      {activeGoalTitle && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 shadow-md"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-white">Target Goal:</span>
          <span className="truncate text-cyan-200">{activeGoalTitle}</span>
        </motion.div>
      )}

      {/* Main Display: Radial Dial Mode */}
      {displayMode === "dial" ? (
        <div className="flex flex-col items-center justify-center py-4 relative">
          <div className="relative flex items-center justify-center">
            {/* SVG Circular Dial */}
            <svg width="250" height="250" className="transform -rotate-90">
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
                cx="125"
                cy="125"
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-800/80"
                fill="transparent"
              />

              {/* Animated Progress Ring */}
              <motion.circle
                cx="125"
                cy="125"
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
            <div className="mt-3 flex items-center gap-2">
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
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-slate-100">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg">
              <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-cyan-400">Elapsed Focus</p>
              <p className="mt-2 text-3xl font-black text-white font-mono">{formatSeconds(elapsedSeconds)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Logged active study time</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg">
              <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-amber-400">Remaining Time</p>
              <p className="mt-2 text-3xl font-black text-white font-mono">{formatSeconds(remainingSeconds)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Until current block target</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Session Completion</span>
              <span>{Math.round(clampedProgress)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800 border border-white/5">
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
      <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2 text-[11px] text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className={`w-3.5 h-3.5 ${strictMode ? "text-rose-400" : "text-emerald-400"}`} />
          <span>
            {strictMode
              ? "Strict Focus Active: Monitors system idle & stops unearned time overcounting."
              : "Standard Mode: Tracks real timestamps with background tab tolerance."}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">Space = Play/Pause</span>
      </div>
    </div>
  );
}
