import { useRef, useState, useEffect } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { useAppStore } from "@/store/useAppStore";
import type { AppState } from "@/store/useAppStore";
import { usePomodoro } from "@/hooks/usePomodoro";
import { exportData, importBackup } from "@/utils/exportImport";
import { exportSessionsToCSV, exportSubjectStatsToCSV, exportAllDataToCSV } from "@/utils/dataExport";
import { db } from "@/lib/db";

import type { ThemeName } from "@/types/models";

function PomodoroSettingsPanel() {
  const pomodoro = usePomodoro();
  const { settings, saveSettings } = pomodoro;

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
    </div>
  );
}

const themeOptions: { name: ThemeName; label: string; emoji: string; colors: string[] }[] = [
  { name: "default", label: "Default", emoji: "💜", colors: ["#6366f1", "#22d3ee", "#a78bfa"] },
  { name: "ocean", label: "Ocean", emoji: "🌊", colors: ["#0ea5e9", "#06b6d4", "#38bdf8"] },
  { name: "forest", label: "Forest", emoji: "🌲", colors: ["#22c55e", "#84cc16", "#4ade80"] },
  { name: "sunset", label: "Sunset", emoji: "🌅", colors: ["#f97316", "#f43f5e", "#fb923c"] },
  { name: "galaxy", label: "Galaxy", emoji: "🌌", colors: ["#a855f7", "#ec4899", "#c084fc"] },
  { name: "neon", label: "Neon Night", emoji: "🧪", colors: ["#00ffc3", "#ff00e5", "#00d4ff"] } as const,
  { name: "paper", label: "Paper White", emoji: "📄", colors: ["#fefefe", "#e2e8f0", "#94a3b8"] } as const,
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
      age: profileAge.trim(),
      profession: profileProfession.trim(),
      goal: profileGoal.trim(),
    });
    setStatusMessage("Profile updated successfully!");
  };

  const showMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Theme Customization */}
      <Panel>
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white">🎨 Theme Customization</h3>
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

      {/* Profile Section */}
      <Panel className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white">👤 Study Profile</h3>
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
          
          <button
            onClick={handleSaveProfile}
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 font-bold text-slate-950 shadow-lg hover:scale-105 transition-transform"
          >
            💾 Save Profile
          </button>
        </div>
      </Panel>

      {/* Cloud Sync & Guest Mode */}
      <Panel className="space-y-4 border-l-4 border-indigo-500 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">☁️ Cloud Sync</h3>
          <p className="mt-1 text-sm text-slate-400">You are currently in {user ? "Cloud Mode" : "Guest Mode"}. {user ? "Data is synced across devices safely." : "Data is stored strictly offline on this browser."}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${user ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
            <span className="text-sm font-semibold text-slate-300">
              {user ? `Logged in as ${user.email || user.uid}` : "Guest Mode (Offline Only)"}
            </span>
          </div>
          {!user ? (
            <button
              onClick={() => showMessage("Please configure Firebase API keys in environment variables and uncomment the Auth logic to enable Cloud Sync.")}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 font-bold text-white shadow-lg hover:scale-105 transition-transform"
            >
              Sign In to Sync
            </button>
          ) : (
            <button
              onClick={() => showMessage("Logout functionality to be implemented with Firebase Auth.")}
              className="rounded-2xl border border-white/20 bg-slate-800 px-6 py-2.5 font-bold text-white shadow-lg hover:bg-slate-700 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
        {user && (
          <div className="text-xs text-slate-400 mt-2">
            Status: <span className="font-mono text-cyan-400">{cloudSyncStatus}</span>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Backup */}
        <Panel className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-white">💾 Backup</h3>
            <p className="mt-1 text-sm text-slate-400">Export or restore all subjects, sessions, and local settings.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                const settingsList = await db.settings.toArray();
                let backendActivities: any[] = [];
                try {
                  if (backendUrl) {
                    const res = await fetch(`${backendUrl}/export?type=activities&format=json`);
                    if (res.ok) {
                      const data = await res.json();
                      backendActivities = data.activities || [];
                    }
                  }
                } catch (e) {
                  console.warn("Backend offline or unreachable, exporting without backend activities", e);
                }

                // Pack all Local Wellbeing & System App usage lists from localStorage
                const localWellbeingData: Record<string, any> = {};
                try {
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith("wellbeing_usage_") || key.startsWith("app_activity_") || key === "app_block_rules")) {
                      const val = localStorage.getItem(key);
                      if (val) localWellbeingData[key] = JSON.parse(val);
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
                  wellbeingData: localWellbeingData
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
                  void importAll(payload.subjects, payload.sessions, payload.settings, (payload as any).activities).then(() => {
                    // Restore Local Wellbeing, App Activity logs and App Blocking Rules
                    if (payload.wellbeingData) {
                      try {
                        Object.entries(payload.wellbeingData).forEach(([key, value]) => {
                          localStorage.setItem(key, JSON.stringify(value));
                        });
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
            <h3 className="text-xl font-semibold text-white">📊 CSV Export</h3>
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
            <h3 className="text-xl font-semibold text-white">✏️ Manual Time Entry</h3>
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

      {/* Goals and Notifications */}
      <Panel className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white">🎯 Goals and Notifications</h3>
          <p className="mt-1 text-sm text-slate-400">Set your daily & weekly targets and enable productivity features.</p>
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
          <h3 className="text-xl font-semibold text-white">🍅 Pomodoro Settings</h3>
          <p className="mt-1 text-sm text-slate-400">Customize your focus and break intervals.</p>
        </div>
        <PomodoroSettingsPanel />
      </Panel>

      {/* App Info & Developer details */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-white">📱 FlowTrack Pro Desktop App</h3>
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
              <p className="text-lg font-bold text-purple-400">v2.0.0</p>
              <p className="text-xs text-slate-400">Version</p>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-4 border-l-4 border-cyan-400 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">👨‍💻 About Developer</h3>
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
            FlowTrack Pro is developed by <strong className="text-white font-semibold">SudhirDevOps1</strong> with a strict privacy-first architecture. It features fully offline operations, ActivityWatch-grade native tracking, and dual-layer hybrid inactivity engines.
          </p>
        </Panel>
      </div>

      {/* Danger Zone */}
      <Panel className="space-y-4 border border-red-500/20 bg-red-950/5">
        <div>
          <h3 className="text-xl font-semibold text-red-400">⚠️ Danger Zone</h3>
          <p className="mt-1 text-sm text-slate-400">Irreversible actions. Please be careful.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <p className="text-xs text-slate-500">Deletes all subjects, sessions, settings, and reloads the app fresh.</p>
        </div>
      </Panel>
    </div>
  );
}
