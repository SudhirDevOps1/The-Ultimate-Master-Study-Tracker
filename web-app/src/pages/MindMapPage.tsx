import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Download, Plus, Trash2, Edit3, Sparkles, RefreshCw, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Palette, Eye, Move, Check, CornerDownRight, 
  Share2, RotateCcw, LayoutTemplate, Sliders, Search, Wand2, Undo, Redo, 
  CheckCircle2, Circle, Clock, FileText, Upload, ChevronRight, ChevronDown, 
  ChevronLeft, BookOpen, BrainCircuit, X, Compass, HelpCircle, Image as ImageIcon,
  Link2, Unlink, ArrowRight, ArrowLeft, FolderTree, Play, Layers, Code,
  Cpu, AlertCircle, Square, Diamond, Cloud, Hexagon, Smile, MapPin
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { Panel } from "@/components/common/Panel";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { saveImageSafely } from "@/utils/dataExport";
import { callUnifiedAI } from "@/utils/aiClient";
import type { MindNode, NodeStatus, MindMapRelationship } from "@/types/models";
import {
  wouldCreateCycle,
  reparentNode,
  removeNodeAndDescendants,
  cleanupRelationships,
  calculateTreeLayout,
  calculateDownscaleDimensions,
} from "@/utils/mindmapGraph";
import {
  initStorageMigration,
  loadMindMap,
  saveMindMap,
} from "@/utils/storageMigration";

export type { MindNode, NodeStatus };

export type MindMapCurveStyle = "curved" | "flowchart" | "straight" | "rounded" | "bracket" | "fishbone";

export interface MindMapDeckItem {
  id: string;
  title: string;
  nodes: MindNode[];
  relationships: MindMapRelationship[];
  layoutMode: "balanced" | "right-only" | "tree";
  curveStyle: MindMapCurveStyle;
  createdAt: string;
  updatedAt: string;
}

const DECK_STORAGE_KEY = "flowtrack_mindmap_decks_v2";

