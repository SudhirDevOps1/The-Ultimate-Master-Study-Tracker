import { motion } from "framer-motion";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";

export function LevelSystem() {
  const level = useAppStore((state: AppState) => state.level);
  const rank = useAppStore((state: AppState) => state.rank);
  const totalXP = useAppStore((state: AppState) => state.totalXP);
  const xpProgress = useAppStore((state: AppState) => state.xpProgress);
  const xpToNextLevel = useAppStore((state: AppState) => state.xpToNextLevel);

  return (
    <Panel className="relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 h-32 w-32 bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="flex items-center gap-6">
        {/* Level Hexagon / Badge */}
        <div className="relative flex items-center justify-center h-20 w-20">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl rotate-45 shadow-lg shadow-cyan-500/20"
          />
          <div className="relative text-center">
            <span className="block text-xs font-bold text-white/70 uppercase">Level</span>
            <span className="text-3xl font-black text-white">{level}</span>
          </div>
        </div>

        {/* Info & Progress */}
        <div className="flex-1 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <motion.h3 
                key={rank}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70"
              >
                {rank}
              </motion.h3>
              <p className="text-sm text-slate-400 font-medium">Keep going to reach the next rank</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-cyan-400">{totalXP} XP</span>
              <p className="text-xs text-slate-500">{xpToNextLevel} XP to level {level + 1}</p>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
            {/* Animated Fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            />
            
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </Panel>
  );
}
