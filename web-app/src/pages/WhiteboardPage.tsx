import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FabricWhiteboard } from "@/components/common/FabricWhiteboard";
import { Maximize2, Minimize2, PenTool, Sparkles, HelpCircle, ArrowLeft, Home } from "lucide-react";
import { Panel } from "@/components/common/Panel";

export function WhiteboardPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  // Escape key automatically exits fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <div
      className={`flex flex-col ${
        isFullscreen
          ? "fixed inset-0 z-50 p-0 bg-slate-950"
          : "h-[calc(100vh-4rem)] p-3 md:p-4 space-y-2.5"
      } bg-slate-950 text-slate-100 overflow-hidden select-none`}
    >
      {/* ─── Compact Top Header (Hidden in Fullscreen for Pure Workspace) ─── */}
      {!isFullscreen && (
        <Panel className="p-2.5 bg-slate-900/95 backdrop-blur border-slate-800 shadow-xl rounded-2xl shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate("/")}
                className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 transition flex items-center gap-1 text-xs font-semibold px-2.5"
                title="Return to FlowTrack Master Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <div className="h-4 w-px bg-slate-800" />

              <div className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-bold text-slate-100 flex items-center gap-2">
                  Infinite Study Whiteboard
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                    Excalidraw + draw.io Canvas
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 rounded-xl border transition text-slate-400 hover:text-white bg-slate-950 border border-slate-800"
                title="Full Screen Mode (Clean Space)"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* ─── Prominent Exit & Dashboard Pill in Fullscreen Mode ─── */}
      {isFullscreen && (
        <div className="fixed top-3 left-3 z-50 flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-2xl transition font-bold text-xs border border-purple-400/40"
            title="Exit Fullscreen (or press Escape)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Fullscreen</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-black/30 text-[10px] text-purple-200 font-mono">Esc</kbd>
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white shadow-2xl transition font-semibold text-xs border border-white/20 backdrop-blur-md"
            title="Return to Master Suite Dashboard"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dashboard</span>
          </button>
        </div>
      )}

      {/* ─── Main Whiteboard Engine Canvas ─── */}
      <div className={`relative flex-1 flex overflow-hidden ${isFullscreen ? "rounded-none border-0" : "rounded-2xl border border-slate-800"} bg-slate-950`}>
        <FabricWhiteboard
          storageKey="flowtrack_fabric_whiteboard_desktop_v1"
          onExitFullscreen={() => setIsFullscreen(false)}
        />
      </div>
    </div>
  );
}
