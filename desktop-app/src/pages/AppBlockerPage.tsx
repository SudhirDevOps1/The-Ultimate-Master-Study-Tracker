import { motion } from "framer-motion";
import { AppBlockingPanel } from "@/components/analytics/AppBlockingPanel";

export function AppBlockerPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-black text-white">App & Web Blocker</h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Take control of your focus. Block distracting applications and websites while studying.
        </p>
      </motion.div>

      <AppBlockingPanel />
    </div>
  );
}
