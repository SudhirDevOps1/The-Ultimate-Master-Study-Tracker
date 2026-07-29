import { useState, useRef, useEffect, useCallback } from "react";
import {
  MousePointer, Square, Circle as CircleIcon, Type, Edit3, Link2,
  Trash2, Undo2, Redo2, ZoomIn, ZoomOut, HelpCircle, Sparkles,
  RotateCcw, Download, ChevronRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WbElement {
  id: string;
  type: "rect" | "circle" | "text" | "draw";
  x: number; y: number;
  w: number; h: number;
  label: string;
  color: string;
  fill: string;
  fontSize?: number;
  points?: { x: number; y: number }[];
}

interface WbConn {
  id: string;
  fromId: string;
  toId: string;
  color: string;
}

interface HistoryEntry { els: WbElement[]; conns: WbConn[] }

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS  = ["#38bdf8","#818cf8","#c084fc","#f472b6","#4ade80","#facc15","#fb923c","#ffffff","#94a3b8"];
const FILLS   = ["transparent","rgba(56,189,248,.15)","rgba(129,140,248,.15)","rgba(192,132,252,.15)","rgba(74,222,128,.12)","rgba(250,204,21,.12)"];
const STORAGE = "flowtrack_mindmap_v2";

function loadFromStorage(): { els: WbElement[]; conns: WbConn[] } {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { els: [], conns: [] };
}

function saveToStorage(els: WbElement[], conns: WbConn[]) {
  try { localStorage.setItem(STORAGE, JSON.stringify({ els, conns })); } catch { /* ignore */ }
}

// Center of a node
function cx(el: WbElement) { return el.x + el.w / 2; }
function cy(el: WbElement) { return el.y + el.h / 2; }

// Build a smooth bezier path between two nodes
function connPath(a: WbElement, b: WbElement) {
  const x1 = cx(a), y1 = cy(a), x2 = cx(b), y2 = cy(b);
  const dx = Math.abs(x2 - x1) * 0.55;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MindMapPage() {
  const initial = loadFromStorage();
  const [els,   setEls]   = useState<WbElement[]>(initial.els);
  const [conns, setConns] = useState<WbConn[]>(initial.conns);
  const [history, setHistory] = useState<HistoryEntry[]>([{ els: initial.els, conns: initial.conns }]);
  const [histIdx, setHistIdx] = useState(0);

  // Tool & style
  const [tool, setTool]       = useState<"select"|"rect"|"circle"|"text"|"draw"|"connect"|"erase">("select");
  const [strokeC, setStrokeC] = useState(COLORS[0]);
  const [fillC,   setFillC]   = useState(FILLS[0]);
  const [zoom, setZoom]       = useState(1);
  const [pan,  setPan]        = useState({ x: 0, y: 0 });

  // Interaction state
  const [selId,      setSelId]      = useState<string|null>(null);
  const [connFrom,   setConnFrom]   = useState<string|null>(null);
  const [editId,     setEditId]     = useState<string|null>(null);
  const [editText,   setEditText]   = useState("");
  const [dragging,   setDragging]   = useState<{ id: string; ox: number; oy: number }|null>(null);
  const [panning,    setPanning]    = useState<{ sx: number; sy: number; px: number; py: number }|null>(null);
  const [drawPts,    setDrawPts]    = useState<{ x: number; y: number }[]>([]);
  const [isDrawing,  setIsDrawing]  = useState(false);
  const [hoverId,    setHoverId]    = useState<string|null>(null);
  const [toast,      setToast]      = useState<string|null>(null);

  const svgRef     = useRef<SVGSVGElement|null>(null);
  const editRef    = useRef<HTMLTextAreaElement|null>(null);

  // ── Persist on change ──────────────────────────────────────────────────────
  useEffect(() => { saveToStorage(els, conns); }, [els, conns]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // ── History ───────────────────────────────────────────────────────────────
  const push = useCallback((newEls: WbElement[], newConns: WbConn[]) => {
    setHistory(h => {
      const next = h.slice(0, histIdx + 1);
      next.push({ els: newEls, conns: newConns });
      if (next.length > 60) next.shift();
      setHistIdx(next.length - 1);
      return next;
    });
  }, [histIdx]);

  const undo = () => {
    if (histIdx <= 0) return;
    const prev = history[histIdx - 1];
    setEls(prev.els); setConns(prev.conns);
    setHistIdx(histIdx - 1); setSelId(null);
  };
  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const next = history[histIdx + 1];
    setEls(next.els); setConns(next.conns);
    setHistIdx(histIdx + 1); setSelId(null);
  };

  // ── Coordinate transform ──────────────────────────────────────────────────
  const svgPt = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    };
  };

  // ── SVG mouse events ──────────────────────────────────────────────────────
  const onSvgDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current && (e.target as Element).tagName !== "svg") return;

    // Middle-click or space+click → pan
    if (e.button === 1 || (e.button === 0 && tool === "select" && e.altKey)) {
      setPanning({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y });
      return;
    }

    const pt = svgPt(e.clientX, e.clientY);

    if (tool === "draw") {
      setIsDrawing(true); setDrawPts([pt]); return;
    }
    if (tool === "select") {
      setSelId(null); return;
    }
    if (tool === "rect" || tool === "circle" || tool === "text") {
      const w = tool === "text" ? 140 : 120;
      const h = tool === "text" ? 44  : 70;
      const newEl: WbElement = {
        id: crypto.randomUUID(), type: tool === "rect" ? "rect" : tool === "circle" ? "circle" : "text",
        x: pt.x - w / 2, y: pt.y - h / 2, w, h,
        label: tool === "text" ? "Label" : "Node",
        color: strokeC, fill: fillC,
      };
      const next = [...els, newEl];
      setEls(next); setSelId(newEl.id);
      push(next, conns);
      setTool("select");
    }
  };

  const onSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (panning) {
      setPan({ x: panning.px + e.clientX - panning.sx, y: panning.py + e.clientY - panning.sy });
      return;
    }
    if (isDrawing) {
      const pt = svgPt(e.clientX, e.clientY);
      setDrawPts(p => [...p, pt]); return;
    }
    if (dragging) {
      const pt = svgPt(e.clientX, e.clientY);
      setEls(prev => prev.map(el => el.id === dragging.id
        ? { ...el, x: pt.x - dragging.ox, y: pt.y - dragging.oy } : el));
    }
  };

  const onSvgUp = () => {
    if (panning) { setPanning(null); return; }
    if (isDrawing) {
      setIsDrawing(false);
      if (drawPts.length > 3) {
        const xs = drawPts.map(p => p.x), ys = drawPts.map(p => p.y);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const maxX = Math.max(...xs), maxY = Math.max(...ys);
        const newEl: WbElement = {
          id: crypto.randomUUID(), type: "draw",
          x: minX, y: minY, w: maxX - minX, h: maxY - minY,
          label: "", color: strokeC, fill: "none",
          points: drawPts.map(p => ({ x: p.x - minX, y: p.y - minY })),
        };
        const next = [...els, newEl];
        setEls(next); push(next, conns);
      }
      setDrawPts([]); return;
    }
    if (dragging) { push(els, conns); setDragging(null); }
  };

  // ── Element interactions ──────────────────────────────────────────────────
  const onElDown = (el: WbElement, e: React.MouseEvent) => {
    e.stopPropagation();

    if (tool === "erase") {
      const nextEls   = els.filter(x => x.id !== el.id);
      const nextConns = conns.filter(c => c.fromId !== el.id && c.toId !== el.id);
      setEls(nextEls); setConns(nextConns); push(nextEls, nextConns);
      setSelId(null); return;
    }
    if (tool === "connect") {
      if (!connFrom) { setConnFrom(el.id); showToast("Now click the target node to connect →"); return; }
      if (connFrom === el.id) { setConnFrom(null); return; }
      if (!conns.some(c => (c.fromId === connFrom && c.toId === el.id) || (c.fromId === el.id && c.toId === connFrom))) {
        const newConn: WbConn = { id: crypto.randomUUID(), fromId: connFrom, toId: el.id, color: strokeC };
        const next = [...conns, newConn];
        setConns(next); push(els, next);
        showToast("✅ Connection created!");
      } else {
        showToast("⚠️ Connection already exists.");
      }
      setConnFrom(null); return;
    }

    setSelId(el.id);
    const pt = svgPt(e.clientX, e.clientY);
    setDragging({ id: el.id, ox: pt.x - el.x, oy: pt.y - el.y });
  };

  const onElDblClick = (el: WbElement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(el.id);
    setEditText(el.label);
    setTimeout(() => editRef.current?.focus(), 30);
  };

  const commitEdit = () => {
    if (!editId) return;
    const next = els.map(el => el.id === editId ? { ...el, label: editText } : el);
    setEls(next); push(next, conns);
    setEditId(null);
  };

  // ── Delete selected ───────────────────────────────────────────────────────
  const deleteSelected = () => {
    if (!selId) return;
    const nextEls   = els.filter(el => el.id !== selId);
    const nextConns = conns.filter(c => c.fromId !== selId && c.toId !== selId);
    setEls(nextEls); setConns(nextConns); push(nextEls, nextConns);
    setSelId(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (editId) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "Escape") { setSelId(null); setConnFrom(null); setTool("select"); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [editId, selId, histIdx, history]);

  // ── Update selected style ──────────────────────────────────────────────────
  const updateSel = (patch: Partial<WbElement>) => {
    if (!selId) return;
    const next = els.map(el => el.id === selId ? { ...el, ...patch } : el);
    setEls(next); push(next, conns);
  };

  // ── Generate mindmap from OCR ─────────────────────────────────────────────
  const handleImportOCR = () => {
    const raw = localStorage.getItem("flowtrack_temp_flashcard_input")
              || localStorage.getItem("flowtrack_temp_notes_input")
              || "";
    const topics = raw
      .split(/[,.\n;]+/)
      .map(t => t.trim())
      .filter(t => t.length > 2 && t.length < 50)
      .slice(0, 8);

    if (topics.length === 0) {
      showToast("❌ No notes found! Open Study Workspace and OCR a PDF first.");
      return;
    }

    const rootId = crypto.randomUUID();
    const cX = 420, cY = 280, radius = 200;
    const newEls: WbElement[] = [
      { id: rootId, type: "circle", x: cX - 60, y: cY - 40, w: 120, h: 80,
        label: topics[0] || "Root Topic", color: "#38bdf8", fill: "rgba(56,189,248,.2)" }
    ];
    const newConns: WbConn[] = [];

    topics.slice(1).forEach((topic, i) => {
      const id  = crypto.randomUUID();
      const ang = (i * 2 * Math.PI) / (topics.length - 1);
      const nx  = cX + radius * Math.cos(ang) - 60;
      const ny  = cY + radius * Math.sin(ang) - 30;
      newEls.push({ id, type: "rect", x: nx, y: ny, w: 120, h: 60,
        label: topic, color: COLORS[(i + 1) % COLORS.length], fill: FILLS[(i % FILLS.length)] });
      newConns.push({ id: crypto.randomUUID(), fromId: rootId, toId: id, color: "#94a3b8" });
    });

    setEls(newEls); setConns(newConns);
    push(newEls, newConns);
    showToast(`✅ Generated mindmap with ${newEls.length} nodes!`);
  };

  const handleReset = () => {
    setEls([]); setConns([]); push([], []); setSelId(null);
    showToast("🗑️ Canvas cleared.");
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svg   = svgRef.current.outerHTML;
    const blob  = new Blob([svg], { type: "image/svg+xml" });
    const a     = document.createElement("a");
    a.href      = URL.createObjectURL(blob);
    a.download  = `mindmap-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("📥 SVG exported!");
  };

  const selEl = els.find(el => el.id === selId);

  const TOOLS = [
    { id: "select",  icon: MousePointer, tip: "Select & Drag (V)" },
    { id: "rect",    icon: Square,       tip: "Add Rectangle (R)" },
    { id: "circle",  icon: CircleIcon,   tip: "Add Circle (C)" },
    { id: "text",    icon: Type,         tip: "Add Text (T)" },
    { id: "draw",    icon: Edit3,        tip: "Freehand Draw (D)" },
    { id: "connect", icon: Link2,        tip: "Connect Nodes (L)" },
    { id: "erase",   icon: Trash2,       tip: "Erase Element (E)" },
  ];

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-80px)] pb-4 select-none">
      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 border border-white/10 text-white text-xs font-semibold px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in">
          {toast}
        </div>
      )}

      {/* ── Inline Text Editor ────────────────────────────────────────── */}
      {editId && (() => {
        const el = els.find(x => x.id === editId);
        if (!el) return null;
        const sx = el.x * zoom + pan.x;
        const sy = el.y * zoom + pan.y;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={commitEdit}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[240px]" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Edit Label</p>
              <textarea
                ref={editRef}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); } if (e.key === "Escape") setEditId(null); }}
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-xl text-white text-sm p-2.5 resize-none outline-none focus:border-cyan-400 transition-colors"
                placeholder="Enter text..."
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => setEditId(null)} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={commitEdit} className="text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 px-4 py-1.5 rounded-lg transition-colors">Save</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            🧠 <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Mind Map Whiteboard</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Draw, connect & organize ideas. Auto-saved. Double-click nodes to edit.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleImportOCR}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 text-slate-950 px-3.5 py-2 text-xs font-bold hover:bg-cyan-400 transition-all shadow-md active:scale-95">
            <Sparkles className="w-3.5 h-3.5" /> Generate from OCR
          </button>
          <button onClick={handleExportSVG}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/10 px-3.5 py-2 transition-all">
            <Download className="w-3.5 h-3.5" /> Export SVG
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 px-3.5 py-2 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* ── Main Layout ──────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left Sidebar */}
        <div className="w-52 shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* Tools */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tools</p>
            <div className="grid grid-cols-4 gap-1">
              {TOOLS.map(t => (
                <button key={t.id} onClick={() => { setTool(t.id as any); setConnFrom(null); }}
                  title={t.tip}
                  className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl transition-all text-[8px] font-bold ${
                    tool === t.id ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            {connFrom && (
              <p className="text-[9px] text-cyan-400 mt-2 text-center animate-pulse font-semibold">
                Click target node to connect →
              </p>
            )}
          </div>

          {/* Colors */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 space-y-3">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Stroke Color</p>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => { setStrokeC(c); if (selEl) updateSel({ color: c }); }}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${strokeC === c ? "border-white scale-125 shadow-lg" : "border-transparent hover:border-white/40"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Fill Color</p>
            <div className="flex flex-wrap gap-1.5">
              {FILLS.map((c, i) => (
                <button key={i} onClick={() => { setFillC(c); if (selEl) updateSel({ fill: c }); }}
                  className={`w-5 h-5 rounded-md border-2 transition-all ${fillC === c ? "border-white scale-125" : "border-transparent hover:border-white/40"}`}
                  style={{ background: c === "transparent" ? "rgba(255,255,255,.06)" : c }} />
              ))}
            </div>
          </div>

          {/* Selected node properties */}
          {selEl && (
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 space-y-2">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Selected Node</p>
              <p className="text-[10px] text-slate-300 font-semibold truncate">{selEl.label || "(no label)"}</p>
              <button onClick={() => onElDblClick(selEl, { stopPropagation: () => {} } as any)}
                className="w-full text-[10px] font-bold rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/50 text-slate-300 hover:text-white py-1.5 transition-all flex items-center justify-between px-2.5">
                <span>Edit Label</span><ChevronRight className="w-3 h-3" />
              </button>
              <button onClick={deleteSelected}
                className="w-full text-[10px] font-bold rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 py-1.5 transition-all flex items-center justify-between px-2.5">
                <span>Delete</span><Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Help */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-cyan-500" /> Shortcuts
            </p>
            <ul className="space-y-1 text-[9px] text-slate-500 leading-relaxed">
              <li>• <b className="text-slate-400">Dbl-click</b> node → edit label</li>
              <li>• <b className="text-slate-400">Del / Backspace</b> → delete selected</li>
              <li>• <b className="text-slate-400">Ctrl+Z / Y</b> → undo / redo</li>
              <li>• <b className="text-slate-400">Esc</b> → cancel / deselect</li>
              <li>• <b className="text-slate-400">L tool</b> → click A then B to connect</li>
              <li>• Auto-saved to local storage 💾</li>
            </ul>
          </div>

          {/* Stats */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Canvas Info</p>
            <div className="space-y-1 text-[10px] text-slate-400">
              <div className="flex justify-between"><span>Nodes</span><span className="font-bold text-white">{els.length}</span></div>
              <div className="flex justify-between"><span>Connections</span><span className="font-bold text-white">{conns.length}</span></div>
              <div className="flex justify-between"><span>History steps</span><span className="font-bold text-white">{histIdx}/{history.length - 1}</span></div>
            </div>
          </div>
        </div>

        {/* ── Canvas ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-white/10 overflow-hidden bg-slate-950 shadow-2xl">

          {/* Bottom zoom/undo bar at top */}
          <div className="bg-slate-900/80 border-b border-white/5 px-4 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={undo} disabled={histIdx <= 0} title="Undo (Ctrl+Z)"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 transition-all">
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={redo} disabled={histIdx >= history.length - 1} title="Redo (Ctrl+Y)"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 transition-all">
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              {selId && (
                <button onClick={deleteSelected} title="Delete Selected (Del)"
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-mono font-bold">
              <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1)))}
                className="p-1 rounded hover:bg-white/5 transition-all"><ZoomOut className="w-3.5 h-3.5" /></button>
              <button onClick={() => setZoom(1)} className="w-12 text-center hover:text-white cursor-pointer transition-colors">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))}
                className="p-1 rounded hover:bg-white/5 transition-all"><ZoomIn className="w-3.5 h-3.5" /></button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button onClick={() => setPan({ x: 0, y: 0 })} className="text-[9px] hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-all">Reset Pan</button>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="flex-1 relative overflow-hidden"
            style={{ cursor: tool === "select" ? (dragging ? "grabbing" : "default") : tool === "draw" ? "crosshair" : tool === "erase" ? "not-allowed" : "crosshair" }}>

            {/* Empty state */}
            {els.length === 0 && !isDrawing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                <div className="text-6xl opacity-20">🧠</div>
                <p className="text-sm text-slate-600 font-semibold">Canvas is empty</p>
                <p className="text-xs text-slate-700 max-w-xs text-center">Select a shape tool and click anywhere to add nodes. Use <b className="text-slate-600">Generate from OCR</b> for instant mind maps.</p>
              </div>
            )}

            {/* Dot grid background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.25 }}>
              <defs>
                <pattern id="dots" width={24 * zoom} height={24 * zoom} x={pan.x % (24 * zoom)} y={pan.y % (24 * zoom)} patternUnits="userSpaceOnUse">
                  <circle cx={12 * zoom} cy={12 * zoom} r="1" fill="#475569" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>

            <svg
              ref={svgRef}
              className="absolute inset-0 w-full h-full"
              onMouseDown={onSvgDown}
              onMouseMove={onSvgMove}
              onMouseUp={onSvgUp}
              onMouseLeave={onSvgUp}
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
                </marker>
                {COLORS.map(c => (
                  <marker key={c} id={`arr-${c.replace("#","")}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L8,3 z" fill={c} />
                  </marker>
                ))}
              </defs>

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

                {/* Grid guides (optional visual) */}

                {/* Connections */}
                {conns.map(conn => {
                  const a = els.find(e => e.id === conn.fromId);
                  const b = els.find(e => e.id === conn.toId);
                  if (!a || !b) return null;
                  const col = conn.color || "#94a3b8";
                  const mId = `arr-${col.replace("#", "")}`;
                  return (
                    <path key={conn.id}
                      d={connPath(a, b)}
                      stroke={col} strokeWidth="2" fill="none"
                      strokeOpacity="0.7"
                      markerEnd={`url(#${mId})`}
                      className="pointer-events-none"
                    />
                  );
                })}

                {/* Live freehand draw preview */}
                {isDrawing && drawPts.length > 1 && (
                  <path d={`M${drawPts.map(p => `${p.x} ${p.y}`).join("L")}`}
                    stroke={strokeC} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Elements */}
                {els.map(el => {
                  const isSel  = selId === el.id;
                  const isHov  = hoverId === el.id;
                  const isFrom = connFrom === el.id;

                  if (el.type === "draw" && el.points) {
                    const d = `M${el.points.map(p => `${p.x} ${p.y}`).join("L")}`;
                    return (
                      <g key={el.id} transform={`translate(${el.x},${el.y})`}
                        onMouseDown={e => onElDown(el, e)} onDoubleClick={e => onElDblClick(el, e)}
                        onMouseEnter={() => setHoverId(el.id)} onMouseLeave={() => setHoverId(null)}
                        style={{ cursor: "pointer" }}>
                        <path d={d} stroke={isSel ? "#fff" : el.color} strokeWidth={isSel ? 3.5 : 2.5}
                          fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        {isSel && <path d={d} stroke="#38bdf8" strokeWidth="1" fill="none" opacity="0.4" />}
                      </g>
                    );
                  }

                  return (
                    <g key={el.id} transform={`translate(${el.x},${el.y})`}
                      onMouseDown={e => onElDown(el, e)} onDoubleClick={e => onElDblClick(el, e)}
                      onMouseEnter={() => setHoverId(el.id)} onMouseLeave={() => setHoverId(null)}
                      style={{ cursor: tool === "erase" ? "not-allowed" : "move" }}>

                      {/* Shadow for selected/hovered */}
                      {(isSel || isFrom) && (
                        el.type === "circle"
                          ? <ellipse cx={el.w/2} cy={el.h/2} rx={el.w/2 + 5} ry={el.h/2 + 5} fill="none" stroke={isFrom ? "#22d3ee" : "#ffffff"} strokeWidth="2.5" opacity="0.5" className="animate-pulse" />
                          : <rect x="-5" y="-5" width={el.w + 10} height={el.h + 10} rx="12" fill="none" stroke={isFrom ? "#22d3ee" : "#ffffff"} strokeWidth="2.5" opacity="0.5" className="animate-pulse" />
                      )}

                      {/* Shape body */}
                      {el.type === "circle" ? (
                        <ellipse cx={el.w/2} cy={el.h/2} rx={el.w/2} ry={el.h/2}
                          fill={el.fill || "transparent"} stroke={el.color} strokeWidth={isSel ? 3 : 2} />
                      ) : (
                        <rect width={el.w} height={el.h} rx="10"
                          fill={el.fill || "transparent"} stroke={el.type === "text" ? "rgba(255,255,255,0.15)" : el.color}
                          strokeWidth={isSel ? 3 : el.type === "text" ? 1 : 2}
                          strokeDasharray={el.type === "text" ? "4 3" : undefined} />
                      )}

                      {/* Label text via foreignObject */}
                      <foreignObject x="4" y="4" width={el.w - 8} height={el.h - 8}>
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-center text-[11px] font-bold text-white leading-tight break-words line-clamp-4 px-1 select-none">
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
        </div>
      </div>
    </div>
  );
}
