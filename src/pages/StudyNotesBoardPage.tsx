import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { Download, Trash, Plus } from "lucide-react";
import html2canvas from "html2canvas";

interface StickyNote {
  id: string;
  text: string;
  color: string;      
  textColor: string;  
  font: string;       
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

  const boardRef = useRef<HTMLDivElement | null>(null);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      text: noteText.trim(),
      color: newNoteBg,
      textColor: newNoteTextColor,
      font: newNoteFont,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject: noteSubject.trim() || "General Study"
    };

    const updated = [newNote, ...stickyNotes];
    setStickyNotes(updated);
    localStorage.setItem("workspace_sticky_notes", JSON.stringify(updated));

    setNoteText("");
    setNoteSubject("");
  };

  const handleDeleteNote = (id: string) => {
    const updated = stickyNotes.filter(n => n.id !== id);
    setStickyNotes(updated);
    localStorage.setItem("workspace_sticky_notes", JSON.stringify(updated));
  };

  const exportBoardAsPNG = async () => {
    if (!boardRef.current) return;
    try {
      const canvas = await html2canvas(boardRef.current, { backgroundColor: "#090d16", scale: 2 });
      const link = document.createElement("a");
      link.download = `flowtrack-notes-board-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export PNG failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      <Panel className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">📝 Study Notes Board (Kanban)</h2>
            <p className="mt-1 text-sm text-slate-400">Organize your OCR notes & study sticky cards with Hindi font support and PNG export.</p>
          </div>
          {stickyNotes.length > 0 && (
            <button
              onClick={exportBoardAsPNG}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/30 transition-all"
            >
              <Download className="w-4 h-4" /> Export Board PNG
            </button>
          )}
        </div>

        <form onSubmit={handleAddNote} className="space-y-4 pt-4 border-t border-white/10">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Write your study note or formula..."
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={newNoteBg} onChange={e => setNewNoteBg(e.target.value)} className="bg-slate-900 border border-white/10 rounded-xl text-xs text-white p-2.5">
              {NOTE_BACKGROUNDS.map(b => <option key={b.name} value={b.class}>{b.name} Card</option>)}
            </select>
            <select value={newNoteTextColor} onChange={e => setNewNoteTextColor(e.target.value)} className="bg-slate-900 border border-white/10 rounded-xl text-xs text-white p-2.5">
              {NOTE_TEXT_COLORS.map(t => <option key={t.name} value={t.class}>{t.name} Text</option>)}
            </select>
            <select value={newNoteFont} onChange={e => setNewNoteFont(e.target.value)} className="bg-slate-900 border border-white/10 rounded-xl text-xs text-white p-2.5">
              {NOTE_FONTS.map(f => <option key={f.name} value={f.class}>{f.name}</option>)}
            </select>
            <input
              value={noteSubject}
              onChange={e => setNoteSubject(e.target.value)}
              placeholder="Subject / Chapter"
              className="bg-slate-900 border border-white/10 rounded-xl text-xs text-white px-3 py-2.5"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold text-sm shadow-lg hover:from-cyan-600 hover:to-indigo-600 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Sticky Note Card
          </button>
        </form>
      </Panel>

      <div ref={boardRef} className="p-4 rounded-3xl bg-slate-950/40 border border-white/5 min-h-[400px]">
        {stickyNotes.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm">
            No sticky notes on the board yet. Add notes above or save from Study Workspace!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stickyNotes.map(note => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-5 rounded-2xl border backdrop-blur-xl relative flex flex-col justify-between shadow-xl min-h-[180px] ${note.color}`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-cyan-300">
                    {note.subject}
                  </span>
                  <span className="text-[10px] text-slate-400">{note.date} {note.time}</span>
                </div>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${note.textColor} ${note.font}`}>
                  {note.text}
                </p>
                <div className="flex justify-end mt-4 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
