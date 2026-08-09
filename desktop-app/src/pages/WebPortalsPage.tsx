import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight,
  ExternalLink, X, ChevronRight, Search, Maximize2, Minimize2,
  Key, Lock, Eye, EyeOff, ShieldCheck, Check, Filter } from "lucide-react";

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

interface VaultCredential {
  id: string;
  domain: string;
  label: string;
  username: string;
  passwordEnc: string;
}

const DB_KEY = "web_portals_custom_sites";
const VAULT_KEY = "web_portals_vault_credentials";

function encryptVal(text: string): string {
  if (!text) return "";
  try {
    const k = "FlowTrackVault2026Key";
    let res = "";
    for (let i = 0; i < text.length; i++) {
      res += String.fromCharCode(text.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }
    return btoa(res);
  } catch { return btoa(text); }
}

function decryptVal(encoded: string): string {
  if (!encoded) return "";
  try {
    const text = atob(encoded);
    const k = "FlowTrackVault2026Key";
    let res = "";
    for (let i = 0; i < text.length; i++) {
      res += String.fromCharCode(text.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }
    return res;
  } catch { try { return atob(encoded); } catch { return encoded; } }
}

function loadVaultCredentials(): VaultCredential[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveVaultCredentials(creds: VaultCredential[]) {
  try { localStorage.setItem(VAULT_KEY, JSON.stringify(creds)); } catch { /**/ }
}

async function loadCustomSites(): Promise<PortalSite[]> {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? (JSON.parse(raw) as PortalSite[]) : [];
  } catch { return []; }
}

function saveCustomSites(sites: PortalSite[]) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(sites)); } catch { /**/ }
}

export interface WebTab { id: string; url: string; title: string; icon: string; color: string; }

