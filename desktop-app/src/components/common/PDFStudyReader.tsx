import { useState, useRef, useEffect, useCallback } from "react";
import { Panel } from "@/components/common/Panel";
import {
  BookOpen, FileText, Maximize2, Minimize2, Play, Pause, VolumeX, Eye,
  Image as ImageIcon, Download, Trash, Bold, Highlighter,
  ZoomIn, ZoomOut, RotateCw, RefreshCw, Copy, Check, FileDown, Sparkles,
  Layers, ArrowLeft, ArrowRight, Languages, AlertCircle, X, Loader2
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createWorker } from "tesseract.js";
import html2canvas from "html2canvas";
import { type StickyNote, NOTE_BACKGROUNDS, NOTE_TEXT_COLORS, NOTE_FONTS } from "@/types/notes";
import { sanitizeSafeUrl, isSafeStudyFile } from "@/utils/security";
import { cleanExtractedText, preprocessCanvasForOcr } from "@/utils/ocrEngine";

// Robust PDF.js worker resolution
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "4.4.168"}/build/pdf.worker.min.mjs`;
  }
}

const OCR_LANGUAGES = [
  { code: "eng+hin", label: "English + Hindi (Mixed)" },
  { code: "eng", label: "English (eng)" },
  { code: "hin", label: "Hindi (hin)" },
  { code: "spa", label: "Spanish (spa)" },
  { code: "fra", label: "French (fra)" },
  { code: "deu", label: "German (deu)" }
];

export function PDFStudyReader() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [extractingText, setExtractingText] = useState(false);
  const [isBatchExtracting, setIsBatchExtracting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, active: false });
  const [splitScreen, setSplitScreen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("eng+hin");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Text-To-Speech (TTS) states
  const [speechText, setSpeechText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  // Sticky Notes States
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => {
    try {
      const saved = localStorage.getItem("workspace_sticky_notes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newNoteBg, setNewNoteBg] = useState(NOTE_BACKGROUNDS[0].class);
  const [newNoteTextColor, setNewNoteTextColor] = useState(NOTE_TEXT_COLORS[5].class); // Default: White text
  const [newNoteFont, setNewNoteFont] = useState(NOTE_FONTS[0].class);
  const [noteSubject, setNoteSubject] = useState("");
  const [noteIsBold, setNoteIsBold] = useState(false);
  const [noteIsHighlighted, setNoteIsHighlighted] = useState(false);

  // Edit State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const notesContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const cancelBatchRef = useRef(false);

  // Inject Google Fonts dynamic styles for Hindi Fonts rendering support
  useEffect(() => {
    const linkId = "flowtrack-study-reader-google-fonts";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.href = "https://fonts.googleapis.com/css2?family=Kurale&family=Poppins:wght@400;700&family=Rozha+One&family=Yatra+One&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("workspace_sticky_notes", JSON.stringify(stickyNotes));
    } catch {}
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

  // Render current PDF page directly to HTML5 Canvas
  const renderCurrentPdfPage = useCallback(async () => {
    if (!pdfDocument || !pdfCanvasRef.current) return;
    try {
      setIsRendering(true);
      setErrorMsg(null);
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale, rotation });
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, viewport.width, viewport.height);

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      const renderTask = page.render({
        canvasContext: context,
        viewport
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      setIsRendering(false);
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("PDF page render error:", err);
      }
      setIsRendering(false);
    }
  }, [pdfDocument, currentPage, scale, rotation]);

  useEffect(() => {
    if (fileType === "pdf" && pdfDocument) {
      void renderCurrentPdfPage();
    }
  }, [fileType, pdfDocument, currentPage, scale, rotation, renderCurrentPdfPage]);

  // File loading and processing
  const handleProcessFile = async (file: File) => {
    if (!file || !isSafeStudyFile(file)) {
      setErrorMsg("Please select a valid study document (PDF or Image file).");
      return;
    }
    setFileName(file.name);
    const url = sanitizeSafeUrl(URL.createObjectURL(file));
    setFileUrl(url);
    setSplitScreen(true);
    setSpeechText("");
    setErrorMsg(null);

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setFileType("pdf");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setPageInput("1");
      } catch (err: any) {
        console.error("Failed to load PDF document:", err);
        setErrorMsg(`Failed to load PDF: ${err?.message || "Invalid or encrypted PDF file"}`);
      }
    } else {
      setFileType("image");
      setPdfDocument(null);
      setTotalPages(1);
      setCurrentPage(1);
      setPageInput("1");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleProcessFile(file);
    }
  };

  // Reconstruct digital text from PDF page preserving layout and paragraphs
  const extractDigitalPageText = async (page: any): Promise<string> => {
    try {
      const textContent = await page.getTextContent({ normalizeWhitespace: true });
      if (!textContent.items || textContent.items.length === 0) return "";

      let result = "";
      let lastY: number | null = null;
      let lastX: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item.str && !item.hasEOL) continue;
        const currentY = item.transform ? item.transform[5] : null;
        const currentX = item.transform ? item.transform[4] : null;

        if (lastY !== null && currentY !== null) {
          const deltaY = Math.abs(currentY - lastY);
          if (deltaY > 12) {
            result += "\n\n";
          } else if (deltaY > 4) {
            result += "\n";
          } else if (lastX !== null && currentX !== null && (currentX - lastX) > 5 && !result.endsWith(" ")) {
            result += " ";
          }
        }

        result += item.str;
        if (item.hasEOL && !result.endsWith("\n")) {
          result += "\n";
        }

        lastY = currentY;
        lastX = currentX ? currentX + (item.width || 0) : null;
      }

      return result.trim();
    } catch (err) {
      console.warn("Digital text extraction failed:", err);
      return "";
    }
  };

  // Run Tesseract OCR on a canvas or image source
  const extractOcrFromSource = async (source: HTMLCanvasElement | string, lang: string): Promise<string> => {
    const worker = await createWorker(lang);
    try {
      const ret = await worker.recognize(source);
      return ret.data.text || "";
    } finally {
      await worker.terminate();
    }
  };

  // Render a PDF page onto an offscreen canvas and run preprocessed OCR
  const extractOcrFromPdfPage = async (page: any, lang: string): Promise<string> => {
    const viewport = page.getViewport({ scale: 2.0 });
    const offscreen = document.createElement("canvas");
    offscreen.width = viewport.width;
    offscreen.height = viewport.height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const preprocessed = preprocessCanvasForOcr(offscreen);
    return await extractOcrFromSource(preprocessed, lang);
  };

  // Single page extract
  const handleExtractCurrentPage = async (forceOcr = false) => {
    setExtractingText(true);
    setErrorMsg(null);
    try {
      if (fileType === "pdf" && pdfDocument) {
        const page = await pdfDocument.getPage(currentPage);
        let text = "";
        if (!forceOcr) {
          text = await extractDigitalPageText(page);
        }
        if (!text || text.length < 25) {
          text = await extractOcrFromPdfPage(page, selectedLanguage);
        }
        setSpeechText(text ? cleanExtractedText(text) : "[No text detected on this page]");
      } else if (fileType === "image" && fileUrl) {
        const text = await extractOcrFromSource(fileUrl, selectedLanguage);
        setSpeechText(text ? cleanExtractedText(text) : "[No text detected in image]");
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorMsg(`Extraction failed: ${err?.message || "Unknown error"}`);
    } finally {
      setExtractingText(false);
    }
  };

  // Batch extract entire document
  const handleExtractAllPages = async () => {
    if (fileType !== "pdf" || !pdfDocument) return;
    setIsBatchExtracting(true);
    setBatchProgress({ current: 0, total: totalPages, active: true });
    cancelBatchRef.current = false;
    setErrorMsg(null);

    let aggregated = "";
    try {
      for (let p = 1; p <= totalPages; p++) {
        if (cancelBatchRef.current) break;
        setBatchProgress({ current: p, total: totalPages, active: true });

        const page = await pdfDocument.getPage(p);
        let pageText = await extractDigitalPageText(page);
        if (!pageText || pageText.length < 25) {
          pageText = await extractOcrFromPdfPage(page, selectedLanguage);
        }
        pageText = cleanExtractedText(pageText);

        aggregated += `\n\n## 📄 Page ${p} of ${totalPages}\n\n` + (pageText || "*(No text detected)*");
        setSpeechText(aggregated.trim());
      }
    } catch (err: any) {
      console.error("Batch extraction error:", err);
      setErrorMsg(`Batch extraction halted: ${err?.message || "Error"}`);
    } finally {
      setIsBatchExtracting(false);
      setBatchProgress({ current: 0, total: 0, active: false });
    }
  };

  const handleCancelBatch = () => {
    cancelBatchRef.current = true;
    setIsBatchExtracting(false);
    setBatchProgress({ current: 0, total: 0, active: false });
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || !pdfDocument) return;
    setCurrentPage(nextPage);
    setPageInput(String(nextPage));
  };

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const parsed = parseInt(pageInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
        handlePageChange(parsed);
      } else {
        setPageInput(String(currentPage));
      }
    }
  };

  // Text cleaning & power tools
  const handleCleanText = () => {
    if (!speechText) return;
    setSpeechText(cleanExtractedText(speechText));
  };

  const handleCopyText = async () => {
    if (!speechText) return;
    try {
      await navigator.clipboard.writeText(speechText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy failed", err);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!speechText) return;
    const cleanTitle = fileName ? fileName.replace(/\.[^/.]+$/, "") : "study-notes";
    const blob = new Blob([speechText], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.download = `${cleanTitle}-notes.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadText = () => {
    if (!speechText) return;
    const cleanTitle = fileName ? fileName.replace(/\.[^/.]+$/, "") : "extracted-text";
    const blob = new Blob([speechText], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.download = `${cleanTitle}.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleSendToFlashcards = () => {
    if (!speechText.trim()) return;
    localStorage.setItem("flowtrack_temp_flashcard_input", speechText);
    window.location.hash = "/flashcards";
  };

  // Word & Reading statistics
  const wordCount = speechText.trim() ? speechText.trim().split(/\s+/).length : 0;
  const charCount = speechText.length;
  const estimatedReadingMins = Math.max(1, Math.ceil(wordCount / 200));

  // Text-To-Speech
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

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

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
      color: newNoteBg,
      textColor: newNoteTextColor,
      font: newNoteFont,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      subject: noteSubject.trim() || "General Study",
      isBold: noteIsBold,
      isHighlighted: noteIsHighlighted
    };
    setStickyNotes([newNote, ...stickyNotes]);
    setNoteSubject("");
    setNoteIsBold(false);
    setNoteIsHighlighted(false);
  };

  const handleSaveEditNote = (id: string) => {
    setStickyNotes(stickyNotes.map(n => n.id === id ? { ...n, text: editText } : n));
    setEditingNoteId(null);
  };

  const handleDeleteNote = (id: string) => {
    setStickyNotes(stickyNotes.filter(n => n.id !== id));
  };

  const handleDownloadNotesAsPNG = async () => {
    if (!notesContainerRef.current) return;
    try {
      const canvas = await html2canvas(notesContainerRef.current, {
        backgroundColor: "#0b0f19",
        scale: 3,
        useCORS: true,
        allowTaint: true
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
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Smart Document OCR & Study Extractor</h3>
          {fileName && (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-xs text-cyan-300 font-mono truncate max-w-[220px]">
              {fileName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {fileUrl && (
            <button
              onClick={() => setSplitScreen(!splitScreen)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs flex items-center gap-1.5 transition-colors"
            >
              {splitScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{splitScreen ? "Compact View" : "Split Reader"}</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Import Document (PDF / Image)</span>
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

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container or Drop Zone */}
      {!fileUrl ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) void handleProcessFile(dropped);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all ${
            isDragging
              ? "bg-cyan-500/10 border-cyan-400 scale-[1.01]"
              : "bg-white/[0.01] border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.02]"
          }`}
        >
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-white/5 mb-3">
            <FileText className="w-10 h-10 text-cyan-400" />
          </div>
          <p className="text-sm font-bold text-white">Drop your Study PDF or Textbook Image here</p>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
            Directly renders interactive PDF pages without browser sandbox blocks. Extracts native digital text layers and automatically runs local Tesseract OCR on scanned documents in English or Hindi.
          </p>
          <span className="mt-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-cyan-300 font-medium">
            Supported: .pdf, .png, .jpg, .jpeg, .webp
          </span>
        </div>
      ) : (
        <div className={`grid gap-4 transition-all ${splitScreen ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* Document Viewer Frame */}
          <div className="relative rounded-2xl border border-white/10 bg-slate-950 overflow-hidden flex flex-col justify-between h-[640px] shadow-2xl">
            {/* Top Toolbar */}
            <div className="bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-3 py-2 flex items-center justify-between gap-2 z-10">
              {/* Zoom & Rotate Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setScale(s => Math.min(2.5, +(s + 0.15).toFixed(2)))}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(s => Math.max(0.5, +(s - 0.15).toFixed(2)))}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setScale(1.2); setRotation(0); }}
                  className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[10px] font-mono"
                  title="Reset Zoom & Rotation"
                >
                  Reset
                </button>
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-cyan-400"
                >
                  {OCR_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document Canvas Display */}
            <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4 relative pretty-scrollbar">
              {isRendering && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs shadow-lg">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering page...</span>
                  </div>
                </div>
              )}

              {fileType === "pdf" ? (
                <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 bg-white">
                  <canvas ref={pdfCanvasRef} className="block max-w-none" />
                </div>
              ) : (
                <div className="flex items-center justify-center overflow-auto max-h-full max-w-full">
                  <img
                    src={sanitizeSafeUrl(fileUrl)}
                    alt="Imported Source"
                    style={{
                      transform: `scale(${scale}) rotate(${rotation}deg)`,
                      transformOrigin: "center center",
                      transition: "transform 0.15s ease-out"
                    }}
                    className="max-h-[500px] max-w-full object-contain rounded-lg shadow-2xl"
                  />
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="bg-slate-900 border-t border-white/10 p-3 flex flex-wrap items-center justify-between gap-3">
              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                {fileType === "pdf" ? (
                  <>
                    <button
                      disabled={currentPage <= 1 || extractingText || isBatchExtracting}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
                      title="Previous Page"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <span>Page</span>
                      <input
                        type="text"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onKeyDown={handlePageInputSubmit}
                        onBlur={() => setPageInput(String(currentPage))}
                        className="w-10 text-center bg-slate-950 border border-white/10 rounded px-1 py-0.5 text-xs text-cyan-300 font-mono focus:border-cyan-400 outline-none"
                      />
                      <span className="text-slate-500">/ {totalPages}</span>
                    </div>

                    <button
                      disabled={currentPage >= totalPages || extractingText || isBatchExtracting}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
                      title="Next Page"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Single Image Source</span>
                  </span>
                )}
              </div>

              {/* Extraction Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  disabled={extractingText || isBatchExtracting}
                  onClick={() => void handleExtractCurrentPage(false)}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500 text-slate-950 px-3 py-1.5 text-xs font-bold hover:bg-cyan-400 active:scale-95 transition-all disabled:opacity-50 shadow-md"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{extractingText ? "Extracting..." : "Extract Page Text"}</span>
                </button>

                {fileType === "pdf" && (
                  <button
                    disabled={extractingText || isBatchExtracting}
                    onClick={() => void handleExtractAllPages()}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 shadow-md"
                    title="Extract all pages in this document sequentially"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Extract All Pages</span>
                  </button>
                )}

                <button
                  disabled={extractingText || isBatchExtracting}
                  onClick={() => void handleExtractCurrentPage(true)}
                  className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-white/10 disabled:opacity-40"
                  title="Force re-scan using Tesseract OCR on current canvas"
                >
                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                  <span>Force OCR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Extracted Text & Study Workspace */}
          {splitScreen && (
            <div className="rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-slate-900 to-cyan-950/20 p-4 space-y-4 flex flex-col justify-start relative h-[640px] overflow-y-auto pretty-scrollbar shadow-2xl">
              {/* Batch extraction modal overlay */}
              {isBatchExtracting && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-sm font-bold text-white">Batch Document Extraction in Progress...</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Processing Page {batchProgress.current} of {batchProgress.total}
                    </p>
                  </div>
                  <div className="w-64 h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
                      style={{ width: `${Math.round((batchProgress.current / Math.max(1, batchProgress.total)) * 100)}%` }}
                    />
                  </div>
                  <button
                    onClick={handleCancelBatch}
                    className="mt-2 px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 hover:bg-rose-500/30"
                  >
                    Cancel Batch Extraction
                  </button>
                </div>
              )}

              {/* Single extract overlay */}
              {extractingText && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-white">Extracting Document Text...</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Reconstructing paragraphs and running local OCR in {selectedLanguage}.
                  </p>
                </div>
              )}

              {/* Study Action Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="text-cyan-400">📝</span> Extracted Study Notes
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCleanText}
                      disabled={!speechText}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-40 flex items-center gap-1 transition-colors"
                      title="Clean OCR line-breaks, hyphens and extra whitespace"
                    >
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>Clean Text</span>
                    </button>
                    <button
                      onClick={handleCopyText}
                      disabled={!speechText}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                    <button
                      onClick={handleDownloadMarkdown}
                      disabled={!speechText}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1 transition-colors"
                      title="Download as Markdown file"
                    >
                      <FileDown className="w-3 h-3 text-indigo-400" />
                      <span>.MD</span>
                    </button>
                    <button
                      onClick={handleDownloadText}
                      disabled={!speechText}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1 transition-colors"
                      title="Download as Plain Text file"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span>.TXT</span>
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  placeholder="Extracted document text will appear here. You can also paste notes directly..."
                  className="w-full h-36 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none font-mono leading-relaxed pretty-scrollbar"
                />

                {/* Word & Reading stats */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>{wordCount} words · {charCount} chars</span>
                  <span>~{estimatedReadingMins} min read</span>
                </div>
              </div>

              {/* TTS Audio Controls */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Speech Voice Model (Hindi / English)
                    </label>
                    {isPlaying && (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-3 bg-cyan-400 animate-pulse rounded" />
                        <span className="w-1.5 h-4 bg-indigo-400 animate-pulse delay-75 rounded" />
                        <span className="w-1.5 h-2 bg-emerald-400 animate-pulse delay-150 rounded" />
                        <span className="text-[10px] text-cyan-400 font-mono ml-1">Speaking...</span>
                      </div>
                    )}
                  </div>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
                  >
                    {voices.map(v => (
                      <option key={v.name} value={v.name}>
                        {v.name.length > 30 ? v.name.substring(0, 30) + "..." : v.name} ({v.lang})
                      </option>
                    ))}
                    {voices.length === 0 && <option>Default System Voice</option>}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      <span>Playback Speed</span>
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

                  <div className="flex items-center justify-end gap-2 pt-1 sm:pt-0">
                    <button
                      onClick={handlePlayTTS}
                      disabled={!speechText || extractingText}
                      className={`flex h-8 px-3.5 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 ${
                        isPlaying 
                          ? "bg-amber-400 text-slate-950 hover:bg-amber-300" 
                          : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? "Pause" : "Listen"}</span>
                    </button>
                    <button
                      onClick={handleSendToFlashcards}
                      disabled={!speechText || extractingText}
                      className="flex h-8 px-3 items-center justify-center gap-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-400 transition-transform active:scale-95 disabled:opacity-40 shadow-sm"
                      title="Send text to Flashcards Generator"
                    >
                      <span>🧠 Flashcards</span>
                    </button>
                    <button
                      onClick={handleStopTTS}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                      title="Mute / Stop Speech"
                    >
                      <VolumeX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky Note Designer Studio */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-3">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Background:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {NOTE_BACKGROUNDS.map(bg => (
                        <button
                          key={bg.name}
                          title={bg.name}
                          onClick={() => setNewNoteBg(bg.class)}
                          className={`w-4 h-4 rounded border ${bg.class.split(" ")[1]} ${
                            newNoteBg === bg.class ? "ring-2 ring-white scale-110" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Text Color:</span>
                    <select
                      value={newNoteTextColor}
                      onChange={(e) => setNewNoteTextColor(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
                    >
                      {NOTE_TEXT_COLORS.map(tc => (
                        <option key={tc.class} value={tc.class}>{tc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Font Model:</span>
                    <select
                      value={newNoteFont}
                      onChange={(e) => setNewNoteFont(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
                    >
                      {NOTE_FONTS.map(f => (
                        <option key={f.class} value={f.class}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Format Toolbar */}
                <div className="flex items-center gap-2 border-t border-white/5 pt-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Text Options:</span>
                  <button
                    onClick={() => setNoteIsBold(!noteIsBold)}
                    className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 border ${
                      noteIsBold ? "bg-cyan-500/25 border-cyan-400/40 text-cyan-300" : "bg-white/5 border-white/10 text-slate-400"
                    }`}
                  >
                    <Bold className="w-3 h-3" />
                    <span>Bold</span>
                  </button>
                  <button
                    onClick={() => setNoteIsHighlighted(!noteIsHighlighted)}
                    className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 border ${
                      noteIsHighlighted ? "bg-yellow-500/25 border-yellow-400/40 text-yellow-300" : "bg-white/5 border-white/10 text-slate-400"
                    }`}
                  >
                    <Highlighter className="w-3 h-3" />
                    <span>Highlight</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Subject Tag (e.g. Neuroscience, Physics, Hindi Vyakaran)"
                    value={noteSubject}
                    onChange={(e) => setNoteSubject(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={handleAddStickyNote}
                    disabled={!speechText.trim()}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform whitespace-nowrap shadow-md"
                  >
                    📌 Create Note
                  </button>
                </div>
              </div>

              {/* Sticky Notes List & Export as PNG */}
              {stickyNotes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>📑 Saved Sticky Notes ({stickyNotes.length})</span>
                    </span>
                    <button
                      onClick={handleDownloadNotesAsPNG}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:bg-white/10 flex items-center gap-1"
                      title="Download notes sheet as High-Res PNG"
                    >
                      <Download className="w-3 h-3 text-cyan-400" />
                      <span>Download PNG</span>
                    </button>
                  </div>

                  <div ref={notesContainerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pretty-scrollbar p-1">
                    {stickyNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 rounded-xl border relative group flex flex-col justify-between ${note.color} ${note.font}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">{note.subject}</span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-300 transition-opacity"
                            title="Delete note"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>

                        {editingNoteId === note.id ? (
                          <div className="space-y-1">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full h-16 bg-slate-950/80 rounded p-1 text-xs text-white border border-white/20 resize-none"
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleSaveEditNote(note.id)}
                                className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-[10px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            onClick={() => { setEditingNoteId(note.id); setEditText(note.text); }}
                            className={`text-xs ${note.textColor} ${note.isBold ? "font-bold" : ""} ${
                              note.isHighlighted ? "bg-yellow-400/20 px-1 rounded" : ""
                            } line-clamp-3 cursor-pointer`}
                            title="Click to edit"
                          >
                            {note.text}
                          </p>
                        )}

                        <div className="mt-2 pt-1 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400">
                          <span>{note.date}</span>
                          <span>{note.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
