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
  const isBackendConnected = useAppStore((state: AppState) => state.isBackendConnected);
  const backendStats = useAppStore((state: AppState) => state.backendStats);
  const backendActivities = useAppStore((state: AppState) => state.backendActivities);
  const fetchBackendData = useAppStore((state: AppState) => state.fetchBackendData);
  const activeWindow = useAppStore((state: AppState) => state.activeWindow);

  useEffect(() => {
    void fetchBackendData();
    const interval = setInterval(() => {
      void fetchBackendData();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchBackendData]);

  // Aggregate top processes
  const processUsage = useMemo(() => {
    if (!backendActivities || backendActivities.length === 0) return [];
    const map = new Map<string, { appName: string; durationSeconds: number; category: string }>();
    for (const entry of backendActivities) {
      const app = entry.process || entry.appName || entry.app_name;
      if (!app) continue;
      const key = app.toLowerCase();
      const duration = Number(entry.duration || entry.durationSeconds || entry.duration_sec || 0);
      if (!map.has(key)) {
        map.set(key, { appName: app, durationSeconds: 0, category: classifyApp(app) });
      }
      map.get(key)!.durationSeconds += duration;
    }

    return [...map.values()]
      .sort((a, b) => b.durationSeconds - a.durationSeconds)
      .slice(0, 5)
      .map((item) => ({
        process: item.appName,
        minutes: Math.round(item.durationSeconds / 60),
        category: item.category,
      }));
  }, [backendActivities]);

  // Aggregate top window titles
  const tabUsage = useMemo(() => {
    if (!backendActivities || backendActivities.length === 0) return [];
    const map = new Map<string, { title: string; durationSeconds: number; process: string; category: string }>();
    for (const entry of backendActivities) {
      const title = entry.title || entry.window_title;
      const app = entry.process || entry.appName || entry.app_name || "App";
      if (!title || title === "Desktop / Idle") continue;
      const key = title.trim();
      const duration = Number(entry.duration || entry.durationSeconds || entry.duration_sec || 0);
      if (!map.has(key)) {
        map.set(key, { title: key, durationSeconds: 0, process: app, category: classifyApp(app) });
      }
      map.get(key)!.durationSeconds += duration;
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
  }, [backendActivities]);

  // Category breakdown for chart
  const categoryData = useMemo(() => {
    let prod = 0, dist = 0, neut = 0;
    if (backendActivities && backendActivities.length > 0) {
      for (const entry of backendActivities) {
        const app = entry.process || entry.appName || entry.app_name || "";
        const duration = Number(entry.duration || entry.durationSeconds || entry.duration_sec || 0);
        const cat = classifyApp(app);
        if (cat === "productive") prod += duration;
        else if (cat === "distracting") dist += duration;
        else neut += duration;
      }
    }

    return [
      { name: "Productive", value: Math.round(prod / 60), color: "#10b981" },
      { name: "Distracting", value: Math.round(dist / 60), color: "#f43f5e" },
      { name: "Neutral", value: Math.round(neut / 60), color: "#3b82f6" },
    ];
  }, [backendActivities]);

  const totalMinutes = useMemo(() => categoryData.reduce((acc, curr) => acc + curr.value, 0), [categoryData]);

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
            <p className="text-xs font-bold text-white truncate">{activeWindow || "Desktop / Idle"}</p>
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
