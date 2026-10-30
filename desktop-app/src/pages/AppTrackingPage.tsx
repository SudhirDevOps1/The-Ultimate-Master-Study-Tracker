import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Calendar, ShieldAlert, RefreshCw,
  Activity, Download, ChevronLeft, ChevronRight, Eye, Zap, TrendingUp, Globe,
  Upload, PackageOpen, Trash2, Code2, FolderGit2, Shield, Terminal,
  Search, Laptop, Clock, Flame, CheckCircle2, Copy
} from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore } from "@/store/useAppStore";
import { isOcrEnabled, setOcrEnabled, searchOcrTimeline } from "@/utils/ocrEngine";
import { aggregateCodingStats, type HeartbeatItem } from "@/utils/editorInfo";
import { db } from "@/lib/db";

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
const STUDY   = [
  "vs code","vs code insiders","code","vscode","intellij idea","pycharm","webstorm",
  "phpstorm","clion","goland","visual studio","notepad","notepad++","notepad2",
  "sublime text","atom","vim","neovim","microsoft word","word","excel","powerpoint",
  "onenote","adobe acrobat","adobe reader","obsidian","notion","anki","typora",
  "zotero","jupyter","git","python","node.js","windows terminal","command prompt",
  "git bash","powershell","idea64","pycharm64","webstorm64","devenv","winword","acrobat","acrord32",
  "android studio","studio64","xcode","eclipse","netbeans","postman","docker","dbeaver",
  "pgadmin","mysql workbench","sourcetree","gitkraken","github desktop","sublime_text",
  "texstudio","overleaf","mendeley","mathworks","matlab","mathematica","rstudio",
  "trello","linear","jira","clickup","asana","microsoft to do","todoist",
  "edx","coursera","udemy","khan academy","khanacademy","nptel","unacademy",
  "byju","physics wallah","pw","allen","resonance","fiitjee","vedantu",
  "doubtnut","geeksforgeeks","gfg","leetcode","hackerrank","codechef",
  "codeforces","hackerearth","interviewbit","w3schools","mdn","w3schools",
  "vscodium","cursor","apna college","apnacollege","freecodecamp","codewithharry","code with harry","chai aur code",
];
const BROWSER = [
  "chrome", "google chrome", "edge", "microsoft edge", "msedge",
  "firefox", "mozilla firefox", "brave", "brave browser", "opera",
  "safari", "chromium", "vivaldi", "arc", "waterfox", "tor"
];
const SOCIAL  = [
  "discord","telegram","whatsapp","slack","microsoft teams","teams","msteams",
  "zoom","skype","signal","webex","google meet",
];
const ENTERT  = [
  "vlc","spotify","mpc-hc","potplayer","steam","epic games","twitch",
  "mediaplayerclassic","winamp","mpc_hc","mpc_hc64","potplayermini64",
];

function classifyApp(app: string, title: string = ""): string {
  const n = app.toLowerCase();
  const t = (title || "").toLowerCase();
  const isBrowserProcess = BROWSER.some(b => n.includes(b));
  
  if (isBrowserProcess || n.includes("chrome") || n.includes("firefox") || n.includes("edge") || n.includes("brave") || n.includes("opera") || n.includes("safari")) {
    if (t.includes("youtube") || t.includes("netflix") || t.includes("spotify") || t.includes("twitch") || t.includes("prime video") || t.includes("hotstar") || t.includes("vimeo") || t.includes("mxplayer") || t.includes("music.youtube")) {
      return "entertainment";
    }
    if (t.includes("instagram") || t.includes("linkedin") || t.includes("facebook") || t.includes("twitter") || t.includes(" x ") || t.includes("reddit") || t.includes("whatsapp") || t.includes("discord") || t.includes("telegram") || t.includes("slack")) {
      return "social";
    }
    if (t.includes("github") || t.includes("stackoverflow") || t.includes("leetcode") || t.includes("chatgpt") || t.includes("openai") || t.includes("coursera") || t.includes("udemy") || t.includes("w3schools") || t.includes("wikipedia") || t.includes("mdn") || t.includes("geeksforgeeks") || t.includes("gfg") || t.includes("apna college") || t.includes("freecodecamp") || t.includes("codewithharry") || t.includes("overleaf")) {
      return "study";
    }
  }

  if (STUDY.some(k   => n.includes(k))) return "study";
  if (isBrowserProcess) return "browser";
  if (SOCIAL.some(k  => n.includes(k))) return "social";
  if (ENTERT.some(k  => n.includes(k))) return "entertainment";
  return "system";
}

function extractDevMetadata(appName: string, title: string = ""): { isDev: boolean; language?: string; project?: string } {
  const n = (appName || "").toLowerCase();
  const t = (title || "");
  const isIde = ["vs code", "vscode", "code", "cursor", "intellij", "pycharm", "webstorm", "clion", "goland", "sublime", "neovim", "vim", "vscodium"].some(k => n.includes(k));
  if (!isIde) return { isDev: false };

  let language: string | undefined;
  if (/\.tsx?/i.test(t)) language = "TypeScript";
  else if (/\.jsx?/i.test(t)) language = "JavaScript";
  else if (/\.py/i.test(t)) language = "Python";
  else if (/\.java/i.test(t)) language = "Java";
  else if (/\.rs/i.test(t)) language = "Rust";
  else if (/\.go/i.test(t)) language = "Go";
  else if (/\.(c|cpp|h|hpp)/i.test(t)) language = "C/C++";
  else if (/\.(html|css|scss)/i.test(t)) language = "Web Frontend";
  else if (/\.md/i.test(t)) language = "Documentation";
  else if (/\.json/i.test(t)) language = "Configuration";

  let project: string | undefined;
  const parts = t.split(" - ");
  if (parts.length >= 2) {
    project = parts[parts.length - 2]?.trim();
  }

  return { isDev: true, language, project };
}

