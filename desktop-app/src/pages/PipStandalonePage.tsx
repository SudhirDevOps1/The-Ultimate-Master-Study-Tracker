import React from "react";
import { useTimer } from "@/hooks/useTimer";
import { useAppStore } from "@/store/useAppStore";
import { formatSeconds } from "@/utils/time";
import { Play, Pause, Square, Shield, X, Minus } from "lucide-react";

export function PipStandalonePage() {
  const { activeSession, remainingSeconds, elapsedSeconds } = useTimer();
  const timer = useAppStore((state) => state.timer);
  const subjects = useAppStore((state) => state.subjects);
  const startSession = useAppStore((state) => state.startSession);
  const pauseSession = useAppStore((state) => state.pauseSession);
  const stopSession = useAppStore((state) => state.stopSession);

  const activeSubjectName = subjects.find((s) => s.id === activeSession?.subjectId)?.name || "Study Focus";
  const isRunning = !!timer.activeSessionId && !timer.isPaused;

  const handleClose = () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      (window as any).electron.ipcRenderer?.invoke?.("open-pip-window", { action: "close" });
    } else {
      window.close();
    }
  };

  const handleMinimize = () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      (window as any).electron.ipcRenderer?.invoke?.("open-pip-window", { action: "minimize" });
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-white p-4 flex flex-col justify-between border-2 border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden select-none">
      {/* Draggable Top Header Window Controls */}
      <div 
        className="flex items-center justify-between border-b border-white/10 pb-2.5 cursor-grab active:cursor-grabbing"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400">
            FlowTrack PiP Focus
          </span>
        </div>
        <div 
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={handleMinimize}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Minimize PiP"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Close PiP Window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Focus Shield Display */}
      <div className="my-auto text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
          <Shield className="w-3.5 h-3.5" />
          <span>{activeSubjectName}</span>
        </div>

        {/* Large Timer Display */}
        <div className="text-5xl font-black tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
          {activeSession ? formatSeconds(remainingSeconds > 0 ? remainingSeconds : elapsedSeconds) : "00:00"}
        </div>

        {activeSession?.notes && (
          <p className="text-xs text-slate-400 font-medium truncate max-w-[260px] mx-auto">
            Note: <span className="text-slate-200">{activeSession.notes}</span>
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-center gap-3">
          {!isRunning ? (
            <button
              onClick={() => activeSession && startSession(activeSession.id)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START</span>
            </button>
          ) : (
            <button
              onClick={pauseSession}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE</span>
            </button>
          )}

          {activeSession && (
            <button
              onClick={() => void stopSession()}
              className="py-2.5 px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center hover:bg-rose-500/30 transition-all"
              title="Stop Session"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
