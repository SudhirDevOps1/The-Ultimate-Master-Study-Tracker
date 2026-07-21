import { useState } from "react";
import { Shield, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/common/Panel";

interface BlockRule {
  id: string;
  appName: string;
  blocked: boolean;
}

export function AppBlockingPanel() {
  const [rules, setRules] = useState<BlockRule[]>(() => {
    const saved = localStorage.getItem("web_app_block_rules");
    return saved ? JSON.parse(saved) : [
      { id: "1", appName: "youtube.com", blocked: true },
      { id: "2", appName: "facebook.com", blocked: true },
      { id: "3", appName: "instagram.com", blocked: true }
    ];
  });

  const [newRule, setNewRule] = useState("");

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.trim()) return;

    const updated = [...rules, { id: `rule-${Date.now()}`, appName: newRule.trim().toLowerCase(), blocked: true }];
    setRules(updated);
    localStorage.setItem("web_app_block_rules", JSON.stringify(updated));
    setNewRule("");
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    localStorage.setItem("web_app_block_rules", JSON.stringify(updated));
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" /> Focus Shield Distraction Blocker
        </h3>
      </div>

      <form onSubmit={handleAddRule} className="flex gap-2">
        <input
          value={newRule}
          onChange={e => setNewRule(e.target.value)}
          placeholder="Block site or domain (e.g. twitter.com)"
          className="flex-1 rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500/30 transition-all flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Block
        </button>
      </form>

      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 text-xs">
            <span className="font-mono text-slate-300">{rule.appName}</span>
            <button onClick={() => handleDeleteRule(rule.id)} className="text-slate-400 hover:text-rose-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
