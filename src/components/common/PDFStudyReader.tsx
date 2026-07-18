import { useState, useRef } from "react";
import { Panel } from "@/components/common/Panel";
import { BookOpen, FileText, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

export function PDFStudyReader() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [splitScreen, setSplitScreen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Subject PDF Companion</h3>
        </div>
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <button
              onClick={() => setSplitScreen(!splitScreen)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs flex items-center gap-1"
              title="Toggle split view"
            >
              {splitScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{splitScreen ? "Compact" : "Split View"}</span>
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:scale-105 transition-transform"
          >
            Import Document / PDF
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
            Import a PDF file (such as textbooks or notes) to view it side-by-side inside FlowTrack while studying.
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 transition-all ${splitScreen ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          <div className="rounded-2xl border border-white/10 bg-slate-950 overflow-hidden h-[450px]">
            <iframe
              src={pdfUrl}
              title="PDF Companion View"
              className="w-full h-full border-none"
            />
          </div>
          {splitScreen && (
            <div className="rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-slate-900 to-cyan-950/10 p-4 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-cyan-400">📝</span> Study Workspace Notes
                </h4>
                <p className="text-[11px] text-slate-400 font-mono truncate">{fileName}</p>
                <textarea
                  placeholder="Jot down key points, equations, or notes while reading this PDF. Focus mode will sync timers automatically..."
                  className="w-full h-64 mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none font-sans leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-white/5 pt-2">
                <span>Auto-saved locally</span>
                <span className="text-[10px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold uppercase">Ready</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
