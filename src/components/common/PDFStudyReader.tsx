import { useState, useRef } from "react";
import { Panel } from "@/components/common/Panel";
import { BookOpen, FileText, Maximize2, Minimize2, Play, Pause, VolumeX, Eye, Image as ImageIcon, Download, Trash, Palette, Edit3, Bold, Highlighter } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import html2canvas from "html2canvas";

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

export function PDFStudyReader() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [ocrText, setOcrText] = useState("");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem("workspace_sticky_notes");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedBg, setSelectedBg] = useState(NOTE_BACKGROUNDS[0].class);
  const [selectedTextColor, setSelectedTextColor] = useState(NOTE_TEXT_COLORS[5].class);
  const [selectedFont, setSelectedFont] = useState(NOTE_FONTS[0].class);
  const [noteSubject, setNoteSubject] = useState("");
  const [isBold, setIsBold] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    if (file.type === "application/pdf") {
      setFileType("pdf");
      try {
        const loadingTask = pdfjsLib.getDocument(url);
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
    if (currentPage > 1) {
      const p = currentPage - 1;
      setCurrentPage(p);
      if (pdfDocument) renderPdfPage(pdfDocument, p);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const p = currentPage + 1;
      setCurrentPage(p);
      if (pdfDocument) renderPdfPage(pdfDocument, p);
    }
  };

  const runTesseractOcr = async () => {
    setIsOcrProcessing(true);
    setOcrProgress(0);
    setOcrText("");

    try {
      let imageSource: any = null;
      if (fileType === "pdf" && canvasRef.current) {
        imageSource = canvasRef.current.toDataURL("image/png");
      } else if (fileType === "image" && imageRef.current) {
        imageSource = imageRef.current;
      }

      if (!imageSource) {
        setOcrText("No source file or image found to extract text.");
        setIsOcrProcessing(false);
        return;
      }

      const worker = await createWorker("eng");
      const ret = await worker.recognize(imageSource);
      setOcrText(ret.data.text);
      await worker.terminate();
    } catch (err) {
      console.error("OCR Error:", err);
      setOcrText("Failed to process local OCR. Please check image resolution.");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleSpeak = () => {
    if (!ocrText) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(ocrText);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleAddStickyNote = () => {
    if (!ocrText.trim()) return;

    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      text: ocrText,
      color: selectedBg,
      textColor: selectedTextColor,
      font: selectedFont,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject: noteSubject.trim() || "General Note",
      isBold,
      isHighlighted
    };

    const updated = [newNote, ...stickyNotes];
    setStickyNotes(updated);
    localStorage.setItem("workspace_sticky_notes", JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Local Textbook & Image OCR Study Reader
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload textbook PDFs or images to run local WebAssembly Tesseract OCR, synthesize speech, and generate custom notes.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium shadow-lg hover:shadow-cyan-500/20 transition-all text-sm"
          >
            <ImageIcon className="w-4 h-4" /> Open File (PDF/Image)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </Panel>

      {fileUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel className="flex flex-col h-[650px] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-sm font-semibold text-cyan-300 truncate max-w-[200px]">{fileName}</span>
              {fileType === "pdf" && (
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevPage} disabled={currentPage <= 1} className="px-3 py-1 rounded bg-white/10 text-white text-xs disabled:opacity-30">Prev</button>
                  <span className="text-xs text-slate-400">{currentPage} / {totalPages}</span>
                  <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="px-3 py-1 rounded bg-white/10 text-white text-xs disabled:opacity-30">Next</button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/40 rounded-xl mt-3">
              {fileType === "pdf" ? (
                <canvas ref={canvasRef} className="max-w-full rounded shadow-xl" />
              ) : (
                <img ref={imageRef} src={fileUrl} alt="Study File" className="max-h-full rounded object-contain shadow-xl" />
              )}
            </div>
          </Panel>

          <Panel className="flex flex-col h-[650px] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Extracted Text Layer (OCR)
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={runTesseractOcr}
                  disabled={isOcrProcessing}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                >
                  {isOcrProcessing ? "Extracting..." : "⚡ Run Local OCR"}
                </button>
                <button
                  onClick={handleSpeak}
                  disabled={!ocrText}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {isSpeaking ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isSpeaking ? "Pause" : "Listen (TTS)"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-950/60 rounded-xl mt-3 font-sans text-sm text-slate-200 whitespace-pre-wrap border border-white/5">
              {ocrText || (
                <span className="text-slate-500 italic">
                  Click "Run Local OCR" to extract text from the open PDF page or image using local Tesseract WASM.
                </span>
              )}
            </div>

            {ocrText && (
              <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <select value={selectedBg} onChange={e => setSelectedBg(e.target.value)} className="bg-slate-900 border border-white/10 rounded-lg text-xs text-white p-1.5">
                    {NOTE_BACKGROUNDS.map(b => <option key={b.name} value={b.class}>{b.name} Bg</option>)}
                  </select>
                  <select value={selectedTextColor} onChange={e => setSelectedTextColor(e.target.value)} className="bg-slate-900 border border-white/10 rounded-lg text-xs text-white p-1.5">
                    {NOTE_TEXT_COLORS.map(t => <option key={t.name} value={t.class}>{t.name} Text</option>)}
                  </select>
                  <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="bg-slate-900 border border-white/10 rounded-lg text-xs text-white p-1.5">
                    {NOTE_FONTS.map(f => <option key={f.name} value={f.class}>{f.name}</option>)}
                  </select>
                  <input
                    value={noteSubject}
                    onChange={e => setNoteSubject(e.target.value)}
                    placeholder="Subject Tag"
                    className="bg-slate-900 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5"
                  />
                </div>
                <button
                  onClick={handleAddStickyNote}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium text-xs shadow-md hover:from-purple-600 hover:to-indigo-600 transition-all"
                >
                  📌 Save as Sticky Note on Board
                </button>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
