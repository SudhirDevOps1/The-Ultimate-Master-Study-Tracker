/**
 * FabricWhiteboard — a clean, single-file, Excalidraw-style infinite whiteboard.
 *
 * • Zero external component imports; everything (toolbar, panels, engine,
 *   history, export) lives here.
 * • One canvas init effect that runs exactly once; state flows into the engine
 *   through a single `live` ref so no handlers ever go stale.
 * • Custom render passes for the grid (viewport-tracking pattern) and the
 *   fading laser trail (no fabric objects, no history noise).
 * • Full drag-to-draw with live preview, Shift-constrained shapes, drag
 *   eraser, lasso selection, Excalidraw sketchy hand-drawn mode, pan/zoom (mouse, trackpad, pinch), touch/stylus support,
 *   clipboard paste, and a 60-step undo/redo history with autosave.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as fabric from "fabric";
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Minimize2, Menu, Download,
  Upload, Trash2, Grid3x3, Magnet, ChevronDown, Scan, Palette, FileImage,
  FileJson, FileCode2, Keyboard, MousePointer2, LassoSelect, Hand, Pencil, Highlighter,
  Zap, Eraser, Square, Circle, Diamond, Minus, ArrowRight, Type, StickyNote,
  ImagePlus, Lock, Unlock, BringToFront, SendToBack, Copy, Ban, X, Sparkles,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                         */
/* -------------------------------------------------------------------------- */

type Tool =
  | "select" | "lasso" | "pan" | "pen" | "marker" | "laser" | "eraser"
  | "rect" | "ellipse" | "diamond" | "line" | "arrow" | "text" | "note";

interface Theme {
  id: string; name: string; page: string; grid: string;
  gtype: "dots" | "lines" | "none"; ink: string; isDark: boolean;
}

const SHAPE_TOOLS = new Set<Tool>(["rect", "ellipse", "diamond", "line", "arrow"]);
const DRAW_TOOLS  = new Set<Tool>(["pen", "marker"]);
const TEXT_TYPES  = new Set(["i-text", "text", "textbox"]);

const GRID = 20;
const LASER_MS = 900;
const MAX_HIST = 60;
const AUTOSAVE_MS = 500;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 8;

const THEMES: Theme[] = [
  { id: "midnight",  name: "Midnight",   page: "#0b1120", grid: "rgba(148,163,184,0.30)", gtype: "dots",  ink: "#f8fafc", isDark: true  },
  { id: "graph",     name: "Graph",      page: "#0b1120", grid: "rgba(148,163,184,0.18)", gtype: "lines", ink: "#f8fafc", isDark: true  },
  { id: "oled",      name: "OLED",       page: "#000000", grid: "rgba(0,0,0,0)",           gtype: "none",  ink: "#f8fafc", isDark: true  },
  { id: "chalkboard",name: "Chalkboard", page: "#062a1d", grid: "rgba(16,185,129,0.24)",  gtype: "dots",  ink: "#ecfdf5", isDark: true  },
  { id: "blueprint", name: "Blueprint",  page: "#0d2748", grid: "rgba(125,211,252,0.22)", gtype: "lines", ink: "#e0f2fe", isDark: true  },
  { id: "white",     name: "Classic",    page: "#ffffff", grid: "rgba(100,116,139,0.28)", gtype: "dots",  ink: "#0f172a", isDark: false },
  { id: "paper",     name: "Warm Paper", page: "#faf6ee", grid: "rgba(180,138,88,0.28)",  gtype: "lines", ink: "#3f2d1c", isDark: false },
];

const STROKES = ["#f97316", "#ffffff", "#0f172a", "#ef4444", "#ec4899", "#a855f7", "#3b82f6", "#06b6d4", "#22c55e", "#eab308"];
const FILLS   = ["transparent", "#f9731633", "#ef444433", "#22c55e33", "#06b6d433", "#3b82f633", "#eab30833", "#8b5cf633", "#94a3b833"];

const FONTS = [
  { name: "Kalam (Notebook)",        family: "'Kalam', cursive" },
  { name: "Caveat (Marker)",          family: "'Caveat', cursive" },
  { name: "Architect (Draft)",        family: "'Architects Daughter', cursive" },
  { name: "Pacifico (Brush)",         family: "'Pacifico', cursive" },
  { name: "Dancing Script (Cursive)", family: "'Dancing Script', cursive" },
  { name: "Indie Flower (Casual)",    family: "'Indie Flower', cursive" },
  { name: "Patrick Hand (Class)",     family: "'Patrick Hand', cursive" },
  { name: "Shadows (Light)",          family: "'Shadows Into Light', cursive" },
  { name: "Gloria Hallelujah",        family: "'Gloria Hallelujah', cursive" },
  { name: "Amatic SC (Tall)",         family: "'Amatic SC', cursive" },
  { name: "Satisfy (Calligraphy)",    family: "'Satisfy', cursive" },
  { name: "Permanent Marker",         family: "'Permanent Marker', cursive" },
  { name: "Clean Sans",               family: "Inter, system-ui, sans-serif" },
  { name: "Code Mono",                family: "'JetBrains Mono', 'Courier New', monospace" },
];

const DASHES: Record<string, number[] | undefined> = {
  solid: undefined, dashed: [12, 9], dotted: [1, 7],
};

const KEYS: Record<string, Tool> = {
  v: "select", q: "lasso", h: "pan", p: "pen", m: "marker", x: "laser", e: "eraser",
  r: "rect", o: "ellipse", d: "diamond", l: "line", a: "arrow", t: "text", n: "note",
};

interface ToolMeta { id: Tool; icon: typeof MousePointer2; label: string; key: string; accent: string; }
const TOOLS: ToolMeta[] = [
  { id: "select",  icon: MousePointer2, label: "Select",   key: "V", accent: "bg-white/95 text-slate-900" },
  { id: "lasso",   icon: LassoSelect,   label: "Lasso",    key: "Q", accent: "bg-indigo-500 text-white" },
  { id: "pan",     icon: Hand,          label: "Pan",      key: "H", accent: "bg-emerald-400 text-slate-950" },
  { id: "pen",     icon: Pencil,        label: "Pen",      key: "P", accent: "bg-rose-500 text-white" },
  { id: "marker",  icon: Highlighter,   label: "Marker",   key: "M", accent: "bg-amber-400 text-slate-950" },
  { id: "laser",   icon: Zap,           label: "Laser",    key: "X", accent: "bg-red-500 text-white" },
  { id: "eraser",  icon: Eraser,        label: "Eraser",   key: "E", accent: "bg-slate-200 text-slate-900" },
  { id: "rect",    icon: Square,        label: "Rectangle",key: "R", accent: "bg-cyan-400 text-slate-950" },
  { id: "ellipse", icon: Circle,        label: "Ellipse",  key: "O", accent: "bg-cyan-400 text-slate-950" },
  { id: "diamond", icon: Diamond,       label: "Diamond",  key: "D", accent: "bg-cyan-400 text-slate-950" },
  { id: "line",    icon: Minus,         label: "Line",     key: "L", accent: "bg-cyan-400 text-slate-950" },
  { id: "arrow",   icon: ArrowRight,    label: "Arrow",    key: "A", accent: "bg-cyan-400 text-slate-950" },
  { id: "text",    icon: Type,          label: "Text",     key: "T", accent: "bg-violet-500 text-white" },
  { id: "note",    icon: StickyNote,    label: "Note",     key: "N", accent: "bg-amber-400 text-slate-950" },
];

const SHORTCUTS: [string, string][] = [
  ["V","Select"],["Q","Lasso Select"],["H","Pan"],["P","Pen"],["M","Marker"],["X","Laser"],["E","Eraser"],
  ["R","Rectangle"],["O","Ellipse"],["D","Diamond"],["L","Line"],["A","Arrow"],
  ["T","Text"],["N","Note"],["Space","Hold to pan"],
  ["Ctrl+Z","Undo"],["Ctrl+Shift+Z","Redo"],["Ctrl+D","Duplicate"],
  ["Ctrl+C / V","Copy / paste"],["Ctrl+A","Select all"],["Delete","Delete"],
  ["Ctrl+0","Reset zoom"],["Ctrl+1","Zoom to fit"],
  ["Shift+drag","Constrain"],["Alt+drag","Pan canvas"],
];

/* -------------------------------------------------------------------------- */
/*  Pure helpers                                                              */
/* -------------------------------------------------------------------------- */

const isTextObj  = (o?: fabric.Object | null) => !!o && TEXT_TYPES.has(o.type);
const isShape    = (t: Tool) => SHAPE_TOOLS.has(t);
const isDraw     = (t: Tool) => DRAW_TOOLS.has(t);
const clamp      = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isHex6     = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

