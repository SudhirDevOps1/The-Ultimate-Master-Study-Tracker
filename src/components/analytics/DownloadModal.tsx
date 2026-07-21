import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  icon: string;
  color: string;
};

const formats: FormatOption[] = [
  {
    id: "pdf",
    label: "PDF Report",
    description: "Professional print-ready report with charts and summary",
    icon: "📄",
    color: "red",
  },
  {
    id: "csv",
    label: "CSV Export",
    description: "Spreadsheet-compatible data for analysis in Excel",
    icon: "📊",
    color: "green",
  },
  {
    id: "html",
    label: "HTML Report",
    description: "Standalone HTML file for viewing in any browser",
    icon: "🌐",
    color: "blue",
  },
  {
    id: "json",
    label: "JSON Data",
    description: "Complete data backup in structured JSON format",
    icon: "💾",
    color: "amber",
  },
];

export function DownloadModal({ isOpen, onClose, sessions, subjects }: DownloadModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Ready to download");
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (format: DownloadFormat) => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      await downloadReport(format, sessions, subjects, (progressData) => {
        setProgress(progressData.progress);
        setMessage(progressData.message);
      });

      setMessage("✅ Download complete!");
      setTimeout(() => {
        onClose();
        setProgress(0);
        setMessage("Ready to download");
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Download failed";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50"
          >
            <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-2xl p-8 space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span>📥</span> Download Your Report
                </h2>
                <p className="text-slate-400 mt-2">Choose a format to download your study analytics</p>
              </div>

              {/* Progress Section */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-cyan-300">{message}</span>
                    <span className="text-sm font-bold text-cyan-400">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    />
                  </div>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
                >
                  <p className="text-sm text-red-300 flex items-center gap-2">
                    <span>⚠️</span> {error}
                  </p>
                </motion.div>
              )}

              {/* Format Options Grid */}
              <div className="grid grid-cols-2 gap-4">
                {formats.map((format) => (
                  <motion.button
                    key={format.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDownload(format.id)}
                    disabled={isLoading}
                    className={`p-4 rounded-xl border transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLoading
                        ? "bg-slate-800 border-white/5"
                        : "bg-slate-800/50 border-white/10 hover:border-white/20 hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-3xl mb-2">{format.icon}</div>
                    <div className="font-bold text-white text-sm">{format.label}</div>
                    <div className="text-xs text-slate-400 mt-1 group-hover:text-slate-300 transition-colors">
                      {format.description}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-blue-200 flex items-start gap-2">
                  <span className="text-lg mt-0.5">ℹ️</span>
                  <span>
                    All data is processed locally in your browser. Nothing is sent to external servers. Your privacy is protected.
                  </span>
                </p>
              </div>

              {/* Close Button */}
              <div className="flex gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
