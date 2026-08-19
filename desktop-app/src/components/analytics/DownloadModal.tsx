import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, AlertCircle, CheckCircle2, FileText, Database, Globe, Table } from "lucide-react";
import type { StudySession, Subject } from "@/types/models";
import { downloadReport, type DownloadFormat } from "@/utils/downloadManager";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StudySession[];
  subjects: Subject[];
}

type FormatOption = {
  id: DownloadFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
};

const formats: FormatOption[] = [
  {
    id: "csv",
    label: "CSV Spreadsheet",
    description: "Tabular data format compatible with Microsoft Excel, Numbers & Google Sheets",
    icon: <Table className="w-6 h-6 text-emerald-400" />,
    badge: ".csv",
  },
  {
    id: "json",
    label: "JSON Structured Data",
    description: "Complete raw JSON data format for developer backups and programmatic tools",
    icon: <Database className="w-6 h-6 text-amber-400" />,
    badge: ".json",
  },
  {
    id: "html",
    label: "HTML Offline Report",
    description: "Standalone interactive webpage document readable offline in any browser",
    icon: <Globe className="w-6 h-6 text-blue-400" />,
    badge: ".html",
  },
  {
    id: "pdf",
    label: "PDF Executive Transcript",
    description: "Printable high-resolution academic document with full metrics breakdown",
    icon: <FileText className="w-6 h-6 text-rose-400" />,
    badge: ".pdf",
  },
];

export function DownloadModal({ isOpen, onClose, sessions, subjects }: DownloadModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Ready to download");
  const [error, setError] = useState<string | null>(null);

  // Safe Close Handler
  const handleClose = () => {
    setIsLoading(false);
    setProgress(0);
    setError(null);
    setMessage("Ready to download");
    onClose();
  };

  // Keyboard Escape Handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleDownload = async (format: DownloadFormat) => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress(15);
      setMessage("Preparing data export...");

      await downloadReport(format, sessions, subjects, (progressData) => {
        setProgress(progressData.progress);
        setMessage(progressData.message);
      });

      setMessage("✅ Export downloaded successfully!");
      setProgress(100);
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Download failed";
      setError(errorMessage);
      setIsLoading(false);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Export Study Data & Reports</h2>
                  <p className="text-xs text-slate-400">Select your preferred export format</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Progress Section */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950/80 border border-blue-500/30 rounded-2xl p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-300">{message}</span>
                    <span className="font-mono font-bold text-blue-400">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                    />
                  </div>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Format Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formats.map((format) => (
                  <motion.button
                    key={format.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDownload(format.id)}
                    className="p-4 rounded-2xl border border-white/10 bg-slate-950/60 hover:bg-slate-800/80 hover:border-blue-500/40 transition-all text-left group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="p-2 rounded-xl bg-slate-900 border border-white/5 group-hover:border-blue-500/30 transition-colors">
                        {format.icon}
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300 font-bold">
                        {format.badge}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
                        {format.label}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {format.description}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Info Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 flex items-center justify-between">
                <span>🔒 100% Client-Side Export • No server uploads</span>
                <span className="text-[10px] font-bold text-slate-500">FlowTrack Pro Engine</span>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950/60 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/15 text-[10px] text-white">Esc</kbd> to exit
              </span>
              <button
                onClick={handleClose}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
