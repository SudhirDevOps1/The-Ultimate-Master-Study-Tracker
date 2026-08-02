import { useEffect, useRef, useState, useCallback } from "react";
import { 
  Download, Plus, Trash2, Edit3, Sparkles, RefreshCw, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Palette, Layers, Eye, Move, Check, CornerDownRight, Share2, RotateCcw, LayoutTemplate, Sliders
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { Panel } from "@/components/common/Panel";
import { FabricWhiteboard } from "@/components/common/FabricWhiteboard";

// ─── Mind Map Tree Engine Models ──────────────────────────────────────────────
export interface MindNode {
  id: string;
  parentId: string | null;
  text: string;
  x: number;
  y: number;
  color: string;       // Accent color hex
  side?: "left" | "right";
  collapsed?: boolean;
}

const COLOR_PRESETS = [
  { name: "Purple", hex: "#a855f7", bg: "rgba(168,85,247,0.18)", border: "#a855f7", text: "#f3e8ff" },
  { name: "Pink", hex: "#ec4899", bg: "rgba(236,72,153,0.18)", border: "#ec4899", text: "#fce7f3" },
  { name: "Teal/Emerald", hex: "#10b981", bg: "rgba(16,185,129,0.18)", border: "#10b981", text: "#d1fae5" },
  { name: "Cyan/Sky", hex: "#06b6d4", bg: "rgba(6,182,212,0.18)", border: "#06b6d4", text: "#cffaff" },
  { name: "Indigo/Blue", hex: "#3b82f6", bg: "rgba(59,130,246,0.18)", border: "#3b82f6", text: "#dbeafe" },
  { name: "Orange", hex: "#f97316", bg: "rgba(249,115,22,0.18)", border: "#f97316", text: "#ffedd5" },
  { name: "Amber", hex: "#eab308", bg: "rgba(234,179,8,0.18)", border: "#eab308", text: "#fef9c3" },
  { name: "Rose", hex: "#f43f5e", bg: "rgba(244,63,94,0.18)", border: "#f43f5e", text: "#ffe4e6" }
];

const STORAGE_KEY = "flowtrack_tree_mindmap_v2";

const DEFAULT_NODES: MindNode[] = [
  { id: "root", parentId: null, text: "Central Idea", x: 450, y: 300, color: "#a855f7" },
  
  // Left Side Nodes
  { id: "l1", parentId: "root", text: "New Subtopic", x: 200, y: 180, color: "#06b6d4", side: "left" },
  { id: "l2", parentId: "root", text: "New Subtopic", x: 200, y: 320, color: "#f97316", side: "left" },

  // Right Side Nodes
  { id: "r1", parentId: "root", text: "New Subtopic", x: 700, y: 160, color: "#10b981", side: "right" },
  { id: "r2", parentId: "root", text: "New Subtopic", x: 700, y: 280, color: "#3b82f6", side: "right" },
  { id: "r3", parentId: "root", text: "New Subtopic", x: 700, y: 400, color: "#eab308", side: "right" }
];

// Pre-built Mind Map Templates
const TEMPLATES: Record<string, MindNode[]> = {
  chapter: [
    { id: "root", parentId: null, text: "📖 Chapter Study Plan", x: 450, y: 300, color: "#a855f7" },
    { id: "c1", parentId: "root", text: "Key Concepts", x: 200, y: 180, color: "#ec4899", side: "left" },
    { id: "c1-1", parentId: "c1", text: "Definitions & Formulae", x: 20, y: 180, color: "#ec4899", side: "left" },
    { id: "c2", parentId: "root", text: "Important Theorems", x: 200, y: 320, color: "#06b6d4", side: "left" },
    { id: "c3", parentId: "root", text: "Solved Examples", x: 700, y: 180, color: "#10b981", side: "right" },
    { id: "c4", parentId: "root", text: "Revision Notes & Flashcards", x: 700, y: 320, color: "#eab308", side: "right" }
  ],
  project: [
    { id: "root", parentId: null, text: "🚀 Project Architecture", x: 450, y: 300, color: "#3b82f6" },
    { id: "p1", parentId: "root", text: "Frontend UI", x: 200, y: 200, color: "#06b6d4", side: "left" },
    { id: "p2", parentId: "root", text: "Backend API", x: 200, y: 340, color: "#10b981", side: "left" },
    { id: "p3", parentId: "root", text: "Database Schema", x: 700, y: 200, color: "#f97316", side: "right" },
    { id: "p4", parentId: "root", text: "Deployment & CI/CD", x: 700, y: 340, color: "#a855f7", side: "right" }
  ]
};

export function MindMapPage() {
  const [nodes, setNodes] = useState<MindNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_NODES;
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("root");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [engineMode, setEngineMode] = useState<"tree" | "excalidraw">("tree");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [curveWidth, setCurveWidth] = useState<number>(2.5);
  
  // Canvas View transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Excalidraw Dynamic State & API
  const [excalidrawComp, setExcalidrawComp] = useState<any>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isExcalidrawLoading, setIsExcalidrawLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const excalidrawContainerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Save Nodes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    } catch { /* ignore */ }
  }, [nodes]);

  // ── Node Helper Functions ──────────────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Add Independent New Topic Box
  const addIndependentTopic = () => {
    const newNode: MindNode = {
      id: crypto.randomUUID(),
      parentId: null,
      text: "New Main Topic",
      x: 350 + Math.random() * 150,
      y: 180 + Math.random() * 150,
      color: COLOR_PRESETS[(nodes.length + 1) % COLOR_PRESETS.length].hex
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditText("New Main Topic");
    showToast("New Topic added!", "success");
  };

  // Add Subtopic Child
  const addSubtopic = (parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    const childCount = nodes.filter(n => n.parentId === parentId).length;
    const isRoot = parentId === "root";
    const side = isRoot ? (childCount % 2 === 0 ? "right" : "left") : (parent.side || "right");

    const xOffset = side === "left" ? -220 : 220;
    const yOffset = (childCount - 1) * 70;

    const newNode: MindNode = {
      id: crypto.randomUUID(),
      parentId,
      text: "New Subtopic",
      x: parent.x + xOffset,
      y: parent.y + yOffset,
      color: COLOR_PRESETS[(nodes.length + 1) % COLOR_PRESETS.length].hex,
      side
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditText("New Subtopic");
    showToast("Subtopic added!", "success");
  };

  const deleteNode = (id: string) => {
    if (id === "root" && nodes.length === 1) {
      showToast("Cannot delete last remaining node", "warning");
      return;
    }
    const getSubtreeIds = (targetId: string): string[] => {
      const children = nodes.filter(n => n.parentId === targetId);
      const childIds = children.flatMap(c => getSubtreeIds(c.id));
      return [targetId, ...childIds];
    };
    const toDelete = new Set(getSubtreeIds(id));
    setNodes(prev => prev.filter(n => !toDelete.has(n.id)));
    setSelectedNodeId("root");
    showToast("Node deleted", "info");
  };

  const updateNodeColor = (id: string, colorHex: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, color: colorHex } : n));
  };

  const startInlineEdit = (node: MindNode) => {
    setEditingNodeId(node.id);
    setEditText(node.text);
  };

  const saveInlineEdit = () => {
    if (editingNodeId && editText.trim()) {
      setNodes(prev => prev.map(n => n.id === editingNodeId ? { ...n, text: editText.trim() } : n));
    }
    setEditingNodeId(null);
  };

  // Load Template
  const loadTemplate = (key: string) => {
    if (TEMPLATES[key]) {
      setNodes(TEMPLATES[key]);
      setSelectedNodeId("root");
      setZoom(1);
      setPan({ x: 0, y: 0 });
      showToast(`Loaded ${key === "chapter" ? "Chapter Study" : "Project Architecture"} Template!`, "success");
    }
  };

  // Clear Canvas (Reset to Central Idea)
  const clearTreeCanvas = () => {
    setNodes([
      { id: "root", parentId: null, text: "Central Idea", x: 450, y: 300, color: "#a855f7" }
    ]);
    setSelectedNodeId("root");
    showToast("Canvas Reset to Central Idea", "info");
  };

  // Auto Layout Tree around Root
  const autoLayout = () => {
    const root = nodes.find(n => n.id === "root") || { id: "root", x: 450, y: 300 };
    const children = nodes.filter(n => n.parentId === "root");
    
    const lefts = children.filter((_, idx) => idx % 2 === 1);
    const rights = children.filter((_, idx) => idx % 2 === 0);

    const updatedMap = new Map<string, { x: number; y: number; side: "left" | "right" }>();

    lefts.forEach((child, idx) => {
      const yPos = root.y + (idx - (lefts.length - 1) / 2) * 85;
      updatedMap.set(child.id, { x: root.x - 250, y: yPos, side: "left" });
    });

    rights.forEach((child, idx) => {
      const yPos = root.y + (idx - (rights.length - 1) / 2) * 85;
      updatedMap.set(child.id, { x: root.x + 250, y: yPos, side: "right" });
    });

    nodes.forEach(node => {
      if (node.parentId && node.parentId !== "root") {
        const parentInfo = updatedMap.get(node.parentId) || nodes.find(n => n.id === node.parentId);
        if (parentInfo) {
          const siblings = nodes.filter(n => n.parentId === node.parentId);
          const sIdx = siblings.findIndex(s => s.id === node.id);
          const side = (parentInfo as any).side || "right";
          const xPos = side === "left" ? parentInfo.x - 220 : parentInfo.x + 220;
          const yPos = parentInfo.y + (sIdx - (siblings.length - 1) / 2) * 75;
          updatedMap.set(node.id, { x: xPos, y: yPos, side });
        }
      }
    });

    setNodes(prev => prev.map(n => {
      if (n.id === "root") return { ...n, x: 450, y: 300 };
      const info = updatedMap.get(n.id);
      return info ? { ...n, x: info.x, y: info.y, side: info.side } : n;
    }));

    setZoom(1);
    setPan({ x: 0, y: 0 });
    showToast("Tree Auto-Aligned!", "success");
  };

  // ── Drag & Canvas Handling ─────────────────────────────────────────────────
  const handleMouseDownNode = (e: React.MouseEvent, node: MindNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n));
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Export Mind Map Canvas to Ultra 4K High Definition PNG
  const exportPNG = () => {
    const canvas = document.createElement("canvas");
    // Ultra 4K Crisp Resolution (3840x2160)
    canvas.width = 3840;
    canvas.height = 2160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Enable high definition text anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.scale(2, 2); // 2x Scale for 4K canvas context

    ctx.fillStyle = "#0B0F19";
    ctx.fillRect(0, 0, 1920, 1080);

    nodes.forEach(node => {
      if (!node.parentId) return;
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return;

      const pX = parent.x + 80;
      const pY = parent.y + 20;
      const cX = node.x + 80;
      const cY = node.y + 20;
      const midX = (pX + cX) / 2;

      ctx.beginPath();
      ctx.moveTo(pX, pY);
      ctx.bezierCurveTo(midX, pY, midX, cY, cX, cY);
      ctx.strokeStyle = node.color || "#a855f7";
      ctx.lineWidth = curveWidth * 1.2;
      ctx.stroke();
    });

    nodes.forEach(node => {
      const w = node.id === "root" ? 180 : 160;
      const h = 44;
      const radius = 22;

      ctx.fillStyle = node.id === "root" ? "rgba(168,85,247,0.35)" : "rgba(15,23,42,0.9)";
      ctx.strokeStyle = node.color || "#a855f7";
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(node.x, node.y, w, h, radius);
      } else {
        ctx.rect(node.x, node.y, w, h);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.text, node.x + w / 2, node.y + h / 2);
    });

    const link = document.createElement("a");
    link.download = `FlowTrack_MindMap_4K_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
    showToast("Mind Map High-Res PNG Exported!", "success");
  };

  // Excalidraw Clear Canvas
  const clearExcalidrawCanvas = () => {
    if (excalidrawAPI) {
      excalidrawAPI.resetScene();
      showToast("Excalidraw Whiteboard Cleared!", "info");
    } else {
      showToast("Excalidraw engine initializing...", "info");
    }
  };

  // Whiteboard Canvas PNG Export
  const exportExcalidrawPNG = async () => {
    try {
      const container = excalidrawContainerRef.current;
      const canvasEl = container ? container.querySelector("canvas") : document.querySelector("canvas");
      if (canvasEl && canvasEl instanceof HTMLCanvasElement) {
        const dataUrl = canvasEl.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `Whiteboard_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = dataUrl;
        link.click();
        showToast("Whiteboard Canvas Image Exported!", "success");
        return;
      }
    } catch (err) {
      console.warn("Canvas DOM export error:", err);
    }
    showToast("Whiteboard image export ready!", "info");
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-[#0B0F19] p-6 overflow-hidden" : ""}`}>
      {/* ─── Header Controls Panel ────────────────────────────────────────── */}
      <Panel className="bg-slate-900/90 border-slate-800 backdrop-blur-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/5">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                🧠 Mind Map Whiteboard
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {engineMode === "tree" ? "Organic Curved Tree Engine" : "Excalidraw Freehand Engine"}
                </span>
              </h1>
              <p className="text-xs text-slate-400">Interactive Visual Topic & Branch Planner</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Dual Engine Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
              <button
                onClick={() => setEngineMode("tree")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  engineMode === "tree"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🧠 Organic Mind Map
              </button>
              <button
                onClick={() => setEngineMode("excalidraw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  engineMode === "excalidraw"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ✏️ Excalidraw Whiteboard
              </button>
            </div>

            {/* Tree Engine Toolbar Actions */}
            {engineMode === "tree" && (
              <>
                <button
                  onClick={addIndependentTopic}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> + Topic Box
                </button>

                <button
                  onClick={() => addSubtopic(selectedNodeId || "root")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> + Subtopic
                </button>

                {/* Templates Dropdown */}
                <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
                  <LayoutTemplate className="w-3.5 h-3.5 text-purple-400" />
                  <select 
                    onChange={(e) => loadTemplate(e.target.value)}
                    defaultValue=""
                    className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Templates</option>
                    <option value="chapter" className="bg-slate-900 text-slate-200">📖 Chapter Plan</option>
                    <option value="project" className="bg-slate-900 text-slate-200">🚀 Project Plan</option>
                  </select>
                </div>

                <button
                  onClick={autoLayout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Auto Align
                </button>

                <button
                  onClick={exportPNG}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Export PNG
                </button>

                <button
                  onClick={clearTreeCanvas}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>

                {selectedNodeId && selectedNodeId !== "root" && (
                  <button
                    onClick={() => deleteNode(selectedNodeId)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Node
                  </button>
                )}
              </>
            )}

            {/* Excalidraw Engine Toolbar Actions */}
            {engineMode === "excalidraw" && (
              <>
                <button
                  onClick={exportExcalidrawPNG}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 transition flex items-center gap-1 shadow-md shadow-purple-500/20"
                >
                  <Download className="w-3.5 h-3.5" /> Download PNG
                </button>

                <button
                  onClick={clearExcalidrawCanvas}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-purple-400" />}
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </button>
              </>
            )}
          </div>
        </div>
      </Panel>

      {/* ─── Main Mind Map Canvas ─────────────────────────────────────────── */}
      {engineMode === "tree" ? (
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseDown={(e) => {
            if (e.target === containerRef.current) {
              setSelectedNodeId(null);
              setIsPanning(true);
              setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }
          }}
          className={`relative w-full ${isFullscreen ? "h-[calc(100vh-140px)]" : "h-[760px]"} rounded-2xl bg-[#0B0F19] border border-slate-800/80 overflow-hidden shadow-2xl select-none cursor-grab active:cursor-grabbing`}
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }}
        >
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur-md">
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-400 px-2">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300" title="Reset View">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300" title="Toggle Fullscreen">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-purple-400" />}
            </button>
          </div>

          {/* Color Palette bar for selected node */}
          {selectedNode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/95 border border-slate-800 px-4 py-2 rounded-2xl backdrop-blur-md shadow-xl">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-purple-400" /> Color:
              </span>
              <div className="flex items-center gap-1.5">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => updateNodeColor(selectedNode.id, preset.hex)}
                    className={`w-6 h-6 rounded-full border transition transform hover:scale-110 ${selectedNode.color === preset.hex ? "border-white ring-2 ring-purple-500 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Canvas SVG Lines & Floating Nodes Container */}
          <div 
            className="w-full h-full transform-gpu origin-top-left transition-transform duration-75"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {/* SVG Connecting Curves */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {nodes.map(node => {
                if (!node.parentId) return null;
                const parent = nodes.find(n => n.id === node.parentId);
                if (!parent) return null;

                const parentIsRoot = parent.id === "root";
                const isLeft = node.side === "left";

                const pW = parentIsRoot ? 180 : 160;
                const pH = 44;
                const cW = 160;
                const cH = 44;

                const pX = isLeft ? parent.x : parent.x + pW;
                const pY = parent.y + pH / 2;

                const cX = isLeft ? node.x + cW : node.x;
                const cY = node.y + cH / 2;

                const controlDist = Math.abs(cX - pX) * 0.55;
                const cp1X = isLeft ? pX - controlDist : pX + controlDist;
                const cp2X = isLeft ? cX + controlDist : cX - controlDist;

                const strokeColor = node.color || "#a855f7";

                return (
                  <g key={`link-${node.id}`}>
                    <path
                      d={`M ${pX} ${pY} C ${cp1X} ${pY}, ${cp2X} ${cY}, ${cX} ${cY}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={curveWidth}
                      strokeLinecap="round"
                      opacity="0.85"
                      filter="url(#glow)"
                    />
                    <circle cx={pX} cy={pY} r="3.5" fill={strokeColor} />
                    <circle cx={cX} cy={cY} r="3.5" fill={strokeColor} />
                  </g>
                );
              })}
            </svg>

            {/* Mind Map Pill Nodes */}
            {nodes.map(node => {
              const isRoot = node.id === "root";
              const isSelected = selectedNodeId === node.id;
              const isEditing = editingNodeId === node.id;
              const colorObj = COLOR_PRESETS.find(c => c.hex === node.color) || COLOR_PRESETS[0];

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleMouseDownNode(e, node)}
                  onDoubleClick={() => startInlineEdit(node)}
                  className={`absolute z-10 rounded-full flex items-center justify-between px-5 py-2.5 cursor-grab active:cursor-grabbing transition-shadow duration-200 border shadow-xl backdrop-blur-md ${
                    isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#0B0F19] scale-105" : "hover:scale-102"
                  }`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: isRoot ? "200px" : "170px",
                    height: "46px",
                    backgroundColor: colorObj.bg,
                    borderColor: colorObj.border,
                    boxShadow: `0 8px 24px -6px ${node.color}33`
                  }}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(); }}
                      onBlur={saveInlineEdit}
                      autoFocus
                      className="w-full bg-transparent text-white font-semibold text-center text-sm outline-none border-b border-white"
                    />
                  ) : (
                    <span 
                      className="w-full text-center font-bold text-sm tracking-wide truncate"
                      style={{ color: colorObj.text }}
                    >
                      {node.text}
                    </span>
                  )}

                  {/* Add Subtopic (+) Quick Action Button */}
                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); addSubtopic(node.id); }}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-lg border border-white/20 transition transform hover:scale-125 z-30"
                      title="Add Subtopic"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── Fabric.js Whiteboard Engine Mode ───────────────────────────────── */
        <FabricWhiteboard storageKey="flowtrack_fabric_whiteboard_desktop_v1" />
      )}
    </div>
  );
}
