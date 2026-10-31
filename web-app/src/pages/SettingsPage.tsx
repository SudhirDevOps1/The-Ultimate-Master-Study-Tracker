import { useRef, useState, useEffect } from "react";
import { APP_VERSION } from "@/config/version";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { FeedbackButton } from "@/components/common/FeedbackButton";
import { useAppStore } from "@/store/useAppStore";
import type { AppState } from "@/store/useAppStore";
import { usePomodoro } from "@/hooks/usePomodoro";
import { exportData, importBackup } from "@/utils/exportImport";
import { exportLocalDatabase, importLocalDatabase } from "@/utils/backupEngine";
import { LicensesModal } from "@/components/LicensesModal";
import { exportSessionsToCSV, exportSubjectStatsToCSV, exportAllDataToCSV } from "@/utils/dataExport";
import { db } from "@/lib/db";

import type { ThemeName } from "@/types/models";
import {
  Monitor,
  Palette,
  User,
  ShieldCheck,
  FileArchive,
  FileSpreadsheet,
  Clock,
  Cloud,
  BellRing,
  Timer,
  Laptop,
  Code2,
  AlertTriangle,
  Database,
  Copy,
  FolderOpen,
  Zap,
  LayoutGrid,
  Info,
  Flame,
  CheckCircle2,
  Check,
  RefreshCw,
  Bell,
  Volume2,
  Terminal,
  Cpu
} from "lucide-react";

