import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  Download, Plus, Trash2, Edit3, Sparkles, RefreshCw, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Palette, Eye, Move, Check, CornerDownRight, 
  Share2, RotateCcw, LayoutTemplate, Sliders, Search, Wand2, Undo, Redo, 
  CheckCircle2, Circle, Clock, FileText, Upload, ChevronRight, ChevronDown, 
  BookOpen, BrainCircuit, X, Compass, HelpCircle
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { Panel } from "@/components/common/Panel";
import { FabricWhiteboard } from "@/components/common/FabricWhiteboard";
import { saveImageSafely } from "@/utils/dataExport";
import { callUnifiedAI } from "@/utils/aiClient";

// ─── Mind Map Tree Engine Models ──────────────────────────────────────────────
export type NodeStatus = "todo" | "in-progress" | "done";

export interface MindNode {
  id: string;
  parentId: string | null;
  text: string;
  x: number;
  y: number;
  color: string;       // Accent color hex
  side?: "left" | "right";
  collapsed?: boolean;
  status?: NodeStatus; // Study progress badge: todo, in-progress, done
  notes?: string;      // Detailed study notes for this node
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

const STORAGE_KEY = "flowtrack_pro_mindmap_nodes_v2";

const DEFAULT_NODES: MindNode[] = [
  // Center Root
  { id: "root", parentId: null, text: "☕ Java Full Stack & DSA", x: 500, y: 320, color: "#a855f7", status: "in-progress" },

  // Left Side Subtopics
  { id: "l1", parentId: "root", text: "Core OOPs & JVM", x: 220, y: 180, color: "#06b6d4", side: "left", status: "done" },
  { id: "l1-1", parentId: "l1", text: "Inheritance & Polymorphism", x: -40, y: 140, color: "#06b6d4", side: "left", status: "done" },
  { id: "l1-2", parentId: "l1", text: "JVM Garbage Collection", x: -40, y: 220, color: "#06b6d4", side: "left", status: "in-progress" },

  { id: "l2", parentId: "root", text: "Spring Boot 3 REST", x: 220, y: 440, color: "#f97316", side: "left", status: "in-progress" },
  { id: "l2-1", parentId: "l2", text: "Dependency Injection & IoC", x: -40, y: 440, color: "#f97316", side: "left", status: "todo" },

  // Right Side Subtopics
  { id: "r1", parentId: "root", text: "Data Structures & Algos", x: 780, y: 180, color: "#10b981", side: "right", status: "in-progress" },
  { id: "r1-1", parentId: "r1", text: "Trees, Graphs & BFS/DFS", x: 1040, y: 140, color: "#10b981", side: "right", status: "in-progress" },
  { id: "r1-2", parentId: "r1", text: "Dynamic Programming (DP)", x: 1040, y: 220, color: "#10b981", side: "right", status: "todo" },

  { id: "r2", parentId: "root", text: "SQL & Database Schema", x: 780, y: 440, color: "#3b82f6", side: "right", status: "done" },
  { id: "r2-1", parentId: "r2", text: "Indexing & Query Tuning", x: 1040, y: 440, color: "#3b82f6", side: "right", status: "done" }
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
  const [nodes, setNodes] = useState<MindNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_NODES;
  });

  const [history, setHistory] = useState<MindNode[][]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("root");
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
  
  // Canvas View transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Save Nodes & Sync History
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    } catch { /* ignore */ }
  }, [nodes]);

  const pushState = useCallback((newNodes: MindNode[]) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIdx + 1);
      return [...sliced, newNodes];
    });
    setHistoryIdx(prev => prev + 1);
    setNodes(newNodes);
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      const prevNodes = history[historyIdx - 1];
      setHistoryIdx(prev => prev - 1);
      setNodes(prevNodes);
      showToast("Undo performed", "info");
    }
  }, [history, historyIdx, showToast]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextNodes = history[historyIdx + 1];
      setHistoryIdx(prev => prev + 1);
      setNodes(nextNodes);
      showToast("Redo performed", "info");
    }
  }, [history, historyIdx, showToast]);

  // ── Node Helper Functions ──────────────────────────────────────────────────
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  // Smart Auto-Align Algorithm: Computes beautiful balanced Left/Right Tree Hierarchy
  const autoAlignTree = useCallback(() => {
    if (nodes.length === 0) return;
    const root = nodes.find(n => n.parentId === null) || nodes[0];
    const rootX = 500;
    const rootY = 320;

    // Children of root
    const rootChildren = nodes.filter(n => n.parentId === root.id);
    const leftChildren: MindNode[] = [];
    const rightChildren: MindNode[] = [];

    rootChildren.forEach((child, idx) => {
      if (child.side === "left" || (child.side === undefined && idx % 2 === 0)) {
        leftChildren.push(child);
      } else {
        rightChildren.push(child);
      }
    });

    const updatedMap = new Map<string, MindNode>();
    updatedMap.set(root.id, { ...root, x: rootX, y: rootY });

    // Position Left Branch
    const leftHeight = Math.max(leftChildren.length * 120, 200);
    let leftStartY = rootY - leftHeight / 2 + 60;
    leftChildren.forEach(child => {
      const childX = rootX - 280;
      const childY = leftStartY;
      leftStartY += 120;
      updatedMap.set(child.id, { ...child, x: childX, y: childY, side: "left" });

      // Grandchildren
      const grandchildren = nodes.filter(n => n.parentId === child.id);
      let gStartY = childY - ((grandchildren.length - 1) * 70) / 2;
      grandchildren.forEach(gc => {
        updatedMap.set(gc.id, { ...gc, x: childX - 260, y: gStartY, side: "left" });
        gStartY += 75;
      });
    });

    // Position Right Branch
    const rightHeight = Math.max(rightChildren.length * 120, 200);
    let rightStartY = rootY - rightHeight / 2 + 60;
    rightChildren.forEach(child => {
      const childX = rootX + 280;
      const childY = rightStartY;
      rightStartY += 120;
      updatedMap.set(child.id, { ...child, x: childX, y: childY, side: "right" });

      // Grandchildren
      const grandchildren = nodes.filter(n => n.parentId === child.id);
      let gStartY = childY - ((grandchildren.length - 1) * 70) / 2;
      grandchildren.forEach(gc => {
        updatedMap.set(gc.id, { ...gc, x: childX + 260, y: gStartY, side: "right" });
        gStartY += 75;
      });
    });

    // Preserve any unconnected independent boxes
    nodes.forEach(n => {
      if (!updatedMap.has(n.id)) {
        updatedMap.set(n.id, n);
      }
    });

    const newNodes = Array.from(updatedMap.values());
    pushState(newNodes);
    showToast("⚡ Tree Auto-Aligned with Clean Hierarchy!", "success");
  }, [nodes, pushState, showToast]);

  // Add Independent Main Topic
  const addIndependentTopic = (xPos?: number, yPos?: number) => {
    const newNode: MindNode = {
      id: crypto.randomUUID(),
      parentId: null,
      text: "New Topic Concept",
      x: xPos !== undefined ? xPos : (350 + Math.random() * 150),
      y: yPos !== undefined ? yPos : (250 + Math.random() * 150),
      color: activeColor,
      status: "todo"
    };
    const next = [...nodes, newNode];
    pushState(next);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditText("New Topic Concept");
    showToast("New Main Topic Created! Press Enter to save", "info");
  };

  // Add Subtopic to Selected Node
  const addSubtopic = (parentId?: string) => {
    const targetParentId = parentId || selectedNodeId || (nodes[0] ? nodes[0].id : null);
    if (!targetParentId) {
      addIndependentTopic();
      return;
    }

    const parent = nodes.find(n => n.id === targetParentId);
    if (!parent) return;

    // Determine direction
    const isRoot = parent.parentId === null;
    let side = parent.side;
    if (isRoot) {
      const leftCount = nodes.filter(n => n.parentId === parent.id && n.side === "left").length;
      const rightCount = nodes.filter(n => n.parentId === parent.id && n.side === "right").length;
      side = leftCount <= rightCount ? "left" : "right";
    }

    const siblings = nodes.filter(n => n.parentId === targetParentId);
    const offsetX = side === "left" ? -260 : 260;
    const offsetY = (siblings.length - 1) * 75 + (Math.random() * 20 - 10);

    const newNode: MindNode = {
      id: crypto.randomUUID(),
      parentId: targetParentId,
      text: "New Subtopic",
      x: parent.x + offsetX,
      y: parent.y + offsetY,
      color: parent.color || activeColor,
      side,
      status: "todo"
    };

    // Auto expand parent if it was collapsed
    const next = nodes.map(n => n.id === parent.id ? { ...n, collapsed: false } : n).concat(newNode);
    pushState(next);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditText("New Subtopic");
    showToast("Subtopic Added! (Press Tab to add more)", "success");
  };

  // Add Sibling Topic (same level)
  const addSiblingTopic = () => {
    if (!selectedNode || !selectedNode.parentId) {
      addIndependentTopic();
      return;
    }
    addSubtopic(selectedNode.parentId);
  };

  // Delete Selected Node (with cascading delete of children)
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    if (nodes.length <= 1) {
      showToast("Cannot delete the only remaining node", "warning");
      return;
    }

    // Collect all descendant ids
    const toDelete = new Set<string>([selectedNodeId]);
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      nodes.forEach(n => {
        if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
          toDelete.add(n.id);
          foundNew = true;
        }
      });
    }

    const next = nodes.filter(n => !toDelete.has(n.id));
    pushState(next);
    setSelectedNodeId(next[0]?.id || null);
    showToast(`Deleted ${toDelete.size} topic(s)`, "info");
  };

  // Toggle Collapse on a Node
  const toggleCollapse = (nodeId: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n));
  };

  // Cycle Node Status: todo -> in-progress -> done
  const cycleNodeStatus = (nodeId: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const current = n.status || "todo";
      const next: NodeStatus = current === "todo" ? "in-progress" : current === "in-progress" ? "done" : "todo";
      return { ...n, status: next };
    }));
  };

  // Inline Editing
  const startInlineEdit = (node: MindNode) => {
    setEditingNodeId(node.id);
    setEditText(node.text);
  };

  const saveInlineEdit = () => {
    if (!editingNodeId) return;
    const trimmed = editText.trim();
    if (trimmed) {
      const next = nodes.map(n => (n.id === editingNodeId ? { ...n, text: trimmed } : n));
      pushState(next);
    }
    setEditingNodeId(null);
  };

  // Change Color of Selected Node & Descendants
  const setNodeColor = (colorHex: string) => {
    setActiveColor(colorHex);
    if (!selectedNodeId) return;
    const next = nodes.map(n => (n.id === selectedNodeId ? { ...n, color: colorHex } : n));
    pushState(next);
  };

  // Load Template
  const loadTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    pushState(tpl.nodes);
    setSelectedNodeId("root");
    showToast(`Loaded Template: ${tpl.name}`, "success");
    setShowAiModal(false);
  };

  // Generate Custom AI Topic Mind Map
  const generateCustomAiMap = async () => {
    const topic = customAiTopic.trim();
    if (!topic) {
      showToast("Please enter a topic name", "warning");
      return;
    }

    setIsAiGenerating(true);
    const rootId = "root";
    let generated: MindNode[] | null = null;

    try {
      const userPrompt = `Generate a structured mind map tree for the study topic: "${topic}".
Output ONLY valid JSON with this exact schema:
{
  "leftBranches": [
    { "title": "Subtopic Title", "children": ["Concept 1", "Concept 2"] }
  ],
  "rightBranches": [
    { "title": "Subtopic Title", "children": ["Concept 3", "Concept 4"] }
  ]
}`;
      const sysPrompt = "You are FlowTrack Pro's academic mind map architect. Generate high-yield study subtopics formatted strictly as JSON without extra prose.";

      const aiRes = await callUnifiedAI(userPrompt, sysPrompt);
      if (aiRes.success && aiRes.text) {
        const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const leftBranches = Array.isArray(parsed.leftBranches) ? parsed.leftBranches : [];
          const rightBranches = Array.isArray(parsed.rightBranches) ? parsed.rightBranches : [];

          if (leftBranches.length > 0 || rightBranches.length > 0) {
            const nodesArr: MindNode[] = [
              { id: rootId, parentId: null, text: `📖 ${topic}`, x: 500, y: 320, color: "#a855f7", status: "in-progress" }
            ];

            const leftColors = ["#06b6d4", "#10b981", "#3b82f6", "#0ea5e9"];
            leftBranches.forEach((b: any, bIdx: number) => {
              const bId = `left-${bIdx}`;
              const yPos = 180 + bIdx * 200;
              const color = leftColors[bIdx % leftColors.length];
              nodesArr.push({
                id: bId,
                parentId: rootId,
                text: b.title || `Concept ${bIdx + 1}`,
                x: 220,
                y: yPos,
                color,
                side: "left",
                status: "done"
              });

              if (Array.isArray(b.children)) {
                b.children.slice(0, 3).forEach((child: string, cIdx: number) => {
                  nodesArr.push({
                    id: `${bId}-${cIdx}`,
                    parentId: bId,
                    text: typeof child === "string" ? child : String(child),
                    x: -40,
                    y: yPos + (cIdx === 0 ? -30 : cIdx === 1 ? 30 : 0),
                    color,
                    side: "left",
                    status: cIdx === 0 ? "done" : "in-progress"
                  });
                });
              }
            });

            const rightColors = ["#f97316", "#eab308", "#ec4899", "#f43f5e"];
            rightBranches.forEach((b: any, bIdx: number) => {
              const bId = `right-${bIdx}`;
              const yPos = 180 + bIdx * 200;
              const color = rightColors[bIdx % rightColors.length];
              nodesArr.push({
                id: bId,
                parentId: rootId,
                text: b.title || `Advanced ${bIdx + 1}`,
                x: 780,
                y: yPos,
                color,
                side: "right",
                status: "in-progress"
              });

              if (Array.isArray(b.children)) {
                b.children.slice(0, 3).forEach((child: string, cIdx: number) => {
                  nodesArr.push({
                    id: `${bId}-${cIdx}`,
                    parentId: bId,
                    text: typeof child === "string" ? child : String(child),
                    x: 1040,
                    y: yPos + (cIdx === 0 ? -30 : cIdx === 1 ? 30 : 0),
                    color,
                    side: "right",
                    status: "todo"
                  });
                });
              }
            });

            generated = nodesArr;
          }
        }
      }
    } catch (err) {
      console.warn("Unified AI mind map generator failed, falling back to local template", err);
    }

    if (!generated) {
      generated = [
        { id: rootId, parentId: null, text: `📖 ${topic}`, x: 500, y: 320, color: "#a855f7", status: "in-progress" },
        { id: "sub-1", parentId: rootId, text: `${topic}: Core Fundamentals`, x: 220, y: 180, color: "#06b6d4", side: "left", status: "done" },
        { id: "sub-1-1", parentId: "sub-1", text: "Key Terminology & Syntax", x: -40, y: 180, color: "#06b6d4", side: "left", status: "done" },
        { id: "sub-2", parentId: rootId, text: `${topic}: Practical Implementation`, x: 220, y: 440, color: "#10b981", side: "left", status: "in-progress" },
        { id: "sub-2-1", parentId: "sub-2", text: "Real-world Applications & APIs", x: -40, y: 440, color: "#10b981", side: "left", status: "todo" },
        { id: "sub-3", parentId: rootId, text: `${topic}: Architecture & Optimization`, x: 780, y: 180, color: "#f97316", side: "right", status: "todo" },
        { id: "sub-3-1", parentId: "sub-3", text: "Edge Cases & Performance Tuning", x: 1040, y: 180, color: "#f97316", side: "right", status: "todo" },
        { id: "sub-4", parentId: rootId, text: `${topic}: Exam & Interview Doubts`, x: 780, y: 440, color: "#eab308", side: "right", status: "done" },
        { id: "sub-4-1", parentId: "sub-4", text: "Revision Checklist & Quick Test", x: 1040, y: 440, color: "#eab308", side: "right", status: "todo" }
      ];
    }

    setIsAiGenerating(false);
    pushState(generated);
    setSelectedNodeId(rootId);
    setCustomAiTopic("");
    setShowAiModal(false);
    showToast(`✨ Generated AI Mind Map for "${topic}"!`, "success");
  };

  // Center Root in View
  const centerView = () => {
    const root = nodes.find(n => n.parentId === null) || nodes[0];
    if (containerRef.current && root) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - root.x * zoom - 90 * zoom,
        y: rect.height / 2 - root.y * zoom - 24 * zoom
      });
      setZoom(1);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
      } else if (e.key === "F2" || (e.code === "Space" && selectedNode)) {
        e.preventDefault();
        if (selectedNode) startInlineEdit(selectedNode);
      } else if (e.key === "Escape") {
        setEditingNodeId(null);
        setSelectedNodeId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, addSubtopic, addSiblingTopic, deleteSelectedNode, undo, redo]);

  // Double Click Canvas to Add Topic Box
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;
    addIndependentTopic(clickX - 90, clickY - 24);
  };

  // Zoom to Mouse Pointer
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 3);
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * (newZoom / zoom),
        y: mouseY - (mouseY - prev.y) * (newZoom / zoom)
      }));
      setZoom(newZoom);
    } else {
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  // Node Dragging Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: MindNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y
    });
  };

  // Canvas Pan Handlers
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
      setNodes(prev => prev.map(n => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n)));
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
    setIsPanning(false);
  };

  // Export Mind Map Canvas to Content-Aware Crisp PNG (No Giant Void!)
  const exportPNG = async () => {
    if (nodes.length === 0) {
      showToast("Mind Map is empty", "warning");
      return;
    }

    // 1. Calculate Content Bounding Box of all active nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const isRoot = n.parentId === null;
      const w = isRoot ? 220 : 180;
      const h = 48;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    });

    if (!isFinite(minX) || !isFinite(minY)) return;

    // Generous, proportional margins & title header space
    const paddingX = 80;
    const paddingY = 90;
    const headerHeight = 120;

    const rawWidth = (maxX - minX) + paddingX * 2;
    const rawHeight = (maxY - minY) + paddingY * 2 + headerHeight;

    // High-Definition Crisp Resolution (2.5x Retina Scale)
    const dpr = 2.5;
    const canvasWidth = Math.max(Math.round(rawWidth * dpr), 1400);
    const canvasHeight = Math.max(Math.round(rawHeight * dpr), 900);

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale context for ultra-crisp Retina text and curves
    ctx.scale(dpr, dpr);

    const virtualW = canvasWidth / dpr;
    const virtualH = canvasHeight / dpr;

    // Center the content in the virtual canvas
    const offsetX = (virtualW - rawWidth) / 2 + paddingX - minX;
    const offsetY = (virtualH - rawHeight) / 2 + paddingY + headerHeight - minY;

    // 2. Dark Studio Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, virtualW, virtualH);
    bgGrad.addColorStop(0, "#070B14");
    bgGrad.addColorStop(0.5, "#0D1527");
    bgGrad.addColorStop(1, "#070B14");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, virtualW, virtualH);

    // Subtle decorative grid dots
    ctx.fillStyle = "rgba(139, 92, 246, 0.08)";
    for (let x = 0; x < virtualW; x += 32) {
      for (let y = 0; y < virtualH; y += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer subtle border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, virtualW - 40, virtualH - 40);

    // 3. Centered Elegant Header Banner
    const rootNode = nodes.find(n => n.parentId === null) || nodes[0];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Top Brand Tag
    ctx.fillStyle = "#A855F7";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillText("FLOWTRACK PRO • VISUAL STUDY ARCHITECTURE", virtualW / 2, 45);

    // Root Title Banner
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 26px Inter, sans-serif";
    ctx.fillText(rootNode ? rootNode.text : "Mind Map", virtualW / 2, 75);

    // Metadata Subtitle
    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px Inter, sans-serif";
    const masteredCount = nodes.filter(n => n.status === "done").length;
    ctx.fillText(
      `${nodes.length} Concepts • ${masteredCount} Mastered • Exported ${new Date().toLocaleDateString()}`,
      virtualW / 2,
      102
    );

    // 4. Draw Connecting Bezier Curves
    nodes.forEach(node => {
      if (!node.parentId) return;
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent || parent.collapsed) return;

      const pW = parent.parentId === null ? 220 : 180;
      const pH = 48;
      const nW = 180;
      const nH = 48;

      const isLeft = node.x < parent.x;
      const startX = (isLeft ? parent.x : parent.x + pW) + offsetX;
      const startY = parent.y + pH / 2 + offsetY;
      const endX = (isLeft ? node.x + nW : node.x) + offsetX;
      const endY = node.y + nH / 2 + offsetY;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const cpX = (startX + endX) / 2;
      ctx.bezierCurveTo(cpX, startY, cpX, endY, endX, endY);

      // Gradient Stroke for Curve
      const lineGrad = ctx.createLinearGradient(startX, startY, endX, endY);
      lineGrad.addColorStop(0, parent.color || "#8B5CF6");
      lineGrad.addColorStop(1, node.color || "#06B6D4");

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.stroke();
    });

    // 5. Draw Node Cards
    nodes.forEach(node => {
      let current = node;
      let isHidden = false;
      while (current.parentId) {
        const p = nodes.find(n => n.id === current.parentId);
        if (p?.collapsed) { isHidden = true; break; }
        if (!p) break;
        current = p;
      }
      if (isHidden) return;

      const isRoot = node.parentId === null;
      const w = isRoot ? 220 : 180;
      const h = 48;
      const x = node.x + offsetX;
      const y = node.y + offsetY;
      const colorObj = COLOR_PRESETS.find(c => c.hex === node.color) || COLOR_PRESETS[0];

      // Card Background Gradient
      const cardGrad = ctx.createLinearGradient(x, y, x, y + h);
      if (isRoot) {
        cardGrad.addColorStop(0, "rgba(88, 28, 135, 0.95)");
        cardGrad.addColorStop(1, "rgba(15, 23, 42, 0.98)");
      } else {
        cardGrad.addColorStop(0, "rgba(30, 41, 59, 0.95)");
        cardGrad.addColorStop(1, "rgba(15, 23, 42, 0.98)");
      }

      ctx.fillStyle = cardGrad;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, 14);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();

      // Card Glowing Border
      ctx.strokeStyle = node.color || colorObj.border;
      ctx.lineWidth = isRoot ? 2.8 : 2;
      ctx.stroke();

      // Status indicator circle
      const dotX = x + 16;
      const dotY = y + h / 2;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = node.status === "done" ? "#10B981" : node.status === "in-progress" ? "#F59E0B" : "#64748B";
      ctx.fill();

      // Node Text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${isRoot ? 14 : 12.5}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxTextWidth = w - 40;
      let displayText = node.text;
      if (ctx.measureText(displayText).width > maxTextWidth) {
        while (displayText.length > 3 && ctx.measureText(displayText + "...").width > maxTextWidth) {
          displayText = displayText.slice(0, -1);
        }
        displayText += "...";
      }
      ctx.fillText(displayText, x + w / 2 + 6, y + h / 2);
    });

    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const cleanTopic = (rootNode?.text || "StudyMap").replace(/[^\w\s-]/g, "").trim().slice(0, 30).replace(/\s+/g, "_") || "StudyMap";
    const dateStr = new Date().toISOString().slice(0, 10);
    const defaultFilename = `FlowTrack_MindMap_${cleanTopic}_${dateStr}.png`;
    const res = await saveImageSafely(dataUrl, defaultFilename);
    if (res.success) {
      showToast(`💾 Saved: ${res.filename || defaultFilename}`, "success");
    }
  };

  // Export Mind Map as Markdown Outline
  const exportMarkdown = () => {
    const root = nodes.find(n => n.parentId === null) || nodes[0];
    let md = `# ${root.text}\n\n`;

    const buildSubtree = (parentId: string, level: number) => {
      const children = nodes.filter(n => n.parentId === parentId);
      children.forEach(child => {
        const indent = "  ".repeat(level);
        const statusEmoji = child.status === "done" ? " [x]" : " [ ]";
        md += `${indent}-${statusEmoji} **${child.text}**\n`;
        buildSubtree(child.id, level + 1);
      });
    };

    buildSubtree(root.id, 0);

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const cleanTopic = (root?.text || "StudyNotes").replace(/[^\w\s-]/g, "").trim().slice(0, 30).replace(/\s+/g, "_") || "StudyNotes";
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `FlowTrack_MindMap_Notes_${cleanTopic}_${dateStr}.md`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`💾 Exported: ${filename}`, "success");
  };

  // Filtered nodes by search query
  const matchingNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(nodes.filter(n => n.text.toLowerCase().includes(q)).map(n => n.id));
  }, [nodes, searchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 space-y-3 bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* ─── Header Toolbar ─────────────────────────────────────────────────── */}
      <Panel className="p-3 bg-slate-900/90 backdrop-blur border-slate-800 shadow-xl rounded-2xl shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Mode Tabs & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <BrainCircuit className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="font-extrabold text-sm tracking-wide text-white">Visual Studio</span>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setEngineMode("tree")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  engineMode === "tree"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🧠 Smart Mind Map
              </button>
              <button
                onClick={() => setEngineMode("whiteboard")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  engineMode === "whiteboard"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🎨 Studio Whiteboard
              </button>
            </div>

            {/* Quick Templates Dropdown */}
            {engineMode === "tree" && (
              <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <LayoutTemplate className="w-3.5 h-3.5 text-purple-400" /> Templates:
                </span>
                {Object.entries(TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => loadTemplate(key)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-800/80 hover:bg-purple-600/30 hover:text-purple-200 rounded-lg text-slate-300 border border-slate-700/60 transition"
                  >
                    {t.name.split(" ")[0]} {t.name.split(" ")[1]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {engineMode === "tree" && (
              <>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Find concept..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-36 md:w-44 pl-8 pr-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700/70 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:w-52 transition-all"
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

                {/* AI Mind Map Generator Button */}
                <button
                  onClick={() => setShowAiModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 border border-purple-400/30 transition flex items-center gap-1.5 animate-pulse"
                >
                  <Wand2 className="w-3.5 h-3.5" /> <span>AI Generator</span>
                </button>

                {/* Auto-Align Tree */}
                <button
                  onClick={autoAlignTree}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5"
                  title="Auto-organize nodes into clean hierarchical layout"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" /> <span>Auto-Align</span>
                </button>

                {/* Add Topic Box */}
                <button
                  onClick={() => addIndependentTopic()}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-1"
                  title="Add independent topic box"
                >
                  <Plus className="w-3.5 h-3.5" /> <span>+ Topic</span>
                </button>

                {/* Add Subtopic */}
                <button
                  onClick={() => addSubtopic()}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1"
                  title="Add child subtopic to selected node (Shortcut: Tab)"
                >
                  <CornerDownRight className="w-3.5 h-3.5" /> <span>+ Subtopic</span>
                </button>

                {/* Color Palette Picker */}
                <div className="hidden xl:flex items-center gap-1 px-2 py-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c.hex}
                      onClick={() => setNodeColor(c.hex)}
                      className={`w-4 h-4 rounded-full transition transform hover:scale-125 ${
                        activeColor === c.hex ? "ring-2 ring-white scale-110" : ""
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={`Accent: ${c.name}`}
                    />
                  ))}
                </div>

                {/* Undo / Redo */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                  <button
                    onClick={undo}
                    disabled={historyIdx <= 0}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIdx >= history.length - 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Export Dropdown / Buttons */}
                <button
                  onClick={exportPNG}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 transition flex items-center gap-1 shadow-md shadow-purple-500/20"
                  title="Export High-Resolution 4K PNG"
                >
                  <Download className="w-3.5 h-3.5" /> <span>4K PNG</span>
                </button>

                <button
                  onClick={exportMarkdown}
                  className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                  title="Export Markdown Outline (.md)"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>

                {/* Shortcuts Guide */}
                <button
                  onClick={() => setShowShortcutsModal(true)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                  title="Keyboard Shortcuts"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-purple-400" />}
            </button>
          </div>
        </div>
      </Panel>

      {/* ─── Main Mind Map Canvas / Whiteboard ───────────────────────────────── */}
      {engineMode === "tree" ? (
        <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-800/80 bg-[#070B14] shadow-2xl">
          <div
            ref={containerRef}
            className={`w-full h-full relative overflow-hidden select-none ${
              isPanning ? "cursor-grabbing" : "cursor-grab"
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onDoubleClick={handleCanvasDoubleClick}
          >
            {/* Ambient Background Grid Pattern */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 1.5px 1.5px, #8b5cf6 1.2px, transparent 0)`,
                backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`
              }}
            />

            {/* Transform Container for SVG & Floating Nodes */}
            <div
              className="absolute inset-0 origin-top-left"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: isPanning || draggingNodeId ? "none" : "transform 0.08s ease-out"
              }}
            >
              {/* Dynamic Connecting Curved Lines */}
              <svg className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-none overflow-visible">
                <defs>
                  <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {nodes.map(node => {
                  if (!node.parentId) return null;
                  const parent = nodes.find(n => n.id === node.parentId);
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

                  let pathD = "";
                  if (curveStyle === "bezier") {
                    const cpX = (startX + endX) / 2;
                    pathD = `M ${startX} ${startY} C ${cpX} ${startY}, ${cpX} ${endY}, ${endX} ${endY}`;
                  } else if (curveStyle === "straight") {
                    pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
                  } else {
                    const midX = (startX + endX) / 2;
                    pathD = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
                  }

                  const isParentSelected = selectedNodeId === parent.id || selectedNodeId === node.id;

                  return (
                    <path
                      key={`line-${node.id}`}
                      d={pathD}
                      fill="none"
                      stroke={node.color || "#8b5cf6"}
                      strokeWidth={isParentSelected ? curveWidth + 1.5 : curveWidth}
                      strokeOpacity={isParentSelected ? 0.95 : 0.65}
                      strokeLinecap="round"
                      className="transition-all duration-200"
                    />
                  );
                })}
              </svg>

              {/* Node Cards */}
              {nodes.map(node => {
                // If parent is collapsed, hide this node
                let current = node;
                let isHidden = false;
                while (current.parentId) {
                  const p = nodes.find(n => n.id === current.parentId);
                  if (p?.collapsed) {
                    isHidden = true;
                    break;
                  }
                  if (!p) break;
                  current = p;
                }
                if (isHidden) return null;

                const isSelected = selectedNodeId === node.id;
                const isEditing = editingNodeId === node.id;
                const isRoot = node.parentId === null;
                const colorObj = COLOR_PRESETS.find(c => c.hex === node.color) || COLOR_PRESETS[0];
                const hasChildren = nodes.some(n => n.parentId === node.id);
                const isSearchMatch = matchingNodeIds.has(node.id);

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    onDoubleClick={(e) => { e.stopPropagation(); startInlineEdit(node); }}
                    className={`absolute flex items-center justify-between px-3 py-2 rounded-2xl cursor-pointer border transition-shadow select-none group ${
                      isSelected
                        ? "ring-4 ring-cyan-400/60 shadow-cyan-400/30 scale-[1.03] z-30"
                        : "hover:scale-[1.02] hover:border-white/50 z-10"
                    } ${isSearchMatch ? "ring-4 ring-amber-400 shadow-amber-400/40 animate-bounce" : ""}`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: isRoot ? "220px" : "180px",
                      height: "48px",
                      background: isRoot
                        ? "linear-gradient(135deg, rgba(168,85,247,0.4) 0%, rgba(30,41,59,0.95) 100%)"
                        : `linear-gradient(135deg, ${colorObj.bg} 0%, rgba(15,23,42,0.95) 100%)`,
                      borderColor: isSearchMatch ? "#fbbf24" : colorObj.border,
                      boxShadow: isSelected 
                        ? `0 0 25px ${colorObj.border}88, 0 8px 25px -4px ${colorObj.border}55` 
                        : `0 8px 20px -4px ${node.color}33`
                    }}
                  >
                    {/* Status Pill Toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleNodeStatus(node.id); }}
                      className="shrink-0 mr-2 p-0.5 rounded-full hover:bg-white/20 transition"
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

                    {/* Text Field or Editable Input */}
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

                    {/* Collapse / Expand Toggle Button for Parents */}
                    {hasChildren && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                        className="shrink-0 ml-1.5 p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                        title={node.collapsed ? "Expand subtopics" : "Collapse subtopics"}
                      >
                        {node.collapsed ? <ChevronRight className="w-3 h-3 text-cyan-300" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}

                    {/* Add Subtopic Quick (+) Action on Hover or Select */}
                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); addSubtopic(node.id); }}
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
          </div>

          {/* Floating Canvas Quick Navigation Pill */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-2xl px-3 py-2 shadow-2xl z-30">
            <button
              onClick={() => setZoom(prev => Math.min(prev * 1.2, 3))}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition"
              title="Zoom In (Ctrl + Wheel)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.25))}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition"
              title="Zoom Out (Ctrl + Wheel)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              onClick={centerView}
              className="px-2.5 py-1 text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-xl border border-purple-500/30 transition flex items-center gap-1"
              title="Center View on Root Node"
            >
              <Compass className="w-3.5 h-3.5" /> <span>Center</span>
            </button>
          </div>

          {/* Floating Instructions Banner */}
          <div className="hidden md:flex absolute bottom-4 right-4 items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl px-3.5 py-2 text-[11px] text-slate-400 z-20">
            <span>✨ Double-click canvas to create Topic</span>
            <span>•</span>
            <span>Tab: Add Subtopic</span>
            <span>•</span>
            <span>Enter: Add Sibling</span>
            <span>•</span>
            <span>Del: Delete</span>
          </div>
        </div>
      ) : (
        /* ─── Studio Whiteboard Engine Mode ──────────────────────────────────── */
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl relative">
          <FabricWhiteboard storageKey="flowtrack_fabric_whiteboard_web_v1" />
        </div>
      )}

      {/* ─── AI Mind Map Generator Modal ────────────────────────────────────── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Wand2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-base text-white">AI Mind Map Generator</h3>
              </div>
              <button 
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Prompt Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Enter any Subject, Chapter, or Concept:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Operating Systems, Thermodynamics, SQL Queries..."
                  value={customAiTopic}
                  onChange={(e) => setCustomAiTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") generateCustomAiMap(); }}
                  className="flex-1 px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                <button
                  onClick={generateCustomAiMap}
                  disabled={isAiGenerating}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isAiGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAiGenerating ? "Generating..." : "Generate"}</span>
                </button>
              </div>
            </div>

            {/* Pre-built Academic Master Templates */}
            <div className="space-y-2.5 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Instant Academic Blueprints:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => loadTemplate(key)}
                    className="p-3 text-left rounded-2xl bg-slate-950/70 hover:bg-purple-900/30 border border-slate-800 hover:border-purple-500/50 transition group"
                  >
                    <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                      {t.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {t.nodes.length} Structured Concepts • Balanced Tree
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Keyboard Shortcuts Modal ────────────────────────────────────────── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-base text-white">Keyboard Shortcuts</h3>
              </div>
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Add Child Subtopic</span>
                <kbd className="px-2 py-0.5 bg-slate-800 rounded font-mono font-bold text-purple-300">Tab</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Add Sibling Topic</span>
                <kbd className="px-2 py-0.5 bg-slate-800 rounded font-mono font-bold text-purple-300">Enter</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Edit Selected Node</span>
                <kbd className="px-2 py-0.5 bg-slate-800 rounded font-mono font-bold text-purple-300">F2 / Space</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Delete Node & Branches</span>
                <kbd className="px-2 py-0.5 bg-slate-800 rounded font-mono font-bold text-purple-300">Del / Backspace</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Undo / Redo</span>
                <kbd className="px-2 py-0.5 bg-slate-800 rounded font-mono font-bold text-purple-300">Ctrl+Z / Ctrl+Y</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Zoom Canvas</span>
                <kbd className="px-2 py-0.5 bg-slate-800 rounded font-mono font-bold text-purple-300">Ctrl + Mouse Wheel</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Create Node at Cursor</span>
                <kbd className="px-2 py-0.5 bg-slate-800 rounded font-mono font-bold text-purple-300">Double Click</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