export function WebPortalsPage() {
  const location = useLocation();
  const [customSites, setCustomSites]   = useState<PortalSite[]>([]);
  const [tabs, setTabs] = useState<WebTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const activeUrl = activeTab?.url || null;
  const activeName = activeTab?.title || "";
  const [inputUrl, setInputUrl]         = useState("");
  const [showAddForm, setShowAddForm]   = useState(false);
  const [newName, setNewName]           = useState("");
  const [newUrl, setNewUrl]             = useState("");
  const [newIcon, setNewIcon]           = useState("🌐");
  const [newColor, setNewColor]         = useState("#6366f1");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery]   = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Encrypted Credential Vault State ─────────────────────────────────────
  const [vaultCredentials, setVaultCredentials] = useState<VaultCredential[]>([]);
  const [showVaultModal, setShowVaultModal]     = useState(false);
  const [showAddVault, setShowAddVault]         = useState(false);
  const [vDomain, setVDomain]                   = useState("");
  const [vLabel, setVLabel]                     = useState("");
  const [vUsername, setVUsername]               = useState("");
  const [vPassword, setVPassword]               = useState("");
  const [showPassMap, setShowPassMap]           = useState<Record<string, boolean>>({});
  const [fillToast, setFillToast]               = useState<string | null>(null);

  const webviewRefs = useRef<Record<string, any>>({});
  const getWebview = () => activeTabId ? webviewRefs.current[activeTabId] : null;

  useEffect(() => {
    void loadCustomSites().then(setCustomSites);
    setVaultCredentials(loadVaultCredentials());
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
      const newTab = { id: crypto.randomUUID(), url, title: state.name || state.url, icon: "🌐", color: "#6366f1" };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setInputUrl(url);
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
    const wv = getWebview();
    if (!isElectron || !wv || !activeUrl) return;

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

  // Handle IPC block event
  useEffect(() => {
    if (!isElectron) return;
    const handleBlocked = (_e: any, _target: string) => {
      closeBrowser();
      setIsFullscreen(false);
    };
    (window as any).electron?.ipcRenderer?.on("webview-blocked", handleBlocked);
    return () => {
      if ((window as any).electron?.ipcRenderer?.removeListener) {
        (window as any).electron.ipcRenderer.removeListener("webview-blocked", handleBlocked);
      }
    };
  }, [isElectron]);

  // ── Find matching credentials for currently active URL ──────────────────
  const activeDomain = useMemo(() => {
    if (!activeUrl) return "";
    try {
      return new URL(activeUrl).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return activeUrl.toLowerCase();
    }
  }, [activeUrl]);

  const activeMatchedCred = useMemo(() => {
    if (!activeDomain) return null;
    return vaultCredentials.find(c => {
      const d = (c.domain || "").toLowerCase().replace(/^www\./, "").replace(/^https?:\/\//, "");
      return activeDomain.includes(d) || d.includes(activeDomain);
    });
  }, [activeDomain, vaultCredentials]);

  function handleAddVaultCred() {
    if (!vUsername.trim() || !vPassword.trim()) return;
    let dom = vDomain.trim().replace(/^www\./, "").replace(/^https?:\/\//, "");
    if (!dom && activeDomain) dom = activeDomain;
    if (!dom) dom = "general";

    const item: VaultCredential = {
      id: crypto.randomUUID(),
      domain: dom,
      label: vLabel.trim() || dom,
      username: vUsername.trim(),
      passwordEnc: encryptVal(vPassword),
    };
    const updated = [...vaultCredentials, item];
    setVaultCredentials(updated);
    saveVaultCredentials(updated);
    setVDomain(""); setVLabel(""); setVUsername(""); setVPassword("");
    setShowAddVault(false);
    setFillToast(`🔐 Credential saved for ${item.domain}!`);
    setTimeout(() => setFillToast(null), 3000);
  }

  function handleDeleteVaultCred(id: string) {
    const updated = vaultCredentials.filter(c => c.id !== id);
    setVaultCredentials(updated);
    saveVaultCredentials(updated);
  }

  function autoFillWebview(cred: VaultCredential) {
    const wv = getWebview();
    const username = cred.username;
    const password = decryptVal(cred.passwordEnc);

    if (!wv || typeof wv.executeJavaScript !== "function") {
      navigator.clipboard?.writeText(password);
      setFillToast(`📋 Password copied to clipboard! Paste into login form.`);
      setTimeout(() => setFillToast(null), 3500);
      return;
    }

    const script = `
      (function() {
        const u = ${JSON.stringify(username)};
        const p = ${JSON.stringify(password)};
        const userInput = document.querySelector('input[type="email"], input[type="text"][name*="user"], input[name*="login"], input[name*="email"], input[id*="email"], input[id*="user"]');
        const passInput = document.querySelector('input[type="password"]');
        let filled = 0;
        if (userInput) {
          userInput.value = u;
          userInput.dispatchEvent(new Event('input', { bubbles: true }));
          userInput.dispatchEvent(new Event('change', { bubbles: true }));
          userInput.style.border = "2px dashed #10b981";
          filled++;
        }
        if (passInput) {
          passInput.value = p;
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.dispatchEvent(new Event('change', { bubbles: true }));
          passInput.style.border = "2px dashed #10b981";
          filled++;
        }
        return filled;
      })();
    `;

    try {
      wv.executeJavaScript(script)
        .then((count: number) => {
          if (count > 0) {
            setFillToast(`⚡ Auto-filled credentials for ${cred.label || cred.domain}!`);
          } else {
            setFillToast(`📋 Password copied to clipboard. Paste into login form.`);
            navigator.clipboard?.writeText(password);
          }
          setTimeout(() => setFillToast(null), 3500);
        })
        .catch(() => {
          setFillToast(`📋 Password copied to clipboard.`);
          navigator.clipboard?.writeText(password);
          setTimeout(() => setFillToast(null), 3500);
        });
    } catch {
      navigator.clipboard?.writeText(password);
      setFillToast(`📋 Password copied to clipboard.`);
      setTimeout(() => setFillToast(null), 3500);
    }
  }


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
    const url = normalizePortalUrl(site.url);
    const newTab = { id: crypto.randomUUID(), url, title: site.name, icon: site.icon || "🌐", color: site.color || "#6366f1" };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setInputUrl(url);
  }

  function handleGoUrl() {
    if (!inputUrl.trim()) return;
    const url = normalizePortalUrl(inputUrl);
    if (activeTabId) {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, title: url } : t));
    } else {
      const newTab = { id: crypto.randomUUID(), url, title: url, icon: "🌐", color: "#6366f1" };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
    setInputUrl(url);
  }

  function closeBrowser(tabId?: string) {
    const targetId = tabId || activeTabId;
    if (!targetId) return;
    setTabs(prev => {
      const next = prev.filter(t => t.id !== targetId);
      if (targetId === activeTabId) {
        const newActiveId = next.length > 0 ? next[next.length - 1].id : null;
        setActiveTabId(newActiveId);
        setInputUrl(next.length > 0 ? next[next.length - 1].url : "");
      }
      return next;
    });
    if (isElectron && (!tabs.length || (tabs.length === 1 && targetId === tabs[0].id))) {
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
    const wv = getWebview();
    if (!wv) return;
    if (action === "back")    wv.goBack?.();
    if (action === "forward") wv.goForward?.();
    if (action === "reload")  wv.reload?.();
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
                className="w-56 pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 focus:bg-slate-900 shadow-inner transition-all"
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
      <div 
        className={`gap-4 ${isFullscreen ? "flex flex-col flex-1 min-h-0" : "grid grid-cols-1 lg:grid-cols-[320px_1fr]"}`}
        style={isFullscreen ? {} : { height: "calc(100vh - 180px)" }}
      >

        {/* ── Left: Portal Cards Grid — hidden in fullscreen ── */}
        {!isFullscreen && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-3xl p-4 space-y-4 h-full overflow-y-auto custom-scrollbar"
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
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-lg backdrop-blur-md group-hover:scale-110 transition-transform duration-300"
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
          className={`glass rounded-3xl overflow-hidden flex flex-col ${isFullscreen ? "flex-1 min-h-0" : "h-full"}`}
        >
          {/* Browser Chrome / Navigation Bar */}
          {tabs.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950/80 px-2 pt-2 border-b border-white/5 overflow-x-auto custom-scrollbar">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => { setActiveTabId(tab.id); setInputUrl(tab.url); }}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px] rounded-t-xl cursor-pointer border-t border-x transition-all ${
                    activeTabId === tab.id
                      ? "bg-slate-900 border-white/10 text-white z-10 shadow-sm"
                      : "bg-slate-950 border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-300"
                  }`}
                >
                  <span className="text-[10px] shrink-0">{tab.icon || "🌐"}</span>
                  <span className="text-xs font-semibold truncate flex-1">{tab.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); closeBrowser(tab.id); }}
                    className={`shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors ${activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {activeTabId === tab.id && (
                    <div className="absolute bottom-[-1px] left-0 w-full h-[1px] bg-slate-900" />
                  )}
                </div>
              ))}
              <button
                onClick={() => { const newTab = { id: crypto.randomUUID(), url: "https://google.com", title: "New Tab", icon: "🌐", color: "#6366f1" }; setTabs(prev => [...prev, newTab]); setActiveTabId(newTab.id); setInputUrl("https://google.com"); }}
                className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-xl flex-wrap gap-y-2 shadow-sm">
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

            {/* 🔑 Active Site Auto-Fill Button */}
            {activeMatchedCred && (
              <button
                type="button"
                onClick={() => autoFillWebview(activeMatchedCred)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all shrink-0 animate-pulse"
                title={`Auto-fill login credentials for ${activeMatchedCred.label || activeMatchedCred.domain}`}
              >
                <Key className="w-3.5 h-3.5" /> Fill Login
              </button>
            )}

            {/* 🔐 Password Vault Modal Button */}
            <button
              type="button"
              onClick={() => setShowVaultModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all shrink-0"
              title="Encrypted Credential Vault & Auto-Fill Manager"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" /> Vault
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
                    <div className="w-full h-full relative bg-slate-950">
                      {tabs.map((tab) => (
                        <webview
                          key={tab.id}
                          ref={(el) => { if (el) webviewRefs.current[tab.id] = el; }}
                          src={tab.url}
                          className={`w-full h-full border-0 absolute top-0 left-0 ${activeTabId === tab.id ? "z-10" : "opacity-0 pointer-events-none z-0"}`}
                          allowpopups
                          webpreferences="allowRunningInsecureContent, javascript=true"
                        />
                      ))}
                    </div>
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

      {/* ── Auto-Fill Toast Notification Alert ── */}
      <AnimatePresence>
        {fillToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900 border border-emerald-500/40 px-5 py-3 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{fillToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 🔐 Password Vault Modal ── */}
      <AnimatePresence>
        {showVaultModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass w-full max-w-lg rounded-3xl border border-white/10 p-6 space-y-5 shadow-2xl bg-slate-900/95"
            >
              <div className="flex items-center justify-between border-b border-white/8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">🔐 Encrypted Password Vault</h3>
                    <p className="text-xs text-slate-400">Auto-fill logins for Apna College, Coursera, YouTube, PW & course portals</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVaultModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Saved Credentials List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {vaultCredentials.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-white/3 border border-white/5 space-y-2">
                    <Key className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">No credentials saved yet</p>
                    <p className="text-[10px] text-slate-500">Save logins for your course websites to auto-fill them like Proton Pass!</p>
                  </div>
                ) : (
                  vaultCredentials.map(cred => {
                    const pass = decryptVal(cred.passwordEnc);
                    const isShown = Boolean(showPassMap[cred.id]);
                    return (
                      <div key={cred.id} className="p-3.5 rounded-2xl bg-white/4 border border-white/8 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{cred.label || cred.domain}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {cred.domain}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                autoFillWebview(cred);
                                setShowVaultModal(false);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/25 transition-all flex items-center gap-1"
                              title="Auto-fill into active webview"
                            >
                              <Key className="w-3 h-3" /> Fill
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVaultCred(cred.id)}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete credential"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="bg-slate-950/50 p-2 rounded-xl border border-white/5 truncate">
                            <p className="text-[9px] uppercase font-bold text-slate-500">Username / Email</p>
                            <p className="text-slate-200 font-mono text-[11px] truncate">{cred.username}</p>
                          </div>
                          <div className="bg-slate-950/50 p-2 rounded-xl border border-white/5 relative group">
                            <p className="text-[9px] uppercase font-bold text-slate-500">Password</p>
                            <p className="text-slate-200 font-mono text-[11px] truncate">
                              {isShown ? pass : "••••••••••••"}
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowPassMap(m => ({ ...m, [cred.id]: !m[cred.id] }))}
                              className="absolute top-2 right-2 text-slate-400 hover:text-white"
                              title={isShown ? "Hide password" : "Show password"}
                            >
                              {isShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Credential Form */}
              {showAddVault ? (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add New Login Credential
                    </p>
                    <button onClick={() => setShowAddVault(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Domain (e.g. apnacollege.in)"
                      value={vDomain}
                      onChange={e => setVDomain(e.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Account Label (e.g. Apna College Student)"
                      value={vLabel}
                      onChange={e => setVLabel(e.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Username / Email"
                      value={vUsername}
                      onChange={e => setVUsername(e.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={vPassword}
                      onChange={e => setVPassword(e.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVaultCred}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold shadow hover:opacity-90 transition-all"
                  >
                    Save Encrypted Credential
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (activeDomain) setVDomain(activeDomain);
                    if (activeName) setVLabel(activeName);
                    setShowAddVault(true);
                  }}
                  className="w-full py-2.5 rounded-2xl border border-dashed border-white/20 bg-white/3 text-xs font-bold text-slate-300 hover:bg-white/8 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 text-cyan-400" /> Save Credential for Current Site
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
