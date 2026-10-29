import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  Download, Plus, Trash2, Edit3, Sparkles, RefreshCw, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Palette, Eye, Move, Check, CornerDownRight, 
  Share2, RotateCcw, LayoutTemplate, Sliders, Search, Wand2, Undo, Redo, 
  CheckCircle2, Circle, Clock, FileText, Upload, ChevronRight, ChevronDown, 
  BookOpen, BrainCircuit, X, Compass, HelpCircle, Image as ImageIcon,
  Link2, Unlink, ArrowRight, ArrowLeft, FolderTree, Play, Layers, Code,
  Cpu, AlertCircle
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { Panel } from "@/components/common/Panel";
import { FabricWhiteboard } from "@/components/common/FabricWhiteboard";
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
  const [isLoaded, setIsLoaded] = useState(false);

  const [history, setHistory] = useState<MindNode[][]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [engineMode, setEngineMode] = useState<"tree" | "whiteboard">("tree");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [curveWidth, setCurveWidth] = useState<number>(2.5);
  const [curveStyle, setCurveStyle] = useState<"bezier" | "straight" | "rounded">("bezier");
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

  // Load from Dexie v2 on Mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      await initStorageMigration();
      const loaded = await loadMindMap();
      if (isMounted) {
        if (loaded.nodes && loaded.nodes.length > 0) {
          setNodes(loaded.nodes);
          setRelationships(loaded.relationships || []);
          setLayoutMode(loaded.layoutMode || "balanced");
          setSelectedNodeId(loaded.nodes[0].id);
        }
        setIsLoaded(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist Changes to Dexie v2
  useEffect(() => {
    if (!isLoaded) return;
    saveMindMap(nodes, relationships, layoutMode);
  }, [nodes, relationships, layoutMode, isLoaded]);

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
  const centerView = () => {
    if (nodes.length === 0) return;
    const root = nodes.find((n) => n.parentId === null) || nodes[0];
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - (root.x + 90) * zoom,
        y: rect.height / 2 - (root.y + 24) * zoom,
      });
    }
  };

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
      const startX = node.x < parent.x ? parent.x : parent.x + pW;
      const startY = parent.y + 24;
      const endX = node.x < parent.x ? node.x + 180 : node.x;
      const endY = node.y + 24;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const cpX = (startX + endX) / 2;
      ctx.bezierCurveTo(cpX, startY, cpX, endY, endX, endY);
      ctx.strokeStyle = node.color || "#8b5cf6";
      ctx.lineWidth = 2.5;
      ctx.stroke();
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

  return (
    <div className={`flex flex-col ${
      isFullscreen
        ? "fixed inset-0 z-50 p-2 md:p-3 bg-slate-950"
        : "h-[calc(100vh-4rem)] p-3 md:p-4"
    } space-y-2.5 bg-slate-950 text-slate-100 overflow-hidden select-none`}>
      {/* ─── Header Toolbar ─── */}
      <Panel className="p-2.5 bg-slate-900/95 backdrop-blur border-slate-800 shadow-xl rounded-2xl shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Engine Mode & Outline Drawer Toggle */}
          <div className="flex items-center gap-2">
            {/* Dual Engine Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setEngineMode("tree")}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  engineMode === "tree"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Interactive Mind Map"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-purple-300" />
                <span>Mind Map</span>
              </button>
              <button
                onClick={() => setEngineMode("whiteboard")}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  engineMode === "whiteboard"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Interactive Whiteboard (Fabric.js)"
              >
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Whiteboard</span>
              </button>
            </div>

            {engineMode === "tree" && (
              <>
                <button
                  onClick={() => setShowOutline((prev) => !prev)}
                  className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                    showOutline
                      ? "bg-purple-600/30 border-purple-500/50 text-purple-200"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Toggle Outline Tree (Ctrl+Shift+O)"
                >
                  <FolderTree className="w-4 h-4" />
                  <span className="hidden md:inline">Outline</span>
                </button>

                {/* Layout Mode Selector */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => handleApplyLayoutMode("balanced")}
                    className={`px-2 py-1 rounded-lg transition font-medium ${
                      layoutMode === "balanced" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                    title="Balanced Layout"
                  >
                    Balanced
                  </button>
                  <button
                    onClick={() => handleApplyLayoutMode("right-only")}
                    className={`px-2 py-1 rounded-lg transition font-medium ${
                      layoutMode === "right-only" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                    title="Right-Only Mind Map"
                  >
                    Right
                  </button>
                  <button
                    onClick={() => handleApplyLayoutMode("tree")}
                    className={`px-2 py-1 rounded-lg transition font-medium ${
                      layoutMode === "tree" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                    title="Vertical Tree"
                  >
                    Tree
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Center: Search & Focus */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 md:w-44 pl-8 pr-2 py-1 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:w-52 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
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
              <Eye className="w-4 h-4" />
              <span className="hidden lg:inline">Focus</span>
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
              title="Presentation Mode"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">Present</span>
            </button>
          </div>

          {/* Right: Actions, Import, Export, Shortcuts */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAiModal(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 border border-purple-400/30 transition flex items-center gap-1"
            >
              <Wand2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">AI Generate</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Import Markdown Outline"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={exportMarkdown}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Export Markdown Outline (.md)"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={exportPNG}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Export High-Res PNG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={undo}
              disabled={historyIdx <= 0}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={redo}
              disabled={historyIdx >= history.length - 1}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowShortcutsModal(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition"
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
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                }`}
                title="Toggle Properties & Notes Drawer"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xl:inline">Properties</span>
              </button>
            )}

            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={`p-1.5 rounded-xl border transition ${
                isFullscreen
                  ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white bg-slate-800 border-slate-700"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Full Screen Mode"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </Panel>

      {/* ─── Main Workspace Area ─── */}
      {engineMode === "tree" ? (
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

                const isLeft = node.x < parent.x;
                const startX = isLeft ? parent.x : parent.x + pW;
                const startY = parent.y + pH / 2;
                const endX = isLeft ? node.x + nW : node.x;
                const endY = node.y + nH / 2;

                const deltaX = Math.abs(endX - startX) * 0.55;
                const cp1X = isLeft ? startX - deltaX : startX + deltaX;
                const cp2X = isLeft ? endX + deltaX : endX - deltaX;
                const pathD = `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`;

                return (
                  <path
                    key={`line-${node.id}`}
                    d={pathD}
                    fill="none"
                    stroke={node.color || "#8b5cf6"}
                    strokeWidth={curveWidth}
                    strokeOpacity={branchIds && !branchIds.has(node.id) ? 0.15 : 0.75}
                    strokeLinecap="round"
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
                  className={`absolute pointer-events-auto flex flex-col justify-between p-2 rounded-2xl cursor-pointer border transition-all select-none group ${
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

                  {/* Top Bar: Status + Text + Badges */}
                  <div className="flex items-center justify-between gap-1.5">
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
      ) : (
        <div className="relative flex-1 flex overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <FabricWhiteboard storageKey="flowtrack_fabric_whiteboard_desktop_v1" />
        </div>
      )}

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
    </div>
  );
}
