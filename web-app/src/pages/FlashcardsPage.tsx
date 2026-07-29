import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, BookOpen, Brain, Sparkles, AlertCircle, ChevronLeft, ChevronRight, Check, X, RefreshCw } from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Flashcard {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  intervalDays: number; // Interval for Spaced Repetition
  easeFactor: number;   // Ease factor for spacing calculation
  dueDate: string;      // ISO string
  reviewedCount: number;
}

const STORAGE_KEY = "flowtrack_flashcards_v1";

function loadFlashcards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFlashcards(cards: Flashcard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// ─── Main Spaced Repetition Logic ─────────────────────────────────────────────
// Simplified SuperMemo-2 / Anki spacing algorithm
function calculateNextReview(card: Flashcard, score: "again" | "hard" | "good" | "easy"): Flashcard {
  let { intervalDays, easeFactor, reviewedCount } = card;

  if (score === "again") {
    intervalDays = 1;
    reviewedCount = 0;
    // Lower ease factor slightly for difficult cards
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    reviewedCount += 1;
    if (reviewedCount === 1) {
      intervalDays = 1;
    } else if (reviewedCount === 2) {
      intervalDays = 4;
    } else {
      const multiplier = score === "hard" ? 1.2 : score === "good" ? 2.5 : 3.5;
      intervalDays = Math.ceil(intervalDays * easeFactor * multiplier);
    }

    if (score === "easy") {
      easeFactor += 0.15;
    } else if (score === "hard") {
      easeFactor = Math.max(1.3, easeFactor - 0.15);
    }
  }

  // Calculate new due date
  const due = new Date();
  due.setDate(due.getDate() + intervalDays);

  return {
    ...card,
    intervalDays,
    easeFactor,
    reviewedCount,
    dueDate: due.toISOString(),
  };
}

export function FlashcardsPage() {
  const subjects = useAppStore((s: AppState) => s.subjects);
  const [cards, setCards] = useState<Flashcard[]>(loadFlashcards);
  
  // Creation state
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  
  // Study mode states
  const [activeDeckSubjectId, setActiveDeckSubjectId] = useState<string | null>(null);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // AI prompt helper
  const [aiNoteInput, setAiNoteInput] = useState("");
  const [showAiHelper, setShowAiHelper] = useState(false);

  // Save to storage
  useEffect(() => {
    saveFlashcards(cards);
  }, [cards]);

  // Load temp AI note input from OCR Study Reader redirection
  useEffect(() => {
    const tempInput = localStorage.getItem("flowtrack_temp_flashcard_input");
    if (tempInput) {
      setAiNoteInput(tempInput);
      setShowAiHelper(true);
      localStorage.removeItem("flowtrack_temp_flashcard_input");
    }
  }, []);

  // Aggregate cards per subject
  const deckStats = useMemo(() => {
    const stats: Record<string, { total: number; due: number }> = {};
    subjects.forEach(sub => {
      stats[sub.id] = { total: 0, due: 0 };
    });

    const now = new Date();
    cards.forEach(c => {
      if (stats[c.subjectId]) {
        stats[c.subjectId].total += 1;
        if (new Date(c.dueDate) <= now) {
          stats[c.subjectId].due += 1;
        }
      }
    });

    return stats;
  }, [cards, subjects]);

  // Add Card
  const handleAddCard = (frontTxt: string, backTxt: string, subId: string) => {
    if (!frontTxt.trim() || !backTxt.trim() || !subId) return;
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      subjectId: subId,
      front: frontTxt.trim(),
      back: backTxt.trim(),
      intervalDays: 0,
      easeFactor: 2.5,
      dueDate: new Date().toISOString(), // Due immediately
      reviewedCount: 0,
    };
    setCards(prev => [...prev, newCard]);
  };

  // Start study session for a subject deck
  const handleStartStudy = (subId: string) => {
    const now = new Date();
    const filtered = cards.filter(c => c.subjectId === subId && new Date(c.dueDate) <= now);
    if (filtered.length === 0) {
      alert("No cards due for review in this subject deck right now!");
      return;
    }
    setStudyCards(filtered);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setActiveDeckSubjectId(subId);
  };

  // Process rating score choice
  const handleRate = (score: "again" | "hard" | "good" | "easy") => {
    const card = studyCards[currentCardIndex];
    const updatedCard = calculateNextReview(card, score);
    
    // Update master cards list
    setCards(prev => prev.map(c => c.id === card.id ? updatedCard : c));

    // Progress in queue
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(idx => idx + 1);
      setIsFlipped(false);
    } else {
      // Completed current study queue
      setActiveDeckSubjectId(null);
      setStudyCards([]);
      alert("🎓 Review session complete! Good job keeping your memory fresh.");
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  // AI Flashcard Parser Simulator & AI Query API (rule-based local fallback)
  const handleAiParse = async () => {
    if (!aiNoteInput.trim() || !selectedSubjectId) return;
    
    setIsGenerating(true);
    let count = 0;
    let parsedCards: { front: string; back: string }[] = [];

    const aiConfig = useAppStore.getState().aiConfig;
    const { provider, model, apiKey, ollamaUrl, customProviderEndpoint } = aiConfig;

    // Helper to get endpoint URL
    const getEndpoint = () => {
      if (provider === "ollama") return `${ollamaUrl || "http://localhost:11434"}/api/chat`;
      if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completypes";
      if (provider === "gemini") {
        return `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`;
      }
      if (provider === "custom") return customProviderEndpoint || "";
      return "https://api.openai.com/v1/chat/completions";
    };

    const endpoint = getEndpoint();

    if (provider && provider !== "none" && endpoint) {
      try {
        const userPrompt = `You are a professional study tool. Analyze the following notes and generate a JSON array of flashcards. Each flashcard should have a clear, concise question "front" and answer "back". Produce ONLY valid JSON inside markdown block or raw text.
Format:
[
  { "front": "What is the capital of France?", "back": "Paris" }
]

Notes:
${aiNoteInput}`;

        let responseText = "";

        if (provider === "gemini") {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: userPrompt }] }]
            })
          });
          const data = await res.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          // OpenAI compatible endpoint formats
          const isOllama = provider === "ollama";
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
            },
            body: JSON.stringify({
              model: model || (isOllama ? "llama3" : "gpt-4o-mini"),
              messages: [
                { role: "system", content: "You are a flashcard generator. Return only valid JSON array." },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.3,
              ...(isOllama ? { stream: false } : {}) // Disable stream for raw parsing
            })
          });
          
          const data = await res.json();
          responseText = isOllama 
            ? (data.message?.content || "") 
            : (data.choices?.[0]?.message?.content || "");
        }

        // Clean markdown backticks if present
        const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText.trim();
        parsedCards = JSON.parse(cleanJson);

        if (Array.isArray(parsedCards)) {
          parsedCards.forEach(c => {
            if (c.front && c.back) {
              handleAddCard(c.front, c.back, selectedSubjectId);
              count++;
            }
          });
        }
      } catch (err) {
        console.warn("[SRS Flashcards] AI Generation failed, switching to local rule-based fallback.", err);
      }
    }

    // Fallback: Rule-based local parser if AI failed or provider is empty
    if (count === 0) {
      const lines = aiNoteInput.split(/[.\n]+/);
      lines.forEach(line => {
        const clean = line.trim();
        if (!clean) return;

        const matches = clean.match(/(.+?)\s+is\s+a\s+(.+)/i) || clean.match(/(.+?)\s+means\s+(.+)/i);
        if (matches && matches[1] && matches[2]) {
          handleAddCard(`What is ${matches[1].trim()}?`, matches[2].trim(), selectedSubjectId);
          count++;
        } else if (clean.length > 15) {
          handleAddCard(`Explain key concept:`, clean, selectedSubjectId);
          count++;
        }
      });
    }

    setAiNoteInput("");
    setIsGenerating(false);
    setShowAiHelper(false);
    alert(`✨ Successfully generated ${count} flashcards from notes!`);
  };

  const activeSubject = subjects.find(s => s.id === activeDeckSubjectId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            SRS Flashcards (Spaced Repetition)
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Optimize long-term memorization based on memory forgetting curves</p>
        </div>
      </div>

      {/* ─── STUDY SESSION INTERFACE ────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeDeckSubjectId && studyCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <Panel className="border-l-4 border-purple-500 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Review Session — {activeSubject?.name}
                </span>
                <span className="text-xs text-purple-400 font-mono">
                  Card {currentCardIndex + 1} of {studyCards.length}
                </span>
              </div>

              {/* Flippable Card Container */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="aspect-[2/1] w-full cursor-pointer rounded-2xl bg-slate-950/70 border border-white/5 flex items-center justify-center p-6 text-center shadow-inner relative overflow-hidden transition-all hover:border-purple-500/30"
              >
                <div className="absolute top-3 right-3 text-[10px] text-slate-500 font-medium tracking-widest uppercase">
                  Click card to flip
                </div>
                
                <AnimatePresence mode="wait">
                  {!isFlipped ? (
                    <motion.div
                      key="front"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-lg text-white font-medium"
                    >
                      {studyCards[currentCardIndex].front}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-base text-purple-200"
                    >
                      {studyCards[currentCardIndex].back}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Scoring controls */}
              {isFlipped && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-4 gap-2 mt-4"
                >
                  <button
                    onClick={() => handleRate("again")}
                    className="flex flex-col items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 py-3 text-red-200 font-bold transition-colors"
                  >
                    <span>Again</span>
                    <span className="text-[10px] text-red-400 font-normal">1d</span>
                  </button>
                  <button
                    onClick={() => handleRate("hard")}
                    className="flex flex-col items-center justify-center rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 py-3 text-amber-200 font-bold transition-colors"
                  >
                    <span>Hard</span>
                    <span className="text-[10px] text-amber-400 font-normal">2d</span>
                  </button>
                  <button
                    onClick={() => handleRate("good")}
                    className="flex flex-col items-center justify-center rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 py-3 text-indigo-200 font-bold transition-colors"
                  >
                    <span>Good</span>
                    <span className="text-[10px] text-indigo-400 font-normal">4d</span>
                  </button>
                  <button
                    onClick={() => handleRate("easy")}
                    className="flex flex-col items-center justify-center rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 py-3 text-emerald-200 font-bold transition-colors"
                  >
                    <span>Easy</span>
                    <span className="text-[10px] text-emerald-400 font-normal">7d+</span>
                  </button>
                </motion.div>
              )}

              <div className="flex justify-start mt-4 border-t border-white/5 pt-3">
                <button
                  onClick={() => setActiveDeckSubjectId(null)}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Exit Study Session
                </button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DECKS OVERVIEW (CARDS) ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {subjects.map(subject => {
          const stats = deckStats[subject.id] || { total: 0, due: 0 };
          return (
            <Panel key={subject.id} className="p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-lg border border-white/10"
                    style={{ backgroundColor: `${subject.color}20` }}
                  >
                    {subject.emoji || "📚"}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{subject.name}</h3>
                    <p className="text-xs text-slate-400">{stats.total} total flashcards</p>
                  </div>
                </div>
                {stats.due > 0 ? (
                  <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-xs font-bold text-purple-300">
                    🔥 {stats.due} Due
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Up to date</span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => handleStartStudy(subject.id)}
                  disabled={stats.due === 0}
                  className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 px-3 py-2 text-xs font-bold text-white transition-all text-center"
                >
                  Review Due Deck
                </button>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* ─── ADD NEW FLASHCARD FORM ────────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
        {/* Normal Card creator form */}
        <Panel className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-purple-400" />
            Create Flashcard
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Subject Deck</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-xs text-white"
              >
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Front Side (Question)</label>
              <input
                value={newFront}
                onChange={e => setNewFront(e.target.value)}
                placeholder="e.g. What is gravity?"
                className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Back Side (Answer)</label>
              <input
                value={newBack}
                onChange={e => setNewBack(e.target.value)}
                placeholder="e.g. Force that pulls objects towards each other"
                className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              onClick={() => {
                handleAddCard(newFront, newBack, selectedSubjectId);
                setNewFront(""); setNewBack("");
              }}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
            >
              Add Card to Deck
            </button>
          </div>
        </Panel>

        {/* AI Card Creator Simulator */}
        <Panel className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-purple-400" />
            AI Flashcards Generator
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Target Subject Deck</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-xs text-white"
              >
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Paste Study Notes / Syllabus Texts</label>
              <textarea
                value={aiNoteInput}
                onChange={e => setAiNoteInput(e.target.value)}
                placeholder="Paste paragraph notes here. E.g. 'A vector has both magnitude and direction. Velocity is a vector quantity.'"
                rows={4}
                className="w-full rounded-lg bg-slate-800 border border-white/10 p-3 text-xs text-white focus:outline-none"
              />
            </div>
            <button
              onClick={handleAiParse}
              disabled={isGenerating || !aiNoteInput.trim() || !selectedSubjectId}
              className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 py-2.5 text-xs font-bold text-white hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isGenerating ? "⏳ Generating Cards..." : "🪄 Generate Cards from Notes"}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
