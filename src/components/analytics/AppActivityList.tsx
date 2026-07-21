import { useMemo } from "react";
import { Monitor } from "lucide-react";
import { Panel } from "@/components/common/Panel";

interface AppSummary {
  appName: string;
  totalSeconds: number;
  sessions: number;
  category: string;
  isLive?: boolean;
}

const STUDY = ["code","vscode","idea","pycharm","notepad","word","excel","powerpoint","acrobat","obsidian","notion","anki","antigravity","cmd","powershell","terminal","git","python"];
const BROWSER = ["chrome","firefox","edge","brave","opera","safari"];
const SOCIAL = ["discord","telegram","whatsapp","slack","teams","zoom"];
const ENTERT = ["vlc","spotify","netflix","youtube","steam","epicgames"];

function classifyApp(app: string): string {
  const n = app.toLowerCase();
  if (STUDY.some(k => n.includes(k))) return "study";
  if (BROWSER.some(k => n.includes(k))) return "browser";
  if (SOCIAL.some(k => n.includes(k))) return "social";
  if (ENTERT.some(k => n.includes(k))) return "entertainment";
  return "system";
}

export function AppActivityList({ activities = [] }: { activities?: any[] }) {
  const summaries = useMemo(() => {
    const map = new Map<string, AppSummary>();
    for (const a of activities) {
      const app = a.appName || a.app || "Unknown App";
      const secs = a.durationSeconds || a.duration || 0;
      const cat = classifyApp(app);
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

  return (
    <Panel className="space-y-4">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <Monitor className="w-4 h-4 text-cyan-400" /> Active Applications Breakdown
      </h3>

      {summaries.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          No background application activity logged for this period yet.
        </div>
      ) : (
        <div className="space-y-2">
          {summaries.map(app => (
            <div key={app.appName} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">{app.appName}</span>
                {app.isLive && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <span className="font-mono text-cyan-300 font-semibold">{fmtSecs(app.totalSeconds)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
