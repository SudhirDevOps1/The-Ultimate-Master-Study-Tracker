import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { 
  Palette, Download, Edit3, Trash2, Plus, Search, Camera, FileText, 
  Image as ImageIcon, Copy, Check, Type, Sparkles, Pin, FilePlus, Folder, 
  Clock, Save, Share2, AlignLeft, Bold, Italic, List, CheckSquare, Code, Heading,
  Eye, Columns, Maximize2, Minimize2, ExternalLink, ImageDown
} from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/components/common/Toast";

// ─── Data Models ──────────────────────────────────────────────────────────────
export interface StickyNote {
  id: string;
  title?: string;
  text: string;
  color: string;      // Background Color Class
  textColor: string;  // Custom Text Color Class
  font: string;       // Custom Font Class
  date: string;
  time: string;
  subject: string;
  pinned?: boolean;
  image?: string;     // Base64 / URL image attachment
}

export interface NotepadDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
  createdAt: string;
  pinned?: boolean;
}

const NOTE_BACKGROUNDS = [
  { name: "Yellow", class: "bg-yellow-500/15 border-yellow-400/35" },
  { name: "Emerald", class: "bg-emerald-500/15 border-emerald-400/35" },
  { name: "Cyan", class: "bg-cyan-500/15 border-cyan-400/35" },
  { name: "Purple", class: "bg-purple-500/15 border-purple-400/35" },
  { name: "Pink", class: "bg-pink-500/15 border-pink-400/35" },
  { name: "Rose", class: "bg-rose-500/15 border-rose-400/35" },
  { name: "Dark Slate", class: "bg-slate-900/60 border-slate-700/60" }
];

const NOTE_TEXT_COLORS = [
  { name: "Amber/Gold", class: "text-amber-200" },
  { name: "Mint Green", class: "text-emerald-200" },
  { name: "Aqua Cyan", class: "text-cyan-200" },
  { name: "Lavender", class: "text-purple-200" },
  { name: "Hot Pink", class: "text-pink-200" },
  { name: "Pure White", class: "text-white" },
  { name: "Cool Gray", class: "text-slate-300" }
];

const NOTE_FONTS = [
  { name: "System Sans", class: "font-sans" },
  { name: "Classic Serif", class: "font-serif" },
  { name: "Developer Mono", class: "font-mono" },
  { name: "Poppins Modern", class: "font-[Poppins,sans-serif]" }
];

