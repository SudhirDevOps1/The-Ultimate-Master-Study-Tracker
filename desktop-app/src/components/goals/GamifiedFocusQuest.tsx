import { useState } from "react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Swords, Trophy, Star, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function GamifiedFocusQuest() {
  const level = useAppStore((state: AppState) => state.level);
  const totalXP = useAppStore((state: AppState) => state.totalXP);
  
  const [bossHp, setBossHp] = useState(100);
  const [bossMaxHp] = useState(100);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [questClaimed, setQuestClaimed] = useState(false);

  const calculatedDamage = Math.max(10, Math.floor(totalXP / 150));

  const handleAttack = () => {
    if (bossHp <= 0) return;
    const nextHp = Math.max(0, bossHp - calculatedDamage);
    setBossHp(nextHp);
    if (nextHp <= 0) {
      setBossDefeated(true);
    }
  };

  return (
    <Panel className="space-y-4 border-l-4 border-purple-500 bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/10">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-purple-400 animate-pulse" />
          <h3 className="text-lg font-bold text-white">Daily Focus Quest</h3>
        </div>
        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Level {level} Focus
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-5">
        <div className="flex-1 space-y-3 w-full">
          <div>
            <h4 className="text-sm font-bold text-white">👾 Defeat Distraction Boss</h4>
            <p className="text-xs text-slate-400 mt-0.5">Your study XP determines your quest attack damage power.</p>
          </div>

          {/* HP Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>HP Status</span>
              <span>{bossHp} / {bossMaxHp} HP</span>
            </div>
            <div className="w-full h-3.5 bg-slate-950 rounded-full border border-white/10 overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-red-600 via-purple-600 to-indigo-500 transition-all duration-300"
                style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-widest drop-shadow">
                {bossDefeated ? "Defeated!" : "Boss Shield Active"}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Your Quest Damage:</span>
            <span className="text-cyan-400 font-bold">{calculatedDamage} DMG</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-w-[120px]">
          <AnimatePresence mode="wait">
            {!bossDefeated ? (
              <motion.button
                key="attack"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAttack}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-4 text-center text-white shadow-lg border border-purple-400/25 transition-transform"
              >
                <Swords className="w-6 h-6" />
                <span className="text-xs font-bold uppercase tracking-wider">Slash!</span>
              </motion.button>
            ) : (
              <motion.button
                key="claim"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={questClaimed}
                onClick={() => setQuestClaimed(true)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl p-4 text-center text-slate-950 font-bold border transition-transform ${
                  questClaimed 
                    ? "bg-slate-800 border-white/5 text-slate-500 pointer-events-none" 
                    : "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300/30"
                }`}
              >
                <Trophy className="w-6 h-6" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {questClaimed ? "Claimed" : "Get Reward"}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Panel>
  );
}
