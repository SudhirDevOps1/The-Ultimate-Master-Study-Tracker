import React, { useEffect, useState } from "react";
import { formatSeconds } from "@/utils/time";
import { format } from "date-fns";
import { X, Maximize2, MonitorSmartphone } from "lucide-react";

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

  const handleRestore = () => {
    if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send("focus-main-window");
    }
  };

  return (
    <div
      className="relative h-screen w-screen p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white flex flex-col justify-between select-none overflow-hidden border border-white/10 rounded-xl box-border group"
      style={{ WebkitAppRegion: "drag" } as any}
    >
      {/* Chrome Native-like Hover Titlebar Overlay */}
      <div 
        className="absolute top-0 left-0 right-0 h-9 bg-black/80 flex items-center justify-between px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 rounded-t-xl"
        style={{ WebkitAppRegion: "drag" } as any}
      >
        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
          <MonitorSmartphone size={12} className="text-slate-400" />
          <span>flowtrack-desktop</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRestore}
            className="text-slate-300 hover:text-white transition-colors"
            style={{ WebkitAppRegion: "no-drag" } as any}
            title="Back to tab"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={handleClose}
            className="text-slate-300 hover:text-white transition-colors"
            style={{ WebkitAppRegion: "no-drag" } as any}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Top Header: Brand */}
      <div className="flex justify-between items-start pt-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="text-[11px] tracking-[0.18em] uppercase text-indigo-300 font-bold">
            FLOWTRACK
          </div>
          <div className="text-xl font-bold mt-1 text-white truncate">
            {syncedState.subjectName}
          </div>
        </div>
      </div>

      {/* Main Content: Live Ticking Elapsed Timer & Progress Bar */}
      <div className="flex flex-col justify-end flex-1">
        <div className="text-xs text-indigo-200/80 font-medium mb-1 truncate tracking-wide">
          {liveTimeStr}
        </div>
        <div className="text-4xl font-extrabold leading-none text-white font-mono">
          {formatSeconds(syncedState.elapsed)}
        </div>
        <div className="flex justify-between items-end mt-1">
          <div className="text-xs text-slate-300">
            Remaining {formatSeconds(syncedState.remaining)}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {Math.round(syncedState.progress)}%
          </div>
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
