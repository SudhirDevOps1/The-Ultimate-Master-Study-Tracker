import { useEffect, useRef, useState, useCallback } from "react";
import { Download, Upload, Library, Trash2, Save, FolderOpen, FileJson, Sparkles, RefreshCw, Layers } from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { Panel } from "@/components/common/Panel";

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

// ─── Native Canvas Fallback Types ─────────────────────────────────────────────
interface NativeNode {
  id: string;
  type: "rectangle" | "circle" | "text" | "draw";
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  color: string;
  fillColor?: string;
  points?: { x: number; y: number }[];
}

interface NativeConnection {
  fromId: string;
  toId: string;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "flowtrack_excalidraw_scene_v1";
const LIBRARY_KEY = "flowtrack_excalidraw_library_v1";
const NATIVE_STORAGE_KEY = "flowtrack_native_mindmap_v1";

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
  const [useNativeCanvas, setUseNativeCanvas] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null);
  const initialScene = useRef(loadScene());
  const initialLibrary = useRef(loadLibrary());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();

  // ── Native Canvas States ───────────────────────────────────────────────────
  const [nativeNodes, setNativeNodes] = useState<NativeNode[]>(() => {
    try {
      const saved = localStorage.getItem(NATIVE_STORAGE_KEY);
      if (saved) return JSON.parse(saved).nodes || [];
    } catch { /* ignore */ }
    return [
      { id: "1", type: "rectangle", x: 300, y: 150, width: 180, height: 60, label: "🧠 Master Topic", color: "#38bdf8", fillColor: "rgba(56,189,248,0.15)" },
      { id: "2", type: "circle", x: 120, y: 300, width: 120, height: 120, label: "Subtopic A", color: "#818cf8", fillColor: "rgba(129,140,248,0.15)" },
      { id: "3", type: "circle", x: 480, y: 300, width: 120, height: 120, label: "Subtopic B", color: "#c084fc", fillColor: "rgba(192,132,252,0.15)" },
    ];
  });
  const [nativeConnections, setNativeConnections] = useState<NativeConnection[]>(() => {
    try {
      const saved = localStorage.getItem(NATIVE_STORAGE_KEY);
      if (saved) return JSON.parse(saved).connections || [];
    } catch { /* ignore */ }
    return [
      { fromId: "1", toId: "2" },
      { fromId: "1", toId: "3" },
    ];
  });
  const [nativeTool, setNativeTool] = useState<"select" | "rectangle" | "circle" | "text" | "connect" | "eraser">("select");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  // Save native state
  useEffect(() => {
    try {
      localStorage.setItem(NATIVE_STORAGE_KEY, JSON.stringify({ nodes: nativeNodes, connections: nativeConnections }));
    } catch { /* ignore */ }
  }, [nativeNodes, nativeConnections]);

  // ── Lazy load Excalidraw with CDN asset path fallback ─────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).EXCALIDRAW_ASSET_PATH = "https://unpkg.com/@excalidraw/excalidraw/dist/";
    }

    import("@excalidraw/excalidraw")
      .then((mod) => {
        const Comp = (mod as any).Excalidraw || (mod as any).default?.Excalidraw || (mod as any).default;
        if (!Comp) throw new Error("Excalidraw component not found");
        setExcalidrawComp(() => Comp);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Excalidraw load warning, switching to Native Canvas Engine:", err);
        setLoadError(err?.message || "Switched to Fast Native Canvas Engine");
        setIsLoading(false);
        setUseNativeCanvas(true); // Auto fallback to native canvas!
      });
  }, []);

  // ── Auto-save Excalidraw on change ─────────────────────────────────────────
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

  // ── Export PNG ────────────────────────────────────────────────────────────
  const handleExportPNG = async () => {
    if (useNativeCanvas) {
      showToast("📥 Exporting native diagram image...", "info");
      const canvas = document.getElementById("native-mindmap-svg");
      if (!canvas) return;
      const svgData = new XMLSerializer().serializeToString(canvas as any);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width = 1200; cvs.height = 800;
        const ctx = cvs.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, cvs.width, cvs.height);
          ctx.drawImage(img, 0, 0);
          const pngUrl = cvs.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = pngUrl; a.download = `mindmap-native-${Date.now()}.png`; a.click();
          showToast("📥 Native Mind Map exported as PNG!", "success");
        }
      };
      img.src = url;
      return;
    }

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

  // ── Native Board Handlers ──────────────────────────────────────────────────
  const handleNativeBoardClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDraggingNode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    if (nativeTool === "rectangle") {
      const label = prompt("Enter Node Title:", "New Topic");
      if (!label) return;
      const newNode: NativeNode = {
        id: crypto.randomUUID(),
        type: "rectangle",
        x: x - 90, y: y - 30,
        width: 180, height: 60,
        label, color: "#38bdf8", fillColor: "rgba(56,189,248,0.15)",
      };
      setNativeNodes(prev => [...prev, newNode]);
      setNativeTool("select");
      showToast("➕ Topic Node created!", "success");
    } else if (nativeTool === "circle") {
      const label = prompt("Enter Idea Label:", "New Idea");
      if (!label) return;
      const newNode: NativeNode = {
        id: crypto.randomUUID(),
        type: "circle",
        x: x - 60, y: y - 60,
        width: 120, height: 120,
        label, color: "#c084fc", fillColor: "rgba(192,132,252,0.15)",
      };
      setNativeNodes(prev => [...prev, newNode]);
      setNativeTool("select");
      showToast("➕ Circle Node created!", "success");
    } else if (nativeTool === "select") {
      setSelectedNodeId(null);
    }
  };

  const handleNodeMouseDown = (node: NativeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (nativeTool === "connect") {
      if (!connectFromId) {
        setConnectFromId(node.id);
        showToast("🔗 Select second node to connect...", "info");
      } else if (connectFromId !== node.id) {
        setNativeConnections(prev => [...prev, { fromId: connectFromId, toId: node.id }]);
        setConnectFromId(null);
        setNativeTool("select");
        showToast("✅ Nodes connected!", "success");
      }
      return;
    }

    if (nativeTool === "eraser") {
      setNativeNodes(prev => prev.filter(n => n.id !== node.id));
      setNativeConnections(prev => prev.filter(c => c.fromId !== node.id && c.toId !== node.id));
      showToast("🗑️ Node deleted.", "info");
      return;
    }

    setSelectedNodeId(node.id);
    setIsDraggingNode(true);
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingNode || !selectedNodeId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - (dragOffset.x - rect.left);
    const y = e.clientY - rect.top - (dragOffset.y - rect.top);

    setNativeNodes(prev => prev.map(node => node.id === selectedNodeId ? { ...node, x, y } : node));
  };

  const handleMouseUp = () => {
    setIsDraggingNode(false);
  };

  return (
    <div className={`flex flex-col gap-0 transition-all duration-300 ${
      isFullscreen 
        ? "fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 p-0 m-0" 
        : "h-[calc(100vh-110px)] -mx-4 -mt-2"
    }`}>

      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-900/90 border-b border-white/10 backdrop-blur-md shrink-0 flex-wrap z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-white flex items-center gap-1.5">
            🧠 <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Mind Map Whiteboard</span>
          </span>
          <span className="text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
            {useNativeCanvas ? "Native Engine" : "Excalidraw Engine"}
          </span>

          <button 
            onClick={() => setUseNativeCanvas(!useNativeCanvas)}
            className="ml-2 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 hover:bg-purple-500/30 transition-all flex items-center gap-1"
            title="Switch between Excalidraw and Native Vector Canvas"
          >
            <RefreshCw className="w-3 h-3" />
            Switch Engine
          </button>
          
          <button 
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
            }}
            className={`ml-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
              isFullscreen 
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30" 
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
            }`}
          >
            {isFullscreen ? "Exit Full Screen" : "📺 Maximize / Full Screen"}
          </button>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {useNativeCanvas ? (
            <>
              <button onClick={() => setNativeTool("rectangle")} className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${nativeTool === "rectangle" ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
                🟩 + Topic Box
              </button>
              <button onClick={() => setNativeTool("circle")} className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${nativeTool === "circle" ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
                🟣 + Subtopic Circle
              </button>
              <button onClick={() => setNativeTool("connect")} className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${nativeTool === "connect" ? "bg-purple-500 text-white border-purple-400 font-bold" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
                🔗 Connect Nodes
              </button>
              <button onClick={() => setNativeTool("eraser")} className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${nativeTool === "eraser" ? "bg-rose-500 text-white border-rose-400 font-bold" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
                🗑️ Delete
              </button>
            </>
          ) : null}

          <button onClick={handleExportPNG} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 text-[11px] font-semibold transition-all">
            <Download className="w-3 h-3" /> Export PNG
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative min-h-0 bg-slate-950">
        {/* NATIVE CANVAS MODE */}
        {useNativeCanvas ? (
          <div className="w-full h-full relative overflow-hidden select-none bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="absolute top-3 left-4 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-slate-300 shadow-lg pointer-events-none">
              💡 <span className="font-bold text-white">Native Mode Active:</span> Click tool above then click canvas to add nodes & drag them to connect!
            </div>

            <svg
              id="native-mindmap-svg"
              className="w-full h-full cursor-crosshair"
              onMouseDown={handleNativeBoardClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Connections */}
              {nativeConnections.map((conn, idx) => {
                const fromNode = nativeNodes.find(n => n.id === conn.fromId);
                const toNode = nativeNodes.find(n => n.id === conn.toId);
                if (!fromNode || !toNode) return null;

                const fromCenterX = fromNode.x + (fromNode.width || 120) / 2;
                const fromCenterY = fromNode.y + (fromNode.height || 60) / 2;
                const toCenterX = toNode.x + (toNode.width || 120) / 2;
                const toCenterY = toNode.y + (toNode.height || 60) / 2;

                return (
                  <line
                    key={idx}
                    x1={fromCenterX}
                    y1={fromCenterY}
                    x2={toCenterX}
                    y2={toCenterY}
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="4"
                    className="opacity-70 animate-pulse"
                  />
                );
              })}

              {/* Nodes */}
              {nativeNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const w = node.width || 120;
                const h = node.height || 60;

                return (
                  <g key={node.id} onMouseDown={(e) => handleNodeMouseDown(node, e)} className="cursor-grab active:cursor-grabbing">
                    {node.type === "rectangle" ? (
                      <rect
                        x={node.x}
                        y={node.y}
                        width={w}
                        height={h}
                        rx="16"
                        fill={node.fillColor || "rgba(15, 23, 42, 0.9)"}
                        stroke={isSelected ? "#f43f5e" : node.color}
                        strokeWidth={isSelected ? "3" : "2"}
                        className="transition-all shadow-xl"
                      />
                    ) : (
                      <circle
                        cx={node.x + w / 2}
                        cy={node.y + h / 2}
                        r={w / 2}
                        fill={node.fillColor || "rgba(15, 23, 42, 0.9)"}
                        stroke={isSelected ? "#f43f5e" : node.color}
                        strokeWidth={isSelected ? "3" : "2"}
                        className="transition-all shadow-xl"
                      />
                    )}
                    <text
                      x={node.x + w / 2}
                      y={node.y + h / 2 + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="bold"
                      className="pointer-events-none font-sans"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          /* EXCALIDRAW MODE */
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-20">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-slate-400 font-semibold">Loading Excalidraw Engine...</p>
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
          </>
        )}
      </div>
    </div>
  );
}
