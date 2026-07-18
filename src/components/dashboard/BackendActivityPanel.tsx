import { useMemo, useEffect } from "react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export function BackendActivityPanel() {
  const isBackendConnected = useAppStore((state: AppState) => state.isBackendConnected);
  const backendStats = useAppStore((state: AppState) => state.backendStats);
  const backendActivities = useAppStore((state: AppState) => state.backendActivities);
  const fetchBackendData = useAppStore((state: AppState) => state.fetchBackendData);
  const activeWindow = useAppStore((state: AppState) => state.activeWindow);

  // Poll stats and activities data periodically (every 10 seconds)
  useEffect(() => {
    void fetchBackendData();
    const interval = setInterval(() => {
      void fetchBackendData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchBackendData]);

  // Helper to clean browser suffixes from window titles
  const cleanWindowTitle = (title: string) => {
    if (!title) return "Unknown Website / Tab";
    return title
      .replace(/\s*-\s*(Google Chrome|Mozilla Firefox|Microsoft Edge|Brave|Safari|Opera|Internet Explorer|unknown)$/i, "")
      .trim();
  };

  // Aggregate process data
  const processUsage = useMemo(() => {
    if (!backendActivities || backendActivities.length === 0) return [];
    
    const processes: Record<string, { duration: number; process: string; category: string }> = {};
    backendActivities.forEach((act) => {
      if (!act.process) return;
      const key = act.process;
      if (!processes[key]) {
        processes[key] = { duration: 0, process: act.process, category: act.category || "neutral" };
      }
      processes[key].duration += act.duration || 0;
    });

    return Object.values(processes)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        minutes: Math.round(item.duration / 60),
        hours: (item.duration / 3600).toFixed(1),
      }));
  }, [backendActivities]);

  // Aggregate website/tab title data
  const tabUsage = useMemo(() => {
    if (!backendActivities || backendActivities.length === 0) return [];
    
    const tabs: Record<string, { duration: number; title: string; category: string; process: string }> = {};
    backendActivities.forEach((act) => {
      if (!act.title || act.title === "Desktop / Idle") return;
      const cleaned = cleanWindowTitle(act.title);
      if (!tabs[cleaned]) {
        tabs[cleaned] = { duration: 0, title: cleaned, category: act.category || "neutral", process: act.process || "" };
      }
      tabs[cleaned].duration += act.duration || 0;
    });

    return Object.values(tabs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        minutes: Math.round(item.duration / 60),
      }));
  }, [backendActivities]);

  // Format category durations
  const categoryData = useMemo(() => {
    if (!backendStats || !backendStats.activity_by_category) {
      return [
        { name: "Productive", value: 0, color: "#10b981" },
        { name: "Distracting", value: 0, color: "#f43f5e" },
        { name: "Neutral", value: 0, color: "#94a3b8" },
        { name: "Idle/AFK", value: 0, color: "#f59e0b" },
      ];
    }

    const { productive = 0, distracting = 0, neutral = 0, idle = 0 } = backendStats.activity_by_category;
    
    return [
      { name: "Productive", value: Math.round(productive / 60), color: "#10b981" },
      { name: "Distracting", value: Math.round(distracting / 60), color: "#f43f5e" },
      { name: "Neutral", value: Math.round(neutral / 60), color: "#3b82f6" },
      { name: "Idle/AFK", value: Math.round(idle / 60), color: "#f59e0b" },
    ];
  }, [backendStats]);

  const totalMinutes = useMemo(() => {
    return categoryData.reduce((acc, curr) => acc + curr.value, 0);
  }, [categoryData]);

  const isElectron = typeof window !== "undefined" && (window as any).require;

  if (!isBackendConnected && !isElectron) {
    return (
      <div className="grid gap-5 grid-cols-1">
        <Panel className="border border-amber-900/20 bg-amber-950/20">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/30">
                <span className="text-lg">🖥️</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-200">Foreground App & Tab Usage</h4>
                <p className="text-[10px] text-slate-400">Not Available on Web Client</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Realtime desktop foreground tracking is fully supported and enabled inside the **FlowTrack Desktop Installer App (.exe)**. Please run the desktop application version to log application and browser tab usage data locally.
            </p>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {/* Tracker Status & Focus Score */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-200">🔍 Live App Tracker</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Active window detection & focus metrics</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Current Active Window</p>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <p className="text-xs font-bold text-white truncate">{activeWindow}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-[10px] text-slate-400">Focus Score</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300">{backendStats?.focus_score ?? "0"}%</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-[10px] text-slate-400">Streak (Days)</p>
            <p className="mt-1 text-2xl font-bold text-indigo-300">{backendStats?.streak_days ?? "0"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-[10px] text-slate-400">Level (Backend)</p>
            <p className="mt-1 text-base font-bold text-purple-300">
              Lv. {backendStats?.level ?? "1"} ({backendStats?.rank?.emoji} {backendStats?.rank?.rank})
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-[10px] text-slate-400">Total XP</p>
            <p className="mt-1 text-base font-bold text-yellow-300">{backendStats?.xp ?? "0"} XP</p>
          </div>
        </div>
      </Panel>

      {/* App Usage Category Graph */}
      <Panel className="space-y-4">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-200">📊 App Category Breakdown</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Time distribution across work types</p>
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
              No tracking data gathered yet today.
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          Tracks active processes categorized as productive vs distraction.
        </p>
      </Panel>

      {/* Top 5 Processes Table */}
      <Panel className="space-y-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-200">🖥️ Top Applications</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Most used desktop apps (sorted by time)</p>
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
                  <p className="text-[9px] text-slate-400">Total</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex py-8 items-center justify-center text-xs text-slate-400">
              No active applications.
            </div>
          )}
        </div>
      </Panel>

      {/* Top 5 Browser Tabs Table */}
      <Panel className="space-y-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-200">🌐 Top Websites & Tabs</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Most visited browser tabs (sorted by time)</p>
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
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">
                    <span
                      className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          tab.category === "productive"
                            ? "#10b981"
                            : tab.category === "distracting"
                            ? "#f43f5e"
                            : "#3b82f6",
                      }}
                    />
                    {tab.process.replace(".exe", "")}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-xs font-bold text-cyan-300">{tab.minutes}m</p>
                  <p className="text-[9px] text-slate-400">Total</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex py-8 items-center justify-center text-xs text-slate-400">
              No tabs or windows tracked.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
