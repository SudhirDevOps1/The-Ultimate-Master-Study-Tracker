import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  Plus, Trash2, Edit3, Sparkles, Palette, Eye, Copy, FileDown, 
  Search, Pin, FileText, Check, Folder, FilePlus, Clock, RotateCcw, 
  ZoomIn, ZoomOut, Grid, Lock, Unlock, Layers, Link2, 
  LayoutTemplate, Download, X, Compass, ChevronRight,
  Move, CheckSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import { useToast } from "@/components/common/Toast";
import { Panel } from "@/components/common/Panel";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import type { StickyNote, BoardFrame, BoardConnector, NotepadDoc } from "@/types/notes";
import {
  NOTE_BACKGROUNDS,
  NOTE_TEXT_COLORS,
  NOTE_FONTS,
} from "@/types/notes";
import {
  snapToGrid,
  isInsideMarquee,
  moveFrameAndChildren,
  cleanupBoardConnectors,
  getNotesInReadingOrder,
  generateBoardTemplate,
} from "@/utils/boardMath";
import {
  initStorageMigration,
  loadStickyBoard,
  saveStickyBoard,
} from "@/utils/storageMigration";

const DEFAULT_NOTEPAD_DOCS: NotepadDoc[] = [
  {
    id: "default-doc-1",
    title: "Java & DSA Master Notes",
    content: `# Java Full Stack & DSA Cheatsheet\n\n## 1. JVM Memory Model\n- **Heap Memory:** Shared across all threads; stores all class instances and arrays.\n- **Stack Memory:** Thread-private; stores primitive types and local object references.\n- **Metaspace:** Replaced PermGen in Java 8; stores class metadata in native memory.\n\n## 2. Dynamic Programming Formulations\n$$\nDP[i] = \\max(DP[i-1], DP[i-2] + val[i])\n$$\n\n- [x] Review 0/1 Knapsack\n- [ ] Practice Graph BFS/DFS traversal\n- [ ] Master Floyd-Warshall shortest path`,
    category: "Computer Science",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    pinned: true,
  },
  {
    id: "default-doc-2",
    title: "Operating Systems Quick Summary",
    content: `# OS Core Fundamentals\n\n### Process Synchronization\n1. Mutual Exclusion\n2. Progress\n3. Bounded Waiting\n\n> "Deadlock cannot occur if any one of the four Coffman conditions is prevented."`,
    category: "Systems",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export function StudyNotesBoardPage() {
  const [activeTab, setActiveTab] = useState<"board" | "notepad">("board");

  // ─── Free Canvas & Sticky Board State ─────────────────────────────────────
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [frames, setFrames] = useState<BoardFrame[]>([]);
  const [connectors, setConnectors] = useState<BoardConnector[]>([]);
  const [isBoardLoaded, setIsBoardLoaded] = useState(false);

  // Canvas Mode: "canvas" (infinite freeform) or "grid" (classic keep)
  const [boardViewMode, setBoardViewMode] = useState<"canvas" | "grid">("canvas");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapStep, setSnapStep] = useState<8 | 16>(16);

  // Multi-Selection State
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging Notes or Frames
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [frameDragOffset, setFrameDragOffset] = useState({ x: 0, y: 0 });

  // Connector Creation Mode
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // New Note Creation Inputs
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [noteImage, setNoteImage] = useState<string | null>(null);
  const [newNoteBg, setNewNoteBg] = useState(NOTE_BACKGROUNDS[0].class);
  const [newNoteTextColor, setNewNoteTextColor] = useState(NOTE_TEXT_COLORS[5].class);
  const [newNoteFont, setNewNoteFont] = useState(NOTE_FONTS[0].class);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Panels
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // ─── Real Notepad Multiple Docs State ─────────────────────────────────────
  const [notepadDocs, setNotepadDocs] = useState<NotepadDoc[]>(() => {
    try {
      const saved = localStorage.getItem("flowtrack_notepad_docs_v2");
      if (saved) return JSON.parse(saved);
    } catch { /* fallback */ }
    return DEFAULT_NOTEPAD_DOCS;
  });

  const [activeDocId, setActiveDocId] = useState<string>(() => {
    return notepadDocs[0]?.id || "default-doc-1";
  });

  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");
  const [docSearch, setDocSearch] = useState("");
  const [copiedNotepad, setCopiedNotepad] = useState(false);
  const { showToast } = useToast();

  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const notesContainerRef = useRef<HTMLDivElement | null>(null);
  const docPreviewContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Sticky Board from Dexie on Mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      await initStorageMigration();
      const loaded = await loadStickyBoard();
      if (isMounted) {
        const initializedNotes = loaded.notes.map((note, idx) => {
          if (note.x === undefined || note.y === undefined) {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            return {
              ...note,
              x: 100 + col * 280,
              y: 100 + row * 240,
              w: 260,
              h: 200,
            };
          }
          return note;
        });

        setStickyNotes(initializedNotes);
        setFrames(loaded.frames || []);
        setConnectors(loaded.connectors || []);
        setIsBoardLoaded(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save Sticky Board to Dexie on Change
  useEffect(() => {
    if (!isBoardLoaded) return;
    saveStickyBoard(stickyNotes, frames, connectors);
  }, [stickyNotes, frames, connectors, isBoardLoaded]);

  // Sync Notepad Documents
  useEffect(() => {
    try {
      localStorage.setItem("flowtrack_notepad_docs_v2", JSON.stringify(notepadDocs));
    } catch { /* quota safe */ }
  }, [notepadDocs]);

  // Active Notepad Document
  const activeDoc = useMemo(() => {
    return notepadDocs.find((d) => d.id === activeDocId) || notepadDocs[0] || null;
  }, [notepadDocs, activeDocId]);

  // ─── Free Canvas & Sticky Note Actions ────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image too large. Max 2MB allowed.", "warning");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNoteImage(reader.result as string);
        showToast("Image attached to Sticky Note", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const createStickyNote = () => {
    if (!noteText.trim() && !noteTitle.trim()) {
      showToast("Please enter a note title or text", "warning");
      return;
    }

    let posX = 120;
    let posY = 120;
    if (boardContainerRef.current) {
      const rect = boardContainerRef.current.getBoundingClientRect();
      posX = Math.round((-pan.x + rect.width / 2 - 130) / zoom);
      posY = Math.round((-pan.y + rect.height / 2 - 100) / zoom);
    }
    if (snapEnabled) {
      posX = snapToGrid(posX, snapStep);
      posY = snapToGrid(posY, snapStep);
    }

    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      title: noteTitle.trim() || undefined,
      text: noteText.trim(),
      color: newNoteBg,
      textColor: newNoteTextColor,
      font: newNoteFont,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      subject: noteSubject.trim() || "General Study",
      pinned: false,
      image: noteImage || undefined,
      x: posX,
      y: posY,
      w: 260,
      h: 200,
    };

    setStickyNotes((prev) => [newNote, ...prev]);
    setSelectedNoteIds(new Set([newNote.id]));
    setNoteTitle("");
    setNoteText("");
    setNoteSubject("");
    setNoteImage(null);
    showToast("Sticky note created on canvas!", "success");
  };

  const deleteStickyNote = (id: string) => {
    setStickyNotes((prev) => prev.filter((n) => n.id !== id));
    setConnectors((prev) => cleanupBoardConnectors(prev, new Set([id])));
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast("Sticky Note deleted", "info");
  };

  const deleteSelectedNotes = () => {
    if (selectedNoteIds.size === 0) return;
    setStickyNotes((prev) => prev.filter((n) => !selectedNoteIds.has(n.id)));
    setConnectors((prev) => cleanupBoardConnectors(prev, selectedNoteIds));
    setSelectedNoteIds(new Set());
    showToast(`Deleted ${selectedNoteIds.size} notes`, "info");
  };

  const duplicateSelectedNotes = () => {
    if (selectedNoteIds.size === 0) return;
    const newNotes: StickyNote[] = [];
    const newSelection = new Set<string>();

    stickyNotes.forEach((n) => {
      if (selectedNoteIds.has(n.id)) {
        const dupId = crypto.randomUUID();
        newSelection.add(dupId);
        newNotes.push({
          ...n,
          id: dupId,
          x: (n.x || 0) + 32,
          y: (n.y || 0) + 32,
          title: n.title ? `${n.title} (Copy)` : undefined,
        });
      }
    });

    setStickyNotes((prev) => [...prev, ...newNotes]);
    setSelectedNoteIds(newSelection);
    showToast(`Duplicated ${newNotes.length} notes`, "success");
  };

  const toggleLockSelectedNotes = () => {
    if (selectedNoteIds.size === 0) return;
    setStickyNotes((prev) =>
      prev.map((n) => (selectedNoteIds.has(n.id) ? { ...n, locked: !n.locked } : n))
    );
  };

  const changeZOrder = (direction: "forward" | "back") => {
    if (selectedNoteIds.size === 0) return;
    setStickyNotes((prev) => {
      const selected = prev.filter((n) => selectedNoteIds.has(n.id));
      const unselected = prev.filter((n) => !selectedNoteIds.has(n.id));
      return direction === "forward" ? [...unselected, ...selected] : [...selected, ...unselected];
    });
  };

  // Connectors
  const startConnecting = (noteId: string) => {
    setConnectingFromId(noteId);
    showToast("Click a target note to connect arrow", "info");
  };

  const completeConnecting = (targetId: string) => {
    if (!connectingFromId) return;
    if (connectingFromId === targetId) {
      setConnectingFromId(null);
      return;
    }

    const newConn: BoardConnector = {
      id: crypto.randomUUID(),
      from: connectingFromId,
      to: targetId,
      label: "relates to",
    };

    setConnectors((prev) => [...prev, newConn]);
    setConnectingFromId(null);
    showToast("Connector added", "success");
  };

  // Insert Template
  const handleApplyTemplate = (templateKey: "cornell" | "feynman" | "lectureSummary" | "examRevision") => {
    const { notes: tmplNotes, frames: tmplFrames, connectors: tmplConnectors } = generateBoardTemplate(
      templateKey,
      noteSubject.trim() || "Course Concept"
    );

    setStickyNotes((prev) => [...prev, ...tmplNotes]);
    setFrames((prev) => [...prev, ...tmplFrames]);
    setConnectors((prev) => [...prev, ...tmplConnectors]);
    setShowTemplateModal(false);
    showToast(`Inserted ${templateKey} template!`, "success");
  };

  // Space key tracking for canvas panning
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ─── Canvas Mouse & Pointer Handlers ──────────────────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== boardContainerRef.current && (e.target as HTMLElement).id !== "canvas-svg-layer") {
      return;
    }

    if (e.button === 0 && !isSpacePressed) {
      const rect = boardContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      setIsMarqueeSelecting(true);
      setMarqueeBox({ x1: mouseX, y1: mouseY, x2: mouseX, y2: mouseY });
      if (!e.shiftKey) {
        setSelectedNoteIds(new Set());
      }
    } else if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const rect = boardContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isMarqueeSelecting && marqueeBox) {
      const currentX = (e.clientX - rect.left - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - pan.y) / zoom;
      const updatedBox = { ...marqueeBox, x2: currentX, y2: currentY };
      setMarqueeBox(updatedBox);

      const selected = new Set(selectedNoteIds);
      stickyNotes.forEach((note) => {
        if (isInsideMarquee(note as any, updatedBox)) {
          selected.add(note.id);
        }
      });
      setSelectedNoteIds(selected);
    } else if (draggingNoteId) {
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      let newX = mouseX - dragOffset.x;
      let newY = mouseY - dragOffset.y;

      if (snapEnabled) {
        newX = snapToGrid(newX, snapStep);
        newY = snapToGrid(newY, snapStep);
      }

      const activeNote = stickyNotes.find((n) => n.id === draggingNodeId(draggingNoteId));
      if (activeNote) {
        const dx = newX - (activeNote.x || 0);
        const dy = newY - (activeNote.y || 0);

        setStickyNotes((prev) =>
          prev.map((n) => {
            if (selectedNoteIds.has(n.id) && !n.locked) {
              return { ...n, x: (n.x || 0) + dx, y: (n.y || 0) + dy };
            } else if (n.id === draggingNoteId && !n.locked) {
              return { ...n, x: newX, y: newY };
            }
            return n;
          })
        );
      }
    } else if (draggingFrameId) {
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      const activeFrame = frames.find((f) => f.id === draggingFrameId);
      if (activeFrame) {
        let newX = mouseX - frameDragOffset.x;
        let newY = mouseY - frameDragOffset.y;
        if (snapEnabled) {
          newX = snapToGrid(newX, snapStep);
          newY = snapToGrid(newY, snapStep);
        }

        const dx = newX - activeFrame.x;
        const dy = newY - activeFrame.y;
        const { updatedNotes, updatedFrame } = moveFrameAndChildren(stickyNotes, activeFrame, dx, dy);
        setStickyNotes(updatedNotes);
        setFrames((prev) => prev.map((f) => (f.id === draggingFrameId ? updatedFrame : f)));
      }
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMarqueeSelecting(false);
    setMarqueeBox(null);
    setDraggingNoteId(null);
    setDraggingFrameId(null);
    setIsPanning(false);
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.25), 2.5));
    } else {
      setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleNoteMouseDown = (e: React.MouseEvent, note: StickyNote) => {
    e.stopPropagation();
    if (connectingFromId) {
      completeConnecting(note.id);
      return;
    }

    if (e.shiftKey) {
      setSelectedNoteIds((prev) => {
        const next = new Set(prev);
        if (next.has(note.id)) next.delete(note.id);
        else next.add(note.id);
        return next;
      });
    } else if (!selectedNoteIds.has(note.id)) {
      setSelectedNoteIds(new Set([note.id]));
    }

    if (!note.locked) {
      setDraggingNoteId(note.id);
      const rect = boardContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setDragOffset({
        x: mouseX - (note.x || 0),
        y: mouseY - (note.y || 0),
      });
    }
  };

  const draggingNodeId = (id: string | null) => id;

  // ─── Export Features (PNG, SVG, Reading-Order Markdown) ────────────────────
  const exportBoardAsPNG = async () => {
    if (!notesContainerRef.current && !boardContainerRef.current) return;
    try {
      showToast("Generating high-resolution board PNG...", "info");
      const target = boardContainerRef.current || notesContainerRef.current;
      if (!target) return;
      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: "#020617",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `flowtrack-board-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("Board image exported!", "success");
    } catch (err) {
      console.error(err);
      showToast("Export failed", "warning");
    }
  };

  const exportBoardAsMarkdown = () => {
    if (stickyNotes.length === 0) {
      showToast("Board is empty", "warning");
      return;
    }

    const sorted = getNotesInReadingOrder(stickyNotes);
    let md = `# Study Notes Board Export\n*Exported on ${new Date().toLocaleDateString()}*\n\n`;

    sorted.forEach((note, i) => {
      md += `### ${i + 1}. ${note.title || note.subject || "Untitled Note"}\n`;
      md += `**Subject:** ${note.subject} | **Date:** ${note.date} ${note.time}\n\n`;
      md += `${note.text}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-notes-board-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Reading-order Markdown exported!", "success");
  };

  // Filtered Notes
  const filteredStickyNotes = useMemo(() => {
    if (!searchQuery.trim()) return stickyNotes;
    const q = searchQuery.toLowerCase();
    return stickyNotes.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        n.text.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q)
    );
  }, [stickyNotes, searchQuery]);

  // ─── Real Notepad Document Actions ────────────────────────────────────────
  const createNewDoc = () => {
    const newDoc: NotepadDoc = {
      id: crypto.randomUUID(),
      title: "Untitled Study Note",
      content: "# Untitled Study Note\n\nWrite your concepts, summaries, or formulas...",
      category: "General",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setNotepadDocs((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    showToast("New notepad document created!", "success");
  };

  const updateActiveDocContent = (content: string) => {
    if (!activeDoc) return;
    setNotepadDocs((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? { ...d, content, updatedAt: new Date().toISOString() } : d))
    );
  };

  const updateActiveDocTitle = (title: string) => {
    if (!activeDoc) return;
    setNotepadDocs((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? { ...d, title, updatedAt: new Date().toISOString() } : d))
    );
  };

  const deleteDoc = (id: string) => {
    if (notepadDocs.length <= 1) {
      showToast("Cannot delete the only remaining document", "warning");
      return;
    }
    const filtered = notepadDocs.filter((d) => d.id !== id);
    setNotepadDocs(filtered);
    if (activeDocId === id) {
      setActiveDocId(filtered[0]?.id || "");
    }
    showToast("Document deleted", "info");
  };

  const togglePinDoc = (id: string) => {
    setNotepadDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, pinned: !d.pinned } : d))
    );
  };

  const copyNotepadMarkdown = () => {
    if (!activeDoc) return;
    navigator.clipboard.writeText(activeDoc.content);
    setCopiedNotepad(true);
    setTimeout(() => setCopiedNotepad(false), 2000);
    showToast("Copied Markdown to clipboard!", "success");
  };

  const exportNotepadMarkdown = () => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Document exported as Markdown file", "success");
  };

  const filteredDocs = useMemo(() => {
    if (!docSearch.trim()) {
      return [...notepadDocs].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    }
    const q = docSearch.toLowerCase();
    return notepadDocs
      .filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [notepadDocs, docSearch]);

  return (
    <div className="space-y-4 select-none">
      {/* ─── Top Header & Dual Mode Tabs ─────────────────────────────────── */}
      <Panel className="bg-slate-900/90 border-slate-800 backdrop-blur-md p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Study Notes & Infinite Board
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {activeTab === "board" ? "Infinite Canvas (Keep+Miro)" : "Real Notepad (Markdown Docs)"}
                </span>
              </h1>
              <p className="text-xs text-slate-400">Organize concepts with snap-grid, frames, and Markdown export</p>
            </div>
          </div>

          {/* Dual Navigation Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              onClick={() => setActiveTab("board")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "board"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Palette className="w-3.5 h-3.5" /> Infinite Canvas
            </button>

            <button
              onClick={() => setActiveTab("notepad")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "notepad"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Markdown Docs
            </button>
          </div>
        </div>
      </Panel>

      {/* ─── TAB 1: INFINITE CANVAS STICKY BOARD ───────────────────────────── */}
      {activeTab === "board" ? (
        <div className="space-y-3">
          {/* Canvas Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl">
            {/* Left: View Mode, Snap, and Templates */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setBoardViewMode("canvas")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    boardViewMode === "canvas" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Canvas
                </button>
                <button
                  onClick={() => setBoardViewMode("grid")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    boardViewMode === "grid" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Grid
                </button>
              </div>

              {boardViewMode === "canvas" && (
                <button
                  onClick={() => setSnapEnabled((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 transition ${
                    snapEnabled
                      ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                      : "bg-slate-950 border-slate-800 text-slate-500"
                  }`}
                  title="Snap to Grid (8/16px)"
                >
                  <Grid className="w-3.5 h-3.5" /> Snap {snapStep}px
                </button>
              )}

              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
              >
                <LayoutTemplate className="w-3.5 h-3.5 text-cyan-400" /> Templates
              </button>
            </div>

            {/* Center: Multi-selection operations */}
            {selectedNoteIds.size > 0 && (
              <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-xl text-xs">
                <span className="font-bold text-purple-300 mr-1">{selectedNoteIds.size} selected</span>
                <button
                  onClick={duplicateSelectedNotes}
                  className="p-1 hover:bg-purple-500/20 rounded text-purple-200"
                  title="Duplicate (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleLockSelectedNotes}
                  className="p-1 hover:bg-purple-500/20 rounded text-purple-200"
                  title="Lock / Unlock"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => changeZOrder("forward")}
                  className="p-1 hover:bg-purple-500/20 rounded text-purple-200"
                  title="Bring Forward"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={deleteSelectedNotes}
                  className="p-1 hover:bg-rose-500/30 rounded text-rose-300"
                  title="Delete Selection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Right: Search, Exports, and Create Note */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-28 md:w-40 pl-7 pr-2 py-1 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={exportBoardAsMarkdown}
                className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
                title="Export Reading-Order Markdown (.md)"
              >
                <FileDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={exportBoardAsPNG}
                className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
                title="Export PNG Image"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Note Input Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 border border-slate-800 p-2 rounded-2xl">
            <input
              type="text"
              placeholder="Note Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-36 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-purple-500"
            />
            <input
              type="text"
              placeholder="Content..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createStickyNote()}
              className="flex-1 min-w-[200px] px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-purple-500"
            />
            <button
              onClick={createStickyNote}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Add Note
            </button>
          </div>

          {/* ─── Main Canvas Area ─── */}
          {boardViewMode === "canvas" ? (
            <div
              ref={boardContainerRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onWheel={handleCanvasWheel}
              className="relative h-[calc(100vh-16rem)] min-h-[500px] w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden cursor-crosshair"
            >
              {/* Subtle Grid Dot Pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.3) 1px, transparent 0)`,
                  backgroundSize: `${snapStep * zoom}px ${snapStep * zoom}px`,
                  backgroundPosition: `${pan.x}px ${pan.y}px`,
                }}
              />

              {/* Transformed Layer */}
              <div
                className="absolute inset-0 origin-top-left pointer-events-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                {/* SVG Layer for Frames & Connectors */}
                <svg
                  id="canvas-svg-layer"
                  className="absolute inset-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible"
                >
                  <defs>
                    <marker
                      id="board-arrow"
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

                  {/* Connectors */}
                  {connectors.map((conn) => {
                    const fromNote = stickyNotes.find((n) => n.id === conn.from);
                    const toNote = stickyNotes.find((n) => n.id === conn.to);
                    if (!fromNote || !toNote) return null;

                    const startX = (fromNote.x || 0) + (fromNote.w || 260) / 2;
                    const startY = (fromNote.y || 0) + (fromNote.h || 200) / 2;
                    const endX = (toNote.x || 0) + (toNote.w || 260) / 2;
                    const endY = (toNote.y || 0) + (toNote.h || 200) / 2;

                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2 - 25;
                    const pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

                    return (
                      <g key={conn.id}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={conn.color || "#06b6d4"}
                          strokeWidth={2}
                          strokeDasharray="4,4"
                          markerEnd="url(#board-arrow)"
                          opacity={0.8}
                        />
                        {conn.label && (
                          <text
                            x={midX}
                            y={midY}
                            fill="#67e8f9"
                            fontSize="11"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {conn.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Named Frames */}
                {frames.map((frame) => (
                  <div
                    key={frame.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingFrameId(frame.id);
                      const rect = boardContainerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
                      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
                      setFrameDragOffset({ x: mouseX - frame.x, y: mouseY - frame.y });
                    }}
                    className="absolute pointer-events-auto rounded-3xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 p-3 flex flex-col justify-between cursor-move group hover:border-purple-500/60 transition"
                    style={{
                      left: `${frame.x}px`,
                      top: `${frame.y}px`,
                      width: `${frame.w}px`,
                      height: `${frame.h}px`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        {frame.title}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Sticky Notes Cards */}
                {filteredStickyNotes.map((note) => {
                  const isSelected = selectedNoteIds.has(note.id);
                  return (
                    <div
                      key={note.id}
                      onMouseDown={(e) => handleNoteMouseDown(e, note)}
                      className={`absolute pointer-events-auto rounded-2xl p-3.5 shadow-xl border transition-shadow cursor-grab active:cursor-grabbing flex flex-col justify-between ${
                        note.color
                      } ${
                        isSelected
                          ? "ring-4 ring-cyan-400/60 shadow-cyan-400/30 z-30"
                          : "hover:shadow-2xl z-10"
                      }`}
                      style={{
                        left: `${note.x || 100}px`,
                        top: `${note.y || 100}px`,
                        width: `${note.w || 260}px`,
                        minHeight: `${note.h || 200}px`,
                      }}
                    >
                      <div>
                        {/* Note Header */}
                        <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-white/10">
                          <h4 className={`text-xs font-extrabold truncate ${note.textColor}`}>
                            {note.title || note.subject}
                          </h4>
                          <div className="flex items-center gap-1">
                            {note.locked && <Lock className="w-3 h-3 text-amber-300" />}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startConnecting(note.id);
                              }}
                              className="text-slate-400 hover:text-white"
                              title="Connect Arrow to..."
                            >
                              <Link2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteStickyNote(note.id);
                              }}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Note Image */}
                        {note.image && (
                          <div className="w-full h-24 rounded-lg overflow-hidden my-2 border border-white/10">
                            <img src={note.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Note Body with Markdown Preview */}
                        <div className={`mt-2 text-xs leading-relaxed ${note.textColor} ${note.font}`}>
                          <MarkdownRenderer content={note.text} />
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/10 mt-2">
                        <span>{note.subject}</span>
                        <span>{note.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Marquee Selection Box Overlay */}
              {isMarqueeSelecting && marqueeBox && (
                <div
                  className="absolute border border-cyan-400 bg-cyan-400/10 pointer-events-none z-40"
                  style={{
                    left: `${Math.min(marqueeBox.x1, marqueeBox.x2) * zoom + pan.x}px`,
                    top: `${Math.min(marqueeBox.y1, marqueeBox.y2) * zoom + pan.y}px`,
                    width: `${Math.abs(marqueeBox.x2 - marqueeBox.x1) * zoom}px`,
                    height: `${Math.abs(marqueeBox.y2 - marqueeBox.y1) * zoom}px`,
                  }}
                />
              )}

              {/* Floating Zoom Navigation Pill */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-2xl px-3 py-1.5 shadow-2xl z-30 text-xs">
                <button
                  onClick={() => setZoom((prev) => Math.min(prev * 1.2, 2.5))}
                  className="p-1 text-slate-300 hover:text-white"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300 w-10 text-center font-bold">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((prev) => Math.max(prev * 0.8, 0.25))}
                  className="p-1 text-slate-300 hover:text-white"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="p-1 text-slate-300 hover:text-white"
                  title="Reset View"
                >
                  <Compass className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ─── Grid View Mode (Classic) ─── */
            <div
              ref={notesContainerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredStickyNotes.map((note) => (
                <div
                  key={note.id}
                  className={`rounded-2xl p-4 shadow-xl border flex flex-col justify-between ${note.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <h4 className={`text-xs font-bold ${note.textColor}`}>
                        {note.title || note.subject}
                      </h4>
                      <button
                        onClick={() => deleteStickyNote(note.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className={`mt-2 text-xs leading-relaxed ${note.textColor} ${note.font}`}>
                      <MarkdownRenderer content={note.text} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/10 mt-3">
                    <span>{note.subject}</span>
                    <span>{note.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── TAB 2: REAL NOTEPAD MULTIPLE DOCS ────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[600px]">
          {/* Docs Sidebar */}
          <Panel className="lg:col-span-1 bg-slate-900/90 border-slate-800 p-3.5 flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-purple-400" /> Documents
                </h3>
                <button
                  onClick={createNewDoc}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1 shadow"
                >
                  <FilePlus className="w-3 h-3" /> + New Doc
                </button>
              </div>

              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-2.5 py-1 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
                {filteredDocs.map((doc) => {
                  const isActive = doc.id === activeDoc?.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setActiveDocId(doc.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                        isActive
                          ? "bg-purple-600/20 border-purple-500/50 text-white"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{doc.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinDoc(doc.id);
                          }}
                          className={`${doc.pinned ? "text-purple-400" : "text-slate-500"}`}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{doc.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Doc Editor & Markdown Preview */}
          <Panel className="lg:col-span-3 bg-slate-900/90 border-slate-800 p-4 flex flex-col space-y-3">
            {activeDoc && (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <input
                    type="text"
                    value={activeDoc.title}
                    onChange={(e) => updateActiveDocTitle(e.target.value)}
                    className="text-base font-bold bg-transparent text-white border-b border-transparent hover:border-slate-700 focus:border-purple-500 outline-none px-1"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyNotepadMarkdown}
                      className="px-2.5 py-1 text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 flex items-center gap-1"
                    >
                      {copiedNotepad ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={exportNotepadMarkdown}
                      className="px-2.5 py-1 text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[420px]">
                  <textarea
                    value={activeDoc.content}
                    onChange={(e) => updateActiveDocContent(e.target.value)}
                    className="w-full h-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono outline-none focus:border-purple-500 resize-none"
                    placeholder="Write in Markdown with formulas ($x^2$), task lists, etc."
                  />
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl overflow-y-auto">
                    <MarkdownRenderer content={activeDoc.content} />
                  </div>
                </div>
              </>
            )}
          </Panel>
        </div>
      )}

      {/* ─── Academic Templates Modal ─── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-purple-400" /> Academic Board Templates
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Choose a proven learning layout. Notes and frames will be added to your canvas:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleApplyTemplate("cornell")}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500 text-left transition space-y-1"
              >
                <h4 className="text-xs font-bold text-white">Cornell Notes Frame</h4>
                <p className="text-[11px] text-slate-400">Cue column, main lecture notes, and bottom summary container.</p>
              </button>

              <button
                onClick={() => handleApplyTemplate("feynman")}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500 text-left transition space-y-1"
              >
                <h4 className="text-xs font-bold text-white">Feynman Explainer</h4>
                <p className="text-[11px] text-slate-400">Teach simply, isolate knowledge gaps, and review target.</p>
              </button>

              <button
                onClick={() => handleApplyTemplate("lectureSummary")}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500 text-left transition space-y-1"
              >
                <h4 className="text-xs font-bold text-white">Lecture Summary</h4>
                <p className="text-[11px] text-slate-400">Key topics, action items, and instructor questions.</p>
              </button>

              <button
                onClick={() => handleApplyTemplate("examRevision")}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500 text-left transition space-y-1"
              >
                <h4 className="text-xs font-bold text-white">Exam 4-Quadrant</h4>
                <p className="text-[11px] text-slate-400">High-yield facts, traps/pitfalls, derivations, and quick checklist.</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
