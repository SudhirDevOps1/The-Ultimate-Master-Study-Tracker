import { useState, useRef, useEffect } from "react";
import { Panel } from "@/components/common/Panel";
import { 
  Plus, Trash2, Link2, MousePointer, HelpCircle, Save, Sparkles, Undo2, Redo2, 
  ZoomIn, ZoomOut, Square, Circle as CircleIcon, Type, ArrowUpRight, Palette, 
  Settings, Check, Download, Edit3, Eye, Lock
} from "lucide-react";

interface Element {
  id: string;
  type: "rectangle" | "circle" | "text" | "arrow" | "draw";
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  color: string;
  fillColor?: string;
  points?: { x: number; y: number }[]; // For freehand draw
}

interface Connection {
  fromId: string;
  toId: string;
}

const STROKE_COLORS = ["#ffffff", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#4ade80", "#facc15"];
const FILL_COLORS = ["transparent", "rgba(56,189,248,0.15)", "rgba(129,140,248,0.15)", "rgba(192,132,252,0.15)", "rgba(74,222,128,0.15)"];

export function MindMapPage() {
  const [elements, setElements] = useState<Element[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [history, setHistory] = useState<{ elements: Element[]; connections: Connection[] }[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Toolbar & Style state
  const [tool, setTool] = useState<"select" | "rectangle" | "circle" | "arrow" | "text" | "draw" | "connect" | "eraser">("select");
  const [strokeColor, setStrokeColor] = useState("#38bdf8");
  const [fillColor, setFillColor] = useState("transparent");
  const [zoom, setZoom] = useState(1);

  // Selection & drag states
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawPoints, setCurrentDrawPoints] = useState<{ x: number; y: number }[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Save state to undo/redo history
  const pushToHistory = (newElements: Element[], newConnections: Connection[]) => {
    const nextHistory = history.slice(0, historyStep + 1);
    nextHistory.push({ elements: newElements, connections: newConnections });
    setHistory(nextHistory);
    setHistoryStep(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const nextStep = historyStep - 1;
      setHistoryStep(nextStep);
      setElements(history[nextStep].elements);
      setConnections(history[nextStep].connections);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setElements(history[nextStep].elements);
      setConnections(history[nextStep].connections);
    }
  };

  // Add customized element on canvas click/drag
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (tool === "draw") {
      setIsDrawing(true);
      setCurrentDrawPoints([{ x, y }]);
      return;
    }

    if (tool !== "select" && tool !== "connect" && tool !== "eraser") {
      // Add new Shape or Text
      const newElem: Element = {
        id: crypto.randomUUID(),
        type: tool === "rectangle" ? "rectangle" : tool === "circle" ? "circle" : tool === "text" ? "text" : "arrow",
        x,
        y,
        width: tool === "text" ? 120 : 100,
        height: tool === "text" ? 40 : 100,
        label: tool === "text" ? "Double click to edit" : "New Node",
        color: strokeColor,
        fillColor: fillColor
      };
      
      const updated = [...elements, newElem];
      setElements(updated);
      setSelectedId(newElem.id);
      pushToHistory(updated, connections);
      setTool("select"); // Switch to select to allow dragging
    } else {
      // Clear selection if clicking empty canvas
      if (e.target === svgRef.current) {
        setSelectedId(null);
        setConnectFromId(null);
      }
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (tool === "draw" && isDrawing) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setCurrentDrawPoints(prev => [...prev, { x, y }]);
    }

    if (draggingId) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom - dragOffset.x;
      const y = (e.clientY - rect.top) / zoom - dragOffset.y;
      
      setElements(prev => prev.map(el => el.id === draggingId ? { ...el, x, y } : el));
    }
  };

  const handleSvgMouseUp = () => {
    if (tool === "draw" && isDrawing) {
      setIsDrawing(false);
      if (currentDrawPoints.length > 2) {
        // Find bounds of draw path
        const xs = currentDrawPoints.map(p => p.x);
        const ys = currentDrawPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        
        const newElem: Element = {
          id: crypto.randomUUID(),
          type: "draw",
          x: minX,
          y: minY,
          color: strokeColor,
          points: currentDrawPoints.map(p => ({ x: p.x - minX, y: p.y - minY }))
        };
        const updated = [...elements, newElem];
        setElements(updated);
        pushToHistory(updated, connections);
      }
      setCurrentDrawPoints([]);
    }
    if (draggingId) {
      setDraggingId(null);
      pushToHistory(elements, connections);
    }
  };

  // Element interaction Handlers
  const handleElementMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool === "eraser") {
      const updatedElements = elements.filter(el => el.id !== id);
      const updatedConnections = connections.filter(c => c.fromId !== id && c.toId !== id);
      setElements(updatedElements);
      setConnections(updatedConnections);
      pushToHistory(updatedElements, updatedConnections);
      return;
    }

    if (tool === "connect") {
      if (!connectFromId) {
        setConnectFromId(id);
      } else if (connectFromId !== id) {
        // Prevent duplicate connection link
        if (!connections.some(c => (c.fromId === connectFromId && c.toId === id) || (c.fromId === id && c.toId === connectFromId))) {
          const updatedConnections = [...connections, { fromId: connectFromId, toId: id }];
          setConnections(updatedConnections);
          pushToHistory(elements, updatedConnections);
        }
        setConnectFromId(null);
      }
      return;
    }

    setSelectedId(id);
    const elem = elements.find(el => el.id === id);
    if (elem) {
      setDraggingId(id);
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: (e.clientX - rect.left) / zoom - elem.x,
          y: (e.clientY - rect.top) / zoom - elem.y
        });
      }
    }
  };

  // Label Edit
  const handleEditLabel = (id: string) => {
    const newLabel = window.prompt("Enter text label for element:", elements.find(el => el.id === id)?.label || "");
    if (newLabel !== null) {
      const updated = elements.map(el => el.id === id ? { ...el, label: newLabel } : el);
      setElements(updated);
      pushToHistory(updated, connections);
    }
  };

  // Import Highlights from notes OCR memory helper
  const handleImportOCR = () => {
    const tempText = localStorage.getItem("flowtrack_temp_flashcard_input") || 
                     localStorage.getItem("flowtrack_temp_notes_input") || 
                     "Topic Overview, Concept Branch A, Subtheme 1, Evaluation Metrics";

    const topics = tempText
      .split(/[,\.\n]+/)
      .map(t => t.trim())
      .filter(t => t.length > 2 && t.length < 35)
      .slice(0, 7);

    if (topics.length === 0) {
      alert("No highlight notes found in clipboard cache! Copy some text inside Study Workspace first.");
      return;
    }

    const centerX = 380;
    const centerY = 240;
    const rootId = crypto.randomUUID();
    
    // Spawn radial structure
    const newElements: Element[] = [
      { id: rootId, type: "circle", x: centerX, y: centerY, label: topics[0], color: "#38bdf8", fillColor: "rgba(56,189,248,0.15)" }
    ];
    const newConnections: Connection[] = [];

    topics.slice(1).forEach((topic, i) => {
      const id = crypto.randomUUID();
      const angle = (i * 2 * Math.PI) / (topics.length - 1);
      const radius = 170;
      
      newElements.push({
        id,
        type: "rectangle",
        x: centerX + radius * Math.cos(angle) - 50,
        y: centerY + radius * Math.sin(angle) - 30,
        width: 100,
        height: 60,
        label: topic,
        color: STROKE_COLORS[(i + 1) % STROKE_COLORS.length],
        fillColor: "rgba(129,140,248,0.1)"
      });
      newConnections.push({ fromId: rootId, toId: id });
    });

    setElements(newElements);
    setConnections(newConnections);
    pushToHistory(newElements, newConnections);
  };

  const handleResetCanvas = () => {
    if (window.confirm("Do you want to reset the whiteboard canvas?")) {
      setElements([]);
      setConnections([]);
      pushToHistory([], []);
      setSelectedId(null);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header controls bar */}
      <div className="rounded-3xl bg-slate-900/40 p-5 border border-white/5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            🎨 Interactive Whiteboard <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Mind Maps</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Draw, link concepts, select colors, and build visual memory maps offline.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImportOCR}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 text-slate-950 px-4 py-2.5 text-xs font-bold hover:bg-cyan-400 transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Mindmap from OCR</span>
          </button>
          <button
            onClick={handleResetCanvas}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-rose-400 hover:bg-white/10 px-4 py-2.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Whiteboard</span>
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {/* Sidebar styles & properties configuration panel */}
        <Panel className="lg:col-span-1 space-y-4">
          {/* Active node property edit */}
          {selectedId && (
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Modify Selected Concept</span>
              <button
                onClick={() => handleEditLabel(selectedId)}
                className="w-full flex items-center justify-between rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400 transition-all"
              >
                <span>Edit Text Label</span>
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              </button>
              
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>Subject outline:</span>
                <div className="flex gap-1.5">
                  {STROKE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        const updated = elements.map(el => el.id === selectedId ? { ...el, color: c } : el);
                        setElements(updated);
                        pushToHistory(updated, connections);
                      }}
                      className="w-4 h-4 rounded-full border border-white/10 shrink-0"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stroke property settings */}
          <div className="space-y-3.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Drawing Styles</span>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400">Outline color</label>
              <div className="flex flex-wrap gap-1.5">
                {STROKE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setStrokeColor(color)}
                    className={`w-5 h-5 rounded-full border transition-all ${strokeColor === color ? "border-white scale-110" : "border-white/10"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-medium">Background Fill</label>
              <div className="flex flex-wrap gap-1.5">
                {FILL_COLORS.map(col => (
                  <button
                    key={col}
                    onClick={() => setFillColor(col)}
                    className={`w-5 h-5 rounded-md border transition-all ${fillColor === col ? "border-white scale-110" : "border-white/10"}`}
                    style={{ backgroundColor: col === "transparent" ? "rgba(255,255,255,0.05)" : col }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Helper panel */}
          <div className="rounded-2xl bg-white/5 border border-white/5 p-4 text-[10px] text-slate-400 space-y-2">
            <p className="font-bold flex items-center gap-1 text-slate-300"><HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> Canvas Shortcuts:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Double click any element to rewrite its title text.</li>
              <li>Toggle **Connect**, click root element, then click target to draw arrow.</li>
              <li>Use **Eraser** to remove elements and connections.</li>
            </ul>
          </div>
        </Panel>

        {/* Canvas whiteboard main layout container */}
        <Panel className="lg:col-span-3 p-0 relative overflow-hidden bg-slate-950 border border-white/10 flex flex-col h-[560px]">
          {/* Floating Whiteboard Top Toolbar */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-2xl flex items-center gap-1 shadow-2xl z-20 backdrop-blur-md">
            {[
              { id: "select", icon: MousePointer, tooltip: "Select element" },
              { id: "rectangle", icon: Square, tooltip: "Add Rectangle" },
              { id: "circle", icon: CircleIcon, tooltip: "Add Circle" },
              { id: "text", icon: Type, tooltip: "Add Label" },
              { id: "draw", icon: Edit3, tooltip: "Freehand Draw" },
              { id: "connect", icon: Link2, tooltip: "Arrow Connection" },
              { id: "eraser", icon: Trash2, tooltip: "Eraser" },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setTool(item.id as any);
                  setConnectFromId(null);
                }}
                title={item.tooltip}
                className={`p-2 rounded-xl transition-all ${tool === item.id ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <item.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Canvas SVG Area */}
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <svg
              ref={svgRef}
              className="w-full h-full cursor-crosshair select-none bg-slate-950/60"
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
            >
              <g transform={`scale(${zoom})`}>
                {/* Render Connections */}
                {connections.map((conn, idx) => {
                  const fromEl = elements.find(el => el.id === conn.fromId);
                  const toEl = elements.find(el => el.id === conn.toId);
                  if (!fromEl || !toEl) return null;
                  return (
                    <line
                      key={idx}
                      x1={fromEl.x + 50}
                      y1={fromEl.y + 30}
                      x2={toEl.x + 50}
                      y2={toEl.y + 30}
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                    />
                  );
                })}

                {/* Connection helper highlight */}
                {tool === "connect" && connectFromId && (() => {
                  const el = elements.find(e => e.id === connectFromId);
                  if (!el) return null;
                  return (
                    <circle cx={el.x + 50} cy={el.y + 30} r="35" fill="none" stroke="#22d3ee" strokeWidth="2.5" className="animate-pulse" />
                  );
                })()}

                {/* Freehand Draw element preview */}
                {tool === "draw" && isDrawing && currentDrawPoints.length > 1 && (
                  <path
                    d={`M ${currentDrawPoints.map(p => `${p.x} ${p.y}`).join(" L ")}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                  />
                )}

                {/* Render Whiteboard elements */}
                {elements.map(el => {
                  const isSelected = selectedId === el.id;
                  
                  if (el.type === "draw" && el.points) {
                    return (
                      <g
                        key={el.id}
                        transform={`translate(${el.x}, ${el.y})`}
                        className="cursor-pointer"
                        onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                      >
                        <path
                          d={`M ${el.points.map(p => `${p.x} ${p.y}`).join(" L ")}`}
                          fill="none"
                          stroke={isSelected ? "#ffffff" : el.color}
                          strokeWidth={isSelected ? "4" : "2.5"}
                        />
                      </g>
                    );
                  }

                  return (
                    <g
                      key={el.id}
                      transform={`translate(${el.x}, ${el.y})`}
                      className="cursor-pointer select-none"
                      onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                      onDoubleClick={() => handleEditLabel(el.id)}
                    >
                      {el.type === "circle" ? (
                        <circle
                          cx="50"
                          cy="30"
                          r="35"
                          fill={el.fillColor || "transparent"}
                          stroke={isSelected ? "#ffffff" : el.color}
                          strokeWidth={isSelected ? "3" : "1.8"}
                        />
                      ) : (
                        <rect
                          width="100"
                          height="60"
                          rx="8"
                          fill={el.fillColor || "transparent"}
                          stroke={isSelected ? "#ffffff" : el.color}
                          strokeWidth={isSelected ? "3" : "1.8"}
                        />
                      )}
                      
                      {/* Label Text */}
                      <foreignObject x="5" y="5" width="90" height="50">
                        <div className="w-full h-full flex items-center justify-center text-center select-none overflow-hidden">
                          <p className="text-[10px] font-bold text-white leading-tight break-all line-clamp-3">
                            {el.label}
                          </p>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Bottom Zoom & History Undo/Redo actions panel bar */}
          <div className="bg-slate-900 border-t border-white/5 px-4 py-2 flex justify-between items-center z-15">
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                title="Undo"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                title="Redo"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="p-1 rounded-lg text-slate-400 hover:bg-white/5"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                className="p-1 rounded-lg text-slate-400 hover:bg-white/5"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
