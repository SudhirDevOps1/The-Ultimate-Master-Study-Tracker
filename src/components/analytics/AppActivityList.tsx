import { useMemo } from "react";
import { Monitor } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { classifyApplication } from "@/utils/appCategorizer";

interface AppSummary {
  appName: string;
  totalSeconds: number;
  sessions: number;
  category: string;
  isLive?: boolean;
}

export function AppActivityList({ activities = [] }: { activities?: any[] }) {
  const summaries = useMemo(() => {
    const map = new Map<string, AppSummary>();
    for (const a of activities) {
      const app = a.appName || a.app || "Unknown App";
      const title = a.title || a.windowTitle || "";
      const secs = a.durationSeconds || a.duration || 0;
      const cat = classifyApplication(app, title);
      const existing = map.get(app);
      if (existing) {
        existing.totalSeconds += secs;
        existing.sessions += 1;
        if (a.isLive) existing.isLive = true;
      } else {
        map.set(app, { appName: app, totalSeconds: secs, sessions: 1, category: cat, isLive: a.isLive });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [activities]);

  const fmtSecs = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "study": return { label: "💻 STUDY / DEV", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      case "browser": return { label: "🌐 BROWSER", color: "bg-sky-500/20 text-sky-300 border-sky-500/30" };
      case "social": return { label: "💬 SOCIAL", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "entertainment": return { label: "🎮 ENTERTAINMENT", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" };
      default: return { label: "⚙️ SYSTEM", color: "bg-slate-800 text-slate-400 border-slate-700" };
    }
  };

  return (
    <Panel className="space-y-4">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <Monitor className="w-4 h-4 text-cyan-400" /> Active Applications Breakdown (500+ App Auto-Categorizer)
      </h3>

      {summaries.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          No background application activity logged for this period yet.
        </div>
      ) : (
        <div className="space-y-2">
          {summaries.map(app => {
            const badge = getCategoryBadge(app.category);
            return (
              <div key={app.appName} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">{app.appName}</span>
                  <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold ${badge.color}`}>
                    {badge.label}
                  </span>
                  {app.isLive && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <span className="font-mono text-cyan-300 font-semibold">{fmtSecs(app.totalSeconds)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
