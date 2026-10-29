import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Brain, Sparkles, AlertCircle, Check, 
  X, RefreshCw, Layers, Keyboard, Play, HelpCircle, 
  ChevronDown, ChevronUp, BookOpen, Flame
} from "lucide-react";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { Panel } from "@/components/common/Panel";
import { useToast } from "@/components/common/Toast";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { calculateSM2, type ReviewGrade } from "@/utils/spacedRepetition";
import { callUnifiedAI } from "@/utils/aiClient";

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Flashcard {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  intervalDays: number; // Interval for Spaced Repetition (in days)
  easeFactor: number;   // Ease factor for spacing calculation (defaults to 2.5)
  dueDate: string;      // ISO string
  reviewedCount: number;
  phase?: "learning" | "review" | "relearning";
  learningStep?: number;
  lapses?: number;
  leech?: boolean;
  nextReviewAt?: string;
}

const STORAGE_KEY = "flowtrack_flashcards_v1";

const STARTER_CARDS_DATA = [
  {
    front: "What is the Time Complexity of Binary Search?",
    back: "**O(log n)** time complexity.\nIn every step, the search space is halved. Requires an array sorted in ascending or descending order.",
  },
  {
    front: "Explain the ACID properties in Database Systems.",
    back: "- **Atomicity**: All operations succeed or none persist.\n- **Consistency**: Database invariants remain strictly valid.\n- **Isolation**: Concurrent transactions cannot interfere.\n- **Durability**: Committed data survives power failure / crash.",
  },
  {
    front: "What is the difference between TCP and UDP?",
    back: "- **TCP**: Connection-oriented, 3-way handshake, reliable, packet reordering, flow control.\n- **UDP**: Connectionless, best-effort, low latency, no packet ordering (ideal for VoIP, video streaming, gaming).",
  },
  {
    front: "How does the SuperMemo SM-2 Algorithm calculate review intervals?",
    back: "Using the formula:\n$$I_n = I_{n-1} \\times EF$$\nWhere $I$ is the review interval in days and $EF$ is the Ease Factor (minimum 1.3, defaults to 2.5), updated based on your recall quality grade (1 to 4).",
  },
  {
    front: "What is an Idempotent HTTP method?",
    back: "An HTTP method is **idempotent** if multiple identical requests have the exact same intended effect on the server state as a single request (e.g. `GET`, `HEAD`, `PUT`, `DELETE`). **`POST` is NOT idempotent**.",
  },
  {
    front: "What is the CAP Theorem in Distributed Systems?",
    back: "A distributed system can guarantee at most **two out of three** properties simultaneously:\n1. **Consistency** (every read receives the most recent write)\n2. **Availability** (every non-failing node returns a response)\n3. **Partition Tolerance** (system continues to operate despite network drops).",
  }
];

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

// ─── SuperMemo-2 / Anki SM-2 Rating Helpers ──────────────────────────────────
function calculateNextReview(card: Flashcard, score: "again" | "hard" | "good" | "easy"): Flashcard {
  const gradeMap: Record<string, ReviewGrade> = {
    again: 1,
    hard: 2,
    good: 3,
    easy: 4,
  };
  const grade = gradeMap[score] || 3;

  const sm2Result = calculateSM2(
    grade,
    {
      repetition: card.reviewedCount || 0,
      easeFactor: card.easeFactor || 2.5,
      interval: card.intervalDays || 0,
      nextReviewDate: card.dueDate ? card.dueDate.split("T")[0] : new Date().toISOString().split("T")[0],
      phase: card.phase,
      learningStep: card.learningStep,
      lapses: card.lapses,
      leech: card.leech,
      nextReviewAt: card.nextReviewAt,
    },
    { cardId: card.id }
  );

  return {
    ...card,
    intervalDays: sm2Result.interval,
    easeFactor: sm2Result.easeFactor,
    reviewedCount: sm2Result.repetition,
    dueDate: sm2Result.nextReviewAt || new Date(sm2Result.nextReviewDate).toISOString(),
    phase: sm2Result.phase,
    learningStep: sm2Result.learningStep,
    lapses: sm2Result.lapses,
    leech: sm2Result.leech,
    nextReviewAt: sm2Result.nextReviewAt,
  };
}