const pointInPoly = (p: { x: number; y: number }, poly: { x: number; y: number }[]) => {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-10) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const arrowPathD = (ax: number, ay: number, bx: number, by: number, w: number) => {
  const ang = Math.atan2(by - ay, bx - ax);
  const len = Math.hypot(bx - ax, by - ay);
  const k = clamp(10 + w * 1.4, 8, Math.max(8, len * 0.45));
  const a1 = ang - Math.PI / 7, a2 = ang + Math.PI / 7;
  return `M ${ax} ${ay} L ${bx} ${by} `
       + `M ${bx - k * Math.cos(a1)} ${by - k * Math.sin(a1)} `
       + `L ${bx} ${by} `
       + `L ${bx - k * Math.cos(a2)} ${by - k * Math.sin(a2)}`;
};

const cursorFor = (t: Tool) =>
  t === "pan"    ? "grab"
  : t === "eraser" ? "cell"
  : t === "text" ? "text"
  : t === "select" ? "default"
  : "crosshair";

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export interface FabricWhiteboardProps { storageKey?: string; }
export const DEFAULT_STORAGE_KEY = "excalidraw_board_v1";

interface LaserPt { x: number; y: number; t: number; }

interface LiveState {
  tool: Tool; locked: boolean; showGrid: boolean; snap: boolean; theme: Theme;
  stroke: string; fill: string; width: number; style: string; opacity: number;
  font: string; size: number; sketchy: boolean;
}

