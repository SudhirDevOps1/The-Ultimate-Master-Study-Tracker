import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Calendar, Clock, BarChart2, ShieldAlert, RefreshCw,
  Activity, Download, ChevronLeft, ChevronRight, Eye, Zap, TrendingUp, Globe
} from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { AppBlockingPanel } from "@/components/analytics/AppBlockingPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActivityEntry {
  appName: string;
  title: string;
  durationSeconds: number;
  startTime: string;
  date: string;
  hour: number;
  minute?: number;
  isLive?: boolean;
}
interface AppSummary {
  appName: string;
  totalSeconds: number;
  sessions: number;
  category: string;
  isLive: boolean;
}

interface WebTabSummary {
  domain: string;
  title: string;
  totalSeconds: number;
  visitCount: number;
  browser: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STUDY   = ["code","vscode","idea","pycharm","notepad","word","excel","powerpoint","acrobat","obsidian","notion","onenote","anki","typora","atom","sublime","vim","nvim","emacs","jupyter","zotero"];
const BROWSER = ["chrome","firefox","edge","brave","opera","safari","msedge","chromium","iexplore"];
const SOCIAL  = ["discord","telegram","whatsapp","slack","teams","zoom","messenger","skype","signal","webex","meet"];
const ENTERT  = ["vlc","spotify","netflix","youtube","steam","epicgames","epic","games","twitch","mediaplayerclassic","potplayer","mpc","winamp"];

function classifyApp(app: string): string {
  const n = app.toLowerCase();
  if (STUDY.some(k => n.includes(k)))   return "study";
  if (BROWSER.some(k => n.includes(k))) return "browser";
  if (SOCIAL.some(k => n.includes(k)))  return "social";
  if (ENTERT.some(k => n.includes(k)))  return "entertainment";
  return "system";
}

// Extract website domain & clean tab title from browser window titles
function extractWebDomain(title: string, appName: string): { domain: string; cleanTitle: string } | null {
  const isBrowser = BROWSER.some(b => appName.toLowerCase().includes(b));
  if (!isBrowser || !title || title === "Desktop / Idle") return null;

  // Remove browser suffix (e.g. "- Google Chrome", "- Microsoft Edge")
  const cleanTitle = (title || "").replace(/\s*-\s*(Google Chrome|Mozilla Firefox|Microsoft Edge|Brave|Safari|Opera|Vivaldi)$/i, "").trim() || "Web Tab";
  
  // Try extracting domain from known formats or common site keywords
  const titleLower = cleanTitle.toLowerCase();
  let domain = "web-page";

  if (titleLower.includes("youtube")) domain = "youtube.com";
  else if (titleLower.includes("github")) domain = "github.com";
  else if (titleLower.includes("google search") || titleLower.includes("google")) domain = "google.com";
  else if (titleLower.includes("stackoverflow")) domain = "stackoverflow.com";
  else if (titleLower.includes("chatgpt") || titleLower.includes("openai")) domain = "chatgpt.com";
  else if (titleLower.includes("leetcode")) domain = "leetcode.com";
  else if (titleLower.includes("coursera")) domain = "coursera.org";
  else if (titleLower.includes("udemy")) domain = "udemy.com";
  else if (titleLower.includes("wikipedia")) domain = "wikipedia.org";
  else if (titleLower.includes("reddit")) domain = "reddit.com";
  else if (titleLower.includes("twitter") || titleLower.includes(" x ")) domain = "x.com";
  else if (titleLower.includes("linkedin")) domain = "linkedin.com";
  else {
    // Attempt parsing domain word from title string safely
    try {
      const match = cleanTitle.match(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/i);
      if (match && match[0]) domain = match[0].toLowerCase();
      else domain = (cleanTitle.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, "") || "web") + ".site";
    } catch {
      domain = "web.site";
    }
  }

  return { domain, cleanTitle };
}

