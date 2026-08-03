import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useTimer } from "@/hooks/useTimer";
import { useAppStore } from "@/store/useAppStore";
import { formatSeconds } from "@/utils/time";
import { Maximize2, X, MonitorSmartphone } from "lucide-react";
import { format } from "date-fns";

export const PipOverlayWidget: React.FC = () => {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const { activeSession, remainingSeconds, elapsedSeconds, progress } = useTimer();
  const subjects = useAppStore((state) => state.subjects);

  const activeSubjectName =
    subjects.find((s) => s.id === activeSession?.subjectId)?.name ||
    (activeSession as any)?.title ||
    (activeSession as any)?.subjectName ||
    "Focus Session";

  const [liveTimeStr, setLiveTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => setLiveTimeStr(format(new Date(), "EEE, MMM d, hh:mm:ss a"));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
      } catch (e) {}
    });

    targetDoc.body.style.backgroundColor = "#0f172a";
    targetDoc.body.style.margin = "0";
    targetDoc.body.style.overflow = "hidden";
    targetDoc.body.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
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
          width: 360,
          height: 220,
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

  // Clean, Pixel-Perfect Widget Content matching user's exact specification
  const widgetContent = (
    <div className="relative h-full w-full p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white flex flex-col justify-between select-none overflow-hidden border border-white/10 rounded-xl box-border group">
      {/* Chrome Native-like Hover Titlebar Overlay */}
      <div 
        className="absolute top-0 left-0 right-0 h-9 bg-black/80 flex items-center justify-between px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 rounded-t-xl"
        style={{ WebkitAppRegion: "drag" } as any}
      >
        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
          <MonitorSmartphone size={12} className="text-slate-400" />
          <span>flowtrack-desktop</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && (window as any).electron) {
                (window as any).electron.ipcRenderer?.send("focus-main-window");
              }
            }}
            className="text-slate-300 hover:text-white transition-colors hidden electron-only:block"
            style={{ WebkitAppRegion: "no-drag" } as any}
            title="Back to tab"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined" && (window as any).electron) {
                (window as any).electron.ipcRenderer?.invoke?.("open-pip-window", { action: "close" });
              } else if (pipWindow) {
                pipWindow.close();
              }
            }}
            className="text-slate-300 hover:text-white transition-colors"
            style={{ WebkitAppRegion: "no-drag" } as any}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Top Header: Brand */}
      <div className="flex justify-between items-start pt-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="text-[11px] tracking-[0.18em] uppercase text-indigo-300 font-bold">
            FLOWTRACK
          </div>
          <div className="text-xl font-bold mt-1 text-white truncate">
            {activeSubjectName}
          </div>
        </div>
      </div>

      {/* Main Content: Live Ticking Elapsed Timer & Progress Bar */}
      <div className="flex flex-col justify-end flex-1">
        <div className="text-xs text-indigo-200/80 font-medium mb-1 truncate tracking-wide">
          {liveTimeStr}
        </div>
        <div className="text-4xl font-extrabold leading-none text-white font-mono">
          {formatSeconds(elapsedSeconds)}
        </div>
        <div className="flex justify-between items-end mt-1">
          <div className="text-xs text-slate-300">
            Remaining {formatSeconds(remainingSeconds)}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {Math.round(progress)}%
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all duration-300 rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
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
          pipWindow
            ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse"
            : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25 hover:border-cyan-400/50"
        }`}
        title="Open Picture-in-Picture (PiP) Floating Widget"
      >
        <Maximize2 className="w-4 h-4" />
        <span>📺 {pipWindow ? "PiP Floating Active" : "PiP Mode"}</span>
      </button>

      {/* Render into Document PiP Window via React Portal */}
      {pipWindow && ReactDOM.createPortal(widgetContent, pipWindow.document.body)}
    </>
  );
};