export function FabricWhiteboard({ storageKey = DEFAULT_STORAGE_KEY }: FabricWhiteboardProps) {
  const { showToast } = useToast();

  /* --- DOM refs --------------------------------------------------------- */
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fcRef = useRef<fabric.Canvas | null>(null);
  const imgFileRef = useRef<HTMLInputElement | null>(null);
  const jsonFileRef = useRef<HTMLInputElement | null>(null);

  /* --- Reactive state (drives UI + panels) ----------------------------- */
  const [tool, setTool] = useState<Tool>("pen");
  const [locked, setLocked] = useState(false);
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(false);
  const [sketchy, setSketchy] = useState(false);

  const [stroke, setStroke] = useState(THEMES[0].ink);
  const [fill, setFill] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeStyle, setStrokeStyle] = useState("solid");
  const [opacity, setOpacity] = useState(1);
  const [fontFamily, setFontFamily] = useState(FONTS[0].family);
  const [fontSize, setFontSize] = useState(24);

  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSel, setHasSel] = useState(false);
  const [selIsText, setSelIsText] = useState(false);

  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const theme = useMemo(() => THEMES.find(t => t.id === themeId) ?? THEMES[0], [themeId]);

  /* --- Single live ref: engine always sees latest values --------------- */
  const live = useRef<LiveState>({
    tool, locked, showGrid, snap, theme,
    stroke, fill, width: strokeWidth, style: strokeStyle, opacity,
    font: fontFamily, size: fontSize, sketchy,
  });
  useEffect(() => {
    live.current = {
      tool, locked, showGrid, snap, theme,
      stroke, fill, width: strokeWidth, style: strokeStyle, opacity,
      font: fontFamily, size: fontSize, sketchy,
    };
  });

  /* --- History --------------------------------------------------------- */
  const histRef = useRef<string[]>([]);
  const idxRef = useRef(-1);
  const suspendRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const persist = useCallback((json: string) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, json); } catch { /* quota */ }
    }, AUTOSAVE_MS);
  }, [storageKey]);

  const pushHistory = useCallback(() => {
    const c = fcRef.current;
    if (!c || suspendRef.current) return;
    const json = JSON.stringify(c.toJSON());
    if (histRef.current[idxRef.current] === json) return;
    histRef.current = histRef.current.slice(0, idxRef.current + 1);
    histRef.current.push(json);
    if (histRef.current.length > MAX_HIST) histRef.current.shift();
    idxRef.current = histRef.current.length - 1;
    setCanUndo(idxRef.current > 0);
    setCanRedo(false);
    persist(json);
  }, [persist]);

  const loadJSON = useCallback(async (json: string) => {
    const c = fcRef.current;
    if (!c) return;
    suspendRef.current = true;
    c.discardActiveObject();
    await c.loadFromJSON(json);
    c.requestRenderAll();
    suspendRef.current = false;
    setHasSel(false);
    setSelIsText(false);
    persist(json);
  }, [persist]);

  const undo = useCallback(async () => {
    if (idxRef.current <= 0) return;
    idxRef.current -= 1;
    await loadJSON(histRef.current[idxRef.current]);
    setCanUndo(idxRef.current > 0);
    setCanRedo(true);
  }, [loadJSON]);

  const redo = useCallback(async () => {
    if (idxRef.current >= histRef.current.length - 1) return;
    idxRef.current += 1;
    await loadJSON(histRef.current[idxRef.current]);
    setCanUndo(true);
    setCanRedo(idxRef.current < histRef.current.length - 1);
  }, [loadJSON]);

  const mutateSelection = useCallback((fn: (o: fabric.Object) => void) => {
    const c = fcRef.current;
    if (!c) return false;
    const objs = c.getActiveObjects();
    if (!objs.length) return false;
    objs.forEach(fn);
    c.requestRenderAll();
    pushHistory();
    return true;
  }, [pushHistory]);

  /* --- Callback refs (so the once-only keyboard handler is always fresh) */
  const cbs = useRef({
    undo, redo,
    duplicate:  async () => { /* set below */ },
    copy:       async () => { /* set below */ },
    paste:      async () => { /* set below */ },
    deleteSel:  () => { /* set below */ },
    resetView:  () => { /* set below */ },
    fitView:    () => { /* set below */ },
    selectAll:  () => { /* set below */ },
  });

  /* ============================================================ ENGINE == */
  useEffect(() => {
    const el = canvasElRef.current, host = hostRef.current;
    if (!el || !host) return;

    if (!document.getElementById("wb-fonts")) {
      const l = document.createElement("link");
      l.id = "wb-fonts";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&family=Architects+Daughter&family=Caveat:wght@500;700&family=Dancing+Script:wght@600&family=Gloria+Hallelujah&family=Indie+Flower&family=Kalam:wght@400;700&family=Pacifico&family=Patrick+Hand&family=Permanent+Marker&family=Satisfy&family=Shadows+Into+Light&family=Inter:wght@500;700&family=JetBrains+Mono&display=swap";
      document.head.appendChild(l);
    }
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        fcRef.current?.requestRenderAll();
      });
    }

    const c = new fabric.Canvas(el, {
      width: host.clientWidth || 1200,
      height: host.clientHeight || 700,
      backgroundColor: "",
      preserveObjectStacking: true,
      selection: true,
      selectionColor: "rgba(6,182,212,0.12)",
      selectionBorderColor: "#22d3ee",
      selectionLineWidth: 1,
      enableRetinaScaling: true,
      allowTouchScrolling: false,
      fireRightClick: true,
      stopContextMenu: true,
    });
    fcRef.current = c;

    fabric.Object.prototype.set({
      cornerColor: "#ffffff",
      cornerStrokeColor: "#22d3ee",
      cornerStyle: "circle",
      cornerSize: 9,
      transparentCorners: false,
      borderColor: "#22d3ee",
      borderScaleFactor: 1.4,
      padding: 4,
    });

    const brush = new fabric.PencilBrush(c);
    brush.decimate = 3;
    brush.strokeLineCap = "round";
    brush.strokeLineJoin = "round";
    c.freeDrawingBrush = brush;

    /* ---- Grid: cached pattern that tracks viewport ----------------- */
    const patCache = new Map<string, CanvasPattern | null>();
    const makePattern = (
      ctx: CanvasRenderingContext2D, size: number, color: string, type: "dots" | "lines" | "none",
    ): CanvasPattern | null => {
      const key = `${size}|${color}|${type}`;
      const cached = patCache.get(key);
      if (cached !== undefined) return cached;
      const s = Math.max(4, Math.round(size));
      const tile = document.createElement("canvas");
      tile.width = tile.height = s;
      const tx = tile.getContext("2d");
      if (!tx) { patCache.set(key, null); return null; }
      if (type === "dots") {
        tx.fillStyle = color;
        tx.beginPath();
        tx.arc(1.25, 1.25, 1.25, 0, Math.PI * 2);
        tx.fill();
      } else if (type === "lines") {
        tx.strokeStyle = color;
        tx.lineWidth = 1;
        tx.beginPath();
        tx.moveTo(0.5, 0); tx.lineTo(0.5, s);
        tx.moveTo(0, 0.5); tx.lineTo(s, 0.5);
        tx.stroke();
      }
      const pat = ctx.createPattern(tile, "repeat");
      patCache.set(key, pat);
      return pat;
    };

    c.on("before:render", (opt) => {
      const ctx = (opt as unknown as { ctx: CanvasRenderingContext2D }).ctx;
      if (!ctx || ctx !== c.getContext()) return;
      const { showGrid, theme } = live.current;
      if (!showGrid || theme.gtype === "none") return;
      const vpt = c.viewportTransform;
      let size = GRID * c.getZoom();
      while (size < 12) size *= 2;
      while (size > 96) size /= 2;
      const sq = Math.max(4, Math.round(size));
      const pat = makePattern(ctx, sq, theme.grid, theme.gtype);
      if (!pat) return;
      let ox = vpt[4] % sq, oy = vpt[5] % sq;
      if (ox > 0) ox -= sq;
      if (oy > 0) oy -= sq;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, c.getWidth() - ox + sq, c.getHeight() - oy + sq);
      ctx.restore();
    });

    /* ---- Laser trail: pure canvas, no objects ---------------------- */
    const laser: LaserPt[] = [];
    let rafId = 0;
    const loop = () => {
      rafId = 0;
      if (fcRef.current && laser.length) {
        fcRef.current.requestRenderAll();
        rafId = requestAnimationFrame(loop);
      }
    };
    const pumpLaser = () => { if (!rafId) rafId = requestAnimationFrame(loop); };

    c.on("after:render", (opt) => {
      const ctx = (opt as unknown as { ctx: CanvasRenderingContext2D }).ctx;
      if (!ctx || ctx !== c.getContext() || !laser.length) return;
      const now = performance.now();
      while (laser.length && now - laser[0].t > LASER_MS) laser.shift();
      if (laser.length < 2) return;
      ctx.save();
      ctx.lineCap = ctx.lineJoin = "round";
      for (let i = 1; i < laser.length; i++) {
        const a = clamp(1 - (now - laser[i].t) / LASER_MS, 0, 1);
        if (a < 0.02) continue;
        ctx.beginPath();
        ctx.moveTo(laser[i - 1].x, laser[i - 1].y);
        ctx.lineTo(laser[i].x, laser[i].y);
        ctx.strokeStyle = `rgba(239,68,68,${a * 0.35})`;
        ctx.lineWidth = 14 * a;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(laser[i - 1].x, laser[i - 1].y);
        ctx.lineTo(laser[i].x, laser[i].y);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = Math.max(1, 4 * a);
        ctx.stroke();
      }
      ctx.restore();
    });

    /* ---- Shape construction with robust Hand-Drawn Sketchy Mode --- */
    const snapVal = (v: number) => live.current.snap ? Math.round(v / GRID) * GRID : v;

    const buildShape = (t: Tool, a: fabric.Point, b: fabric.Point): fabric.Object | null => {
      const L = live.current;
      const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      const base = {
        stroke: L.stroke, strokeWidth: L.width, strokeDashArray: DASHES[L.style],
        strokeUniform: true, opacity: L.opacity,
        strokeLineCap: "round" as const, strokeLineJoin: "round" as const,
      };
      const fl = L.fill === "transparent" ? "" : L.fill;

      switch (t) {
        case "rect": {
          const W = Math.max(w, 2), H = Math.max(h, 2);
          if (L.sketchy) {
            const pts = [
              { x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }, { x: 0, y: 0 },
              { x: 2, y: -1 }, { x: W - 1, y: 1 }, { x: W + 1, y: H - 1 }, { x: -1, y: H + 1 }
            ];
            return new fabric.Polygon(pts, { ...base, left, top, fill: fl, objectCaching: false });
          }
          return new fabric.Rect({ ...base, left, top, width: W, height: H, fill: fl, rx: 10, ry: 10 });
        }
        case "ellipse": {
          const rx = Math.max(w / 2, 1), ry = Math.max(h / 2, 1);
          if (L.sketchy) {
            const pts: { x: number; y: number }[] = [];
            for (let i = 0; i <= 24; i++) {
              const angle = (i / 24) * Math.PI * 2;
              pts.push({ x: rx + rx * Math.cos(angle), y: ry + ry * Math.sin(angle) });
            }
            for (let i = 0; i <= 24; i++) {
              const angle = (i / 24) * Math.PI * 2;
              const j = (i % 2 === 0 ? 1 : -1) * 1.5;
              pts.push({ x: rx + (rx + j) * Math.cos(angle), y: ry + (ry + j) * Math.sin(angle) });
            }
            return new fabric.Polygon(pts, { ...base, left, top, fill: fl, objectCaching: false });
          }
          return new fabric.Ellipse({ ...base, left, top, rx, ry, fill: fl });
        }
        case "diamond": {
          const W = Math.max(w, 2), H = Math.max(h, 2);
          const pts = L.sketchy
            ? [
                { x: W / 2, y: 0 }, { x: W, y: H / 2 }, { x: W / 2, y: H }, { x: 0, y: H / 2 }, { x: W / 2, y: 0 },
                { x: W / 2 + 1, y: -1 }, { x: W + 1, y: H / 2 + 1 }, { x: W / 2 - 1, y: H - 1 }, { x: -1, y: H / 2 - 1 }
              ]
            : [{ x: W / 2, y: 0 }, { x: W, y: H / 2 }, { x: W / 2, y: H }, { x: 0, y: H / 2 }];
          return new fabric.Polygon(pts, { ...base, left, top, fill: fl, objectCaching: false });
        }
        case "line": {
          if (L.sketchy) {
            const midX = (a.x + b.x) / 2 + (Math.random() - 0.5) * 4;
            const midY = (a.y + b.y) / 2 + (Math.random() - 0.5) * 4;
            return new fabric.Path(`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`, base);
          }
          return new fabric.Line([a.x, a.y, b.x, b.y], base);
        }
        case "arrow": {
          const pathD = arrowPathD(a.x, a.y, b.x, b.y, L.width);
          return new fabric.Path(pathD, base);
        }
        default: return null;
      }
    };

    const addText = (x: number, y: number) => {
      const L = live.current;
      const font = L.sketchy ? FONTS[0].family : L.font;
      const it = new fabric.IText("Type text here", {
        left: x, top: y - L.size / 2,
        fontFamily: font, fontSize: L.size,
        fill: L.stroke, opacity: L.opacity,
        editable: true, selectable: true, evented: true,
      });
      c.add(it);
      c.setActiveObject(it);
      it.enterEditing();
      it.selectAll();
      c.requestRenderAll();
      if (!L.locked) setTool("select");
    };

    const addNote = (x: number, y: number) => {
      const L = live.current;
      const font = L.sketchy ? FONTS[0].family : L.font;
      const n = new fabric.Textbox("📌 Sticky Note", {
        left: x - 100, top: y - 70, width: 200, height: 160,
        fontFamily: font, fontSize: 20, lineHeight: 1.25,
        fill: "#422006", backgroundColor: "#fde68a",
        padding: 12,
        selectable: true, evented: true, editable: true,
        rx: 12, ry: 12,
        shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.35)", blur: 18, offsetY: 8 }),
      });
      c.add(n);
      c.setActiveObject(n);
      n.enterEditing();
      n.selectAll();
      c.requestRenderAll();
      if (!L.locked) setTool("select");
    };

    /* ---- Interaction state ---------------------------------------- */
    let creating = false;
    let startPt: fabric.Point | null = null;
    let preview: fabric.Object | null = null;

    let panning = false;
    let lastX = 0, lastY = 0;
    let spaceHeld = false;
    let drawSuspended = false;

    let erasing = false;
    let laserOn = false;

    let lassoOn = false;
    let lassoPts: { x: number; y: number }[] = [];
    let lassoPoly: fabric.Polygon | null = null;

    const clientXY = (e: fabric.TPointerEvent) => {
      if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent) {
        const p = e.touches[0] ?? e.changedTouches[0];
        return { x: p?.clientX ?? 0, y: p?.clientY ?? 0 };
      }
      const m = e as MouseEvent;
      return { x: m.clientX, y: m.clientY };
    };

    const wantsPan = (e: fabric.TPointerEvent) =>
      live.current.tool === "pan" || spaceHeld
      || (e as MouseEvent).altKey === true
      || (e as MouseEvent).button === 1;

    /* Pan gestures must trump the pen — kill drawing mode BEFORE fabric
       initiates a stroke on mouse:down. */
    c.on("mouse:down:before", (opt) => {
      if (c.isDrawingMode && wantsPan(opt.e)) {
        drawSuspended = true;
        c.isDrawingMode = false;
      }
    });

    c.on("mouse:down", (opt) => {
      const t = live.current.tool;

      if (wantsPan(opt.e)) {
        panning = true;
        c.selection = false;
        c.setCursor("grabbing");
        const p = clientXY(opt.e);
        lastX = p.x; lastY = p.y;
        return;
      }

      if (t === "eraser") {
        erasing = true;
        suspendRef.current = true;
        if (opt.target) { c.remove(opt.target); c.requestRenderAll(); }
        return;
      }

      if (t === "laser") {
        laserOn = true;
        const vp = c.getViewportPoint(opt.e);
        laser.push({ x: vp.x, y: vp.y, t: performance.now() });
        pumpLaser();
        return;
      }

      const sp = c.getScenePoint(opt.e);

      if (t === "lasso") {
        lassoOn = true;
        lassoPts = [{ x: sp.x, y: sp.y }];
        if (lassoPoly) c.remove(lassoPoly);
        lassoPoly = new fabric.Polygon([{ x: sp.x, y: sp.y }], {
          fill: "rgba(99, 102, 241, 0.18)",
          stroke: "#6366f1",
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          selectable: false,
          evented: false,
          strokeUniform: true,
        });
        c.add(lassoPoly);
        c.requestRenderAll();
        return;
      }

      if (isShape(t)) {
        creating = true;
        suspendRef.current = true;
        startPt = new fabric.Point(snapVal(sp.x), snapVal(sp.y));
        preview = null;
        return;
      }
      if (t === "text") addText(sp.x, sp.y);
      else if (t === "note") addNote(sp.x, sp.y);
    });

    c.on("mouse:move", (opt) => {
      if (panning) {
        const p = clientXY(opt.e);
        const vpt = c.viewportTransform;
        vpt[4] += p.x - lastX; vpt[5] += p.y - lastY;
        lastX = p.x; lastY = p.y;
        c.setViewportTransform(vpt);
        c.setCursor("grabbing");
        return;
      }
      if (erasing) {
        if (opt.target) { c.remove(opt.target); c.requestRenderAll(); }
        return;
      }
      if (laserOn) {
        const vp = c.getViewportPoint(opt.e);
        laser.push({ x: vp.x, y: vp.y, t: performance.now() });
        if (laser.length > 400) laser.shift();
        pumpLaser();
        return;
      }
      if (lassoOn && lassoPoly) {
        const sp = c.getScenePoint(opt.e);
        lassoPts.push({ x: sp.x, y: sp.y });
        lassoPoly.set({ points: [...lassoPts] });
        c.requestRenderAll();
        return;
      }
      if (creating && startPt) {
        const sp = c.getScenePoint(opt.e);
        const end = new fabric.Point(snapVal(sp.x), snapVal(sp.y));
        if ((opt.e as MouseEvent).shiftKey) {
          const t = live.current.tool;
          if (t === "line" || t === "arrow") {
            if (Math.abs(end.x - startPt.x) >= Math.abs(end.y - startPt.y)) end.y = startPt.y;
            else end.x = startPt.x;
          } else {
            const d = Math.max(Math.abs(end.x - startPt.x), Math.abs(end.y - startPt.y));
            end.x = startPt.x + (Math.sign(end.x - startPt.x) || 1) * d;
            end.y = startPt.y + (Math.sign(end.y - startPt.y) || 1) * d;
          }
        }
        if (preview) c.remove(preview);
        preview = buildShape(live.current.tool, startPt, end);
        if (preview) c.add(preview);
        c.requestRenderAll();
      }
    });

    const finishInteraction = () => {
      if (drawSuspended) {
        drawSuspended = false;
        c.isDrawingMode = isDraw(live.current.tool);
      }
      if (panning) {
        panning = false;
        c.selection = live.current.tool === "select";
        c.setCursor(cursorFor(live.current.tool));
      }
      if (erasing) {
        erasing = false;
        suspendRef.current = false;
        pushHistory();
      }
      if (laserOn) laserOn = false;
      if (lassoOn) {
        lassoOn = false;
        if (lassoPoly) { c.remove(lassoPoly); lassoPoly = null; }
        if (lassoPts.length >= 3) {
          const allObjects = c.getObjects();
          const matched = allObjects.filter((o) => {
            if (o === lassoPoly || !o.evented) return false;
            const center = o.getCenterPoint();
            if (pointInPoly(center, lassoPts)) return true;
            const br = o.getBoundingRect();
            const centerBR = { x: br.left + br.width / 2, y: br.top + br.height / 2 };
            if (pointInPoly(centerBR, lassoPts)) return true;
            const corners = [
              { x: br.left, y: br.top },
              { x: br.left + br.width, y: br.top },
              { x: br.left, y: br.top + br.height },
              { x: br.left + br.width, y: br.top + br.height },
            ];
            return corners.some((pt) => pointInPoly(pt, lassoPts));
          });

          if (matched.length > 0) {
            c.discardActiveObject();
            setTool("select");
            setTimeout(() => {
              if (matched.length === 1) {
                c.setActiveObject(matched[0]);
              } else {
                const sel = new fabric.ActiveSelection(matched, { canvas: c });
                c.setActiveObject(sel);
              }
              c.requestRenderAll();
            }, 20);
          }
        }
        lassoPts = [];
        c.requestRenderAll();
      }
      if (creating) {
        creating = false;
        const t = live.current.tool, s = startPt;
        let obj = preview;
        preview = null;
        startPt = null;

        // Simple click (no drag) → drop a sensible default-sized shape.
        const tiny = !obj ||
          ((obj.width ?? 0) * (obj.scaleX ?? 1) < 6 &&
           (obj.height ?? 0) * (obj.scaleY ?? 1) < 6);
        if (tiny && s) {
          if (obj) c.remove(obj);
          const b = new fabric.Point(
            s.x + (t === "line" || t === "arrow" ? 160 : 140),
            s.y + (t === "line" || t === "arrow" ? 0 : 90),
          );
          obj = buildShape(t, s, b);
          if (obj) c.add(obj);
        }
        suspendRef.current = false;
        if (obj) {
          obj.setCoords();
          c.setActiveObject(obj);
          pushHistory();
        }
        c.requestRenderAll();
        if (!live.current.locked) setTool("select");
      }
    };

    c.on("mouse:up", finishInteraction);

    // Safety net: pointer released outside canvas, or window loses focus.
    const escape = () => {
      if (panning || erasing || creating || laserOn || lassoOn || drawSuspended) finishInteraction();
    };
    window.addEventListener("pointerup", escape);
    window.addEventListener("blur", escape);

    /* Double-click empty canvas → drop a text object. */
    c.on("mouse:dblclick", (opt) => {
      if (live.current.tool !== "select" || opt.target) return;
      const sp = c.getScenePoint(opt.e);
      addText(sp.x, sp.y);
    });

    c.on("text:editing:exited", (opt) => {
      const t = opt.target as fabric.IText | undefined;
      if (t && !t.text?.trim()) {
        c.remove(t);
        c.requestRenderAll();
      } else {
        pushHistory();
      }
    });

    /* ---- Wheel: pinch-zoom, ctrl-zoom, trackpad pan ---------------- */
    c.on("mouse:wheel", (opt) => {
      const e = opt.e;
      e.preventDefault(); e.stopPropagation();
      const vpt = c.viewportTransform;
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > 0.5) {
        vpt[4] -= e.deltaX; vpt[5] -= e.deltaY;
        c.setViewportTransform(vpt);
        return;
      }
      const factor = 0.999 ** (e.deltaY * (e.ctrlKey ? 2.5 : 1));
      const z = clamp(c.getZoom() * factor, MIN_ZOOM, MAX_ZOOM);
      c.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), z);
      setZoom(z);
    });

    /* ---- Touch: pinch-zoom + two-finger pan ------------------------ */
    const upper = c.upperCanvasEl;
    let pinchDist = 0, pinching = false;
    let pinchMid = { x: 0, y: 0 };
    const distOf = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length !== 2) return;
      pinching = true;
      creating = false; panning = false; erasing = false; laserOn = false; lassoOn = false;
      if (preview) { c.remove(preview); preview = null; }
      if (lassoPoly) { c.remove(lassoPoly); lassoPoly = null; }
      suspendRef.current = false;
      (c as unknown as { _isCurrentlyDrawing?: boolean })._isCurrentlyDrawing = false;
      pinchDist = distOf(ev.touches);
      const r = upper.getBoundingClientRect();
      pinchMid = {
        x: (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - r.left,
        y: (ev.touches[0].clientY + ev.touches[1].clientY) / 2 - r.top,
      };
      ev.preventDefault();
    };
    const onTouchMove = (ev: TouchEvent) => {
      if (!pinching || ev.touches.length !== 2) return;
      ev.preventDefault();
      const d = distOf(ev.touches);
      if (!pinchDist) pinchDist = d;
      const r = upper.getBoundingClientRect();
      const mid = {
        x: (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - r.left,
        y: (ev.touches[0].clientY + ev.touches[1].clientY) / 2 - r.top,
      };
      const z = clamp(c.getZoom() * (d / pinchDist), MIN_ZOOM, MAX_ZOOM);
      c.zoomToPoint(new fabric.Point(mid.x, mid.y), z);
      const vpt = c.viewportTransform;
      vpt[4] += mid.x - pinchMid.x; vpt[5] += mid.y - pinchMid.y;
      c.setViewportTransform(vpt);
      pinchDist = d; pinchMid = mid;
      setZoom(z);
    };
    const onTouchEnd = (ev: TouchEvent) => {
      if (ev.touches.length < 2 && pinching) { pinching = false; pinchDist = 0; }
    };
    upper.addEventListener("touchstart", onTouchStart, { passive: false });
    upper.addEventListener("touchmove", onTouchMove, { passive: false });
    upper.addEventListener("touchend", onTouchEnd);
    upper.addEventListener("touchcancel", onTouchEnd);

    /* ---- Snap on move, history & selection tracking ---------------- */
    c.on("object:moving", (opt) => {
      if (!live.current.snap || !opt.target) return;
      opt.target.set({
        left: Math.round((opt.target.left ?? 0) / GRID) * GRID,
        top:  Math.round((opt.target.top  ?? 0) / GRID) * GRID,
      });
    });
    c.on("object:added",    () => pushHistory());
    c.on("object:modified", () => pushHistory());
    c.on("object:removed",  () => pushHistory());

    const readSel = () => {
      const objs = c.getActiveObjects();
      setHasSel(objs.length > 0);
      setSelIsText(objs.some(isTextObj));
      const o = objs[0];
      if (!o) return;
      if (isTextObj(o)) {
        const t = o as fabric.IText;
        if (typeof t.fill === "string") setStroke(t.fill);
        if (t.fontFamily) setFontFamily(t.fontFamily);
        if (t.fontSize) setFontSize(Math.round(t.fontSize));
      } else {
        if (typeof o.stroke === "string" && o.stroke) setStroke(o.stroke);
        if (typeof o.fill   === "string") setFill(o.fill || "transparent");
        if (o.strokeWidth) setStrokeWidth(o.strokeWidth);
      }
      if (typeof o.opacity === "number") setOpacity(o.opacity);
    };
    c.on("selection:created", readSel);
    c.on("selection:updated", readSel);
    c.on("selection:cleared", () => { setHasSel(false); setSelIsText(false); });

    /* ---- Restore or seed history ---------------------------------- */
    (async () => {
      const saved = localStorage.getItem(storageKey);
      suspendRef.current = true;
      if (saved) { try { await c.loadFromJSON(saved); } catch { /* ignore */ } }
      c.requestRenderAll();
      suspendRef.current = false;
      const seed = JSON.stringify(c.toJSON());
      histRef.current = [seed];
      idxRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
      setReady(true);
    })();

    /* ---- Viewport resize ------------------------------------------ */
    const ro = new ResizeObserver(() => {
      if (!fcRef.current || !host) return;
      fcRef.current.setDimensions({ width: host.clientWidth, height: host.clientHeight });
      fcRef.current.requestRenderAll();
    });
    ro.observe(host);

    /* ---- Keyboard --------------------------------------------------- */
    const isEditing = () => {
      const a = c.getActiveObject() as fabric.IText | undefined;
      return !!a && !!a.isEditing;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (isEditing()) return;

      const meta = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (e.code === "Space" && !spaceHeld) {
        spaceHeld = true;
        if (c.isDrawingMode) { drawSuspended = true; c.isDrawingMode = false; }
        c.defaultCursor = "grab";
        c.setCursor("grab");
        e.preventDefault();
        return;
      }
      if (meta && k === "z") { e.preventDefault(); e.shiftKey ? cbs.current.redo() : cbs.current.undo(); return; }
      if (meta && k === "y") { e.preventDefault(); cbs.current.redo(); return; }
      if (meta && k === "d") { e.preventDefault(); cbs.current.duplicate(); return; }
      if (meta && k === "c") { e.preventDefault(); cbs.current.copy(); return; }
      if (meta && k === "v") { e.preventDefault(); cbs.current.paste(); return; }
      if (meta && k === "a") { e.preventDefault(); cbs.current.selectAll(); return; }
      if (meta && k === "0") { e.preventDefault(); cbs.current.resetView(); return; }
      if (meta && k === "1") { e.preventDefault(); cbs.current.fitView(); return; }
      if (meta) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        cbs.current.deleteSel();
        return;
      }
      if (e.key === "Escape") {
        c.discardActiveObject();
        c.requestRenderAll();
        setTool("select");
        return;
      }
      const mapped = KEYS[k];
      if (mapped) setTool(mapped);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld = false;
        if (drawSuspended) {
          drawSuspended = false;
          c.isDrawingMode = isDraw(live.current.tool);
        }
        c.defaultCursor = cursorFor(live.current.tool);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    /* ---- Paste images from clipboard ------------------------------- */
    const onPaste = (e: ClipboardEvent) => {
      if (isEditing()) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (!it.type.startsWith("image/")) continue;
        e.preventDefault();
        const f = it.getAsFile();
        if (!f) continue;
        const r = new FileReader();
        r.onload = () => {
          fabric.FabricImage.fromURL(r.result as string).then((img) => {
            const maxW = c.getWidth() * 0.6;
            if ((img.width ?? 0) > maxW) img.scaleToWidth(maxW);
            const cp = c.getVpCenter();
            img.set({ left: cp.x - img.getScaledWidth() / 2, top: cp.y - img.getScaledHeight() / 2 });
            c.add(img);
            c.setActiveObject(img);
            c.requestRenderAll();
            setTool("select");
            showToast("Image pasted", "success");
          });
        };
        r.readAsDataURL(f);
        return;
      }
    };
    document.addEventListener("paste", onPaste);

    /* ---- Cleanup --------------------------------------------------- */
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", escape);
      window.removeEventListener("blur", escape);
      document.removeEventListener("paste", onPaste);
      upper.removeEventListener("touchstart", onTouchStart);
      upper.removeEventListener("touchmove", onTouchMove);
      upper.removeEventListener("touchend", onTouchEnd);
      upper.removeEventListener("touchcancel", onTouchEnd);
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      c.dispose();
      fcRef.current = null;
    };
    // storageKey is the only long-lived dependency; state flows via live ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  /* --- Tool → canvas mode sync & Brush Color Sync --------------------- */
  useEffect(() => {
    const c = fcRef.current;
    if (!c) return;

    const drawing = isDraw(tool);
    c.isDrawingMode = drawing;
    if (c.freeDrawingBrush) {
      const b = c.freeDrawingBrush as fabric.PencilBrush;
      if (tool === "marker") {
        b.color = isHex6(stroke) ? `${stroke}59` : stroke;
        b.width = Math.max(12, strokeWidth * 4);
      } else {
        b.color = stroke;
        b.width = strokeWidth;
      }
      b.decimate = 3;
      b.strokeLineCap = "round";
      b.strokeLineJoin = "round";
    }
    c.selection = tool === "select";
    c.skipTargetFind = !(tool === "select" || tool === "eraser");
    c.forEachObject((o) => {
      o.selectable = (tool === "select" || tool === "lasso");
      o.evented = (tool === "select" || tool === "eraser" || tool === "lasso");
    });
    c.defaultCursor = cursorFor(tool);
    c.hoverCursor = tool === "select" ? "move" : c.defaultCursor;
    if (tool !== "select" && tool !== "lasso") c.discardActiveObject();
    c.requestRenderAll();
  }, [tool, stroke, strokeWidth, ready]);

  /* Keep newly-added objects interactive in the current tool mode */
  useEffect(() => {
    const c = fcRef.current;
    if (!c) return;
    const handler = (opt: { target?: fabric.Object }) => {
      if (!opt.target) return;
      opt.target.selectable = (live.current.tool === "select" || live.current.tool === "lasso");
      opt.target.evented = (live.current.tool === "select" || live.current.tool === "eraser" || live.current.tool === "lasso");
    };
    c.on("object:added", handler);
    return () => { c.off("object:added", handler); };
  }, [ready]);

  useEffect(() => { fcRef.current?.requestRenderAll(); }, [showGrid, themeId]);

  /* Auto-switch ink colour when the theme's default ink changes and the user
     hasn't picked a custom colour yet. */
  const prevInkRef = useRef(theme.ink);
  useEffect(() => {
    if (stroke === prevInkRef.current) setStroke(theme.ink);
    prevInkRef.current = theme.ink;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  /* --- Actions -------------------------------------------------------- */
  const clipboardRef = useRef<fabric.Object | null>(null);

  const duplicate = useCallback(async () => {
    const c = fcRef.current;
    const act = c?.getActiveObject();
    if (!c || !act) { showToast("Pehle koi object select karo", "warning"); return; }
    const cl = await act.clone();
    c.discardActiveObject();
    cl.set({ left: (cl.left ?? 0) + 24, top: (cl.top ?? 0) + 24, evented: true });
    if (cl instanceof fabric.ActiveSelection) {
      cl.canvas = c;
      cl.forEachObject((o) => c.add(o));
      cl.setCoords();
    } else c.add(cl);
    c.setActiveObject(cl);
    c.requestRenderAll();
  }, [showToast]);

  const copySel = useCallback(async () => {
    const c = fcRef.current;
    const act = c?.getActiveObject();
    if (!c || !act) return;
    clipboardRef.current = await act.clone();
    showToast("Copied", "info");
  }, [showToast]);

  const paste = useCallback(async () => {
    const c = fcRef.current;
    if (!c || !clipboardRef.current) return;
    const cl = await clipboardRef.current.clone();
    c.discardActiveObject();
    cl.set({ left: (cl.left ?? 0) + 28, top: (cl.top ?? 0) + 28, evented: true });
    if (cl instanceof fabric.ActiveSelection) {
      cl.canvas = c;
      cl.forEachObject((o) => c.add(o));
      cl.setCoords();
    } else c.add(cl);
    c.setActiveObject(cl);
    c.requestRenderAll();
  }, []);

  const deleteSel = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (!objs.length) return;
    objs.forEach((o) => c.remove(o));
    c.discardActiveObject();
    c.requestRenderAll();
  }, []);

  const selectAll = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    c.discardActiveObject();
    const all = c.getObjects().filter((o) => o.selectable !== false);
    if (!all.length) return;
    c.setActiveObject(new fabric.ActiveSelection(all, { canvas: c }));
    c.requestRenderAll();
  }, []);

  const bringFront = useCallback(() => {
    const c = fcRef.current, a = c?.getActiveObject();
    if (c && a) { c.bringObjectToFront(a); c.requestRenderAll(); pushHistory(); }
  }, [pushHistory]);

  const sendBack = useCallback(() => {
    const c = fcRef.current, a = c?.getActiveObject();
    if (c && a) { c.sendObjectToBack(a); c.requestRenderAll(); pushHistory(); }
  }, [pushHistory]);

  /* --- View ----------------------------------------------------------- */
  const zoomBy = useCallback((f: number) => {
    const c = fcRef.current;
    if (!c) return;
    const z = clamp(c.getZoom() * f, MIN_ZOOM, MAX_ZOOM);
    c.zoomToPoint(new fabric.Point(c.getWidth() / 2, c.getHeight() / 2), z);
    setZoom(z);
  }, []);

  const resetView = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
  }, []);

  const fitView = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    const objs = c.getObjects();
    if (!objs.length) { resetView(); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objs.forEach((o) => {
      const r = o.getBoundingRect();
      if (r.left < minX) minX = r.left;
      if (r.top  < minY) minY = r.top;
      if (r.left + r.width  > maxX) maxX = r.left + r.width;
      if (r.top  + r.height > maxY) maxY = r.top  + r.height;
    });
    const pad = 100, w = maxX - minX, h = maxY - minY;
    if (w <= 0 || h <= 0) { resetView(); return; }
    const z = clamp(Math.min((c.getWidth() - pad) / w, (c.getHeight() - pad) / h), MIN_ZOOM, MAX_ZOOM);
    c.setViewportTransform([
      z, 0, 0, z,
      c.getWidth() / 2 - (minX + w / 2) * z,
      c.getHeight() / 2 - (minY + h / 2) * z,
    ]);
    setZoom(z);
  }, [resetView]);

  /* Keep the keyboard handler's callback refs current */
  useEffect(() => {
    cbs.current = {
      undo, redo, duplicate, copy: copySel, paste, deleteSel,
      resetView, fitView, selectAll,
    };
  });

  /* --- Style updaters that mutate current selection & pencil brush ------ */
  const setStrokeA = (v: string) => {
    setStroke(v);
    if (fcRef.current?.freeDrawingBrush) {
      const b = fcRef.current.freeDrawingBrush as fabric.PencilBrush;
      b.color = tool === "marker" && isHex6(v) ? `${v}59` : v;
    }
    mutateSelection((o) => { if (isTextObj(o)) o.set({ fill: v }); else o.set({ stroke: v }); });
  };
  const setFillA = (v: string) => {
    setFill(v);
    mutateSelection((o) => { if (!isTextObj(o)) o.set({ fill: v === "transparent" ? "" : v }); });
  };
  const setWidthA = (v: number) => {
    setStrokeWidth(v);
    if (fcRef.current?.freeDrawingBrush) {
      const b = fcRef.current.freeDrawingBrush as fabric.PencilBrush;
      b.width = tool === "marker" ? Math.max(12, v * 4) : v;
    }
    mutateSelection((o) => { if (!isTextObj(o)) o.set({ strokeWidth: v }); });
  };
  const setStyleA = (v: string) => {
    setStrokeStyle(v);
    mutateSelection((o) => o.set({ strokeDashArray: DASHES[v] ?? null }));
  };
  const setOpacityA = (v: number) => {
    setOpacity(v);
    mutateSelection((o) => o.set({ opacity: v }));
  };
  const setFontA = (v: string) => {
    setFontFamily(v);
    mutateSelection((o) => { if (isTextObj(o)) (o as fabric.IText).set({ fontFamily: v }); });
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.load(`24px ${v}`).then(() => {
        fcRef.current?.requestRenderAll();
      }).catch(() => {
        fcRef.current?.requestRenderAll();
      });
    } else {
      fcRef.current?.requestRenderAll();
    }
  };
  const setSizeA = (v: number) => {
    setFontSize(v);
    mutateSelection((o) => { if (isTextObj(o)) o.set({ fontSize: v }); });
  };

  /* --- Import / export ------------------------------------------------ */
  const downloadURL = (href: string, name: string, revoke = false) => {
    const a = document.createElement("a");
    a.href = href; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 4000);
  };

  const onImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const c = fcRef.current;
    if (!c) return;
    try {
      const url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const img = await fabric.FabricImage.fromURL(url);
      const maxW = c.getWidth() * 0.6;
      if ((img.width ?? 0) > maxW) img.scaleToWidth(maxW);
      const cp = c.getVpCenter();
      img.set({ left: cp.x - img.getScaledWidth() / 2, top: cp.y - img.getScaledHeight() / 2 });
      c.add(img);
      c.setActiveObject(img);
      c.requestRenderAll();
      setTool("select");
      showToast("Image added", "success");
    } catch {
      showToast("Image load nahi hui", "error");
    }
    if (imgFileRef.current) imgFileRef.current.value = "";
  };

  const onJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      JSON.parse(text);
      await loadJSON(text);
      pushHistory();
      showToast("Board imported", "success");
    } catch {
      showToast("Invalid board file", "error");
    }
    if (jsonFileRef.current) jsonFileRef.current.value = "";
  };

  const withBackground = <T,>(fn: () => T, transparent: boolean): T => {
    const c = fcRef.current!;
    const prev = c.backgroundColor;
    if (!transparent) c.backgroundColor = theme.page;
    const out = fn();
    c.backgroundColor = prev;
    c.requestRenderAll();
    return out;
  };

  const exportPNG = (multiplier: number, transparent = false) => {
    const c = fcRef.current;
    if (!c) return;
    setExportOpen(false);
    const url = withBackground(
      () => c.toDataURL({ format: "png", quality: 1, multiplier, enableRetinaScaling: false }),
      transparent,
    );
    downloadURL(url, `board-${multiplier}x-${Date.now()}.png`);
    showToast(`PNG ${multiplier}× exported`, "success");
  };

  const exportSVG = () => {
    const c = fcRef.current;
    if (!c) return;
    setExportOpen(false);
    const svg = withBackground(() => c.toSVG(), false);
    downloadURL(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), `board-${Date.now()}.svg`, true);
    showToast("SVG exported", "success");
  };

  const exportJSON = () => {
    const c = fcRef.current;
    if (!c) return;
    setExportOpen(false);
    downloadURL(
      URL.createObjectURL(new Blob([JSON.stringify(c.toJSON())], { type: "application/json" })),
      `board-${Date.now()}.json`, true,
    );
    showToast("Board file exported", "success");
  };

  const exportNotesToStickyBoard = () => {
    const c = fcRef.current;
    if (!c) return;
    setExportOpen(false);
    
    // Find all textboxes and IText
    const objects = c.getObjects();
    const textObjects = objects.filter(o => o.type === "textbox" || o.type === "i-text" || o.type === "text") as (fabric.Textbox | fabric.IText)[];
    
    if (textObjects.length === 0) {
      showToast("No notes found on the whiteboard to save", "warning");
      return;
    }

    try {
      const existing = localStorage.getItem("workspace_sticky_notes");
      const currentNotes = existing ? JSON.parse(existing) : [];
      
      const newNotes = textObjects.map(tb => {
        const text = tb.text || "";
        const now = new Date();
        return {
          id: crypto.randomUUID(),
          title: "From Whiteboard",
          text: text.replace("📌 Sticky Note\\n", "").replace("📌 Sticky Note", "").trim(),
          color: "bg-yellow-500/15 border-yellow-400/35",
          textColor: "text-amber-200",
          font: "font-sans",
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          subject: "Whiteboard Extract",
          pinned: false
        };
      }).filter(n => n.text.length > 0);

      if (newNotes.length === 0) {
        showToast("No valid text found to save", "warning");
        return;
      }

      localStorage.setItem("workspace_sticky_notes", JSON.stringify([...newNotes, ...currentNotes]));
      showToast(`Successfully saved ${newNotes.length} note(s) to Sticky Board!`, "success");
    } catch (err) {
      console.error("Failed to save notes", err);
      showToast("Failed to save notes to Sticky Board", "warning");
    }
  };

  const clearBoard = () => {
    const c = fcRef.current;
    if (!c) return;
    setMenuOpen(false);
    if (!c.getObjects().length) { showToast("Board already empty", "info"); return; }
    if (!window.confirm("Poora board clear kar dein?")) return;
    suspendRef.current = true;
    c.remove(...c.getObjects());
    c.discardActiveObject();
    c.requestRenderAll();
    suspendRef.current = false;
    pushHistory();
    showToast("Board cleared", "info");
  };

  /* Escape closes fullscreen too */
  useEffect(() => {
    if (!fullscreen) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [fullscreen]);

  /* ============================================================== UI == */

  const shell = fullscreen
    ? "fixed inset-0 z-[100] rounded-none"
    : "relative h-[78vh] min-h-[560px] rounded-2xl";

  const hint =
    tool === "select" ? "Drag to marquee-select · double-click for text"
    : tool === "lasso"  ? "Draw a loop around items to select them"
    : tool === "pan"    ? "Drag to move · Space also pans"
    : tool === "pen"    ? "Draw freely · scroll to zoom"
    : tool === "marker" ? "Semi-transparent highlighter"
    : tool === "laser"  ? "Hold & move — trail fades"
    : tool === "eraser" ? "Drag over strokes to erase"
    : isShape(tool)     ? "Drag to size · Shift = perfect ratio"
    : tool === "text"   ? "Click to start typing"
    : tool === "note"   ? "Click to drop a sticky note"
    : "";

  const showProps = hasSel || isShape(tool) || isDraw(tool) || tool === "text" || tool === "note";

  // Small helpers to keep JSX terse.
  const btnBase = "flex items-center justify-center rounded-xl transition-all";
  const iconBtn = "h-9 w-9 " + btnBase;
  const island = "pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl";
  const groupSep = (i: number) => (i === 2 || i === 7 || i === 12);

  return (
    <div
      className={`${shell} flex w-full flex-col overflow-hidden border border-white/10 shadow-2xl`}
      style={{ background: theme.page }}
    >
      <input ref={imgFileRef}  type="file" accept="image/*"        onChange={onImageFile} className="hidden" />
      <input ref={jsonFileRef} type="file" accept="application/json" onChange={onJSONFile}  className="hidden" />

      {/* Canvas host */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={hostRef} className="absolute inset-0" style={{ touchAction: "none" }}>
          <canvas ref={canvasElRef} />
        </div>

        {/* ============================================ TOP-LEFT: menu === */}
        <div className="pointer-events-none absolute left-3 top-3 z-30 flex gap-2">
          <div className={`${island} relative p-1`}>
            <button
              onClick={() => { setMenuOpen(v => !v); setExportOpen(false); }}
              className={`${iconBtn} text-slate-300 hover:bg-white/10 hover:text-white`}
              title="Menu"
              aria-label="Menu"
            >
              <Menu className="h-[17px] w-[17px]" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 w-64 space-y-3 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
                  <div className="space-y-1">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Theme</p>
                    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                      <Palette className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                      <select
                        value={themeId}
                        onChange={(e) => setThemeId(e.target.value)}
                        className="w-full cursor-pointer bg-transparent text-[11px] font-bold text-slate-200 focus:outline-none"
                      >
                        {THEMES.map((t) => (
                          <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setShowGrid(v => !v)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all ${
                        showGrid ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      <Grid3x3 className="h-3.5 w-3.5" /> Grid
                    </button>
                    <button
                      onClick={() => setSnap(v => !v)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all ${
                        snap ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      <Magnet className="h-3.5 w-3.5" /> Snap
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const next = !sketchy;
                      setSketchy(next);
                      showToast(next ? "✨ Hand-Drawn Sketchy Mode ON" : "Clean Mode ON", "info");
                    }}
                    className={`flex w-full items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                      sketchy ? "border-purple-400/60 bg-purple-500/20 text-purple-300" : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-purple-400" /> Sketchy Hand-Drawn Mode</span>
                    <span className={`text-[10px] font-black uppercase ${sketchy ? "text-purple-300" : "text-slate-500"}`}>{sketchy ? "ON" : "OFF"}</span>
                  </button>

                  <div className="h-px bg-white/10" />

                  <button
                    onClick={() => { jsonFileRef.current?.click(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <Upload className="h-3.5 w-3.5 text-cyan-300" /> Import board
                  </button>
                  <button
                    onClick={clearBoard}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-rose-300 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear board
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============================================ TOP-CENTER: tools == */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2">
          <div className={`${island} scrollbar-none flex max-w-[calc(100vw-24px)] items-center gap-0.5 overflow-x-auto p-1`}>
            {TOOLS.map(({ id, icon: Icon, label, key, accent }, i) => {
              const active = tool === id;
              return (
                <button
                  key={id}
                  onClick={() => setTool(id)}
                  title={`${label} · ${key}`}
                  aria-pressed={active}
                  aria-label={label}
                  className={`${iconBtn} relative shrink-0 ${groupSep(i) ? "ml-1" : ""} ${
                    active ? `${accent} scale-[1.06] shadow-lg` : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
                  {active && (
                    <span className="pointer-events-none absolute -bottom-0.5 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full bg-current opacity-70" />
                  )}
                </button>
              );
            })}
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button
              onClick={() => {
                const next = !sketchy;
                setSketchy(next);
                showToast(next ? "✨ Hand-Drawn Sketchy Mode ON" : "Clean Mode ON", "info");
              }}
              title={sketchy ? "Hand-drawn sketchy mode ON" : "Turn ON hand-drawn sketchy mode"}
              className={`${iconBtn} ${sketchy ? "bg-purple-500 text-white shadow-lg ring-2 ring-purple-400/50" : "text-slate-400 hover:bg-white/10 hover:text-purple-300"}`}
            >
              <Sparkles className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={() => imgFileRef.current?.click()}
              title="Insert image"
              className={`${iconBtn} text-slate-400 hover:bg-white/10 hover:text-emerald-300`}
            >
              <ImagePlus className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={() => setLocked(v => !v)}
              title={locked ? "Tool stays active after use" : "Switch to Select after use"}
              className={`${iconBtn} ${locked ? "bg-white/15 text-white" : "text-slate-500 hover:bg-white/10 hover:text-white"}`}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ============================================ TOP-RIGHT: history / export */}
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex gap-2">
          <div className={`${island} flex items-center gap-0.5 p-1`}>
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`${iconBtn} ${canUndo ? "text-slate-300 hover:bg-white/10 hover:text-white" : "cursor-not-allowed text-slate-700"}`}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className={`${iconBtn} ${canRedo ? "text-slate-300 hover:bg-white/10 hover:text-white" : "cursor-not-allowed text-slate-700"}`}
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <div className={`${island} flex items-center gap-0.5 p-1`}>
            <button
              onClick={() => setHelpOpen(true)}
              title="Shortcuts"
              className={`${iconBtn} text-slate-300 hover:bg-white/10 hover:text-white`}
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <button
              onClick={() => setFullscreen(v => !v)}
              title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
              className={`${iconBtn} text-slate-300 hover:bg-white/10 hover:text-white`}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          <div className={`${island} relative p-1`}>
            <button
              onClick={() => { setExportOpen(v => !v); setMenuOpen(false); }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 shadow-lg transition-all hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl">
                  {[
                    { label: "PNG · 1× (screen)",    icon: FileImage, fn: () => exportPNG(1) },
                    { label: "PNG · 2× (retina)",    icon: FileImage, fn: () => exportPNG(2) },
                    { label: "PNG · 4× (ultra HD)",  icon: FileImage, fn: () => exportPNG(4) },
                    { label: "PNG · transparent",    icon: FileImage, fn: () => exportPNG(2, true) },
                    { label: "SVG (vector)",         icon: FileCode2, fn: exportSVG },
                    { label: "Board file (.json)",   icon: FileJson,  fn: exportJSON },
                    { label: "Save Notes to Sticky Board", icon: StickyNote, fn: exportNotesToStickyBoard },
                  ].map(({ label, icon: I, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <I className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============================================ LEFT: properties (contextual) */}
        {showProps && (
          <div className="pointer-events-none absolute bottom-16 left-3 top-16 z-20 flex items-start">
            <div className={`${island} scrollbar-none w-[204px] max-h-full space-y-3 overflow-y-auto p-3`}>
              <PanelSection label={isDraw(tool) ? "Pen Color" : "Stroke Color"}>
                <div className="grid grid-cols-5 gap-1.5">
                  {STROKES.map((clr) => (
                    <button
                      key={clr}
                      onClick={() => setStrokeA(clr)}
                      title={clr}
                      style={{ background: clr }}
                      className={`h-6 w-full rounded-md border transition-all ${
                        stroke === clr ? "border-white ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950" : "border-white/20 hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
                <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-300">
                  <input
                    type="color"
                    value={isHex6(stroke) ? stroke : "#ffffff"}
                    onChange={(e) => setStrokeA(e.target.value)}
                    className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  Custom Color
                </label>
              </PanelSection>

              {(hasSel || tool === "rect" || tool === "ellipse" || tool === "diamond") && (
                <PanelSection label="Fill">
                  <div className="grid grid-cols-5 gap-1.5">
                    {FILLS.map((clr) => (
                      <button
                        key={clr}
                        onClick={() => setFillA(clr)}
                        title={clr === "transparent" ? "No fill" : clr}
                        style={clr === "transparent" ? undefined : { background: clr }}
                        className={`flex h-6 w-full items-center justify-center rounded-md border transition-all ${
                          fill === clr ? "border-white ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950" : "border-white/20 hover:scale-105"
                        } ${clr === "transparent" ? "bg-slate-800" : ""}`}
                      >
                        {clr === "transparent" && <Ban className="h-3 w-3 text-slate-500" />}
                      </button>
                    ))}
                  </div>
                </PanelSection>
              )}

              <PanelSection label={`${isDraw(tool) ? "Pen Size" : "Width"} · ${strokeWidth}px`}>
                <div className="flex gap-1.5">
                  {[2, 4, 8, 14].map((w) => (
                    <button
                      key={w}
                      onClick={() => setWidthA(w)}
                      className={`flex h-7 flex-1 items-center justify-center rounded-lg border transition-all ${
                        strokeWidth === w ? "border-cyan-400 bg-cyan-500/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="block w-4 rounded-full bg-slate-200" style={{ height: Math.min(w, 8) }} />
                    </button>
                  ))}
                </div>
                <input
                  type="range" min={1} max={40} value={strokeWidth}
                  onChange={(e) => setWidthA(Number(e.target.value))}
                  className="mt-1 h-1 w-full cursor-pointer accent-cyan-400"
                />
              </PanelSection>

              {!isDraw(tool) && (
                <PanelSection label="Style">
                  <div className="flex gap-1.5">
                    {Object.keys(DASHES).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyleA(s)}
                        title={s}
                        className={`flex h-7 flex-1 items-center justify-center rounded-lg border transition-all ${
                          strokeStyle === s ? "border-cyan-400 bg-cyan-500/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <svg width="22" height="6" viewBox="0 0 22 6">
                          <line
                            x1="1" y1="3" x2="21" y2="3"
                            stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"
                            strokeDasharray={s === "dashed" ? "5 4" : s === "dotted" ? "0.5 4" : undefined}
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </PanelSection>
              )}

              {(selIsText || tool === "text" || tool === "note") && (
                <>
                  <PanelSection label="Font">
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontA(e.target.value)}
                      className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-slate-200 focus:outline-none"
                    >
                      {FONTS.map((f) => (
                        <option key={f.name} value={f.family} className="bg-slate-900">{f.name}</option>
                      ))}
                    </select>
                  </PanelSection>
                  <PanelSection label={`Size · ${fontSize}`}>
                    <div className="flex gap-1.5">
                      {[16, 24, 36, 56].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSizeA(s)}
                          className={`h-7 flex-1 rounded-lg border text-[11px] font-bold transition-all ${
                            fontSize === s ? "border-cyan-400 bg-cyan-500/20 text-white" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          {s === 16 ? "S" : s === 24 ? "M" : s === 36 ? "L" : "XL"}
                        </button>
                      ))}
                    </div>
                  </PanelSection>
                </>
              )}

              <PanelSection label={`Opacity · ${Math.round(opacity * 100)}%`}>
                <input
                  type="range" min={10} max={100} value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacityA(Number(e.target.value) / 100)}
                  className="h-1 w-full cursor-pointer accent-cyan-400"
                />
              </PanelSection>

              {hasSel && (
                <PanelSection label="Selection">
                  <div className="grid grid-cols-4 gap-1.5">
                    <IconAction onClick={bringFront} title="Bring to front"><BringToFront className="h-3.5 w-3.5" /></IconAction>
                    <IconAction onClick={sendBack}   title="Send to back"><SendToBack   className="h-3.5 w-3.5" /></IconAction>
                    <IconAction onClick={duplicate}  title="Duplicate (Ctrl+D)"><Copy    className="h-3.5 w-3.5" /></IconAction>
                    <IconAction onClick={deleteSel}  title="Delete (Del)" danger><Trash2 className="h-3.5 w-3.5" /></IconAction>
                  </div>
                </PanelSection>
              )}
            </div>
          </div>
        )}

        {/* ============================================ BOTTOM-LEFT: zoom = */}
        <div className={`${island} absolute bottom-3 left-3 z-20 flex items-center gap-0.5 p-1`}>
          <button onClick={() => zoomBy(1 / 1.2)} title="Zoom out" className={`${iconBtn} h-8 w-8 text-slate-300 hover:bg-white/10 hover:text-white`}>
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={resetView} title="Reset (Ctrl+0)" className="min-w-[52px] rounded-lg px-1 py-1 font-mono text-[11px] font-bold text-white hover:bg-white/10">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => zoomBy(1.2)} title="Zoom in" className={`${iconBtn} h-8 w-8 text-slate-300 hover:bg-white/10 hover:text-white`}>
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="mx-0.5 h-4 w-px bg-white/15" />
          <button onClick={fitView} title="Zoom to fit (Ctrl+1)" className={`${iconBtn} h-8 w-8 text-slate-300 hover:bg-white/10 hover:text-white`}>
            <Scan className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ============================================ BOTTOM-RIGHT: hint */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 hidden rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] font-medium text-slate-400 backdrop-blur-xl md:block">
          {hint}
        </div>

        {/* ============================================ Shortcuts overlay */}
        {helpOpen && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm"
            onClick={() => setHelpOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white">Keyboard shortcuts</h3>
                <button onClick={() => setHelpOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
                {SHORTCUTS.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-white/5 py-1">
                    <span className="text-slate-400">{v}</span>
                    <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-200">{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tiny inline UI helpers                                                    */
/* -------------------------------------------------------------------------- */

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function IconAction({
  onClick, title, danger, children,
}: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 items-center justify-center rounded-lg border transition-all ${
        danger
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
