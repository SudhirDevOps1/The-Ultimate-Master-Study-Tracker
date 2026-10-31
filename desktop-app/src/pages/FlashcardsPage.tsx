import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Brain, Sparkles, AlertCircle, Check, 
  X, RefreshCw, Layers, Keyboard, Play, HelpCircle, 
  ChevronDown, ChevronUp, BookOpen, Flame, Edit2, Search,
  ArrowRight, ShieldCheck, Award, Zap, BarChart3, CheckCircle2,
  RotateCcw, Clock, Library
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
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"decks" | "create" | "browse" | "analytics">("decks");

  // Creation state
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => subjects[0]?.id || "");
  const [createReverseCard, setCreateReverseCard] = useState(false);
  
  // Study mode states
  const [activeDeckSubjectId, setActiveDeckSubjectId] = useState<string | null>(null);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<"due" | "all">("due");
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Card editor modal state
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  // AI prompt helper
  const [aiNoteInput, setAiNoteInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Manage cards viewer state
  const [searchFilter, setSearchFilter] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");
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
      setActiveTab("create");
      localStorage.removeItem("flowtrack_temp_flashcard_input");
    }
  }, []);

  // Aggregate cards per subject
  const deckStats = useMemo(() => {
    const stats: Record<string, { total: number; due: number; mastered: number; masteryPct: number }> = {};
    subjects.forEach(sub => {
      stats[sub.id] = { total: 0, due: 0, mastered: 0, masteryPct: 0 };
    });

    const now = new Date();
    cards.forEach(c => {
      if (stats[c.subjectId]) {
        stats[c.subjectId].total += 1;
        if (new Date(c.dueDate) <= now) {
          stats[c.subjectId].due += 1;
        }
        if ((c.reviewedCount >= 3 || c.intervalDays >= 7) && (c.easeFactor || 2.5) >= 2.0) {
          stats[c.subjectId].mastered += 1;
        }
      }
    });

    subjects.forEach(sub => {
      const s = stats[sub.id];
      if (s && s.total > 0) {
        s.masteryPct = Math.round((s.mastered / s.total) * 100);
      }
    });

    return stats;
  }, [cards, subjects]);

  // Global Retention Stats
  const globalStats = useMemo(() => {
    const total = cards.length;
    const now = new Date();
    const dueCount = cards.filter(c => new Date(c.dueDate) <= now).length;
    const masteredCount = cards.filter(c => (c.reviewedCount >= 3 || c.intervalDays >= 7) && (c.easeFactor || 2.5) >= 2.0).length;
    const avgEase = total > 0 ? (cards.reduce((sum, c) => sum + (c.easeFactor || 2.5), 0) / total).toFixed(2) : "2.50";
    const masteryRate = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

    return {
      total,
      dueCount,
      masteredCount,
      avgEase,
      masteryRate
    };
  }, [cards]);

  // Add Card
  const handleAddCard = useCallback((frontTxt: string, backTxt: string, subId: string, alsoReverse = false) => {
    if (!frontTxt.trim() || !backTxt.trim() || !subId) return;
    const newCards: Flashcard[] = [
      {
        id: crypto.randomUUID(),
        subjectId: subId,
        front: frontTxt.trim(),
        back: backTxt.trim(),
        intervalDays: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
        reviewedCount: 0,
      }
    ];

    if (alsoReverse) {
      newCards.push({
        id: crypto.randomUUID(),
        subjectId: subId,
        front: backTxt.trim(),
        back: frontTxt.trim(),
        intervalDays: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
        reviewedCount: 0,
      });
    }

    setCards(prev => [...prev, ...newCards]);
    showToast(alsoReverse ? "📝 Created 2 bidirectional flashcards!" : "📝 Flashcard created!", "success");
  }, [showToast]);

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    showToast("🗑️ Flashcard deleted", "info");
  };

  // Start Card Edit
  const handleOpenEdit = (card: Flashcard) => {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const handleSaveEdit = () => {
    if (!editingCard || !editFront.trim() || !editBack.trim()) return;
    setCards(prev => prev.map(c => c.id === editingCard.id ? { ...c, front: editFront.trim(), back: editBack.trim() } : c));
    setEditingCard(null);
    showToast("✏️ Flashcard updated successfully!", "success");
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
    setSessionReviewedCount(0);
    setIsSessionComplete(false);
    setActiveDeckSubjectId(subId);
  };

  // Process rating score choice
  const handleRate = useCallback((score: "again" | "hard" | "good" | "easy") => {
    if (!studyCards[currentCardIndex]) return;
    const card = studyCards[currentCardIndex];
    const updatedCard = calculateNextReview(card, score);
    
    // Update master cards list
    setCards(prev => prev.map(c => c.id === card.id ? updatedCard : c));
    setSessionReviewedCount(c => c + 1);

    // Progress in queue
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(idx => idx + 1);
      setIsFlipped(false);
    } else {
      setIsSessionComplete(true);
      showToast("🎓 Review session complete! Excellent active recall work.", "success");
    }
  }, [studyCards, currentCardIndex, showToast]);

  // Keyboard Navigation Listener for Study Mode
  useEffect(() => {
    if (!activeDeckSubjectId || studyCards.length === 0 || isSessionComplete) return;

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
  }, [activeDeckSubjectId, studyCards.length, isFlipped, isSessionComplete, handleRate]);

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
                handleAddCard(c.front, c.back, selectedSubjectId, createReverseCard);
                count += createReverseCard ? 2 : 1;
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
          handleAddCard(`What is ${matches[1].trim()}?`, matches[2].trim(), selectedSubjectId, createReverseCard);
          count += createReverseCard ? 2 : 1;
        } else if (clean.length > 15) {
          handleAddCard("Explain key concept:", clean, selectedSubjectId, createReverseCard);
          count += createReverseCard ? 2 : 1;
        }
      });
    }

    setAiNoteInput("");
    setIsGenerating(false);
    showToast(`✨ Generated ${count} flashcards from notes!`, count > 0 ? "success" : "info");
    setActiveTab("decks");
  };

  const activeSubject = subjects.find(s => s.id === activeDeckSubjectId);
  const activeProvider = aiConfig?.provider || "local_rules";
  const hasUserApiKey = Boolean(aiConfig?.apiKey || (aiConfig?.apiKeys && aiConfig.apiKeys[activeProvider]));

  // Filtered cards for Browser tab
  const browserFilteredCards = useMemo(() => {
    return cards.filter(c => {
      const matchesSearch = c.front.toLowerCase().includes(searchFilter.toLowerCase()) || 
                            c.back.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesSubject = filterSubjectId === "all" || c.subjectId === filterSubjectId;
      return matchesSearch && matchesSubject;
    });
  }, [cards, searchFilter, filterSubjectId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ─── Modern Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Brain className="h-5 w-5" />
            </span>
            SRS Flashcards & Neural Spaced Repetition
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            SuperMemo SM-2 neural memory engine with automated interval optimization & active recall.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:border-purple-500/30 transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>How SM-2 Works</span>
          </button>

          {cards.length === 0 && (
            <button
              onClick={handleLoadStarterDecks}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-purple-600/20 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Starter Decks</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Top Stats & Retention Health Bar ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Flashcards</span>
            <Library className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">{globalStats.total} <span className="text-xs font-normal text-slate-400">cards</span></div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across {subjects.length} subject decks</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Due for Review</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">{globalStats.dueCount} <span className="text-xs font-normal text-slate-400">due today</span></div>
          <div className="text-[10px] text-slate-500 mt-0.5">{globalStats.dueCount > 0 ? "Ready for active recall" : "All decks caught up!"}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Deck Mastery Rate</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{globalStats.masteryRate}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{globalStats.masteredCount} cards in long-term memory</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Average Ease Factor</span>
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">{globalStats.avgEase} <span className="text-xs font-normal text-slate-400">EF</span></div>
          <div className="text-[10px] text-slate-500 mt-0.5">Floor: 1.30 • Base: 2.50</div>
        </div>
      </div>

      {/* ─── EDUCATIONAL GUIDE ACCORDION ────────────────────────────── */}
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

      {/* ─── IMMERSIVE ZEN STUDY SESSION INTERFACE ───────────────────── */}
      <AnimatePresence mode="wait">
        {activeDeckSubjectId && studyCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-4"
          >
            {isSessionComplete ? (
              /* Session Completion Card */
              <Panel className="p-8 text-center space-y-4 bg-gradient-to-b from-purple-950/40 to-slate-900/80 border-purple-500/30 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
                  🎓
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Review Session Completed!</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    You reviewed <strong>{sessionReviewedCount}</strong> cards in <strong>{activeSubject?.name || "Subject Deck"}</strong>.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveDeckSubjectId(null)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all shadow-lg shadow-purple-600/20"
                  >
                    Return to Decks Hub
                  </button>
                  <button
                    onClick={() => handleStartStudy(activeDeckSubjectId, "all")}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-300 transition-all"
                  >
                    ⚡ Practice All Again
                  </button>
                </div>
              </Panel>
            ) : (
              /* Active Card Study Screen */
              <Panel className="border-l-4 border-purple-500 bg-slate-900/90 p-5 shadow-2xl space-y-4">
                {/* Header & Progress Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {activeSubject?.name || "Subject Deck"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        studyMode === "due" 
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}>
                        {studyMode === "due" ? "🔥 Due Review" : "⚡ Practice All"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-purple-300 font-mono font-bold">
                        Card {currentCardIndex + 1} of {studyCards.length}
                      </span>
                      <button
                        onClick={() => setActiveDeckSubjectId(null)}
                        className="rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-slate-400 hover:text-white transition"
                        title="Exit review session (Esc)"
                      >
                        Exit
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${Math.round(((currentCardIndex + 1) / studyCards.length) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Tactile 3D Flippable Card */}
                <div 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="min-h-[240px] w-full cursor-pointer rounded-2xl bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-2xl relative overflow-hidden transition-all hover:border-purple-500/40 select-none group"
                >
                  <div className="absolute top-3.5 right-3.5 text-[10px] text-slate-500 font-medium tracking-widest uppercase flex items-center gap-1 group-hover:text-purple-400 transition">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Space to flip</span>
                  </div>

                  <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                      {isFlipped ? "Answer (Back)" : "Question (Front)"}
                    </span>
                    {studyCards[currentCardIndex]?.leech && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                        ⚠️ Leech Card (8+ lapses)
                      </span>
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {!isFlipped ? (
                      <motion.div
                        key="front"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-lg text-white font-medium max-w-xl py-4"
                      >
                        <MarkdownRenderer content={studyCards[currentCardIndex].front} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="back"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="text-base text-purple-200 max-w-xl py-4"
                      >
                        <MarkdownRenderer content={studyCards[currentCardIndex].back} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Scoring controls */}
                {isFlipped && studyCards[currentCardIndex] && (
                  <div className="space-y-3 pt-1">
                    {/* Anki / SuperMemo SM-2 Live Algorithm HUD */}
                    <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <span className="font-bold text-purple-200">Neural Memory Matrix</span>
                          <span className="ml-2 font-mono text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded-md">
                            I<sub>n</sub> = I<sub>n-1</sub> × EF
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
                        <span>Rep: <b className="text-white">{studyCards[currentCardIndex].reviewedCount || 0}</b></span>
                        <span>EF: <b className="text-cyan-400">{(studyCards[currentCardIndex].easeFactor || 2.5).toFixed(2)}</b></span>
                        <span>Interval: <b className="text-emerald-400">{studyCards[currentCardIndex].intervalDays || 0}d</b></span>
                      </div>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-4 gap-2.5"
                    >
                      <button
                        onClick={() => handleRate("again")}
                        className="flex flex-col items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 py-3 text-red-200 font-bold transition-all group active:scale-95 shadow-sm"
                      >
                        <span className="flex items-center gap-1">
                          Again <kbd className="text-[10px] bg-red-950/60 px-1.5 rounded font-mono text-red-300">1</kbd>
                        </span>
                        <span className="text-[10px] text-red-400 font-mono font-medium group-hover:underline mt-0.5">
                          {getPredictedInterval(studyCards[currentCardIndex], "again")}
                        </span>
                      </button>

                      <button
                        onClick={() => handleRate("hard")}
                        className="flex flex-col items-center justify-center rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 py-3 text-amber-200 font-bold transition-all group active:scale-95 shadow-sm"
                      >
                        <span className="flex items-center gap-1">
                          Hard <kbd className="text-[10px] bg-amber-950/60 px-1.5 rounded font-mono text-amber-300">2</kbd>
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono font-medium group-hover:underline mt-0.5">
                          {getPredictedInterval(studyCards[currentCardIndex], "hard")}
                        </span>
                      </button>

                      <button
                        onClick={() => handleRate("good")}
                        className="flex flex-col items-center justify-center rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 py-3 text-indigo-200 font-bold transition-all group active:scale-95 shadow-sm"
                      >
                        <span className="flex items-center gap-1">
                          Good <kbd className="text-[10px] bg-indigo-950/60 px-1.5 rounded font-mono text-indigo-300">3</kbd>
                        </span>
                        <span className="text-[10px] text-indigo-400 font-mono font-medium group-hover:underline mt-0.5">
                          {getPredictedInterval(studyCards[currentCardIndex], "good")}
                        </span>
                      </button>

                      <button
                        onClick={() => handleRate("easy")}
                        className="flex flex-col items-center justify-center rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 py-3 text-emerald-200 font-bold transition-all group active:scale-95 shadow-sm"
                      >
                        <span className="flex items-center gap-1">
                          Easy <kbd className="text-[10px] bg-emerald-950/60 px-1.5 rounded font-mono text-emerald-300">4</kbd>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-medium group-hover:underline mt-0.5">
                          {getPredictedInterval(studyCards[currentCardIndex], "easy")}
                        </span>
                      </button>
                    </motion.div>
                  </div>
                )}
              </Panel>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Navigation View Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("decks")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "decks"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Subject Decks ({subjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("create")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "create"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create & AI Generator</span>
        </button>

        <button
          onClick={() => setActiveTab("browse")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "browse"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Card Management ({cards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "analytics"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Retention Analytics</span>
        </button>
      </div>

      {/* ─── TAB 1: SUBJECT DECKS HUB ──────────────────────────────── */}
      {activeTab === "decks" && (
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map(subject => {
            const stats = deckStats[subject.id] || { total: 0, due: 0, mastered: 0, masteryPct: 0 };
            return (
              <Panel key={subject.id} className="p-4 flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-11 w-11 rounded-2xl flex items-center justify-center text-xl border border-white/10 shadow-inner"
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
                    <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-xs font-bold text-purple-300 flex items-center gap-1 shadow-sm">
                      <Flame className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      <span>{stats.due} Due</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Up to date</span>
                  )}
                </div>

                {/* Deck Mastery Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Deck Mastery</span>
                    <span className="font-mono font-bold text-purple-400">{stats.masteryPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        backgroundColor: subject.color || "#a855f7",
                        width: `${stats.masteryPct}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleStartStudy(subject.id, "due")}
                    disabled={stats.due === 0}
                    className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 px-3.5 py-2 text-xs font-bold text-white transition-all text-center flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Review Due ({stats.due})</span>
                  </button>
                  <button
                    onClick={() => handleStartStudy(subject.id, "all")}
                    disabled={stats.total === 0}
                    title="Practice all cards in deck regardless of due date"
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-white/10 px-3.5 py-2 text-xs font-bold text-slate-200 transition-all text-center"
                  >
                    ⚡ Practice All ({stats.total})
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* ─── TAB 2: CREATE & AI GENERATOR ──────────────────────────── */}
      {activeTab === "create" && (
        <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
          {/* Manual Card Creator */}
          <Panel className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Plus className="h-4 w-4 text-purple-400" />
              Create Flashcard
            </h3>
            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Subject Deck</label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Front Side (Question / Concept)</label>
                <input
                  value={newFront}
                  onChange={e => setNewFront(e.target.value)}
                  placeholder="e.g. What is the Big-O of QuickSort average case?"
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Back Side (Answer / Derivation)</label>
                <textarea
                  value={newBack}
                  onChange={e => setNewBack(e.target.value)}
                  placeholder="e.g. O(n log n) with random pivot selection."
                  rows={4}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Bidirectional Reverse Card Option */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createReverseCard}
                  onChange={e => setCreateReverseCard(e.target.checked)}
                  className="rounded bg-slate-900 border-white/20 text-purple-600 focus:ring-0"
                />
                <span>Generate reverse card as well (Q ↔ A)</span>
              </label>

              <button
                onClick={() => {
                  handleAddCard(newFront, newBack, selectedSubjectId, createReverseCard);
                  setNewFront(""); 
                  setNewBack("");
                }}
                disabled={!newFront.trim() || !newBack.trim() || !selectedSubjectId}
                className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 border border-purple-500/30 py-2.5 text-xs font-bold text-white disabled:opacity-40 transition shadow-lg shadow-purple-600/20 active:scale-95"
              >
                Add Card to Deck
              </button>
            </div>
          </Panel>

          {/* AI Card Creator Unified with aiConfig */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-400" />
                AI Flashcards Generator
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                {hasUserApiKey ? `⚡ ${activeProvider.toUpperCase()}` : "🧠 Smart Engine"}
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Target Subject Deck</label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                  Paste Study Notes, Syllabus, or Book Excerpt
                </label>
                <textarea
                  value={aiNoteInput}
                  onChange={e => setAiNoteInput(e.target.value)}
                  placeholder="Paste paragraph notes here. E.g. 'A vector has both magnitude and direction. Velocity is a vector quantity while speed is a scalar quantity.'"
                  rows={5}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={handleAiParse}
                disabled={isGenerating || !aiNoteInput.trim() || !selectedSubjectId}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-3 text-xs font-bold text-white active:scale-95 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
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
      )}

      {/* ─── TAB 3: CARD MANAGEMENT (BROWSER) ──────────────────────── */}
      {activeTab === "browse" && (
        <Panel className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" />
                Flashcard Deck Browser ({cards.length} Total Cards)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Search, inspect, edit, or delete cards across all study subjects.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterSubjectId}
                onChange={e => setFilterSubjectId(e.target.value)}
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-white"
              >
                <option value="all">All Subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search flashcards by question, concept, or answer..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {browserFilteredCards.map(card => {
              const sub = subjects.find(s => s.id === card.subjectId);
              const isMastered = (card.reviewedCount >= 3 || card.intervalDays >= 7);

              return (
                <div 
                  key={card.id}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-purple-500/30 flex items-start justify-between gap-3 text-xs transition-all"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10"
                        style={{ backgroundColor: `${sub?.color || "#a855f7"}30` }}
                      >
                        {sub?.name || "General"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Rep: {card.reviewedCount || 0} • Interval: {card.intervalDays || 0}d • EF: {(card.easeFactor || 2.5).toFixed(2)}
                      </span>
                      {isMastered && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                          Mastered
                        </span>
                      )}
                      {card.leech && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                          Leech
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-white">{card.front}</p>
                    <p className="text-slate-400 text-[11px] line-clamp-2">{card.back}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(card)}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition"
                      title="Edit flashcard"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Delete flashcard"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {browserFilteredCards.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No flashcards found matching "{searchFilter}".
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* ─── TAB 4: RETENTION ANALYTICS ────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="grid gap-5 md:grid-cols-2">
          <Panel className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              Memory Retention Mechanics
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Long-Term Memory Mastery:</span>
                <span className="font-bold text-emerald-400">{globalStats.masteryRate}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all" 
                  style={{ width: `${globalStats.masteryRate}%` }} 
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cards graduated beyond 7 days are firmly consolidated in long-term synaptic memory according to Ebbinghaus spacing models.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Deterministic Fuzzing:</strong> FlowTrack Pro introduces subtle $\pm 5\%$ fuzzing for long review intervals to prevent all cards from landing on the exact same review day.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Leech Protection:</strong> Cards failed 8+ times are marked as Leeches so you can reformulate or simplify the underlying concept.
                </span>
              </div>
            </div>
          </Panel>

          <Panel className="space-y-4 bg-gradient-to-br from-purple-950/20 to-slate-900/40 border-purple-500/20">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-400" />
              Active Recall Best Practices
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Effortful Retrieval Beats Passive Reading
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Spend 5-10 seconds genuinely attempting to pull the answer from memory before hitting Space to reveal the back. The harder the retrieval, the stronger the synaptic consolidation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Keep Cards Atomic
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  One question should test exactly one fact or equation. Multi-part questions lead to partial recall and interval decay.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ─── CARD EDIT MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {editingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-purple-400" />
                  Edit Flashcard
                </h3>
                <button
                  onClick={() => setEditingCard(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Question (Front)</label>
                  <input
                    value={editFront}
                    onChange={e => setEditFront(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Answer (Back)</label>
                  <textarea
                    value={editBack}
                    onChange={e => setEditBack(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => setEditingCard(null)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/20"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
