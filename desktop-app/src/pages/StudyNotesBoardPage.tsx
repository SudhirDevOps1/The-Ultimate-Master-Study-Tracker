import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { Palette, Download, Edit3, Trash, Plus, Search, Camera, FileText, Image as ImageIcon, Copy, Check, Type, Sparkles } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/components/common/Toast";

interface StickyNote {
  id: string;
  text: string;
  color: string;      // Background Color Class
  textColor: string;  // Custom Text Color Class
  font: string;       // Custom Font Class
  date: string;
  time: string;
  subject: string;
  isBold?: boolean;
  isHighlighted?: boolean;
  image?: string;     // Base64 / URL image attachment
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
  { name: "Rozha One (Hindi Stylised)", class: "font-[RozhaOne,serif]" },
  { name: "Poppins (Hindi Modern)", class: "font-[Poppins,sans-serif]" },
  { name: "Kurale (Hindi Classic)", class: "font-[Kurale,serif]" },
  { name: "Yatra One (Hindi Retro)", class: "font-[YatraOne,cursive]" }
];

export function StudyNotesBoardPage() {
  const [activeTab, setActiveTab] = useState<"board" | "notepad">("board");

  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => {
    try {
      const saved = localStorage.getItem("workspace_sticky_notes");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse workspace_sticky_notes from localStorage:", e);
      return [];
    }
  });

  // Notepad State
  const [notepadTitle, setNotepadTitle] = useState(() => localStorage.getItem("flowtrack_notepad_title") || "My Study Journal Notes");
  const [notepadContent, setNotepadContent] = useState(() => localStorage.getItem("flowtrack_notepad_content") || "");
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [copiedNotepad, setCopiedNotepad] = useState(false);

  // New Sticky Note State
  const [noteText, setNoteText] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [noteImage, setNoteImage] = useState<string | null>(null);
  const [newNoteBg, setNewNoteBg] = useState(NOTE_BACKGROUNDS[0].class);
  const [newNoteTextColor, setNewNoteTextColor] = useState(NOTE_TEXT_COLORS[5].class);
  const [newNoteFont, setNewNoteFont] = useState(NOTE_FONTS[0].class);
  const [noteIsBold, setNoteIsBold] = useState(false);
  const [noteIsHighlighted, setNoteIsHighlighted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { showToast } = useToast();

  // Edit states
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const notesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem("workspace_sticky_notes", JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  useEffect(() => {
    localStorage.setItem("flowtrack_notepad_title", notepadTitle);
    localStorage.setItem("flowtrack_notepad_content", notepadContent);
  }, [notepadTitle, notepadContent]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setNoteImage(ev.target?.result as string);
        showToast("🖼️ Image attached to note!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNote = () => {
    if (!noteText.trim() && !noteImage) return;
    const now = new Date();
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      text: noteText,
      color: newNoteBg,
      textColor: newNoteTextColor,
      font: newNoteFont,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject: noteSubject.trim() || "General Study",
      isBold: noteIsBold,
      isHighlighted: noteIsHighlighted,
      image: noteImage || undefined
    };
    setStickyNotes([newNote, ...stickyNotes]);
    setNoteText("");
    setNoteSubject("");
    setNoteImage(null);
    setNoteIsBold(false);
    setNoteIsHighlighted(false);
    showToast("📌 Sticky note added successfully!", "success");
  };

  const handleSaveEdit = (id: string) => {
    setStickyNotes(stickyNotes.map(n => n.id === id ? { ...n, text: editText } : n));
    setEditingNoteId(null);
    showToast("💾 Sticky note updated!", "success");
  };

  const handleDelete = (id: string) => {
    setStickyNotes(stickyNotes.filter(n => n.id !== id));
    showToast("🗑️ Note deleted from board.", "warning");
  };

  const handleDownloadSingleNoteAsPNG = async (note: StickyNote) => {
    const el = document.getElementById(`note-card-${note.id}`);
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#090d16",
        scale: 3,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        logging: false
      });
      const dataUrl = canvas.toDataURL("image/png");
      const defaultFilename = `FlowTrack-Note-${note.subject.replace(/\s+/g, "_")}-${new Date().getTime()}.png`;

      const link = document.createElement("a");
      link.download = defaultFilename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("📸 Single note exported as PNG image!", "success");
    } catch (err) {
      console.error("Failed to download note image", err);
      showToast("❌ Image download failed", "error");
    }
  };

  const handleDownloadAsPNG = async () => {
    if (!notesContainerRef.current) return;
    try {
      const canvas = await html2canvas(notesContainerRef.current, {
        backgroundColor: "#0b0f19",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        logging: false,
        onclone: (clonedDoc) => {
          const imgs = clonedDoc.querySelectorAll("img");
          imgs.forEach((img) => img.setAttribute("crossOrigin", "anonymous"));
        }
      });
      const dataUrl = canvas.toDataURL("image/png");
      const defaultFilename = `FlowTrack-StickyNotes-${new Date().toISOString().split("T")[0]}.png`;

      if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
        try {
          const invoker = (window as any).electron.ipcRenderer.invoke;
          if (invoker) {
            const res = await invoker("save-image-dialog", {
              base64Data: dataUrl,
              defaultFilename: defaultFilename
            });
            if (res && res.success) {
              showToast(`✅ Sticky Notes Board PNG saved to: ${res.path}`, "success");
              return;
            }
          }
        } catch (ipcErr) {
          console.warn("Electron native save failed, falling back to browser download", ipcErr);
        }
      }

      const link = document.createElement("a");
      link.download = defaultFilename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("📥 Sticky Notes Board downloaded as PNG image!", "success");
    } catch (err) {
      console.error("Failed to render notes", err);
      showToast("❌ Failed to export image", "error");
    }
  };

  // Notepad Exporters
  const handleDownloadNotepadTxt = () => {
    const blob = new Blob([`${notepadTitle}\n${"=".repeat(notepadTitle.length)}\n\n${notepadContent}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${notepadTitle.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("📄 Notepad saved as .txt file!", "success");
  };

  const handleCopyNotepad = () => {
    navigator.clipboard.writeText(`${notepadTitle}\n\n${notepadContent}`);
    setCopiedNotepad(true);
    setTimeout(() => setCopiedNotepad(false), 2000);
    showToast("📋 Notepad copied to clipboard!", "info");
  };

  // Filter notes based on query match
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return stickyNotes;
    const q = searchQuery.toLowerCase();
    return stickyNotes.filter(
      n => n.text.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q)
    );
  }, [stickyNotes, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-3xl bg-slate-900/40 p-6 border border-white/5 shadow-2xl backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            📝 Study <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Notes Workspace</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
            Sticky Notes Canvas Board + Real Notepad Editor with 1-click PNG & Text Image Export.
          </p>
        </div>

        {/* View Tabs Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("board")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "board"
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Sticky Board</span>
          </button>
          <button
            onClick={() => setActiveTab("notepad")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "notepad"
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Real Notepad</span>
          </button>
        </div>
      </div>

      {/* TAB 1: STICKY NOTES BOARD */}
      {activeTab === "board" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Note Creator Form Panel */}
          <Panel className="space-y-4 lg:col-span-1 h-fit">
            <h3 className="text-base font-bold text-white flex items-center justify-between border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5">
                <span>✏️</span> Create Sticky Note
              </span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </h3>

            <div className="space-y-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type or paste note content here..."
                className="w-full h-32 rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-400 resize-none font-sans leading-relaxed"
              />

              {/* Image attachment preview */}
              {noteImage && (
                <div className="relative rounded-xl border border-purple-500/30 overflow-hidden bg-black/40 max-h-36">
                  <img src={noteImage} alt="Attachment" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNoteImage(null)}
                    className="absolute top-1 right-1 p-1 bg-rose-500/80 text-white rounded-full text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="space-y-3 p-3 rounded-xl bg-slate-950/60 border border-white/5">
                {/* Background Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Background Color</span>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_BACKGROUNDS.map(bg => (
                      <button
                        key={bg.name}
                        title={bg.name}
                        onClick={() => setNewNoteBg(bg.class)}
                        className={`w-5 h-5 rounded border ${bg.class.split(" ")[1]} ${
                          newNoteBg === bg.class ? "ring-2 ring-white scale-110" : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Text Color</span>
                    <select
                      value={newNoteTextColor}
                      onChange={(e) => setNewNoteTextColor(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                    >
                      {NOTE_TEXT_COLORS.map(tc => (
                        <option key={tc.class} value={tc.class}>{tc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Font Model</span>
                    <select
                      value={newNoteFont}
                      onChange={(e) => setNewNoteFont(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                    >
                      {NOTE_FONTS.map(f => (
                        <option key={f.class} value={f.class}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Formatting & Image Upload */}
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNoteIsBold(!noteIsBold)}
                      className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 border ${
                        noteIsBold ? "bg-purple-500/25 border-purple-400/40 text-purple-300 font-bold" : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      <span>B</span>
                    </button>
                    <button
                      onClick={() => setNoteIsHighlighted(!noteIsHighlighted)}
                      className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 border ${
                        noteIsHighlighted ? "bg-yellow-500/25 border-yellow-400/40 text-yellow-300 font-bold" : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      <span>Highlight</span>
                    </button>
                  </div>

                  {/* Attach Image Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                    title="Attach Image"
                  >
                    <ImageIcon className="w-3 h-3 text-cyan-400" />
                    <span>Image</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    placeholder="Subject (e.g. History)"
                    value={noteSubject}
                    onChange={(e) => setNoteSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() && !noteImage}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-lg shadow-purple-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Sticky Note</span>
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Board View Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-400" />
                <span>Canvas Board ({filteredNotes.length})</span>
              </h3>
              
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {stickyNotes.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notes / subjects..."
                      className="bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 w-44"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                )}

                {stickyNotes.length > 0 && (
                  <button
                    onClick={handleDownloadAsPNG}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs font-bold text-purple-300 hover:bg-purple-500/30 active:scale-95 transition-transform"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Entire Board PNG</span>
                  </button>
                )}
              </div>
            </div>

            {stickyNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-slate-900/10 border border-white/5 border-dashed text-center">
                <span className="text-3xl mb-2">📌</span>
                <p className="text-sm font-semibold text-slate-400">Notes Board is Empty</p>
                <p className="text-xs text-slate-500 mt-1">Create sticky notes on the left panel to populate your workspace board.</p>
              </div>
            ) : (
              <div 
                ref={notesContainerRef} 
                className="grid gap-4 sm:grid-cols-2 p-4 rounded-2xl bg-slate-950 border border-white/5 min-h-[420px]"
              >
                {filteredNotes.map(note => (
                  <div 
                    key={note.id} 
                    id={`note-card-${note.id}`}
                    className={`relative rounded-xl border p-4 space-y-3 flex flex-col justify-between shadow-lg transition-transform hover:-translate-y-0.5 ${note.color}`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-300">{note.subject}</span>
                        <button
                          onClick={() => handleDownloadSingleNoteAsPNG(note)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/30 text-[9px] text-slate-300 hover:text-white hover:bg-black/50 transition-colors"
                          title="Download Note Image PNG"
                        >
                          <Camera className="w-3 h-3 text-cyan-400" />
                          <span>PNG</span>
                        </button>
                      </div>

                      {note.image && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-h-44">
                          <img src={note.image} alt="Attachment" className="w-full h-full object-cover" />
                        </div>
                      )}
                      
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full h-24 bg-slate-900 border border-white/10 text-xs rounded p-2 text-white outline-none focus:border-purple-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(note.id)}
                              className="px-2 py-1 rounded bg-purple-500 text-white text-[10px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-2 py-1 rounded bg-white/5 text-slate-300 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`text-xs leading-relaxed whitespace-pre-wrap break-words py-1 ${note.textColor} ${note.font} ${
                          note.isBold ? "font-bold" : ""
                        } ${
                          note.isHighlighted ? "bg-yellow-500/20 px-1 py-0.5 rounded border border-yellow-500/25" : ""
                        }`}>
                          {note.text}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{note.date} • {note.time}</span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditText(note.text);
                          }}
                          className="text-slate-400 hover:text-purple-300 p-1"
                          title="Edit Note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(note.id)}
                          className="text-rose-400/70 hover:text-rose-400 p-1"
                          title="Delete Note"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REAL NOTEPAD EDITOR */}
      {activeTab === "notepad" && (
        <Panel className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📓</span>
              <input
                type="text"
                value={notepadTitle}
                onChange={(e) => setNotepadTitle(e.target.value)}
                className="bg-transparent text-lg font-bold text-white outline-none focus:border-b focus:border-purple-400 w-64 sm:w-80"
                placeholder="Notepad Title..."
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Font Size controls */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <Type className="w-3.5 h-3.5 text-slate-400 ml-1" />
                <button
                  onClick={() => setFontSize("sm")}
                  className={`px-2 py-0.5 rounded-lg ${fontSize === "sm" ? "bg-purple-500 text-white font-bold" : "text-slate-400"}`}
                >
                  S
                </button>
                <button
                  onClick={() => setFontSize("base")}
                  className={`px-2 py-0.5 rounded-lg ${fontSize === "base" ? "bg-purple-500 text-white font-bold" : "text-slate-400"}`}
                >
                  M
                </button>
                <button
                  onClick={() => setFontSize("lg")}
                  className={`px-2 py-0.5 rounded-lg ${fontSize === "lg" ? "bg-purple-500 text-white font-bold" : "text-slate-400"}`}
                >
                  L
                </button>
              </div>

              <button
                onClick={handleCopyNotepad}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 active:scale-95 transition-all"
              >
                {copiedNotepad ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedNotepad ? "Copied!" : "Copy"}</span>
              </button>

              <button
                onClick={handleDownloadNotepadTxt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .TXT</span>
              </button>
            </div>
          </div>

          {/* Lined Paper Style Real Notepad Textarea */}
          <div className="relative rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-inner">
            <textarea
              value={notepadContent}
              onChange={(e) => setNotepadContent(e.target.value)}
              placeholder="Write your detailed study notes, lecture summaries, or formulas here... (Auto-saved locally)"
              className={`w-full min-h-[460px] bg-transparent text-slate-100 placeholder-slate-600 outline-none resize-none font-mono leading-relaxed tracking-wide ${
                fontSize === "sm" ? "text-xs" : fontSize === "lg" ? "text-base" : "text-sm"
              }`}
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/5 font-mono">
              <span>Auto-saved to Local Storage</span>
              <span>{notepadContent.length} Characters • {notepadContent.split(/\s+/).filter(Boolean).length} Words</span>
            </div>
          </div>
        </Panel>
      )}
    </motion.div>
  );
}
