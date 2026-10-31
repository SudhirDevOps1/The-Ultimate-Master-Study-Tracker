import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { useLocation } from "react-router-dom";
import { Readability } from "@mozilla/readability";
import DOMPurify from "dompurify";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight,
  ExternalLink, X, ChevronRight, Search, Maximize2, Minimize2,
  Key, Lock, Eye, EyeOff, ShieldCheck, Check, Filter, Camera,
  Sparkles, Gauge, Compass, Layers, Laptop, Code2, BookOpen,
  FolderPlus, ZoomIn,
  ZoomOut,
  Moon,
  Sun,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  Download,
  Link2
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
  { id: "apna-college",         name: "Apna College",            url: "https://www.apnacollege.in",         icon: "🎓", color: "#6366f1", category: "Course Portal", tag: "Main & Login" },
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
  { id: "chatgpt",        name: "ChatGPT",           url: "https://chatgpt.com",              icon: "🤖", color: "#10b981", category: "AI Tools", tag: "AI Tutor" },
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
  srcUrl: string;       // Only changed by explicit user action: address bar submit, bookmark click, reload
  displayUrl: string;   // Updated on did-navigate / in-page events for address bar & activity report
  url?: string;         // Maintained in sync for backward compatibility
  title: string;
  icon: string;
  color: string;
}

interface WebviewViewportProps {
  tabId: string;
  initialUrl: string;
  allowInsecure: boolean;
  onMount: (tabId: string, el: any) => void;
  onUnmount: (tabId: string) => void;
  onNavigate: (tabId: string, url: string) => void;
  onTitleUpdate: (tabId: string, title: string, url: string) => void;
  onNewWindow: (e: any) => void;
  onDomReady: (wv: any) => void;
}

const WebviewViewport = memo(
  function WebviewViewport({
    tabId,
    initialUrl,
    allowInsecure,
    onMount,
    onUnmount,
    onNavigate,
    onTitleUpdate,
    onNewWindow,
    onDomReady,
  }: WebviewViewportProps) {
    const webviewRef = useRef<any>(null);
    const callbacksRef = useRef({ onNavigate, onTitleUpdate, onNewWindow, onDomReady });
    callbacksRef.current = { onNavigate, onTitleUpdate, onNewWindow, onDomReady };

    const webpreferences = useMemo(
      () => `allowRunningInsecureContent=${allowInsecure}, javascript=true`,
      [allowInsecure]
    );

    useEffect(() => {
      const wv = webviewRef.current;
      if (!wv) return;
      onMount(tabId, wv);

      const handleNav = (e: any) => {
        const navUrl = e.url || wv.getURL?.() || "";
        callbacksRef.current.onNavigate(tabId, navUrl);
      };

      const handleTitle = (e: any) => {
        const title = e.title || "";
        const url = wv.getURL?.() || "";
        callbacksRef.current.onTitleUpdate(tabId, title, url);
      };

      const handleNewWin = (e: any) => {
        callbacksRef.current.onNewWindow(e);
      };

      const handleDom = () => {
        callbacksRef.current.onDomReady(wv);
      };

      wv.addEventListener("did-navigate", handleNav);
      wv.addEventListener("did-navigate-in-page", handleNav);
      wv.addEventListener("page-title-updated", handleTitle);
      wv.addEventListener("new-window", handleNewWin);
      wv.addEventListener("dom-ready", handleDom);

      return () => {
        onUnmount(tabId);
        try {
          wv.stop?.();
          wv.setAudioMuted?.(true);
          wv.removeEventListener("did-navigate", handleNav);
          wv.removeEventListener("did-navigate-in-page", handleNav);
          wv.removeEventListener("page-title-updated", handleTitle);
          wv.removeEventListener("new-window", handleNewWin);
          wv.removeEventListener("dom-ready", handleDom);
        } catch {}
      };
    }, [tabId, onMount, onUnmount]);

    return (
      <webview
        key={tabId}
        ref={webviewRef}
        src={initialUrl}
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
        className="w-full h-full border-0 absolute top-0 left-0 z-10 pointer-events-auto"
        allowpopups={true}
        partition="persist:browser_session"
        webpreferences={webpreferences}
      />
    );
  },
  (prev, next) => prev.tabId === next.tabId && prev.allowInsecure === next.allowInsecure
);

