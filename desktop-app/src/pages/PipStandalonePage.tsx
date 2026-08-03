import React, { useEffect, useState } from "react";
import { useTimer } from "@/hooks/useTimer";
import { useAppStore } from "@/store/useAppStore";
import { formatSeconds } from "@/utils/time";
import { format } from "date-fns";

export function PipStandalonePage() {
  const { activeSession, remainingSeconds, elapsedSeconds, progress } = useTimer();
  const subjects = useAppStore((state) => state.subjects);
  const activeSubjectName = subjects.find((s) => s.id === activeSession?.subjectId)?.name || "Java - Theory (Sigma)";

  // Local synced state via Electron IPC for real-time live ticking across processes
  const [syncedState, setSyncedState] = useState<{
    subjectName: string;
    elapsed: number;
    remaining: number;
    progress: number;
    isPaused: boolean;
    isRunning: boolean;
  } | null>(null);

  const [liveTimeStr, setLiveTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => setLiveTimeStr(format(new Date(), "EEE, MMM d, hh:mm:ss a"));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      const unsubscribe = (window as any).electron.ipcRenderer.on(
        "timer-state-updated",
        (data: any) => {
          setSyncedState(data);
        }
      );
      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    }
  }, []);

  // Use IPC synced values if available; fallback to local hooks
  const subjectName = syncedState?.subjectName || activeSubjectName;
  const currentElapsed = syncedState ? syncedState.elapsed : elapsedSeconds;
  const currentRemaining = syncedState ? syncedState.remaining : remainingSeconds;
  const currentProgress = syncedState ? syncedState.progress : progress;

  return (
    <div className="h-screen w-screen bg-[#0b0f19] text-white p-4 flex flex-col justify-between border border-white/10 rounded-xl shadow-2xl overflow-hidden select-none">
      {/* Top Bar: Brand & Date/Time */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-indigo-400">
            FLOWTRACK
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5 max-w-[200px] truncate leading-tight">
            {subjectName}
          </h2>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          {liveTimeStr}
        </span>
      </div>

      {/* Main Display: Live Ticking Elapsed Timer */}
      <div className="my-auto">
        <div className="text-4xl font-extrabold tracking-tight font-mono text-white">
          {formatSeconds(currentElapsed)}
        </div>
        <div className="text-xs font-medium text-slate-300 mt-1">
          Remaining {formatSeconds(currentRemaining)}
        </div>
        {/* Progress Bar */}
        <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-teal-400 transition-all duration-300 rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, currentProgress))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
