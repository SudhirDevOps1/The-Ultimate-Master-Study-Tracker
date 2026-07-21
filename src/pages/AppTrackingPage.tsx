import { useState } from "react";
import { Monitor } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { AppActivityList } from "@/components/analytics/AppActivityList";
import { AppBlockingPanel } from "@/components/analytics/AppBlockingPanel";

const BROWSER = [
  "chrome", "google chrome", "edge", "microsoft edge", "msedge",
  "firefox", "mozilla firefox", "brave", "brave browser", "opera",
  "safari", "chromium", "vivaldi", "arc", "waterfox", "tor"
];

// Extract website domain & clean tab title from browser window titles
function extractWebDomain(title: string, appName: string, rawProcess?: string): { domain: string; cleanTitle: string } | null {
  const nameToCheck = (appName + " " + (rawProcess || "")).toLowerCase();
  const isBrowser = BROWSER.some(b => nameToCheck.includes(b));
  if (!isBrowser || !title || title === "Desktop / Idle" || title === "desktop is idle") return null;

  // Remove browser suffix
  const browserSuffixes = BROWSER.map(b => `\\s*-\\s*${b}`).join("|");
  const suffixRegex = new RegExp(browserSuffixes, "i");
  
  const cleanTitle = (title || "")
    .replace(suffixRegex, "")
    .replace(/\s*-\s*Work\s*-\s*Microsoft Edge$/i, "")
    .replace(/\s*-\s*Personal\s*-\s*Microsoft Edge$/i, "")
    .trim() || "Web Tab";
  
  const titleLower = cleanTitle.toLowerCase();
  let domain = "web-page";

  if (titleLower.includes("youtube")) domain = "youtube.com";
  else if (titleLower.includes("github")) domain = "github.com";
  else if (titleLower.includes("google search") || titleLower.includes("google")) domain = "google.com";
  else if (titleLower.includes("stackoverflow")) domain = "stackoverflow.com";
  else if (titleLower.includes("chatgpt") || titleLower.includes("openai")) domain = "chatgpt.com";
  else if (titleLower.includes("leetcode")) domain = "leetcode.com";
  else if (titleLower.includes("coursera")) domain = "coursera.org";
  else if (titleLower.includes("udemy")) domain = "udemy.com";
  else if (titleLower.includes("wikipedia")) domain = "wikipedia.org";
  else if (titleLower.includes("reddit")) domain = "reddit.com";
  else if (titleLower.includes("twitter") || titleLower.includes(" x ")) domain = "x.com";
  else if (titleLower.includes("linkedin")) domain = "linkedin.com";
  else {
    try {
      const match = cleanTitle.match(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/i);
      if (match && match[0]) domain = match[0].toLowerCase();
      else domain = (cleanTitle.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, "") || "web") + ".site";
    } catch {
      domain = "web.site";
    }
  }

  return { domain, cleanTitle };
}

export function AppTrackingPage() {
  const [tab, setTab] = useState<"overview" | "blocking">("overview");

  return (
    <div className="space-y-6">
      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Monitor className="w-6 h-6 text-cyan-400" /> Web Activity & Distraction Shield
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Monitor active app processes, browser tab activity, and configure web distraction blocklists.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("overview")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === "overview" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-slate-900 text-slate-400"
              }`}
            >
              📊 App Breakdown
            </button>
            <button
              onClick={() => setTab("blocking")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === "blocking" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-slate-900 text-slate-400"
              }`}
            >
              🛡️ Distraction Blocker
            </button>
          </div>
        </div>
      </Panel>

      {tab === "overview" ? <AppActivityList /> : <AppBlockingPanel />}
    </div>
  );
}
