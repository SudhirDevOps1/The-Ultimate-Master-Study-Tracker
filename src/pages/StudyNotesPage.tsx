import { PDFStudyReader } from "@/components/common/PDFStudyReader";
import { motion } from "framer-motion";

export function StudyNotesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      className="space-y-6"
    >
      <div className="rounded-3xl bg-slate-900/40 p-6 border border-white/5 shadow-2xl backdrop-blur-xl">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          📖 Study <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Workspace</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
          Open textbook PDFs or Images to perform local WebAssembly Tesseract OCR. Convert text layers, format with custom styles, listen with Speech synthesis, and export beautiful sticky notes easily.
        </p>
      </div>

      <PDFStudyReader />
    </motion.div>
  );
}
