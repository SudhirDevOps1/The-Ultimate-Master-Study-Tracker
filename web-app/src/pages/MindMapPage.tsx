import { useEffect, useRef, useState, useCallback } from "react";
import { Download, Upload, Library, Trash2, Save, FolderOpen, FileJson } from "lucide-react";
import { useToast } from "@/components/common/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type ExcalidrawElement = Record<string, unknown>;
type AppState = Record<string, unknown>;
type BinaryFiles = Record<string, unknown>;

interface ExcalidrawAPI {
  updateScene: (opts: { elements?: ExcalidrawElement[]; appState?: Partial<AppState>; collaborators?: Map<string, unknown> }) => void;
  resetScene: () => void;
  getSceneElements: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  exportToBlob: (opts?: { mimeType?: string; quality?: number; exportPadding?: number }) => Promise<Blob>;
  exportToSvg: (opts?: Record<string, unknown>) => Promise<SVGSVGElement>;
  setActiveTool: (tool: { type: string }) => void;
  scrollToContent: (elements?: ExcalidrawElement[], opts?: { fitToContent?: boolean; animate?: boolean }) => void;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const STORAGE_KEY       = "flowtrack_excalidraw_scene_v1";
const LIBRARY_KEY       = "flowtrack_excalidraw_library_v1";

function loadScene(): { elements: ExcalidrawElement[]; files: BinaryFiles } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { elements: [], files: {} };
}

function saveScene(elements: ExcalidrawElement[], files: BinaryFiles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements, files }));
  } catch { /* ignore */ }
}

