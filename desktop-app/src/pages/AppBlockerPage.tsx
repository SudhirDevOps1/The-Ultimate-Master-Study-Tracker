import { motion } from "framer-motion";
import { AppBlockingPanel } from "@/components/analytics/AppBlockingPanel";
import { ShieldAlert, Lightbulb } from "lucide-react";

export function AppBlockerPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
          <ShieldAlert className="w-4 h-4" />
          <span>Distraction Control Center</span>
        </div>
        <h1 className="text-3xl font-black text-white mt-1">App & Web Blocker</h1>
        <p className="mt-2 text-slate-400 max-w-2xl text-sm">
          Take absolute control of your focus. Terminate distracting background apps, kill games, and block social media sites during deep study sessions.
        </p>
      </motion.div>

      <AppBlockingPanel />

      {/* Troubleshooting Hosts Cleanup Note */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-amber-100 font-bold">Troubleshooting Tip: Google or YouTube Sign-In Issues?</strong>
          <p className="text-xs leading-relaxed text-amber-200/80">
            Stale entries left over in your Windows hosts file (<code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono">%windir%\System32\drivers\etc\hosts</code> under <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono"># --- FlowTrack Pro Blocks Start ---</code>) from previous website blocking can prevent Google or YouTube login. To clean them up, disable all website blocks above and click <strong>Sync Hosts (Admin)</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
