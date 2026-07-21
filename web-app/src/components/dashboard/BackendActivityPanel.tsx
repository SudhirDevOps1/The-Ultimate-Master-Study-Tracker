import { useMemo, useEffect, useState } from "react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Link } from "react-router-dom";

interface ActivityEntry {
  appName: string;
  title: string;
  durationSeconds: number;
  startTime: string;
  date: string;
  hour: number;
  isLive?: boolean;
}

const STUDY_APPS    = ["code", "vscode", "idea", "pycharm", "notepad", "word", "excel", "powerpoint", "acrobat", "obsidian", "notion", "onenote", "anki", "typora"];
const BROWSER_APPS  = ["chrome", "firefox", "edge", "brave", "opera", "safari", "msedge"];
const SOCIAL_APPS   = ["discord", "telegram", "whatsapp", "slack", "teams", "zoom", "messenger"];
const ENTERTAIN_APPS= ["vlc", "spotify", "netflix", "youtube", "steam", "epic", "games"];

function classifyApp(appName: string): string {
  const n = appName.toLowerCase();
  if (STUDY_APPS.some(k => n.includes(k)))     return "productive";
  if (BROWSER_APPS.some(k => n.includes(k)))   return "neutral";
  if (SOCIAL_APPS.some(k => n.includes(k)))    return "distracting";
  if (ENTERTAIN_APPS.some(k => n.includes(k))) return "distracting";
  return "neutral";
}

const isElectron = typeof window !== "undefined" && !!(window as any).require;
const getIpc = () => isElectron ? (window as any).require("electron").ipcRenderer : null;

export function BackendActivityPanel() {
  const [rawLog, setRawLog] = useState<ActivityEntry[]>([]);
  const [liveWin, setLiveWin] = useState<{ process: string; title: string } | null>(null);

  const fetchLogs = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const entries: ActivityEntry[] = await ipc.invoke("get-activity-log", { date: today });
      setRawLog(entries);

      const win = await ipc.invoke("get-active-window");
      if (win && !win.isSelf && win.process && win.process !== "unknown") {
        setLiveWin({ process: win.process, title: win.title });
      } else {
        setLiveWin(null);
      }
    } catch (err) {
      console.warn("[BackendActivityPanel] Error reading IPC logs", err);
    }
  };

  useEffect(() => {
    void fetchLogs();
    const interval = setInterval(() => {
      void fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Aggregate top processes
  const processUsage = useMemo(() => {
    const map = new Map<string, { appName: string; durationSeconds: number; category: string }>();
    for (const entry of rawLog) {
      const key = entry.appName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { appName: entry.appName, durationSeconds: 0, category: classifyApp(entry.appName) });
      }
      map.get(key)!.durationSeconds += entry.durationSeconds;
    }

    return [...map.values()]
      .sort((a, b) => b.durationSeconds - a.durationSeconds)
      .slice(0, 5)
      .map((item) => ({
        process: item.appName,
        minutes: Math.round(item.durationSeconds / 60),
        category: item.category,
      }));
  }, [rawLog]);

  // Aggregate top window titles
  const tabUsage = useMemo(() => {
    const map = new Map<string, { title: string; durationSeconds: number; process: string; category: string }>();
    for (const entry of rawLog) {
      if (!entry.title || entry.title === "Desktop / Idle") continue;
      const key = entry.title.trim();
      if (!map.has(key)) {
        map.set(key, { title: key, durationSeconds: 0, process: entry.appName, category: classifyApp(entry.appName) });
      }
      map.get(key)!.durationSeconds += entry.durationSeconds;
    }

    return [...map.values()]
      .sort((a, b) => b.durationSeconds - a.durationSeconds)
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        process: item.process,
        minutes: Math.round(item.durationSeconds / 60),
        category: item.category,
      }));
  }, [rawLog]);

  // Category breakdown for chart
  const categoryData = useMemo(() => {
    let prod = 0, dist = 0, neut = 0;
    for (const entry of rawLog) {
      const cat = classifyApp(entry.appName);
      if (cat === "productive") prod += entry.durationSeconds;
      else if (cat === "distracting") dist += entry.durationSeconds;
      else neut += entry.durationSeconds;
    }

    return [
      { name: "Productive", value: Math.round(prod / 60), color: "#10b981" },
      { name: "Distracting", value: Math.round(dist / 60), color: "#f43f5e" },
      { name: "Neutral", value: Math.round(neut / 60), color: "#3b82f6" },
    ];
  }, [rawLog]);

  const totalMinutes = useMemo(() => categoryData.reduce((acc, curr) => acc + curr.value, 0), [categoryData]);

  if (!isElectron) {
    return (
      <div className="grid gap-5 grid-cols-1">
        <Panel className="border border-indigo-900/20 bg-indigo-950/20">
          <div className="space-y-2 text-center py-4">
            <h4 className="text-sm font-semibold text-indigo-200">🖥️ Desktop App Required for Realtime Activity Tracking</h4>
            <p className="text-xs text-slate-400">
              Run FlowTrack Desktop Installer App (.exe) to view live applications and active window activity.
            </p>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {/* Tracker Status & Active Window */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-200">🔍 Live App Tracker</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Desktop ActivityWatch Engine</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Current Active Window</p>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <p className="text-xs font-bold text-white truncate">{liveWin ? `${liveWin.process} — ${liveWin.title}` : "Desktop / Idle"}</p>
          </div>
        </div>

        <div className="pt-2 text-center">
          <Link to="/app-tracking" className="text-xs font-bold text-cyan-400 hover:underline">
            Open Full App Tracking Timeline →
          </Link>
        </div>
      </Panel>

      {/* App Usage Category Graph */}
      <Panel className="space-y-4">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-200">📊 App Category Breakdown</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Time distribution today (Minutes)</p>
        </div>
        <div className="h-36">
          {totalMinutes > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" stroke="#cbd5e1" fontSize={9} />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={9} width={65} />
                <Tooltip formatter={(value) => [`${value} mins`]} labelStyle={{ color: 'black' }} />
                <Bar dataKey="value" radius={4}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              No activity gathered yet today.
            </div>
          )}
        </div>
      </Panel>

      {/* Top 5 Processes Table */}
      <Panel className="space-y-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-200">🖥️ Top Applications</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Most used desktop apps today</p>
        </div>
        <div className="pretty-scrollbar max-h-48 overflow-y-auto space-y-2">
          {processUsage.length > 0 ? (
            processUsage.map((proc, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{proc.process}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">
                    <span
                      className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          proc.category === "productive"
                            ? "#10b981"
                            : proc.category === "distracting"
                            ? "#f43f5e"
                            : "#3b82f6",
                      }}
                    />
                    {proc.category}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-xs font-bold text-cyan-300">{proc.minutes}m</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex py-8 items-center justify-center text-xs text-slate-400">
              No active applications yet.
            </div>
          )}
        </div>
      </Panel>

      {/* Top 5 Windows/Tabs Table */}
      <Panel className="space-y-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-200">🌐 Top Window Titles</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Most active window titles today</p>
        </div>
        <div className="pretty-scrollbar max-h-48 overflow-y-auto space-y-2">
          {tabUsage.length > 0 ? (
            tabUsage.map((tab, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate" title={tab.title}>{tab.title}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 truncate">{tab.process}</p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-xs font-bold text-cyan-300">{tab.minutes}m</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex py-8 items-center justify-center text-xs text-slate-400">
              No windows logged yet today.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
