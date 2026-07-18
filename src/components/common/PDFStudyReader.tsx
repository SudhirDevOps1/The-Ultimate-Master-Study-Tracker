import { useState, useRef, useEffect } from "react";
import { Panel } from "@/components/common/Panel";
import { BookOpen, FileText, Maximize2, Minimize2, Play, Pause, VolumeX, Eye, Image as ImageIcon, Download, Trash, Palette } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import html2canvas from "html2canvas";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface StickyNote {
  id: string;
  text: string;
  color: string;
  font: string;
  date: string;
  time: string;
}

const NOTE_COLORS = [
  "bg-amber-400/25 border-amber-400/50 text-amber-200",
  "bg-emerald-400/25 border-emerald-400/50 text-emerald-200",
  "bg-cyan-400/25 border-cyan-400/50 text-cyan-200",
  "bg-purple-400/25 border-purple-400/50 text-purple-200",
  "bg-pink-400/25 border-pink-400/50 text-pink-200"
];

const NOTE_FONTS = [
  "font-sans",
  "font-serif",
  "font-mono",
  "font-bold"
];

export function PDFStudyReader() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [extractingText, setExtractingText] = useState(false);
  const [splitScreen, setSplitScreen] = useState(false);

  // Text-To-Speech (TTS) states
  const [speechText, setSpeechText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  // Sticky Notes States
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem("workspace_sticky_notes");
    return saved ? JSON.parse(saved) : [];
  });
  const [newNoteColor, setNewNoteColor] = useState(NOTE_COLORS[0]);
  const [newNoteFont, setNewNoteFont] = useState(NOTE_FONTS[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const notesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("workspace_sticky_notes", JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        const filtered = availableVoices.filter(v => v.lang.startsWith("en") || v.lang.startsWith("hi"));
        setVoices(filtered);
        if (filtered.length > 0 && !selectedVoiceName) {
          setSelectedVoiceName(filtered[0].name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceName]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setSplitScreen(true);
      setSpeechText("");

      if (file.type === "application/pdf") {
        setFileType("pdf");
        try {
          const fileReader = new FileReader();
          fileReader.onload = async (ev) => {
            const typedarray = new Uint8Array(ev.target?.result as ArrayBuffer);
            const loadingTask = pdfjsLib.getDocument({ data: typedarray });
            const pdf = await loadingTask.promise;
            setPdfDocument(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
            void extractPdfPageText(pdf, 1);
          };
          fileReader.readAsArrayBuffer(file);
        } catch (err) {
          console.error("Error loading PDF", err);
        }
      } else {
        setFileType("image");
        setTotalPages(1);
        setCurrentPage(1);
        void extractImageText(url);
      }
    }
  };

  const extractImageText = async (imgUrl: string) => {
    setExtractingText(true);
    try {
      const worker = await createWorker("eng+hin");
      const ret = await worker.recognize(imgUrl);
      setSpeechText(ret.data.text || "[No text detected in image]");
      await worker.terminate();
    } catch (err) {
      console.error("OCR Image parse failed", err);
      setSpeechText("[Failed to extract text from image]");
    }
    setExtractingText(false);
  };

  const extractPdfPageText = async (pdf: any, pageNum: number) => {
    if (!pdf) return;
    setExtractingText(true);
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str).join(" ").trim();
      
      if (textItems.length > 10) {
        setSpeechText(textItems);
        setExtractingText(false);
        return;
      }

      // Fallback to Canvas Render OCR if scanned
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const context = canvas.getContext("2d");
      
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const imgDataUrl = canvas.toDataURL("image/png");
        const worker = await createWorker("eng+hin");
        const ret = await worker.recognize(imgDataUrl);
        setSpeechText(ret.data.text || "[No text detected on scanned page]");
        await worker.terminate();
      }
    } catch (err) {
      console.error("Scanned page OCR parser failed", err);
      setSpeechText(`[Failed to parse page ${pageNum}]`);
    }
    setExtractingText(false);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || !pdfDocument) return;
    setCurrentPage(nextPage);
    void extractPdfPageText(pdfDocument, nextPage);
  };

  const handlePlayTTS = () => {
    if (!synthRef.current || !speechText) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      return;
    }

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(speechText);
    const selectedVoice = voices.find(v => v.name === selectedVoiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = rate;
    utterance.pitch = 1.05;

    utterance.onend = () => {
      setIsPlaying(false);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
    };

    setIsPlaying(true);
    synthRef.current.speak(utterance);
  };

  const handleStopTTS = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  };

  // Sticky Notes Methods
  const handleAddStickyNote = () => {
    if (!speechText.trim()) return;
    const now = new Date();
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      text: speechText,
      color: newNoteColor,
      font: newNoteFont,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setStickyNotes([newNote, ...stickyNotes]);
  };

  const handleDeleteNote = (id: string) => {
    setStickyNotes(stickyNotes.filter(n => n.id !== id));
  };

  const handleDownloadNotesAsPNG = async () => {
    if (!notesContainerRef.current) return;
    try {
      const canvas = await html2canvas(notesContainerRef.current, {
        backgroundColor: "#020617",
        scale: 2
      });
      const link = document.createElement("a");
      link.download = `FlowTrack-StickyNotes-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to render notes to PNG", err);
    }
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Subject Document OCR & TTS</h3>
        </div>
        <div className="flex items-center gap-2">
          {fileUrl && (
            <button
              onClick={() => setSplitScreen(!splitScreen)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs flex items-center gap-1"
            >
              {splitScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{splitScreen ? "Hide Reader" : "Open Reader"}</span>
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:scale-105 transition-transform"
          >
            Import Document (PDF/Image)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!fileUrl ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white/[0.01] border border-white/5 border-dashed text-center">
          <FileText className="w-10 h-10 text-slate-500 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Document Loaded</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Import a PDF textbook or Image. Tesseract OCR will read scanned pages in English or Hindi.
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 transition-all ${splitScreen ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* File Preview Frame */}
          <div className="relative rounded-2xl border border-white/10 bg-slate-950 overflow-hidden h-[450px] flex flex-col justify-between">
            {fileType === "pdf" ? (
              <iframe
                src={fileUrl}
                title="PDF View"
                className="w-full flex-1 border-none"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-900 overflow-hidden">
                <img src={fileUrl} alt="Imported Source" className="max-h-[380px] max-w-full object-contain" />
              </div>
            )}
            
            {/* Real-time Navigation & Tesseract OCR triggers */}
            <div className="bg-slate-900 border-t border-white/10 p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {fileType === "pdf" && (
                  <>
                    <button
                      disabled={currentPage <= 1 || extractingText}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-white font-mono">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages || extractingText}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </>
                )}
                {fileType === "image" && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> Single Image File
                  </span>
                )}
              </div>
              <button
                disabled={extractingText}
                onClick={() => {
                  if (fileType === "pdf") {
                    void extractPdfPageText(pdfDocument, currentPage);
                  } else {
                    void extractImageText(fileUrl);
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500 text-slate-950 px-3 py-1.5 text-xs font-bold hover:bg-cyan-400 disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{extractingText ? "Performing OCR..." : "Extract Text Layer"}</span>
              </button>
            </div>
          </div>

          {/* TTS & Sticky Notes Workspace */}
          {splitScreen && (
            <div className="rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-slate-900 to-cyan-950/10 p-4 space-y-4 flex flex-col justify-between relative">
              {extractingText && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                  <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm font-bold text-white">Extracting Scanned Text...</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Please wait. FlowTrack is running local Tesseract OCR to read text layers from this page.
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-cyan-400">📝</span> Study Text Reader (Hindi & English)
                </h4>
                <textarea
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  placeholder="Paste study notes or extract text layers from textbooks above..."
                  className="w-full h-32 mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none font-sans leading-relaxed"
                />

                <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Voice Model</label>
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => setSelectedVoiceName(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white"
                    >
                      {voices.map(v => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                      {voices.length === 0 && <option>Default System Voice</option>}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                        <span>Speed rate</span>
                        <span>{rate}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={rate}
                        onChange={(e) => setRate(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handlePlayTTS}
                        disabled={!speechText || extractingText}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold transition-transform active:scale-95 ${
                          isPlaying 
                            ? "bg-amber-400 text-slate-950 hover:bg-amber-300" 
                            : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5" />}
                      </button>
                      <button
                        onClick={handleStopTTS}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                      >
                        <VolumeX className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sticky Note Designer Panel */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Style:</span>
                    <div className="flex gap-1">
                      {NOTE_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewNoteColor(c)}
                          className={`w-4 h-4 rounded-full border ${c.split(" ")[1]} ${
                            newNoteColor === c ? "ring-2 ring-white scale-110" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <select
                    value={newNoteFont}
                    onChange={(e) => setNewNoteFont(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white"
                  >
                    <option value="font-sans">Sans</option>
                    <option value="font-serif">Serif</option>
                    <option value="font-mono">Mono</option>
                    <option value="font-bold">Bold</option>
                  </select>

                  <button
                    onClick={handleAddStickyNote}
                    disabled={!speechText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-xs font-bold disabled:opacity-40"
                  >
                    📌 Create Sticky Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky Notes Display Board with PNG download triggers */}
      {stickyNotes.length > 0 && (
        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Study Sticky Notes Board</span>
            </h4>
            <button
              onClick={handleDownloadNotesAsPNG}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Board as PNG</span>
            </button>
          </div>

          <div 
            ref={notesContainerRef} 
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4 rounded-2xl bg-slate-950 border border-white/5"
          >
            {stickyNotes.map(note => (
              <div 
                key={note.id} 
                className={`relative rounded-xl border p-4 space-y-3 flex flex-col justify-between shadow-lg transition-transform hover:-translate-y-0.5 ${note.color}`}
              >
                <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${note.font}`}>
                  {note.text}
                </div>
                <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{note.date} • {note.time}</span>
                  <button 
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-rose-400/70 hover:text-rose-400 p-1"
                    title="Delete Note"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
