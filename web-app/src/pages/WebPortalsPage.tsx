import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight,
  ExternalLink, X, ChevronRight, Search, Maximize2, Minimize2,
  Home, Lock, ShieldCheck
} from "lucide-react";

interface PortalSite {
  id: string;
  name: string;
  url: string;
  icon: string;
  color: string;
  category: string;
}

const DEFAULT_PORTALS: PortalSite[] = [
  { id: "apna-college",   name: "Apna College",     url: "https://www.apnacollege.in",       icon: "https://www.google.com/s2/favicons?domain=apnacollege.in&sz=64", color: "#6366f1", category: "Course Portal" },
  { id: "youtube",        name: "YouTube",           url: "https://www.youtube.com",          icon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64", color: "#ef4444", category: "Video" },
  { id: "pw",             name: "Physics Wallah",    url: "https://www.pw.live",              icon: "https://www.google.com/s2/favicons?domain=pw.live&sz=64", color: "#f59e0b", category: "Course Portal" },
  { id: "coursera",       name: "Coursera",          url: "https://www.coursera.org",         icon: "https://www.google.com/s2/favicons?domain=coursera.org&sz=64", color: "#0ea5e9", category: "Course Portal" },
  { id: "udemy",          name: "Udemy",             url: "https://www.udemy.com",            icon: "https://www.google.com/s2/favicons?domain=udemy.com&sz=64", color: "#a855f7", category: "Course Portal" },
  { id: "khan",           name: "Khan Academy",      url: "https://www.khanacademy.org",      icon: "https://www.google.com/s2/favicons?domain=khanacademy.org&sz=64", color: "#10b981", category: "Course Portal" },
  { id: "unacademy",      name: "Unacademy",         url: "https://unacademy.com",            icon: "https://www.google.com/s2/favicons?domain=unacademy.com&sz=64", color: "#06b6d4", category: "Course Portal" },
  { id: "github",         name: "GitHub",            url: "https://github.com",               icon: "https://www.google.com/s2/favicons?domain=github.com&sz=64", color: "#64748b", category: "Dev Tools" },
  { id: "stackoverflow",  name: "Stack Overflow",    url: "https://stackoverflow.com",        icon: "https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=64", color: "#f97316", category: "Dev Tools" },
  { id: "mdn",            name: "MDN Web Docs",      url: "https://developer.mozilla.org",    icon: "https://www.google.com/s2/favicons?domain=developer.mozilla.org&sz=64", color: "#3b82f6", category: "Dev Tools" },
  { id: "chatgpt",        name: "ChatGPT",           url: "https://chat.openai.com",          icon: "https://www.google.com/s2/favicons?domain=chat.openai.com&sz=64", color: "#22c55e", category: "AI Tools" },
  { id: "gemini",         name: "Google Gemini",     url: "https://gemini.google.com",        icon: "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64", color: "#8b5cf6", category: "AI Tools" },
];

const isElectron = typeof window !== "undefined" && !!(window as any).electron;

function openExternal(url: string) {
  if (isElectron && (window as any).electron?.shell?.openExternal) {
    (window as any).electron.shell.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const DB_KEY = "web_portals_custom_sites";

async function loadCustomSites(): Promise<PortalSite[]> {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? (JSON.parse(raw) as PortalSite[]) : [];
  } catch { return []; }
}

function saveCustomSites(sites: PortalSite[]) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(sites)); } catch { /**/ }
}

