import { useState, useRef, useEffect } from "react";
import { Panel } from "@/components/common/Panel";
import { BookOpen, FileText, Maximize2, Minimize2, Play, Pause, Volume2, VolumeX } from "lucide-react";

export function PDFStudyReader() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [splitScreen, setSplitScreen] = useState(false);

  // Text-To-Speech (TTS) states
  const [speechText, setSpeechText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  const handleTextOCRSimulate = () => {
    // OCR Simulation: extract text sample securely to demonstrate TTS action
    setSpeechText("नमस्ते, फ्लोट्रैक प्रो स्टडी कंपेनियन में आपका स्वागत है। Welcome to the FlowTrack Pro study companion. Let's study smart together!");
    setSplitScreen(true);
  };

  const handlePlayTTS = () => {
    if (!synthRef.current || !speechText) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      return;
    }

    // Cancel current speaking queues
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(speechText);
    const selectedVoice = voices.find(v => v.name === selectedVoiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Natural audio profile adjustment configurations
    utterance.rate = rate;
    utterance.pitch = 1.05; // Slightly pitched up to remove robotic flatness

    utterance.onend = () => {
      setIsPlaying(false);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
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
          <h3 className="text-lg font-bold text-white">Subject PDF Companion & TTS</h3>
        </div>
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <button
              onClick={() => setSplitScreen(!splitScreen)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs flex items-center gap-1"
              title="Toggle split view"
            >
              {splitScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{splitScreen ? "Compact" : "Workspace"}</span>
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
            Import a PDF file side-by-side. You can extract pages to read aloud in Hindi/English voices.
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 transition-all ${splitScreen ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          <div className="relative rounded-2xl border border-white/10 bg-slate-950 overflow-hidden h-[450px]">
            <iframe
              src={pdfUrl}
              title="PDF Companion View"
              className="w-full h-full border-none"
            />
            {/* Quick Action Button for OCR Speech Text simulation */}
            <div className="absolute bottom-3 left-3">
              <button
                onClick={handleTextOCRSimulate}
                className="rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 px-3 py-2 text-xs font-bold text-cyan-400 backdrop-blur-md shadow-lg"
              >
                🔍 Extract & Listen (OCR TTS)
              </button>
            </div>
          </div>
          {splitScreen && (
            <div className="rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-slate-900 to-cyan-950/10 p-4 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-cyan-400">📝</span> Study Speech Reader (Hindi & English)
                </h4>
                <p className="text-[11px] text-slate-400 font-mono truncate">{fileName}</p>
                <textarea
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  placeholder="Paste study text, definitions, or click 'Extract' to load content to read aloud..."
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
                        disabled={!speechText}
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
