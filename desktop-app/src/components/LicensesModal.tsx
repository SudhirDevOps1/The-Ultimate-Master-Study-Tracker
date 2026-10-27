import { useState } from "react";
import { X, ShieldCheck, ExternalLink, Search } from "lucide-react";

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  url: string;
  description: string;
}

const LICENSES: LicenseEntry[] = [
  { name: "react", version: "19.2.3", license: "MIT", url: "https://react.dev", description: "UI component architecture" },
  { name: "react-dom", version: "19.2.3", license: "MIT", url: "https://react.dev", description: "DOM renderer for React" },
  { name: "electron", version: "43.0.0", license: "MIT", url: "https://www.electronjs.org", description: "Cross-platform desktop runtime" },
  { name: "dexie", version: "4.3.0", license: "Apache-2.0", url: "https://dexie.org", description: "Minimalistic IndexedDB wrapper" },
  { name: "dexie-export-import", version: "4.1.4", license: "Apache-2.0", url: "https://github.com/dexie/Dexie.js", description: "Transactional DB export/import" },
  { name: "lucide-react", version: "0.474.0", license: "ISC", url: "https://lucide.dev", description: "Icons and symbols" },
  { name: "framer-motion", version: "12.35.0", license: "MIT", url: "https://www.framer.com/motion", description: "Smooth animations & transitions" },
  { name: "date-fns", version: "4.1.0", license: "MIT", url: "https://date-fns.org", description: "Modern JavaScript date utility" },
  { name: "recharts", version: "3.8.0", license: "MIT", url: "https://recharts.org", description: "Declarative analytics charts" },
  { name: "@ghostery/adblocker-electron", version: "2.20.1", license: "MPL-2.0", url: "https://github.com/ghostery/adblocker", description: "Privacy & study ad-shield engine" },
  { name: "electron-chrome-extensions", version: "4.10.0", license: "MIT", url: "https://github.com/samuelmaddock/electron-chrome-extensions", description: "Opt-in extension runtime" },
  { name: "@mozilla/readability", version: "0.5.0", license: "Apache-2.0", url: "https://github.com/mozilla/readability", description: "Distraction-free article extractor" },
  { name: "dompurify", version: "3.2.4", license: "Apache-2.0 / MPL-2.0", url: "https://github.com/cure53/DOMPurify", description: "XSS sanitizer & HTML security guard" },
  { name: "minisearch", version: "7.1.2", license: "MIT", url: "https://github.com/lucaong/minisearch", description: "In-memory fuzzy text search" },
  { name: "cmdk", version: "1.0.4", license: "MIT", url: "https://cmdk.paco.me", description: "Command menu palette" },
];

export function LicensesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [filter, setFilter] = useState("");

  if (!isOpen) return null;

  const filtered = LICENSES.filter(
    l => l.name.toLowerCase().includes(filter.toLowerCase()) || l.license.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Open Source Software Licenses</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-white/5 bg-slate-950/30">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by package name or license (MIT, Apache, MPL)..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto divide-y divide-white/5 space-y-3">
          {filtered.map(pkg => (
            <div key={pkg.name} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">{pkg.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">v{pkg.version}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {pkg.license}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{pkg.description}</p>
              </div>
              <a
                href={pkg.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors shrink-0"
                title="View Source / License"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-white/10 bg-slate-950/50 flex justify-between items-center text-[11px] text-slate-400">
          <span>FlowTrack Pro is 100% Free and Open Source.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
