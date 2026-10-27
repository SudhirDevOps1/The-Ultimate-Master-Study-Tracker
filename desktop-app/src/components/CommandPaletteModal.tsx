import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import MiniSearch from "minisearch";
import {
  Search,
  Timer,
  BookOpen,
  BarChart3,
  Globe,
  Settings,
  Sparkles,
  Layers,
  ArrowRight,
  HardDrive,
  Activity,
  Code2,
} from "lucide-react";
import { db } from "@/lib/db";

interface SearchItem {
  id: string;
  title: string;
  category: "Navigation" | "Flashcard" | "Note" | "Portal" | "Action";
  description?: string;
  action: () => void;
}

const STATIC_ACTIONS = (navigate: (path: string) => void): SearchItem[] => [
  {
    id: "nav-dashboard",
    title: "Dashboard",
    category: "Navigation",
    description: "Main productivity and study overview",
    action: () => navigate("/"),
  },
  {
    id: "nav-timer",
    title: "Focus Timer",
    category: "Navigation",
    description: "Pomodoro, Stopwatch, and Flowtime modes",
    action: () => navigate("/timer"),
  },
  {
    id: "nav-app-tracking",
    title: "Application & Coding Tracking",
    category: "Navigation",
    description: "Screen time, active apps, and IDE heartbeats",
    action: () => navigate("/app-tracking"),
  },
  {
    id: "nav-flashcards",
    title: "Flashcards & SM-2 Spaced Repetition",
    category: "Navigation",
    description: "Anki-compatible review cards and decks",
    action: () => navigate("/flashcards"),
  },
  {
    id: "nav-web-portals",
    title: "Web Portals (In-App Browser)",
    category: "Navigation",
    description: "Ad-shielded study portals, YouTube, and course sites",
    action: () => navigate("/web-portals"),
  },
  {
    id: "nav-sandbox",
    title: "Study Sandbox & Whiteboard",
    category: "Navigation",
    description: "Canvas, PDF notes, and lecture scratchpad",
    action: () => navigate("/study-sandbox"),
  },
  {
    id: "nav-analytics",
    title: "Deep Analytics",
    category: "Navigation",
    description: "Productivity heatmaps, focus scores, and trends",
    action: () => navigate("/analytics"),
  },
  {
    id: "nav-settings",
    title: "Settings & Privacy Vault",
    category: "Navigation",
    description: "Editor integrations, ad shield, and local backups",
    action: () => navigate("/settings"),
  },
];

export function CommandPaletteModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dynamicItems, setDynamicItems] = useState<SearchItem[]>([]);
  const navigate = useNavigate();

  // Global Ctrl+K / Cmd+K trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Index dynamic Dexie contents (flashcards, notes, portals)
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    async function loadDynamic() {
      const items: SearchItem[] = [];

      try {
        // 1. Subjects from Dexie
        const subjects = await db.subjects?.toArray().catch(() => []);
        if (subjects && Array.isArray(subjects)) {
          for (const s of subjects) {
            items.push({
              id: `subj-${s.id}`,
              title: s.name,
              category: "Subject" as any,
              description: `Subject (${s.color || "Active"})`,
              action: () => {
                navigate("/timer");
                setOpen(false);
              },
            });
          }
        }

        // 2. Flashcards from Local Storage
        const cardsRaw = localStorage.getItem("flashcards") || localStorage.getItem("flowtrack_cards");
        if (cardsRaw) {
          try {
            const cards = JSON.parse(cardsRaw);
            if (Array.isArray(cards)) {
              for (const card of cards.slice(0, 50)) {
                items.push({
                  id: `card-${card.id || Math.random()}`,
                  title: (card.question || card.front || "Flashcard").slice(0, 60),
                  category: "Flashcard",
                  description: (card.answer || card.back || "").slice(0, 80),
                  action: () => {
                    navigate("/flashcards");
                    setOpen(false);
                  },
                });
              }
            }
          } catch {}
        }

        // 2. Study Portals (Custom & Bookmarks)
        const customPortalsRaw = localStorage.getItem("flowtrack_custom_sites");
        if (customPortalsRaw) {
          try {
            const portals = JSON.parse(customPortalsRaw);
            if (Array.isArray(portals)) {
              for (const p of portals) {
                items.push({
                  id: `portal-${p.id}`,
                  title: p.name || p.url,
                  category: "Portal",
                  description: p.url,
                  action: () => {
                    navigate(`/web-portals?url=${encodeURIComponent(p.url)}`);
                    setOpen(false);
                  },
                });
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn("[CommandPalette] Dynamic indexing error:", err);
      }

      if (isMounted) {
        setDynamicItems(items);
      }
    }

    loadDynamic();
    return () => {
      isMounted = false;
    };
  }, [open, navigate]);

  const allItems = useMemo(() => {
    return [...STATIC_ACTIONS(navigate), ...dynamicItems];
  }, [navigate, dynamicItems]);

  // MiniSearch fuzzy search engine
  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<SearchItem>({
      fields: ["title", "description", "category"],
      storeFields: ["id", "title", "category", "description"],
      searchOptions: {
        boost: { title: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    ms.addAll(allItems);
    return ms;
  }, [allItems]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const results = miniSearch.search(query.trim());
    const ids = new Set(results.map(r => r.id));
    return allItems.filter(item => ids.has(item.id));
  }, [query, allItems, miniSearch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <Command
          className="w-full"
          shouldFilter={false} // Handled by MiniSearch
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-950/60">
            <Search className="w-5 h-5 text-cyan-400 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type to search pages, flashcards, portals, or actions (Ctrl+K)..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              autoFocus
            />
            <kbd className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-slate-400">ESC to close</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No results found for "{query}".
              </div>
            ) : (
              filteredItems.map(item => (
                <Command.Item
                  key={item.id}
                  onSelect={() => {
                    item.action();
                    setOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-slate-200 hover:bg-cyan-500/15 hover:text-white cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-white/5 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                      {item.category === "Navigation" && <Layers className="w-4 h-4" />}
                      {item.category === "Flashcard" && <Sparkles className="w-4 h-4" />}
                      {item.category === "Portal" && <Globe className="w-4 h-4" />}
                      {item.category === "Action" && <Activity className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                      {item.category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </Command.Item>
              ))
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