export function calculateEdgePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  isLeft: boolean,
  style: MindMapCurveStyle,
  isVertical: boolean = false
): { pathD: string; markerEnd?: string } {
  if (isVertical) {
    if (style === "straight") {
      return { pathD: `M ${startX} ${startY} L ${endX} ${endY}` };
    }
    if (style === "flowchart") {
      const midY = startY + (endY - startY) * 0.5;
      return {
        pathD: `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`,
        markerEnd: "url(#mindmap-arrow)",
      };
    }
    if (style === "rounded") {
      const midY = startY + (endY - startY) * 0.5;
      const r = Math.min(12, Math.abs(midY - startY) * 0.7, Math.abs(endX - startX) * 0.5);
      if (r < 4 || Math.abs(endX - startX) < 8) {
        return { pathD: `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}` };
      }
      const sX = endX >= startX ? 1 : -1;
      return {
        pathD: `M ${startX} ${startY} V ${midY - r} Q ${startX} ${midY} ${startX + sX * r} ${midY} H ${endX - sX * r} Q ${endX} ${midY} ${endX} ${midY + r} V ${endY}`,
      };
    }
    if (style === "bracket") {
      const spineY = startY + 20;
      return { pathD: `M ${startX} ${startY} V ${spineY} H ${endX} V ${endY}` };
    }
    if (style === "fishbone") {
      const deltaX = endX - startX;
      const angleDist = Math.min(Math.abs(deltaX), Math.abs(endY - startY) * 0.4);
      const sY = endY >= startY ? 1 : -1;
      const cornerY = startY + sY * angleDist;
      return { pathD: `M ${startX} ${startY} L ${endX} ${cornerY} V ${endY}` };
    }
    // Curved (vertical bezier)
    const deltaY = Math.abs(endY - startY) * 0.55;
    return {
      pathD: `M ${startX} ${startY} C ${startX} ${startY + deltaY}, ${endX} ${endY - deltaY}, ${endX} ${endY}`,
    };
  }

  // Horizontal Layout (Balanced / Right-Only)
  if (style === "straight") {
    return { pathD: `M ${startX} ${startY} L ${endX} ${endY}` };
  }
  if (style === "flowchart") {
    const midX = isLeft ? startX - (startX - endX) / 2 : startX + (endX - startX) / 2;
    return {
      pathD: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`,
      markerEnd: "url(#mindmap-arrow)",
    };
  }
  if (style === "rounded") {
    const midX = (startX + endX) / 2;
    const r = Math.min(14, Math.abs(midX - startX) * 0.7, Math.abs(endY - startY) * 0.5);
    if (r < 4 || Math.abs(endY - startY) < 6) {
      return { pathD: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}` };
    }
    const sY = endY >= startY ? 1 : -1;
    const sX = isLeft ? -1 : 1;
    return {
      pathD: `M ${startX} ${startY} H ${midX - sX * r} Q ${midX} ${startY} ${midX} ${startY + sY * r} V ${endY - sY * r} Q ${midX} ${endY} ${midX + sX * r} ${endY} H ${endX}`,
    };
  }
  if (style === "bracket") {
    const spineX = isLeft ? startX - 24 : startX + 24;
    return { pathD: `M ${startX} ${startY} H ${spineX} V ${endY} H ${endX}` };
  }
  if (style === "fishbone") {
    const dy = endY - startY;
    const angleDist = Math.min(Math.abs(dy), Math.abs(endX - startX) * 0.45);
    const sX = isLeft ? -1 : 1;
    const cornerX = startX + sX * angleDist;
    return { pathD: `M ${startX} ${startY} L ${cornerX} ${endY} H ${endX}` };
  }
  // Default: Organic Curved (horizontal cubic bezier)
  const deltaX = Math.abs(endX - startX) * 0.55;
  const cp1X = isLeft ? startX - deltaX : startX + deltaX;
  const cp2X = isLeft ? endX + deltaX : endX - deltaX;
  return { pathD: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}` };
}

const COLOR_PRESETS = [
  { name: "Purple", hex: "#a855f7", bg: "rgba(168,85,247,0.25)", border: "#c084fc", text: "#faf5ff" },
  { name: "Pink", hex: "#ec4899", bg: "rgba(236,72,153,0.25)", border: "#f472b6", text: "#fdf2f8" },
  { name: "Teal/Emerald", hex: "#10b981", bg: "rgba(16,185,129,0.25)", border: "#34d399", text: "#ecfdf5" },
  { name: "Cyan/Sky", hex: "#06b6d4", bg: "rgba(6,182,212,0.25)", border: "#22d3ee", text: "#f0fdfa" },
  { name: "Indigo/Blue", hex: "#3b82f6", bg: "rgba(59,130,246,0.25)", border: "#60a5fa", text: "#eff6ff" },
  { name: "Orange", hex: "#f97316", bg: "rgba(249,115,22,0.25)", border: "#fb923c", text: "#fff7ed" },
  { name: "Amber/Gold", hex: "#eab308", bg: "rgba(234,179,8,0.25)", border: "#facc15", text: "#fefce8" },
  { name: "Rose", hex: "#f43f5e", bg: "rgba(244,63,94,0.25)", border: "#fb7185", text: "#fff1f2" }
];

export type MindNodeShape = "rounded" | "rectangle" | "diamond" | "hexagon" | "cloud";

export const NODE_SHAPES: { id: MindNodeShape; label: string; icon: any }[] = [
  { id: "rounded", label: "Pill Capsule", icon: Circle },
  { id: "rectangle", label: "Sharp Box", icon: Square },
  { id: "diamond", label: "Diamond Rhombus", icon: Diamond },
  { id: "hexagon", label: "Hexagon", icon: Hexagon },
  { id: "cloud", label: "Idea Cloud", icon: Cloud },
];

export const QUICK_EMOJIS = ["⚡", "☕", "🚀", "💡", "🎯", "📌", "⚠️", "✅", "🧠", "📚", "🔬", "💻", "📊", "🔥"];

export const BRANCH_THEMES: Record<string, { name: string; colors: string[] }> = {
  spectrum: {
    name: "🌈 Neon Spectrum",
    colors: ["#06b6d4", "#a855f7", "#ec4899", "#10b981", "#f97316", "#eab308", "#3b82f6", "#f43f5e"],
  },
  ocean: {
    name: "🌊 Electric Ocean",
    colors: ["#0284c7", "#06b6d4", "#38bdf8", "#0ea5e9", "#67e8f9", "#7dd3fc"],
  },
  forest: {
    name: "🌲 Emerald Forest",
    colors: ["#059669", "#10b981", "#34d399", "#84cc16", "#22c55e", "#6ee7b7"],
  },
  sunset: {
    name: "🌅 Sunset Rose",
    colors: ["#f43f5e", "#f97316", "#fb923c", "#ec4899", "#d946ef", "#fda4af"],
  },
};

export function getNodeShapeClasses(shape?: string, isRoot = false): string {
  if (isRoot) return "rounded-2xl";
  switch (shape) {
    case "rectangle":
      return "rounded-none border-2";
    case "diamond":
      return "rounded-md rotate-[0.5deg] border-2";
    case "hexagon":
      return "rounded-xl border-dashed border-2";
    case "cloud":
      return "rounded-[26px] border-2";
    case "rounded":
    default:
      return "rounded-2xl";
  }
}

const ICON_PRESETS = [
  { name: "Book", icon: BookOpen },
  { name: "Code", icon: Code },
  { name: "Hardware", icon: Cpu },
  { name: "Docs", icon: FileText },
  { name: "Target", icon: CheckCircle2 },
  { name: "Warning", icon: AlertCircle },
  { name: "Sparkle", icon: Sparkles },
  { name: "Layers", icon: Layers },
];

// Pre-built Mind Map Templates
const TEMPLATES: Record<string, { name: string; nodes: MindNode[] }> = {
  java: {
    name: "☕ Java OOPs & Spring Ecosystem",
    nodes: [
      { id: "root", parentId: null, text: "☕ Java Backend Architecture", x: 500, y: 320, color: "#a855f7", status: "in-progress" },
      { id: "j1", parentId: "root", text: "OOPs Principles", x: 220, y: 180, color: "#ec4899", side: "left", status: "done" },
      { id: "j1-1", parentId: "j1", text: "Encapsulation & Abstraction", x: -30, y: 150, color: "#ec4899", side: "left", status: "done" },
      { id: "j1-2", parentId: "j1", text: "Polymorphism & Interfaces", x: -30, y: 220, color: "#ec4899", side: "left", status: "done" },
      { id: "j2", parentId: "root", text: "JVM Memory Management", x: 220, y: 440, color: "#06b6d4", side: "left", status: "in-progress" },
      { id: "j2-1", parentId: "j2", text: "Heap vs Stack Memory", x: -30, y: 440, color: "#06b6d4", side: "left", status: "todo" },
      { id: "j3", parentId: "root", text: "Spring Boot 3 Web", x: 780, y: 180, color: "#10b981", side: "right", status: "in-progress" },
      { id: "j3-1", parentId: "j3", text: "REST Controller & DTO", x: 1040, y: 140, color: "#10b981", side: "right", status: "done" },
      { id: "j3-2", parentId: "j3", text: "Spring Security & JWT", x: 1040, y: 220, color: "#10b981", side: "right", status: "todo" },
      { id: "j4", parentId: "root", text: "Relational DB & Hibernate", x: 780, y: 440, color: "#eab308", side: "right", status: "done" },
      { id: "j4-1", parentId: "j4", text: "JPA Repository & Queries", x: 1040, y: 440, color: "#eab308", side: "right", status: "done" }
    ]
  },
  dsa: {
    name: "📊 Data Structures & Algorithms Roadmap",
    nodes: [
      { id: "root", parentId: null, text: "📊 DSA Master Roadmap", x: 500, y: 320, color: "#3b82f6", status: "in-progress" },
      { id: "d1", parentId: "root", text: "Arrays & Strings", x: 220, y: 180, color: "#06b6d4", side: "left", status: "done" },
      { id: "d1-1", parentId: "d1", text: "Two Pointers & Sliding Window", x: -30, y: 180, color: "#06b6d4", side: "left", status: "done" },
      { id: "d2", parentId: "root", text: "Linked Lists & Stacks", x: 220, y: 440, color: "#f97316", side: "left", status: "done" },
      { id: "d2-1", parentId: "d2", text: "Fast & Slow Pointers", x: -30, y: 440, color: "#f97316", side: "left", status: "done" },
      { id: "d3", parentId: "root", text: "Trees & Binary Search", x: 780, y: 180, color: "#10b981", side: "right", status: "in-progress" },
      { id: "d3-1", parentId: "d3", text: "Lowest Common Ancestor", x: 1040, y: 180, color: "#10b981", side: "right", status: "todo" },
      { id: "d4", parentId: "root", text: "Graphs & Dynamic Prog", x: 780, y: 440, color: "#a855f7", side: "right", status: "todo" },
      { id: "d4-1", parentId: "d4", text: "0/1 Knapsack & Grid DP", x: 1040, y: 440, color: "#a855f7", side: "right", status: "todo" }
    ]
  },
  python: {
    name: "⚡ Python & AI Engineering",
    nodes: [
      { id: "root", parentId: null, text: "⚡ Python & AI Engineering", x: 500, y: 320, color: "#10b981", status: "in-progress" },
      { id: "py1", parentId: "root", text: "Core Python & Typing", x: 220, y: 180, color: "#3b82f6", side: "left", status: "done" },
      { id: "py1-1", parentId: "py1", text: "Decorators & Generators", x: -30, y: 180, color: "#3b82f6", side: "left", status: "done" },
      { id: "py2", parentId: "root", text: "FastAPI & Pydantic", x: 220, y: 440, color: "#f97316", side: "left", status: "in-progress" },
      { id: "py2-1", parentId: "py2", text: "Async Request Handlers", x: -30, y: 440, color: "#f97316", side: "left", status: "in-progress" },
      { id: "py3", parentId: "root", text: "Data Science Stack", x: 780, y: 180, color: "#ec4899", side: "right", status: "done" },
      { id: "py3-1", parentId: "py3", text: "NumPy Vectorization & Pandas", x: 1040, y: 180, color: "#ec4899", side: "right", status: "done" },
      { id: "py4", parentId: "root", text: "LLM Orchestration", x: 780, y: 440, color: "#a855f7", side: "right", status: "in-progress" },
      { id: "py4-1", parentId: "py4", text: "Embeddings & Vector Search", x: 1040, y: 440, color: "#a855f7", side: "right", status: "todo" }
    ]
  },
  calculus: {
    name: "🧮 Mathematics & Engineering Calculus",
    nodes: [
      { id: "root", parentId: null, text: "🧮 Engineering Mathematics", x: 500, y: 320, color: "#eab308", status: "in-progress" },
      { id: "m1", parentId: "root", text: "Differential Calculus", x: 220, y: 180, color: "#06b6d4", side: "left", status: "done" },
      { id: "m1-1", parentId: "m1", text: "Limits & Continuity", x: -30, y: 150, color: "#06b6d4", side: "left", status: "done" },
      { id: "m1-2", parentId: "m1", text: "Chain Rule & Derivatives", x: -30, y: 220, color: "#06b6d4", side: "left", status: "done" },
      { id: "m2", parentId: "root", text: "Integral Calculus", x: 220, y: 440, color: "#10b981", side: "left", status: "in-progress" },
      { id: "m2-1", parentId: "m2", text: "Definite Integrals & Areas", x: -30, y: 440, color: "#10b981", side: "left", status: "todo" },
      { id: "m3", parentId: "root", text: "Linear Algebra", x: 780, y: 180, color: "#3b82f6", side: "right", status: "done" },
      { id: "m3-1", parentId: "m3", text: "Matrices & Eigenvalues", x: 1040, y: 180, color: "#3b82f6", side: "right", status: "done" },
      { id: "m4", parentId: "root", text: "Probability & Statistics", x: 780, y: 440, color: "#f43f5e", side: "right", status: "in-progress" },
      { id: "m4-1", parentId: "m4", text: "Bayes' Theorem & Distributions", x: 1040, y: 440, color: "#f43f5e", side: "right", status: "todo" }
    ]
  }
};

export function MindMapPage() {
  const [nodes, setNodes] = useState<MindNode[]>([]);
  const [relationships, setRelationships] = useState<MindMapRelationship[]>([]);
  const [layoutMode, setLayoutMode] = useState<"balanced" | "right-only" | "tree">("balanced");
  const [curveStyle, setCurveStyle] = useState<MindMapCurveStyle>("curved");
  const [isLoaded, setIsLoaded] = useState(false);

  // Multi-Map Slide Deck Management
  const [deck, setDeck] = useState<MindMapDeckItem[]>([]);
  const [activeDeckIndex, setActiveDeckIndex] = useState<number>(0);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  const [history, setHistory] = useState<MindNode[][]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [curveWidth, setCurveWidth] = useState<number>(2.5);
  const [activeColor, setActiveColor] = useState<string>(COLOR_PRESETS[0].hex);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [customAiTopic, setCustomAiTopic] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  
  // New Panels & Features
  const [showOutline, setShowOutline] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Cross-link connection mode
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Dragging node state with cycle detection & reparenting
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [preDragPosition, setPreDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverReparentTargetId, setHoverReparentTargetId] = useState<string | null>(null);

  // Empty State & Outline Import
  const [emptyRootInput, setEmptyRootInput] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [markdownOutlineInput, setMarkdownOutlineInput] = useState("");

  // Canvas View transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Bounding box for infinite canvas navigation and Mini-Map
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: 1200, minY: 0, maxY: 800, w: 1200, h: 800 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x + 200 > maxX) maxX = n.x + 200;
      if (n.y < minY) minY = n.y;
      if (n.y + 60 > maxY) maxY = n.y + 60;
    }
    const pad = 120;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;
    return {
      minX, maxX, minY, maxY,
      w: Math.max(300, maxX - minX),
      h: Math.max(200, maxY - minY),
    };
  }, [nodes]);

  const panTo = useCallback((worldX: number, worldY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPan({
      x: rect.width / 2 - worldX * zoom,
      y: rect.height / 2 - worldY * zoom,
    });
  }, [zoom]);

  const updateSelectedNodeShape = (shape: MindNodeShape) => {
    if (!selectedNodeId) return;
    const next = nodes.map((n) => (n.id === selectedNodeId ? { ...n, shape } : n));
    pushState(next);
  };

  const updateSelectedNodeIcon = (icon?: string) => {
    if (!selectedNodeId) return;
    const next = nodes.map((n) => (n.id === selectedNodeId ? { ...n, icon } : n));
    pushState(next);
  };

  const applyBranchTheme = (themeKey: keyof typeof BRANCH_THEMES) => {
    if (nodes.length === 0) return;
    const root = nodes.find((n) => n.parentId === null) || nodes[0];
    const directChildren = nodes.filter((n) => n.parentId === root.id);
    if (directChildren.length === 0) return;

    const themeColors = BRANCH_THEMES[themeKey].colors;
    const colorMap = new Map<string, string>();

    function assignColorDown(parentId: string, color: string) {
      colorMap.set(parentId, color);
      const children = nodes.filter((n) => n.parentId === parentId);
      for (const c of children) {
        assignColorDown(c.id, color);
      }
    }

    directChildren.forEach((child, idx) => {
      const color = themeColors[idx % themeColors.length];
      assignColorDown(child.id, color);
    });

    const nextNodes = nodes.map((n) => {
      if (n.id === root.id) return n;
      const c = colorMap.get(n.id);
      return c ? { ...n, color: c } : n;
    });

    pushState(nextNodes);
    setShowThemeModal(false);
    showToast(`Applied ${BRANCH_THEMES[themeKey].name} to branches!`, "success");
  };

  // Load Deck & Mind Map from Dexie/localStorage on Mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      await initStorageMigration();
      
      let initialDeck: MindMapDeckItem[] = [];
      const savedDeckJson = localStorage.getItem(DECK_STORAGE_KEY);
      if (savedDeckJson) {
        try {
          const parsed = JSON.parse(savedDeckJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialDeck = parsed;
          }
        } catch (e) {
          console.warn("[MindMap] Failed to parse deck from storage", e);
        }
      }

      if (initialDeck.length === 0) {
        const loaded = await loadMindMap();
        if (loaded.nodes && loaded.nodes.length > 0) {
          const legacyTitle = loaded.nodes.find((n) => !n.parentId)?.text || "☕ Java Backend Architecture";
          initialDeck = [
            {
              id: "deck-" + Date.now(),
              title: legacyTitle,
              nodes: loaded.nodes,
              relationships: loaded.relationships || [],
              layoutMode: loaded.layoutMode || "balanced",
              curveStyle: "curved",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          ];
        } else {
          initialDeck = [
            {
              id: "deck-java-init",
              title: TEMPLATES.java.name,
              nodes: TEMPLATES.java.nodes,
              relationships: [],
              layoutMode: "balanced",
              curveStyle: "curved",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          ];
        }
        localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(initialDeck));
      }

      if (isMounted) {
        setDeck(initialDeck);
        setActiveDeckIndex(0);
        const first = initialDeck[0];
        setNodes(first.nodes || []);
        setRelationships(first.relationships || []);
        setLayoutMode(first.layoutMode || "balanced");
        setCurveStyle(first.curveStyle || "curved");
        if (first.nodes && first.nodes.length > 0) {
          setSelectedNodeId(first.nodes[0].id);
        }
        setIsLoaded(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist Current MindMap Changes into Deck and Dexie
  useEffect(() => {
    if (!isLoaded || deck.length === 0) return;

    saveMindMap(nodes, relationships, layoutMode);

    setDeck((prevDeck) => {
      if (!prevDeck[activeDeckIndex]) return prevDeck;
      const current = prevDeck[activeDeckIndex];
      if (
        current.nodes === nodes &&
        current.relationships === relationships &&
        current.layoutMode === layoutMode &&
        current.curveStyle === curveStyle
      ) {
        return prevDeck;
      }
      const updated = [...prevDeck];
      updated[activeDeckIndex] = {
        ...current,
        nodes,
        relationships,
        layoutMode,
        curveStyle,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [nodes, relationships, layoutMode, curveStyle, isLoaded, activeDeckIndex]);

  // Fullscreen Escape Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Deck Management Handlers
  const handleSwitchDeck = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= deck.length || newIndex === activeDeckIndex) return;

    // Save current active map state first
    const current = deck[activeDeckIndex];
    if (current) {
      deck[activeDeckIndex] = {
        ...current,
        nodes,
        relationships,
        layoutMode,
        curveStyle,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck));
    }

    const target = deck[newIndex];
    setActiveDeckIndex(newIndex);
    setNodes(target.nodes || []);
    setRelationships(target.relationships || []);
    setLayoutMode(target.layoutMode || "balanced");
    setCurveStyle(target.curveStyle || "curved");
    setSelectedNodeId(target.nodes && target.nodes.length > 0 ? target.nodes[0].id : null);
    setHistory([]);
    setHistoryIdx(-1);
    setIsRenamingTitle(false);
  }, [deck, activeDeckIndex, nodes, relationships, layoutMode, curveStyle]);

  const handleAddNewMap = useCallback(() => {
    const newId = "deck-" + Date.now();
    const newTitle = `Mind Map ${deck.length + 1}`;
    const newRootNode: MindNode = {
      id: "root-" + Date.now(),
      parentId: null,
      text: "Central Concept",
      x: 500,
      y: 320,
      color: COLOR_PRESETS[deck.length % COLOR_PRESETS.length].hex,
      status: "todo",
    };
    const newMap: MindMapDeckItem = {
      id: newId,
      title: newTitle,
      nodes: [newRootNode],
      relationships: [],
      layoutMode: "balanced",
      curveStyle: "curved",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...deck, newMap];
    setDeck(updated);
    setActiveDeckIndex(updated.length - 1);
    setNodes(newMap.nodes);
    setRelationships([]);
    setLayoutMode("balanced");
    setCurveStyle("curved");
    setSelectedNodeId(newRootNode.id);
    setHistory([]);
    setHistoryIdx(-1);
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(updated));
    showToast(`Created "${newTitle}"`, "success");
  }, [deck, showToast]);

  const handleDeleteCurrentMap = useCallback(() => {
    if (deck.length <= 1) {
      showToast("At least one mind map is required", "info");
      return;
    }
    const current = deck[activeDeckIndex];
    const confirmDelete = window.confirm(`Delete mind map "${current.title}"? This cannot be undone.`);
    if (!confirmDelete) return;

    const nextDeck = deck.filter((_, idx) => idx !== activeDeckIndex);
    const nextIndex = Math.max(0, activeDeckIndex - 1);
    const nextMap = nextDeck[nextIndex];

    setDeck(nextDeck);
    setActiveDeckIndex(nextIndex);
    setNodes(nextMap.nodes || []);
    setRelationships(nextMap.relationships || []);
    setLayoutMode(nextMap.layoutMode || "balanced");
    setCurveStyle(nextMap.curveStyle || "curved");
    setSelectedNodeId(nextMap.nodes && nextMap.nodes.length > 0 ? nextMap.nodes[0].id : null);
    setHistory([]);
    setHistoryIdx(-1);
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(nextDeck));
    showToast(`Deleted "${current.title}"`, "info");
  }, [deck, activeDeckIndex, showToast]);

  const commitTitleRename = useCallback(() => {
    if (!tempTitle.trim() || !deck[activeDeckIndex]) {
      setIsRenamingTitle(false);
      return;
    }
    const updated = [...deck];
    updated[activeDeckIndex] = {
      ...updated[activeDeckIndex],
      title: tempTitle.trim(),
      updatedAt: new Date().toISOString(),
    };
    setDeck(updated);
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(updated));
    setIsRenamingTitle(false);
  }, [deck, activeDeckIndex, tempTitle]);

  const currentMapTitle = deck[activeDeckIndex]?.title || nodes.find((n) => !n.parentId)?.text || "Mind Map";

  // Push Undo State (capped at 30 items)
  const pushState = useCallback((newNodes: MindNode[], newRels?: MindMapRelationship[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIdx + 1);
      const next = [...sliced, newNodes];
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIdx((prev) => Math.min(prev + 1, 29));
    setNodes(newNodes);
    if (newRels !== undefined) {
      setRelationships(newRels);
    }
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setNodes(history[nextIdx]);
      showToast("Undo", "info");
    }
  }, [historyIdx, history, showToast]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setNodes(history[nextIdx]);
      showToast("Redo", "info");
    }
  }, [historyIdx, history, showToast]);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Branch IDs for Focus Mode (Active node + ancestors + descendants)
  const branchIds = useMemo(() => {
    if (!isFocusMode || !selectedNodeId) return null;
    const ids = new Set<string>();
    
    // Descendants
    const collectDescendants = (parentId: string) => {
      ids.add(parentId);
      for (const n of nodes) {
        if (n.parentId === parentId) {
          collectDescendants(n.id);
        }
      }
    };
    collectDescendants(selectedNodeId);

    // Ancestors
    let curr: MindNode | undefined = nodes.find((n) => n.id === selectedNodeId);
    while (curr && curr.parentId) {
      ids.add(curr.parentId);
      curr = nodes.find((n) => n.id === curr!.parentId);
    }

    return ids;
  }, [isFocusMode, selectedNodeId, nodes]);

  // Search matches
  const matchingNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const matches = nodes.filter((n) => 
      n.text.toLowerCase().includes(q) || 
      (n.notes && n.notes.toLowerCase().includes(q))
    );
    return new Set(matches.map((n) => n.id));
  }, [nodes, searchQuery]);

  // Layout mode switcher
  const handleApplyLayoutMode = (mode: "balanced" | "right-only" | "tree") => {
    setLayoutMode(mode);
    const laidOut = calculateTreeLayout(nodes, mode);
    pushState(laidOut);
    showToast(`Applied ${mode} layout`, "success");
  };

  // Node editing
  const startInlineEdit = (node: MindNode) => {
    setEditingNodeId(node.id);
    setEditText(node.text);
  };

  const saveInlineEdit = () => {
    if (!editingNodeId) return;
    const text = editText.trim();
    if (text) {
      const next = nodes.map((n) => (n.id === editingNodeId ? { ...n, text } : n));
      pushState(next);
    }
    setEditingNodeId(null);
  };

  // Add Independent Main Topic / Root
  const addIndependentTopic = (text = "New Topic Concept", xPos?: number, yPos?: number) => {
    const newNode: MindNode = {
      id: crypto.randomUUID(),
      parentId: null,
      text,
      x: xPos !== undefined ? xPos : (450 + Math.random() * 100),
      y: yPos !== undefined ? yPos : (300 + Math.random() * 80),
      color: activeColor,
      status: "todo",
    };
    const next = [...nodes, newNode];
    pushState(next);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditText(text);
  };

  // Add Subtopic to Selected Node
  const addSubtopic = (parentId?: string) => {
    const targetParentId = parentId || selectedNodeId || (nodes[0] ? nodes[0].id : null);
    if (!targetParentId) {
      addIndependentTopic();
      return;
    }

    const parent = nodes.find((n) => n.id === targetParentId);
    if (!parent) return;

    let side = parent.side;
    if (parent.parentId === null) {
      const leftCount = nodes.filter((n) => n.parentId === parent.id && n.side === "left").length;
      const rightCount = nodes.filter((n) => n.parentId === parent.id && n.side === "right").length;
      side = leftCount <= rightCount ? "left" : "right";
    }

    const siblings = nodes.filter((n) => n.parentId === targetParentId);
    const offsetX = side === "left" ? -240 : 240;
    const offsetY = (siblings.length) * 70 + (Math.random() * 10 - 5);

    const newNode: MindNode = {
      id: crypto.randomUUID(),
      parentId: targetParentId,
      text: "New Subtopic",
      x: parent.x + offsetX,
      y: parent.y + offsetY,
      color: parent.color || activeColor,
      side,
      status: "todo",
    };

    const next = nodes.map((n) => (n.id === parent.id ? { ...n, collapsed: false } : n)).concat(newNode);
    pushState(next);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditText("New Subtopic");
    showToast("Subtopic Added", "success");
  };

  // Add Sibling Topic
  const addSiblingTopic = () => {
    if (!selectedNode || !selectedNode.parentId) {
      addIndependentTopic();
      return;
    }
    addSubtopic(selectedNode.parentId);
  };

  // Delete Selected Node (with cascading delete and relationship cleanup)
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    const { remainingNodes, deletedIds } = removeNodeAndDescendants(nodes, selectedNodeId);
    const updatedRels = cleanupRelationships(relationships, deletedIds);
    pushState(remainingNodes, updatedRels);
    setSelectedNodeId(remainingNodes[0] ? remainingNodes[0].id : null);
    showToast("Node removed", "info");
  };

  // Sibling Navigation (Alt+Up / Alt+Down)
  const navigateSibling = (direction: "prev" | "next") => {
    if (!selectedNode) return;
    const siblings = nodes.filter((n) => n.parentId === selectedNode.parentId);
    if (siblings.length <= 1) return;
    const currIdx = siblings.findIndex((n) => n.id === selectedNode.id);
    if (currIdx === -1) return;
    const targetIdx = direction === "next" 
      ? (currIdx + 1) % siblings.length 
      : (currIdx - 1 + siblings.length) % siblings.length;
    setSelectedNodeId(siblings[targetIdx].id);
  };

  // Attach Image (downscale to <= 256px, max 200 KB)
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNodeId) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose a valid image file", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = calculateDownscaleDimensions(img.width, img.height, 256);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        const next = nodes.map((n) => (n.id === selectedNodeId ? { ...n, imageUrl: dataUrl } : n));
        pushState(next);
        showToast("Image attached to node", "success");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeNodeImage = () => {
    if (!selectedNodeId) return;
    const next = nodes.map((n) => (n.id === selectedNodeId ? { ...n, imageUrl: undefined } : n));
    pushState(next);
    showToast("Image removed", "info");
  };

  const setNodeIcon = (iconName: string) => {
    if (!selectedNodeId) return;
    const next = nodes.map((n) => (n.id === selectedNodeId ? { ...n, icon: iconName } : n));
    pushState(next);
  };

  // Cross-Link Relationships
  const startCrossLinkConnection = (nodeId: string) => {
    setConnectingSourceId(nodeId);
    showToast("Click a target node to connect", "info");
  };

  const completeCrossLinkConnection = (targetId: string) => {
    if (!connectingSourceId) return;
    if (connectingSourceId === targetId) {
      setConnectingSourceId(null);
      return;
    }

    const newRel: MindMapRelationship = {
      id: crypto.randomUUID(),
      from: connectingSourceId,
      to: targetId,
      label: "relates to",
      color: "#06b6d4",
    };

    setRelationships((prev) => [...prev, newRel]);
    setConnectingSourceId(null);
    showToast("Cross-link created", "success");
  };

  const deleteRelationship = (relId: string) => {
    setRelationships((prev) => prev.filter((r) => r.id !== relId));
    showToast("Cross-link removed", "info");
  };

  // Status cycling
  const cycleNodeStatus = (nodeId: string) => {
    const cycleMap: Record<NodeStatus, NodeStatus> = {
      todo: "in-progress",
      "in-progress": "done",
      done: "todo",
    };
    const next = nodes.map((n) => {
      if (n.id === nodeId) {
        const nextStatus = cycleMap[n.status || "todo"];
        return { ...n, status: nextStatus };
      }
      return n;
    });
    pushState(next);
  };

  const toggleCollapse = (nodeId: string) => {
    const next = nodes.map((n) => (n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n));
    pushState(next);
  };

  // Mouse & Dragging Handlers (with Drag-to-Reparent & Cycle Detection)
  const handleNodeMouseDown = (e: React.MouseEvent, node: MindNode) => {
    e.stopPropagation();
    if (connectingSourceId) {
      completeCrossLinkConnection(node.id);
      return;
    }

    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setPreDragPosition({ x: node.x, y: node.y });
    setDragOffset({
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = e.clientX / zoom - dragOffset.x;
      const newY = e.clientY / zoom - dragOffset.y;

      // Update position of dragging node
      setNodes((prev) => prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n)));

      // Detect hover over another node for reparenting (hit test within 85px)
      const target = nodes.find(
        (other) =>
          other.id !== draggingNodeId &&
          Math.hypot(other.x + 90 - (newX + 90), other.y + 24 - (newY + 24)) < 85
      );
      setHoverReparentTargetId(target ? target.id : null);
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      if (hoverReparentTargetId) {
        // Drag-to-reparent drop
        if (wouldCreateCycle(nodes, draggingNodeId, hoverReparentTargetId)) {
          showToast("Cannot move a parent node into its own descendant branch", "warning");
          // Revert position
          if (preDragPosition) {
            setNodes((prev) =>
              prev.map((n) => (n.id === draggingNodeId ? { ...n, ...preDragPosition } : n))
            );
          }
        } else {
          // Reparent & Re-layout
          const reparented = reparentNode(nodes, draggingNodeId, hoverReparentTargetId);
          const laidOut = calculateTreeLayout(reparented, layoutMode);
          pushState(laidOut);
          showToast("Node reparented", "success");
        }
      }
      setDraggingNodeId(null);
      setHoverReparentTargetId(null);
      setPreDragPosition(null);
    }
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 3);
      setZoom(newZoom);
    } else {
      setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId || (e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        addSubtopic();
      } else if (e.key === "Enter") {
        e.preventDefault();
        addSiblingTopic();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedNode();
      } else if (e.key === "F2") {
        e.preventDefault();
        if (selectedNode) startInlineEdit(selectedNode);
      } else if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        navigateSibling("prev");
      } else if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        navigateSibling("next");
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        handleApplyLayoutMode(layoutMode === "balanced" ? "right-only" : layoutMode === "right-only" ? "tree" : "balanced");
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setShowOutline((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      } else if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "Escape") {
        if (isPresentMode) setIsPresentMode(false);
        if (connectingSourceId) setConnectingSourceId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, editingNodeId, layoutMode, isPresentMode, connectingSourceId]);

  // Center View
  const centerView = useCallback(() => {
    if (nodes.length === 0) return;
    const root = nodes.find((n) => n.parentId === null) || nodes[0];
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setPan({
          x: rect.width / 2 - (root.x + 90) * zoom,
          y: rect.height / 2 - (root.y + 24) * zoom,
        });
      }
    }
  }, [nodes, zoom]);

  // Auto-center on fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      centerView();
    }, 60);
    return () => clearTimeout(timer);
  }, [isFullscreen, centerView]);

  // Presentation Mode: smoothly center spotlight on active node
  useEffect(() => {
    if (isPresentMode && nodes[presentIndex]) {
      const target = nodes[presentIndex];
      panTo(target.x + 90, target.y + 24);
    }
  }, [presentIndex, isPresentMode, nodes, panTo]);

  // Import Markdown Outline
  const importMarkdownOutline = () => {
    const lines = markdownOutlineInput.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const parsedNodes: MindNode[] = [];
    const stack: { id: string; level: number }[] = [];

    lines.forEach((line, idx) => {
      const indentMatch = line.match(/^(\s*)[-*#]?\s*(.*)/);
      if (!indentMatch) return;
      const indent = indentMatch[1].length;
      const text = indentMatch[2].trim();
      if (!text) return;

      const level = Math.floor(indent / 2);
      const id = `node-${idx}-${Date.now()}`;

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;
      parsedNodes.push({
        id,
        parentId,
        text,
        x: 500,
        y: 320,
        color: COLOR_PRESETS[idx % COLOR_PRESETS.length].hex,
        status: "todo",
      });

      stack.push({ id, level });
    });

    const laidOut = calculateTreeLayout(parsedNodes, layoutMode);
    pushState(laidOut);
    setShowImportModal(false);
    setMarkdownOutlineInput("");
    showToast(`Imported ${parsedNodes.length} nodes from Outline`, "success");
  };

  // Export Markdown Outline
  const exportMarkdown = () => {
    if (nodes.length === 0) return;
    const root = nodes.find((n) => n.parentId === null) || nodes[0];
    let md = `# ${root.text}\n\n`;

    const buildSubtree = (parentId: string, level: number) => {
      const children = nodes.filter((n) => n.parentId === parentId);
      children.forEach((c) => {
        const indent = "  ".repeat(level);
        const statusBox = c.status === "done" ? "[x]" : "[ ]";
        md += `${indent}- ${statusBox} ${c.text}\n`;
        if (c.notes) {
          md += `${indent}  > ${c.notes.replace(/\n/g, `\n${indent}  > `)}\n`;
        }
        buildSubtree(c.id, level + 1);
      });
    };

    buildSubtree(root.id, 0);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${root.text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-outline.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Markdown Outline Exported", "success");
  };

  // Export Crisp High-Res PNG
  const exportPNG = async () => {
    if (nodes.length === 0) {
      showToast("Mind Map is empty", "warning");
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      const w = n.parentId === null ? 220 : 180;
      const h = 48;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    });

    if (!isFinite(minX) || !isFinite(minY)) return;

    const padding = 80;
    const rawW = maxX - minX + padding * 2;
    const rawH = maxY - minY + padding * 2;
    const dpr = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rawW * dpr);
    canvas.height = Math.round(rawH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.translate(-minX + padding, -minY + padding);

    // Dark Background
    ctx.fillStyle = "#020617";
    ctx.fillRect(minX - padding, minY - padding, rawW, rawH);

    // Draw Connectors
    nodes.forEach((node) => {
      if (!node.parentId) return;
      const parent = nodes.find((n) => n.id === node.parentId);
      if (!parent) return;

      const pW = parent.parentId === null ? 220 : 180;
      const isVertical = layoutMode === "tree";
      const isLeft = node.x < parent.x;
      const startX = isVertical ? parent.x + pW / 2 : (isLeft ? parent.x : parent.x + pW);
      const startY = isVertical ? parent.y + 48 : (parent.y + 24);
      const endX = isVertical ? node.x + 90 : (isLeft ? node.x + 180 : node.x);
      const endY = isVertical ? node.y : (node.y + 24);

      const { pathD } = calculateEdgePath(startX, startY, endX, endY, isLeft, curveStyle, isVertical);
      try {
        const path2d = new Path2D(pathD);
        ctx.strokeStyle = node.color || "#8b5cf6";
        ctx.lineWidth = curveWidth;
        ctx.stroke(path2d);
      } catch {
        // Fallback for environments where Path2D is not available
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = node.color || "#8b5cf6";
        ctx.lineWidth = curveWidth;
        ctx.stroke();
      }
    });

    // Draw Cross-links
    relationships.forEach((rel) => {
      const fromNode = nodes.find((n) => n.id === rel.from);
      const toNode = nodes.find((n) => n.id === rel.to);
      if (!fromNode || !toNode) return;

      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = rel.color || "#06b6d4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fromNode.x + 90, fromNode.y + 24);
      ctx.lineTo(toNode.x + 90, toNode.y + 24);
      ctx.stroke();
      ctx.restore();
    });

    // Draw Nodes
    nodes.forEach((node) => {
      const isRoot = node.parentId === null;
      const w = isRoot ? 220 : 180;
      const h = 48;
      const r = 16;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, w, h, r);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.strokeStyle = node.color || "#a855f7";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.fillStyle = "#f8fafc";
      ctx.font = `bold 12px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.text.slice(0, 24), node.x + w / 2, node.y + h / 2);
      ctx.restore();
    });

    const dataUrl = canvas.toDataURL("image/png");
    saveImageSafely(dataUrl, "mindmap-crisp-export.png");
    showToast("Mind Map PNG Exported", "success");
  };

  // AI Topic Generation
  const generateCustomAiMap = async () => {
    const topic = customAiTopic.trim();
    if (!topic) return;

    setIsAiGenerating(true);
    try {
      const prompt = `Generate a structured, hierarchical JSON mind map for the topic: "${topic}".
Output ONLY valid JSON in this exact shape:
{
  "title": "${topic}",
  "nodes": [
    { "id": "root", "parentId": null, "text": "${topic}", "side": null },
    { "id": "sub1", "parentId": "root", "text": "Subtopic 1", "side": "left" }
  ]
}
Provide 8 to 14 insightful subtopics categorized cleanly with 'side': 'left' or 'right'. No markdown formatting, just pure JSON.`;

      const response = await callUnifiedAI(prompt);
      const cleaned = (response.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.nodes && Array.isArray(parsed.nodes)) {
        const coloredNodes: MindNode[] = parsed.nodes.map((n: any, idx: number) => ({
          ...n,
          x: 500,
          y: 320,
          color: COLOR_PRESETS[idx % COLOR_PRESETS.length].hex,
          status: "todo",
        }));
        const laidOut = calculateTreeLayout(coloredNodes, layoutMode);
        pushState(laidOut);
        setShowAiModal(false);
        showToast(`AI Mind Map generated for "${topic}"`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("AI generation failed. Please try a manual root node.", "warning");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Presentation Mode Stepper
  const advancePresentation = (step: number) => {
    const nextIdx = Math.max(0, Math.min(nodes.length - 1, presentIndex + step));
    setPresentIndex(nextIdx);
    setSelectedNodeId(nodes[nextIdx].id);
  };

  const mainContent = (
    <div className={`relative flex flex-col ${
      isFullscreen
        ? "fixed inset-0 z-[9999] w-screen h-screen p-3 bg-slate-950"
        : "h-[calc(100vh-4rem)] p-3 md:p-4 space-y-2.5"
    } bg-slate-950 text-slate-100 overflow-hidden select-none`}>
      {/* ─── Floating Exit Pill in Fullscreen Mode ─── */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(false)}
            className="px-3.5 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-purple-300 hover:text-white border border-purple-500/40 shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 transition"
            title="Exit Fullscreen (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Fullscreen</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-mono">Esc</kbd>
          </button>
        </div>
      )}

      {/* ─── Sleek Single-Row Header Toolbar ─── */}
      <Panel className={`p-2 bg-slate-900/95 backdrop-blur border-slate-800 shadow-xl rounded-2xl shrink-0 ${isFullscreen ? "mb-2 border-purple-500/30" : ""}`}>
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {/* 1. Left: Slide Deck Navigation & Map Title */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Deck Pagination Pill */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => handleSwitchDeck(activeDeckIndex - 1)}
                  disabled={activeDeckIndex <= 0}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  title="Previous Map / Slide"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[11px] font-bold text-purple-300 select-none whitespace-nowrap">
                  {deck.length > 0 ? `${activeDeckIndex + 1}/${deck.length}` : "1/1"}
                </span>
                <button
                  onClick={() => handleSwitchDeck(activeDeckIndex + 1)}
                  disabled={activeDeckIndex >= deck.length - 1}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  title="Next Map / Slide"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleAddNewMap}
                  className="p-1 ml-0.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/60 text-purple-300 border border-purple-500/30 transition"
                  title="Create New Mind Map / Slide"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inline Editable Map Title */}
              {isRenamingTitle ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={commitTitleRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTitleRename();
                    if (e.key === "Escape") setIsRenamingTitle(false);
                  }}
                  autoFocus
                  className="px-2 py-0.5 text-xs bg-slate-950 border border-purple-500 rounded-xl text-white font-semibold max-w-[150px] md:max-w-[190px] focus:outline-none"
                />
              ) : (
                <div
                  onClick={() => {
                    setTempTitle(currentMapTitle);
                    setIsRenamingTitle(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl hover:bg-slate-800/80 cursor-pointer text-xs font-semibold text-slate-200 group max-w-[130px] md:max-w-[180px] transition"
                  title="Click to rename mind map"
                >
                  <span className="truncate">{currentMapTitle}</span>
                  <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-purple-400 shrink-0" />
                </div>
              )}

              {/* Delete Current Map Button */}
              {deck.length > 1 && (
                <button
                  onClick={handleDeleteCurrentMap}
                  className="p-1.5 rounded-xl bg-slate-950 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-slate-800 transition shrink-0"
                  title="Delete this mind map"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Middle-Left: Outline, Layout & 6+ Connector Styles */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowOutline((prev) => !prev)}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  showOutline
                    ? "bg-purple-600/30 border-purple-500/50 text-purple-200"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
                title="Toggle Outline Tree (Ctrl+Shift+O)"
              >
                <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden xl:inline">Outline</span>
              </button>

              {/* Layout Mode Segmented Control */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => handleApplyLayoutMode("balanced")}
                  className={`px-2 py-1 rounded-lg transition font-medium ${
                    layoutMode === "balanced" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                  title="Balanced Mind Map"
                >
                  Balanced
                </button>
                <button
                  onClick={() => handleApplyLayoutMode("right-only")}
                  className={`px-2 py-1 rounded-lg transition font-medium ${
                    layoutMode === "right-only" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                  title="Right-Only Flow"
                >
                  Right
                </button>
                <button
                  onClick={() => handleApplyLayoutMode("tree")}
                  className={`px-2 py-1 rounded-lg transition font-medium ${
                    layoutMode === "tree" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                  title="Vertical Hierarchy Tree"
                >
                  Tree
                </button>
              </div>

              {/* 6 Visual Connection Styles Selector */}
              <select
                value={curveStyle}
                onChange={(e) => setCurveStyle(e.target.value as MindMapCurveStyle)}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-2 py-1 text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                title="Visual Connector & Edge Style (6 Styles)"
              >
                <option value="curved">🌊 Curved (Organic)</option>
                <option value="flowchart">🔀 Flowchart (90° + Arrow)</option>
                <option value="straight">📏 Linear (Straight)</option>
                <option value="rounded">➰ Rounded Stepped</option>
                <option value="bracket">🗂️ Bracket Tree</option>
                <option value="fishbone">🐟 Fishbone (Angled)</option>
              </select>
            </div>

            {/* 3. Middle-Right: Search & Mode Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search concepts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-24 md:w-36 pl-7 pr-2 py-1 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:w-44 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsFocusMode((prev) => !prev)}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition ${
                  isFocusMode
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
                title="Focus Branch Mode (Ctrl+Shift+F)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Focus</span>
              </button>

              <button
                onClick={() => {
                  if (nodes.length > 0) {
                    setIsPresentMode(true);
                    setPresentIndex(0);
                  }
                }}
                disabled={nodes.length === 0}
                className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition flex items-center gap-1 disabled:opacity-40"
                title="Presentation Mode (F5)"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Present</span>
              </button>

              <button
                onClick={centerView}
                className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition flex items-center gap-1"
                title="Center View"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xl:inline">Center</span>
              </button>

              <button
                onClick={() => setShowThemeModal(true)}
                className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition flex items-center gap-1"
                title="Auto-Color Branch Themes"
              >
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden xl:inline">Theme</span>
              </button>

              <button
                onClick={() => setShowMiniMap((prev) => !prev)}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition ${
                  showMiniMap
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
                title="Toggle Mini-Map Radar Navigator"
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xl:inline">Radar</span>
              </button>
            </div>

            {/* 4. Right: AI Generate, Export/Import, Undo/Redo & Utility */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowAiModal(true)}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 border border-purple-400/30 transition flex items-center gap-1"
                title="AI Mind Map Generator"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI Generate</span>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 transition"
                title="Import Markdown Outline"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={exportMarkdown}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 transition"
                title="Export Markdown (.md)"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={exportPNG}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 transition"
                title="Export PNG Diagram"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={undo}
                disabled={historyIdx <= 0}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition disabled:opacity-30"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={redo}
                disabled={historyIdx >= history.length - 1}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition disabled:opacity-30"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowShortcutsModal(true)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition"
                title="Keyboard Shortcuts"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {selectedNode && (
                <button
                  onClick={() => setShowNotesDrawer((prev) => !prev)}
                  className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition ${
                    showNotesDrawer
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                  title="Node Properties & Markdown Drawer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              )}

              <button
                onClick={() => setIsFullscreen((prev) => !prev)}
                className={`p-1.5 rounded-xl border transition ${
                  isFullscreen
                    ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-white bg-slate-950 border-slate-800"
                }`}
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Full Screen Mode"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </Panel>

      {/* ─── Main Workspace Area ─── */}
      <div className="relative flex-1 flex overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
        {/* ─── Collapsible Left Outline Drawer ─── */}
        {showOutline && (
          <aside className="w-72 bg-slate-900/95 backdrop-blur border-r border-slate-800 flex flex-col z-30 shrink-0">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-purple-400" /> Topic Outline
              </span>
              <button
                onClick={() => addSubtopic()}
                className="px-2 py-0.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-semibold flex items-center gap-1 border border-purple-500/30"
              >
                <Plus className="w-3 h-3" /> Add Child
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isRoot = node.parentId === null;
                const depth = isRoot ? 0 : 1; // lightweight depth
                return (
                  <div
                    key={`outline-${node.id}`}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setPan({
                        x: 200 - node.x * zoom,
                        y: 200 - node.y * zoom,
                      });
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-xl text-xs cursor-pointer transition ${
                      isSelected
                        ? "bg-purple-600/30 border border-purple-500/50 text-white"
                        : "hover:bg-slate-800/60 text-slate-300"
                    }`}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleNodeStatus(node.id);
                        }}
                      >
                        {node.status === "done" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : node.status === "in-progress" ? (
                          <Clock className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Circle className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                      <span className="truncate">{node.text}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                      {node.notes && <FileText className="w-3 h-3 text-cyan-400" />}
                      {node.imageUrl && <ImageIcon className="w-3 h-3 text-pink-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* ─── Interactive Canvas Viewport ─── */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-slate-950"
        >
          {/* Subtle Grid Pattern */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.25) 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />

          {/* Empty State Card */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-6 z-20">
              <div className="max-w-md w-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <BrainCircuit className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Your Mind Map</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Start blank with a subject name, paste a Markdown outline, or pick a template.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter main subject (e.g. Operating Systems)"
                    value={emptyRootInput}
                    onChange={(e) => setEmptyRootInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && emptyRootInput.trim()) {
                        addIndependentTopic(emptyRootInput.trim());
                        setEmptyRootInput("");
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (emptyRootInput.trim()) {
                        addIndependentTopic(emptyRootInput.trim());
                        setEmptyRootInput("");
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-600/30"
                  >
                    Create
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    Paste Outline
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() => {
                      const t = TEMPLATES.java.nodes;
                      pushState(calculateTreeLayout(t, layoutMode));
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Load Sample Map
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transformed Canvas Content */}
          <div
            className="absolute inset-0 origin-top-left pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Connecting Edges & Cross-links */}
            <svg className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-none overflow-visible">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#06b6d4" />
                </marker>
                <marker
                  id="mindmap-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c084fc" />
                </marker>
              </defs>

              {/* Hierarchy Tree Edges */}
              {nodes.map((node) => {
                if (!node.parentId) return null;
                const parent = nodes.find((n) => n.id === node.parentId);
                if (!parent || parent.collapsed) return null;

                const pW = parent.parentId === null ? 220 : 180;
                const pH = 48;
                const nW = 180;
                const nH = 48;

                const isVertical = layoutMode === "tree";
                const isLeft = node.x < parent.x;
                const startX = isVertical ? parent.x + pW / 2 : (isLeft ? parent.x : parent.x + pW);
                const startY = isVertical ? parent.y + pH : (parent.y + pH / 2);
                const endX = isVertical ? node.x + nW / 2 : (isLeft ? node.x + nW : node.x);
                const endY = isVertical ? node.y : (node.y + nH / 2);

                const { pathD, markerEnd } = calculateEdgePath(
                  startX,
                  startY,
                  endX,
                  endY,
                  isLeft,
                  curveStyle,
                  isVertical
                );

                return (
                  <path
                    key={`line-${node.id}`}
                    d={pathD}
                    fill="none"
                    stroke={node.color || "#8b5cf6"}
                    strokeWidth={curveWidth}
                    strokeOpacity={branchIds && !branchIds.has(node.id) ? 0.15 : 0.85}
                    strokeLinecap="round"
                    markerEnd={markerEnd}
                  />
                );
              })}

              {/* Cross-Link Relationships */}
              {relationships.map((rel) => {
                const fromNode = nodes.find((n) => n.id === rel.from);
                const toNode = nodes.find((n) => n.id === rel.to);
                if (!fromNode || !toNode) return null;

                const startX = fromNode.x + 90;
                const startY = fromNode.y + 24;
                const endX = toNode.x + 90;
                const endY = toNode.y + 24;

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2 - 30;
                const pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

                return (
                  <g key={`rel-${rel.id}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={rel.color || "#06b6d4"}
                      strokeWidth={2}
                      strokeDasharray="5,5"
                      markerEnd="url(#arrow)"
                      opacity={branchIds && (!branchIds.has(rel.from) || !branchIds.has(rel.to)) ? 0.15 : 0.85}
                    />
                    {rel.label && (
                      <text
                        x={midX}
                        y={midY}
                        fill="#67e8f9"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="bg-slate-900"
                      >
                        {rel.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Ghost Indicator Line on Drag Reparenting */}
              {draggingNodeId && hoverReparentTargetId && (
                (() => {
                  const dragged = nodes.find((n) => n.id === draggingNodeId);
                  const target = nodes.find((n) => n.id === hoverReparentTargetId);
                  if (!dragged || !target) return null;
                  return (
                    <line
                      x1={dragged.x + 90}
                      y1={dragged.y + 24}
                      x2={target.x + 90}
                      y2={target.y + 24}
                      stroke="#10b981"
                      strokeWidth={3}
                      strokeDasharray="6,4"
                      className="animate-pulse"
                    />
                  );
                })()
              )}
            </svg>

            {/* Render Node Cards */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isRoot = node.parentId === null;
              const isEditing = node.id === editingNodeId;
              const isHoverTarget = node.id === hoverReparentTargetId;
              const isSearchMatch = matchingNodeIds.has(node.id);
              const isDimmed = branchIds !== null && !branchIds.has(node.id);
              const colorObj = COLOR_PRESETS.find((c) => c.hex === node.color) || COLOR_PRESETS[0];

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startInlineEdit(node);
                  }}
                  className={`absolute pointer-events-auto flex flex-col justify-between p-2 cursor-pointer border transition-all select-none group ${
                    getNodeShapeClasses(node.shape, isRoot)
                  } ${
                    isSelected
                      ? "ring-4 ring-cyan-400/60 shadow-cyan-400/30 scale-[1.02] z-30"
                      : isHoverTarget
                      ? "ring-4 ring-emerald-400 shadow-emerald-400/40 scale-[1.04] z-30"
                      : "hover:scale-[1.01] hover:border-white/50 z-10"
                  } ${isSearchMatch ? "ring-4 ring-amber-400 animate-bounce" : ""}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: isRoot ? "220px" : "180px",
                    minHeight: "48px",
                    opacity: isDimmed ? 0.15 : 1,
                    background: isRoot
                      ? "linear-gradient(135deg, rgba(168,85,247,0.4) 0%, rgba(30,41,59,0.95) 100%)"
                      : `linear-gradient(135deg, ${colorObj.bg} 0%, rgba(15,23,42,0.95) 100%)`,
                    borderColor: isHoverTarget ? "#10b981" : isSearchMatch ? "#fbbf24" : colorObj.border,
                    boxShadow: isSelected
                      ? `0 0 25px ${colorObj.border}88, 0 8px 25px -4px ${colorObj.border}55`
                      : `0 8px 20px -4px ${node.color}33`,
                  }}
                >
                  {/* Thumbnail Image if Attached */}
                  {node.imageUrl && (
                    <div className="w-full h-16 rounded-xl overflow-hidden mb-1.5 border border-white/10 shrink-0 bg-slate-950">
                      <img src={node.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Top Bar: Status + Icon + Text + Badges */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleNodeStatus(node.id);
                        }}
                        className="shrink-0 p-0.5 rounded-full hover:bg-white/20 transition"
                        title={`Status: ${node.status || "todo"} (Click to cycle)`}
                      >
                        {node.status === "done" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : node.status === "in-progress" ? (
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      {node.icon && (
                        <span className="text-xs select-none">{node.icon}</span>
                      )}
                    </div>

                    {isEditing ? (
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveInlineEdit();
                          if (e.key === "Escape") setEditingNodeId(null);
                        }}
                        onBlur={saveInlineEdit}
                        autoFocus
                        className="w-full bg-slate-900 text-white font-bold text-center text-xs outline-none border-b-2 border-cyan-400 px-1 py-0.5 rounded"
                      />
                    ) : (
                      <span
                        className="w-full text-center font-bold text-xs tracking-wide truncate text-white"
                        style={{ color: colorObj.text }}
                      >
                        {node.text}
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {node.notes && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(node.id);
                            setShowNotesDrawer(true);
                          }}
                          className="p-0.5 text-cyan-300 hover:text-white"
                          title="Open Note"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      )}
                      {node.collapsed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(node.id);
                          }}
                          className="p-0.5 text-cyan-300"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add Subtopic (+) Action on Select */}
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addSubtopic(node.id);
                      }}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-lg border border-white/20 transition transform hover:scale-125 z-40"
                      title="Add Subtopic (Shortcut: Tab)"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Canvas Zoom & View Controls */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-2xl px-3 py-2 shadow-2xl z-30">
            <button
              onClick={() => setZoom((prev) => Math.min(prev * 1.2, 3))}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition"
              title="Zoom In (Ctrl+Wheel)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.max(prev * 0.8, 0.25))}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition"
              title="Zoom Out (Ctrl+Wheel)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-800 mx-1" />
            <button
              onClick={centerView}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition"
              title="Center View"
            >
              <Compass className="w-4 h-4" />
            </button>
          </div>

          {/* ─── Floating Mini-Map Radar Navigator ─── */}
          {showMiniMap && nodes.length > 0 && (
            <div className="absolute bottom-4 right-4 z-40 bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1.5 select-none w-52 transition-all">
              <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Compass className="w-3.5 h-3.5" /> Mini-Map Radar
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={centerView}
                    className="p-1 hover:text-white text-slate-400 transition rounded hover:bg-slate-800"
                    title="Center View"
                  >
                    <Move className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowMiniMap(false)}
                    className="p-1 hover:text-white text-slate-400 transition rounded hover:bg-slate-800"
                    title="Collapse Navigator"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const clickY = e.clientY - rect.top;
                  const targetWorldX = bounds.minX + (clickX / rect.width) * bounds.w;
                  const targetWorldY = bounds.minY + (clickY / rect.height) * bounds.h;
                  panTo(targetWorldX, targetWorldY);
                }}
                className="relative w-full h-24 bg-slate-900/90 rounded-xl overflow-hidden cursor-crosshair border border-slate-800"
              >
                {/* Mini Nodes */}
                {nodes.map((n) => {
                  const nx = ((n.x - bounds.minX) / bounds.w) * 100;
                  const ny = ((n.y - bounds.minY) / bounds.h) * 100;
                  return (
                    <div
                      key={`mini-${n.id}`}
                      className="absolute rounded-sm"
                      style={{
                        left: `${nx}%`,
                        top: `${ny}%`,
                        width: n.parentId === null ? "12px" : "8px",
                        height: "4px",
                        backgroundColor: n.color || "#8b5cf6",
                      }}
                    />
                  );
                })}

                {/* Viewport Frame */}
                {containerRef.current && (
                  <div
                    className="absolute border border-cyan-400 bg-cyan-400/20 rounded pointer-events-none transition-all duration-75"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((-pan.x / zoom - bounds.minX) / bounds.w) * 100))}%`,
                      top: `${Math.max(0, Math.min(100, ((-pan.y / zoom - bounds.minY) / bounds.h) * 100))}%`,
                      width: `${Math.min(100, ((containerRef.current.clientWidth / zoom) / bounds.w) * 100)}%`,
                      height: `${Math.min(100, ((containerRef.current.clientHeight / zoom) / bounds.h) * 100)}%`,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Collapsed Navigator Button */}
          {!showMiniMap && nodes.length > 0 && (
            <button
              onClick={() => setShowMiniMap(true)}
              className="absolute bottom-4 right-4 z-40 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white shadow-xl flex items-center gap-1.5 text-xs font-semibold backdrop-blur"
              title="Open Mini-Map Radar"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px]">Radar</span>
            </button>
          )}
        </div>

        {/* ─── Right Slide-over Node Inspector & Notes Drawer ─── */}
        {selectedNode && showNotesDrawer && (
          <aside className="w-80 bg-slate-900/95 backdrop-blur border-l border-slate-800 flex flex-col z-30 shrink-0">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" /> Node Properties
              </span>
              <button
                onClick={() => setShowNotesDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Close Properties Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {/* Text Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Concept Label</label>
                <input
                  type="text"
                  value={selectedNode.text}
                  onChange={(e) => {
                    const text = e.target.value;
                    const next = nodes.map((n) => (n.id === selectedNode.id ? { ...n, text } : n));
                    pushState(next);
                  }}
                  className="w-full mt-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Color Preset Palette */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Accent Color</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => {
                        setActiveColor(color.hex);
                        const next = nodes.map((n) =>
                          n.id === selectedNode.id ? { ...n, color: color.hex } : n
                        );
                        pushState(next);
                      }}
                      className={`h-6 rounded-lg border transition ${
                        selectedNode.color === color.hex ? "ring-2 ring-white scale-105" : ""
                      }`}
                      style={{ backgroundColor: color.hex, borderColor: color.border }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Node Geometry Shape Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1 mb-1.5">
                  <Square className="w-3.5 h-3.5 text-cyan-400" /> Node Shape (5 Styles)
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {NODE_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateSelectedNodeShape(s.id)}
                      className={`h-7 rounded-lg border text-[10px] font-bold flex items-center justify-center transition ${
                        (selectedNode.shape || "rounded") === s.id
                          ? "border-cyan-400 bg-cyan-500/20 text-white"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                      title={s.label}
                    >
                      {s.id === "rounded" ? "Pill" : s.id === "rectangle" ? "Box" : s.id === "diamond" ? "Dia" : s.id === "hexagon" ? "Hex" : "Cloud"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1-Click Emoji / Icon Badges */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5 text-amber-400" /> Quick Icon / Emoji
                  </span>
                  {selectedNode.icon && (
                    <button
                      onClick={() => updateSelectedNodeIcon(undefined)}
                      className="text-[10px] text-slate-400 hover:text-rose-400"
                    >
                      Clear
                    </button>
                  )}
                </label>
                <div className="flex items-center gap-1 flex-wrap p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => updateSelectedNodeIcon(selectedNode.icon === emoji ? undefined : emoji)}
                      className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center transition hover:scale-125 ${
                        selectedNode.icon === emoji ? "bg-purple-600/50 border border-purple-400" : "hover:bg-slate-800"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Node Media / Image Attachment */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase flex items-center justify-between">
                  <span>Attached Image</span>
                  {selectedNode.imageUrl && (
                    <button
                      onClick={removeNodeImage}
                      className="text-rose-400 hover:text-rose-300 text-[10px]"
                    >
                      Remove
                    </button>
                  )}
                </label>
                {selectedNode.imageUrl ? (
                  <div className="mt-1.5 w-full h-24 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img src={selectedNode.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full mt-1.5 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-purple-500 text-slate-400 hover:text-purple-300 text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Attach Image (Auto-capped)
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                />
              </div>

              {/* Cross-Link Action */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Cross-Links</label>
                <button
                  onClick={() => startCrossLinkConnection(selectedNode.id)}
                  className="w-full mt-1.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Link2 className="w-3.5 h-3.5 text-cyan-400" /> Connect to Node...
                </button>
              </div>

              {/* Rich Markdown Note Editor */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase flex items-center justify-between">
                  <span>Study Notes (Markdown)</span>
                </label>
                <textarea
                  rows={6}
                  placeholder="Write formulas ($x^2$), key bullet points, or concepts..."
                  value={selectedNode.notes || ""}
                  onChange={(e) => {
                    const notes = e.target.value;
                    const next = nodes.map((n) => (n.id === selectedNode.id ? { ...n, notes } : n));
                    pushState(next);
                  }}
                  className="w-full mt-1.5 p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                {selectedNode.notes && (
                  <div className="mt-2 p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Live Preview:</span>
                    <MarkdownRenderer content={selectedNode.notes} className="text-xs" />
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-slate-800 flex gap-2">
                <button
                  onClick={() => addSubtopic(selectedNode.id)}
                  className="flex-1 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
                >
                  + Add Child
                </button>
                <button
                  onClick={deleteSelectedNode}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  title="Delete Node"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ─── Presentation Mode Overlay ─── */}
      {isPresentMode && nodes.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-xl p-8 text-white animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm tracking-wide text-slate-300">
                Presentation Mode ({presentIndex + 1} of {nodes.length})
              </span>
            </div>
            <button
              onClick={() => setIsPresentMode(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Exit (Esc)
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full space-y-6 text-center">
            {nodes[presentIndex].imageUrl && (
              <div className="max-w-md max-h-64 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                <img src={nodes[presentIndex].imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs uppercase font-bold tracking-widest text-purple-400">
                Concept {presentIndex + 1}
              </span>
              <h1 className="text-3xl font-extrabold text-white">
                {nodes[presentIndex].text}
              </h1>
            </div>

            {nodes[presentIndex].notes ? (
              <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-left shadow-xl max-h-72 overflow-y-auto">
                <MarkdownRenderer content={nodes[presentIndex].notes!} />
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No notes written for this concept yet.</p>
            )}

            {/* Subtopics preview */}
            {(() => {
              const children = nodes.filter((n) => n.parentId === nodes[presentIndex].id);
              if (children.length === 0) return null;
              return (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                  <span className="text-xs text-slate-400 font-semibold mr-2">Subtopics:</span>
                  {children.map((c) => (
                    <span
                      key={c.id}
                      className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                    >
                      {c.text}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => advancePresentation(-1)}
              disabled={presentIndex === 0}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs text-slate-500 font-mono">Use Space or Arrow Keys to navigate</span>
            <button
              onClick={() => advancePresentation(1)}
              disabled={presentIndex === nodes.length - 1}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold flex items-center gap-2 text-white shadow-lg disabled:opacity-40"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── AI Generation Modal ─── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Wand2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Generate Structured Mind Map</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter any technical or academic topic. The AI generator will structure subtopics, concepts, and relationships automatically.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Distributed Consensus Algorithms, React Fiber, Organic Chemistry"
                value={customAiTopic}
                onChange={(e) => setCustomAiTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateCustomAiMap()}
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <button
                onClick={generateCustomAiMap}
                disabled={isAiGenerating}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isAiGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Markdown Outline Import Modal ─── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Import Markdown Outline</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste an indented bulleted list. Indentation determines parent-child hierarchy:
            </p>

            <textarea
              rows={8}
              placeholder={`# Computer Science\n  - Data Structures\n    - Arrays\n    - Trees\n  - Algorithms\n    - Sorting\n    - Dynamic Programming`}
              value={markdownOutlineInput}
              onChange={(e) => setMarkdownOutlineInput(e.target.value)}
              className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={importMarkdownOutline}
                disabled={!markdownOutlineInput.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-40"
              >
                Build Tree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Keyboard Shortcuts Modal ─── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Mind Map Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Add Subtopic (Child)</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">Tab</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Add Sibling Topic</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">Enter</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Navigate Siblings</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">Alt + ↑ / ↓</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Inline Rename</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">F2 / Double-click</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Delete Node & Subtree</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">Delete / Backspace</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Toggle Layout Mode</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">Ctrl + Shift + L</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Toggle Outline Tree</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">Ctrl + Shift + O</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Toggle Focus Mode</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">Ctrl + Shift + F</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Undo / Redo</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-mono">Ctrl + Z / Ctrl + Shift + Z</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Branch Auto-Color Theming Modal ─── */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" />
                Auto-Color Branches
              </h3>
              <button onClick={() => setShowThemeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Assign harmonious distinct theme colors to every primary branch and all its child topics.
            </p>

            <div className="space-y-2">
              {Object.entries(BRANCH_THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => applyBranchTheme(key as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 hover:border-purple-500/50 bg-slate-950 hover:bg-slate-800/80 transition flex items-center justify-between group"
                >
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white">{theme.name}</span>
                  <div className="flex items-center gap-1">
                    {theme.colors.slice(0, 5).map((clr) => (
                      <span key={clr} className="w-3 h-3 rounded-full" style={{ backgroundColor: clr }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreen && typeof document !== "undefined") {
    return createPortal(mainContent, document.body);
  }

  return mainContent;
}
