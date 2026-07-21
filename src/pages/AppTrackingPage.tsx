import { useState } from "react";
import { Monitor } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { AppActivityList } from "@/components/analytics/AppActivityList";
import { AppBlockingPanel } from "@/components/analytics/AppBlockingPanel";

export function AppTrackingPage() {
  const [tab, setTab] = useState<"overview" | "blocking">("overview");

  return (
    <div className="space-y-6">
      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Monitor className="w-6 h-6 text-cyan-400" /> Web Activity & Distraction Shield
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Monitor active app processes, browser tab activity, and configure web distraction blocklists.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("overview")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === "overview" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-slate-900 text-slate-400"
              }`}
            >
              📊 App Breakdown
            </button>
            <button
              onClick={() => setTab("blocking")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === "blocking" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-slate-900 text-slate-400"
              }`}
            >
              🛡️ Distraction Blocker
            </button>
          </div>
        </div>
      </Panel>

      {tab === "overview" ? <AppActivityList /> : <AppBlockingPanel />}
    </div>
  );
}
