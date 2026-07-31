import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, Zap, MessageSquare, Shield, Smile } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface VirtualStudyCompanionProps {
  compact?: boolean;
}

const STUDY_QUOTES = [
  "Stay focused! Every minute counts towards mastery. ⚡",
  "You're doing amazing! Keep building momentum. 🔥",
  "Deep focus mode activated! Let's crush this session. 🎯",
  "Take a deep breath and conquer one task at a time. 🧠",
  "Small daily steps lead to massive long-term success! 🚀",
  "Your future self will thank you for today's effort! 🌟",
];

export function VirtualStudyCompanion({ compact = false }: VirtualStudyCompanionProps) {
  const level = useAppStore((state) => state.level);
  const totalXP = useAppStore((state) => state.totalXP);
  const rank = useAppStore((state) => state.rank);
  const timer = useAppStore((state) => state.timer);

  const isRunning = Boolean(timer.activeSessionId) && !timer.isPaused;
  const isPaused = Boolean(timer.activeSessionId) && timer.isPaused;

  const [dialogText, setDialogText] = useState<string | null>(null);
  const [mood, setMood] = useState<"idle" | "studying" | "paused" | "celebrating">("idle");

  useEffect(() => {
    if (isRunning) {
      setMood("studying");
    } else if (isPaused) {
      setMood("paused");
    } else {
      setMood("idle");
    }
  }, [isRunning, isPaused]);

  const handleCompanionClick = () => {
    const randomQuote = STUDY_QUOTES[Math.floor(Math.random() * STUDY_QUOTES.length)];
    setDialogText(randomQuote);
    setTimeout(() => setDialogText(null), 4500);
  };

  // Evolution tier title & avatar icon based on Level
  const getAvatarInfo = () => {
    if (level >= 15) {
      return { title: "Cosmic Phoenix", color: "from-amber-400 via-rose-500 to-purple-600", icon: "🐉" };
    }
    if (level >= 8) {
      return { title: "Grand Mage", color: "from-cyan-400 via-indigo-500 to-purple-500", icon: "🧙‍♂️" };
    }
    if (level >= 3) {
      return { title: "Scholar Owl", color: "from-teal-400 to-cyan-500", icon: "🦉" };
    }
    return { title: "Apprentice Dragon", color: "from-emerald-400 to-teal-500", icon: "🐲" };
  };

  const avatar = getAvatarInfo();

  if (compact) {
    return (
      <div className="relative inline-flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-inner cursor-pointer" onClick={handleCompanionClick}>
        <motion.div
          animate={{ y: isRunning ? [0, -3, 0] : 0, rotate: isRunning ? [0, 2, -2, 0] : 0 }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-2xl"
        >
          {avatar.icon}
        </motion.div>
        <div>
          <p className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
            <span>Aura</span>
            <span className="text-[9px] px-1 bg-cyan-500/20 text-cyan-300 rounded font-mono">Lvl {level}</span>
          </p>
          <p className="text-[9px] text-slate-400 capitalize">{mood === "studying" ? "Focused ⚡" : mood === "paused" ? "Paused ⏸️" : "Ready 💤"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-xl overflow-hidden">
      {/* Glow aura background */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${avatar.color} opacity-20 blur-2xl pointer-events-none`} />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            onClick={handleCompanionClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              y: isRunning ? [0, -6, 0] : [0, -2, 0],
              scale: isRunning ? [1, 1.05, 1] : 1,
            }}
            transition={{ repeat: Infinity, duration: isRunning ? 1.5 : 3 }}
            className="relative cursor-pointer text-4xl p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-lg flex items-center justify-center select-none"
            title="Click to talk to Aura!"
          >
            {avatar.icon}
            {isRunning && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
            )}
          </motion.div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Aura the Companion</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950">
                {avatar.title}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400 flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono text-cyan-300 font-medium">
                <Zap className="w-3 h-3 text-amber-400" /> {totalXP} XP
              </span>
              <span>•</span>
              <span className="text-slate-300 font-medium">{rank}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleCompanionClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-all active:scale-95"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span>Talk</span>
        </button>
      </div>

      {/* Speech bubble */}
      <AnimatePresence>
        {dialogText && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="mt-3 p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-xs text-cyan-200 shadow-md flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <p className="font-medium leading-relaxed">{dialogText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Companion Status Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-400" />
          <span>Companion Energy: <strong className="text-slate-200">{isRunning ? "100% (High Focus)" : "85% (Resting)"}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Level {level}</span>
        </div>
      </div>
    </div>
  );
}
