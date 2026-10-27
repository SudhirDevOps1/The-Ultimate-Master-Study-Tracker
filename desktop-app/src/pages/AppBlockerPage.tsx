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

      {/* Troubleshooting Hosts Cleanup Note */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-3">
        <span className="text-base shrink-0">💡</span>
        <div>
          <strong className="text-amber-100 font-semibold">Troubleshooting Tip: Google or YouTube Sign-In Issues?</strong>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
            Stale entries left over in your Windows hosts file (<code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono">%windir%\System32\drivers\etc\hosts</code> under <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono"># --- FlowTrack Pro Blocks Start ---</code>) from previous website blocking can prevent Google or YouTube login. To clean them up, disable all website blocks above and click <strong>Sync Hosts File</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
