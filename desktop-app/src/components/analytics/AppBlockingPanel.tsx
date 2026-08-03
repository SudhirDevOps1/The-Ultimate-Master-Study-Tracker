import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldAlert, Plus, Trash2, Check, RefreshCw, Monitor, Laptop, Search, AppWindow, Globe } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { AppBlockRule, BlockStrictLevel } from "@/types/models";

interface RunningApp {
  appName: string;
  processName: string;
  title?: string;
}

export function AppBlockingPanel() {
  const backendUrl = useAppStore((state: AppState) => state.backendUrl);
  const isBackendConnected = useAppStore((state: AppState) => state.isBackendConnected);

  const [rules, setRules] = useState<AppBlockRule[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [newAppName, setNewAppName] = useState("");
  const [newRuleType, setNewRuleType] = useState<"app" | "website">("app");
  const [strictLevel, setStrictLevel] = useState<BlockStrictLevel>("hard");
  const [schedule, setSchedule] = useState<"always" | "study_hours">("study_hours");
  const [loading, setLoading] = useState(false);

  // Apps state: Running Apps vs Installed PC Software (Control Panel)
  const [runningApps, setRunningApps] = useState<RunningApp[]>([]);
  const [installedApps, setInstalledApps] = useState<RunningApp[]>([]);
  const [activeTab, setActiveTab] = useState<"running" | "installed" | "websites">("running");
  const [searchFilter, setSearchFilter] = useState("");
  const [scanningApps, setScanningApps] = useState(false);

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
      const ipc = getIpc();
      if (ipc) {
        const res = await ipc.invoke("get-block-rules");
        if (res && Array.isArray(res.rules)) {
          setRules(res.rules);
          if (typeof res.globalEnabled === "boolean") setGlobalEnabled(res.globalEnabled);
          setLoading(false);
          return;
        }
      }

      const storedRules = localStorage.getItem("app_block_rules");
      let currentRules: AppBlockRule[] = storedRules ? JSON.parse(storedRules) : [];
      setRules(currentRules);
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

    const newRule: AppBlockRule = {
      id: crypto.randomUUID(),
      appName: targetName,
      ruleType: ruleTypeOverride || newRuleType,
      blocked: true,
      strictLevel,
      schedule,
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

  const deleteRule = async (id: string) => {
    const nextRules = rules.filter(r => r.id !== id);
    await saveRulesToLocalAndBackend(nextRules);
  };

  const POPULAR_WEBSITES = [
    { name: "YouTube", domain: "youtube.com", icon: "▶️" },
    { name: "Instagram", domain: "instagram.com", icon: "📸" },
    { name: "Facebook", domain: "facebook.com", icon: "📘" },
    { name: "Netflix", domain: "netflix.com", icon: "🍿" },
    { name: "Twitter / X", domain: "twitter.com", icon: "🐦" },
    { name: "Reddit", domain: "reddit.com", icon: "🤖" },
    { name: "TikTok", domain: "tiktok.com", icon: "🎵" },
    { name: "Twitch", domain: "twitch.tv", icon: "🎮" },
    { name: "Discord Web", domain: "discord.com", icon: "💬" },
    { name: "WhatsApp Web", domain: "web.whatsapp.com", icon: "📱" },
    { name: "Pinterest", domain: "pinterest.com", icon: "📌" },
    { name: "Amazon", domain: "amazon.com", icon: "🛒" }
  ];

  const displayedAppsList = (activeTab === "running" ? runningApps : installedApps).filter(a => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return a.appName.toLowerCase().includes(q) || a.processName.toLowerCase().includes(q);
  });

  const displayedWebsitesList = POPULAR_WEBSITES.filter(w => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <Panel className="space-y-4 border border-rose-500/10">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">App Blocking Dashboard</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Global Blocker Status:</span>
            <button
              onClick={() => void saveRulesToLocalAndBackend(rules, !globalEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                globalEnabled ? "bg-rose-500" : "bg-slate-700"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                globalEnabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-3 flex gap-3 text-xs text-rose-300">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Strict Level Action Levels:</p>
            <p className="text-slate-300">
              <strong>Soft:</strong> Shows desktop alert warning when application starts.<br />
              <strong>Medium:</strong> Minimizes process window automatically during study hours.<br />
              <strong>Hard:</strong> Terminates / kills process instantly when distraction is detected.
            </p>
          </div>
        </div>

        {/* 💻 Windows Live & Installed Apps Picker Section */}
        <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setActiveTab("running")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === "running"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Open Apps ({runningApps.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("installed")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === "installed"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <AppWindow className="w-3.5 h-3.5" />
                <span>Installed PC Apps ({installedApps.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("websites")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === "websites"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Popular Websites</span>
              </button>
            </div>

            {/* Search Filter & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter apps..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900 pl-8 pr-3 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 w-36 sm:w-48"
                />
              </div>

              <button
                onClick={() => void fetchApps()}
                disabled={scanningApps}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50 px-2 py-1 rounded-lg border border-white/5 bg-white/[0.02]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanningApps ? "animate-spin text-cyan-400" : ""}`} />
                <span className="hidden sm:inline">{scanningApps ? "Scanning..." : "Scan PC"}</span>
              </button>
            </div>
          </div>

          {/* Running / Installed apps list picker */}
          {activeTab !== "websites" ? (
            displayedAppsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[170px] overflow-y-auto pr-1 pretty-scrollbar">
                {displayedAppsList.map((app) => {
                  const isAlreadyBlocked = rules.some(r => r.appName.toLowerCase() === app.processName.toLowerCase() || r.appName.toLowerCase() === app.appName.toLowerCase());
                  return (
                    <div
                      key={app.processName + app.appName}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors ${
                        isAlreadyBlocked ? "border-rose-500/20 bg-rose-500/5 opacity-60" : "border-white/5 bg-white/[0.02] hover:border-cyan-500/30"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{app.appName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{app.processName}</p>
                      </div>
                      {isAlreadyBlocked ? (
                        <span className="text-[10px] font-bold text-rose-400 shrink-0 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Blocked
                        </span>
                      ) : (
                        <button
                          onClick={() => void addRule(app.processName, "app")}
                          className="flex items-center gap-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 px-2 py-1 text-[10px] font-bold text-cyan-300 transition-all shrink-0 active:scale-95"
                        >
                          <Plus className="w-3 h-3" /> Block
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic py-3 text-center">
                {scanningApps ? "Scanning PC software and running applications..." : "No apps found matching your search filter."}
              </p>
            )
          ) : (
            displayedWebsitesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[170px] overflow-y-auto pr-1 pretty-scrollbar">
                {displayedWebsitesList.map((site) => {
                  const isAlreadyBlocked = rules.some(r => r.appName.toLowerCase() === site.domain.toLowerCase());
                  return (
                    <div
                      key={site.domain}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors ${
                        isAlreadyBlocked ? "border-rose-500/20 bg-rose-500/5 opacity-60" : "border-white/5 bg-white/[0.02] hover:border-cyan-500/30"
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="text-lg">{site.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-white truncate">{site.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{site.domain}</p>
                        </div>
                      </div>
                      {isAlreadyBlocked ? (
                        <span className="text-[10px] font-bold text-rose-400 shrink-0 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Blocked
                        </span>
                      ) : (
                        <button
                          onClick={() => void addRule(site.domain, "website")}
                          className="flex items-center gap-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 px-2 py-1 text-[10px] font-bold text-cyan-300 transition-all shrink-0 active:scale-95"
                        >
                          <Plus className="w-3 h-3" /> Block
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic py-3 text-center">
                No websites found matching your search filter.
              </p>
            )
          )}
        </div>

        {/* Add custom rule form */}
        <div className="grid gap-3 sm:grid-cols-5 items-end bg-white/[0.02] border border-white/5 p-3 rounded-xl">
          <div className="space-y-1 sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Process / App Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., discord.exe, spotify, chrome"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400"
              />
              {(runningApps.length > 0 || installedApps.length > 0) && (
                <select
                  onChange={(e) => {
                    if (e.target.value) setNewAppName(e.target.value);
                  }}
                  value=""
                  className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 max-w-[140px]"
                >
                  <option value="">Quick Pick...</option>
                  {runningApps.length > 0 && (
                    <optgroup label="🟢 Open Apps">
                      {runningApps.map(a => (
                        <option key={"run_" + a.processName} value={a.processName}>
                          {a.appName} ({a.processName})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {installedApps.length > 0 && (
                    <optgroup label="💻 Installed Software">
                      {installedApps.map(a => (
                        <option key={"inst_" + a.processName} value={a.processName}>
                          {a.appName} ({a.processName})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Rule Type</label>
            <select
              value={newRuleType}
              onChange={(e) => setNewRuleType(e.target.value as "app" | "website")}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="app">Desktop App</option>
              <option value="website">Website / URL</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Strictness</label>
            <select
              value={strictLevel}
              onChange={(e) => setStrictLevel(e.target.value as BlockStrictLevel)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white"
            >
              <option value="soft">Soft (Warning)</option>
              <option value="medium">Medium (Minimize)</option>
              <option value="hard">Hard (Kill Process)</option>
            </select>
          </div>
          <button
            onClick={() => void addRule()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Block</span>
          </button>
        </div>

        {/* Blocking list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 pretty-scrollbar">
          {rules.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No active application or website block rules defined.</p>
          ) : (
            rules.map((rule) => {
              const isWebsite = rule.ruleType === "website" || rule.appName.includes('.') || ["instagram", "facebook", "twitter", "netflix", "youtube", "reddit"].includes(rule.appName.toLowerCase());
              return (
              <div
                key={rule.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  rule.blocked ? "border-rose-500/20 bg-rose-500/5" : "border-white/5 bg-white/[0.01]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isWebsite ? <Globe className="w-3.5 h-3.5 text-cyan-400" /> : <AppWindow className="w-3.5 h-3.5 text-indigo-400" />}
                    <p className="text-sm font-bold text-white truncate">{rule.appName}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Type: <span className="font-bold text-slate-300">{isWebsite ? "Website / URL" : "Desktop App"}</span> • Strictness: <span className="text-rose-400 font-bold capitalize">{rule.strictLevel}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleRuleBlocked(rule.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                      rule.blocked 
                        ? "bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                    title={rule.blocked ? "Click to Unblock" : "Click to Block"}
                  >
                    {rule.blocked ? (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span className="text-xs font-bold">Blocked</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span className="text-xs font-bold">Unblocked</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}