function loadLibrary(): unknown[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveLibrary(items: unknown[]) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MindMapPage() {
  const [ExcalidrawComp, setExcalidrawComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null);
  const initialScene = useRef(loadScene());
  const initialLibrary = useRef(loadLibrary());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();

  // ── Lazy load Excalidraw (large package) ──────────────────────────────────
  useEffect(() => {
    import("@excalidraw/excalidraw")
      .then((mod) => {
        const Comp = (mod as any).Excalidraw || (mod as any).default?.Excalidraw || (mod as any).default;
        if (!Comp) throw new Error("Excalidraw component not found in module");
        setExcalidrawComp(() => Comp);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Excalidraw:", err);
        setLoadError(err?.message || "Unknown error loading Excalidraw");
        setIsLoading(false);
      });
  }, []);

  // ── Auto-save on change ───────────────────────────────────────────────────
  const handleChange = useCallback((elements: ExcalidrawElement[], _appState: AppState, files: BinaryFiles) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveScene(elements as ExcalidrawElement[], files as BinaryFiles);
    }, 800);
  }, []);

  // ── Library persistence ───────────────────────────────────────────────────
  const handleLibraryChange = useCallback((items: unknown[]) => {
    saveLibrary(items);
  }, []);

  // ── Export as PNG ─────────────────────────────────────────────────────────
  const handleExportPNG = async () => {
    const api = excalidrawAPIRef.current;
    if (!api) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: api.getSceneElements() as any,
        appState: { ...(api.getAppState() as any), exportWithDarkMode: true },
        files: {} as any,
        mimeType: "image/png",
        exportPadding: 20,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `mindmap-${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
      showToast("📥 PNG exported!", "success");
    } catch (e: any) {
      showToast(`❌ Export failed: ${e.message}`, "error");
    }
  };

  // ── Export as SVG ─────────────────────────────────────────────────────────
  const handleExportSVG = async () => {
    const api = excalidrawAPIRef.current;
    if (!api) return;
    try {
      const { exportToSvg } = await import("@excalidraw/excalidraw");
      const svg = await exportToSvg({
        elements: api.getSceneElements() as any,
        appState: { ...(api.getAppState() as any), exportWithDarkMode: true },
        files: {} as any,
      });
      const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `mindmap-${Date.now()}.svg`; a.click();
      URL.revokeObjectURL(url);
      showToast("📥 SVG exported!", "success");
    } catch (e: any) {
      showToast(`❌ SVG export failed: ${e.message}`, "error");
    }
  };

  // ── Save as .excalidraw file ──────────────────────────────────────────────
  const handleSaveFile = () => {
    const api = excalidrawAPIRef.current;
    if (!api) return;
    const data = {
      type: "excalidraw",
      version: 2,
      source: "FlowTrack Pro",
      elements: api.getSceneElements(),
      appState: {
        gridSize: null,
        viewBackgroundColor: "#1e1e2e",
      },
      files: {},
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mindmap-${Date.now()}.excalidraw`; a.click();
    URL.revokeObjectURL(url);
    showToast("💾 Saved as .excalidraw file!", "success");
  };

  // ── Load .excalidraw file ─────────────────────────────────────────────────
  const handleLoadFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".excalidraw,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const api = excalidrawAPIRef.current;
        if (api && data.elements) {
          api.updateScene({ elements: data.elements });
          showToast(`✅ Loaded: ${file.name}`, "success");
        } else {
          showToast("❌ Invalid .excalidraw file format", "error");
        }
      } catch (e: any) {
        showToast(`❌ Failed to load file: ${e.message}`, "error");
      }
    };
    input.click();
  };

  // ── Import Excalidraw Library (.excalidrawlib) ────────────────────────────
  const handleImportLibrary = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".excalidrawlib,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.libraryItems || data.library) {
          const items = data.libraryItems || data.library;
          saveLibrary(items);
          
          const api = excalidrawAPIRef.current;
          if (api && (api as any).importLibrary) {
            await (api as any).importLibrary(items, "merge");
            showToast(`✅ Library imported: ${items.length} items added!`, "success");
          } else {
            showToast(`✅ Library saved. Reload to apply.`, "success");
          }
        } else {
          showToast("❌ Invalid library file format", "error");
        }
      } catch (e: any) {
        showToast(`❌ Library import failed: ${e.message}`, "error");
      }
    };
    input.click();
  };

  // ── Clear canvas ─────────────────────────────────────────────────────────
  const handleClear = () => {
    excalidrawAPIRef.current?.resetScene();
    saveScene([], {});
    showToast("🗑️ Canvas cleared.", "info");
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Open Excalidraw Library website ──────────────────────────────────────
  const handleOpenLibrary = () => {
    const url = "https://libraries.excalidraw.com/?theme=dark";
    if ((window as any).electron?.shell) {
      (window as any).electron.shell.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className={`flex flex-col gap-0 transition-all duration-300 ${
      isFullscreen 
        ? "fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 p-0 m-0" 
        : "h-[calc(100vh-110px)] -mx-4 -mt-2"
    }`}>

      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-900/80 border-b border-white/5 backdrop-blur-sm shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-white flex items-center gap-1.5">
            🧠 <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Mind Map Whiteboard</span>
          </span>
          <span className="text-[9px] text-slate-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full font-mono ml-1">Excalidraw</span>
          
          <button 
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
            }}
            className={`ml-2 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
              isFullscreen 
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30" 
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
            }`}
          >
            {isFullscreen ? "Exit Full Screen" : "📺 Maximize / Full Screen"}
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={handleOpenLibrary} title="Browse Excalidraw Libraries"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-[11px] font-semibold transition-all">
            <Library className="w-3 h-3" /> Libraries
          </button>
          <button onClick={handleImportLibrary} title="Import .excalidrawlib file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[11px] font-semibold transition-all">
            <Upload className="w-3 h-3" /> Import Lib
          </button>

          <div className="w-px h-4 bg-white/10" />

          <button onClick={handleLoadFile} title="Open .excalidraw file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[11px] font-semibold transition-all">
            <FolderOpen className="w-3 h-3" /> Open
          </button>
          <button onClick={handleSaveFile} title="Save as .excalidraw"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[11px] font-semibold transition-all">
            <Save className="w-3 h-3" /> Save
          </button>

          <div className="w-px h-4 bg-white/10" />

          <button onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 text-[11px] font-semibold transition-all">
            <Download className="w-3 h-3" /> PNG
          </button>
          <button onClick={handleExportSVG}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 text-[11px] font-semibold transition-all">
            <FileJson className="w-3 h-3" /> SVG
          </button>

          <div className="w-px h-4 bg-white/10" />

          <button onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-[11px] font-semibold transition-all">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400 font-semibold">Loading Whiteboard...</p>
              <p className="text-xs text-slate-600">Initializing Excalidraw engine</p>
            </div>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 p-8">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-white font-bold text-lg">Failed to load Whiteboard</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{loadError}</p>
              <button onClick={() => window.location.reload()}
                className="px-4 py-2 bg-cyan-500 text-slate-950 rounded-xl font-bold text-sm hover:bg-cyan-400 transition-colors">
                Retry
              </button>
            </div>
          </div>
        )}

        {ExcalidrawComp && (
          <ExcalidrawComp
            excalidrawAPI={(api: ExcalidrawAPI) => { excalidrawAPIRef.current = api; }}
            initialData={{
              elements: initialScene.current.elements,
              files: initialScene.current.files,
              scrollToContent: true,
              libraryItems: initialLibrary.current,
            }}
            onChange={handleChange as any}
            onLibraryChange={handleLibraryChange as any}
            theme="dark"
            langCode="en"
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveAsImage: false,
                saveToActiveFile: false,
                export: { saveFileToDisk: false },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
