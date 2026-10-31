import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Award, 
  Sparkles, 
  Flame, 
  BookOpen, 
  Clock, 
  Target, 
  CheckCircle2, 
  Lock, 
  Zap, 
  ShieldCheck, 
  Search 
} from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore } from "@/store/useAppStore";

export function AchievementsPage() {
  const achievements = useAppStore((state) => state.achievements);
  const recalculateAchievements = useAppStore((state) => state.recalculateAchievements);
  const theme = useAppStore((state) => state.theme);

  const [filterStatus, setFilterStatus] = useState<"all" | "unlocked" | "in_progress" | "locked">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    recalculateAchievements();
  }, [recalculateAchievements]);

  const { unlockedCount, overallProgress, totalXp, userLevel, rankTitle } = useMemo(() => {
    if (!Array.isArray(achievements) || achievements.length === 0) {
      return { unlockedCount: 0, overallProgress: 0, totalXp: 0, userLevel: 1, rankTitle: "Novice Scholar" };
    }
    const unlocked = achievements.filter((a) => a.unlockedAt).length;
    const totalProgress = achievements.reduce((sum, a) => sum + Math.min(100, (a.progress / a.maxProgress) * 100), 0);
    const overall = Math.round(totalProgress / achievements.length);
    
    // Calculate total XP: 100 XP per unlocked achievement + 1 XP per progress percentage point
    const earnedXp = (unlocked * 150) + Math.round(totalProgress * 2.5);
    const level = Math.max(1, Math.floor(earnedXp / 250) + 1);

    let rank = "Novice Scholar";
    if (unlocked >= 14) rank = "Zen Luminary";
    else if (unlocked >= 10) rank = "Grandmaster of Focus";
    else if (unlocked >= 6) rank = "Dedicated Master";
    else if (unlocked >= 3) rank = "Focused Apprentice";

    return {
      unlockedCount: unlocked,
      overallProgress: overall,
      totalXp: earnedXp,
      userLevel: level,
      rankTitle: rank,
    };
  }, [achievements]);

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
    if (achievement.unlockedAt) return "legendary";
    if (ratio >= 0.75) return "epic";
    if (ratio >= 0.4) return "rare";
    return "common";
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-orange-500/5 shadow-amber-500/10 hover:border-amber-400";
      case "epic":
        return "border-purple-400/40 bg-gradient-to-br from-purple-500/15 to-pink-500/5 shadow-purple-500/10 hover:border-purple-400";
      case "rare":
        return "border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 to-blue-500/5 shadow-cyan-500/10 hover:border-cyan-400";
      default:
        return "border-white/10 bg-slate-900/60 hover:border-white/20";
    }
  };

  const categories = [
    { id: "all", name: "All Badges", icon: <Award className="w-4 h-4" />, filter: "" },
    { id: "streak", name: "Streak Master", icon: <Flame className="w-4 h-4 text-orange-400" />, filter: "streak" },
    { id: "hours", name: "Study Hours", icon: <BookOpen className="w-4 h-4 text-cyan-400" />, filter: "hours" },
    { id: "focus", name: "Deep Focus", icon: <Clock className="w-4 h-4 text-purple-400" />, filter: "focused|night|early" },
    { id: "goals", name: "Goal Crusher", icon: <Target className="w-4 h-4 text-emerald-400" />, filter: "goal" },
  ];

  const filteredAchievements = useMemo(() => {
    return achievements.filter((a) => {
      // Category filter
      if (selectedCategory !== "all") {
        const cat = categories.find((c) => c.id === selectedCategory);
        if (cat && cat.filter && !new RegExp(cat.filter).test(a.id)) return false;
      }

      // Status filter
      if (filterStatus === "unlocked" && !a.unlockedAt) return false;
      if (filterStatus === "locked" && (a.unlockedAt || a.progress > 0)) return false;
      if (filterStatus === "in_progress" && (a.unlockedAt || a.progress === 0)) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }

      return true;
    });
  }, [achievements, selectedCategory, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Gamified Hero Level & Progression Banner */}
      <Panel className="relative overflow-hidden border border-yellow-500/20 bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-400 border border-yellow-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Level {userLevel} • {rankTitle}</span>
              </span>
              <span className="text-xs font-bold text-slate-400">• {totalXp} Total XP</span>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Trophies & Study Milestones</h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Earn badges by maintaining study streaks, clocking hours, completing focus blocks, and hitting daily goals.
            </p>
          </div>

          {/* Quick Macro Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className="text-2xl font-black text-amber-400">🏅 {unlockedCount}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Unlocked</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className="text-2xl font-black text-cyan-400">{achievements.length}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Total Badges</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/10 text-center min-w-[90px]">
              <p className="text-2xl font-black text-emerald-400">{overallProgress}%</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Mastery</p>
            </div>
          </div>
        </div>

        {/* Level XP & Mastery Progress Bar */}
        <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">Overall Vault Completion</span>
            <span className="font-bold text-yellow-400">{unlockedCount} of {achievements.length} unlocked ({overallProgress}%)</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-950 border border-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-rose-500 shadow-lg shadow-yellow-500/20"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>
      </Panel>

      {/* Category Pills & Filters Bar */}
      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-white/10">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? "bg-amber-400 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search badges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 sm:w-56 rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
          <span className="text-slate-500 font-semibold mr-1">Status:</span>
          {(["all", "unlocked", "in_progress", "locked"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg font-bold capitalize transition-all ${
                filterStatus === status
                  ? "bg-white/20 text-white border border-white/20 shadow-sm"
                  : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
              }`}
            >
              {status === "all" ? "All" : status === "unlocked" ? "Unlocked ✨" : status === "in_progress" ? "In Progress ⏳" : "Locked 🔒"}
            </button>
          ))}
          <span className="ml-auto text-slate-500 text-xs">Showing {filteredAchievements.length} badges</span>
        </div>
      </Panel>

      {/* Achievements Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredAchievements.map((achievement, index) => {
          const rarity = getRarity(achievement);
          const progress = Math.min(100, (achievement.progress / achievement.maxProgress) * 100);

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              whileHover={{ scale: 1.02, y: -3 }}
              className={`relative flex flex-col justify-between rounded-2xl border p-4 shadow-lg transition-all ${getRarityStyles(rarity)}`}
            >
              <div>
                <div className="flex items-start gap-3">
                  <motion.div
                    animate={achievement.unlockedAt ? { 
                      scale: [1, 1.05, 1],
                    } : {}}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 4 }}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-inner ${
                      achievement.unlockedAt
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30"
                        : "bg-slate-800/80 text-slate-500 border border-white/5"
                    }`}
                  >
                    {achievement.unlockedAt ? achievement.icon : <Lock className="w-5 h-5 text-slate-500" />}
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-white text-sm truncate">{achievement.name}</h3>
                      {achievement.unlockedAt && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {achievement.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="text-slate-400">Progress</span>
                    <span className="font-mono font-bold text-slate-200">
                      {achievement.progress} / {achievement.maxProgress}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-950 border border-white/5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: achievement.unlockedAt 
                          ? `linear-gradient(90deg, ${achievement.color || '#f59e0b'}, #fbbf24)` 
                          : "#475569",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, delay: index * 0.02 }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer Status */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                {achievement.unlockedAt ? (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Sparkles className="w-3 h-3" />
                    <span>Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3" />
                    <span>Locked ({Math.round(progress)}%)</span>
                  </span>
                )}
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                  {rarity}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Productivity Habit Strategy Cards */}
      <Panel>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Pro Productivity Strategies to Unlock Badges</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3.5 hover:border-amber-400/30 transition-colors">
            <span className="text-2xl">🔥</span>
            <p className="mt-2 font-bold text-white text-xs">Maintain Daily Streaks</p>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Log at least one 25-minute study session every calendar day without interruption.
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3.5 hover:border-cyan-400/30 transition-colors">
            <span className="text-2xl">⏰</span>
            <p className="mt-2 font-bold text-white text-xs">Deep Focus Blocks</p>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Use ultradian 90-minute blocks with Focus Blocker active to earn deep work badges.
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3.5 hover:border-purple-400/30 transition-colors">
            <span className="text-2xl">🌙</span>
            <p className="mt-2 font-bold text-white text-xs">Night Owl Sessions</p>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Study past midnight to claim the secret Night Owl and Midnight Master awards.
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3.5 hover:border-emerald-400/30 transition-colors">
            <span className="text-2xl">🎯</span>
            <p className="mt-2 font-bold text-white text-xs">Crush Daily Goals</p>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Hit your target study hours 5 days in a row to level up your scholar rank.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
