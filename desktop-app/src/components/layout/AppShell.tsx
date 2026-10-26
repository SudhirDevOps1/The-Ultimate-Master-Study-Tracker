import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { 
  Home, 
  ClipboardList, 
  Timer, 
  Monitor, 
  Brain, 
  Calendar as CalendarIcon, 
  BarChart2, 
  Award, 
  History as HistoryIcon, 
  Book, 
  Settings as SettingsIcon,
  Target,
  Palette,
  FileText,
  Globe2,
  ShieldCheck,
  Minus,
  Square,
  Copy,
  X,
  Sparkles,
  HelpCircle,
  ScanText,
  CalendarClock
} from "lucide-react";
import { useState, useEffect } from "react";

const links = [
  // 1. Core Daily Study
  { to: "/dashboard", label: "Dashboard", Icon: Home, category: "Core" },
  { to: "/today", label: "Today Tasks", Icon: ClipboardList, category: "Core" },
  { to: "/timer", label: "Study Timer", Icon: Timer, category: "Core" },
  { to: "/web-portals", label: "Web Browser", Icon: Globe2, category: "Core" },

  // 2. Study Tools & Knowledge
  { to: "/scheduler", label: "AI Scheduler", Icon: CalendarClock, category: "Tools" },
  { to: "/notes-board", label: "Notes Board", Icon: FileText, category: "Tools" },
  { to: "/study-workspace", label: "PDF / OCR Reader", Icon: ScanText, category: "Tools" },
  { to: "/mind-map", label: "Mind Maps", Icon: Palette, category: "Tools" },
  { to: "/flashcards", label: "SRS Flashcards", Icon: Brain, category: "Tools" },
  { to: "/ai", label: "AI Assistant", Icon: Sparkles, category: "Tools" },

  // 3. Tracking & Focus Shield
  { to: "/analytics", label: "Analytics", Icon: BarChart2, category: "Focus" },
  { to: "/blocker", label: "Focus Blocker", Icon: ShieldCheck, category: "Focus" },
  { to: "/app-tracking", label: "App Tracking", Icon: Monitor, category: "Focus" },
  { to: "/achievements", label: "Achievements", Icon: Award, category: "Focus" },
  { to: "/history", label: "History", Icon: HistoryIcon, category: "Focus" },

  // 4. Planning & Preferences
  { to: "/calendar", label: "Calendar", Icon: CalendarIcon, category: "Planning" },
  { to: "/exams", label: "Exam Countdown", Icon: Target, category: "Planning" },
  { to: "/subjects", label: "Subjects", Icon: Book, category: "Planning" },
  { to: "/guide", label: "Guide", Icon: HelpCircle, category: "Planning" },
  { to: "/settings", label: "Settings", Icon: SettingsIcon, category: "Planning" },
];

export function AppShell() {
  const location = useLocation();
  const theme = useAppStore((state: AppState) => state.theme);
  const timer = useAppStore((state: AppState) => state.timer);
  const currentLink = links.find((link) => link.to === location.pathname);
  const current = currentLink ? currentLink.label : "Dashboard";

  const isCompactHeader = location.pathname === "/web-portals" || location.pathname === "/notes-board" || location.pathname === "/mind-map";

  const getGradientClass = () => {
    switch (theme) {
      case "ocean": return "from-sky-500 to-teal-400";
      case "forest": return "from-green-500 to-lime-400";
      case "sunset": return "from-orange-500 to-rose-500";
      case "galaxy": return "from-purple-500 to-pink-500";
      case "cyber": return "from-yellow-400 to-rose-500";
      default: return "from-indigo-500 to-cyan-500";
    }
  };

  const isElectron = typeof window !== "undefined" && Boolean((window as any).electron?.isElectron);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isElectron) {
      (window as any).electron?.ipcRenderer?.invoke("is-window-maximized")
        .then((res: boolean) => setIsMaximized(Boolean(res)))
        .catch(() => {});
    }
  }, [isElectron]);

  const handleMinimize = () => {
    (window as any).electron?.ipcRenderer?.invoke("window-minimize").catch(() => {});
  };

  const handleMaximize = async () => {
    try {
      const res = await (window as any).electron?.ipcRenderer?.invoke("window-maximize");
      if (res && typeof res.isMaximized === "boolean") {
        setIsMaximized(res.isMaximized);
      }
    } catch {}
  };

  const handleClose = () => {
    (window as any).electron?.ipcRenderer?.invoke("window-close").catch(() => {});
  };

  return (
    <div className={`grid-bg min-h-screen ${isCompactHeader ? "px-3 py-2 md:px-5 md:py-3" : "px-4 py-4 md:px-8 md:py-6"}`}>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-3 flex w-full max-w-7xl flex-col gap-2.5"
      >
        <div className={`glass rounded-2xl ${isCompactHeader ? "px-4 py-2.5" : "px-5 py-4 md:px-6"}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 group shrink-0">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-shadow duration-300 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-950">
                    <svg className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" className="opacity-30 stroke-indigo-400" />
                      <path d="M12 6v6l4 2" className="stroke-cyan-300" />
                      <path d="M12 2a10 10 0 0 1 10 10" className="stroke-indigo-400" strokeDasharray="3 3" />
                      <path d="M8 22h8" className="stroke-indigo-500" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-slate-950"></span>
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-black tracking-tight text-white transition-colors group-hover:text-cyan-100">
                    Flow<span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Track</span>
                  </span>
                  <div className="flex items-center gap-1.5 mt-[-2px]">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Master Suite</span>
                  </div>
                </div>
              </Link>

              {!isCompactHeader && (
                <div className="hidden md:block border-l border-white/10 pl-4">
                  <h1 className="text-base font-bold text-white">Smart Study Tracker</h1>
                  <p className="text-xs text-slate-400">
                    Plan sessions, track actual study time accurately & conquer your goals.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 justify-end">
              {timer?.activeSessionId && !timer?.isPaused && (
                <div className="flex items-center gap-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-black text-rose-300 animate-pulse shadow-md shadow-rose-500/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">FOCUS ACTIVE</span>
                </div>
              )}

              <div className={`soft-card rounded-xl bg-gradient-to-r ${getGradientClass()} p-[1.5px]`}>
                <div className="rounded-xl bg-slate-900/95 px-3 py-1.5">
                  <p className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    {current}
                  </p>
                </div>
              </div>

              {isElectron && (
                <div className="flex items-center gap-1 ml-1 rounded-xl bg-slate-900/90 border border-white/10 p-1 shadow-md">
                  <button
                    onClick={handleMinimize}
                    title="Minimize Window"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleMaximize}
                    title={isMaximized ? "Restore Window" : "Maximize Window"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleClose}
                    title="Exit FlowTrack"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="f7-segmented overflow-x-auto p-1 max-w-full flex-nowrap scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent gap-1 rounded-2xl bg-slate-950/70 border border-white/5 backdrop-blur-md">
          {links.map((link) => {
            const LinkIcon = link.Icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "f7-segmented-btn flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all select-none",
                    isActive
                      ? "active bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )
                }
              >
                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </motion.header>

      <main className="mx-auto w-full max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}
