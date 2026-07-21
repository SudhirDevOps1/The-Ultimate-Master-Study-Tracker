import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { generateInsights, type Insight } from "@/utils/insightEngine";
import { Panel } from "@/components/common/Panel";

export function InsightsBlock() {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);

  const insights = useMemo(() => generateInsights(sessions, subjects), [sessions, subjects]);

  const getIntensity = (importance: Insight["importance"]) => {
    switch (importance) {
      case "high": return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "medium": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <Panel className="relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">AI Studio Insights</h3>
          <p className="text-xs text-slate-400 font-medium italic">Local Intelligence • No Data Shared</p>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, idx) => (
            <motion.div
              key={insight.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-xl border backdrop-blur-md transition-all hover:bg-white/5 ${getIntensity(insight.importance)}`}
            >
              <div className="text-2xl mt-0.5">{insight.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm tracking-wide uppercase">{insight.title}</h4>
                  {insight.importance === "high" && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500 text-[10px] font-black text-white uppercase animate-pulse">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-sm opacity-90 leading-relaxed font-medium">
                  {insight.description}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Subtle Background Decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Sparkles className="w-24 h-24 text-white" />
      </div>
    </Panel>
  );
}