function extractWebDomain(title: string, appName: string, rawProcess?: string): { domain: string; cleanTitle: string } | null {
  const nameToCheck = (appName + " " + (rawProcess || "")).toLowerCase();
  const isBrowser = BROWSER.some(b => nameToCheck.includes(b));
  if (!isBrowser || !title || title === "Desktop / Idle" || title === "desktop is idle") return null;

  // Remove browser suffix (e.g. "- Google Chrome", "- Microsoft Edge", etc.)
  const cleanTitle = (title || "")
    .replace(/\s*-\s*(Google Chrome|Mozilla Firefox|Microsoft Edge|Brave|Safari|Opera|Vivaldi|Arc|Chromium)$/i, "")
    .replace(/\s*-\s*Work\s*-\s*Microsoft Edge$/i, "")
    .replace(/\s*-\s*Personal\s*-\s*Microsoft Edge$/i, "")
    .trim() || "Web Tab";
  
  const titleLower = cleanTitle.toLowerCase();
  let domain = "web-page";

  if (titleLower.includes("youtube.com") || titleLower.includes("youtube")) domain = "youtube.com";
  else if (titleLower.includes("instagram.com") || titleLower.includes("instagram")) domain = "instagram.com";
  else if (titleLower.includes("facebook.com") || titleLower.includes("facebook") || titleLower.includes("fb.com")) domain = "facebook.com";
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
  else if (titleLower.includes("apnacollege") || titleLower.includes("apna college")) domain = "apnacollege.in";
  else if (titleLower.includes("freecodecamp")) domain = "freecodecamp.org";
  else if (titleLower.includes("codewithharry")) domain = "codewithharry.com";
  else if (titleLower.includes("geeksforgeeks")) domain = "geeksforgeeks.org";
  else {
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

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572A5",
  "React / TSX": "#61dafb",
  React: "#61dafb",
  "C/C++": "#f34b7d",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Markdown: "#083fa1",
  Documentation: "#083fa1",
  JSON: "#cb171e",
  Configuration: "#cb171e",
  YAML: "#cb171e",
  SQL: "#e38c00",
  Shell: "#89e051",
  Bash: "#89e051",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Other: "#64748b",
};

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const isElectron = typeof window !== "undefined" && !!(window as any).electron?.ipcRenderer;
const getIpc = () => isElectron ? (window as any).electron.ipcRenderer : null;

// ─── Timeline Component ───────────────────────────────────────────────────────
function Timeline({ rawLog }: { rawLog: ActivityEntry[] }) {
  const processedRows = useMemo(() => {
    if (!rawLog || rawLog.length === 0) return [];

    const map = new Map<string, { totalSec: number; entries: ActivityEntry[] }>();
    for (let i = 0; i < rawLog.length; i++) {
      const entry = rawLog[i];
      if (!entry.appName) continue;
      let item = map.get(entry.appName);
      if (!item) {
        item = { totalSec: 0, entries: [] };
        map.set(entry.appName, item);
      }
      item.totalSec += entry.durationSeconds;
      item.entries.push(entry);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1].totalSec - a[1].totalSec)
      .slice(0, 15)
      .map(([appName, item]) => ({
        appName,
        totalSec: item.totalSec,
        appEntries: item.entries,
      }));
  }, [rawLog]);

  if (processedRows.length === 0) return (
    <p className="text-xs text-slate-500 text-center py-6">No timeline data for this day.</p>
  );

  return (
    <div className="space-y-1">
      {/* Hour axis */}
      <div className="flex gap-1 items-center mb-1">
        <span className="w-24 shrink-0" />
        {Array.from({ length: 24 }, (_, h) => (
          h % 3 === 0 ? (
            <span key={h} className="text-[9px] text-slate-600 font-mono" style={{ flex: "0 0 calc((100% - 6rem) / 24 * 3)", textAlign: "left" }}>
              {String(h).padStart(2, "0")}
            </span>
          ) : null
        ))}
      </div>

      {/* One row per app that was active */}
      {processedRows.map(({ appName, totalSec, appEntries }) => (
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
              const cat = classifyApp(entry.appName, entry.title);
              return (
                <div
                  key={i}
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
      ))}

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

function Favicon({ domain }: { domain: string }) {
  const [errorCount, setErrorCount] = useState(0);
  const isFallbackDomain = !domain || domain.endsWith(".site") || domain === "web-page" || domain === "web.site";

  if (isFallbackDomain || errorCount >= 2) {
    return (
      <div className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center border border-white/10 text-cyan-400">
        <Globe className="w-4 h-4 animate-pulse" />
      </div>
    );
  }

  // Engine 1: DuckDuckGo (Faster & supports more parameters)
  // Engine 2: Google s2 favicons (Backup)
  const src = errorCount === 0
    ? `https://icons.duckduckgo.com/ip3/${domain}.ico`
    : `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <img
      src={src}
      alt=""
      className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 p-1 border border-white/10"
      onError={() => setErrorCount(prev => prev + 1)}
    />
  );
}

function AppIcon({ appName, category }: { appName: string; category: string }) {
  const name = appName.toLowerCase();
  
  if (name.includes("word") || name.includes("winword")) {
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-base shrink-0 select-none">
        W
      </div>
    );
  }
  if (name.includes("excel") || name.includes("xls")) {
    return (
      <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-base shrink-0 select-none">
        X
      </div>
    );
  }
  if (name.includes("powerpnt") || name.includes("powerpoint")) {
    return (
      <div className="w-10 h-10 rounded-xl bg-orange-600/15 border border-orange-500/30 flex items-center justify-center font-bold text-orange-400 text-base shrink-0 select-none">
        P
      </div>
    );
  }
  if (name.includes("code") || name.includes("vscode") || name.includes("visual studio")) {
    return (
      <div className="w-10 h-10 rounded-xl bg-cyan-600/15 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-base shrink-0 select-none">
        VS
      </div>
    );
  }
  if (name.includes("chrome")) {
    return (
      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0 select-none">
        CHR
      </div>
    );
  }
  if (name.includes("edge") || name.includes("msedge")) {
    return (
      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0 select-none">
        EDG
      </div>
    );
  }
  if (name.includes("discord")) {
    return (
      <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-xs shrink-0 select-none">
        DIS
      </div>
    );
  }
  if (name.includes("spotify")) {
    return (
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0 select-none">
        SPO
      </div>
    );
  }

  // Fallback to Category Icon
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${CAT_TAG[category]}`}>
      {CAT_EMOJI[category]}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AppTrackingPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [timeScope, setTimeScope]       = useState<"day" | "week" | "month" | "all">("day");
  const [rawLog, setRawLog]             = useState<ActivityEntry[]>([]);
  const [trackedDates, setTrackedDates] = useState<string[]>([]);
  const [liveApp, setLiveApp]           = useState<{ process: string; title: string } | null>(null);
  const [liveIdleMs, setLiveIdleMs]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as "overview"|"timeline"|"websites"|"developer"|"windows") || "overview";
  const [activeTab, setActiveTab] = useState<"overview"|"timeline"|"websites"|"developer"|"windows">(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && ["overview", "timeline", "websites", "developer", "windows"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as any);
    }
  }, [searchParams]);
  const [ocrActive, setOcrActive] = useState(() => isOcrEnabled());
  const [ocrQuery, setOcrQuery] = useState("");
  const [ocrResults, setOcrResults] = useState<any[]>([]);

  useEffect(() => {
    if (ocrActive && activeTab === "timeline") {
      searchOcrTimeline(ocrQuery).then(setOcrResults).catch(() => setOcrResults([]));
    }
  }, [ocrActive, ocrQuery, activeTab]);
  const [heartbeats, setHeartbeats] = useState<HeartbeatItem[]>([]);

  useEffect(() => {
    const ipc = getIpc();
    if (!ipc) return;
    const loadHeartbeats = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      ipc.invoke("heartbeat-get-day", selectedDate).then((items: any) => {
        if (Array.isArray(items)) setHeartbeats(items);
        else setHeartbeats([]);
      }).catch(() => setHeartbeats([]));
    };
    loadHeartbeats();
    const interval = setInterval(loadHeartbeats, 6000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const realCodingStats = useMemo(() => aggregateCodingStats(heartbeats), [heartbeats]);
  const handleAutoConfigureIde = async () => {
    const ipc = getIpc();
    if (!ipc) {
      alert("IDE auto-configuration is available in the desktop app.");
      return;
    }
    const res = await ipc.invoke("auto-configure-wakatime-cfg");
    if (res?.ok) {
      alert("Success! Configured ~/.wakatime.cfg pointing to FlowTrack (127.0.0.1:7777).\n\nNow open VS Code, Cursor, or JetBrains with the WakaTime extension installed. Your real files and projects will stream live into FlowTrack!");
    } else {
      alert(res?.error || "Could not write ~/.wakatime.cfg. You can copy the manual configuration below.");
    }
  };

  const handleClearHeartbeats = async () => {
    if (!window.confirm("Are you sure you want to clear all heartbeat pulses? This will remove all test and recorded pulses.")) return;
    const ipc = getIpc();
    if (ipc) {
      await ipc.invoke("heartbeat-clear");
      setHeartbeats([]);
    }
  };
  const [heartbeatSearch, setHeartbeatSearch] = useState("");
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle"|"exporting"|"importing">("idle");
  const [weeklyOverview, setWeeklyOverview] = useState<{ date: string; seconds: number }[]>([]);
  const [periodTotals, setPeriodTotals] = useState<{ today: number; week: number; month: number; allTime: number }>({
    today: 0,
    week: 0,
    month: 0,
    allTime: 0,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const today   = new Date().toISOString().split("T")[0];
  const initApp = useAppStore(s => s.initApp);
  const importAll = useAppStore(s => s.importAll);

  // ── Fetch past 7 days of screen time totals ─────────────────────────────
  useEffect(() => {
    const fetchWeeklyOverview = async () => {
      const ipc = getIpc();
      if (!ipc || trackedDates.length === 0) return;
      try {
        // Take the last 7 tracked dates (newest first in trackedDates, reverse to show left-to-right chrono)
        const datesToFetch = trackedDates.slice(0, 7).reverse();
        const totals = await Promise.all(
          datesToFetch.map(async (d) => {
            const entries: ActivityEntry[] = await ipc.invoke("get-activity-log", { date: d });
            const total = entries.reduce((sum, e) => sum + e.durationSeconds, 0);
            return { date: d, seconds: total };
          })
        );
        setWeeklyOverview(totals);
      } catch (err) {
        console.warn("[AppTracking] Error loading weekly overview", err);
      }
    };
    void fetchWeeklyOverview();
  }, [trackedDates]);

  // ── Fetch all period totals (Today, Week, Month, All-Time) ──────────────
  const fetchPeriodTotals = useCallback(async () => {
    const ipc = getIpc();
    if (!ipc || trackedDates.length === 0) return;
    try {
      const todayEntries: ActivityEntry[] = await ipc.invoke("get-activity-log", { date: today });
      const todaySec = (todayEntries || []).reduce((sum, e) => sum + e.durationSeconds, 0);

      const weekDates = trackedDates.slice(0, 7);
      const weekLogs: ActivityEntry[][] = await Promise.all(weekDates.map(d => ipc.invoke("get-activity-log", { date: d })));
      const weekSec = weekLogs.flat().reduce((sum, e) => sum + e.durationSeconds, 0);

      const monthDates = trackedDates.slice(0, 30);
      const monthLogs: ActivityEntry[][] = await Promise.all(monthDates.map(d => ipc.invoke("get-activity-log", { date: d })));
      const monthSec = monthLogs.flat().reduce((sum, e) => sum + e.durationSeconds, 0);

      const allLogs: ActivityEntry[][] = await Promise.all(trackedDates.map(d => ipc.invoke("get-activity-log", { date: d })));
      const allSec = allLogs.flat().reduce((sum, e) => sum + e.durationSeconds, 0);

      setPeriodTotals({
        today: todaySec,
        week: weekSec,
        month: monthSec,
        allTime: allSec,
      });
    } catch (e) {
      console.warn("[AppTracking] Error loading period totals", e);
    }
  }, [trackedDates, today]);

  // ── Fetch activity log based on timeScope ──────────────────────────────
  const fetchLog = useCallback(async (scope: "day" | "week" | "month" | "all", date: string) => {
    const ipc = getIpc();
    if (!ipc) return;
    setLoading(true);
    try {
      if (scope === "day") {
        const entries: ActivityEntry[] = await ipc.invoke("get-activity-log", { date });
        setRawLog(entries);
      } else if (scope === "week") {
        const datesToLoad = trackedDates.slice(0, 7);
        const logs: ActivityEntry[][] = await Promise.all(datesToLoad.map(d => ipc.invoke("get-activity-log", { date: d })));
        setRawLog(logs.flat());
      } else if (scope === "month") {
        const datesToLoad = trackedDates.slice(0, 30);
        const logs: ActivityEntry[][] = await Promise.all(datesToLoad.map(d => ipc.invoke("get-activity-log", { date: d })));
        setRawLog(logs.flat());
      } else if (scope === "all") {
        const logs: ActivityEntry[][] = await Promise.all(trackedDates.map(d => ipc.invoke("get-activity-log", { date: d })));
        setRawLog(logs.flat());
      }
    } catch (e) { console.warn("[AppTracking]", e); }
    setLoading(false);
  }, [trackedDates]);

  // ── Fetch available historical dates ───────────────────────────────────
  const fetchDates = useCallback(async () => {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const dates: string[] = await ipc.invoke("get-tracked-dates");
      setTrackedDates(dates && dates.length > 0 ? dates : [today]);
    } catch { /* ignore */ }
  }, [today]);

  // ── Poll live data and listen for instant active-window events ──────────
  useEffect(() => {
    const ipc = getIpc();
    if (!ipc) return;

    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const [win, idle] = await Promise.all([
          ipc.invoke("get-active-window"),
          ipc.invoke("get-idle-time-ms"),
        ]);
        const showLive = win && !win.skip && win.appName;
        setLiveApp(showLive ? { process: win.appName, title: win.title } : null);
        setLiveIdleMs(idle as number);
      } catch { /* ignore */ }
    };
    void poll();
    pollRef.current = setInterval(() => void poll(), 5000);

    // Instant notification from main process when active window switches
    const cleanupListener = ipc.on?.("active-window-changed", (data: any) => {
      if (data && data.appName) {
        setLiveApp({ process: data.appName, title: data.title || "" });
      }
    });

    return () => {
      clearInterval(pollRef.current);
      if (typeof cleanupListener === "function") cleanupListener();
    };
  }, []);

  // ── Auto-refresh log and period totals ─────────────────────────────────
  useEffect(() => {
    void fetchLog(timeScope, selectedDate);
    void fetchDates();
    void fetchPeriodTotals();
  }, [timeScope, selectedDate, fetchLog, fetchDates, fetchPeriodTotals]);

  useEffect(() => {
    if (timeScope === "day" && selectedDate !== today) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fetchLog(timeScope, selectedDate);
      void fetchPeriodTotals();
    }, 6_000);
    return () => clearInterval(id);
  }, [timeScope, selectedDate, today, fetchLog, fetchPeriodTotals]);

  // ── Strict Date Filtered Log ───────────────────────────────────────────
  const dailyLog = useMemo(() => {
    if (timeScope !== "day") return rawLog;
    return rawLog.filter(e => !e.date || e.date === selectedDate);
  }, [rawLog, selectedDate, timeScope]);

  // ── App Aggregations ───────────────────────────────────────────────────
  const appSummaries: AppSummary[] = useMemo(() => {
    const map = new Map<string, AppSummary>();
    for (const e of dailyLog) {
      const key = e.appName.toLowerCase();
      if (!map.has(key)) map.set(key, { appName: e.appName, totalSeconds: 0, sessions: 0, category: classifyApp(e.appName, e.title), isLive: false });
      const r = map.get(key)!;
      r.totalSeconds += e.durationSeconds;
      r.sessions++;
      if (e.isLive) r.isLive = true;
    }
    return [...map.values()].sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [dailyLog]);

  // ── Web Sites & Tabs Aggregations ──────────────────────────────────────
  const webTabSummaries: WebTabSummary[] = useMemo(() => {
    const map = new Map<string, WebTabSummary>();
    for (const e of dailyLog) {
      const extracted = extractWebDomain(e.title, e.appName, (e as any).rawProcess);
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
  }, [dailyLog]);

  const totalSeconds = useMemo(() => appSummaries.reduce((s, a) => s + a.totalSeconds, 0), [appSummaries]);

  const categoryTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of dailyLog) {
      const cat = classifyApp(e.appName, e.title);
      m[cat] = (m[cat] ?? 0) + e.durationSeconds;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [dailyLog]);

  // ── Developer Coding & Language Aggregations (Wakapi / Dayflow Inspired) ─
  const devSummaries = useMemo(() => {
    const langMap = new Map<string, number>();
    const projMap = new Map<string, number>();
    for (const e of dailyLog) {
      const dev = extractDevMetadata(e.appName, e.title);
      if (dev.isDev) {
        if (dev.language) {
          langMap.set(dev.language, (langMap.get(dev.language) || 0) + e.durationSeconds);
        }
        if (dev.project) {
          projMap.set(dev.project, (projMap.get(dev.project) || 0) + e.durationSeconds);
        }
      }
    }
    return {
      languages: [...langMap.entries()].sort((a, b) => b[1] - a[1]),
      projects: [...projMap.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [dailyLog]);

  const displayLanguages = useMemo(() => {
    if (realCodingStats.languages.length > 0) {
      return realCodingStats.languages;
    }
    const total = devSummaries.languages.reduce((acc, [, s]) => acc + s, 0);
    return devSummaries.languages.map(([name, seconds]) => ({
      name,
      seconds,
      percent: total > 0 ? Math.round((seconds / total) * 100) : 0,
    }));
  }, [realCodingStats.languages, devSummaries.languages]);

  const displayProjects = useMemo(() => {
    if (realCodingStats.projects.length > 0) {
      return realCodingStats.projects;
    }
    const total = devSummaries.projects.reduce((acc, [, s]) => acc + s, 0);
    return devSummaries.projects.map(([name, seconds]) => ({
      name,
      seconds,
      percent: total > 0 ? Math.round((seconds / total) * 100) : 0,
    }));
  }, [realCodingStats.projects, devSummaries.projects]);

  const totalDevSeconds = useMemo(() => {
    return realCodingStats.totalSeconds || devSummaries.languages.reduce((acc, [, s]) => acc + s, 0) || 0;
  }, [realCodingStats.totalSeconds, devSummaries.languages]);

  const hourlyCodingDistribution = useMemo(() => {
    const hours = Array(24).fill(0);
    for (const h of heartbeats) {
      const d = new Date(h.time * 1000);
      const hr = d.getHours();
      if (hr >= 0 && hr < 24) {
        hours[hr] += 120;
      }
    }
    return hours;
  }, [heartbeats]);

  const maxHourlySecs = useMemo(() => {
    return Math.max(...hourlyCodingDistribution, 1);
  }, [hourlyCodingDistribution]);

  const peakHourIndex = useMemo(() => {
    let max = 0;
    let idx = -1;
    hourlyCodingDistribution.forEach((sec, hr) => {
      if (sec > max) {
        max = sec;
        idx = hr;
      }
    });
    return idx;
  }, [hourlyCodingDistribution]);

  const filteredHeartbeats = useMemo(() => {
    if (!heartbeatSearch.trim()) return heartbeats;
    const q = heartbeatSearch.toLowerCase();
    return heartbeats.filter(h =>
      (h.entity && h.entity.toLowerCase().includes(q)) ||
      (h.project && h.project.toLowerCase().includes(q)) ||
      (h.language && h.language.toLowerCase().includes(q))
    );
  }, [heartbeats, heartbeatSearch]);

  // ── Date navigation ────────────────────────────────────────────────────
  const dateIdx   = trackedDates.indexOf(selectedDate);
  const prevDate  = trackedDates[dateIdx + 1];
  const nextDate  = trackedDates[dateIdx - 1];

  const differenceText = useMemo(() => {
    if (weeklyOverview.length < 2) return null;
    const todayData = weeklyOverview[weeklyOverview.length - 1];
    const yesterdayData = weeklyOverview[weeklyOverview.length - 2];
    const diff = todayData.seconds - yesterdayData.seconds;
    if (diff === 0) return "⚖️ Same usage as yesterday";
    const absDiffStr = fmt(Math.abs(diff));
    return diff > 0 ? `📈 ${absDiffStr} more than yesterday` : `📉 ${absDiffStr} less than yesterday`;
  }, [weeklyOverview]);

  const distractionAlert = useMemo(() => {
    let productiveSecs = 0;
    let distractionSecs = 0;
    for (const e of rawLog) {
      const cat = classifyApp(e.appName, e.title);
      if (cat === "study") productiveSecs += e.durationSeconds;
      else if (cat === "social" || cat === "entertainment") distractionSecs += e.durationSeconds;
    }
    if (distractionSecs > productiveSecs && distractionSecs > 10 * 60) {
      const ratio = Math.round((distractionSecs / Math.max(1, productiveSecs)) * 10) / 10;
      return {
        text: `⚠️ Screen distraction ratio is higher than study focus time (${ratio}x). Consider turning on Strict Focus Mode to lock down browser tabs!`,
        type: "warning"
      };
    }
    if (productiveSecs > distractionSecs && productiveSecs > 30 * 60) {
      return {
        text: "🎉 Excellent job! You are staying highly focused today. Keep building the momentum!",
        type: "success"
      };
    }
    return null;
  }, [rawLog]);

  const idleMin   = Math.floor(liveIdleMs / 60000);
  const idlePct   = Math.min(100, (liveIdleMs / (10 * 60 * 1000)) * 100);

  // ── Export CSV ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    try {
      const result = await ipc.invoke("export-activity-csv", { date: selectedDate });
      if (result.success) alert(`✅ Exported to:\n${result.path}`);
      else if (result.reason !== "cancelled") alert(`❌ Export failed: ${result.error}`);
    } catch (e: any) { alert(`Export error: ${e.message}`); }
  };

  // ── Export Full App Data (JSON Backup) ─────────────────────────────────
  const handleExportAll = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    setExportStatus("exporting");
    try {
      // Collect all data from Dexie
      const [subjects, sessions, settings] = await Promise.all([
        db.subjects.toArray(),
        db.sessions.toArray(),
        db.settings.toArray(),
      ]);
      const result = await ipc.invoke("export-app-data", {
        appData: { subjects, sessions, settings },
      });
      if (result.success) alert(`✅ Full backup saved to:\n${result.path}`);
      else if (result.reason !== "cancelled") alert(`❌ Export failed: ${result.error}`);
    } catch (e: any) { alert(`Export error: ${e.message}`); }
    setExportStatus("idle");
  };

  // ── Import Full App Data (JSON Restore) ────────────────────────────────
  const handleImportAll = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    const confirmed = window.confirm(
      "⚠️ Import will REPLACE all existing study sessions, subjects & settings.\n" +
      "Activity log will be merged.\n\nProceed with import?"
    );
    if (!confirmed) return;

    setExportStatus("importing");
    try {
      const result = await ipc.invoke("import-app-data");
      if (!result.success) {
        if (result.reason !== "cancelled") alert(`❌ Import failed: ${result.error || "Unknown error"}`);
        setExportStatus("idle");
        return;
      }

      const { appData } = result;
      if (appData?.subjects && appData?.sessions) {
        await importAll(
          appData.subjects,
          appData.sessions,
          appData.settings || []
        );
      }

      await initApp();
      void fetchLog(timeScope, selectedDate);
      void fetchDates();
      alert(`✅ Import successful!\nBacked up on: ${new Date(result.exportedAt).toLocaleString()}\nVersion: ${result.version}`);
    } catch (e: any) { alert(`Import error: ${e.message}`); }
    setExportStatus("idle");
  };

  // ── Clear App Tracking Logs ───────────────────────────────────────────
  const handleClearLogs = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    const confirmed = window.confirm(
      "⚠️ Are you sure you want to clear ALL App & Website Activity Tracking logs?\n\n" +
      "This will permanently delete all activity log files stored on disk. This action CANNOT be undone."
    );
    if (!confirmed) return;

    try {
      const res = await ipc.invoke("clear-activity-log");
      if (res?.success) {
        alert("✅ App & Website activity tracking logs cleared successfully!");
        void fetchLog(timeScope, selectedDate);
        void fetchDates();
      } else {
        alert(`❌ Failed to clear logs: ${res?.error || "Unknown error"}`);
      }
    } catch (e: any) { alert(`Clear logs error: ${e.message}`); }
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
            <Download className="w-3.5 h-3.5" /> CSV
          </button>

          {/* Full App Data Export */}
          <button onClick={handleExportAll} disabled={!isElectron || exportStatus !== "idle"} title="Export full app backup (JSON)" 
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-40">
            <PackageOpen className="w-3.5 h-3.5" />
            {exportStatus === "exporting" ? "Exporting..." : "Backup"}
          </button>

          {/* Full App Data Import */}
          <button onClick={handleImportAll} disabled={!isElectron || exportStatus !== "idle"} title="Import app data from JSON backup"
            className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-40">
            <Upload className="w-3.5 h-3.5" />
            {exportStatus === "importing" ? "Restoring..." : "Restore"}
          </button>

          {/* Clear App Tracking Activity Logs */}
          {isElectron && (
            <button onClick={handleClearLogs} title="Clear all app & website tracking logs"
              className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Clear Logs
            </button>
          )}

          <button onClick={() => { void fetchLog(timeScope, selectedDate); void fetchDates(); }}
            className={`p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors ${loading ? "animate-spin" : ""}`}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Live & Period Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Live active app / tab */}
        <motion.div animate={{ scale: liveApp ? [1, 1.005, 1] : 1 }} transition={{ repeat: Infinity, duration: 3 }}
          className="col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${liveApp ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            {liveApp ? "Currently Active Window / Tab" : "Idle / No Active Window"}
          </p>
          {liveApp ? (
            <>
              <p className="mt-1 text-base font-black text-white truncate">{liveApp.process}</p>
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
          <p className={`mt-1 text-xl font-black tabular-nums ${liveIdleMs >= 10 * 60 * 1000 ? "text-rose-400" : liveIdleMs >= 5 * 60 * 1000 ? "text-amber-400" : "text-white"}`}>
            {idleMin > 0 ? `${idleMin}m` : `${Math.floor(liveIdleMs / 1000)}s`}
          </p>
          <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${idlePct}%` }} transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${liveIdleMs >= 10 * 60 * 1000 ? "bg-rose-500" : liveIdleMs >= 5 * 60 * 1000 ? "bg-amber-400" : "bg-emerald-400"}`} />
          </div>
          <p className="text-[9px] text-slate-500 mt-1">{liveIdleMs >= 10 * 60 * 1000 ? "⏸ Paused" : "✅ Active"}</p>
        </div>

        {/* Today Total */}
        <button 
          onClick={() => { setTimeScope("day"); setSelectedDate(today); }}
          className={`text-left rounded-2xl border p-4 transition-all ${timeScope === "day" && selectedDate === today ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30" : "border-white/10 bg-slate-900 hover:bg-slate-850"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📅 Today</p>
          <p className="mt-1 text-xl font-black text-cyan-400">{fmt(periodTotals.today || (selectedDate === today ? totalSeconds : 0))}</p>
          <p className="text-[9px] text-slate-500 mt-1">Single Day</p>
        </button>

        {/* Past 7 Days (Week) */}
        <button 
          onClick={() => setTimeScope("week")}
          className={`text-left rounded-2xl border p-4 transition-all ${timeScope === "week" ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30" : "border-white/10 bg-slate-900 hover:bg-slate-850"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📆 7 Days (Week)</p>
          <p className="mt-1 text-xl font-black text-indigo-400">{fmt(periodTotals.week)}</p>
          <p className="text-[9px] text-slate-500 mt-1">Past Week Total</p>
        </button>

        {/* Past 30 Days (Month) / All Time */}
        <button 
          onClick={() => setTimeScope("month")}
          className={`text-left rounded-2xl border p-4 transition-all ${timeScope === "month" ? "border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-500/30" : "border-white/10 bg-slate-900 hover:bg-slate-850"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📊 30 Days (Month)</p>
          <p className="mt-1 text-xl font-black text-purple-400">{fmt(periodTotals.month)}</p>
          <p className="text-[9px] text-slate-500 mt-1">30 Days Total</p>
        </button>
      </div>

      {/* ── Distraction Warning Banner ── */}
      {distractionAlert && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-sm transition-all ${
          distractionAlert.type === "warning" 
            ? "border-rose-500/20 bg-rose-500/10 text-rose-300" 
            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        }`}>
          {distractionAlert.text}
        </div>
      )}

      {/* ── Digital Wellbeing Past 7 Days Chart ── */}
      {weeklyOverview.length > 0 && (
        <Panel className="space-y-4 bg-gradient-to-br from-slate-900 to-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                📊 Daily Screen Time Summary (Past {weeklyOverview.length} Tracked Days)
              </h2>
              <p className="text-[10px] text-slate-500">
                Click any bar to load historical app and browser activity log entries
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
              Digital Wellbeing
            </span>
          </div>

          {/* Bar chart */}
          <div className="relative h-32 flex items-end gap-1.5 overflow-x-auto min-w-[280px] mt-2">
            {weeklyOverview.map((item) => {
              const maxSecs = Math.max(...weeklyOverview.map(w => w.seconds), 1);
              const heightPct = Math.max(6, (item.seconds / maxSecs) * 100);
              const isSelected = timeScope === "day" && item.date === selectedDate;
              
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center min-w-[36px] h-full justify-end gap-1 group select-none">
                  {/* Value badge */}
                  <span className={`text-[10px] font-bold leading-none ${isSelected ? "text-cyan-400" : "text-slate-400 group-hover:text-white"} transition-colors`}>
                    {item.seconds > 0 ? fmt(item.seconds).split(" ")[0] : "—"}
                  </span>
                  
                  {/* Bar */}
                  <button
                    onClick={() => {
                      setTimeScope("day");
                      setSelectedDate(item.date);
                    }}
                    title={`${item.date}: ${item.seconds > 0 ? fmt(item.seconds) : "No data"}`}
                    className="w-full focus:outline-none"
                    style={{ height: `${heightPct}%`, minHeight: "6px" }}
                  >
                    <div className={`h-full w-full rounded-t-lg transition-all duration-200 ${
                      isSelected 
                        ? "bg-gradient-to-t from-cyan-500 to-indigo-400 shadow-[0_0_14px_rgba(34,211,238,0.5)]" 
                        : "bg-gradient-to-t from-slate-600 to-slate-400 group-hover:from-cyan-600/80 group-hover:to-cyan-300/90"
                    }`} />
                  </button>

                  {/* Day label */}
                  <span className={`text-[9px] font-bold ${isSelected ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"} transition-colors`}>
                    {item.date === today ? "Today" : item.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Scope & History Controls ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-white/10 rounded-2xl p-2.5">
        {/* Scope Pill Filter */}
        <div className="flex items-center gap-1 bg-black/30 rounded-xl p-1 border border-white/5">
          <button
            onClick={() => setTimeScope("day")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeScope === "day" ? "bg-cyan-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            📅 Single Day
          </button>
          <button
            onClick={() => setTimeScope("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeScope === "week" ? "bg-indigo-500 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            📆 Past 7 Days
          </button>
          <button
            onClick={() => setTimeScope("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeScope === "month" ? "bg-purple-500 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            📊 Past 30 Days
          </button>
          <button
            onClick={() => setTimeScope("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeScope === "all" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            ♾️ All Time
          </button>
        </div>

        {/* Date Quick Filter (when in Day mode) */}
        {timeScope === "day" && trackedDates.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {trackedDates.slice(0, 7).map(d => (
              <button 
                key={d} 
                onClick={() => setSelectedDate(d)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${d === selectedDate ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                {d === today ? "Today" : d}
              </button>
            ))}
          </div>
        )}

        {timeScope !== "day" && (
          <span className="text-xs font-semibold text-slate-400 px-2">
            ✨ Showing aggregated screen time for <span className="text-cyan-300 font-bold">{timeScope === "week" ? "Past 7 Days" : timeScope === "month" ? "Past 30 Days" : "All-Time History"}</span> ({fmt(totalSeconds)})
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="usage" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-5">

            {/* ── FlowTrack Core Engines Status Bar ── */}
            <div className="grid sm:grid-cols-2 gap-3">
              {/* FlowTrack Sensor Core */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-950 border border-emerald-500/20 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>FlowTrack Native Sensor Core</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        100% PRIVATE
                      </span>
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      {liveIdleMs >= 10 * 60 * 1000 ? "⏸ AFK DETECTED" : "✅ SENSOR ACTIVE"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    OS-level AFK idle detection & background window tracker daemon. <b>100% on-device</b> SQLite WAL / Dexie; zero data transmission to external servers.
                  </p>
                </div>
              </div>

              {/* FlowTrack Developer Intelligence */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-950 border border-cyan-500/20 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>FlowTrack Developer Intelligence</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        PORT 7777
                      </span>
                    </h4>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                      {heartbeats.length > 0 ? `⚡ ${heartbeats.length} Heartbeats` : "🟢 Receiver Active"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Automated IDE workspace classification, programming language analytics, and 24-hour coding rhythm tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 border border-white/10 rounded-2xl p-1.5 shadow-lg backdrop-blur-md">
              {[
                { id: "overview", label: "📊 Overview", count: appSummaries.length },
                { id: "timeline", label: "📈 Timeline", count: dailyLog.length > 0 ? 1 : 0 },
                { id: "websites", label: "🌐 Web Sites & Tabs", count: webTabSummaries.length },
                { id: "developer", label: "⚡ Developer Studio", count: heartbeats.length || displayLanguages.length },
                { id: "windows", label: "🪟 Windows Log", count: dailyLog.length },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
                    activeTab === t.id
                      ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm shadow-cyan-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                      activeTab === t.id
                        ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {t.count}
                    </span>
                  )}
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
                            <AppIcon appName={app.appName} category={app.category} />
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
                          <Favicon domain={tab.domain} />
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

            {activeTab === "developer" && (
              <div className="space-y-6">
                {/* ── 1. Developer Studio Cockpit Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Total Coding Time */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <Clock className="w-3.5 h-3.5" /> Total Coding Time
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        TODAY
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-white tabular-nums">
                      {fmt(totalDevSeconds)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 font-mono">
                      {heartbeats.length} editor pulses logged
                    </p>
                  </div>

                  {/* Peak Focus Hour */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-indigo-400">
                        <Flame className="w-3.5 h-3.5" /> Peak Coding Rhythm
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        RHYTHM
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-white">
                      {peakHourIndex >= 0 ? `${peakHourIndex % 12 || 12} ${peakHourIndex >= 12 ? "PM" : "AM"}` : "None Yet"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {peakHourIndex >= 0 ? `${fmt(hourlyCodingDistribution[peakHourIndex])} focused coding` : "Awaiting IDE pulses"}
                    </p>
                  </div>

                  {/* Top Language */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-purple-400">
                        <Code2 className="w-3.5 h-3.5" /> Dominant Syntax
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {displayLanguages.length} Languages
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-white truncate">
                      {displayLanguages[0]?.name || "None"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 font-mono">
                      {displayLanguages[0] ? `${displayLanguages[0].percent}% of total coding` : "No language detected"}
                    </p>
                  </div>

                  {/* Top Workspace */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <FolderGit2 className="w-3.5 h-3.5" /> Top Project
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {displayProjects.length} Active
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-white truncate" title={displayProjects[0]?.name}>
                      {displayProjects[0]?.name || "None"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 font-mono">
                      {displayProjects[0] ? fmt(displayProjects[0].seconds) : "No project active"}
                    </p>
                  </div>
                </div>

                {/* ── 2. Languages Multi-Colored Segmented Bar & Cards ── */}
                <Panel className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-cyan-400" /> Programming Languages Breakdown
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Real-time syntax classification captured live from your editor buffer.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {displayLanguages.length} Active Languages
                    </span>
                  </div>

                  {displayLanguages.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-xs space-y-3">
                      <p>No active coding heartbeats detected for {selectedDate}.</p>
                      <p className="text-[11px] text-slate-400">Connect VS Code, Cursor, or JetBrains to see your live languages distribution.</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          onClick={handleAutoConfigureIde}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>⚡ 1-Click Connect Real IDE</span>
                        </button>
                        <button
                          onClick={async () => {
                            const ipc = getIpc();
                            if (ipc) {
                              await ipc.invoke("send-test-heartbeat");
                              ipc.invoke("heartbeat-get-day", selectedDate).then((items: any) => {
                                if (Array.isArray(items)) setHeartbeats(items);
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 text-slate-400 border border-white/10 text-xs font-medium hover:bg-white/10 transition-all cursor-pointer"
                          title="Generate a diagnostic test pulse to verify local loopback (127.0.0.1:7777) receiver"
                        >
                          <span>🧪 Diagnostic Pulse Probe</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Segmented Color Bar */}
                      <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner border border-white/10 p-0.5">
                        {displayLanguages.map(l => (
                          <div
                            key={l.name}
                            style={{
                              width: `${Math.max(l.percent, 2)}%`,
                              backgroundColor: LANG_COLORS[l.name] || "#38bdf8"
                            }}
                            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:brightness-125 cursor-pointer"
                            title={`${l.name}: ${fmt(l.seconds)} (${l.percent}%)`}
                          />
                        ))}
                      </div>

                      {/* Language Badges Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
                        {displayLanguages.map(l => {
                          const color = LANG_COLORS[l.name] || "#38bdf8";
                          return (
                            <div
                              key={l.name}
                              className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="flex items-center gap-2 text-xs font-bold text-white truncate">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                                  <span className="truncate">{l.name}</span>
                                </span>
                                <span className="text-[11px] font-mono font-bold text-slate-300">
                                  {l.percent}%
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span>{fmt(l.seconds)}</span>
                                <div className="h-1 w-14 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${l.percent}%`, backgroundColor: color }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Panel>

                {/* ── 3. 24-Hour Coding Rhythm Chart ── */}
                <Panel className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" /> 24-Hour Coding Rhythm
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Hourly focus volume throughout the day. Hover any bar to view duration.
                      </p>
                    </div>
                    {peakHourIndex >= 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                        Peak Hour: {peakHourIndex % 12 || 12} {peakHourIndex >= 12 ? "PM" : "AM"}
                      </span>
                    )}
                  </div>

                  <div className="pt-2">
                    <div className="h-28 flex items-end justify-between gap-1 px-1">
                      {hourlyCodingDistribution.map((sec, hr) => {
                        const heightPct = Math.max((sec / maxHourlySecs) * 100, sec > 0 ? 12 : 4);
                        const isPeak = hr === peakHourIndex && sec > 0;
                        const label = `${hr % 12 || 12}${hr >= 12 ? "p" : "a"}`;
                        return (
                          <div
                            key={hr}
                            className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                            title={`${hr}:00 - ${hr + 1}:00: ${fmt(sec)}`}
                          >
                            <div className="w-full flex items-end justify-center h-20">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full rounded-t-md transition-all duration-300 ${
                                  isPeak
                                    ? "bg-gradient-to-t from-cyan-500 to-indigo-400 shadow-lg shadow-cyan-500/20"
                                    : sec > 0
                                    ? "bg-indigo-500/50 group-hover:bg-indigo-400"
                                    : "bg-slate-800/40 group-hover:bg-slate-700/60"
                                }`}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300">
                              {hr % 3 === 0 ? label : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Panel>

                {/* ── 4. Projects & Editors Matrix ── */}
                <div className="grid gap-5 md:grid-cols-2">
                  {/* Projects */}
                  <Panel className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-indigo-400" /> Active Projects & Workspaces
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">
                        {displayProjects.length} Repositories
                      </span>
                    </div>

                    {displayProjects.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        No project workspaces detected yet. Work in any code repository to see time per project.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[340px] overflow-y-auto pretty-scrollbar pr-1">
                        {displayProjects.map((proj, idx) => (
                          <div
                            key={proj.name}
                            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 font-bold text-xs">
                                #{idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate">{proj.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="h-1 flex-1 max-w-[120px] bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${proj.percent}%` }} />
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">{proj.percent}%</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-indigo-300 ml-3 shrink-0">
                              {fmt(proj.seconds)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>

                  {/* Editors & IDEs */}
                  <Panel className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-cyan-400" /> Editors & Environments
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">
                        {realCodingStats.editors.length || 1} Detected
                      </span>
                    </div>

                    {realCodingStats.editors.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                        <p>No editor telemetry recorded yet.</p>
                        <p className="text-[11px] text-slate-400">VS Code, Cursor, Antigravity, and JetBrains stream editor telemetry automatically.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[340px] overflow-y-auto pretty-scrollbar pr-1">
                        {realCodingStats.editors.map(ed => (
                          <div
                            key={ed.name}
                            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0 font-bold text-xs">
                                IDE
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate">{ed.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{ed.percent}% of coding time</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-cyan-300 ml-3 shrink-0">
                              {fmt(ed.seconds)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                </div>

                {/* ── 5. Live Pulse Stream with Instant Search ── */}
                <Panel className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" /> Real-Time Developer Pulse Stream
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Live stream of code edits, active files, and workspace commits.
                      </p>
                    </div>

                    {/* Search & Actions */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={heartbeatSearch}
                          onChange={(e) => setHeartbeatSearch(e.target.value)}
                          placeholder="Search file or project..."
                          className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-44 sm:w-56"
                        />
                      </div>

                      <button
                        onClick={handleAutoConfigureIde}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
                        title="Automatically configure ~/.wakatime.cfg for VS Code / Cursor"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Connect IDE</span>
                      </button>

                      <button
                        onClick={async () => {
                          const ipc = getIpc();
                          if (ipc) {
                            const items = await ipc.invoke("heartbeat-get-day", selectedDate);
                            if (Array.isArray(items)) setHeartbeats(items);
                          }
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 transition-colors cursor-pointer"
                        title="Refresh live pulse stream"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={handleClearHeartbeats}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                        title="Clear all recorded pulses (remove test data)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {filteredHeartbeats.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-xs">
                      {heartbeats.length === 0 ? "No code pulses recorded for this date." : "No pulses match your search."}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pretty-scrollbar pr-1">
                      {[...filteredHeartbeats].reverse().slice(0, 30).map((h, idx) => {
                        const langColor = LANG_COLORS[h.language || "Other"] || "#38bdf8";
                        const isSimulated = Boolean(h.editor?.includes("Simulated") || h.entity?.includes("test-session.ts"));
                        return (
                          <div
                            key={h.id || idx}
                            className={`flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border transition-all text-xs ${
                              isSimulated ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-white/5 hover:border-cyan-500/30"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                style={{ backgroundColor: `${langColor}20`, borderColor: `${langColor}40`, color: langColor }}
                                className="px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0"
                              >
                                {h.language || "Code"}
                              </span>
                              {isSimulated && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-extrabold uppercase shrink-0">
                                  Test Probe
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-slate-200 truncate text-[11px]" title={h.entity}>
                                  {h.entity}
                                </p>
                                <p className="text-[9px] text-slate-500 flex items-center gap-2">
                                  <span>Project: <b className="text-slate-400">{h.project || "Default"}</b></span>
                                  <span>•</span>
                                  <span>Editor: <b className="text-slate-400">{h.editor || "Editor"}</b></span>
                                  {h.branch && (
                                    <>
                                      <span>•</span>
                                      <span>Branch: <b className="text-indigo-400 font-mono">{h.branch}</b></span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-3">
                              {new Date(h.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>

                {/* ── 6. FlowTrack Studio Quick Setup Assistant ── */}
                <Panel className="space-y-3 bg-gradient-to-r from-slate-900 to-slate-950 border border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white">FlowTrack Developer Studio Connection Guide</h4>
                    </div>
                    <button
                      onClick={() => {
                        const config = `[settings]\napi_key = 00000000-0000-4000-8000-000000000000\napi_url = http://127.0.0.1:7777/api/v1\n`;
                        navigator.clipboard.writeText(config);
                        setCopiedConfig(true);
                        setTimeout(() => setCopiedConfig(false), 2500);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold transition-all"
                    >
                      {copiedConfig ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedConfig ? "Config Copied!" : "1-Click Copy IDE Config"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Point your IDE telemetry plugin (VS Code, Cursor, Antigravity, JetBrains) to local endpoint <code className="font-mono text-cyan-300 bg-black/40 px-1 py-0.5 rounded">http://127.0.0.1:7777/api/v1</code>. All code metrics stream directly to your FlowTrack dashboard with zero cloud dependency.
                  </p>
                </Panel>
              </div>
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
                      <span className={`shrink-0 text-[10px] font-bold rounded-full border px-2 py-0.5 ${CAT_TAG[classifyApp(e.appName, e.title)]}`}>
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
      </AnimatePresence>
    </div>
  );
}
