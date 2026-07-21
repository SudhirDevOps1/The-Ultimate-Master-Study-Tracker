import { useState, useRef } from "react";
import { Panel } from "@/components/common/Panel";
import { BookOpen, FileText, Play, Pause, Image as ImageIcon } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  { name: "Sky", class: "bg-sky-500/15 border-sky-400/35" },
  { name: "Purple", class: "bg-purple-500/15 border-purple-400/35" },
  { name: "Rose", class: "bg-rose-500/15 border-rose-400/35" },
  { name: "Amber", class: "bg-amber-500/15 border-amber-400/35" },
  { name: "Indigo", class: "bg-indigo-500/15 border-indigo-400/35" }
];

const NOTE_FONTS = [
  { name: "Poppins (Default)", class: "font-sans" },
  { name: "Rozha One (Hindi Display)", class: "font-serif" },
  { name: "Yatra One (Devanagari Bold)", class: "font-mono" },
  { name: "Kurale (Elegant Hindi)", class: "font-serif" }
];

export function PDFStudyReader() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  
  const [noteSubject, setNoteSubject] = useState<string>("");
  const [selectedBg, setSelectedBg] = useState<string>(NOTE_BACKGROUNDS[0].class);
  const [selectedFont, setSelectedFont] = useState<string>(NOTE_FONTS[0].class);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    if (file.type === "application/pdf") {
      setFileType("pdf");
      try {
        const loadingTask = pdfjsLib.getDocument(url as any);
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        renderPdfPage(pdf, 1);
      } catch (err) {
        console.error("Error loading PDF:", err);
      }
    } else if (file.type.startsWith("image/")) {
      setFileType("image");
      setPdfDocument(null);
      setTotalPages(1);
      setCurrentPage(1);
    }
  };

  const renderPdfPage = async (pdf: any, pageNum: number) => {
    if (!pdf || !canvasRef.current) return;
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && pdfDocument) {
      const p = currentPage - 1;
      setCurrentPage(p);
      renderPdfPage(pdfDocument, p);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && pdfDocument) {
      const p = currentPage + 1;
      setCurrentPage(p);
      renderPdfPage(pdfDocument, p);
    }
  };

  const runTesseractOCR = async () => {
    setIsOcrLoading(true);
    setExtractedText("");
    try {
      const worker = await createWorker("eng+hin");
      let source: HTMLCanvasElement | HTMLImageElement | null = null;
      if (fileType === "pdf" && canvasRef.current) {
        source = canvasRef.current;
      } else if (fileType === "image" && imageRef.current) {
        source = imageRef.current;
      }

      if (source) {
        const ret = await worker.recognize(source);
        setExtractedText(ret.data.text);
      }
      await worker.terminate();
    } catch (err) {
      console.error("OCR Scanning failed:", err);
      setExtractedText("Failed to extract text. Ensure image/PDF page is clear.");
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleToggleSpeech = () => {
    if (!extractedText.trim()) return;
    if ("speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(extractedText);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSaveToStickyNotes = () => {
    if (!extractedText.trim()) return;
    const existing: StickyNote[] = JSON.parse(localStorage.getItem("workspace_sticky_notes") || "[]");
    const now = new Date();
    const newNote: StickyNote = {
      id: `ocr-note-${Date.now()}`,
      text: extractedText.trim(),
      color: selectedBg,
      textColor: "text-white",
      font: selectedFont,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject: noteSubject.trim() || fileName || "OCR Study Extract"
    };

    localStorage.setItem("workspace_sticky_notes", JSON.stringify([newNote, ...existing]));
    alert("✅ Note saved to Sticky Notes Kanban Board (/notes-board)!");
  };

  return (
    <Panel className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400" /> PDF & Image WASM OCR Reader
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Read study PDFs offline, extract text with WebAssembly Tesseract OCR (Hindi + English), & listen via TTS.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="application/pdf,image/*"
            id="file-study-input"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="file-study-input"
            className="cursor-pointer px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-xs shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Load PDF / Image
          </label>
        </div>
      </div>

      {fileUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/10">
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-white/10 text-xs">
              <span className="font-semibold text-white truncate max-w-[200px]">{fileName}</span>
              {fileType === "pdf" && (
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevPage} disabled={currentPage <= 1} className="px-2 py-1 bg-slate-800 rounded disabled:opacity-40 text-white font-bold">
                    &lt;
                  </button>
                  <span className="text-slate-300">Page {currentPage} of {totalPages}</span>
                  <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="px-2 py-1 bg-slate-800 rounded disabled:opacity-40 text-white font-bold">
                    &gt;
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-center bg-slate-950/80 p-4 rounded-2xl border border-white/10 min-h-[400px] overflow-auto">
              {fileType === "pdf" ? (
                <canvas ref={canvasRef} className="max-w-full rounded-xl shadow-2xl" />
              ) : (
                <img ref={imageRef} src={fileUrl} alt="Study Asset" className="max-w-full rounded-xl object-contain" />
              )}
            </div>

            <button
              onClick={runTesseractOCR}
              disabled={isOcrLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isOcrLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Scanning Text with WASM Tesseract...</span>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" /> Scan Text via WASM OCR (Hindi + Eng)
                </>
              )}
            </button>
          </div>

          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" /> Extracted Text Workspace
                </h3>
                {extractedText && (
                  <button
                    onClick={handleToggleSpeech}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition-colors"
                  >
                    {isSpeaking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isSpeaking ? "Pause Voice" : "Read Aloud (TTS)"}</span>
                  </button>
                )}
              </div>
              <textarea
                value={extractedText}
                onChange={e => setExtractedText(e.target.value)}
                placeholder="Extracted OCR text will appear here. You can also type or edit notes directly."
                rows={12}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs font-sans text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {extractedText && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-900/40 border border-white/5">
                <h4 className="text-xs font-semibold text-slate-300">Save to Sticky Notes Board</h4>
                <div className="grid grid-cols-2 gap-2">
                  <select value={selectedBg} onChange={e => setSelectedBg(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl text-xs text-white p-2">
                    {NOTE_BACKGROUNDS.map(b => <option key={b.name} value={b.class}>{b.name} Theme</option>)}
                  </select>
                  <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl text-xs text-white p-2">
                    {NOTE_FONTS.map(f => <option key={f.name} value={f.class}>{f.name}</option>)}
                  </select>
                </div>
                <input
                  type="text"
                  value={noteSubject}
                  onChange={e => setNoteSubject(e.target.value)}
                  placeholder="Subject / Chapter Name"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl text-xs text-white px-3 py-2"
                />
                <button
                  onClick={handleSaveToStickyNotes}
                  className="w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-all"
                >
                  📝 Push to Notes Board
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
