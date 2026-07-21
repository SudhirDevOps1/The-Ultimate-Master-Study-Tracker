import { useEffect } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { useAppStore } from "@/store/useAppStore";

export function AchievementsPage() {
  const achievements = useAppStore((state) => state.achievements);
  const recalculateAchievements = useAppStore((state) => state.recalculateAchievements);
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    recalculateAchievements();
  }, [recalculateAchievements]);

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalProgress = achievements.reduce((sum, a) => sum + Math.min(100, (a.progress / a.maxProgress) * 100), 0);
  const overallProgress = Math.round(totalProgress / achievements.length);

  const getThemeGradient = () => {
    switch (theme) {
      case "ocean": return "from-sky-500 to-teal-400";
      case "forest": return "from-green-500 to-lime-400";
      case "sunset": return "from-orange-500 to-rose-500";
      case "galaxy": return "from-purple-500 to-pink-500";
      case "cyber": return "from-yellow-400 to-rose-500";
      default: return "from-indigo-500 to-cyan-500";
    }
  };

  const getRarity = (achievement: (typeof achievements)[0]) => {
    const ratio = achievement.progress / achievement.maxProgress;
    if (achievement.unlockedAt) return "unlocked";
    if (ratio >= 0.75) return "epic";
    if (ratio >= 0.5) return "rare";
    return "common";
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case "unlocked":
        return "border-yellow-400/50 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 shadow-yellow-500/20";
      case "epic":
        return "border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-pink-500/10";
      case "rare":
        return "border-blue-400/50 bg-gradient-to-br from-blue-500/20 to-cyan-500/10";
      default:
        return "border-white/10 bg-white/5";
    }
  };

  const categories = [
    { id: "streak", name: "🔥 Streak Master", desc: "Maintain study streaks", filter: "streak" },
    { id: "hours", name: "📚 Study Hours", desc: "Total time milestones", filter: "hours" },
    { id: "focus", name: "⏰ Focus Mode", desc: "Long study sessions", filter: "focused|night|early" },
    { id: "goals", name: "🎯 Goal Crusher", desc: "Hit daily goals", filter: "goal" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <Panel>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">🏆 Achievements</p>
            <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Your Badges & Progress</h2>
            <p className="mt-2 text-sm text-slate-400">
              Complete study goals to unlock achievements and track your journey
            </p>
          </div>
          <div className="flex gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={`rounded-2xl bg-gradient-to-br ${getThemeGradient()} p-[2px]`}
            >
              <div className="rounded-2xl bg-slate-900/90 px-5 py-3 text-center">
                <p className="text-3xl font-bold text-yellow-400">🏅 {unlockedCount}</p>
                <p className="text-xs text-slate-400">Unlocked</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-[2px]"
            >
              <div className="rounded-2xl bg-slate-900/90 px-5 py-3 text-center">
                <p className="text-3xl font-bold text-cyan-400">{achievements.length}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]"
            >
              <div className="rounded-2xl bg-slate-900/90 px-5 py-3 text-center">
                <p className="text-3xl font-bold text-emerald-400">{overallProgress}%</p>
                <p className="text-xs text-slate-400">Complete</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Overall Achievement Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-rose-500"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </Panel>

      {/* Categories Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat, i) => {
          const catAchievements = achievements.filter((a) => new RegExp(cat.filter).test(a.id));
          const unlocked = catAchievements.filter((a) => a.unlockedAt).length;
          const colors = ["from-orange-500 to-rose-500", "from-emerald-500 to-teal-500", "from-purple-500 to-pink-500", "from-cyan-500 to-blue-500"];
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className={`rounded-2xl bg-gradient-to-br ${colors[i]} p-[2px]`}
            >
              <div className="rounded-2xl bg-slate-900/90 p-4 text-center">
                <div className="text-3xl">{cat.name.split(" ")[0]}</div>
                <p className="mt-2 font-medium text-white">{cat.name.slice(3)}</p>
                <p className="text-xs text-slate-400">{cat.desc}</p>
                <p className="mt-2 text-lg font-bold text-white">
                  {unlocked}/{catAchievements.length}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Achievements Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {achievements.map((achievement, index) => {
          const rarity = getRarity(achievement);
          const progress = Math.min(100, (achievement.progress / achievement.maxProgress) * 100);

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className={`rounded-2xl border-2 p-4 shadow-lg transition-all ${getRarityStyles(rarity)}`}
            >
              <div className="flex items-start gap-3">
                <motion.div
                  animate={achievement.unlockedAt ? { 
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl ${
                    achievement.unlockedAt
                      ? "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/30"
                      : "bg-white/10"
                  }`}
                >
                  {achievement.unlockedAt ? achievement.icon : "🔒"}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{achievement.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{achievement.description}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-medium text-white">
                    {achievement.progress} / {achievement.maxProgress}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: achievement.unlockedAt 
                        ? `linear-gradient(90deg, ${achievement.color}, #fbbf24)` 
                        : "#475569",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: index * 0.03 }}
                  />
                </div>
              </div>

              {achievement.unlockedAt && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-1 text-xs text-yellow-400"
                >
                  <span>✨</span>
                  <span>Unlocked!</span>
                  <span className="ml-auto text-slate-500">
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Tips Panel */}
      <Panel>
        <h3 className="mb-4 text-lg font-semibold text-white">💡 Tips to Unlock More</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-2xl">🔥</p>
            <p className="mt-2 font-medium text-white">Build Streaks</p>
            <p className="text-xs text-slate-400">Study every day to maintain your streak</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-2xl">⏰</p>
            <p className="mt-2 font-medium text-white">Long Sessions</p>
            <p className="text-xs text-slate-400">Try 2-4 hour focused sessions</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-2xl">🌙</p>
            <p className="mt-2 font-medium text-white">Night Owl</p>
            <p className="text-xs text-slate-400">Study past midnight for special badge</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-2xl">🎯</p>
            <p className="mt-2 font-medium text-white">Daily Goals</p>
            <p className="text-xs text-slate-400">Hit your daily goal consistently</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
