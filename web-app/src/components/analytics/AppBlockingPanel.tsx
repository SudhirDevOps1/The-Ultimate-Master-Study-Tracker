import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  Monitor, 
  Search, 
  AppWindow, 
  Globe, 
  Sliders, 
  AlertTriangle,
  Lock,
  Sparkles
} from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { AppBlockRule, BlockStrictLevel } from "@/types/models";
import { isRuleScheduleActive } from "@/utils/blockMatch";

interface RunningApp {
  appName: string;
  processName: string;
  title?: string;
}

interface WebsitePreset {
  name: string;
  domain: string;
  icon: string;
  category: "social" | "streaming" | "messaging" | "gaming_news";
}

const POPULAR_WEBSITES: WebsitePreset[] = [
  // Social Media
  { name: "YouTube", domain: "youtube.com", icon: "▶️", category: "streaming" },
  { name: "Instagram", domain: "instagram.com", icon: "📸", category: "social" },
  { name: "Twitter / X", domain: "twitter.com", icon: "🐦", category: "social" },
  { name: "Reddit", domain: "reddit.com", icon: "🤖", category: "social" },
  { name: "Facebook", domain: "facebook.com", icon: "📘", category: "social" },
  { name: "TikTok", domain: "tiktok.com", icon: "🎵", category: "social" },
  // Streaming
  { name: "Netflix", domain: "netflix.com", icon: "🍿", category: "streaming" },
  { name: "Twitch", domain: "twitch.tv", icon: "🎮", category: "streaming" },
  { name: "Disney+", domain: "disneyplus.com", icon: "✨", category: "streaming" },
  // Messaging
  { name: "Discord Web", domain: "discord.com", icon: "💬", category: "messaging" },
  { name: "WhatsApp Web", domain: "web.whatsapp.com", icon: "📱", category: "messaging" },
  { name: "Telegram Web", domain: "web.telegram.org", icon: "✈️", category: "messaging" },
  // Gaming & News
  { name: "Amazon", domain: "amazon.com", icon: "🛒", category: "gaming_news" },
  { name: "Roblox", domain: "roblox.com", icon: "🧱", category: "gaming_news" },
  { name: "Steam Store", domain: "store.steampowered.com", icon: "🎮", category: "gaming_news" },
];

