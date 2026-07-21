import { Panel } from "@/components/common/Panel";
import { Monitor, Activity } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function BackendActivityPanel() {
  const isBackendConnected = useAppStore((state) => state.isBackendConnected);
  const activeWindow = useAppStore((state) => state.activeWindow);

  return (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" /> Active Application Monitor
        </h4>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isBackendConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
        }`}>
          {isBackendConnected ? 'LIVE PYTHON BACKEND' : 'OFFLINE MODE'}
        </span>
      </div>

      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center gap-3">
        <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-xs font-medium text-white truncate">
          {activeWindow || "Desktop / Idle"}
        </span>
      </div>
    </Panel>
  );
}