const CAT_COLORS: Record<string, string> = {
  study:         "from-indigo-500 to-purple-500",
  browser:       "from-cyan-500  to-blue-500",
  social:        "from-rose-500  to-pink-500",
  entertainment: "from-amber-500 to-orange-500",
  system:        "from-slate-600 to-slate-700",
};
const CAT_SOLID: Record<string, string> = {
  study:         "bg-indigo-500",
  browser:       "bg-cyan-500",
  social:        "bg-rose-500",
  entertainment: "bg-amber-500",
  system:        "bg-slate-600",
};
const CAT_TAG: Record<string, string> = {
  study:         "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
  browser:       "bg-cyan-500/15  text-cyan-300  border-cyan-500/25",
  social:        "bg-rose-500/15  text-rose-300  border-rose-500/25",
  entertainment: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  system:        "bg-slate-500/15 text-slate-400 border-slate-500/25",
};
const CAT_EMOJI: Record<string, string> = {
  study:"💻", browser:"🌐", social:"💬", entertainment:"🎮", system:"⚙️"
};

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const isElectron = typeof window !== "undefined" && !!(window as any).require;
const getIpc = () => isElectron ? (window as any).require("electron").ipcRenderer : null;

// ─── Timeline Component ───────────────────────────────────────────────────────
function Timeline({ rawLog }: { rawLog: ActivityEntry[] }) {
  const activeHours = useMemo(() => {
    const map = new Map<number, ActivityEntry[]>();
    for (const entry of rawLog) {
      if (!map.has(entry.hour)) map.set(entry.hour, []);
      map.get(entry.hour)!.push(entry);
    }
    return map;
  }, [rawLog]);

  if (activeHours.size === 0) return (
    <p className="text-xs text-slate-500 text-center py-6">No timeline data for this day.</p>
  );

  return (
    <div className="space-y-1">
      {/* Hour axis */}
      <div className="flex gap-1 items-center mb-1">
        <span className="w-12 shrink-0" />
        {Array.from({ length: 24 }, (_, h) => (
          h % 3 === 0 ? (
            <span key={h} className="text-[9px] text-slate-600 font-mono" style={{ flex: "0 0 calc((100% - 3rem) / 24 * 3)", textAlign: "left" }}>
              {String(h).padStart(2, "0")}
            </span>
          ) : null
        ))}
      </div>

      {/* One row per app that was active */}
      {Array.from(
        rawLog.reduce((m, e) => { m.set(e.appName, (m.get(e.appName) || 0) + e.durationSeconds); return m; }, new Map<string, number>()),
      ).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([appName]) => {
        const cat = classifyApp(appName);
        const appEntries = rawLog.filter(e => e.appName === appName);
        const totalSec = appEntries.reduce((s, e) => s + e.durationSeconds, 0);

        return (
          <div key={appName} className="flex items-center gap-2 group">
            {/* Label */}
            <span className="w-24 shrink-0 text-[10px] text-slate-400 truncate text-right font-semibold">
              {appName}
            </span>

            {/* 24-hour track */}
            <div className="relative flex-1 h-5 bg-white/[0.03] rounded overflow-hidden border border-white/5">
              {appEntries.map((entry, i) => {
                const startMin = entry.hour * 60 + (entry.minute ?? 0);
                const leftPct  = (startMin / 1440) * 100;
                const widthPct = Math.max(0.5, (entry.durationSeconds / 86400) * 100);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`absolute top-0 h-full rounded-sm ${CAT_SOLID[cat] ?? "bg-slate-500"} ${entry.isLive ? "animate-pulse" : ""}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${appName} @ ${String(entry.hour).padStart(2,"0")}:${String(entry.minute ?? 0).padStart(2,"0")} — ${fmt(entry.durationSeconds)}`}
                  />
                );
              })}
            </div>

            {/* Duration */}
            <span className="w-12 shrink-0 text-[10px] text-slate-400 font-mono text-right">{fmt(totalSec)}</span>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/5 flex-wrap">
        {Object.entries(CAT_SOLID).map(([cat, cls]) => (
          <span key={cat} className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AppTrackingPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rawLog, setRawLog]             = useState<ActivityEntry[]>([]);
  const [trackedDates, setTrackedDates] = useState<string[]>([]);
  const [liveApp, setLiveApp]           = useState<{ process: string; title: string } | null>(null);
  const [liveIdleMs, setLiveIdleMs]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const [showBlocker, setShowBlocker]   = useState(false);
  const [activeTab, setActiveTab]       = useState<"overview"|"timeline"|"websites"|"windows">("overview");
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const today   = new Date().toISOString().split("T")[0];

  // ── Fetch activity log ─────────────────────────────────────────────────
  const fetchLog = useCallback(async (date: string) => {
    const ipc = getIpc();
    if (!ipc) return;
    setLoading(true);
    try {
      const entries: ActivityEntry[] = await ipc.invoke("get-activity-log", { date });
      setRawLog(entries);
    } catch (e) { console.warn("[AppTracking]", e); }
    setLoading(false);
  }, []);

  // ── Fetch available historical dates ───────────────────────────────────
  const fetchDates = useCallback(async () => {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const dates: string[] = await ipc.invoke("get-tracked-dates");
      setTrackedDates(dates);
    } catch { /* ignore */ }
  }, []);

  // ── Poll live data every 5 s ───────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      const ipc = getIpc();
      if (!ipc) return;
      try {
        const [win, idle] = await Promise.all([
          ipc.invoke("get-active-window"),
          ipc.invoke("get-idle-time-ms"),
        ]);
        setLiveApp(win?.isSelf || win?.process === "unknown" ? null : { process: win.process, title: win.title });
        setLiveIdleMs(idle as number);
      } catch { /* ignore */ }
    };
    void poll();
    pollRef.current = setInterval(() => void poll(), 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Auto-refresh today's log every 30 s ───────────────────────────────
  useEffect(() => {
    void fetchLog(selectedDate);
    void fetchDates();
  }, [selectedDate, fetchLog, fetchDates]);

  useEffect(() => {
    if (selectedDate !== today) return;
    const id = setInterval(() => void fetchLog(today), 30_000);
    return () => clearInterval(id);
  }, [selectedDate, today, fetchLog]);

  // ── App Aggregations ───────────────────────────────────────────────────
  const appSummaries: AppSummary[] = useMemo(() => {
    const map = new Map<string, AppSummary>();
    for (const e of rawLog) {
      const key = e.appName.toLowerCase();
      if (!map.has(key)) map.set(key, { appName: e.appName, totalSeconds: 0, sessions: 0, category: classifyApp(e.appName), isLive: false });
      const r = map.get(key)!;
      r.totalSeconds += e.durationSeconds;
      r.sessions++;
      if (e.isLive) r.isLive = true;
    }
    return [...map.values()].sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [rawLog]);

  // ── Web Sites & Tabs Aggregations ──────────────────────────────────────
  const webTabSummaries: WebTabSummary[] = useMemo(() => {
    const map = new Map<string, WebTabSummary>();
    for (const e of rawLog) {
      const extracted = extractWebDomain(e.title, e.appName);
      if (!extracted) continue;

      const key = `${extracted.domain}::${extracted.cleanTitle}`;
      if (!map.has(key)) {
        map.set(key, {
          domain: extracted.domain,
          title: extracted.cleanTitle,
          totalSeconds: 0,
          visitCount: 0,
          browser: e.appName,
        });
      }
      const r = map.get(key)!;
      r.totalSeconds += e.durationSeconds;
      r.visitCount++;
    }
    return [...map.values()].sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [rawLog]);

  const totalSeconds = useMemo(() => appSummaries.reduce((s, a) => s + a.totalSeconds, 0), [appSummaries]);

  const categoryTotals = useMemo(() => {
    const m: Record<string, number> = {};
    appSummaries.forEach(a => { m[a.category] = (m[a.category] ?? 0) + a.totalSeconds; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [appSummaries]);

  // ── Date navigation ────────────────────────────────────────────────────
  const dateIdx   = trackedDates.indexOf(selectedDate);
  const prevDate  = trackedDates[dateIdx + 1];
  const nextDate  = trackedDates[dateIdx - 1];

  const idleMin   = Math.floor(liveIdleMs / 60000);
  const idlePct   = Math.min(100, (liveIdleMs / (10 * 60 * 1000)) * 100);

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const result = await ipc.invoke("export-activity-csv", { date: selectedDate });
      if (result.success) alert(`✅ Exported to:\n${result.path}`);
      else if (result.reason !== "cancelled") alert(`❌ Export failed: ${result.error}`);
    } catch (e: any) { alert(`Export error: ${e.message}`); }
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">App & Web Monitor</h1>
            <p className="text-xs text-slate-400">
              Desktop Apps + Browser Websites & Tabs Tracker · Privacy-First Local Logging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowBlocker(!showBlocker)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all">
            <ShieldAlert className="w-4 h-4" /> {showBlocker ? "Tracking" : "App Blocker"}
          </button>

          {/* Date navigation */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-900 border border-white/10 px-1 py-1">
            <button onClick={() => prevDate && setSelectedDate(prevDate)} disabled={!prevDate}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none w-28" />
            </div>
            <button onClick={() => nextDate && setSelectedDate(nextDate)} disabled={!nextDate || selectedDate === today}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

          <button onClick={handleExport} title="Export to CSV"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button onClick={() => { void fetchLog(selectedDate); void fetchDates(); }}
            className={`p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors ${loading ? "animate-spin" : ""}`}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Live Status Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Live active app / tab */}
        <motion.div animate={{ scale: liveApp ? [1, 1.005, 1] : 1 }} transition={{ repeat: Infinity, duration: 3 }}
          className="col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${liveApp ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            {liveApp ? "Currently Active Window / Web Tab" : "Idle / No Active Window"}
          </p>
          {liveApp ? (
            <>
              <p className="mt-1 text-lg font-black text-white truncate">{liveApp.process}</p>
              <p className="text-xs text-cyan-300 truncate">{liveApp.title}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500 italic">
              {isElectron ? "Desktop is idle" : "Requires desktop app"}
            </p>
          )}
        </motion.div>

        {/* Idle Time */}
        <div className={`rounded-2xl border p-4 ${liveIdleMs >= 10 * 60 * 1000 ? "border-rose-500/30 bg-rose-500/10" : "border-white/10 bg-slate-900"}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Idle Time</p>
          <p className={`mt-1 text-2xl font-black tabular-nums ${liveIdleMs >= 10 * 60 * 1000 ? "text-rose-400" : liveIdleMs >= 5 * 60 * 1000 ? "text-amber-400" : "text-white"}`}>
            {idleMin > 0 ? `${idleMin}m` : `${Math.floor(liveIdleMs / 1000)}s`}
          </p>
          <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${idlePct}%` }} transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${liveIdleMs >= 10 * 60 * 1000 ? "bg-rose-500" : liveIdleMs >= 5 * 60 * 1000 ? "bg-amber-400" : "bg-emerald-400"}`} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{liveIdleMs >= 10 * 60 * 1000 ? "⏸ Session auto-paused" : "✅ Active"}</p>
        </div>

        {/* Total tracked */}
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tracked Today</p>
          <p className="mt-1 text-2xl font-black text-cyan-400">{fmt(totalSeconds)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{appSummaries.length} apps · {webTabSummaries.length} web tabs</p>
        </div>
      </div>

      {/* ── History breadcrumb ── */}
      {trackedDates.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {trackedDates.slice(0, 14).map(d => (
            <button key={d} onClick={() => setSelectedDate(d)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${d === selectedDate ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300" : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"}`}>
              {d === today ? "Today" : d}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {showBlocker ? (
          <motion.div key="blocker" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
            <AppBlockingPanel />
          </motion.div>
        ) : (
          <motion.div key="usage" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-5">

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-slate-900/60 border border-white/10 rounded-2xl p-1 w-fit">
              {(["overview","timeline","websites","windows"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${activeTab === tab ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
                  {tab === "overview" ? "📊 Overview" : tab === "timeline" ? "📈 Timeline" : tab === "websites" ? "🌐 Web Sites & Tabs" : "🪟 Windows"}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="grid gap-5 lg:grid-cols-3">
                {/* Category breakdown */}
                <Panel className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" /> Category Breakdown
                  </h3>
                  {categoryTotals.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">
                      {isElectron ? "Use apps — data appears in ~5 seconds." : "Requires desktop app."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {categoryTotals.map(([cat, secs]) => {
                        const pct = totalSeconds > 0 ? (secs / totalSeconds) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${CAT_TAG[cat]}`}>
                                {CAT_EMOJI[cat]} {cat}
                              </span>
                              <span className="text-slate-300">{fmt(secs)} · {Math.round(pct)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "circOut" }}
                                className={`h-full rounded-full bg-gradient-to-r ${CAT_COLORS[cat]}`} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t border-white/5 flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Total</span>
                        <span className="text-white font-black">{fmt(totalSeconds)}</span>
                      </div>
                    </div>
                  )}
                </Panel>

                {/* Per-app list */}
                <div className="lg:col-span-2">
                  <Panel className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-indigo-400" /> App Usage
                        <span className="text-[10px] text-slate-600 font-normal">(FlowTrack excluded)</span>
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">by time</span>
                    </div>
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 pretty-scrollbar">
                      {appSummaries.length === 0 ? (
                        <div className="py-14 text-center">
                          <p className="text-4xl mb-3">🖥️</p>
                          <p className="text-sm text-slate-400 font-semibold">No app activity logged yet</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {isElectron ? "Start using apps — appears in ~5 s" : "Open as desktop app to enable tracking"}
                          </p>
                        </div>
                      ) : appSummaries.map((app, i) => {
                        const pct = totalSeconds > 0 ? (app.totalSeconds / totalSeconds) * 100 : 0;
                        return (
                          <motion.div key={app.appName} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${CAT_TAG[app.category]}`}>
                              {CAT_EMOJI[app.category]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-bold text-white truncate">{app.appName}</span>
                                {app.isLive && (
                                  <span className="flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> LIVE
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "circOut" }}
                                    className={`h-full rounded-full bg-gradient-to-r ${CAT_COLORS[app.category]}`} />
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold">{Math.round(pct)}%</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-white">{fmt(app.totalSeconds)}</p>
                              <p className="text-[10px] text-slate-500">{app.sessions} window{app.sessions > 1 ? "s" : ""}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <Panel className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> 24-Hour Timeline
                    <span className="text-[10px] text-slate-500">— each row = one app, bars show when it was active</span>
                  </h3>
                </div>
                <Timeline rawLog={rawLog} />
              </Panel>
            )}

            {/* 🌐 NEW TAB: Web Sites & Browser Tabs Monitor */}
            {activeTab === "websites" && (
              <Panel className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" /> Web Activity & Browser Tab Tracker
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">{webTabSummaries.length} unique sites/tabs</span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pretty-scrollbar pr-1">
                  {webTabSummaries.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-4xl mb-3">🌐</p>
                      <p className="text-sm text-slate-400 font-semibold">No browser website tabs tracked for this date</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Open Chrome, Edge, Brave, or Firefox and browse websites to log web activity.
                      </p>
                    </div>
                  ) : (
                    webTabSummaries.map((tab, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${tab.domain}&sz=32`}
                            alt="favicon"
                            className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 p-1 border border-white/10"
                            onError={(e) => {
                              (e.target as any).src = "https://www.google.com/s2/favicons?domain=google.com&sz=32";
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{tab.title}</p>
                            <p className="text-[10px] text-cyan-400 font-mono flex items-center gap-2">
                              <span>{tab.domain}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400 uppercase font-sans font-semibold text-[9px]">{tab.browser}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-black text-cyan-300">{fmt(tab.totalSeconds)}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{tab.visitCount} visits/switches</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            )}

            {activeTab === "windows" && (
              <Panel className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" /> Window Activity Log
                  </h3>
                  <span className="text-[10px] text-slate-500">{rawLog.length} entries</span>
                </div>
                <div className="space-y-1 max-h-[500px] overflow-y-auto pretty-scrollbar pr-1">
                  {rawLog.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">No window activity recorded.</p>
                  ) : [...rawLog].reverse().map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <span className={`shrink-0 text-[10px] font-bold rounded-full border px-2 py-0.5 ${CAT_TAG[classifyApp(e.appName)]}`}>
                        {e.appName}
                      </span>
                      <p className="text-xs text-slate-400 truncate flex-1 min-w-0">{e.title || "—"}</p>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-slate-300 font-bold">{fmt(e.durationSeconds)}</p>
                        <p className="text-[9px] text-slate-600 font-mono">
                          {String(e.hour).padStart(2,"0")}:{String(e.minute ?? 0).padStart(2,"0")}
                        </p>
                      </div>
                      {e.isLive && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
