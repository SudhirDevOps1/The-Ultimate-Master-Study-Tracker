import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { useAppStore, type AppState } from "@/store/useAppStore";
import {
  LayoutDashboard,
  CalendarCheck,
  Timer,
  BookOpen,
  StickyNote,
  Monitor,
  Bot,
  Calendar,
  BarChart3,
  Trophy,
  History,
  HelpCircle,
  BookMarked,
  Settings
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/today", label: "Today's Tasks", icon: CalendarCheck },
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/study-workspace", label: "Study Workspace", icon: BookOpen },
  { to: "/notes-board", label: "Notes Board", icon: StickyNote },
  { to: "/app-tracking", label: "App Tracking", icon: Monitor },
  { to: "/ai", label: "AI Assistant", icon: Bot },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/history", label: "History", icon: History },
  { to: "/guide", label: "Guide", icon: HelpCircle },
  { to: "/subjects", label: "Subjects", icon: BookMarked },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const location = useLocation();
  const theme = useAppStore((state: AppState) => state.theme);
  const activeLink = links.find((link) => link.to === location.pathname) ?? links[0];
  const CurrentIcon = activeLink.icon;

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

  return (
    <div className="grid-bg min-h-screen px-4 py-4 md:px-8 md:py-6">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-5 flex w-full max-w-7xl flex-col gap-4"
      >
        <div className="glass rounded-3xl px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.03] active:scale-95 group">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-shadow duration-300 group-hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]">
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-950">
                    <svg className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" className="opacity-30 stroke-indigo-400" />
                      <path d="M12 6v6l4 2" className="stroke-cyan-300" />
                      <path d="M12 2a10 10 0 0 1 10 10" className="stroke-indigo-400" strokeDasharray="3 3" />
                      <path d="M8 22h8" className="stroke-indigo-500" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-2xl font-black tracking-tight text-white transition-colors group-hover:text-cyan-100">
                    Flow<span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Track</span>
                  </span>
                  <div className="flex items-center gap-1.5 mt-[-2px]">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Master Suite</span>
                  </div>
                </div>
              </Link>
              <h1 className="text-xl font-semibold text-white md:text-2xl">Smart Study Tracker</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
                Plan sessions, track actual study time accurately, and review progress with beautiful analytics.
              </p>
            </div>
            <div className={`soft-card rounded-2xl bg-gradient-to-r ${getGradientClass()} p-[2px]`}>
              <div className="rounded-2xl bg-slate-900/95 px-4 py-3 flex items-center gap-3">
                <CurrentIcon className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Current page</p>
                  <p className="mt-0.5 text-base font-medium text-white">{activeLink.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="glass pretty-scrollbar flex gap-2 overflow-x-auto rounded-2xl p-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? `bg-gradient-to-r ${getGradientClass()} text-white shadow-lg`
                      : "text-slate-200 hover:bg-white/8 hover:text-white"
                  )
                }
              >
                <Icon className="w-4 h-4 opacity-80" />
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
