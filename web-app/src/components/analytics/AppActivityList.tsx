import { useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";
import { toDurationLabel } from "@/utils/time";

export function AppActivityList() {
  const isConnected = useAppStore((state) => state.isBackendConnected);
  const activities = useAppStore((state) => state.backendActivities || []);
  const stats = useAppStore((state) => state.backendStats || null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "productive" | "distracting" | "neutral" | "idle">("all");

  // Aggregated activity statistics
  const processAggregation = useMemo(() => {
    const agg: Record<string, {
      appName: string;
      windowTitle: string;
      durationSeconds: number;
      category: "productive" | "distracting" | "neutral" | "idle";
      hits: number;
      lastActive: string;
    }> = {};

    activities.forEach((act: any) => {
      const app = act.app_name || "Unknown App";
      const title = act.window_title || "Unknown Tab";
      const key = `${app} - ${title}`;
      const duration = Number(act.duration_seconds || act.duration || 0);

      // Simple heuristic for category check
      let category: "productive" | "distracting" | "neutral" | "idle" = act.category || "neutral";
      const lowerApp = app.toLowerCase();
      const lowerTitle = title.toLowerCase();

      if (lowerApp.includes("code") || lowerApp.includes("studio") || lowerApp.includes("terminal") || lowerApp.includes("github")) {
        category = "productive";
      } else if (lowerTitle.includes("youtube") || lowerTitle.includes("netflix") || lowerTitle.includes("facebook") || lowerTitle.includes("twitter") || lowerTitle.includes("gaming") || lowerTitle.includes("steam")) {
        category = "distracting";
      } else if (lowerTitle.includes("idle") || lowerApp.includes("idle")) {
        category = "idle";
      }

      if (agg[key]) {
        agg[key].durationSeconds += duration;
        agg[key].hits += 1;
      } else {
        agg[key] = {
          appName: app,
          windowTitle: title,
          durationSeconds: duration,
          category,
          hits: 1,
          lastActive: act.timestamp || new Date().toISOString()
        };
      }
    });

    return Object.values(agg).sort((a, b) => b.durationSeconds - a.durationSeconds);
  }, [activities]);

  const filteredData = useMemo(() => {
    return processAggregation.filter((item) => {
      const matchesSearch =
        item.appName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.windowTitle.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory =
        filterCategory === "all" || item.category === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [processAggregation, searchTerm, filterCategory]);

  const categoryTotals = useMemo(() => {
    let productive = 0;
    let distracting = 0;
    let neutral = 0;
    let idle = 0;

    processAggregation.forEach(act => {
      if (act.category === "productive") productive += act.durationSeconds;
      else if (act.category === "distracting") distracting += act.durationSeconds;
      else if (act.category === "idle") idle += act.durationSeconds;
      else neutral += act.durationSeconds;
    });

    const total = productive + distracting + neutral + idle || 1;

    return {
      productive: { sec: productive, pct: ((productive / total) * 100).toFixed(1) },
      distracting: { sec: distracting, pct: ((distracting / total) * 100).toFixed(1) },
      neutral: { sec: neutral, pct: ((neutral / total) * 100).toFixed(1) },
      idle: { sec: idle, pct: ((idle / total) * 100).toFixed(1) },
    };
  }, [processAggregation]);

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "productive":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "distracting":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "idle":
        return "bg-slate-500/15 border-slate-500/30 text-slate-400";
      default:
        return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
    }
  };

  return (
    <Panel className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">🖥️ Foreground App & Tab Usage</h3>
            <div className={`h-2 w-2 animate-ping rounded-full ${isConnected ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span className={`text-xs font-mono font-bold ${isConnected ? "text-emerald-400" : "text-rose-400"}`}>
              {isConnected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Realtime foreground process tracking logs pulled directly from FlowTrack sqlite database.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-950/5 p-3">
          <p className="text-[10px] uppercase font-bold text-emerald-400">productive</p>
          <p className="text-lg font-bold font-mono text-white mt-1">{toDurationLabel(categoryTotals.productive.sec / 60)}</p>
          <p className="text-xs text-slate-400">{categoryTotals.productive.pct}% of active time</p>
        </div>
        <div className="rounded-xl border border-rose-500/10 bg-rose-950/5 p-3">
          <p className="text-[10px] uppercase font-bold text-rose-400">distracting</p>
          <p className="text-lg font-bold font-mono text-white mt-1">{toDurationLabel(categoryTotals.distracting.sec / 60)}</p>
          <p className="text-xs text-slate-400">{categoryTotals.distracting.pct}% of active time</p>
        </div>
        <div className="rounded-xl border border-cyan-500/10 bg-cyan-950/5 p-3">
          <p className="text-[10px] uppercase font-bold text-cyan-400">neutral</p>
          <p className="text-lg font-bold font-mono text-white mt-1">{toDurationLabel(categoryTotals.neutral.sec / 60)}</p>
          <p className="text-xs text-slate-400">{categoryTotals.neutral.pct}% of active time</p>
        </div>
        <div className="rounded-xl border border-slate-500/10 bg-slate-900/5 p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400">idle/afk</p>
          <p className="text-lg font-bold font-mono text-white mt-1">{toDurationLabel(categoryTotals.idle.sec / 60)}</p>
          <p className="text-xs text-slate-400">{categoryTotals.idle.pct}% of active time</p>
        </div>
      </div>

      {stats && (
        <div className="rounded-xl bg-white/5 border border-white/5 p-4 text-xs space-y-2">
          <h4 className="font-bold text-slate-300">Gamified Stats from Backend SQLite:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-slate-400">XP Earned:</span> <span className="font-mono text-cyan-400 font-bold">{stats.xp || 0} XP</span>
            </div>
            <div>
              <span className="text-slate-400">Level:</span> <span className="font-mono text-yellow-400 font-bold">Lvl {stats.level || 1}</span>
            </div>
            <div>
              <span className="text-slate-400">Rank:</span> <span className="text-indigo-400 font-bold">{stats.rank?.rank || "Beginner"}</span> {stats.rank?.emoji}
            </div>
            <div>
              <span className="text-slate-400">Focus Score:</span> <span className="font-mono text-emerald-400 font-bold">{stats.focus_score?.toFixed(1) || 100}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="🔍 Search processes or tab names..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none sm:w-80"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "productive", "distracting", "neutral", "idle"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterCategory === cat
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 uppercase font-mono tracking-wider">
              <th className="py-2.5">Process / App Name</th>
              <th className="py-2.5">Window/Tab Title Details</th>
              <th className="py-2.5">Time Logged</th>
              <th className="py-2.5">Tag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-slate-300">
            {filteredData.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors">
                <td className="py-3 font-semibold text-white">{item.appName}</td>
                <td className="py-3 max-w-xs truncate text-slate-400" title={item.windowTitle}>
                  {item.windowTitle}
                </td>
                <td className="py-3 font-bold text-cyan-200">
                  {toDurationLabel(item.durationSeconds / 60)}
                </td>
                <td className="py-3">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] uppercase font-bold ${getCategoryBadgeColor(item.category)}`}>
                    {item.category}
                  </span>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500 font-sans text-sm">
                  {isConnected ? "No matching foreground tracking logs found." : "Backend server is OFFLINE. Start backend to view PC application usage details."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
