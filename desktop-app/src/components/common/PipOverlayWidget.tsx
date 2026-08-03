import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useTimer } from "@/hooks/useTimer";
import { useAppStore } from "@/store/useAppStore";
import { formatSeconds } from "@/utils/time";
import { Play, Pause, Square, Shield, Maximize2, X } from "lucide-react";

export const PipOverlayWidget: React.FC = () => {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isElectronPipActive, setIsElectronPipActive] = useState(false);

  const { activeSession, remainingSeconds, elapsedSeconds } = useTimer();
  const timer = useAppStore((state) => state.timer);
  const subjects = useAppStore((state) => state.subjects);
  const startSession = useAppStore((state) => state.startSession);
  const pauseSession = useAppStore((state) => state.pauseSession);
  const stopSession = useAppStore((state) => state.stopSession);

  const activeSubjectName = subjects.find((s) => s.id === activeSession?.subjectId)?.name || "Study Focus";

  // Helper to copy stylesheets to PiP Window so Tailwind/CSS styles render 100% properly
  const copyStyles = (targetDoc: Document) => {
    Array.from(document.styleSheets).forEach((styleSheet) => {
      try {
        if (styleSheet.cssRules) {
          const newStyle = targetDoc.createElement("style");
          Array.from(styleSheet.cssRules).forEach((rule) => {
            newStyle.appendChild(targetDoc.createTextNode(rule.cssText));
          });
          targetDoc.head.appendChild(newStyle);
        } else if (styleSheet.href) {
          const newLink = targetDoc.createElement("link");
          newLink.rel = "stylesheet";
          newLink.href = styleSheet.href;
          targetDoc.head.appendChild(newLink);
        }
      } catch (e) {
        // Handle cross-origin link tags
      }
    });

    // Add inline background color so PiP window has dark theme
    targetDoc.body.style.backgroundColor = "#020617";
    targetDoc.body.style.margin = "0";
    targetDoc.body.style.overflow = "hidden";
    targetDoc.body.style.fontFamily = "system-ui, -apple-system, sans-serif";
  };

  const toggleDocumentPip = async () => {
    // 1. If running inside Electron Desktop App: Open SEPARATE floating PiP BrowserWindow!
    if (typeof window !== "undefined" && (window as any).electron) {
      useAppStore.getState().setIsPipActive(true);
      (window as any).electron.ipcRenderer?.invoke?.("open-pip-window");
      return;
    }

    // 2. If running in Web Browser: Use Document Picture-in-Picture API (Chrome 116+)
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    if ("documentPictureInPicture" in window) {
      try {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({
          width: 380,
          height: 540,
        });

        copyStyles(pipWin.document);

        pipWin.addEventListener("pagehide", () => {
          setPipWindow(null);
        });

        setPipWindow(pipWin);
      } catch (err) {
        console.error("Document PiP request error:", err);
      }
    } else {
      alert("Document Picture-in-Picture API is supported in Chrome 116+ or FlowTrack Desktop App!");
    }
  };

  const isRunning = !!timer.activeSessionId && !timer.isPaused;

  // The actual Compact PIP Widget Content
  const widgetContent = (
    <div className="h-full w-full bg-slate-950 text-white p-5 flex flex-col justify-between border-2 border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-cyan-400">
            FlowTrack PiP Focus
          </span>
        </div>
        {pipWindow && (
          <button
            onClick={() => pipWindow.close()}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Close PiP Floating Widget"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Focus Shield Status */}
      <div className="my-auto text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
          <Shield className="w-3.5 h-3.5" />
          <span>{activeSubjectName}</span>
        </div>

        {/* Large Timer Display */}
        <div className="text-5xl font-black tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
          {activeSession ? formatSeconds(remainingSeconds > 0 ? remainingSeconds : elapsedSeconds) : "00:00"}
        </div>

        {activeSession?.notes && (
          <p className="text-xs text-slate-400 font-medium truncate max-w-[280px] mx-auto">
            Note: <span className="text-slate-200">{activeSession.notes}</span>
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-center gap-3">
          {!isRunning ? (
            <button
              onClick={() => activeSession && startSession(activeSession.id)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START</span>
            </button>
          ) : (
            <button
              onClick={pauseSession}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE</span>
            </button>
          )}

          {activeSession && (
            <button
              onClick={() => void stopSession()}
              className="py-2.5 px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center hover:bg-rose-500/30 transition-all"
              title="Stop Session"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Top Navbar Trigger Button */}
      <button
        onClick={toggleDocumentPip}
        className={`flex items-center justify-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold transition-all duration-200 active:scale-95 border ${
          pipWindow || isElectronPipActive
            ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse"
            : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25 hover:border-cyan-400/50"
        }`}
        title="Open Picture-in-Picture (PiP) Floating Widget over VS Code, Zoom & Lectures"
      >
        <Maximize2 className="w-4 h-4" />
        <span>📺 {pipWindow || isElectronPipActive ? "PiP Floating Active" : "PiP Mode"}</span>
      </button>

      {/* Render into Document PiP Window via React Portal */}
      {pipWindow && ReactDOM.createPortal(widgetContent, pipWindow.document.body)}
    </>
  );
};
