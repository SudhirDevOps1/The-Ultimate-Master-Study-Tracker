import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Calendar, Clock, BarChart2, ShieldAlert, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { AppUsageRecord, BrowserTabRecord } from "@/types/models";
import { AppBlockingPanel } from "@/components/analytics/AppBlockingPanel";

export function AppTrackingPage() {
  const backendUrl = useAppStore((state: AppState) => state.backendUrl);
  const isBackendConnected = useAppStore((state: AppState) => state.isBackendConnected);
  const fetchBackendData = useAppStore((state: AppState) => state.fetchBackendData);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [appUsage, setAppUsage] = useState<AppUsageRecord[]>([]);
  const [browserTabs, setBrowserTabs] = useState<BrowserTabRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [showBlocker, setShowBlocker] = useState(false);

  // Load / generate mock wellbeing stats or fetch from local backend
  const loadWellbeingData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      if (isBackendConnected && backendUrl) {
        const usageRes = await fetch(`${backendUrl}/app-usage?days=7`);
        const browserRes = await fetch(`${backendUrl}/browser-usage?days=7`);
        if (usageRes.ok && browserRes.ok) {
          const usageData = await usageRes.json();
          const browserData = await browserRes.json();
          
          // Parse backend data to standard formats
          const dateData = usageData.by_date?.[selectedDate] || [];
          const processedApps: AppUsageRecord[] = dateData.map((app: any, idx: number) => ({
            id: `back-app-${idx}`,
            appName: app.app || "System",
            category: app.category || "neutral",
            duration: app.duration_seconds || 0,
            date: selectedDate,
            hour: new Date().getHours(),
            isActive: idx === 0,
          }));

          const tabData = browserData.top_urls || [];
          const processedTabs: BrowserTabRecord[] = tabData.map((tab: any, idx: number) => ({
            id: `back-tab-${idx}`,
            tabTitle: tab.url ? tab.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : "Site",
            url: tab.url || "",
            domain: tab.url ? tab.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : "site",
            duration: tab.time_seconds || 0,
            date: selectedDate,
            hour: new Date().getHours(),
            visitCount: tab.visits || 1
          }));

          setAppUsage(processedApps);
          setBrowserTabs(processedTabs);
          setLoading(false);
          return;
        }
      }
      
      // Fallback: Check localStorage Wellbeing data
      const localKey = `wellbeing_usage_${selectedDate}`;
      const localStored = localStorage.getItem(localKey);
      if (localStored) {
        const parsed = JSON.parse(localStored);
        setAppUsage(parsed.apps || []);
        setBrowserTabs(parsed.tabs || []);
      } else {
        // Generate realistic wellbeing dummy data for the student
        const dummyApps: AppUsageRecord[] = [
          { id: "1", appName: "VS Code", duration: 10800, date: selectedDate, hour: 10, isActive: false, category: "study" },
          { id: "2", appName: "Google Chrome", duration: 7200, date: selectedDate, hour: 11, isActive: true, category: "browser" },
          { id: "3", appName: "Discord", duration: 3600, date: selectedDate, hour: 15, isActive: false, category: "social" },
          { id: "4", appName: "Spotify", duration: 2400, date: selectedDate, hour: 14, isActive: false, category: "entertainment" },
          { id: "5", appName: "FlowTrack Suite", duration: 1800, date: selectedDate, hour: 9, isActive: false, category: "productivity" }
        ];

        const dummyTabs: BrowserTabRecord[] = [
          { id: "t1", tabTitle: "MDN Web Docs", url: "https://developer.mozilla.org", domain: "developer.mozilla.org", duration: 3200, date: selectedDate, hour: 10, visitCount: 8 },
          { id: "t2", tabTitle: "YouTube - Lo-Fi Beats", url: "https://youtube.com", domain: "youtube.com", duration: 2400, date: selectedDate, hour: 14, visitCount: 3 },
          { id: "t3", tabTitle: "GitHub Dashboard", url: "https://github.com", domain: "github.com", duration: 1200, date: selectedDate, hour: 11, visitCount: 15 },
          { id: "t4", tabTitle: "Stack Overflow", url: "https://stackoverflow.com", domain: "stackoverflow.com", duration: 400, date: selectedDate, hour: 11, visitCount: 4 }
        ];

        setAppUsage(dummyApps);
        setBrowserTabs(dummyTabs);

        // Save generated so it remains consistent
        localStorage.setItem(localKey, JSON.stringify({ apps: dummyApps, tabs: dummyTabs }));
      }
    } catch (err) {
      setErrorMsg("Unable to query app usage. Please ensure Python backend is running.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadWellbeingData();
  }, [selectedDate, isBackendConnected]);

  const totalSeconds = useMemo(() => {
    return appUsage.reduce((sum, item) => sum + item.duration, 0);
  }, [appUsage]);

  const categoryTime = useMemo(() => {
    const cats: Record<string, number> = {
      study: 0,
      browser: 0,
      social: 0,
      entertainment: 0,
      productivity: 0,
      system: 0,
    };
    appUsage.forEach(a => {
      const c = a.category || "system";
      cats[c] = (cats[c] || 0) + a.duration;
    });
    return cats;
  }, [appUsage]);

  const formatHoursMins = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Digital Wellbeing</h1>
            <p className="text-xs text-slate-400">Track and block study distractions in real-time</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBlocker(!showBlocker)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all active:scale-95"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{showBlocker ? "Show Usage Data" : "App Blocker Rules"}</span>
          </button>
          
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 border border-white/10 px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              void loadWellbeingData();
              void fetchBackendData();
            }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isBackendConnected && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Python Backend Offline</p>
            <p className="text-xs text-slate-300 mt-1">
              Real-time process monitoring and system-level app blocking require the FlowTrack Python backend. Run <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">python backend.py</code> in the working directory to connect. Falling back to local offline sandbox.
            </p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showBlocker ? (
          <motion.div
            key="blocker"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <AppBlockingPanel />
          </motion.div>
        ) : (
          <motion.div
            key="usage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Screen Time overview */}
            <Panel className="lg:col-span-1 space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Screen Time Summary
              </h3>

              <div className="text-center py-6 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Total tracked time</p>
                <p className="text-4xl font-black text-white mt-1">{formatHoursMins(totalSeconds)}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 rounded-full bg-emerald-500/10">
                  Active Focus Session running
                </span>
              </div>

              {/* Category charts */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Breakdown by Category</h4>
                <div className="space-y-2">
                  {Object.entries(categoryTime).map(([cat, seconds]) => {
                    const pct = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
                    const catColors: Record<string, string> = {
                      study: "bg-indigo-500",
                      browser: "bg-cyan-500",
                      social: "bg-rose-500",
                      entertainment: "bg-amber-500",
                      productivity: "bg-emerald-500",
                      system: "bg-slate-500",
                    };
                    if (seconds === 0) return null;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-300">
                          <span className="capitalize">{cat}</span>
                          <span>{formatHoursMins(seconds)} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${catColors[cat] || "bg-cyan-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>

            {/* App lists and browser logs */}
            <div className="lg:col-span-2 space-y-6">
              <Panel className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-indigo-400" />
                    Application Usage logs
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sorted by duration</span>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 pretty-scrollbar">
                  {appUsage.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No application data tracked for this date.</p>
                  ) : (
                    appUsage.map((app) => {
                      const pct = totalSeconds > 0 ? (app.duration / totalSeconds) * 100 : 0;
                      return (
                        <div key={app.id} className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/[0.02] transition-colors group">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg border border-white/5">
                            {app.category === "study" ? "💻" : app.category === "social" ? "💬" : app.category === "entertainment" ? "🎵" : "🖥️"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-white truncate">{app.appName}</span>
                              <span className="text-xs font-semibold text-slate-400">{formatHoursMins(app.duration)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold shrink-0">{Math.round(pct)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Panel>

              {/* Browser tab lists */}
              <Panel className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    Websites & Browser Activity
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Domain tracker</span>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 pretty-scrollbar">
                  {browserTabs.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No browser activities recorded.</p>
                  ) : (
                    browserTabs.map((tab) => (
                      <div key={tab.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${tab.domain}&sz=32`}
                            alt="favicon"
                            className="w-6 h-6 rounded-md bg-slate-800 shrink-0"
                            onError={(e) => {
                              (e.target as any).src = "https://www.google.com/s2/favicons?domain=google.com&sz=32";
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{tab.tabTitle}</p>
                            <p className="text-[10px] text-slate-500 truncate">{tab.url}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-cyan-400">{formatHoursMins(tab.duration)}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{tab.visitCount} visits</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
