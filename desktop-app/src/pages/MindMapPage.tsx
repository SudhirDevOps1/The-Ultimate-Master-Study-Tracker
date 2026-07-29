import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { Plus, Trash2, Link2, MousePointer, HelpCircle, Save, Sparkles, RefreshCw } from "lucide-react";

interface MindNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

interface MindLink {
  fromId: string;
  toId: string;
}

const COLOR_PALETTES = [
  "#0ea5e9", // Cyan
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#22c55e", // Green
  "#eab308", // Yellow
];

export function MindMapPage() {
  const [nodes, setNodes] = useState<MindNode[]>([]);
  const [links, setLinks] = useState<MindLink[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mode, setMode] = useState<"select" | "connect" | "delete">("select");
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const canvasRef = useRef<SVGSVGElement | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load imported highlights from OCR reader
  const handleImportOCR = () => {
    const tempText = localStorage.getItem("flowtrack_temp_flashcard_input") || 
                     localStorage.getItem("flowtrack_temp_notes_input") || 
                     "Study Topic, Core Concepts, Practical Application";
                     
    const topics = tempText
      .split(/[,\.\n]+/)
      .map(t => t.trim())
      .filter(t => t.length > 2 && t.length < 30)
      .slice(0, 8);

    if (topics.length === 0) {
      alert("No highlight notes text found in buffer! Try copying text from Study Workspace reader.");
      return;
    }

    // Generate radial mind map structure automatically
    const centerX = 400;
    const centerY = 250;
    const rootId = crypto.randomUUID();
    const newNodes: MindNode[] = [
      { id: rootId, label: topics[0] || "Root Topic", x: centerX, y: centerY, color: "#6366f1" }
    ];
    const newLinks: MindLink[] = [];

    topics.slice(1).forEach((topic, i) => {
      const id = crypto.randomUUID();
      const angle = (i * 2 * Math.PI) / (topics.length - 1);
      const radius = 160;
      newNodes.push({
        id,
        label: topic,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        color: COLOR_PALETTES[(i + 1) % COLOR_PALETTES.length]
      });
      newLinks.push({ fromId: rootId, toId: id });
    });

    setNodes(newNodes);
    setLinks(newLinks);
  };

  // Add custom node
  const handleAddNode = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== "select") return;
    // Avoid double clicking node targets
    if ((e.target as any).tagName !== "svg" && (e.target as any).tagName !== "rect") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newNode: MindNode = {
          id: crypto.randomUUID(),
          label: "New Node",
          x,
          y,
          color: COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]
        };
        setNodes(prev => [...prev, newNode]);
        setSelectedNodeId(newNode.id);
        setEditLabel("New Node");
      }
    }
  };

  // Node Drag Handlers
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "delete") {
      handleDeleteNode(nodeId);
      return;
    }
    if (mode === "connect") {
      if (!connectFromId) {
        setConnectFromId(nodeId);
      } else if (connectFromId !== nodeId) {
        // Prevent duplicate link
        if (!links.some(l => (l.fromId === connectFromId && l.toId === nodeId) || (l.fromId === nodeId && l.toId === connectFromId))) {
          setLinks(prev => [...prev, { fromId: connectFromId, toId: nodeId }]);
        }
        setConnectFromId(null);
      }
      return;
    }
    setSelectedNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditLabel(node.label);
      setDraggingNodeId(nodeId);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left - node.x,
          y: e.clientY - rect.top - node.y
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x, y } : n));
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setLinks(prev => prev.filter(l => l.fromId !== id && l.toId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const updateNodeLabel = (val: string) => {
    setEditLabel(val);
    if (selectedNodeId) {
      setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, label: val } : n));
    }
  };

  const clearCanvas = () => {
    if (window.confirm("Clear whole whiteboard canvas map?")) {
      setNodes([]);
      setLinks([]);
      setSelectedNodeId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-3xl bg-slate-900/40 p-5 border border-white/5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            🎨 Interactive Whiteboard <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Mind Maps</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Double click empty space to place nodes. Click to drag, select tools to link them, or load OCR textbook text blocks directly.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImportOCR}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 text-slate-950 px-4 py-2.5 text-xs font-bold hover:bg-cyan-400 transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate from OCR Highlights</span>
          </button>
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-rose-400 hover:bg-white/10 px-4 py-2.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Map</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Workspace controls */}
        <Panel className="lg:col-span-1 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Canvas Tool mode</label>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => { setMode("select"); setConnectFromId(null); }}
                className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                  mode === "select" ? "bg-cyan-500 border-cyan-400 text-slate-950" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/8"
                }`}
              >
                <MousePointer className="w-4 h-4" />
                <span>Move/Add</span>
              </button>
              <button
                onClick={() => setMode("connect")}
                className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                  mode === "connect" ? "bg-cyan-500 border-cyan-400 text-slate-950" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/8"
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Connect</span>
              </button>
              <button
                onClick={() => { setMode("delete"); setConnectFromId(null); }}
                className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                  mode === "delete" ? "bg-rose-500 border-rose-400 text-white" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/8"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Erase</span>
              </button>
            </div>
          </div>

          {selectedNodeId && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Edit Node Label</span>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => updateNodeLabel(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span>Color palette:</span>
                <div className="flex gap-1">
                  {COLOR_PALETTES.map(col => (
                    <button
                      key={col}
                      onClick={() => {
                        setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, color: col } : n));
                      }}
                      className="w-3.5 h-3.5 rounded-full border border-white/10"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white/5 border border-white/5 p-3 text-[10px] text-slate-400 space-y-2">
            <p className="font-bold flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Usage Tips:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Double click canvas area to place a new concept bubble node.</li>
              <li>Toggle <strong>Connect</strong>, then click two nodes in sequence to draw connection arrows.</li>
              <li>Toggle <strong>Erase</strong> and click any bubble node to delete.</li>
            </ul>
          </div>
        </Panel>

        {/* Interactive Mind Map SVGArea Canvas */}
        <Panel className="lg:col-span-3 h-[520px] p-0 relative overflow-hidden bg-slate-950 border border-white/10">
          <svg
            ref={canvasRef}
            className="w-full h-full cursor-crosshair select-none bg-slate-950/60"
            onDoubleClick={handleAddNode}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Draw Links */}
            {links.map((link, i) => {
              const fromNode = nodes.find(n => n.id === link.fromId);
              const toNode = nodes.find(n => n.id === link.toId);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={i}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="rgba(255, 255, 255, 0.28)"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Connection mode active state helper line */}
            {mode === "connect" && connectFromId && (() => {
              const node = nodes.find(n => n.id === connectFromId);
              if (!node) return null;
              return (
                <circle cx={node.x} cy={node.y} r="18" fill="none" stroke="#22d3ee" strokeWidth="2.5" className="animate-pulse" />
              );
            })()}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  className="cursor-pointer group"
                >
                  <circle
                    r="55"
                    fill={`${node.color}15`}
                    stroke={isSelected ? "#ffffff" : node.color}
                    strokeWidth={isSelected ? "3" : "1.8"}
                    className="transition-all hover:scale-105"
                  />
                  <foreignObject x="-45" y="-35" width="90" height="70">
                    <div className="w-full h-full flex items-center justify-center text-center px-1.5 select-none">
                      <p className="text-[10px] font-bold text-white leading-tight break-all line-clamp-3">
                        {node.label}
                      </p>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </Panel>
      </div>
    </div>
  );
}
