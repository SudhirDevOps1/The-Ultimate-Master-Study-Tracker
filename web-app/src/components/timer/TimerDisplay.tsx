import { motion } from "framer-motion";
import { formatSeconds } from "@/utils/time";

interface TimerDisplayProps {
  subject: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  strictMode?: boolean;
}

export function TimerDisplay({ subject, elapsedSeconds, remainingSeconds, progress, strictMode = false }: TimerDisplayProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Active Subject</p>
          <h3 className="mt-2 break-words text-2xl font-semibold text-white md:text-3xl">{subject}</h3>
        </div>
        <div className="soft-card rounded-2xl px-3 py-2 text-right">
          <p className="text-xs text-slate-400">Progress</p>
          <p className="text-lg font-semibold text-white">{Math.round(progress)}%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
        {strictMode
          ? "Strict mode counts only approved active study time and stops hidden/inactive overcounting."
          : "Standard mode uses system time for accurate tracking, even across inactive tabs and browser focus changes."}
      </div>

      <div className="grid gap-3 text-slate-100 md:grid-cols-2">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Elapsed</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatSeconds(elapsedSeconds)}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Remaining</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatSeconds(remainingSeconds)}</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Session completion</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300"
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.6 }}
          />
        </div>
      </div>
    </div>
  );
}
