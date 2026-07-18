import { useState, useRef, useEffect } from "react";
import { Panel } from "@/components/common/Panel";
import { BookOpen, FileText, Maximize2, Minimize2, Play, Pause, VolumeX, Eye } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function PDFStudyReader() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        // Filter English and Hindi voices
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
      setPdfUrl(url);
      setSplitScreen(true);

      // Load PDF via PDF.js to extract text layers
      try {
        const fileReader = new FileReader();
        fileReader.onload = async (ev) => {
          const typedarray = new Uint8Array(ev.target?.result as ArrayBuffer);
          const loadingTask = pdfjsLib.getDocument({ data: typedarray });
          const pdf = await loadingTask.promise;
          setPdfDocument(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          void extractPageText(pdf, 1);
        };
        fileReader.readAsArrayBuffer(file);
      } catch (err) {
        console.error("Error loading PDF document parser", err);
      }
    }
  };

  const extractPageText = async (pdf: any, pageNum: number) => {
    if (!pdf) return;
    setExtractingText(true);
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str);
      const text = textItems.join(" ");
      setSpeechText(text || `[No readable text found on Page ${pageNum}]`);
    } catch (err) {
      console.error("Failed to parse page text layers", err);
      setSpeechText(`[Failed to parse text layers on Page ${pageNum}]`);
    }
    setExtractingText(false);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || !pdfDocument) return;
    setCurrentPage(nextPage);
    void extractPageText(pdfDocument, nextPage);
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
    utterance.pitch = 1.05; // Slightly pitched up to remove robotic flatness

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

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white font-sans">Subject PDF Companion & TTS</h3>
        </div>
        <div className="flex items-center gap-2">
          {pdfUrl && (
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
            Import PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {!pdfUrl ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white/[0.01] border border-white/5 border-dashed text-center">
          <FileText className="w-10 h-10 text-slate-500 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Document Loaded</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Import a PDF file to extract the text layers of any selected page and listen to it in English/Hindi.
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 transition-all ${splitScreen ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* PDF Viewer Frame */}
          <div className="relative rounded-2xl border border-white/10 bg-slate-950 overflow-hidden h-[450px] flex flex-col justify-between">
            <iframe
              src={pdfUrl}
              title="PDF Companion View"
              className="w-full flex-1 border-none"
            />
            {/* Real-time PDF Navigation & Text Extraction Trigger */}
            <div className="bg-slate-900 border-t border-white/10 p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
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
              </div>
              <button
                disabled={extractingText}
                onClick={() => void extractPageText(pdfDocument, currentPage)}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500 text-slate-950 px-3 py-1.5 text-xs font-bold hover:bg-cyan-400 disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{extractingText ? "Extracting..." : "Extract Text Layer"}</span>
              </button>
            </div>
          </div>

          {/* TTS Workspace (Side-by-side) */}
          {splitScreen && (
            <div className="rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-slate-900 to-cyan-950/10 p-4 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-cyan-400">📝</span> Study Text Reader (Hindi & English)
                </h4>
                <p className="text-[11px] text-slate-400 font-mono truncate">{fileName}</p>
                <textarea
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  placeholder="Paste study text or navigate pages in PDF companion to extract text layer..."
                  className="w-full h-40 mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none font-sans leading-relaxed"
                />

                {/* TTS Controls Panel */}
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
                          {v.name} ({v.lang}) {v.name.includes("Google") ? "🌟 High Quality" : ""}
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
                        title={isPlaying ? "Pause Speech" : "Play Speech"}
                      >
                        {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5" />}
                      </button>
                      <button
                        onClick={handleStopTTS}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                        title="Stop Speech"
                      >
                        <VolumeX className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-white/5 pt-2">
                <span>Natural Human Tone Filter applied</span>
                <span className="text-[10px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold uppercase">TTS Ready</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
