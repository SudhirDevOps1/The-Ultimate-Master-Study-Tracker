import { useEffect, useRef, useState, useCallback } from "react";
import { 
  Download, Plus, Trash2, Edit3, Sparkles, RefreshCw, ZoomIn, ZoomOut, 
  Maximize2, Palette, Layers, Eye, Move, Check, CornerDownRight, Share2 
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { Panel } from "@/components/common/Panel";

// ─── Mind Map Tree Engine Models ──────────────────────────────────────────────
export interface MindNode {
  id: string;
  parentId: string | null;
  text: string;
  x: number;
  y: number;
  color: string;       // Accent color hex/class
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
  { id: "l1", parentId: "root", text: "New Idea 1", x: 200, y: 150, color: "#ec4899", side: "left" },
  { id: "l2", parentId: "root", text: "New Idea 2", x: 200, y: 250, color: "#10b981", side: "left" },
  { id: "l3", parentId: "root", text: "New Idea 3", x: 200, y: 350, color: "#06b6d4", side: "left" },
  { id: "l4", parentId: "root", text: "New Idea 4", x: 200, y: 450, color: "#8b5cf6", side: "left" },

  // Right Side Nodes
  { id: "r1", parentId: "root", text: "Subtopic A", x: 700, y: 160, color: "#f97316", side: "right" },
  { id: "r1-1", parentId: "r1", text: "Detail A1", x: 920, y: 120, color: "#f97316", side: "right" },
  { id: "r1-2", parentId: "r1", text: "Detail A2", x: 920, y: 200, color: "#f97316", side: "right" },

  { id: "r2", parentId: "root", text: "Subtopic B", x: 700, y: 280, color: "#f43f5e", side: "right" },
  { id: "r2-1", parentId: "r2", text: "Detail B1", x: 920, y: 280, color: "#f43f5e", side: "right" },

  { id: "r3", parentId: "root", text: "Subtopic C", x: 700, y: 380, color: "#eab308", side: "right" },
  { id: "r4", parentId: "root", text: "Subtopic D", x: 700, y: 460, color: "#3b82f6", side: "right" },
  { id: "r5", parentId: "root", text: "Subtopic E", x: 700, y: 540, color: "#10b981", side: "right" }
];

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
  
  // Canvas View transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Excalidraw Dynamic State
  const [excalidrawComp, setExcalidrawComp] = useState<any>(null);
  const [isExcalidrawLoading, setIsExcalidrawLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Save Nodes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    } catch { /* ignore */ }
  }, [nodes]);

  // Load Excalidraw dynamically if toggled
  useEffect(() => {
    if (engineMode === "excalidraw" && !excalidrawComp) {
      setIsExcalidrawLoading(true);
      if (typeof window !== "undefined") {
        (window as any).EXCALIDRAW_ASSET_PATH = "https://unpkg.com/@excalidraw/excalidraw/dist/";
      }
      import("@excalidraw/excalidraw")
        .then((mod) => {
          const Comp = (mod as any).Excalidraw || (mod as any).default?.Excalidraw || (mod as any).default;
          if (!Comp) throw new Error("Excalidraw component not found");
          setExcalidrawComp(() => Comp);
        })
        .catch((e) => {
          console.warn("Excalidraw dynamic import notice:", e);
          showToast("Failed to load Excalidraw engine. Returning to Organic Tree engine.", "warning");
          setEngineMode("tree");
        })
        .finally(() => {
          setIsExcalidrawLoading(false);
        });
    }
  }, [engineMode, excalidrawComp, showToast]);

  // ── Node Helper Functions ──────────────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

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
      text: "New Idea",
      x: parent.x + xOffset,
      y: parent.y + yOffset,
      color: COLOR_PRESETS[(nodes.length + 1) % COLOR_PRESETS.length].hex,
      side
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditText("New Idea");
    showToast("Subtopic added!", "success");
  };

  const deleteNode = (id: string) => {
    if (id === "root") {
      showToast("Cannot delete central root node", "warning");
      return;
    }
    // Delete target node and descendants recursively
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

  // Auto Layout Tree around Root
  const autoLayout = () => {
    const root = nodes.find(n => n.id === "root") || { id: "root", x: 450, y: 300 };
    const children = nodes.filter(n => n.parentId === "root");
    
    const lefts = children.filter((_, idx) => idx % 2 === 1);
    const rights = children.filter((_, idx) => idx % 2 === 0);

    const updatedMap = new Map<string, { x: number; y: number; side: "left" | "right" }>();

    // Layout left side
    lefts.forEach((child, idx) => {
      const yPos = root.y + (idx - (lefts.length - 1) / 2) * 85;
      updatedMap.set(child.id, { x: root.x - 250, y: yPos, side: "left" });
    });

    // Layout right side
    rights.forEach((child, idx) => {
      const yPos = root.y + (idx - (rights.length - 1) / 2) * 85;
      updatedMap.set(child.id, { x: root.x + 250, y: yPos, side: "right" });
    });

    // Layout deeper sub-children
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

  // Export Mind Map Canvas to PNG
  const exportPNG = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0B0F19";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw connecting lines
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
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      const w = node.id === "root" ? 180 : 160;
      const h = 44;
      const radius = 22;

      ctx.fillStyle = node.id === "root" ? "rgba(168,85,247,0.3)" : "rgba(15,23,42,0.85)";
      ctx.strokeStyle = node.color || "#a855f7";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(node.x, node.y, w, h, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.text, node.x + w / 2, node.y + h / 2);
    });

    const link = document.createElement("a");
    link.download = `FlowTrack_MindMap_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Mind Map PNG Exported!", "success");
  };

  return (
    <div className="space-y-6">
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
                  {engineMode === "tree" ? "Organic Curved Tree Engine" : "Excalidraw Engine"}
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

            {engineMode === "tree" && (
              <>
                <button
                  onClick={() => addSubtopic(selectedNodeId || "root")}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> + Subtopic
                </button>

                <button
                  onClick={autoLayout}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Auto Align
                </button>

                <button
                  onClick={exportPNG}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export PNG
                </button>

                {selectedNodeId && selectedNodeId !== "root" && (
                  <button
                    onClick={() => deleteNode(selectedNodeId)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Node
                  </button>
                )}
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
          className="relative w-full h-[720px] rounded-2xl bg-[#0B0F19] border border-slate-800/80 overflow-hidden shadow-2xl select-none cursor-grab active:cursor-grabbing"
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
                      strokeWidth="2.5"
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
        /* ─── Excalidraw Engine Mode ────────────────────────────────────────── */
        <div className="w-full h-[720px] rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
          {isExcalidrawLoading ? (
            <div className="w-full h-full flex items-center justify-center text-purple-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" /> Loading Excalidraw Canvas...
            </div>
          ) : excalidrawComp ? (
            (() => {
              const Comp = excalidrawComp;
              return <Comp theme="dark" />;
            })()
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <p>Excalidraw engine unavailable.</p>
              <button onClick={() => setEngineMode("tree")} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold">
                Return to Tree Engine
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
