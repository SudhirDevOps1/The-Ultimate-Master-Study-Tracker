import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { Palette, Download, Edit3, Trash, Plus } from "lucide-react";
import html2canvas from "html2canvas";

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
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem("workspace_sticky_notes");
    return saved ? JSON.parse(saved) : [];
  });

  const [noteText, setNoteText] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [newNoteBg, setNewNoteBg] = useState(NOTE_BACKGROUNDS[0].class);
  const [newNoteTextColor, setNewNoteTextColor] = useState(NOTE_TEXT_COLORS[5].class);
  const [newNoteFont, setNewNoteFont] = useState(NOTE_FONTS[0].class);
  const [noteIsBold, setNoteIsBold] = useState(false);
  const [noteIsHighlighted, setNoteIsHighlighted] = useState(false);

  // Edit states
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const notesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("workspace_sticky_notes", JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
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
      isHighlighted: noteIsHighlighted
    };
    setStickyNotes([newNote, ...stickyNotes]);
    setNoteText("");
    setNoteSubject("");
    setNoteIsBold(false);
    setNoteIsHighlighted(false);
  };

  const handleSaveEdit = (id: string) => {
    setStickyNotes(stickyNotes.map(n => n.id === id ? { ...n, text: editText } : n));
    setEditingNoteId(null);
  };

  const handleDelete = (id: string) => {
    setStickyNotes(stickyNotes.filter(n => n.id !== id));
  };

  const handleDownloadAsPNG = async () => {
    if (!notesContainerRef.current) return;
    try {
      const canvas = await html2canvas(notesContainerRef.current, {
        backgroundColor: "#0b0f19",
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement("a");
      link.download = `FlowTrack-StickyNotes-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to render notes", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      className="space-y-6"
    >
      <div className="rounded-3xl bg-slate-900/40 p-6 border border-white/5 shadow-2xl backdrop-blur-xl">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          📌 Study <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Sticky Notes Board</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
          Create, edit, and organize multiple colorful sticky notes locally. Customize colors, sizes, formatting options, and download your entire notes board as a styled PNG layout.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Note Creator Form Panel */}
        <Panel className="space-y-4 lg:col-span-1 h-fit">
          <h3 className="text-base font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <span>✏️</span> Create Sticky Note
          </h3>

          <div className="space-y-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type or paste note content here..."
              className="w-full h-32 rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-400 resize-none font-sans leading-relaxed"
            />

            <div className="space-y-3 p-3 rounded-xl bg-slate-950/60 border border-white/5">
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

              <div className="flex items-center gap-3 border-t border-white/5 pt-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Format</span>
                <button
                  onClick={() => setNoteIsBold(!noteIsBold)}
                  className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 border ${
                    noteIsBold ? "bg-purple-500/25 border-purple-400/40 text-purple-300" : "bg-white/5 border-white/10 text-slate-400"
                  }`}
                >
                  <span>B</span>
                </button>
                <button
                  onClick={() => setNoteIsHighlighted(!noteIsHighlighted)}
                  className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 border ${
                    noteIsHighlighted ? "bg-yellow-500/25 border-yellow-400/40 text-yellow-300" : "bg-white/5 border-white/10 text-slate-400"
                  }`}
                >
                  <span>Highlight</span>
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
                  disabled={!noteText.trim()}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Note</span>
                </button>
              </div>
            </div>
          </div>
        </Panel>

        {/* Board View Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Canvas Board</span>
            </h3>
            {stickyNotes.length > 0 && (
              <button
                onClick={handleDownloadAsPNG}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 active:scale-95 transition-transform"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Board as PNG</span>
              </button>
            )}
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
              {stickyNotes.map(note => (
                <div 
                  key={note.id} 
                  className={`relative rounded-xl border p-4 space-y-3 flex flex-col justify-between shadow-lg transition-transform hover:-translate-y-0.5 ${note.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-2">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-300">{note.subject}</span>
                    </div>
                    
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
    </motion.div>
  );
}
