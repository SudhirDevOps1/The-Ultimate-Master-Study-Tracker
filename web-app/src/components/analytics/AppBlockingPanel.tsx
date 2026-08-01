import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldAlert, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { AppBlockRule, BlockStrictLevel } from "@/types/models";

export function AppBlockingPanel() {
  const isBackendConnected = useAppStore((state: AppState) => state.isBackendConnected);

  const [rules, setRules] = useState<AppBlockRule[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [newAppName, setNewAppName] = useState("");
  const [strictLevel, setStrictLevel] = useState<BlockStrictLevel>("medium");
  const [schedule, setSchedule] = useState<"always" | "study_hours">("study_hours");
  const [loading, setLoading] = useState(false);

  const getIpc = () => (typeof window !== "undefined" ? (window as any).electron : null);

  // Load block rules from Electron IPC / local db/storage and sync
  const loadRules = async () => {
    setLoading(true);
    try {
      const ipc = getIpc();
      if (ipc) {
        const res = await ipc.invoke("get-block-rules");
        if (res && Array.isArray(res.rules)) {
          setRules(res.rules);
          if (typeof res.globalEnabled === "boolean") setGlobalEnabled(res.globalEnabled);
          setLoading(false);
          return;
        }
      }

      const storedRules = localStorage.getItem("app_block_rules");
      let currentRules: AppBlockRule[] = storedRules ? JSON.parse(storedRules) : [];
      setRules(currentRules);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadRules();
  }, [isBackendConnected]);

  const saveRulesToLocalAndBackend = async (updatedRules: AppBlockRule[], newGlobalEnabled?: boolean) => {
    const isGlobal = typeof newGlobalEnabled === "boolean" ? newGlobalEnabled : globalEnabled;
    setRules(updatedRules);
    setGlobalEnabled(isGlobal);
    localStorage.setItem("app_block_rules", JSON.stringify(updatedRules));

    const ipc = getIpc();
    if (ipc) {
      await ipc.invoke("save-block-rules", { rules: updatedRules, globalEnabled: isGlobal });
    }
  };

  const addRule = async () => {
    if (!newAppName.trim()) return;
    const newRule: AppBlockRule = {
      id: crypto.randomUUID(),
      appName: newAppName.trim(),
      blocked: true,
      strictLevel,
      schedule,
      category: "distracting",
      createdAt: new Date().toISOString()
    };
    const nextRules = [...rules, newRule];
    await saveRulesToLocalAndBackend(nextRules);
    setNewAppName("");
  };

  const toggleRuleBlocked = async (id: string) => {
    const nextRules = rules.map(r => r.id === id ? { ...r, blocked: !r.blocked } : r);
    await saveRulesToLocalAndBackend(nextRules);
  };

  const deleteRule = async (id: string) => {
    const nextRules = rules.filter(r => r.id !== id);
    await saveRulesToLocalAndBackend(nextRules);
  };

  return (
    <div className="space-y-6">
      <Panel className="space-y-4 border border-rose-500/10">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">App Blocking Dashboard</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Global Blocker Status:</span>
            <button
              onClick={() => void saveRulesToLocalAndBackend(rules, !globalEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                globalEnabled ? "bg-rose-500" : "bg-slate-700"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                globalEnabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-3 flex gap-3 text-xs text-rose-300">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Strict Level Action Levels:</p>
            <p className="text-slate-300">
              <strong>Soft:</strong> Shows desktop alert warning when application starts.<br />
              <strong>Medium:</strong> Minimizes process window automatically during study hours.<br />
              <strong>Hard:</strong> Terminates / kills process instantly when distraction is detected.
            </p>
          </div>
        </div>

        {/* Add custom rule form */}
        <div className="grid gap-3 sm:grid-cols-4 items-end bg-white/[0.02] border border-white/5 p-3 rounded-xl">
          <div className="space-y-1 sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Process/App Name</label>
            <input
              type="text"
              placeholder="e.g., discord.exe, Spotify, instagram"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Strictness</label>
            <select
              value={strictLevel}
              onChange={(e) => setStrictLevel(e.target.value as BlockStrictLevel)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="soft">Soft (Warning)</option>
              <option value="medium">Medium (Minimize)</option>
              <option value="hard">Hard (Kill Process)</option>
            </select>
          </div>
          <button
            onClick={addRule}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-lg shadow-rose-500/20"
          >
            <Plus className="w-4 h-4" /> Add Block
          </button>
        </div>

        {/* Rules list */}
        <div className="space-y-2 pt-2">
          {rules.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No active application block rules defined.</p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  rule.blocked ? "border-rose-500/20 bg-rose-500/5" : "border-white/5 bg-white/[0.01]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${rule.blocked ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-500"}`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{rule.appName}</p>
                    <p className="text-[10px] text-slate-400">
                      Level: <span className="text-rose-300 font-semibold uppercase">{rule.strictLevel}</span> • Schedule: {rule.schedule}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRuleBlocked(rule.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      rule.blocked 
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" 
                        : "bg-slate-800 text-slate-400 border border-white/5"
                    }`}
                  >
                    {rule.blocked ? "Blocked" : "Allowed"}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
