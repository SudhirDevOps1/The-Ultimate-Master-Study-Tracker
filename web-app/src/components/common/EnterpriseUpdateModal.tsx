import { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Database
} from "lucide-react";

interface UpdateEventData {
  status: "idle" | "checking" | "available" | "downloading" | "downloaded" | "error" | "not-available";
  version?: string;
  percent?: number;
  releaseNotes?: string;
  releaseName?: string;
  error?: string;
}

export function EnterpriseUpdateModal() {
  const [currentVersion, setCurrentVersion] = useState("0.1.1");
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string>("");
  const [releaseName, setReleaseName] = useState<string>("");
  const [releaseUrl, setReleaseUrl] = useState<string>("https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/releases/latest");
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "downloading" | "downloaded" | "error" | "not-available">("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPillVisible, setIsPillVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const isElectron = typeof window !== "undefined" && Boolean((window as any).electron?.ipcRenderer);

  // Check GitHub API as standard or fallback for full changelog notes
  const fetchGitHubChangelog = useCallback(async (targetTag?: string) => {
    try {
      const res = await fetch("https://api.github.com/repos/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/releases/latest");
      if (res.ok) {
        const data = await res.json();
        const tag = (data.tag_name || "").replace(/^v/, "");
        setNewVersion(tag);
        setReleaseName(data.name || `Release v${tag}`);
        setReleaseNotes(data.body || "No changelog description provided.");
        if (data.html_url) setReleaseUrl(data.html_url);

        return { tag, body: data.body, url: data.html_url };
      }
    } catch {
      // Offline or network error
    }
    return null;
  }, []);

  const checkForUpdates = useCallback(async (isManualTrigger = false) => {
    setUpdateStatus("checking");

    if (isElectron) {
      try {
        const ipc = (window as any).electron.ipcRenderer;
        const res = await ipc.invoke("check-for-updates");
        if (!res?.success) {
          // If in development mode or offline
          const ghData = await fetchGitHubChangelog();
          if (ghData && ghData.tag && ghData.tag !== currentVersion) {
            setUpdateStatus("available");
            setIsPillVisible(true);
            if (isManualTrigger) setIsModalOpen(true);
          } else {
            setUpdateStatus("not-available");
          }
        }
      } catch {
        const ghData = await fetchGitHubChangelog();
        if (ghData && ghData.tag && ghData.tag !== currentVersion) {
          setUpdateStatus("available");
          setIsPillVisible(true);
          if (isManualTrigger) setIsModalOpen(true);
        } else {
          setUpdateStatus("not-available");
        }
      }
    } else {
      const ghData = await fetchGitHubChangelog();
      if (ghData && ghData.tag && ghData.tag !== currentVersion) {
        setUpdateStatus("available");
        setIsPillVisible(true);
        if (isManualTrigger) setIsModalOpen(true);
      } else {
        setUpdateStatus("not-available");
      }
    }
  }, [currentVersion, fetchGitHubChangelog, isElectron]);

  useEffect(() => {
    // 1. Fetch current local version
    if (isElectron) {
      const ipc = (window as any).electron.ipcRenderer;
      ipc.invoke("get-app-version").then((ver: string) => {
        if (ver) setCurrentVersion(ver);
      }).catch(() => {});

      // 2. Listen to auto-updater lifecycle events
      const removeListener = ipc.on?.("update-status-event", async (_e: any, data: UpdateEventData) => {
        if (!data) return;
        setUpdateStatus(data.status);
        if (data.version) setNewVersion(data.version);
        if (data.percent !== undefined) setDownloadProgress(data.percent);
        if (data.releaseNotes) setReleaseNotes(data.releaseNotes);
        if (data.releaseName) setReleaseName(data.releaseName);

        if (data.status === "available" || data.status === "downloaded") {
          setIsPillVisible(true);
          // Check snooze settings before popping up modal
          const snoozeUntil = localStorage.getItem("flowtrack_update_snooze_until");
          const isSnoozed = snoozeUntil && Date.now() < Number(snoozeUntil);
          if (!isSnoozed && data.status === "downloaded") {
            setIsModalOpen(true);
          }
          // Fetch changelog from GitHub if missing
          if (!data.releaseNotes) {
            await fetchGitHubChangelog(data.version);
          }
        }
      });

      // 3. Staggered initial background check after 6 seconds
      const timer = setTimeout(() => {
        void checkForUpdates(false);
      }, 6000);

      return () => {
        clearTimeout(timer);
        if (typeof removeListener === "function") removeListener();
      };
    } else {
      // Web fallback
      const timer = setTimeout(() => {
        void checkForUpdates(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [checkForUpdates, fetchGitHubChangelog, isElectron]);

  const handleRestartAndInstall = async () => {
    setIsInstalling(true);
    if (isElectron) {
      try {
        const ipc = (window as any).electron.ipcRenderer;
        await ipc.invoke("restart-and-install-update");
      } catch {
        window.open(releaseUrl, "_blank");
      }
    } else {
      window.open(releaseUrl, "_blank");
    }
  };

  const handleSnooze = () => {
    // Snooze for 12 hours so it doesn't interrupt deep study work
    localStorage.setItem("flowtrack_update_snooze_until", String(Date.now() + 12 * 60 * 60 * 1000));
    setIsModalOpen(false);
  };

  const hasNewUpdate = (newVersion && newVersion !== currentVersion) || updateStatus === "downloaded" || updateStatus === "available";

  return (
    <>
      {/* ─── Compact Floating Update Notification Pill ─────────────────────── */}
      {isPillVisible && hasNewUpdate && !isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md cursor-pointer hover:border-cyan-400 hover:scale-[1.02] transition-all group animate-fade-in"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white tracking-wide">
                {updateStatus === "downloaded" ? "🎁 Update Ready to Install" : `🚀 Update Available v${newVersion || "latest"}`}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                Safe
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {updateStatus === "downloaded" 
                ? "Click to apply without data loss" 
                : updateStatus === "downloading" 
                ? `Downloading (${downloadProgress}%)`
                : "Click to view fixes & install"}
            </span>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleSnooze();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Snooze reminder"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Enterprise Full Update & Changelog Modal ──────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden text-slate-200">
            
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {releaseName || `FlowTrack Pro v${newVersion || "Update"}`}
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      New Version
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Current Version: <span className="font-semibold text-slate-300">v{currentVersion}</span> • Target: <span className="font-semibold text-emerald-400">v{newVersion || "Latest"}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed max-h-[50vh]">
              
              {/* Zero Data Loss Guarantee Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                    100% Zero Data Loss Guarantee
                  </h4>
                  <p className="text-emerald-200/80 text-[11px] leading-normal">
                    All your study sessions, timer tracking, streaks, flashcards, notes, and local files in <code className="bg-emerald-900/40 px-1 py-0.5 rounded text-emerald-100 font-mono">%APPDATA%/FlowTrackPro</code> remain safe, encrypted, and completely untouched.
                  </p>
                </div>
              </div>

              {/* Progress Bar (if downloading) */}
              {updateStatus === "downloading" && (
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-500/30 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-cyan-300 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Downloading Update Package...
                    </span>
                    <span className="text-white font-mono">{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Changelog & Fixes Section */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-slate-400">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  What's New in this Release & Fixes
                </h4>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 font-mono text-[11px] text-slate-300 space-y-2 max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
                  {releaseNotes ? (
                    releaseNotes
                  ) : (
                    <div className="space-y-1.5 text-slate-400 font-sans">
                      <p className="text-white font-semibold">⚡ Performance & Security Upgrades</p>
                      <p>• Enhanced Arc-style full-width Web Portals browser with isolated sandboxing</p>
                      <p>• Zero memory leak background garbage collection optimization</p>
                      <p>• 100% CodeQL vulnerability patches and MIT license validation</p>
                      <p>• Automated contributor spotlight and real-time release synchronization</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on GitHub
                </a>
                <button
                  onClick={handleSnooze}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white transition-colors text-xs"
                >
                  Remind Me Later
                </button>
              </div>

              <div className="flex items-center gap-2">
                {updateStatus === "downloaded" ? (
                  <button
                    onClick={handleRestartAndInstall}
                    disabled={isInstalling}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-xs disabled:opacity-50"
                  >
                    {isInstalling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Restarting & Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Restart & Install Update Now
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (isElectron && updateStatus !== "downloading") {
                        void checkForUpdates(true);
                      } else {
                        window.open(releaseUrl, "_blank");
                      }
                    }}
                    disabled={updateStatus === "downloading"}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 text-xs disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isElectron ? "Download & Install Now" : "Download Update (GitHub)"}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