export function AppBlockingPanel() {
  const isBackendConnected = useAppStore((state: AppState) => state.isBackendConnected);
  const activeSessionId = useAppStore((state: AppState) => state.timer?.activeSessionId);
  const isTimerPaused = useAppStore((state: AppState) => state.timer?.isPaused);
  const isFocusSessionActive = Boolean(activeSessionId && !isTimerPaused);

  const [rules, setRules] = useState<AppBlockRule[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [newAppName, setNewAppName] = useState("");
  const [newRuleType, setNewRuleType] = useState<"app" | "website">("app");
  const [strictLevel, setStrictLevel] = useState<BlockStrictLevel>("hard");
  const [schedule, setSchedule] = useState<"always" | "study_hours" | "custom">("always");
  const [customStartTime, setCustomStartTime] = useState("09:00");
  const [customEndTime, setCustomEndTime] = useState("17:00");
  const [loading, setLoading] = useState(false);

  // Apps state: Running Apps vs Installed PC Software
  const [runningApps, setRunningApps] = useState<RunningApp[]>([]);
  const [installedApps, setInstalledApps] = useState<RunningApp[]>([]);
  const [activeTab, setActiveTab] = useState<"running" | "installed" | "websites">("websites");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedWebCategory, setSelectedWebCategory] = useState<string>("all");
  const [scanningApps, setScanningApps] = useState(false);
  const [ruleFilter, setRuleFilter] = useState<"all" | "active" | "apps" | "websites">("all");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const getIpc = () => {
    if (typeof window === "undefined") return null;
    const win = window as any;
    if (win.electron?.ipcRenderer) return win.electron.ipcRenderer;
    if (win.electron?.invoke) return win.electron;
    return null;
  };

  // Scan currently running & installed Windows applications
  const fetchApps = async () => {
    setScanningApps(true);
    try {
      const ipc = getIpc();
      if (ipc) {
        const res = await ipc.invoke("get-running-apps");
        if (res) {
          if (Array.isArray(res.apps)) setRunningApps(res.apps);
          if (Array.isArray(res.installedApps)) setInstalledApps(res.installedApps);
        }
      }
    } catch (e) {
      console.error("Failed to fetch apps:", e);
    }
    setScanningApps(false);
  };

  // Load block rules from Electron IPC / local db/storage and sync
  const loadRules = async () => {
    setLoading(true);
    try {
      const normalizeRules = (arr: AppBlockRule[]): AppBlockRule[] => {
        return arr.map(r => {
          const isExe = r.appName.toLowerCase().endsWith(".exe");
          if (isExe && r.ruleType !== "app") {
            return { ...r, ruleType: "app" };
          }
          return r;
        });
      };

      const ipc = getIpc();
      if (ipc) {
        const res = await ipc.invoke("get-block-rules");
        if (res && Array.isArray(res.rules)) {
          const normalized = normalizeRules(res.rules);
          setRules(normalized);
          if (typeof res.globalEnabled === "boolean") setGlobalEnabled(res.globalEnabled);
          setLoading(false);
          return;
        }
      }

      const storedRules = localStorage.getItem("app_block_rules");
      const currentRules: AppBlockRule[] = storedRules ? JSON.parse(storedRules) : [];
      setRules(normalizeRules(currentRules));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadRules();
    void fetchApps();

    const handleUpdate = () => {
      void loadRules();
    };

    window.addEventListener("app_block_rules_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("app_block_rules_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [isBackendConnected]);

  useEffect(() => {
    if (runningApps.length > 0) {
      setActiveTab("running");
    } else if (installedApps.length > 0) {
      setActiveTab("installed");
    }
  }, [runningApps.length, installedApps.length]);

  const saveRulesToLocalAndBackend = async (updatedRules: AppBlockRule[], newGlobalEnabled?: boolean) => {
    const isGlobal = typeof newGlobalEnabled === "boolean" ? newGlobalEnabled : globalEnabled;
    setRules(updatedRules);
    setGlobalEnabled(isGlobal);
    localStorage.setItem("app_block_rules", JSON.stringify(updatedRules));

    const ipc = getIpc();
    if (ipc) {
      await ipc.invoke("save-block-rules", { rules: updatedRules, globalEnabled: isGlobal });
      // Proactively enforce shield on currently running hard-blocked apps
      try {
        await ipc.invoke("enforce-block-rules");
      } catch {}
    }
  };

  const addRule = async (nameToAdd?: string, ruleTypeOverride?: "app" | "website") => {
    const targetName = (nameToAdd || newAppName).trim();
    if (!targetName) return;

    // Check if rule already exists
    if (rules.some(r => r.appName.toLowerCase() === targetName.toLowerCase())) {
      setNewAppName("");
      return;
    }

    // Auto-detect rule type: If it ends with .exe or has no dot, it's an app!
    let finalRuleType = ruleTypeOverride || newRuleType;
    if (targetName.toLowerCase().endsWith(".exe") || !targetName.includes(".")) {
      finalRuleType = "app";
    }

    const newRule: AppBlockRule = {
      id: crypto.randomUUID(),
      appName: targetName,
      ruleType: finalRuleType,
      blocked: true,
      strictLevel,
      schedule,
      customStartTime: schedule === "custom" ? customStartTime : undefined,
      customEndTime: schedule === "custom" ? customEndTime : undefined,
      category: "distracting",
      createdAt: new Date().toISOString()
    };
    const nextRules = [...rules, newRule];
    await saveRulesToLocalAndBackend(nextRules);
    setNewAppName("");
    setNewRuleType("app");
  };

  const toggleRuleBlocked = async (id: string) => {
    const nextRules = rules.map(r => r.id === id ? { ...r, blocked: !r.blocked } : r);
    await saveRulesToLocalAndBackend(nextRules);
  };

  const syncSystemHosts = async () => {
    const ipc = getIpc();
    if (ipc) {
      try {
        setSyncStatus("Syncing...");
        const res = await ipc.invoke("sync-hosts-file");
        if (res.success) {
          setSyncStatus("Hosts Synced!");
          setTimeout(() => setSyncStatus(null), 3000);
        } else {
          setSyncStatus("Failed");
          alert("Failed to sync system hosts: " + (res.error || "Unknown error"));
          setTimeout(() => setSyncStatus(null), 3000);
        }
      } catch (err: any) {
        setSyncStatus("Error");
        alert("Error syncing hosts: " + err.message);
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } else {
      alert("System hosts sync is supported on the FlowTrack desktop app with Admin privileges.");
    }
  };

  const enforceShieldNow = async () => {
    const ipc = getIpc();
    if (ipc) {
      setSyncStatus("Enforcing Shield...");
      try {
        const res = await ipc.invoke("enforce-block-rules");
        if (res && res.killed && res.killed.length > 0) {
          setSyncStatus(`Shield: Terminated ${res.killed.length} app(s)!`);
        } else {
          setSyncStatus("Shield Active!");
        }
        setTimeout(() => setSyncStatus(null), 3000);
      } catch {
        setSyncStatus("Shield Active");
        setTimeout(() => setSyncStatus(null), 2500);
      }
    } else {
      setSyncStatus("Shield Guard Active");
      setTimeout(() => setSyncStatus(null), 2500);
    }
  };

  const deleteRule = async (id: string) => {
    const nextRules = rules.filter(r => r.id !== id);
    await saveRulesToLocalAndBackend(nextRules);
  };

  const activeBlockedCount = useMemo(() => rules.filter(r => r.blocked).length, [rules]);
  const activeAppsCount = useMemo(() => rules.filter(r => r.blocked && (r.ruleType === "app" || r.appName.toLowerCase().endsWith(".exe"))).length, [rules]);
  const activeWebsitesCount = useMemo(() => rules.filter(r => r.blocked && (r.ruleType === "website" || r.appName.includes("."))).length, [rules]);

  const displayedAppsList = useMemo(() => {
    const list = activeTab === "running" ? runningApps : installedApps;
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter(a => a.appName.toLowerCase().includes(q) || a.processName.toLowerCase().includes(q));
  }, [activeTab, runningApps, installedApps, searchFilter]);

  const displayedWebsitesList = useMemo(() => {
    return POPULAR_WEBSITES.filter(w => {
      if (selectedWebCategory !== "all" && w.category !== selectedWebCategory) return false;
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase().trim();
      return w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q);
    });
  }, [selectedWebCategory, searchFilter]);

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const isWebsite = r.ruleType === "website" || r.appName.includes(".") || ["instagram", "facebook", "twitter", "netflix", "youtube", "reddit"].includes(r.appName.toLowerCase());
      if (ruleFilter === "active" && !r.blocked) return false;
      if (ruleFilter === "apps" && isWebsite) return false;
      if (ruleFilter === "websites" && !isWebsite) return false;
      return true;
    });
  }, [rules, ruleFilter]);

  return (
    <div className="space-y-6">
      {/* Hero / HUD Banner */}
      <Panel className="relative overflow-hidden border border-rose-500/20 bg-gradient-to-br from-slate-900 via-slate-900/95 to-rose-950/30">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`flex h-2.5 w-2.5 rounded-full ${globalEnabled ? "bg-rose-500 animate-pulse" : "bg-slate-600"}`} />
              <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
                {globalEnabled ? "Focus Shield Active" : "Focus Shield Disabled"}
              </p>
            </div>
            <h2 className="text-2xl font-black text-white sm:text-3xl">Deep Focus Blocker</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Lock out distracting processes and websites. When activated, FlowTrack Pro terminates distracting desktop apps and blocks domains in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sync Hosts button */}
            <button
              onClick={syncSystemHosts}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all active:scale-95 shadow-sm"
              title="Apply website blocklist to Windows System Hosts file (%windir%\System32\drivers\etc\hosts)"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>{syncStatus || "Sync Hosts (Admin)"}</span>
            </button>

            {/* Global Master Switch */}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950/80 px-4 py-2 border border-white/10">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Master Shield</p>
                <p className={`text-xs font-bold ${globalEnabled ? "text-rose-400" : "text-slate-500"}`}>
                  {globalEnabled ? "GUARD ON" : "GUARD OFF"}
                </p>
              </div>
              <button
                onClick={() => void saveRulesToLocalAndBackend(rules, !globalEnabled)}
                className={`relative h-7 w-13 rounded-full transition-colors focus:outline-none ${
                  globalEnabled ? "bg-rose-500" : "bg-slate-800"
                }`}
                aria-label="Toggle Global Blocker"
              >
                <span
                  className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform shadow-md ${
                    globalEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Micro KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-white/5">
          <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400">Total Rules</p>
            <p className="text-xl font-bold text-white mt-0.5">{rules.length}</p>
          </div>
          <div className="rounded-xl bg-rose-500/10 p-3 border border-rose-500/20">
            <p className="text-[11px] font-semibold text-rose-300">Active Blocks</p>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{activeBlockedCount}</p>
          </div>
          <div className="rounded-xl bg-cyan-500/10 p-3 border border-cyan-500/20">
            <p className="text-[11px] font-semibold text-cyan-300">Blocked Apps</p>
            <p className="text-xl font-bold text-cyan-400 mt-0.5">{activeAppsCount}</p>
          </div>
          <div className="rounded-xl bg-purple-500/10 p-3 border border-purple-500/20">
            <p className="text-[11px] font-semibold text-purple-300">Blocked Domains</p>
            <p className="text-xl font-bold text-purple-400 mt-0.5">{activeWebsitesCount}</p>
          </div>
        </div>
      </Panel>

      {/* Maindistraction Picker & Control Surface */}
      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-white/10">
            <button
              onClick={() => setActiveTab("running")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "running"
                  ? "bg-rose-500 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Running Apps ({runningApps.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("installed")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "installed"
                  ? "bg-rose-500 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <AppWindow className="w-3.5 h-3.5" />
              <span>Installed Software ({installedApps.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("websites")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "websites"
                  ? "bg-rose-500 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Distracting Sites ({POPULAR_WEBSITES.length})</span>
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search processes or sites..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-48 sm:w-60 rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400 transition-colors"
              />
            </div>

            <button
              onClick={() => void fetchApps()}
              disabled={scanningApps}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanningApps ? "animate-spin text-rose-400" : ""}`} />
              <span className="hidden sm:inline">{scanningApps ? "Scanning..." : "Rescan PC"}</span>
            </button>
          </div>
        </div>

        {/* Website Category Filter Pills (shown only on websites tab) */}
        {activeTab === "websites" && (
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Sites" },
              { id: "social", label: "📱 Social Media" },
              { id: "streaming", label: "🎬 Streaming & Video" },
              { id: "messaging", label: "💬 Messaging" },
              { id: "gaming_news", label: "🎮 Gaming & Shopping" },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedWebCategory(cat.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedWebCategory === cat.id
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 hover:text-white bg-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Distraction Picker Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1 pretty-scrollbar">
          {activeTab !== "websites" ? (
            displayedAppsList.length > 0 ? (
              displayedAppsList.map((app) => {
                const isAlreadyBlocked = rules.some(r => r.appName.toLowerCase() === app.processName.toLowerCase() || r.appName.toLowerCase() === app.appName.toLowerCase());
                return (
                  <div
                    key={app.processName + app.appName}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                      isAlreadyBlocked
                        ? "border-rose-500/20 bg-rose-500/10 opacity-75"
                        : "border-white/5 bg-slate-950/60 hover:border-rose-500/30 hover:bg-slate-900"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{app.appName}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{app.processName}</p>
                    </div>
                    {isAlreadyBlocked ? (
                      <span className="text-[10px] font-bold text-rose-400 shrink-0 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                        <Check className="w-3 h-3" /> Guarded
                      </span>
                    ) : (
                      <button
                        onClick={() => void addRule(app.processName, "app")}
                        className="flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-300 transition-all shrink-0 active:scale-95"
                      >
                        <Plus className="w-3 h-3" /> Block
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-xs text-slate-500 italic py-6 text-center">
                {scanningApps ? "Scanning PC software and running processes..." : "No apps found matching your search filter."}
              </p>
            )
          ) : (
            displayedWebsitesList.length > 0 ? (
              displayedWebsitesList.map((site) => {
                const isAlreadyBlocked = rules.some(r => r.appName.toLowerCase() === site.domain.toLowerCase());
                return (
                  <div
                    key={site.domain}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                      isAlreadyBlocked
                        ? "border-rose-500/20 bg-rose-500/10 opacity-75"
                        : "border-white/5 bg-slate-950/60 hover:border-rose-500/30 hover:bg-slate-900"
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2.5">
                      <span className="text-xl shrink-0">{site.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{site.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{site.domain}</p>
                      </div>
                    </div>
                    {isAlreadyBlocked ? (
                      <span className="text-[10px] font-bold text-rose-400 shrink-0 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                        <Check className="w-3 h-3" /> Guarded
                      </span>
                    ) : (
                      <button
                        onClick={() => void addRule(site.domain, "website")}
                        className="flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-300 transition-all shrink-0 active:scale-95"
                      >
                        <Plus className="w-3 h-3" /> Block
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-xs text-slate-500 italic py-6 text-center">
                No websites found matching your search filter.
              </p>
            )
          )}
        </div>

        {/* Add Custom Rule Form */}
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3.5 space-y-3">
          <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-rose-400" />
            <span>Add Custom Application or Domain Rule</span>
          </p>

          <div className="grid gap-3 sm:grid-cols-5 items-end">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Target Process or Website Domain</label>
              <input
                type="text"
                placeholder="e.g., discord.exe, steam.exe, twitter.com"
                value={newAppName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewAppName(val);
                  if (val.toLowerCase().endsWith(".exe") || (!val.includes(".") && val.trim().length > 0)) {
                    setNewRuleType("app");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addRule();
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Rule Type</label>
              <select
                value={newRuleType}
                onChange={(e) => setNewRuleType(e.target.value as "app" | "website")}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              >
                <option value="app">Desktop App (.exe)</option>
                <option value="website">Website Domain</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Action Strictness</label>
              <select
                value={strictLevel}
                onChange={(e) => setStrictLevel(e.target.value as BlockStrictLevel)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              >
                <option value="hard">Hard (Terminate Process)</option>
                <option value="medium">Medium (Minimize Window)</option>
                <option value="soft">Soft (Warning Alert)</option>
              </select>
            </div>

            <button
              onClick={() => void addRule()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Block Rule</span>
            </button>
          </div>
        </div>

        {/* Existing Rules List */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Configured Block Rules ({rules.length})</span>
            </h4>

            {/* Filter Rules Pills */}
            <div className="flex items-center gap-1 text-xs">
              {(["all", "active", "apps", "websites"] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setRuleFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors font-semibold ${
                    ruleFilter === filter
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 pretty-scrollbar">
            {filteredRules.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                {rules.length === 0
                  ? "No active block rules configured yet. Pick from the apps/sites above or add a custom rule."
                  : "No rules match the current filter."}
              </p>
            ) : (
              filteredRules.map((rule) => {
                const isExe = rule.appName.toLowerCase().endsWith(".exe");
                const isWebsite = !isExe && (rule.ruleType === "website" || (!rule.appName.endsWith(".exe") && (rule.appName.includes(".") || ["instagram", "facebook", "twitter", "netflix", "youtube", "reddit"].includes(rule.appName.toLowerCase()))));
                return (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      rule.blocked ? "border-rose-500/20 bg-rose-500/5" : "border-white/5 bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl ${rule.blocked ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-500"}`}>
                        {isWebsite ? <Globe className="w-4 h-4" /> : <AppWindow className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{rule.appName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Type: <span className="font-semibold text-slate-300">{isWebsite ? "Website Domain" : "Desktop Process (.exe)"}</span> • Strictness: <span className="text-rose-400 font-bold capitalize">{rule.strictLevel}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleRuleBlocked(rule.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          rule.blocked
                            ? "bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {rule.blocked ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-3.5 h-3.5" />
                            <span>Paused</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