const DEFAULT_NOTEPAD_DOCS: NotepadDoc[] = [
  {
    id: "default-doc-1",
    title: "📖 Physics Formulas & Notes",
    content: `# Physics Study Notes

## Key Formulas
- Velocity: v = d / t
- Acceleration: a = (v - u) / t
- Newton's Second Law: F = m * a
- Kinetic Energy: KE = 0.5 * m * v^2

## Revision Strategy
1. Solve 5 numerical problems daily.
2. Review derivation for wave motion equations.
3. Test flashcards before bedtime.`,
    category: "Physics",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    pinned: true
  },
  {
    id: "default-doc-2",
    title: "📝 Daily Study Journal",
    content: `# Study Journal

- **Today's Goal**: Finish 2 chapters of Mathematics.
- **Key Takeaways**: Matrix multiplication requires rows of A to match columns of B.
- **Pending Tasks**: Practice previous year questions.`,
    category: "General",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

// ─── Simple Markdown Renderer Component ─────────────────────────────────────
function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <div className="py-12 text-center text-slate-500 italic text-sm">
        (Empty Document Preview)
      </div>
    );
  }

  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const renderedElements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    // Code block toggle ```
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        renderedElements.push(
          <pre key={`code-${index}`} className="my-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-purple-300 overflow-x-auto">
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Inline formatting helper
    const formatInline = (text: string): React.ReactNode => {
      const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
      return parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={pIdx} className="font-extrabold text-purple-300">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={pIdx} className="italic text-slate-200">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-xs">{part.slice(1, -1)}</code>;
        }
        return part;
      });
    };

    // Headings
    if (line.startsWith("# ")) {
      renderedElements.push(
        <h1 key={index} className="text-2xl font-black text-white mt-4 mb-2 pb-1 border-b border-slate-800">
          {formatInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      renderedElements.push(
        <h2 key={index} className="text-lg font-bold text-purple-300 mt-3 mb-1.5">
          {formatInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      renderedElements.push(
        <h3 key={index} className="text-base font-semibold text-slate-200 mt-2 mb-1">
          {formatInline(line.slice(4))}
        </h3>
      );
    } 
    // Bullet Lists
    else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const itemText = line.trim().slice(2);
      if (itemText.startsWith("[ ] ") || itemText.startsWith("[x] ")) {
        const checked = itemText.startsWith("[x] ");
        const checkText = itemText.slice(4);
        renderedElements.push(
          <div key={index} className="flex items-center gap-2 my-1 text-xs text-slate-200">
            <input type="checkbox" checked={checked} readOnly className="rounded border-slate-700 bg-slate-900 text-purple-600" />
            <span className={checked ? "line-through text-slate-500" : ""}>{formatInline(checkText)}</span>
          </div>
        );
      } else {
        renderedElements.push(
          <li key={index} className="ml-4 text-xs text-slate-300 list-disc my-0.5">
            {formatInline(itemText)}
          </li>
        );
      }
    } 
    // Numbered List
    else if (/^\d+\.\s/.test(line.trim())) {
      const itemText = line.trim().replace(/^\d+\.\s/, "");
      renderedElements.push(
        <li key={index} className="ml-4 text-xs text-slate-300 list-decimal my-0.5">
          {formatInline(itemText)}
        </li>
      );
    } 
    // Quotes
    else if (line.trim().startsWith("> ")) {
      renderedElements.push(
        <blockquote key={index} className="pl-3 border-l-2 border-purple-500 italic text-slate-400 my-2 text-xs">
          {formatInline(line.trim().slice(2))}
        </blockquote>
      );
    } 
    // Empty line / paragraph
    else if (line.trim() === "") {
      renderedElements.push(<div key={index} className="h-2" />);
    } else {
      renderedElements.push(
        <p key={index} className="text-xs text-slate-300 leading-relaxed my-1">
          {formatInline(line)}
        </p>
      );
    }
  });

  return (
    <div className="prose prose-invert max-w-none space-y-1 select-text">
      {renderedElements}
    </div>
  );
}

