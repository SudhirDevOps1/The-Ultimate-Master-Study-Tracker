import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight,
  ExternalLink, X, ChevronRight, Search, Maximize2, Minimize2,
  Key, Lock, Eye, EyeOff, ShieldCheck, Check, Filter, Camera,
  Sparkles, Gauge, Compass, Layers, Laptop, Code2, BookOpen,
  FolderPlus, Link2
} from "lucide-react";

interface PortalSite {
  id: string;
  name: string;
  url: string;
  icon: string;
  color: string;
  category: "Course Portal" | "Coding & DSA" | "Dev Tools" | "AI Tools" | "Custom";
  tag?: string;
}

const DEFAULT_PORTALS: PortalSite[] = [
  // Course Portals
  { id: "apna-college",   name: "Apna College",     url: "https://www.apnacollege.in",       icon: "🎓", color: "#6366f1", category: "Course Portal", tag: "Sigma Batch" },
  { id: "pw",             name: "Physics Wallah",    url: "https://www.pw.live",              icon: "⚡", color: "#f59e0b", category: "Course Portal", tag: "Lectures" },
  { id: "coursera",       name: "Coursera",          url: "https://www.coursera.org",         icon: "🏫", color: "#0ea5e9", category: "Course Portal" },
  { id: "udemy",          name: "Udemy",             url: "https://www.udemy.com",            icon: "🎯", color: "#a855f7", category: "Course Portal" },
  { id: "youtube",        name: "YouTube",           url: "https://www.youtube.com",          icon: "▶️", color: "#ef4444", category: "Course Portal", tag: "Playlists" },

  // Coding & DSA
  { id: "leetcode",       name: "LeetCode",          url: "https://leetcode.com/problemset",  icon: "🧠", color: "#f59e0b", category: "Coding & DSA", tag: "DSA Practice" },
  { id: "neetcode",       name: "NeetCode",          url: "https://neetcode.io/practice",     icon: "💡", color: "#10b981", category: "Coding & DSA", tag: "Roadmaps" },
  { id: "gfg",            name: "GeeksforGeeks",     url: "https://www.geeksforgeeks.org",    icon: "📗", color: "#22c55e", category: "Coding & DSA", tag: "Articles" },
  { id: "codeforces",     name: "Codeforces",        url: "https://codeforces.com",           icon: "🏆", color: "#3b82f6", category: "Coding & DSA", tag: "Contests" },

  // Dev Tools & Localhost
  { id: "github",         name: "GitHub",            url: "https://github.com",               icon: "💻", color: "#94a3b8", category: "Dev Tools", tag: "Repositories" },
  { id: "mdn",            name: "MDN Web Docs",      url: "https://developer.mozilla.org",    icon: "📖", color: "#38bdf8", category: "Dev Tools", tag: "Web Specs" },
  { id: "stackoverflow",  name: "Stack Overflow",    url: "https://stackoverflow.com",        icon: "🔶", color: "#f97316", category: "Dev Tools", tag: "Q&A" },
  { id: "localhost-3000", name: "Localhost :3000",   url: "http://localhost:3000",            icon: "🚀", color: "#06b6d4", category: "Dev Tools", tag: "React / Next" },
  { id: "localhost-5173", name: "Localhost :5173",   url: "http://localhost:5173",            icon: "⚡", color: "#8b5cf6", category: "Dev Tools", tag: "Vite App" },

  // AI Study Assistants
  { id: "chatgpt",        name: "ChatGPT",           url: "https://chat.openai.com",          icon: "🤖", color: "#10b981", category: "AI Tools", tag: "AI Tutor" },
  { id: "gemini",         name: "Google Gemini",     url: "https://gemini.google.com",        icon: "✨", color: "#8b5cf6", category: "AI Tools", tag: "Multimodal AI" },
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

function loadCustomSites(): PortalSite[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? (JSON.parse(raw) as PortalSite[]) : [];
  } catch { return []; }
}

function saveCustomSites(sites: PortalSite[]) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(sites)); } catch { /**/ }
}