function PomodoroSettingsPanel() {
  const pomodoro = usePomodoro();
  const { settings, saveSettings } = pomodoro;

  const [breakSettings, setBreakSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("flowtrack_break_settings");
      return saved ? JSON.parse(saved) : {
        eyeCare2020Enabled: true,
        continuousFocus50Enabled: true,
        postureStretch90Enabled: true,
        timeboxingStrict: true
      };
    } catch {
      return {
        eyeCare2020Enabled: true,
        continuousFocus50Enabled: true,
        postureStretch90Enabled: true,
        timeboxingStrict: true
      };
    }
  });

  const updateBreakSetting = (key: string, value: boolean) => {
    setBreakSettings((prev: any) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("flowtrack_break_settings", JSON.stringify(next));
      return next;
    });
  };

  const playSynthesizedChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  };

  const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <label className="block text-sm text-slate-300">Focus Minutes</label>
        <input
          type="number"
          min={5}
          max={90}
          value={settings.workMinutes}
          onChange={(e) => updateSetting('workMinutes', parseInt(e.target.value))}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm text-slate-300">Short Break Minutes</label>
        <input
          type="number"
          min={1}
          max={30}
          value={settings.shortBreakMinutes}
          onChange={(e) => updateSetting('shortBreakMinutes', parseInt(e.target.value))}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm text-slate-300">Long Break Minutes</label>
        <input
          type="number"
          min={5}
          max={45}
          value={settings.longBreakMinutes}
          onChange={(e) => updateSetting('longBreakMinutes', parseInt(e.target.value))}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm text-slate-300">Cycles Before Long Break</label>
        <input
          type="number"
          min={1}
          max={10}
          value={settings.cyclesBeforeLongBreak}
          onChange={(e) => updateSetting('cyclesBeforeLongBreak', parseInt(e.target.value))}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.autoStartBreaks}
            onChange={(e) => updateSetting('autoStartBreaks', e.target.checked)}
            className="h-4 w-4 rounded border-white/10 bg-slate-800"
          />
          Auto‑start breaks
        </label>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.autoStartWork}
            onChange={(e) => updateSetting('autoStartWork', e.target.checked)}
            className="h-4 w-4 rounded border-white/10 bg-slate-800"
          />
          Auto‑start focus
        </label>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.desktopNotifications}
            onChange={(e) => updateSetting('desktopNotifications', e.target.checked)}
            className="h-4 w-4 rounded border-white/10 bg-slate-800"
          />
          Desktop notifications
        </label>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => {
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
              Notification.requestPermission();
            }
          }}
          className="w-full rounded-2xl border border-white/15 px-4 py-3 text-white hover:bg-white/8"
        >
          Request Notification Permission
        </button>
      </div>

      {/* Super Productivity Ergonomics & 20-20-20 Synthesizer */}
      <div className="col-span-full pt-4 border-t border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <span>🧘 FlowTrack Ergonomic Rest & 20-20-20 Synthesizer</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Ergonomic eye-care rules, scheduled physical micro-stretches & harmonic audio chimes.
            </p>
          </div>
          <button
            type="button"
            onClick={playSynthesizedChime}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Preview the Web Audio API synthesized harmonic chime"
          >
            <span>🔔 Test Chime Sound</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10 cursor-pointer hover:border-emerald-500/30 transition-all">
            <input
              type="checkbox"
              checked={breakSettings.eyeCare2020Enabled}
              onChange={(e) => updateBreakSetting("eyeCare2020Enabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/10 bg-slate-800 text-emerald-500"
            />
            <div>
              <span className="font-semibold text-slate-200 block">20-20-20 Eye-Care Rest</span>
              <span className="text-[11px] text-slate-400">Every 20 min, relax ocular muscles by looking 20 feet away for 20 seconds.</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10 cursor-pointer hover:border-indigo-500/30 transition-all">
            <input
              type="checkbox"
              checked={breakSettings.continuousFocus50Enabled}
              onChange={(e) => updateBreakSetting("continuousFocus50Enabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/10 bg-slate-800 text-indigo-500"
            />
            <div>
              <span className="font-semibold text-slate-200 block">50m Continuous Focus Stretch</span>
              <span className="text-[11px] text-slate-400">Prompts ergonomic posture relief & hydration after 50 min unbroken focus.</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10 cursor-pointer hover:border-purple-500/30 transition-all">
            <input
              type="checkbox"
              checked={breakSettings.postureStretch90Enabled}
              onChange={(e) => updateBreakSetting("postureStretch90Enabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/10 bg-slate-800 text-purple-500"
            />
            <div>
              <span className="font-semibold text-slate-200 block">90m Posture & Walk Cycle</span>
              <span className="text-[11px] text-slate-400">Encourages standing desk transition or 5-minute physical walk.</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10 cursor-pointer hover:border-cyan-500/30 transition-all">
            <input
              type="checkbox"
              checked={breakSettings.timeboxingStrict}
              onChange={(e) => updateBreakSetting("timeboxingStrict", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/10 bg-slate-800 text-cyan-500"
            />
            <div>
              <span className="font-semibold text-slate-200 block">Strict Developer Timeboxing</span>
              <span className="text-[11px] text-slate-400">Forces structured block finishes to prevent hyper-focus burnout.</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

const themeOptions: { name: ThemeName; label: string; emoji: string; colors: string[] }[] = [
  { name: "default", label: "Default", emoji: "💜", colors: ["#6366f1", "#22d3ee", "#a78bfa"] },
  { name: "paper", label: "Paper White", emoji: "📜", colors: ["#fcfbf7", "#d97706", "#0f172a"] },
  { name: "tokyo", label: "Tokyo Night", emoji: "🏙️", colors: ["#7aa2f7", "#bb9af7", "#7dcfff"] },
  { name: "nordic", label: "Nordic Frost", emoji: "❄️", colors: ["#88c0d0", "#81a1c1", "#8fbcbb"] },
  { name: "dracula", label: "Dracula", emoji: "🧛", colors: ["#bd93f9", "#ff79c6", "#50fa7b"] },
  { name: "coffee", label: "Warm Sepia", emoji: "☕", colors: ["#d97706", "#b45309", "#f59e0b"] },
  { name: "oled", label: "OLED Black", emoji: "🖤", colors: ["#000000", "#38bdf8", "#a78bfa"] },
  { name: "ocean", label: "Ocean", emoji: "🌊", colors: ["#0ea5e9", "#06b6d4", "#38bdf8"] },
  { name: "forest", label: "Forest", emoji: "🌲", colors: ["#22c55e", "#84cc16", "#4ade80"] },
  { name: "sunset", label: "Sunset", emoji: "🌅", colors: ["#f97316", "#f43f5e", "#fb923c"] },
  { name: "galaxy", label: "Galaxy", emoji: "🌌", colors: ["#a855f7", "#ec4899", "#c084fc"] },
  { name: "neon", label: "Neon Night", emoji: "🧪", colors: ["#00ffc3", "#ff00e5", "#00d4ff"] },
];

export function SettingsPage() {
  const subjects = useAppStore((state: AppState) => state.subjects);
  const sessions = useAppStore((state: AppState) => state.sessions);
  const importAll = useAppStore((state: AppState) => state.importAll);
  const addManualEntry = useAppStore((state: AppState) => state.addManualEntry);
  const setDailyGoalHours = useAppStore((state: AppState) => state.setDailyGoalHours);
  const dailyGoalHours = useAppStore((state: AppState) => state.dailyGoalHours);
  const weeklyTargetHours = useAppStore((state: AppState) => state.weeklyTargetHours);
  const focusMusicEnabled = useAppStore((state: AppState) => state.focusMusicEnabled);
  const notificationsEnabled = useAppStore((state: AppState) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state: AppState) => state.setNotificationsEnabled);
  const keyboardShortcutsEnabled = useAppStore((state: AppState) => state.keyboardShortcutsEnabled);
  const strictFocusMode = useAppStore((state: AppState) => state.strictFocusMode);
  const setWeeklyTargetHours = useAppStore((state: AppState) => state.setWeeklyTargetHours);
  const setFocusMusicEnabled = useAppStore((state: AppState) => state.setFocusMusicEnabled);
  const setKeyboardShortcutsEnabled = useAppStore((state: AppState) => state.setKeyboardShortcutsEnabled);
  const setStrictFocusMode = useAppStore((state: AppState) => state.setStrictFocusMode);
  const autoPauseOnHidden = useAppStore((state: AppState) => state.autoPauseOnHidden);
  const setAutoPauseOnHidden = useAppStore((state: AppState) => state.setAutoPauseOnHidden);
  const theme = useAppStore((state: AppState) => state.theme);
  const setTheme = useAppStore((state: AppState) => state.setTheme);

  const profile = useAppStore((state: AppState) => state.profile);
  const setUserProfile = useAppStore((state: AppState) => state.setUserProfile);
  const autoCarryForward = useAppStore((state: AppState) => state.autoCarryForward);
  const setAutoCarryForward = useAppStore((state: AppState) => state.setAutoCarryForward);
  
  const user = useAppStore((state: AppState) => state.user);
  const cloudSyncStatus = useAppStore((state: AppState) => state.cloudSyncStatus);

  const backendUrl = useAppStore((state: AppState) => state.backendUrl);
  const setBackendUrl = useAppStore((state: AppState) => state.setBackendUrl);
  const isBackendConnected = useAppStore((state: AppState) => state.isBackendConnected);

  const [profileName, setProfileName] = useState(profile?.name ?? "");
  const [inputBackendUrl, setInputBackendUrl] = useState(backendUrl);

  useEffect(() => {
    setInputBackendUrl(backendUrl);
  }, [backendUrl]);
  const [profileAge, setProfileAge] = useState(profile?.age ?? "");
  const [profileProfession, setProfileProfession] = useState(profile?.profession ?? "");
  const [profileGoal, setProfileGoal] = useState(profile?.goal ?? "");

  const [manualHours, setManualHours] = useState(1);
  const [manualSubjectId, setManualSubjectId] = useState("");
  const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualTime, setManualTime] = useState("08:00");
  const [manualNotes, setManualNotes] = useState("Manual time entry");
  const [manualTags, setManualTags] = useState("manual");
  const [statusMessage, setStatusMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [showLicensesModal, setShowLicensesModal] = useState(false);
  const [backupPassInput, setBackupPassInput] = useState("");
  const [afkThreshold, setAfkThreshold] = useState<number>(() => {
    return Number(localStorage.getItem("flowtrack_afk_threshold")) || 120;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electron) {
      (window as any).electron.ipcRenderer?.invoke?.("get-desktop-settings")
        .then((res: any) => {
          if (res?.settings?.afkThresholdSeconds) {
            setAfkThreshold(res.settings.afkThresholdSeconds);
          }
        })
        .catch(() => {});
    }
  }, []);
  const [isExportingDb, setIsExportingDb] = useState(false);
  const [isImportingDb, setIsImportingDb] = useState(false);
  const fullBackupFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name || "");
      setProfileAge(profile.age || "");
      setProfileProfession(profile.profession || "");
      setProfileGoal(profile.goal || "");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    await setUserProfile({
      name: profileName.trim(),
      age: String(profileAge).trim(),
      profession: profileProfession.trim(),
      goal: profileGoal.trim(),
    });
    setStatusMessage("Profile updated successfully!");
  };

  const navigate = useNavigate();
  const showMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  type SettingsTab = "all" | "desktop" | "coding" | "theme" | "profile" | "data" | "cloud" | "pomodoro" | "danger";
  const [activeTab, setActiveTab] = useState<SettingsTab>("all");

  return (
    <div className="space-y-5">
      {/* 🧭 Professional Quick Category Navigation Bar */}
      <div className="sticky top-0 z-20 -mx-2 px-2 py-2.5 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-lg">
        {[
          { id: "all", label: "All Settings", icon: LayoutGrid },
          { id: "desktop", label: "Desktop Native", icon: Monitor },
          { id: "coding", label: "Coding & IDE Integration", icon: Code2 },
          { id: "theme", label: "Themes", icon: Palette },
          { id: "profile", label: "Study Profile", icon: User },
          { id: "pomodoro", label: "Pomodoro & Goals", icon: Timer },
          { id: "data", label: "Storage & Vault", icon: Database },
          { id: "cloud", label: "Cloud Sync", icon: Cloud },
          { id: "danger", label: "Danger Zone", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                  : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 🖥️ Desktop Native Controls & Floating HUD Panel */}
      {(activeTab === "all" || activeTab === "desktop") && (
      <Panel className="border-l-4 border-cyan-400 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Monitor className="w-5 h-5 text-cyan-400" /> Desktop Native App Controls
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Configure system tray behavior, window floating modes, and background launch options.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* AFK / Idle Detection Threshold */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <span>⏱️ AFK & Idle Detection Threshold</span>
              </label>
              <select
                value={afkThreshold}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  setAfkThreshold(val);
                  localStorage.setItem("flowtrack_afk_threshold", String(val));
                  if (typeof window !== "undefined" && (window as any).electron) {
                    await (window as any).electron.ipcRenderer?.invoke?.("save-desktop-settings", { afkThresholdSeconds: val });
                  }
                  showMessage(`⏱️ AFK Idle Threshold set to ${val}s (${val / 60}m)`);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
              >
                <option value={60}>60s (1 min)</option>
                <option value={120}>120s (2 mins - Default)</option>
                <option value={300}>300s (5 mins)</option>
                <option value={600}>600s (10 mins)</option>
              </select>
            </div>
            <p className="text-xs text-slate-400">
              System idle duration before the tracker marks you as away, saving active focus time accurately.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-white">
              <input
                type="checkbox"
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  if (typeof window !== "undefined" && (window as any).electron) {
                    (window as any).electron.ipcRenderer?.invoke?.("toggle-always-on-top", { flag: isChecked });
                  }
                  showMessage(isChecked ? "📌 Always-On-Top Floating Mode Enabled!" : "Always-On-Top Disabled.");
                }}
                className="h-5 w-5 rounded border-cyan-400 bg-slate-800 text-cyan-500 focus:ring-0"
              />
              📌 Always-On-Top Floating Mode
            </label>
            <p className="text-xs text-slate-400 pl-8">
              Keep FlowTrack window floating above VS Code, Zoom, or PDF lectures.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-white">
              <input
                type="checkbox"
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  if (typeof window !== "undefined" && (window as any).electron) {
                    (window as any).electron.ipcRenderer?.invoke?.("set-open-at-login", { openAtLogin: isChecked });
                  }
                  showMessage(isChecked ? "🚀 Windows Auto-Launch Enabled!" : "Windows Auto-Launch Disabled.");
                }}
                className="h-5 w-5 rounded border-cyan-400 bg-slate-800 text-cyan-500 focus:ring-0"
              />
              🚀 Launch on Windows Startup
            </label>
            <p className="text-xs text-slate-400 pl-8">
              Automatically start background tracker in System Tray when PC boots up.
            </p>
          </div>

          {/* Low-RAM Memory Trimmer */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" /> Low-RAM Memory Trimmer
              </span>
              <FeedbackButton
                variant="secondary"
                className="text-xs py-1 px-2.5"
                onClick={async () => {
                  if (typeof window !== "undefined" && (window as any).electron) {
                    await (window as any).electron.ipcRenderer?.invoke?.("purge-memory");
                  }
                  showMessage("RAM purged and V8 working set released!");
                }}
                successText="RAM Cleaned!"
              >
                🧹 Purge RAM Now
              </FeedbackButton>
            </div>
            <p className="text-xs text-slate-400">
              Immediately triggers V8 garbage collection and returns unused working set memory back to Windows.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-mono">⚡ Global System Hotkey: <kbd className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-white/10">Ctrl + Alt + P</kbd> (Pause / Resume Study Timer)</span>
          <button
            onClick={() => {
              if (typeof window !== "undefined" && (window as any).electron) {
                (window as any).electron.ipcRenderer?.invoke?.("send-windows-toast", {
                  title: "FlowTrack Pro Test Alert",
                  message: "Windows Native Balloon Toast Notifications are active!"
                });
                showMessage("Test Windows Toast sent to System Tray!");
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold hover:bg-cyan-500/30 transition-all"
          >
            🔔 Test Windows Toast
          </button>
        </div>

        {/* 🚀 New Update Checker Card */}
        <UpdateChecker showMessage={showMessage} />
      </Panel>
      )}

      {/* 💻 Editor & Coding Integration (Port 7777 WakaTime Engine) */}
      {(activeTab === "all" || activeTab === "coding") && (
        <Panel className="border-l-4 border-emerald-400 bg-slate-900/40 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-white">Editor & Coding Integration</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Port 7777 (FlowTrack IDE Pulse Engine)
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Local, privacy-first telemetry receiver on loopback (127.0.0.1:7777) for VS Code, VSCodium, Antigravity, Cursor, and JetBrains.
                </p>
              </div>
            </div>
            <FeedbackButton
              variant="secondary"
              className="text-xs"
              onClick={async () => {
                try {
                  const res = await (window as any).electron?.ipcRenderer?.invoke?.("heartbeat-status");
                  if (res && res.isRunning) {
                    showMessage(`✅ Local receiver running on port ${res.port}! Today: ${res.heartbeatsToday} heartbeats`);
                  } else {
                    showMessage("⚠️ Local receiver status: Run desktop app to view port 7777 live heartbeats.");
                  }
                } catch {
                  showMessage("⚠️ Heartbeat receiver status unavailable in web mode.");
                }
              }}
              successText="Receiver Checked!"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Check Receiver Status
            </FeedbackButton>
          </div>

          {/* 🔑 Important WakaTime VS Code Key Format Notice */}
          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-white">VS Code API Key Requirement:</p>
                <p className="text-[11px] text-cyan-200/90 leading-relaxed">
                  VS Code&apos;s official WakaTime extension requires a 36-character UUID format (e.g. <code className="px-1.5 py-0.5 rounded bg-black/50 text-cyan-300 font-mono font-bold select-all">00000000-0000-4000-8000-000000000000</code>). When prompted by VS Code for your API key, enter this UUID to satisfy extension validation!
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col gap-2.5 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans flex-wrap gap-2">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Configuration Snippet (<code className="text-cyan-300 font-mono">~/.wakatime.cfg</code>):
              </span>
              <div className="flex items-center gap-2">
                <FeedbackButton
                  variant="outline"
                  className="text-xs py-1 px-2.5"
                  onClick={() => {
                    navigator.clipboard.writeText("00000000-0000-4000-8000-000000000000");
                    showMessage("📋 UUID Key copied to clipboard!");
                  }}
                  successText="UUID Copied!"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy UUID Key
                </FeedbackButton>
                <FeedbackButton
                  variant="secondary"
                  className="text-xs py-1 px-2.5"
                  onClick={() => {
                    const cfg = `[settings]\napi_key = 00000000-0000-4000-8000-000000000000\napi_url = http://127.0.0.1:7777/api/v1\n`;
                    navigator.clipboard.writeText(cfg);
                    showMessage("📋 FlowTrack IDE config snippet copied to clipboard!");
                  }}
                  successText="Config Copied!"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Config
                </FeedbackButton>
              </div>
            </div>
            <pre className="text-[11px] text-cyan-200/90 overflow-x-auto select-all whitespace-pre font-mono leading-relaxed bg-black/50 p-3 rounded-lg border border-white/5 block">
{`[settings]
api_key = 00000000-0000-4000-8000-000000000000
api_url = http://127.0.0.1:7777/api/v1`}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <FeedbackButton
              variant="secondary"
              className="text-xs bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 font-bold"
              onClick={() => {
                navigate("/app-tracking?tab=developer");
              }}
              successText="Opening Dashboard..."
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" /> 📊 Open Developer Dashboard ↗
            </FeedbackButton>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 space-y-2">
            <p className="font-bold text-cyan-300 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              3-Step Editor Setup Guide:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
              <li>
                Install the free <strong className="text-white">WakaTime</strong> extension in VS Code, Cursor, Antigravity, or JetBrains (<code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 font-mono">Ctrl+Shift+X</code> &rarr; search &quot;WakaTime&quot;).
              </li>
              <li>
                When VS Code prompts for your <strong className="text-white">WakaTime API Key</strong>, enter the valid UUID <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 font-mono font-bold select-all">00000000-0000-4000-8000-000000000000</code>!
              </li>
              <li>
                Start typing code! Your programming languages, files, and project names will appear in real time under <strong className="text-white">App Tracking &gt; Developer</strong>.
              </li>
            </ol>
          </div>
        </Panel>
      )}

      {/* Theme Customization */}
      {(activeTab === "all" || activeTab === "theme") && (
      <Panel>
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-violet-400" /> Theme Customization
          </h3>
          <p className="mt-1 text-sm text-slate-400">Choose a color theme that matches your style.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {themeOptions.map((opt) => (
            <motion.button
              key={opt.name}
              onClick={() => setTheme(opt.name)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative rounded-2xl border-2 p-4 transition-all ${
                theme === opt.name
                  ? "border-white shadow-lg"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="mb-3 text-3xl">{opt.emoji}</div>
              <p className="font-medium text-white">{opt.label}</p>
              <div className="mt-2 flex justify-center gap-1">
                {opt.colors.map((color, i) => (
                  <div
                    key={i}
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {theme === opt.name && (
                <motion.div
                  layoutId="activeTheme"
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs"
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </Panel>
      )}

      {/* Profile Section */}
      {(activeTab === "all" || activeTab === "profile") && (
      <Panel className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
            <User className="w-5 h-5 text-indigo-400" /> Study Profile
          </h3>
          <p className="mt-1 text-sm text-slate-400">Personalize greetings and AI prompts based on your study journey.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Your Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
              placeholder="e.g. Aarav"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Age</label>
            <input
              type="text"
              value={profileAge}
              onChange={(e) => setProfileAge(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
              placeholder="e.g. 20"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">What do you do? (Profession/Exam)</label>
            <input
              type="text"
              value={profileProfession}
              onChange={(e) => setProfileProfession(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
              placeholder="e.g. JEE Aspirant / Web Developer"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Primary Goal</label>
            <input
              type="text"
              value={profileGoal}
              onChange={(e) => setProfileGoal(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
              placeholder="e.g. Crack JEE Mains / Get a React Job"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={autoCarryForward}
                onChange={(e) => setAutoCarryForward(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-slate-800"
              />
              🔄 Auto Carry-Forward subjects to next day
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  if (typeof window !== "undefined" && (window as any).electron) {
                    (window as any).electron.ipcRenderer?.invoke?.("toggle-always-on-top", { flag: isChecked });
                  }
                  showMessage(isChecked ? "📌 Always-On-Top Floating Mode Enabled!" : "Always-On-Top Floating Mode Disabled.");
                }}
                className="h-4 w-4 rounded border-cyan-400 bg-slate-800"
              />
              📌 Always-On-Top Floating Mode (Keep app on top of other windows)
            </label>
          </div>
          
          <FeedbackButton
            variant="primary"
            onClick={handleSaveProfile}
            successText="Profile Saved!"
          >
            <CheckCircle2 className="w-4 h-4" /> Save Profile
          </FeedbackButton>
        </div>
      </Panel>
      )}

      {/* Backup and Data Storage */}
      {(activeTab === "all" || activeTab === "data") && (
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Backup */}
        <Panel className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Encrypted Database Backup & Privacy Vault (Rule S10)
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Export an AES-256-GCM encrypted snapshot of all IndexedDB tables, flashcards, study sessions, and notes with PBKDF2 key derivation.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
            <input
              type="password"
              placeholder="Optional encryption password / passphrase..."
              value={backupPassInput}
              onChange={e => setBackupPassInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={async () => {
                setIsExportingDb(true);
                try {
                  const { blob, filename } = await exportLocalDatabase(backupPassInput);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                  showMessage(backupPassInput ? "Encrypted full backup exported successfully." : "Full database backup exported successfully.");
                } catch (err: any) {
                  showMessage("Export failed: " + (err?.message || "Unknown error"));
                } finally {
                  setIsExportingDb(false);
                }
              }}
              disabled={isExportingDb}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-xs font-bold text-slate-950 hover:brightness-110 transition-all shrink-0 disabled:opacity-50"
            >
              {isExportingDb ? "Exporting..." : "💾 Export Full Backup"}
            </button>

            <input
              ref={fullBackupFileRef}
              type="file"
              accept=".json,.enc.json"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsImportingDb(true);
                try {
                  const text = await file.text();
                  const res = await importLocalDatabase(text, backupPassInput);
                  showMessage(res.message);
                  setTimeout(() => window.location.reload(), 1500);
                } catch (err: any) {
                  showMessage("Restore failed: " + (err?.message || "Check your password or file integrity."));
                } finally {
                  setIsImportingDb(false);
                  if (fullBackupFileRef.current) fullBackupFileRef.current.value = "";
                }
              }}
            />
            <button
              onClick={() => fullBackupFileRef.current?.click()}
              disabled={isImportingDb}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-white transition-all shrink-0 disabled:opacity-50"
            >
              {isImportingDb ? "Restoring..." : "📥 Restore Full Backup"}
            </button>
          </div>

          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <FileArchive className="w-5 h-5 text-amber-400" /> Legacy JSON Backup
            </h3>
            <p className="mt-1 text-sm text-slate-400">Export or restore subjects, sessions, and settings in human-readable JSON.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                const settingsList = await db.settings.toArray();
                let backendActivities: any[] = [];
                try {
                  if (backendUrl && isBackendConnected) {
                    const ctrl = new AbortController();
                    setTimeout(() => ctrl.abort(), 2000);
                    const res = await fetch(`${backendUrl}/export?type=activities&format=json`, { signal: ctrl.signal });
                    if (res.ok) {
                      const data = await res.json();
                      backendActivities = data.activities || [];
                    }
                  }
                } catch {
                  console.warn("Backend offline — exporting without activity tracking data");
                }

                // Pack all Local Wellbeing & System App usage lists from localStorage
                const localWellbeingData: Record<string, any> = {};
                const allLocalStorageData: Record<string, string> = {};
                try {
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                      const val = localStorage.getItem(key) || "";
                      allLocalStorageData[key] = val;
                      
                      if (key.startsWith("wellbeing_usage_") || key.startsWith("app_activity_") || key === "app_block_rules") {
                        if (val) localWellbeingData[key] = JSON.parse(val);
                      }
                    }
                  }
                } catch (err) {
                  console.error("Error reading wellbeing data for backup", err);
                }

                exportData({
                  app: "FlowTrack",
                  exportedAt: new Date().toISOString(),
                  subjects,
                  sessions,
                  settings: settingsList,
                  activities: backendActivities,
                  wellbeingData: localWellbeingData,
                  localStorageData: allLocalStorageData
                } as any);
                showMessage("Backup exported successfully.");
              }}
              className="rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 font-medium text-white shadow-lg transition-transform hover:scale-105"
            >
              📤 Export JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void importBackup(file).then((payload: any) => {
                  void importAll(payload.subjects, payload.sessions, payload.settings, (payload as any).activities, (payload as any).tasks).then(() => {
                    // Restore Local Wellbeing, App Activity logs and App Blocking Rules (Legacy support in case localStorageData is missing)
                    if (payload.wellbeingData && !payload.localStorageData) {
                      try {
                        Object.entries(payload.wellbeingData).forEach(([key, value]) => {
                          localStorage.setItem(key, JSON.stringify(value));
                          if (key === "app_block_rules" && Array.isArray(value)) {
                            const win = window as any;
                            const ipc = win.electron?.ipcRenderer || (win.electron?.invoke ? win.electron : null);
                            if (ipc) {
                              void ipc.invoke("save-block-rules", { rules: value, globalEnabled: true });
                            }
                          }
                        });
                        window.dispatchEvent(new Event("app_block_rules_updated"));
                      } catch (err) {
                        console.error("Error importing wellbeing data", err);
                      }
                    }
                    showMessage("Backup imported successfully.");
                    if (fileRef.current) fileRef.current.value = "";
                  });
                });
              }}
            />
            <button onClick={() => fileRef.current?.click()} className="rounded-2xl border border-white/15 px-4 py-3 text-white transition-colors hover:bg-white/8">
              📥 Import JSON
            </button>
          </div>
        </Panel>

        {/* CSV Data Export */}
        <Panel className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-teal-400" /> CSV Export
            </h3>
            <p className="mt-1 text-sm text-slate-400">Export your study data as CSV files for backup or analysis.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                exportSessionsToCSV(sessions, subjects);
                showMessage("Sessions exported as CSV.");
              }}
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 font-medium text-white shadow-lg transition-transform hover:scale-105"
            >
              📝 Sessions CSV
            </button>
            <button
              onClick={() => {
                exportSubjectStatsToCSV(sessions, subjects);
                showMessage("Subject stats exported as CSV.");
              }}
              className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-medium text-white shadow-lg transition-transform hover:scale-105"
            >
              📈 Subject Stats CSV
            </button>
            <button
              onClick={() => {
                exportAllDataToCSV(sessions, subjects);
                showMessage("All data exported as CSV files.");
              }}
              className="rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 font-medium text-white shadow-lg transition-transform hover:scale-105"
            >
              📦 Export All CSV
            </button>
          </div>
        </Panel>

        {/* Manual Time Entry */}
        <Panel className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-sky-400" /> Manual Time Entry
            </h3>
            <p className="mt-1 text-sm text-slate-400">Add missed study time manually.</p>
          </div>
          <select value={manualSubjectId} onChange={(event) => setManualSubjectId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white">
            <option value="">Select Subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="number" min={0.25} step={0.25} value={manualHours} onChange={(event) => setManualHours(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" placeholder="Hours" />
            <input type="time" value={manualTime} onChange={(event) => setManualTime(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
          </div>
          <input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
          <input value={manualNotes} onChange={(event) => setManualNotes(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" placeholder="Notes" />
          <input value={manualTags} onChange={(event) => setManualTags(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" placeholder="Tags (comma separated)" />
          <button
            onClick={() => {
              if (!manualSubjectId || manualHours <= 0) {
                setStatusMessage("Please select a subject and enter a valid time.");
                return;
              }
              void addManualEntry({
                subjectId: manualSubjectId,
                date: `${manualDate}T${manualTime}:00`,
                hours: manualHours,
                notes: manualNotes,
                tags: manualTags
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              }).then(() => {
                setStatusMessage("Manual study time added successfully.");
                setManualHours(1);
                setManualNotes("Manual time entry");
                setManualTags("manual");
              });
            }}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 font-medium text-white shadow-lg transition-transform hover:scale-105"
          >
            ➕ Add Manual Time
          </button>
        </Panel>
      </div>
      )}

      {/* Goals and Notifications */}
      {(activeTab === "all" || activeTab === "pomodoro") && (
      <>
      <Panel className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-pink-400" /> Goals and Notifications
          </h3>
          <p className="mt-1 text-sm text-slate-400">Set your daily & weekly targets and enable productivity features.</p>
        {/* ── HARDWARE & SOUND LIVE VERIFICATION ── */}
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
          <span className="text-xs font-bold text-slate-300 mr-1">Live Diagnostics:</span>
          <FeedbackButton
            variant="outline"
            successText="🔔 Notification & Chime Sent!"
            onClick={async () => {
              if ("Notification" in window) {
                if (Notification.permission === "default") {
                  await Notification.requestPermission();
                }
                if (Notification.permission === "granted") {
                  new Notification("FlowTrack Pro Web", {
                    body: "🔔 Notifications and sound alerts are working perfectly!",
                    icon: "/icon.png"
                  });
                }
              }
            }}
          >
            🔔 Test Browser Notification
          </FeedbackButton>
        </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Daily Goal (hours)</label>
            <input
              id="goal"
              type="number"
              min={1}
              max={12}
              value={dailyGoalHours}
              onChange={(event) => setDailyGoalHours(Number(event.target.value))}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Weekly Target (hours)</label>
            <input
              type="number"
              min={1}
              max={80}
              value={weeklyTargetHours}
              onChange={(e) => setWeeklyTargetHours(Number(e.target.value))}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Productivity Tools</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={strictFocusMode}
                  onChange={(e) => setStrictFocusMode(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-slate-800"
                />
                🔒 Strict Focus
              </label>
              <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                Strict mode only counts verified active study time. Hidden or inactive periods stop contributing after a short grace window, while PiP heartbeat keeps intentional floating study valid.
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={focusMusicEnabled}
                  onChange={(e) => setFocusMusicEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-slate-800"
                />
                🎵 Focus Music
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={autoPauseOnHidden}
                  onChange={(e) => setAutoPauseOnHidden(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-slate-800"
                />
                ⏸️ Auto‑pause on Tab Hide
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Notifications & Shortcuts</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-slate-800"
                />
                🔔 Desktop Notifications
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={keyboardShortcutsEnabled}
                  onChange={(e) => setKeyboardShortcutsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-slate-800"
                />
                ⌨️ Keyboard Shortcuts
              </label>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => {
              if (typeof Notification !== "undefined" && Notification.permission === "default") {
                void Notification.requestPermission();
              }
            }}
            className="rounded-2xl border border-white/15 px-4 py-2 text-white transition-colors hover:bg-white/8"
          >
            🔔 Enable Notifications
          </button>
          <p className="text-sm text-slate-400">Request browser permission for session alerts.</p>
        </div>
        {statusMessage && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300"
          >
            ✅ {statusMessage}
          </motion.p>
        )}
      </Panel>

      {/* Pomodoro Settings */}
      <Panel className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
            <Timer className="w-5 h-5 text-rose-400" /> Pomodoro Settings
          </h3>
          <p className="mt-1 text-sm text-slate-400">Customize your focus and break intervals.</p>
        </div>
        <PomodoroSettingsPanel />
      </Panel>
      </>
      )}

      {/* App Info & Developer details */}
      {(activeTab === "all" || activeTab === "desktop" || activeTab === "profile") && (
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <Laptop className="w-5 h-5 text-indigo-400" /> FlowTrack Pro Desktop App
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              100% Offline & Native Electron Desktop Application. Your data stays 100% private on your machine.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/5 px-4 py-2 text-center">
              <p className="text-lg font-bold text-cyan-400">{sessions.length}</p>
              <p className="text-xs text-slate-400">Sessions</p>
            </div>
            <div className="rounded-xl bg-white/5 px-4 py-2 text-center">
              <p className="text-lg font-bold text-emerald-400">{subjects.length}</p>
              <p className="text-xs text-slate-400">Subjects</p>
            </div>
            <div className="rounded-xl bg-white/5 px-4 py-2 text-center">
              <p className="text-lg font-bold text-purple-400">v{APP_VERSION}</p>
              <p className="text-xs text-slate-400">Version</p>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-4 border-l-4 border-cyan-400 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-400" /> About Developer
              </h3>
              <p className="mt-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">Premium & Private Edition</p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker.git"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-200"
              >
                <span>⭐ View Repo</span>
              </a>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            FlowTrack Pro is developed by <strong className="text-white font-semibold">SudhirDevOps1</strong> with a strict privacy-first architecture. It features fully offline operations, enterprise-grade native tracking, and dual-layer hybrid inactivity engines.
          </p>
        </Panel>
      </div>
      )}

      {/* Danger Zone */}
      {(activeTab === "all" || activeTab === "danger") && (
      <Panel className="space-y-4 border border-red-500/20 bg-red-950/5">
        <div>
          <h3 className="text-xl font-semibold text-red-400 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400" /> Danger Zone
          </h3>
          <p className="mt-1 text-sm text-slate-400">Irreversible actions. Please be careful.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {typeof window !== "undefined" && (window as any).electron && (
            <button
              onClick={async () => {
                const confirmed = confirm("⚠️ Are you sure you want to clear ALL App & Website Activity Tracking logs?\n\nThis will permanently delete all activity log files stored on disk.");
                if (!confirmed) return;
                try {
                  const res = await (window as any).electron.ipcRenderer?.invoke("clear-activity-log");
                  if (res?.success) {
                    showMessage("App Tracking activity logs cleared successfully.");
                  } else {
                    showMessage("Failed to clear app tracking logs.");
                  }
                } catch {
                  showMessage("Error clearing app tracking logs.");
                }
              }}
              className="rounded-2xl bg-gradient-to-r from-amber-600 to-rose-600 px-5 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105"
            >
              🧹 Clear App Tracking Logs
            </button>
          )}
          <button
            onClick={async () => {
              const first = confirm("⚠️ Are you sure you want to delete ALL data? This includes all subjects, sessions, settings, and AI config. This action CANNOT be undone.");
              if (!first) return;
              const second = confirm("🛑 FINAL WARNING: Click OK to permanently erase everything and restart fresh.");
              if (!second) return;
              try {
                await db.subjects.clear();
                await db.sessions.clear();
                await db.settings.clear();
                showMessage("All data cleared! Reloading...");
                setTimeout(() => window.location.reload(), 1000);
              } catch (e) {
                showMessage("Failed to reset data. Try again.");
              }
            }}
            className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105"
          >
            🗑️ Reset All Data
          </button>
          <p className="text-xs text-slate-500">Deletes app tracking logs, subjects, sessions, settings, and reloads the app fresh.</p>
        </div>
      </Panel>
      )}
    </div>
  );
}

// ─── UpdateChecker Helper Component (electron-updater + GitHub Releases) ─────────
function UpdateChecker({ showMessage }: { showMessage: (msg: string) => void }) {
  const [currentVersion, setCurrentVersion] = useState("0.0.1");
  const [updateStatus, setUpdateStatus]     = useState<string>("idle"); // idle | checking | available | downloading | downloaded | error | not-available
  const [newVersion, setNewVersion]         = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [updateUrl, setUpdateUrl]           = useState("https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/releases");
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string | null>(null);

  const isElectron = typeof window !== "undefined" && !!(window as any).electron;

  const handleGitHubApiCheck = async () => {
    try {
      const res = await fetch("https://api.github.com/repos/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/releases/latest");
      if (res.ok) {
        const data = await res.json();
        const tag = (data.tag_name || "").replace(/^v/, "");
        setNewVersion(tag);
        if (data.html_url) setUpdateUrl(data.html_url);

        const asset = data.assets?.find((a: any) => a.name?.endsWith(".exe") || a.name?.endsWith(".AppImage"));
        if (asset?.browser_download_url) {
          setDirectDownloadUrl(asset.browser_download_url);
        }

        if (tag && tag !== currentVersion) {
          setUpdateStatus("available");
          showMessage(`🎁 New Update Available: v${tag}!`);
        } else {
          setUpdateStatus("not-available");
          showMessage("✅ FlowTrack is up to date.");
        }
      } else {
        setUpdateStatus("idle");
        showMessage("✅ FlowTrack is up to date.");
      }
    } catch {
      setUpdateStatus("idle");
      showMessage("❌ Network error checking updates.");
    }
  };

  useEffect(() => {
    if (!isElectron) return;
    const ipc = (window as any).electron.ipcRenderer;

    ipc.invoke("get-app-version").then((ver: string) => {
      if (ver) setCurrentVersion(ver);
    }).catch(() => {});

    // Listen to autoUpdater events from main process
    const removeListener = ipc.on?.("update-status-event", (_e: any, data: any) => {
      if (!data) return;
      setUpdateStatus(data.status);
      if (data.version) setNewVersion(data.version);
      if (data.percent !== undefined) setDownloadProgress(data.percent);

      if (data.status === "downloaded") {
        showMessage(`🎁 Update v${data.version || "new"} downloaded! Click Restart & Install to apply.`);
      } else if (data.status === "available") {
        showMessage(`🎁 New update v${data.version} found! Downloading in background...`);
      } else if (data.status === "not-available") {
        showMessage("✅ FlowTrack is up to date.");
      } else if (data.status === "error") {
        handleGitHubApiCheck();
      }
    });

    return () => {
      if (typeof removeListener === "function") removeListener();
    };
  }, [isElectron, showMessage, currentVersion]);

  const handleCheckUpdate = async () => {
    setUpdateStatus("checking");

    // Race timeout: If electron-updater hasn't responded within 4s, check GitHub releases directly
    const timer = setTimeout(() => {
      handleGitHubApiCheck();
    }, 4000);

    if (isElectron) {
      try {
        const res = await (window as any).electron.ipcRenderer.invoke("check-for-updates");
        if (!res?.success) {
          clearTimeout(timer);
          await handleGitHubApiCheck();
        }
      } catch {
        clearTimeout(timer);
        await handleGitHubApiCheck();
      }
    } else {
      clearTimeout(timer);
      await handleGitHubApiCheck();
    }
  };

  const handleRestartInstall = async () => {
    if (isElectron) {
      try {
        await (window as any).electron.ipcRenderer.invoke("restart-and-install-update");
      } catch {
        window.open(directDownloadUrl || updateUrl, "_blank");
      }
    } else {
      window.open(directDownloadUrl || updateUrl, "_blank");
    }
  };

  return (
    <div className="p-4 mt-2 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white uppercase text-[10px] tracking-wider bg-slate-800 border border-white/10 px-2 py-0.5 rounded-md">
            Version: v{currentVersion}
          </span>

          {updateStatus === "checking" && (
            <span className="animate-pulse bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md font-bold text-[10px]">
              🔄 Checking updates...
            </span>
          )}

          {updateStatus === "downloading" && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold text-[10px]">
              ⬇️ Downloading update ({downloadProgress}%)
            </span>
          )}

          {updateStatus === "downloaded" && (
            <span className="animate-bounce bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold text-[10px]">
              🎁 Ready to Install (v{newVersion || "latest"})
            </span>
          )}

          {updateStatus === "available" && (
            <span className="animate-pulse bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md font-bold text-[10px]">
              ✨ New Release v{newVersion} Available
            </span>
          )}

          {updateStatus === "not-available" && (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-medium text-[10px]">
              ✅ Up to date
            </span>
          )}
        </div>

        <p className="text-slate-400">
          {updateStatus === "downloaded"
            ? "New update has been downloaded in background! Click 'Restart & Install' to apply."
            : updateStatus === "downloading"
            ? `Downloading update package silently in background (${downloadProgress}%)...`
            : newVersion && newVersion !== currentVersion
            ? `New release v${newVersion} is available on GitHub with performance & feature upgrades.`
            : "Automatic update background service verifies releases directly with GitHub."}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {updateStatus === "downloaded" ? (
          <button
            onClick={handleRestartInstall}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:scale-105 transition-all shadow-lg text-xs cursor-pointer"
          >
            ⚡ Restart & Install Update
          </button>
        ) : (
          <>
            <button
              onClick={handleCheckUpdate}
              disabled={updateStatus === "checking" || updateStatus === "downloading"}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-slate-300 border border-white/10 font-semibold hover:bg-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-50 text-xs cursor-pointer"
            >
              {updateStatus === "checking" ? "⌛ Checking..." : "🔄 Check for Updates"}
            </button>

            {newVersion && newVersion !== currentVersion && (
              directDownloadUrl ? (
                <button
                  onClick={() => window.open(directDownloadUrl, "_blank")}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-all shadow-md text-xs cursor-pointer"
                >
                  ⚡ Download v{newVersion}
                </button>
              ) : (
                <button
                  onClick={() => window.open(updateUrl, "_blank")}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all shadow-md text-xs cursor-pointer"
                >
                  🌐 View Release
                </button>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
