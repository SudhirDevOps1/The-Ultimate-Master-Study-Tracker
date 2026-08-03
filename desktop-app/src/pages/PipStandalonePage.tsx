import React, { useEffect, useState } from "react";
import { formatSeconds } from "@/utils/time";
import { format } from "date-fns";
import { X } from "lucide-react";

export function PipStandalonePage() {
  const [syncedState, setSyncedState] = useState<{
    subjectName: string;
    elapsed: number;
    remaining: number;
    progress: number;
    isPaused: boolean;
    isRunning: boolean;
  }>({
    subjectName: "Study Focus",
    elapsed: 0,
    remaining: 0,
    progress: 0,
    isPaused: false,
    isRunning: false,
  });

  const [liveTimeStr, setLiveTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => setLiveTimeStr(format(new Date(), "EEE, MMM d, hh:mm:ss a"));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      // Request initial timer state immediately on mount
      (window as any).electron.ipcRenderer.send("request-timer-sync");

      const unsubscribe = (window as any).electron.ipcRenderer.on(
        "timer-state-updated",
        (data: any) => {
          if (data) {
            setSyncedState(data);
          }
        }
      );
      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    }
  }, []);

  const handleClose = () => {
    if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.invoke("open-pip-window", { action: "close" });
    }
  };

  return (
    <div
      className="h-screen w-screen p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white flex flex-col justify-between select-none overflow-hidden border border-white/10 rounded-xl box-border group"
      style={{ WebkitAppRegion: "drag" } as any}
    >
      {/* Top Header: Brand & Live Date/Time */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-indigo-300 font-bold">
            FLOWTRACK
          </div>
          <div className="text-xl font-bold mt-1 text-white truncate max-w-[200px]">
            {syncedState.subjectName}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-white transition-colors p-1 -mr-1 -mt-1 opacity-0 group-hover:opacity-100"
            style={{ WebkitAppRegion: "no-drag" } as any}
            title="Close PiP"
          >
            <X size={14} />
          </button>
          <div className="text-right text-xs text-slate-400 font-medium">
            {liveTimeStr}
          </div>
        </div>
      </div>

      {/* Main Content: Live Ticking Elapsed Timer & Progress Bar */}
      <div>
        <div className="text-4xl font-extrabold leading-none text-white font-mono">
          {formatSeconds(syncedState.elapsed)}
        </div>
        <div className="text-xs text-slate-300 mt-1">
          Remaining {formatSeconds(syncedState.remaining)}
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all duration-300 rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, syncedState.progress))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