export function WebPortalsPage() {
  const location = useLocation();
  const [customSites, setCustomSites]   = useState<PortalSite[]>([]);
  const [activeUrl, setActiveUrl]       = useState<string | null>(null);
  const [activeName, setActiveName]     = useState("");
  const [inputUrl, setInputUrl]         = useState("");
  const [showAddForm, setShowAddForm]   = useState(false);
  const [newName, setNewName]           = useState("");
  const [newUrl, setNewUrl]             = useState("");
  const [newIcon, setNewIcon]           = useState("🌐");
  const [newColor, setNewColor]         = useState("#6366f1");
  const [searchQuery, setSearchQuery]   = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const webviewRef = useRef<any>(null);

  useEffect(() => {
    void loadCustomSites().then(setCustomSites);
  }, []);

  function normalizePortalUrl(raw: string): string {
    let clean = raw.trim().replace(/^["']|["']$/g, "");
    if (!clean) return "";
    // Check if Windows drive letter e.g. D:\... or C:/...
    if (/^[a-zA-Z]:[\\/]/i.test(clean) || clean.startsWith("file://") || clean.startsWith("local-media://")) {
      // Normalize slashes for Electron
      clean = clean.replace(/\\/g, "/");
      if (/^[a-zA-Z]:\//i.test(clean)) {
        return `local-media:///${encodeURI(clean)}`;
      }
      return clean;
    }
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      return "https://" + clean;
    }
    return clean;
  }

  // ── Auto-load URL passed via router navigation state ──────────────────────────
  // Called from SubjectsPage or TimerPage when a subject has a URL.
  useEffect(() => {
    const state = location.state as { url?: string; name?: string } | null;
    if (state?.url) {
      const url = normalizePortalUrl(state.url);
      setActiveUrl(url);
      setActiveName(state.name || state.url);
      setInputUrl(state.url);
      // Clear state so navigating back doesn't re-trigger
      window.history.replaceState({}, "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exit fullscreen on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Webview Activity Tracking ─────────────────────────────────────────────
  // When webview navigates to a site, report domain+title to electron main process.
  // This makes the Activity Tracker log the actual study site (apnacollege.in,
  // youtube.com etc.) instead of FlowTrack itself, when Web Portals is active.
  useEffect(() => {
    if (!isElectron || !webviewRef.current || !activeUrl) return;
    const wv = webviewRef.current;

    function reportToMain(url: string, title?: string) {
      (window as any).electron?.ipcRenderer?.invoke("webview-activity-report", { url, title: title || "" })
        .catch(() => {});
    }

    function onNavigate(e: any) {
      const url = e.url || activeUrl || "";
      reportToMain(url);
    }
    function onTitleUpdate(e: any) {
      const url = wv.getURL?.() || activeUrl || "";
      reportToMain(url, e.title || "");
    }

    // Report immediately when webview first loads
    reportToMain(activeUrl);

    wv.addEventListener("did-navigate", onNavigate);
    wv.addEventListener("did-navigate-in-page", onNavigate);
    wv.addEventListener("page-title-updated", onTitleUpdate);

    return () => {
      wv.removeEventListener("did-navigate", onNavigate);
      wv.removeEventListener("did-navigate-in-page", onNavigate);
      wv.removeEventListener("page-title-updated", onTitleUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl, isElectron]);

  // Clear tracking when webview is closed
  useEffect(() => {
    if (!isElectron) return;
    if (!activeUrl) {
      (window as any).electron?.ipcRenderer?.invoke("webview-activity-clear").catch(() => {});
    }
  }, [activeUrl, isElectron]);


  const allSites = [...DEFAULT_PORTALS, ...customSites];
  const filtered = searchQuery.trim()
    ? allSites.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allSites;

  const categories = [...new Set(filtered.map(s => s.category))];

  function loadSite(site: PortalSite) {
    setActiveUrl(site.url);
    setActiveName(site.name);
    setInputUrl(site.url);
  }

  function handleGoUrl() {
    if (!inputUrl.trim()) return;
    const url = normalizePortalUrl(inputUrl);
    setActiveUrl(url);
    setActiveName(inputUrl.trim());
    setInputUrl(inputUrl.trim());
  }

  function closeBrowser() {
    setActiveUrl(null);
    setActiveName("");
    setInputUrl("");
    // Clear webview tracking in electron main process
    if (isElectron) {
      (window as any).electron?.ipcRenderer?.invoke("webview-activity-clear").catch(() => {});
    }
  }

  function handleAddCustomSite() {
    if (!newName.trim() || !newUrl.trim()) return;
    const url = normalizePortalUrl(newUrl);
    const site: PortalSite = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      url,
      icon: newIcon,
      color: newColor,
      category: "Custom",
    };
    const updated = [...customSites, site];
    setCustomSites(updated);
    saveCustomSites(updated);
    setNewName(""); setNewUrl(""); setNewIcon("🌐"); setNewColor("#6366f1");
    setShowAddForm(false);
  }

  function handleDeleteCustom(id: string) {
    const updated = customSites.filter(s => s.id !== id);
    setCustomSites(updated);
    saveCustomSites(updated);
  }

  const webviewNav = (action: "back" | "forward" | "reload") => {
    if (!webviewRef.current) return;
    if (action === "back")    webviewRef.current.goBack?.();
    if (action === "forward") webviewRef.current.goForward?.();
    if (action === "reload")  webviewRef.current.reload?.();
  };

  return (
    <div className={`flex flex-col h-full space-y-4 ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-0" : "mx-auto max-w-7xl px-2 py-4"}`}>
      
      {/* ── BROWSER CHROME / NAVIGATION BAR ── */}
      {!isFullscreen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg"
        >
          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => webviewNav("back")}
              disabled={!activeUrl}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => webviewNav("forward")}
              disabled={!activeUrl}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => webviewNav("reload")}
              disabled={!activeUrl}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Reload"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closeBrowser}
              className={`p-2 rounded-full transition-all ${
                !activeUrl ? "text-cyan-400 bg-cyan-500/20" : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title="Home (New Tab)"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>

          {/* Omnibox (Address Bar) */}
          <div className="flex-1 max-w-4xl mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-white/10 shadow-inner group focus-within:border-cyan-500/50 focus-within:bg-slate-900 transition-all">
            {activeUrl ? (
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            
            <input
              type="text"
              placeholder="Search or enter web address (e.g. apnacollege.in)"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleGoUrl()}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />

            {activeUrl && (
              <span title="Enhanced Tracking Protection is ON">
                <ShieldCheck className="w-4 h-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {activeUrl && (
              <button
                type="button"
                onClick={() => openExternal(activeUrl)}
                className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-all"
                title="Open in External Browser"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen(f => !f)}
              className={`p-2 rounded-full transition-all ${
                isFullscreen
                  ? "text-cyan-400 bg-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title="Fullscreen Mode (F11)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      )}

      {/* ── BROWSER VIEWPORT ── */}
      <div className="flex-1 relative rounded-3xl overflow-hidden glass shadow-2xl flex flex-col">
        <AnimatePresence mode="wait">
          {!activeUrl ? (
            /* NEW TAB PAGE */
            <motion.div
              key="new-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 overflow-y-auto custom-scrollbar p-8 bg-slate-950/50"
            >
              <div className="max-w-5xl mx-auto flex flex-col items-center">
                {/* Brand Logo */}
                <div className="flex flex-col items-center mt-10 mb-12">
                  <div className="h-20 w-20 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30 mb-6">
                    <Globe className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    FlowTrack Browser
                  </h1>
                </div>

                {/* Search / Filter for Speed Dials */}
                <div className="w-full max-w-2xl mb-12 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter your study portals..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 text-base rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 shadow-lg transition-all"
                  />
                </div>

                {/* Speed Dial Grid */}
                <div className="w-full space-y-10">
                  {categories.map(cat => {
                    const catSites = filtered.filter(s => s.category === cat);
                    if (catSites.length === 0) return null;
                    
                    return (
                      <div key={cat} className="w-full">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                          {cat}
                          <div className="h-px bg-white/10 flex-1"></div>
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {catSites.map(site => {
                            const isCustom = customSites.some(c => c.id === site.id);
                            return (
                              <motion.div
                                key={site.id}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative group cursor-pointer"
                                onClick={() => loadSite(site)}
                              >
                                <div className="flex flex-col items-center p-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all shadow-md hover:shadow-xl">
                                  <div
                                    className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner mb-3 bg-white"
                                  >
                                    {site.icon.startsWith("http") ? (
                                      <img src={site.icon} alt={site.name} className="w-8 h-8 object-contain" />
                                    ) : (
                                      site.icon
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold text-slate-200 text-center line-clamp-1 w-full">{site.name}</p>
                                </div>
                                {isCustom && (
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); handleDeleteCustom(site.id); }}
                                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-400 transition-all z-10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </motion.div>
                            );
                          })}
                          
                          {/* Add Custom Button Card (Only in Custom category or if empty search) */}
                          {(cat === "Custom" || (searchQuery === "" && categories.indexOf(cat) === categories.length - 1)) && (
                            <motion.div
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setShowAddForm(true)}
                              className="flex flex-col items-center p-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 border-dashed hover:border-cyan-400/50 transition-all cursor-pointer shadow-md justify-center min-h-[120px]"
                            >
                              <div className="h-12 w-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2">
                                <Plus className="w-6 h-6" />
                              </div>
                              <p className="text-xs font-semibold text-cyan-400 text-center">Add Shortcut</p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Form Modal overlay */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Plus className="w-5 h-5 text-cyan-400" /> Add Custom Portal
                        </h3>
                        <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Site Name</label>
                          <input
                            type="text"
                            placeholder="e.g. My College Portal"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Website URL</label>
                          <input
                            type="text"
                            placeholder="e.g. https://lms.college.edu"
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAddCustomSite()}
                            className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomSite}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all mt-4"
                        >
                          Add Shortcut
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          ) : (
            /* ACTIVE BROWSER TAB */
            <motion.div
              key="active-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col bg-slate-950"
            >
              {isElectron ? (
                <webview
                  ref={webviewRef}
                  src={activeUrl}
                  className="w-full h-full border-0 flex-1"
                  allowpopups
                  webpreferences="allowRunningInsecureContent, javascript=true"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-950">
                  <div className="h-20 w-20 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Globe className="w-10 h-10 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Desktop App Required</h2>
                  <p className="text-slate-400 text-sm max-w-md">
                    The ultra-fast Chromium Webview Engine is only available inside the FlowTrack Pro Desktop App. Please open this site in your external browser for now.
                  </p>
                  <button
                    type="button"
                    onClick={() => openExternal(activeUrl)}
                    className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"
                  >
                    <ExternalLink className="w-5 h-5" /> Launch in External Browser
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
