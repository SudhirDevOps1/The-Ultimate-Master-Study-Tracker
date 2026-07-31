import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight,
  ExternalLink, X, ChevronRight, Search, Maximize2, Minimize2
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
  { id: "apna-college",   name: "Apna College",     url: "https://www.apnacollege.in",       icon: "🎓", color: "#6366f1", category: "Course Portal" },
  { id: "youtube",        name: "YouTube",           url: "https://www.youtube.com",          icon: "▶️", color: "#ef4444", category: "Video" },
  { id: "pw",             name: "Physics Wallah",    url: "https://www.pw.live",              icon: "⚡", color: "#f59e0b", category: "Course Portal" },
  { id: "coursera",       name: "Coursera",          url: "https://www.coursera.org",         icon: "🏫", color: "#0ea5e9", category: "Course Portal" },
  { id: "udemy",          name: "Udemy",             url: "https://www.udemy.com",            icon: "🎯", color: "#a855f7", category: "Course Portal" },
  { id: "khan",           name: "Khan Academy",      url: "https://www.khanacademy.org",      icon: "📚", color: "#10b981", category: "Course Portal" },
  { id: "unacademy",      name: "Unacademy",         url: "https://unacademy.com",            icon: "🦉", color: "#06b6d4", category: "Course Portal" },
  { id: "github",         name: "GitHub",            url: "https://github.com",               icon: "💻", color: "#64748b", category: "Dev Tools" },
  { id: "stackoverflow",  name: "Stack Overflow",    url: "https://stackoverflow.com",        icon: "🔶", color: "#f97316", category: "Dev Tools" },
  { id: "mdn",            name: "MDN Web Docs",      url: "https://developer.mozilla.org",    icon: "📖", color: "#3b82f6", category: "Dev Tools" },
  { id: "chatgpt",        name: "ChatGPT",           url: "https://chat.openai.com",          icon: "🤖", color: "#22c55e", category: "AI Tools" },
  { id: "gemini",         name: "Google Gemini",     url: "https://gemini.google.com",        icon: "✨", color: "#8b5cf6", category: "AI Tools" },
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
    <div className={`space-y-4 ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-0 flex flex-col" : "mx-auto max-w-7xl px-2 py-4"}`}>
      {/* ── Header — hidden in fullscreen ── */}
      {!isFullscreen && (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl px-6 py-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Web Portals Browser</h1>
              <p className="text-xs text-slate-400">In-App Chromium Engine — Any site, any course, no restrictions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search portals..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-48 pl-9 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Site
            </button>
          </div>
        </div>

        {/* Add Custom Site Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 space-y-3">
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">➕ Add Custom Portal / Website</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Site Name (e.g. My DSA Notes)"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g. https://www.apnacollege.in)"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddCustomSite()}
                    className="px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Icon"
                      value={newIcon}
                      onChange={e => setNewIcon(e.target.value)}
                      className="w-16 text-center px-2 py-1.5 text-xs rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="color"
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSite}
                      className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      )} {/* end !isFullscreen header */}

      {/* ── Two-column layout: Portal Grid + Browser ── */}
      <div className={`gap-4 ${isFullscreen ? "flex flex-col flex-1 min-h-0" : "grid grid-cols-1 lg:grid-cols-[320px_1fr]"}`}>

        {/* ── Left: Portal Cards Grid — hidden in fullscreen ── */}
        {!isFullscreen && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-3xl p-4 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar"
        >
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-1 mb-2">{cat}</p>
              <div className="grid grid-cols-2 gap-2">
                {filtered.filter(s => s.category === cat).map(site => {
                  const isCustom = customSites.some(c => c.id === site.id);
                  const isActive = activeUrl === site.url;
                  return (
                    <motion.div
                      key={site.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative group rounded-2xl border p-3 cursor-pointer transition-all ${
                        isActive
                          ? "border-cyan-500/60 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                          : "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15"
                      }`}
                      onClick={() => loadSite(site)}
                    >
                      <div className="flex flex-col items-start gap-2">
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-lg shadow-md"
                          style={{ backgroundColor: site.color + "25", border: `1px solid ${site.color}40` }}
                        >
                          {site.icon}
                        </div>
                        <div className="w-full">
                          <p className="text-[12px] font-bold text-white truncate leading-tight">{site.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{site.url.replace(/^https?:\/\//, "")}</p>
                        </div>
                      </div>

                      {isActive && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                        </span>
                      )}

                      {isCustom && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleDeleteCustom(site.id); }}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
        )} {/* end !isFullscreen left panel */}

        {/* ── Right: In-App Browser ── */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`glass rounded-3xl overflow-hidden flex flex-col ${isFullscreen ? "flex-1 min-h-0" : ""}`}
          style={isFullscreen ? {} : { minHeight: "80vh" }}
        >
          {/* Browser Chrome / Navigation Bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-slate-900/60 flex-wrap gap-y-2">
            <button
              type="button"
              onClick={() => webviewNav("back")}
              disabled={!activeUrl}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => webviewNav("forward")}
              disabled={!activeUrl}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => webviewNav("reload")}
              disabled={!activeUrl}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Reload"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* URL Address Bar */}
            <div className="flex flex-1 items-center gap-2 min-w-[200px]">
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <input
                type="text"
                placeholder="www.apnacollege.in  or  youtube.com/watch?v=... or any site"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGoUrl()}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleGoUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-xs font-bold shadow hover:opacity-90 active:scale-95 transition-all shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" /> Go
            </button>

            {activeUrl && (
              <button
                type="button"
                onClick={() => openExternal(activeUrl)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-all"
                title="Open in External Browser"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(f => !f)}
              className={`p-1.5 rounded-lg transition-all ${
                isFullscreen
                  ? "text-cyan-400 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Mode — Read / Study"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {activeUrl && (
              <button
                type="button"
                onClick={() => closeBrowser()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Viewport */}
          <div className="flex-1 relative bg-slate-950">
            <AnimatePresence mode="wait">
              {!activeUrl ? (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center"
                >
                  <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20 flex items-center justify-center">
                    <Globe className="w-9 h-9 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Select a Portal or Enter URL</h2>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">
                      Click any site card on the left, or type a URL above and press Go / Enter to open it in the In-App Chromium Browser Engine.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {DEFAULT_PORTALS.slice(0, 4).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => loadSite(s)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
                      >
                        <span>{s.icon}</span>{s.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeUrl}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0"
                >
                  {isElectron ? (
                    <webview
                      ref={webviewRef}
                      src={activeUrl}
                      className="w-full h-full border-0"
                      allowpopups
                      webpreferences="allowRunningInsecureContent, javascript=true"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-950">
                      <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <Globe className="w-7 h-7 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">Desktop App Required</p>
                        <p className="text-slate-400 text-xs mt-1 max-w-xs">
                          The in-app Chromium Webview Engine is only available in the FlowTrack Pro Desktop App. Click below to open in your browser.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openExternal(activeUrl)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4" /> Open in Browser
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