export function WebPortalsPage() {
  const location = useLocation();
  const [customSites, setCustomSites] = useState<PortalSite[]>([]);
  const [tabs, setTabs] = useState<WebTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const activeUrl = activeTab?.displayUrl || activeTab?.srcUrl || activeTab?.url || null;

  const [inputUrl, setInputUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPortalsDrawer, setShowPortalsDrawer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("🌐");
  const [newColor, setNewColor] = useState("#6366f1");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [inPageSearchQuery, setInPageSearchQuery] = useState("");
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

  // Browser Parity Features State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState({ active: 0, total: 0 });
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [isWebviewDark, setIsWebviewDark] = useState(() => localStorage.getItem("flowtrack_webview_dark") === "true");
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [readerArticle, setReaderArticle] = useState<{ title: string; byline?: string; content: string } | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<{ active: boolean; filename: string; progress: number; completed: boolean; savePath?: string } | null>(null);
  const [vaultUnlockInput, setVaultUnlockInput] = useState("");
  const [vaultSetupInput, setVaultSetupInput] = useState("");

  const webviewRefs = useRef<Record<string, any>>({});
  const getWebview = () => (activeTabId ? webviewRefs.current[activeTabId] : null);
  const activeUrlRef = useRef<string | null>(null);
  activeUrlRef.current = activeUrl;

  useEffect(() => {
    setCustomSites(loadCustomSites());
    setVaultCredentials(loadVaultCredentials());
    const saved = localStorage.getItem("vault_master_password");
    if (saved) setMasterPassword(saved);
  }, []);

  // Apply per-origin zoom factor when activeUrl changes
  useEffect(() => {
    if (!activeUrl) return;
    try {
      const host = new URL(activeUrl).hostname;
      const savedZoom = localStorage.getItem("flowtrack_zoom_" + host);
      const factor = savedZoom ? parseFloat(savedZoom) : 1.0;
      setZoomFactor(factor);
      const wv = getWebview();
      if (wv && typeof wv.setZoomFactor === "function") {
        wv.setZoomFactor(factor);
      }
    } catch {}
  }, [activeUrl]);

  // Listen to download events from Electron
  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer?.on) return;

    const unsubProgress = electron.ipcRenderer.on("download-progress", (data: any) => {
      if (data) {
        const pct = data.totalBytes > 0 ? Math.round((data.receivedBytes / data.totalBytes) * 100) : 0;
        setDownloadNotice({
          active: true,
          filename: data.filename || "file",
          progress: pct,
          completed: false,
        });
      }
    });

    const unsubDone = electron.ipcRenderer.on("download-completed", (data: any) => {
      if (data) {
        setDownloadNotice({
          active: false,
          filename: data.filename || "file",
          progress: 100,
          completed: data.state === "completed",
          savePath: data.savePath,
        });
        setTimeout(() => {
          setDownloadNotice(prev => (prev?.completed ? null : prev));
        }, 6000);
      }
    });

    return () => {
      if (unsubProgress) unsubProgress();
      if (unsubDone) unsubDone();
    };
  }, []);

  // Zoom Handlers
  const handleZoom = (delta: number) => {
    const next = Math.min(2.5, Math.max(0.5, Math.round((zoomFactor + delta) * 10) / 10));
    setZoomFactor(next);
    const wv = getWebview();
    if (wv && typeof wv.setZoomFactor === "function") {
      wv.setZoomFactor(next);
    }
    if (activeUrl) {
      try {
        const host = new URL(activeUrl).hostname;
        localStorage.setItem("flowtrack_zoom_" + host, String(next));
      } catch {}
    }
  };

  const handleZoomReset = () => {
    setZoomFactor(1.0);
    const wv = getWebview();
    if (wv && typeof wv.setZoomFactor === "function") {
      wv.setZoomFactor(1.0);
    }
    if (activeUrl) {
      try {
        const host = new URL(activeUrl).hostname;
        localStorage.removeItem("flowtrack_zoom_" + host);
      } catch {}
    }
  };

  // Find in page handlers
  const handleSearchChange = (query: string) => {
    setInPageSearchQuery(query);
    const wv = getWebview();
    if (wv && typeof wv.findInPage === "function") {
      if (!query.trim()) {
        wv.stopFindInPage("clearSelection");
        setSearchMatches({ active: 0, total: 0 });
      } else {
        wv.findInPage(query, { forward: true, findNext: false });
      }
    }
  };

  const handleFindNext = () => {
    const wv = getWebview();
    if (wv && inPageSearchQuery && typeof wv.findInPage === "function") {
      wv.findInPage(inPageSearchQuery, { forward: true, findNext: true });
    }
  };

  const handleFindPrev = () => {
    const wv = getWebview();
    if (wv && inPageSearchQuery && typeof wv.findInPage === "function") {
      wv.findInPage(inPageSearchQuery, { forward: false, findNext: true });
    }
  };

  const handleCloseSearch = () => {
    setIsSearching(false);
    setInPageSearchQuery("");
    setSearchMatches({ active: 0, total: 0 });
    const wv = getWebview();
    if (wv && typeof wv.stopFindInPage === "function") {
      wv.stopFindInPage("clearSelection");
    }
  };

  // Dark Mode CSS Injection
  const DARK_CSS = "html { filter: invert(90%) hue-rotate(180deg) !important; background: #121212 !important; } img, video, canvas, svg, [style*=\"background-image\"] { filter: invert(100%) hue-rotate(180deg) !important; }";
  const handleToggleDarkMode = () => {
    const next = !isWebviewDark;
    setIsWebviewDark(next);
    localStorage.setItem("flowtrack_webview_dark", String(next));
    const wv = getWebview();
    if (wv && typeof wv.insertCSS === "function") {
      if (next) {
        wv.insertCSS(DARK_CSS);
      } else if (typeof wv.reload === "function") {
        wv.reload();
      }
    }
  };

  // Reader Mode Handler
  const handleToggleReaderMode = async () => {
    if (isReaderMode) {
      setIsReaderMode(false);
      return;
    }
    const wv = getWebview();
    if (!wv) return;
    try {
      const html = await wv.executeJavaScript("document.documentElement.outerHTML");
      const doc = new DOMParser().parseFromString(html, "text/html");
      const reader = new Readability(doc);
      const article = reader.parse();
      if (article) {
        setReaderArticle({
          title: article.title || "Study Article",
          byline: article.byline || undefined,
          content: DOMPurify.sanitize(article.content || "<p>No readable content extracted.</p>")
        });
        setIsReaderMode(true);
      }
    } catch (e) {
      console.warn("Reader mode extraction failed:", e);
    }
  };

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

    // If user loaded a freshchat support widget URL with referrer, extract the actual portal URL
    if (clean.includes("freshchat.com/widget") && clean.includes("referrer=")) {
      try {
        const u = new URL(clean.startsWith("http") ? clean : "https://" + clean);
        const ref = u.searchParams.get("referrer");
        if (ref) {
          const decoded = atob(ref);
          if (decoded.startsWith("http")) return decoded;
        }
      } catch {}
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
      const newId = crypto.randomUUID();
      const newTab: WebTab = {
        id: newId,
        srcUrl: url,
        displayUrl: url,
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

  const handleWebviewMount = useCallback((tabId: string, el: any) => {
    webviewRefs.current[tabId] = el;
  }, []);

  const handleWebviewUnmount = useCallback((tabId: string) => {
    delete webviewRefs.current[tabId];
  }, []);

  const reportToMain = useCallback((url: string, title?: string) => {
    if (!isElectron) return;
    (window as any).electron?.ipcRenderer?.invoke("webview-activity-report", { url, title: title || "" })
      .catch(() => {});
  }, [isElectron]);

  const handleNavigate = useCallback((tabId: string, navUrl: string) => {
    if (!navUrl) return;
    const wv = webviewRefs.current[tabId];
    if (navUrl.includes("freshchat.com/widget")) {
      const normalized = smartNormalizeUrl(navUrl);
      if (normalized !== navUrl && !normalized.includes("freshchat.com")) {
        wv?.loadURL?.(normalized);
        return;
      }
      return;
    }
    reportToMain(navUrl);
    setInputUrl(navUrl);
    setTabs(prev => prev.map(t => (t.id === tabId ? { ...t, displayUrl: navUrl, url: navUrl } : t)));
  }, [reportToMain]);

  const handleTitleUpdate = useCallback((tabId: string, title: string, url: string) => {
    reportToMain(url, title);
    if (title) {
      setTabs(prev => prev.map(t => (t.id === tabId ? { ...t, title } : t)));
    }
  }, [reportToMain]);

  const handleNewWindow = useCallback((e: any) => {
    const targetUrl = e.url || "";
    const features = typeof e.features === "string" ? e.features : "";
    const disposition = e.disposition || "";

    // Auth popups, dialogs, or explicit popup windows bubble up to Electron's setWindowOpenHandler
    const isPopupFeatures =
      features.includes("width=") || features.includes("popup=") || features.includes("height=") || disposition === "new-window";

    const isAuthPopup =
      isPopupFeatures ||
      /accounts\.google\.com|accounts\.youtube\.com|login\.microsoftonline\.com|login\.live\.com|appleid\.apple\.com|github\.com\/login|gitlab\.com\/users\/sign_in|auth0\.com|okta\.com|firebaseapp\.com|\.supabase\.co|leetcode\.com\/accounts|apnacollege\.in|classplus|mycourse\.app|otpless|login|signin|oauth|auth/i.test(targetUrl);

    if (isAuthPopup) {
      // Let main process create the real child BrowserWindow with persist:browser_session
      // Never call preventDefault() so window.opener and postMessage remain intact
      return;
    }

    e.preventDefault();
    if (!targetUrl || targetUrl === "about:blank") return;

    // Prevent third-party chat widgets from hijacking study tab
    if (
      targetUrl.includes("freshchat.com/widget") ||
      targetUrl.includes("tawk.to") ||
      targetUrl.includes("crisp.chat") ||
      targetUrl.includes("intercom.io") ||
      targetUrl.includes("zendesk.com/embeddable")
    ) {
      return;
    }

    // Open external links in a fresh tab inside FlowTrack browser
    const newId = crypto.randomUUID();
    const newTab: WebTab = {
      id: newId,
      srcUrl: targetUrl,
      displayUrl: targetUrl,
      url: targetUrl,
      title: "Loading...",
      icon: "🌐",
      color: "#06b6d4"
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setInputUrl(targetUrl);
  }, []);

  const handleDomReady = useCallback((wv: any) => {
    if (!wv) return;
    const currentUrl = wv.getURL?.() || activeUrlRef.current || "";
    const isYouTube = /youtube\.com|youtube-nocookie\.com/i.test(currentUrl);

    // ONLY apply safe YouTube ad handling on YouTube
    // Never inject YouTube styles or scripts into Apna College or other portals.
    if (!isYouTube) return;

    // Hide only standalone promo banners without breaking the HTML5 player layout
    const adCSS = `
      #masthead-ad, ytd-banner-promo-renderer,
      ytd-statement-banner-renderer, #player-ads,
      ytd-promoted-sparkles-web-renderer,
      ytd-promoted-video-renderer, ytd-display-ad-renderer,
      .adsbygoogle {
        display: none !important;
        visibility: hidden !important;
        height: 0px !important;
      }
    `;
    try {
      wv.insertCSS?.(adCSS).catch?.(() => {});
    } catch {}

    const skipScript = `
      (() => {
        if (window.__flowtrack_yt_adskip_init) return;
        window.__flowtrack_yt_adskip_init = true;

        let wasMutedByAdSkipper = false;

        const handleAds = () => {
          // 1. Skip button click (highest priority)
          const skipBtn = document.querySelector(
            ".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button"
          );
          if (skipBtn) {
            try { skipBtn.click(); } catch(e) {}
          }

          // 2. Check if YouTube player is actively showing an in-stream ad
          const player = document.querySelector("#movie_player, .html5-video-player");
          const isAdActive = player && (
            player.classList.contains("ad-showing") ||
            player.classList.contains("ad-interrupting")
          );

          const video = document.querySelector("video.html5-main-video");
          if (!video) return;

          if (isAdActive) {
            // An ad is actively playing: Mute and accelerate playback safely
            if (!video.muted) {
              video.muted = true;
              wasMutedByAdSkipper = true;
            }
            try {
              video.playbackRate = 8.0;
            } catch(e) {}
            // Attempt to trigger skip button again
            const skipBtn2 = document.querySelector(".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern");
            if (skipBtn2) {
              try { skipBtn2.click(); } catch(e) {}
            }
          } else {
            // Normal video playback: Restore normal speed & unmute if muted by ad skipper
            if (video.playbackRate > 3.0) {
              video.playbackRate = 1.0;
            }
            if (wasMutedByAdSkipper) {
              video.muted = false;
              wasMutedByAdSkipper = false;
            }
          }
        };

        setInterval(handleAds, 1000);
      })();
    `;
    try {
      wv.executeJavaScript?.(skipScript).catch?.(() => {});
    } catch {}
  }, []);

  // Report active tab URL to main process
  useEffect(() => {
    if (!isElectron) return;
    if (activeUrlRef.current) {
      reportToMain(activeUrlRef.current);
    }
  }, [activeTabId, reportToMain, isElectron]);

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
    const existing = tabs.find(t => t.srcUrl === url || t.displayUrl === url || t.url === url);
    if (existing) {
      setActiveTabId(existing.id);
      setInputUrl(existing.displayUrl || existing.srcUrl || existing.url || "");
    } else {
      const newId = crypto.randomUUID();
      const newTab: WebTab = {
        id: newId,
        srcUrl: url,
        displayUrl: url,
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
      const wv = getWebview();
      if (wv && typeof wv.loadURL === "function") {
        wv.loadURL(url);
      }
      setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, srcUrl: url, displayUrl: url, url, title: url } : t)));
    } else {
      const newId = crypto.randomUUID();
      const newTab: WebTab = {
        id: newId,
        srcUrl: url,
        displayUrl: url,
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
    delete webviewRefs.current[tabId];
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (tabId === activeTabId) {
        const newActive = next.length > 0 ? next[next.length - 1] : null;
        setActiveTabId(newActive ? newActive.id : null);
        setInputUrl(newActive ? (newActive.displayUrl || newActive.srcUrl || newActive.url || "") : "");
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
                onClick={() => { setActiveTabId(tab.id); setInputUrl(tab.displayUrl || tab.srcUrl || tab.url || ""); }}
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
              const newId = crypto.randomUUID();
              const newTab: WebTab = {
                id: newId,
                srcUrl: "https://www.google.com",
                displayUrl: "https://www.google.com",
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

                        {/* In-Page Search */}
            <button
              type="button"
              onClick={() => setIsSearching(s => !s)}
              title="Find in Page (Ctrl+F)"
              className={`p-1.5 rounded-xl transition-all ${isSearching ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Reader Mode (Distraction-Free) */}
            <button
              type="button"
              onClick={handleToggleReaderMode}
              title="Distraction-Free Reader Mode"
              className={`p-1.5 rounded-xl transition-all ${isReaderMode ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-300 hover:text-cyan-400 hover:bg-white/10"}`}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleDarkMode}
              title={isWebviewDark ? "Switch to Normal Light Mode" : "Force Dark Invert Mode"}
              className={`p-1.5 rounded-xl transition-all ${isWebviewDark ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-slate-300 hover:text-amber-400 hover:bg-white/10"}`}
            >
              {isWebviewDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-slate-800/80 border border-white/10 rounded-xl px-1 py-0.5">
              <button
                type="button"
                onClick={() => handleZoom(-0.1)}
                title="Zoom Out (Ctrl -)"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                title="Reset Zoom (Ctrl 0)"
                className="px-1 text-[11px] font-mono text-slate-300 hover:text-cyan-400 font-bold"
              >
                {Math.round(zoomFactor * 100)}%
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.1)}
                title="Zoom In (Ctrl +)"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
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

            {/* In-Page Search Floating Bar */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 right-4 z-50 bg-slate-900/95 border border-cyan-500/40 shadow-2xl rounded-xl p-1.5 flex items-center gap-1.5 backdrop-blur-md"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
            <input
              type="text"
              placeholder="Find in page..."
              value={inPageSearchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (e.shiftKey) handleFindPrev();
                  else handleFindNext();
                } else if (e.key === "Escape") {
                  handleCloseSearch();
                }
              }}
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-36 md:w-48 px-1"
              autoFocus
            />
            <span className="text-[10px] text-slate-400 font-mono px-1">
              {searchMatches.total > 0 ? `${searchMatches.active}/${searchMatches.total}` : (inPageSearchQuery ? "0/0" : "")}
            </span>
            <button
              type="button"
              onClick={handleFindPrev}
              title="Previous Match (Shift+Enter)"
              className="p-1 rounded hover:bg-white/10 text-slate-300"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFindNext}
              title="Next Match (Enter)"
              className="p-1 rounded hover:bg-white/10 text-slate-300"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCloseSearch}
              title="Close (Esc)"
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Notification Floating Toast */}
      <AnimatePresence>
        {downloadNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/40 rounded-2xl p-3 shadow-2xl flex items-center gap-3 backdrop-blur-md max-w-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{downloadNotice.filename}</p>
              <p className="text-[10px] text-slate-400">
                {downloadNotice.completed ? "Download Complete" : `Downloading ${downloadNotice.progress}%`}
              </p>
              {!downloadNotice.completed && (
                <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                  <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${downloadNotice.progress}%` }} />
                </div>
              )}
            </div>
            {downloadNotice.completed && downloadNotice.savePath && (
              <button
                type="button"
                onClick={() => (window as any).electron?.ipcRenderer?.invoke("show-item-in-folder", downloadNotice.savePath)}
                title="Show in Folder"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs flex items-center gap-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setDownloadNotice(null)}
              className="p-1 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Distraction-Free Study Reader Overlay */}
      <AnimatePresence>
        {isReaderMode && readerArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto p-4 md:p-8 flex flex-col items-center"
          >
            <div className="w-full max-w-3xl flex items-center justify-between pb-4 border-b border-white/10 mb-6 sticky top-0 bg-slate-950/90 backdrop-blur py-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>Distraction-Free Study Reader</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsReaderMode(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <article className="w-full max-w-3xl text-slate-200">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">{readerArticle.title}</h1>
              {readerArticle.byline && <p className="text-xs text-slate-400 mb-6 italic">{readerArticle.byline}</p>}
              <div
                className="study-reader-content space-y-4 text-sm md:text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: readerArticle.content }}
              />
            </article>
          </motion.div>
        )}
      </AnimatePresence>

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
                    1-Click access to your course portals, LeetCode, GitHub, Documentation & Localhost
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
                  <WebviewViewport
                    key={activeTab.id}
                    tabId={activeTab.id}
                    initialUrl={activeTab.srcUrl}
                    allowInsecure={localStorage.getItem("flowtrack_webview_allow_insecure") !== "false"}
                    onMount={handleWebviewMount}
                    onUnmount={handleWebviewUnmount}
                    onNavigate={handleNavigate}
                    onTitleUpdate={handleTitleUpdate}
                    onNewWindow={handleNewWindow}
                    onDomReady={handleDomReady}
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