function getPredictedInterval(card: Flashcard, score: "again" | "hard" | "good" | "easy"): string {
  const gradeMap: Record<string, ReviewGrade> = {
    again: 1,
    hard: 2,
    good: 3,
    easy: 4,
  };
  const grade = gradeMap[score] || 3;
  const res = calculateSM2(
    grade,
    {
      repetition: card.reviewedCount || 0,
      easeFactor: card.easeFactor || 2.5,
      interval: card.intervalDays || 0,
      nextReviewDate: card.dueDate ? card.dueDate.split("T")[0] : new Date().toISOString().split("T")[0],
      phase: card.phase,
      learningStep: card.learningStep,
      lapses: card.lapses,
      leech: card.leech,
      nextReviewAt: card.nextReviewAt,
    },
    { cardId: card.id }
  );

  if (res.phase === "learning" && res.nextReviewAt) {
    const diffMin = Math.max(1, Math.round((new Date(res.nextReviewAt).getTime() - Date.now()) / 60000));
    return diffMin < 60 ? `${diffMin}m` : `${Math.round(diffMin / 60)}h`;
  }
  return res.interval <= 0 ? "10m" : `${res.interval}d`;
}

export function FlashcardsPage() {
  const subjects = useAppStore((s: AppState) => s.subjects);
  const aiConfig = useAppStore((s: AppState) => s.aiConfig);
  const [cards, setCards] = useState<Flashcard[]>(loadFlashcards);
  const { showToast } = useToast();
  
  // Creation state
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => subjects[0]?.id || "");
  
  // Study mode states
  const [activeDeckSubjectId, setActiveDeckSubjectId] = useState<string | null>(null);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<"due" | "all">("due");

  // AI prompt helper
  const [aiNoteInput, setAiNoteInput] = useState("");
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Manage cards viewer state
  const [showCardBrowser, setShowCardBrowser] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  // Auto-select first subject if not set
  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

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
  const handleAddCard = useCallback((frontTxt: string, backTxt: string, subId: string) => {
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
    showToast("📝 Flashcard created!", "success");
  }, [showToast]);

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    showToast("🗑️ Flashcard deleted", "info");
  };

  // Pre-seed Starter Flashcards
  const handleLoadStarterDecks = () => {
    const targetSubId = selectedSubjectId || subjects[0]?.id || "general";
    const newDeck: Flashcard[] = STARTER_CARDS_DATA.map((item, idx) => ({
      id: `starter-${Date.now()}-${idx}`,
      subjectId: targetSubId,
      front: item.front,
      back: item.back,
      intervalDays: 0,
      easeFactor: 2.5,
      dueDate: new Date().toISOString(),
      reviewedCount: 0,
    }));

    setCards(prev => [...prev, ...newDeck]);
    showToast(`🚀 Loaded ${newDeck.length} Master Flashcards!`, "success");
  };

  // Start study session for a subject deck
  const handleStartStudy = (subId: string, mode: "due" | "all" = "due") => {
    const now = new Date();
    const filtered = mode === "due"
      ? cards.filter(c => c.subjectId === subId && new Date(c.dueDate) <= now)
      : cards.filter(c => c.subjectId === subId);

    if (filtered.length === 0) {
      if (mode === "due") {
        showToast("ℹ️ No cards due right now! Click '⚡ Practice All' to cram anytime.", "info");
      } else {
        showToast("⚠️ This deck is empty. Add a card or load starter decks below!", "warning");
      }
      return;
    }

    setStudyMode(mode);
    setStudyCards(filtered);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setActiveDeckSubjectId(subId);
  };

  // Process rating score choice
  const handleRate = useCallback((score: "again" | "hard" | "good" | "easy") => {
    if (!studyCards[currentCardIndex]) return;
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
      showToast("🎓 Review session complete! Good job keeping your memory fresh.", "success");
    }
  }, [studyCards, currentCardIndex, showToast]);

  // Keyboard Navigation Listener for Study Mode
  useEffect(() => {
    if (!activeDeckSubjectId || studyCards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setActiveDeckSubjectId(null);
      } else if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate("again");
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate("hard");
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate("good");
        } else if (e.key === "4") {
          e.preventDefault();
          handleRate("easy");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDeckSubjectId, studyCards.length, isFlipped, handleRate]);

  // Unified AI Flashcard Generator
  const handleAiParse = async () => {
    if (!aiNoteInput.trim() || !selectedSubjectId) return;
    
    setIsGenerating(true);
    let count = 0;

    try {
      const userPrompt = `You are a professional study tool. Analyze the following notes and generate a JSON array of flashcards. Each flashcard should have a clear, concise question "front" and answer "back". Produce ONLY valid JSON inside markdown block or raw text.
Format:
[
  { "front": "What is ...?", "back": "..." }
]

Notes:
${aiNoteInput}`;

      const sysPrompt = "You are FlowTrack Pro's academic AI assistant. Generate clear, high-yield study flashcards formatted strictly as a JSON array of objects with 'front' and 'back' fields.";
      
      const aiRes = await callUnifiedAI(userPrompt, sysPrompt);
      if (aiRes.success && aiRes.text) {
        const jsonMatch = aiRes.text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const cleanJson = jsonMatch ? jsonMatch[0] : aiRes.text.trim();
        try {
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed)) {
            parsed.forEach((c: any) => {
              if (c.front && c.back) {
                handleAddCard(c.front, c.back, selectedSubjectId);
                count++;
              }
            });
          }
        } catch (parseErr) {
          console.warn("JSON parse error, falling back to smart line splitter", parseErr);
        }
      }
    } catch (err) {
      console.warn("Unified AI call failed, switching to local rule-based fallback:", err);
    }

    // Fallback: Rule-based local parser if AI failed or returned 0
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
          handleAddCard("Explain key concept:", clean, selectedSubjectId);
          count++;
        }
      });
    }

    setAiNoteInput("");
    setIsGenerating(false);
    setShowAiHelper(false);
    showToast(`✨ Generated ${count} flashcards from notes!`, count > 0 ? "success" : "info");
  };

  const activeSubject = subjects.find(s => s.id === activeDeckSubjectId);

  // Active AI Provider info
  const activeProvider = aiConfig?.provider || "local_rules";
  const hasUserApiKey = Boolean(aiConfig?.apiKey || (aiConfig?.apiKeys && aiConfig.apiKeys[activeProvider]));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            SRS Flashcards (Spaced Repetition)
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            SuperMemo SM-2 neural memory engine with automated interval optimization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>How it works</span>
          </button>
          {cards.length === 0 && (
            <button
              onClick={handleLoadStarterDecks}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition shadow-lg shadow-purple-600/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Starter Decks</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── EDUCATIONAL GUIDE ACCORDION ────────────────────────────────────── */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Panel className="p-4 bg-purple-950/20 border-purple-500/30 text-xs space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-white flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Ebbinghaus Forgetting Curve & The SuperMemo SM-2 Algorithm
                </h3>
                <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-300 leading-relaxed">
                When you learn new facts, your retention drops exponentially within 24 hours. Spaced repetition recalculates when you are about to forget and tests you at optimal intervals:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30">
                  <span className="font-bold text-red-300">1. Again</span>
                  <p className="text-slate-400 text-[10px] mt-1">Resets interval back to 10 minutes. Weak neural pathway.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                  <span className="font-bold text-amber-300">2. Hard</span>
                  <p className="text-slate-400 text-[10px] mt-1">Slightly extends interval (1.2x). Effortful recall.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <span className="font-bold text-indigo-300">3. Good</span>
                  <p className="text-slate-400 text-[10px] mt-1">Standard SM-2 multiplier (I × EF). Strong consolidation.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <span className="font-bold text-emerald-300">4. Easy</span>
                  <p className="text-slate-400 text-[10px] mt-1">Bonus multiplier (I × EF × 1.3). Mastered concept.</p>
                </div>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── STUDY SESSION INTERFACE ────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeDeckSubjectId && studyCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Panel className="border-l-4 border-purple-500 bg-slate-900/80 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {activeSubject?.name || "Subject Deck"}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    studyMode === "due" 
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  }`}>
                    {studyMode === "due" ? "🔥 Due Review" : "⚡ Cram Practice"}
                  </span>
                </div>
                <span className="text-xs text-purple-400 font-mono font-bold">
                  Card {currentCardIndex + 1} of {studyCards.length}
                </span>
              </div>

              {/* Flippable Card Container */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="min-h-[220px] w-full cursor-pointer rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-inner relative overflow-hidden transition-all hover:border-purple-500/40 select-none group"
              >
                <div className="absolute top-3 right-3 text-[10px] text-slate-500 font-medium tracking-widest uppercase flex items-center gap-1 group-hover:text-purple-400 transition">
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Space / Enter to flip</span>
                </div>
                {studyCards[currentCardIndex]?.leech && (
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                    ⚠️ Leech Card (8+ lapses)
                  </div>
                )}
                
                <AnimatePresence mode="wait">
                  {!isFlipped ? (
                    <motion.div
                      key="front"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-lg text-white font-medium max-w-xl"
                    >
                      <MarkdownRenderer content={studyCards[currentCardIndex].front} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-base text-purple-200 max-w-xl"
                    >
                      <MarkdownRenderer content={studyCards[currentCardIndex].back} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Scoring controls */}
              {isFlipped && studyCards[currentCardIndex] && (
                <div className="space-y-3 mt-4">
                  {/* Anki / SuperMemo SM-2 Live Algorithm HUD */}
                  <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="font-bold text-purple-200">FlowTrack Neural Memory Engine</span>
                        <span className="ml-2 font-mono text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded-md">
                          I<sub>n</sub> = I<sub>n-1</sub> × EF
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
                      <span>Rep: <b className="text-white">{studyCards[currentCardIndex].reviewedCount || 0}</b></span>
                      <span>EF: <b className="text-cyan-400">{(studyCards[currentCardIndex].easeFactor || 2.5).toFixed(2)}</b></span>
                      <span>Interval: <b className="text-emerald-400">{studyCards[currentCardIndex].intervalDays || 0}d</b></span>
                      {studyCards[currentCardIndex].phase && (
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-purple-200 text-[10px] font-semibold capitalize">
                          {studyCards[currentCardIndex].phase}
                        </span>
                      )}
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-4 gap-2"
                  >
                    <button
                      onClick={() => handleRate("again")}
                      className="flex flex-col items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 py-3 text-red-200 font-bold transition-colors group cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        Again <kbd className="text-[10px] bg-red-950/60 px-1.5 rounded font-mono text-red-300">1</kbd>
                      </span>
                      <span className="text-[10px] text-red-400 font-mono font-medium group-hover:underline">
                        {getPredictedInterval(studyCards[currentCardIndex], "again")}
                      </span>
                    </button>
                    <button
                      onClick={() => handleRate("hard")}
                      className="flex flex-col items-center justify-center rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 py-3 text-amber-200 font-bold transition-colors group cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        Hard <kbd className="text-[10px] bg-amber-950/60 px-1.5 rounded font-mono text-amber-300">2</kbd>
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono font-medium group-hover:underline">
                        {getPredictedInterval(studyCards[currentCardIndex], "hard")}
                      </span>
                    </button>
                    <button
                      onClick={() => handleRate("good")}
                      className="flex flex-col items-center justify-center rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 py-3 text-indigo-200 font-bold transition-colors group cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        Good <kbd className="text-[10px] bg-indigo-950/60 px-1.5 rounded font-mono text-indigo-300">3</kbd>
                      </span>
                      <span className="text-[10px] text-indigo-400 font-mono font-medium group-hover:underline">
                        {getPredictedInterval(studyCards[currentCardIndex], "good")}
                      </span>
                    </button>
                    <button
                      onClick={() => handleRate("easy")}
                      className="flex flex-col items-center justify-center rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 py-3 text-emerald-200 font-bold transition-colors group cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        Easy <kbd className="text-[10px] bg-emerald-950/60 px-1.5 rounded font-mono text-emerald-300">4</kbd>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-medium group-hover:underline">
                        {getPredictedInterval(studyCards[currentCardIndex], "easy")}
                      </span>
                    </button>
                  </motion.div>
                </div>
              )}

              <div className="flex justify-between items-center mt-4 border-t border-white/5 pt-3 text-xs text-slate-400">
                <span className="font-mono text-[10px]">
                  Hotkeys: [Space/Enter: Flip] [1-4: Rate] [Esc: Exit]
                </span>
                <button
                  onClick={() => setActiveDeckSubjectId(null)}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
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
                  <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-xs font-bold text-purple-300 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-purple-400" />
                    <span>{stats.due} Due</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Up to date</span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => handleStartStudy(subject.id, "due")}
                  disabled={stats.due === 0}
                  className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 px-3 py-2 text-xs font-bold text-white transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Review Due ({stats.due})</span>
                </button>
                <button
                  onClick={() => handleStartStudy(subject.id, "all")}
                  disabled={stats.total === 0}
                  title="Practice all cards in deck regardless of due time"
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition-all text-center"
                >
                  ⚡ Practice All ({stats.total})
                </button>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* ─── ADD NEW FLASHCARD FORM & AI GENERATOR ───────────────────────────── */}
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
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Front Side (Question)</label>
              <input
                value={newFront}
                onChange={e => setNewFront(e.target.value)}
                placeholder="e.g. What is the Big-O of QuickSort average case?"
                className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Back Side (Answer)</label>
              <textarea
                value={newBack}
                onChange={e => setNewBack(e.target.value)}
                placeholder="e.g. O(n log n) with random pivot selection"
                rows={3}
                className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-xs text-white resize-none"
              />
            </div>
            <button
              onClick={() => {
                handleAddCard(newFront, newBack, selectedSubjectId);
                setNewFront(""); 
                setNewBack("");
              }}
              disabled={!newFront.trim() || !newBack.trim() || !selectedSubjectId}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-40 transition"
            >
              Add Card to Deck
            </button>
          </div>
        </Panel>

        {/* AI Card Creator Unified with aiConfig */}
        <Panel className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Flashcards Generator
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
              {hasUserApiKey ? `⚡ ${activeProvider.toUpperCase()}` : "🧠 Smart Engine"}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Target Subject Deck</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-xs text-white"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">
                Paste Study Notes, Syllabus, or Book Excerpt
              </label>
              <textarea
                value={aiNoteInput}
                onChange={e => setAiNoteInput(e.target.value)}
                placeholder="Paste paragraph notes here. E.g. 'A vector has both magnitude and direction. Velocity is a vector quantity while speed is a scalar quantity.'"
                rows={4}
                className="w-full rounded-lg bg-slate-800 border border-white/10 p-3 text-xs text-white focus:outline-none"
              />
            </div>
            <button
              onClick={handleAiParse}
              disabled={isGenerating || !aiNoteInput.trim() || !selectedSubjectId}
              className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 py-2.5 text-xs font-bold text-white hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Neural Flashcards...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Cards from Notes</span>
                </>
              )}
            </button>
          </div>
        </Panel>
      </div>

      {/* ─── CARD BROWSER / DECK MANAGEMENT ─────────────────────────────────── */}
      <Panel className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white">
              Card Management ({cards.length} Total Flashcards)
            </h3>
          </div>
          <button
            onClick={() => setShowCardBrowser(!showCardBrowser)}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
          >
            {showCardBrowser ? "Hide Cards" : "Browse All Cards"}
            {showCardBrowser ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showCardBrowser && (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <input
              type="text"
              placeholder="Search flashcards by question or answer..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500"
            />

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {cards
                .filter(c => 
                  c.front.toLowerCase().includes(searchFilter.toLowerCase()) || 
                  c.back.toLowerCase().includes(searchFilter.toLowerCase())
                )
                .map(card => {
                  const sub = subjects.find(s => s.id === card.subjectId);
                  return (
                    <div 
                      key={card.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span 
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10"
                            style={{ backgroundColor: `${sub?.color || "#a855f7"}30` }}
                          >
                            {sub?.name || "General"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Rep: {card.reviewedCount || 0} • Interval: {card.intervalDays || 0}d
                          </span>
                        </div>
                        <p className="font-semibold text-white truncate">{card.front}</p>
                        <p className="text-slate-400 text-[11px] line-clamp-1">{card.back}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Delete flashcard"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              {cards.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No flashcards created yet. Click "Load Starter Decks" or generate some with AI above!
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