export function StudyNotesBoardPage() {
  const [activeTab, setActiveTab] = useState<"board" | "notepad">("board");

  // ─── Sticky Board State ──────────────────────────────────────────────────
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => {
    try {
      const saved = localStorage.getItem("workspace_sticky_notes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [noteImage, setNoteImage] = useState<string | null>(null);
  const [newNoteBg, setNewNoteBg] = useState(NOTE_BACKGROUNDS[0].class);
  const [newNoteTextColor, setNewNoteTextColor] = useState(NOTE_TEXT_COLORS[5].class);
  const [newNoteFont, setNewNoteFont] = useState(NOTE_FONTS[0].class);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Notepad View Mode: 'edit' | 'preview' | 'split'
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");

  const [docSearch, setDocSearch] = useState("");
  const [copiedNotepad, setCopiedNotepad] = useState(false);
  const { showToast } = useToast();

  const notesContainerRef = useRef<HTMLDivElement | null>(null);
  const docPreviewContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync Sticky Notes
  useEffect(() => {
    localStorage.setItem("workspace_sticky_notes", JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  // Sync Notepad Documents
  useEffect(() => {
    localStorage.setItem("flowtrack_notepad_docs_v2", JSON.stringify(notepadDocs));
  }, [notepadDocs]);

  // Active Notepad Document
  const activeDoc = useMemo(() => {
    return notepadDocs.find(d => d.id === activeDocId) || notepadDocs[0] || null;
  }, [notepadDocs, activeDocId]);

  // ─── Sticky Notes Handlers ────────────────────────────────────────────────
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

  const addStickyNote = () => {
    if (!noteText.trim() && !noteImage && !noteTitle.trim()) {
      showToast("Please enter a title or text for the note", "warning");
      return;
    }

    const now = new Date();
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      title: noteTitle.trim() || undefined,
      text: noteText.trim(),
      color: newNoteBg,
      textColor: newNoteTextColor,
      font: newNoteFont,
      date: now.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      subject: noteSubject.trim() || "General",
      image: noteImage || undefined,
      pinned: false
    };

    setStickyNotes([newNote, ...stickyNotes]);
    setNoteTitle("");
    setNoteText("");
    setNoteSubject("");
    setNoteImage(null);
    showToast("Sticky note saved!", "success");
  };

  const togglePinSticky = (id: string) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  };

  const deleteStickyNote = (id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
    showToast("Sticky note deleted", "info");
  };

  const copyStickyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Sticky note text copied!", "success");
  };

  const exportBoardAsImage = async () => {
    if (!notesContainerRef.current) return;
    try {
      showToast("Generating image export...", "info");
      const canvas = await html2canvas(notesContainerRef.current, {
        backgroundColor: "#0F172A",
        scale: 2
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `FlowTrack_StickyBoard_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      showToast("Sticky Board exported as PNG!", "success");
    } catch {
      showToast("Failed to export image", "warning");
    }
  };

  // ─── Real Notepad Multiple Docs Handlers ──────────────────────────────────
  const createNewDoc = () => {
    const newDoc: NotepadDoc = {
      id: crypto.randomUUID(),
      title: `Untitled Document ${notepadDocs.length + 1}`,
      content: "",
      category: "General",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setNotepadDocs([newDoc, ...notepadDocs]);
    setActiveDocId(newDoc.id);
    showToast("New Document created!", "success");
  };

  const updateActiveDocTitle = (title: string) => {
    if (!activeDoc) return;
    setNotepadDocs(prev => prev.map(d => d.id === activeDoc.id ? { 
      ...d, 
      title, 
      updatedAt: new Date().toISOString() 
    } : d));
  };

  const updateActiveDocContent = (content: string) => {
    if (!activeDoc) return;
    setNotepadDocs(prev => prev.map(d => d.id === activeDoc.id ? { 
      ...d, 
      content, 
      updatedAt: new Date().toISOString() 
    } : d));
  };

  const togglePinDoc = (id: string) => {
    setNotepadDocs(prev => prev.map(d => d.id === id ? { ...d, pinned: !d.pinned } : d));
  };

  const deleteDoc = (id: string) => {
    if (notepadDocs.length <= 1) {
      showToast("Cannot delete the only remaining document", "warning");
      return;
    }
    const filtered = notepadDocs.filter(d => d.id !== id);
    setNotepadDocs(filtered);
    setActiveDocId(filtered[0].id);
    showToast("Document deleted", "info");
  };

  const downloadDocAsFile = () => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = activeDoc.title.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
    link.download = `${safeTitle || "note"}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Document exported as .md file!", "success");
  };

  // High Quality Rendered Markdown PNG Exporter
  const exportDocAsPNG = async () => {
    if (!activeDoc) return;
    try {
      showToast("Generating high-resolution PNG image...", "info");
      
      let targetEl = docPreviewContainerRef.current;
      if (!targetEl) {
        targetEl = document.querySelector("#rendered-doc-preview-container") as HTMLDivElement | null;
      }

      if (!targetEl) {
        // If user is currently in raw 'edit' mode, temporarily toggle to split to capture
        setViewMode("split");
        await new Promise(r => setTimeout(r, 200));
        targetEl = document.querySelector("#rendered-doc-preview-container") as HTMLDivElement | null;
      }

      if (!targetEl) {
        showToast("Unable to capture preview container", "warning");
        return;
      }

      const canvas = await html2canvas(targetEl, {
        backgroundColor: "#0B0F19",
        scale: 3, // Crisp 3x High Definition quality
        logging: false,
        useCORS: true
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeTitle = activeDoc.title.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
      link.download = `${safeTitle || "note"}_rendered.png`;
      link.href = dataUrl;
      link.click();
      showToast("High Quality PNG Image Exported!", "success");
    } catch (err) {
      console.error("Failed to export doc PNG:", err);
      showToast("Failed to export PNG image", "warning");
    }
  };

  const copyDocToClipboard = () => {
    if (!activeDoc) return;
    navigator.clipboard.writeText(activeDoc.content);
    setCopiedNotepad(true);
    showToast("Document copied to clipboard!", "success");
    setTimeout(() => setCopiedNotepad(false), 2000);
  };

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("notepad-editor-textarea") as HTMLTextAreaElement | null;
    if (!textarea || !activeDoc) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = activeDoc.content;
    const selectedText = currentText.substring(start, end);

    const replacement = `${prefix}${selectedText || "text"}${suffix}`;
    const newContent = currentText.substring(0, start) + replacement + currentText.substring(end);

    updateActiveDocContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  };

  // Filtered Sticky Notes
  const filteredStickyNotes = useMemo(() => {
    let result = stickyNotes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        n.text.toLowerCase().includes(q) || 
        n.subject.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => Number(b.pinned || 0) - Number(a.pinned || 0));
  }, [stickyNotes, searchQuery]);

  // Filtered Notepad Documents
  const filteredDocs = useMemo(() => {
    let result = notepadDocs;
    if (docSearch.trim()) {
      const q = docSearch.toLowerCase();
      result = result.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => Number(b.pinned || 0) - Number(a.pinned || 0));
  }, [notepadDocs, docSearch]);

  const wordCount = activeDoc ? activeDoc.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = activeDoc ? activeDoc.content.length : 0;

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Dual Mode Tabs ─────────────────────────────────── */}
      <Panel className="bg-slate-900/90 border-slate-800 backdrop-blur-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/5">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                📌 Study Notes & Notepad Suite
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {activeTab === "board" ? "Sticky Board (Keep Style)" : "Real Notepad (Docs Style)"}
                </span>
              </h1>
              <p className="text-xs text-slate-400">Save, organize and manage all your study notes by title in app database</p>
            </div>
          </div>

          {/* Dual Navigation Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              onClick={() => setActiveTab("board")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "board"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Palette className="w-4 h-4" /> 📌 Sticky Board (Keep)
            </button>

            <button
              onClick={() => setActiveTab("notepad")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "notepad"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" /> 📝 Real Notepad (Saved Docs)
            </button>
          </div>
        </div>
      </Panel>

      {/* ─── TAB 1: STICKY BOARD MODE (GOOGLE KEEP STYLE) ──────────────────── */}
      {activeTab === "board" ? (
        <div className="space-y-6">
          {/* Create New Sticky Note Input Card */}
          <Panel className="bg-slate-900/80 border-slate-800 p-5 backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" /> Create New Sticky Note
            </h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Note Title (e.g. Physics Chapter 1 Summary)"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />

                <input
                  type="text"
                  placeholder="Subject Tag (e.g. Mathematics, History, Biology)"
                  value={noteSubject}
                  onChange={(e) => setNoteSubject(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>

              <textarea
                placeholder="Write your study note content here..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 resize-y"
              />

              {noteImage && (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-purple-500/40">
                  <img src={noteImage} alt="Attachment" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setNoteImage(null)} 
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full text-xs hover:bg-rose-500"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Color & Styling Selectors */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 mr-1">Bg:</span>
                    {NOTE_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.name}
                        onClick={() => setNewNoteBg(bg.class)}
                        className={`w-5 h-5 rounded-full border transition ${newNoteBg === bg.class ? "ring-2 ring-purple-500 scale-110 border-white" : "border-slate-700"}`}
                        style={{ backgroundColor: bg.name === "Yellow" ? "#eab308" : bg.name === "Emerald" ? "#10b981" : bg.name === "Cyan" ? "#06b6d4" : bg.name === "Purple" ? "#a855f7" : bg.name === "Pink" ? "#ec4899" : bg.name === "Rose" ? "#f43f5e" : "#1e293b" }}
                        title={bg.name}
                      />
                    ))}
                  </div>

                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> Attach Image
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportBoardAsImage}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Board PNG
                  </button>

                  <button
                    onClick={addStickyNote}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Save Sticky Note
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Search Bar & Sticky Notes Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search sticky notes by title, subject or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>

              <span className="text-xs text-slate-400 font-semibold">
                Total Notes: <span className="text-purple-400">{filteredStickyNotes.length}</span>
              </span>
            </div>

            <div ref={notesContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
              <AnimatePresence>
                {filteredStickyNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`relative p-4 rounded-2xl border backdrop-blur-md shadow-xl transition hover:shadow-2xl flex flex-col justify-between ${note.color} ${note.pinned ? "ring-2 ring-purple-500/50" : ""}`}
                  >
                    <div>
                      {/* Note Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          {note.title && (
                            <h4 className={`text-sm font-bold tracking-tight ${note.textColor}`}>
                              {note.title}
                            </h4>
                          )}
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-white/80 inline-block mt-1">
                            {note.subject}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyStickyText(note.text)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition"
                            title="Copy Note Text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => togglePinSticky(note.id)}
                            className={`p-1.5 rounded-lg transition ${note.pinned ? "bg-purple-600 text-white" : "hover:bg-white/10 text-slate-400"}`}
                            title={note.pinned ? "Unpin Note" : "Pin Note to Top"}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => deleteStickyNote(note.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 transition"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Image Attachment */}
                      {note.image && (
                        <div className="my-2 rounded-xl overflow-hidden max-h-40 border border-white/10">
                          <img src={note.image} alt="Attachment" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Note Content */}
                      <p className={`text-xs leading-relaxed whitespace-pre-wrap ${note.textColor} ${note.font}`}>
                        {note.text}
                      </p>
                    </div>

                    {/* Date Footer */}
                    <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{note.date} • {note.time}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredStickyNotes.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                  <Palette className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold">No sticky notes found</p>
                  <p className="text-xs text-slate-500">Create a new sticky note above to populate your board!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── TAB 2: REAL NOTEPAD MODE (SAVED NAMED DOCUMENTS + LIVE PREVIEW) ─ */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[680px]">
          {/* Documents Sidebar List */}
          <Panel className="lg:col-span-1 bg-slate-900/90 border-slate-800 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-purple-400" /> Saved Documents
                </h3>
                <button
                  onClick={createNewDoc}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-purple-600/20"
                >
                  <FilePlus className="w-3.5 h-3.5" /> + New Doc
                </button>
              </div>

              {/* Doc Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* Document List */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredDocs.map((doc) => {
                  const isActive = doc.id === activeDoc?.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setActiveDocId(doc.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isActive 
                          ? "bg-purple-600/20 border-purple-500/50 text-white shadow-md shadow-purple-500/10" 
                          : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold truncate flex-1">
                          {doc.title || "Untitled Document"}
                        </h4>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePinDoc(doc.id); }}
                          className={`text-slate-400 hover:text-purple-400 ${doc.pinned ? "text-purple-400" : ""}`}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {doc.content || "Empty document..."}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(doc.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                        {notepadDocs.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}
                            className="text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 text-center pt-2 border-t border-slate-800">
              Auto-saves real-time to app database 💾
            </div>
          </Panel>

          {/* Active Notepad Document Editor Canvas */}
          <Panel className="lg:col-span-3 bg-slate-900/90 border-slate-800 p-5 flex flex-col justify-between space-y-4">
            {activeDoc ? (
              <>
                {/* Editor Header & View Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <input
                    type="text"
                    value={activeDoc.title}
                    onChange={(e) => updateActiveDocTitle(e.target.value)}
                    placeholder="Document Title (e.g. Physics Chapter Notes)"
                    className="flex-1 bg-transparent text-lg font-extrabold text-white outline-none border-b border-transparent focus:border-purple-500 py-1"
                  />

                  {/* 3-Way View Mode Switcher */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-950/90 border border-slate-800">
                    <button
                      onClick={() => setViewMode("edit")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${viewMode === "edit" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setViewMode("preview")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${viewMode === "preview" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Live Preview
                    </button>
                    <button
                      onClick={() => setViewMode("split")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${viewMode === "split" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      <Columns className="w-3.5 h-3.5" /> Split View
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={copyDocToClipboard}
                      className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                    >
                      {copiedNotepad ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedNotepad ? "Copied!" : "Copy"}
                    </button>

                    <button
                      onClick={exportDocAsPNG}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                      title="Export Rendered Preview as High Quality PNG Image"
                    >
                      <ImageDown className="w-3.5 h-3.5" /> Export PNG
                    </button>

                    <button
                      onClick={downloadDocAsFile}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Export .md File
                    </button>
                  </div>
                </div>

                {/* Quick Formatting Toolbar (only in edit or split mode) */}
                {viewMode !== "preview" && (
                  <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <button onClick={() => insertFormatting("**", "**")} className="p-1.5 hover:bg-slate-800 rounded text-slate-300" title="Bold">
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertFormatting("*", "*")} className="p-1.5 hover:bg-slate-800 rounded text-slate-300" title="Italic">
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertFormatting("# ")} className="p-1.5 hover:bg-slate-800 rounded text-slate-300" title="Heading 1">
                      <Heading className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertFormatting("## ")} className="p-1.5 hover:bg-slate-800 rounded text-slate-300 font-bold text-xs" title="Heading 2">
                      H2
                    </button>
                    <button onClick={() => insertFormatting("- ")} className="p-1.5 hover:bg-slate-800 rounded text-slate-300" title="Bullet List">
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertFormatting("- [ ] ")} className="p-1.5 hover:bg-slate-800 rounded text-slate-300" title="Checkbox Task">
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => insertFormatting("```\n", "\n```")} className="p-1.5 hover:bg-slate-800 rounded text-slate-300" title="Code Block">
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Main Textarea & Live Rendered Preview Area */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[460px]">
                  {/* Editor Textarea */}
                  {(viewMode === "edit" || viewMode === "split") && (
                    <textarea
                      id="notepad-editor-textarea"
                      value={activeDoc.content}
                      onChange={(e) => updateActiveDocContent(e.target.value)}
                      placeholder="Start typing your study notes, formulas, or journal entries here (Markdown supported)..."
                      className={`w-full h-full min-h-[440px] bg-slate-950/90 border border-slate-800 rounded-2xl p-5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500 font-mono leading-relaxed resize-y shadow-inner ${viewMode === "edit" ? "col-span-2" : ""}`}
                    />
                  )}

                  {/* Rendered Live Markdown Preview */}
                  {(viewMode === "preview" || viewMode === "split") && (
                    <div 
                      ref={docPreviewContainerRef}
                      id="rendered-doc-preview-container"
                      className={`w-full h-full min-h-[440px] bg-[#0B0F19] border border-slate-800/80 rounded-2xl p-5 overflow-y-auto max-h-[580px] shadow-inner ${viewMode === "preview" ? "col-span-2" : ""}`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> Rendered Markdown Live Preview
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">FlowTrack Pro</span>
                      </div>
                      <MarkdownPreview content={activeDoc.content} />
                    </div>
                  )}
                </div>

                {/* Document Stats Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-4">
                    <span>Words: <strong className="text-purple-400">{wordCount}</strong></span>
                    <span>Characters: <strong className="text-purple-400">{charCount}</strong></span>
                  </div>
                  <span className="text-[11px] text-slate-500">Auto-saved live</span>
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-600" />
                <p className="mt-2 text-sm">Select or create a document to start editing</p>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