export interface WebTab {
  id: string;
  url: string;
  title: string;
  icon: string;
  color: string;
}

export function WebPortalsPage() {
  const location = useLocation();
  const [customSites, setCustomSites] = useState<PortalSite[]>([]);
  const [tabs, setTabs] = useState<WebTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const activeUrl = activeTab?.url || null;

  const [inputUrl, setInputUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPortalsDrawer, setShowPortalsDrawer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("🌐");
  const [newColor, setNewColor] = useState("#6366f1");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Vault State
  const [vaultCredentials, setVaultCredentials] = useState<VaultCredential[]>([]);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showAddVault, setShowAddVault] = useState(false);
  const [vDomain, setVDomain] = useState("");
  const [vLabel, setVLabel] = useState("");
  const [vUsername, setVUsername] = useState("");
  const [vPassword, setVPassword] = useState("");
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});
  const [fillToast, setFillToast] = useState<string | null>(null);
  const [filledDomains, setFilledDomains] = useState<string[]>([]);

  // Master Password State
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultUnlockInput, setVaultUnlockInput] = useState("");
  const [vaultSetupInput, setVaultSetupInput] = useState("");

  const webviewRefs = useRef<Record<string, any>>({});
  const getWebview = () => (activeTabId ? webviewRefs.current[activeTabId] : null);

  useEffect(() => {
    setCustomSites(loadCustomSites());
    setVaultCredentials(loadVaultCredentials());
    const saved = localStorage.getItem("vault_master_password");
    if (saved) setMasterPassword(saved);
  }, []);

  function smartNormalizeUrl(raw: string): string {
    let clean = raw.trim().replace(/^["']|["']$/g, "");
    if (!clean) return "";

    // Windows local path or file protocol
    if (/^[a-zA-Z]:[\\/]/i.test(clean) || clean.startsWith("file://") || clean.startsWith("local-media://")) {
      clean = clean.replace(/\\/g, "/");
      if (/^[a-zA-Z]:\//i.test(clean)) {
        return `local-media:///${encodeURI(clean)}`;
      }
      return clean;
    }

    // Localhost / IP check
    if (/^localhost(:\d+)?/i.test(clean) || /^127\.0\.0\.1(:\d+)?/i.test(clean)) {
      return "http://" + clean;
    }

    // If already has protocol
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    }

    // If query has spaces or no dot, send to Google search
    if (clean.includes(" ") || !clean.includes(".")) {
      return `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
    }

    return "https://" + clean;
  }

  // Auto-load URL passed via router state
  useEffect(() => {
    const state = location.state as { url?: string; name?: string } | null;
    if (state?.url) {
      const url = smartNormalizeUrl(state.url);
      const newTab: WebTab = {
        id: crypto.randomUUID(),
        url,
        title: state.name || state.url,
        icon: "🌐",
        color: "#6366f1"
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setInputUrl(url);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Escape exits fullscreen or drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        setShowPortalsDrawer(false);
        setShowSpeedMenu(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Webview Activity Tracking & IPC Bridge
  useEffect(() => {
    const wv = getWebview();
    if (!isElectron || !wv || !activeUrl) return;

    try {
      const reportToMain = (url: string, title?: string) => {
        (window as any).electron?.ipcRenderer?.invoke("webview-activity-report", { url, title: title || "" })
          .catch(() => {});
      };

      const onNavigate = (e: any) => {
        const url = e.url || activeUrl || "";
        reportToMain(url);
        setInputUrl(url);
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url } : t));
      };

      const onTitleUpdate = (e: any) => {
        const url = wv.getURL?.() || activeUrl || "";
        reportToMain(url, e.title || "");
        if (e.title) {
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: e.title } : t));
        }
      };

      const onNewWindow = (e: any) => {
        e.preventDefault();
        if (wv.loadURL) wv.loadURL(e.url);
        else wv.src = e.url;
      };

      reportToMain(activeUrl);

      wv.addEventListener("did-navigate", onNavigate);
      wv.addEventListener("did-navigate-in-page", onNavigate);
      wv.addEventListener("page-title-updated", onTitleUpdate);
      wv.addEventListener("new-window", onNewWindow);

      return () => {
        wv.removeEventListener("did-navigate", onNavigate);
        wv.removeEventListener("did-navigate-in-page", onNavigate);
        wv.removeEventListener("page-title-updated", onTitleUpdate);
        wv.removeEventListener("new-window", onNewWindow);
      };
    } catch {
      return () => {};
    }
  }, [activeUrl, activeTabId]);

  // Clear tracking when closed
  useEffect(() => {
    if (!isElectron) return;
    if (!activeUrl) {
      (window as any).electron?.ipcRenderer?.invoke("webview-activity-clear").catch(() => {});
    }
  }, [activeUrl]);

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
      return (activeDomain.includes(d) || d.includes(activeDomain)) && !filledDomains.includes(c.domain);
    });
  }, [activeDomain, vaultCredentials, filledDomains]);

  // 1-Click Study Screenshot
  const handleCaptureScreenshot = () => {
    const wv = getWebview();
    if (!wv || typeof wv.capturePage !== "function") {
      setFillToast("Screenshot requires desktop app engine");
      setTimeout(() => setFillToast(null), 2500);
      return;
    }
    wv.capturePage()
      .then((image: any) => {
        const a = document.createElement("a");
        a.href = image.toDataURL();
        a.download = `FlowTrack_Study_Slide_${Date.now()}.png`;
        a.click();
        setFillToast("📸 Study slide snapshot saved to Downloads!");
        setTimeout(() => setFillToast(null), 3000);
      })
      .catch(() => {
        setFillToast("Failed to capture screenshot");
        setTimeout(() => setFillToast(null), 2500);
      });
  };

  // Video Speed Controller
  const handleSetSpeed = (speed: number) => {
    setVideoSpeed(speed);
    setShowSpeedMenu(false);
    const wv = getWebview();
    if (!wv) return;

    wv.executeJavaScript(`
      (() => {
        let count = 0;
        const videos = Array.from(document.querySelectorAll('video'));
        document.querySelectorAll('iframe').forEach(ifr => {
          try { videos.push(...Array.from(ifr.contentDocument.querySelectorAll('video'))); } catch(e) {}
        });
        videos.forEach(v => {
          v.playbackRate = ${speed};
          count++;
        });
        return count;
      })();
    `).then((count: number) => {
      setFillToast(count > 0 ? `⚡ Video Speed: ${speed}x` : `Applied speed: ${speed}x`);
      setTimeout(() => setFillToast(null), 2500);
    }).catch(() => {});
  };

  const allSites = [...DEFAULT_PORTALS, ...customSites];
  const filteredSites = allSites.filter(s => {
    const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.tag && s.tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = ["All", "Course Portal", "Coding & DSA", "Dev Tools", "AI Tools", "Custom"];

  function openPortal(site: PortalSite) {
    const url = smartNormalizeUrl(site.url);
    const existing = tabs.find(t => t.url === url);
    if (existing) {
      setActiveTabId(existing.id);
      setInputUrl(existing.url);
    } else {
      const newTab: WebTab = {
        id: crypto.randomUUID(),
        url,
        title: site.name,
        icon: site.icon || "🌐",
        color: site.color || "#6366f1"
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setInputUrl(url);
    }
    setShowPortalsDrawer(false);
  }

  function handleGoUrl() {
    if (!inputUrl.trim()) return;
    const url = smartNormalizeUrl(inputUrl);
    if (activeTabId) {
      setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, url, title: url } : t)));
    } else {
      const newTab: WebTab = {
        id: crypto.randomUUID(),
        url,
        title: url,
        icon: "🌐",
        color: "#6366f1"
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
    setInputUrl(url);
  }

  function closeTab(tabId: string) {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (tabId === activeTabId) {
        const newActive = next.length > 0 ? next[next.length - 1] : null;
        setActiveTabId(newActive ? newActive.id : null);
        setInputUrl(newActive ? newActive.url : "");
      }
      return next;
    });
  }

  function handleAddCustomSite() {
    if (!newName.trim() || !newUrl.trim()) return;
    const url = smartNormalizeUrl(newUrl);
    const site: PortalSite = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      url,
      icon: newIcon || "🌐",
      color: newColor || "#6366f1",
      category: "Custom",
      tag: "Custom Link"
    };
    const updated = [...customSites, site];
    setCustomSites(updated);
    saveCustomSites(updated);
    setNewName("");
    setNewUrl("");
    setShowAddForm(false);
    setFillToast(`Added portal: ${site.name}`);
    setTimeout(() => setFillToast(null), 2500);
  }

  function handleDeleteCustom(id: string) {
    const updated = customSites.filter(s => s.id !== id);
    setCustomSites(updated);
    saveCustomSites(updated);
  }

  const navAction = (action: "back" | "forward" | "reload") => {
    const wv = getWebview();
    if (!wv) return;
    if (action === "back") wv.goBack?.();
    if (action === "forward") wv.goForward?.();
    if (action === "reload") wv.reload?.();
  };

  const autoFillWebview = (cred: VaultCredential) => {
    const wv = getWebview();
    if (!wv) return;
    const password = decryptVal(cred.passwordEnc);

    const script = `
      (() => {
        let filled = 0;
        const u = document.querySelector('input[type="email"], input[type="text"], input[name*="user"], input[name*="login"]');
        const p = document.querySelector('input[type="password"]');
        if (u) { u.value = "${cred.username}"; u.dispatchEvent(new Event('input', { bubbles: true })); filled++; }
        if (p) { p.value = "${password}"; p.dispatchEvent(new Event('input', { bubbles: true })); filled++; }
        return filled;
      })();
    `;

    wv.executeJavaScript?.(script)
      .then((count: number) => {
        if (count > 0) {
          setFillToast(`⚡ Credentials auto-filled for ${cred.label || cred.domain}!`);
          setFilledDomains(prev => [...prev, cred.domain]);
        } else {
          navigator.clipboard?.writeText(password);
          setFillToast(`📋 Password copied to clipboard.`);
        }
        setTimeout(() => setFillToast(null), 3000);
      })
      .catch(() => {
        navigator.clipboard?.writeText(password);
        setFillToast(`📋 Password copied to clipboard.`);
        setTimeout(() => setFillToast(null), 3000);
      });
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-slate-950 flex flex-col" : "flex flex-col h-[calc(100vh-140px)] w-full"}>
      
      {/* ── TOP CONTROL BAR: Chrome/Arc Browser Strip ── */}
      <div className="flex flex-col bg-slate-900/95 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl shrink-0 overflow-hidden mb-3">
        
        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 px-3 pt-2 bg-slate-950/80 border-b border-white/5 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => { setActiveTabId(tab.id); setInputUrl(tab.url); }}
                className={`group flex items-center gap-2 px-3.5 py-1.5 min-w-[130px] max-w-[220px] rounded-t-xl cursor-pointer text-xs font-semibold border-t border-x transition-all select-none ${
                  isActive
                    ? "bg-slate-900 border-white/10 text-cyan-300 shadow-md"
                    : "bg-slate-950/60 border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                }`}
              >
                <span className="text-sm shrink-0">{tab.icon}</span>
                <span className="truncate flex-1 text-left">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="p-0.5 rounded-md hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => {
              const newTab: WebTab = {
                id: crypto.randomUUID(),
                url: "https://www.google.com",
                title: "Google Search",
                icon: "🌐",
                color: "#6366f1"
              };
              setTabs(prev => [...prev, newTab]);
              setActiveTabId(newTab.id);
              setInputUrl("https://www.google.com");
            }}
            title="New Search Tab"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {/* Speed Dial Drawer Quick Toggle */}
          <button
            type="button"
            onClick={() => setShowPortalsDrawer(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 mb-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-all shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Portals Hub</span>
          </button>
        </div>

        {/* Address & Study Actions Toolbar (Never wraps) */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => navAction("back")}
              disabled={!activeUrl}
              title="Go Back"
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navAction("forward")}
              disabled={!activeUrl}
              title="Go Forward"
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navAction("reload")}
              disabled={!activeUrl}
              title="Reload Page"
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Omnibox (Intelligent Address & Search Bar) */}
          <div className="flex-1 flex items-center gap-2 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/40 transition-all">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <input
              type="text"
              placeholder="Search Google or enter portal URL (apnacollege.in, leetcode.com, localhost:3000)..."
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleGoUrl()}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
            {inputUrl && (
              <button
                type="button"
                onClick={() => setInputUrl("")}
                className="text-slate-500 hover:text-slate-300 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={handleGoUrl}
              className="px-2.5 py-0.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shrink-0"
            >
              Go
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Auto-Fill Credential */}
            {activeMatchedCred && (
              <button
                type="button"
                onClick={() => autoFillWebview(activeMatchedCred)}
                title={`Auto-fill credentials for ${activeMatchedCred.label}`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all animate-pulse"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Fill Login</span>
              </button>
            )}

            {/* Video Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(v => !v)}
                title="Lecture Playback Speed"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all"
              >
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>{videoSpeed}x</span>
              </button>

              <AnimatePresence>
                {showSpeedMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1.5 z-50 bg-slate-900 border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 w-28"
                  >
                    {[1, 1.25, 1.5, 1.75, 2].map(speed => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => handleSetSpeed(speed)}
                        className={`px-3 py-1 text-xs rounded-lg text-left font-semibold transition-colors ${
                          videoSpeed === speed
                            ? "bg-amber-500/20 text-amber-300 font-bold"
                            : "text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {speed}x Speed
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 1-Click Screenshot */}
            <button
              type="button"
              onClick={handleCaptureScreenshot}
              title="Snapshot Slide / Code to Downloads"
              className="p-1.5 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-white/10 transition-all"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Credential Vault */}
            <button
              type="button"
              onClick={() => setShowVaultModal(true)}
              title="Encrypted Login Vault"
              className="p-1.5 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-white/10 transition-all"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Open in External Browser */}
            {activeUrl && (
              <button
                type="button"
                onClick={() => openExternal(activeUrl)}
                title="Open in External Chrome / Edge"
                className="p-1.5 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-white/10 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(f => !f)}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Study Fullscreen"}
              className={`p-1.5 rounded-xl transition-all ${
                isFullscreen
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Active Browser View */}
            {activeTabId && (
              <button
                type="button"
                onClick={() => closeTab(activeTabId)}
                title="Close Tab"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN VIEWPORT: 100% Full Width ── */}
      <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl">
        
        {/* State A: No Tabs Active — Show the High-Tech Speed Dial Hub */}
        {!activeUrl ? (
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 lg:p-8 flex flex-col">
            
            {/* Speed Dial Hero Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Compass className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    Study Portals & In-App Browser
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Chromium Engine
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1-Click access to Sigma Batch, LeetCode, GitHub, Documentation & Localhost
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter portals..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-48 sm:w-56 pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Portal
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 py-4 overflow-x-auto custom-scrollbar shrink-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === cat
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Portal Cards Grid (Clean & Modern) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pb-8">
              {filteredSites.map(site => {
                const isCustom = customSites.some(c => c.id === site.id);
                return (
                  <motion.div
                    key={site.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openPortal(site)}
                    className="group relative p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-slate-900 hover:border-cyan-500/40 cursor-pointer shadow-lg transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: `${site.color}20`, border: `1px solid ${site.color}40` }}
                      >
                        {site.icon}
                      </div>

                      {site.tag && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                          {site.tag}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {site.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                        {site.url.replace(/^https?:\/\//, "")}
                      </p>
                    </div>

                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCustom(site.id); }}
                        className="absolute top-2 right-2 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete custom site"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* State B: In-App Webview Viewport (Takes 100% of screen) */
          <div className="w-full h-full relative bg-slate-950">
            {isElectron ? (
              <div className="w-full h-full relative">
                {activeTab && (
                  <webview
                    key={activeTab.id}
                    ref={(el: any) => { if (el) webviewRefs.current[activeTab.id] = el; }}
                    src={activeTab.url}
                    className="w-full h-full border-0 absolute top-0 left-0 z-10 pointer-events-auto"
                    allowpopups={true}
                    partition="persist:browser_session"
                    webpreferences="allowRunningInsecureContent=true, javascript=true"
                  />
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-950">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Globe className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Chromium Engine Active in Desktop Mode</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    The embedded in-app browser runs natively inside the FlowTrack Pro desktop application.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openExternal(activeUrl)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg"
                >
                  <ExternalLink className="w-4 h-4" /> Open in External Browser
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Slide-over Portals Hub Drawer ── */}
        <AnimatePresence>
          {showPortalsDrawer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex justify-end"
              onClick={() => setShowPortalsDrawer(false)}
            >
              <motion.div
                initial={{ x: 340 }}
                animate={{ x: 0 }}
                exit={{ x: 340 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-80 sm:w-96 h-full bg-slate-900 border-l border-white/10 p-5 shadow-2xl flex flex-col gap-4 overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-white">Speed Dial Portals</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPortalsDrawer(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {allSites.map(site => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => openPortal(site)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/5 bg-slate-950/60 hover:bg-white/10 hover:border-cyan-500/40 text-left transition-all group"
                    >
                      <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{site.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{site.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{site.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {fillToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900 border border-emerald-500/40 px-5 py-2.5 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{fillToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Custom Portal Modal ── */}
      <AnimatePresence>
        {showAddForm && (
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
              className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" /> Add Custom Website Portal
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Portal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. My College Portal / Notes"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">URL Address</label>
                  <input
                    type="text"
                    placeholder="e.g. https://apnacollege.in or localhost:3000"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emoji Icon</label>
                    <input
                      type="text"
                      placeholder="🌐"
                      value={newIcon}
                      onChange={e => setNewIcon(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-center text-sm rounded-xl bg-slate-950 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Theme Color</label>
                    <input
                      type="color"
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      className="w-full mt-1 h-9 rounded-xl bg-slate-950 border border-white/10 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddCustomSite}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all"
                >
                  Save Portal
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Credential Vault Modal ── */}
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
              className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Encrypted Credential Vault</h3>
                    <p className="text-[11px] text-slate-400">Auto-fill login info for course portals & tools</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVaultModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                {vaultCredentials.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">No credentials stored yet.</p>
                ) : (
                  vaultCredentials.map(cred => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{cred.label || cred.domain}</p>
                        <p className="text-[10px] text-slate-400">{cred.username}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => autoFillWebview(cred)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30"
                        >
                          Auto-Fill
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = vaultCredentials.filter(c => c.id !== cred.id);
                            setVaultCredentials(updated);
                            saveVaultCredentials(updated);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {showAddVault ? (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                  <input
                    type="text"
                    placeholder="Domain (e.g. apnacollege.in)"
                    value={vDomain}
                    onChange={e => setVDomain(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Username / Email"
                    value={vUsername}
                    onChange={e => setVUsername(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={vPassword}
                    onChange={e => setVPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-white"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!vUsername.trim() || !vPassword.trim()) return;
                        const item: VaultCredential = {
                          id: crypto.randomUUID(),
                          domain: vDomain.trim() || activeDomain || "general",
                          label: vLabel.trim() || vDomain.trim() || "Saved Login",
                          username: vUsername.trim(),
                          passwordEnc: encryptVal(vPassword),
                        };
                        const updated = [...vaultCredentials, item];
                        setVaultCredentials(updated);
                        saveVaultCredentials(updated);
                        setVDomain(""); setVUsername(""); setVPassword("");
                        setShowAddVault(false);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                    >
                      Save Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddVault(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddVault(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Login Credential
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
