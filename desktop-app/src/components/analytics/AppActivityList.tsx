import { useMemo, useState, useEffect } from "react";
import { Panel } from "@/components/common/Panel";
import { toDurationLabel } from "@/utils/time";
import { classifyApplication } from "@/utils/appCategorizer";

interface ActivityEntry {
  appName: string;
  title: string;
  durationSeconds: number;
  startTime: string;
  date: string;
  hour: number;
  isLive?: boolean;
}

const isElectron = typeof window !== "undefined" && !!(window as any).require;
const getIpc = () => isElectron ? (window as any).require("electron").ipcRenderer : null;

export function AppActivityList() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "study" | "entertainment" | "social" | "system">("all");

  const fetchLogs = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const logs: ActivityEntry[] = await ipc.invoke("get-activity-log", { date: today });
      setActivities(logs);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    void fetchLogs();
    const id = setInterval(() => void fetchLogs(), 5000);
    return () => clearInterval(id);
  }, []);

  // Aggregated process statistics
  const processAggregation = useMemo(() => {
    const agg: Record<string, {
      appName: string;
      windowTitle: string;
      durationSeconds: number;
      category: "study" | "entertainment" | "social" | "system";
      hits: number;
    }> = {};

    activities.forEach((act) => {
      const app = act.appName || "Unknown App";
      const title = act.title || "Desktop / Idle";
      const key = `${app} - ${title}`;
      const duration = Number(act.durationSeconds || 0);

      const category = classifyApplication(app, title);

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
        };
      }
    });

    return Object.values(agg).sort((a, b) => b.durationSeconds - a.durationSeconds);
  }, [activities]);

  const filteredProcesses = useMemo(() => {
    return processAggregation.filter((item) => {
      const matchesSearch = item.appName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.windowTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = filterCategory === "all" || item.category === filterCategory;
      return matchesSearch && matchesCat;
    });
  }, [processAggregation, searchTerm, filterCategory]);

  const totalTrackedSeconds = useMemo(() => {
    return processAggregation.reduce((acc, item) => acc + item.durationSeconds, 0);
  }, [processAggregation]);

  return (
    <Panel className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📊 Activity Logs Breakdown
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Desktop Native Tracker
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Total Logged Today: <strong className="text-white">{toDurationLabel(Math.round(totalTrackedSeconds / 60))}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search app or window title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="study">💻 Study / Coding</option>
            <option value="entertainment">🎵 Entertainment</option>
            <option value="social">💬 Social</option>
            <option value="system">⚙️ System</option>
          </select>
        </div>
      </div>

      <div className="pretty-scrollbar max-h-96 overflow-y-auto space-y-2 pr-1">
        {filteredProcesses.length > 0 ? (
          filteredProcesses.map((proc, index) => {
            const minutes = Math.round(proc.durationSeconds / 60);
            return (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white truncate">{proc.appName}</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white/5 text-slate-300">
                      {proc.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{proc.windowTitle}</p>
                </div>

                <div className="ml-4 text-right shrink-0">
                  <p className="text-xs font-black text-cyan-300">{toDurationLabel(minutes)}</p>
                  <p className="text-[10px] text-slate-500">{proc.hits} windows</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            No process activity matching filters found for today.
          </div>
        )}
      </div>
    </Panel>
  );
}
