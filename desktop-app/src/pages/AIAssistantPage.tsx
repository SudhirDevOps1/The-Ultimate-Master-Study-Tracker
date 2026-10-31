import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Brain, Send, Settings2, ShieldCheck, Cpu, Bot, User, Zap,
  Plus, MessageSquare, Trash2, X, RefreshCw, PanelLeftClose,
  PanelLeftOpen, ChevronDown, Check, Copy, Sparkles, SlidersHorizontal, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { AiConfig } from "@/types/models";
import { useStreak } from "@/hooks/useStreak";
import { toDurationLabel } from "@/utils/time";
import { db } from "@/lib/db";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { fetchLiveModels, FALLBACK_MODELS, type FetchedModel } from "@/utils/aiModelFetcher";
import { decodeAiProviderError } from "@/utils/aiClient";

// --- Universal Markdown & Mermaid Renderer -----------------------------
function Markdown({ text }: { text: string }) {
  return <MarkdownRenderer content={text} />;
}

// ─── Subject Personas ──────────────────────────────────────────────────
export interface SubjectPersona {
  id: string;
  name: string;
  icon: string;
  badge: string;
  systemPrompt: string;
}

export const SUBJECT_PERSONAS: SubjectPersona[] = [
  {
    id: "general",
    name: "General Study Coach",
    icon: "🎓",
    badge: "Academic",
    systemPrompt: "You are FlowTrack Pro's academic AI study assistant. Provide concise, clear, and highly educational answers with memory anchors.",
  },
  {
    id: "java",
    name: "Java & Full-Stack Architect",
    icon: "☕",
    badge: "Engineering",
    systemPrompt: "You are an elite Senior Java and Full-Stack Architect. Provide in-depth explanations with clean code examples, OOP design principles, JVM mechanics, Spring Boot best practices, and architecture diagrams.",
  },
  {
    id: "dsa",
    name: "DSA & Algorithms Master",
    icon: "📊",
    badge: "Algorithms",
    systemPrompt: "You are an expert Data Structures & Algorithms instructor. Break down solutions with step-by-step logic, dry-run walkthroughs, edge cases, space/time complexity analysis (Big-O), and ASCII/Mermaid diagrams.",
  },
  {
    id: "physics_math",
    name: "Math & Physics Professor",
    icon: "⚛️",
    badge: "Derivations",
    systemPrompt: "You are a university Mathematics & Physics Professor. Derive formulas step-by-step with proofs, define variables clearly, state physical intuition, and provide worked numerical examples.",
  },
  {
    id: "exam_cram",
    name: "Exam Revision Coach",
    icon: "🎯",
    badge: "High-Yield",
    systemPrompt: "You are an intensive Exam Preparation Coach. Focus on high-yield exam facts, formulas to memorize, common student traps and misconceptions, and quick mnemonics.",
  },
  {
    id: "custom",
    name: "Custom Persona",
    icon: "✏️",
    badge: "Custom",
    systemPrompt: "",
  },
];

export interface ChatSession {
  id: string;
  title: string;
  personaId: string;
  customSystemPrompt?: string;
  createdAt: number;
  updatedAt: number;
  messages: { role: "user" | "assistant"; content: string }[];
}

const SESSIONS_STORAGE_KEY = "flowtrack_ai_chat_sessions_v2";

// ─── Provider Configs ──────────────────────────────────────────────────
const PROVIDERS = [
  { id: "local_rules", name: "Local AI Rules (Free & Private)", needsKey: false, defaultModel: "local-rules" },
  { id: "gemini", name: "Google Gemini", needsKey: true, defaultModel: "gemini-1.5-flash" },
  { id: "groq", name: "Groq Cloud ⚡ (Ultra-Fast)", needsKey: true, defaultModel: "llama-3.3-70b-versatile" },
  { id: "cerebras", name: "Cerebras API (Ultra-Fast)", needsKey: true, defaultModel: "llama3.1-8b" },
  { id: "openai", name: "OpenAI ChatGPT", needsKey: true, defaultModel: "gpt-4o-mini" },
  { id: "mistral", name: "Mistral AI", needsKey: true, defaultModel: "mistral-small-latest" },
  { id: "grok", name: "xAI Grok", needsKey: true, defaultModel: "grok-beta" },
  { id: "ollama", name: "Ollama (Local Offline)", needsKey: false, defaultModel: "llama3:latest" },
  { id: "custom", name: "Custom Provider", needsKey: true, defaultModel: "" }
] as const;

function getProviderEndpoint(provider: AiConfig["provider"], _model: string, ollamaUrl: string, customEndpoint?: string) {
  switch (provider) {
    case "openai":  return "https://api.openai.com/v1/chat/completions";
    case "groq":    return "https://api.groq.com/openai/v1/chat/completions";
    case "cerebras":return "https://api.cerebras.ai/v1/chat/completions";
    case "mistral": return "https://api.mistral.ai/v1/chat/completions";
    case "grok":    return "https://api.x.ai/v1/chat/completions";
    case "ollama":  return `${ollamaUrl}/v1/chat/completions`;
    case "custom":  return customEndpoint || "";
    default:        return "";
  }
}

function getProviderHeaders(provider: AiConfig["provider"], apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider === "ollama") return headers;
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  return headers;
}

// ═══════════════════════════════════════════════════════════════════════
export function AIAssistantPage() {
  const sessions = useAppStore((s: AppState) => s.sessions);
  const subjects = useAppStore((s: AppState) => s.subjects);
  const dailyGoalHours = useAppStore((s: AppState) => s.dailyGoalHours);
  const weeklyTargetHours = useAppStore((s: AppState) => s.weeklyTargetHours);
  const profile        = useAppStore((s: AppState) => s.profile);
  const aiConfig       = useAppStore((s: AppState) => s.aiConfig);
  const setAiConfig    = useAppStore((s: AppState) => s.setAiConfig);
  const streakData     = useStreak();

  const getIpc = () => {
    if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      return (window as any).electron.ipcRenderer;
    }
    return null;
  };

  const [provider, setProvider]     = useState<AiConfig["provider"]>(aiConfig?.provider ?? "local_rules");
  const [apiKey, setApiKey]         = useState(aiConfig?.apiKey ?? "");
  const [model, setModel]           = useState(aiConfig?.model ?? "local-rules");
  const [ollamaUrl, setOllamaUrl]   = useState(aiConfig?.ollamaUrl ?? "http://localhost:11434");
  const [customProviderName, setCustomProviderName] = useState(aiConfig?.customProvider?.name ?? "");
  const [customProviderEndpoint, setCustomProviderEndpoint] = useState(aiConfig?.customProvider?.endpoint ?? "");
  const [groqStreaming, setGroqStreaming] = useState(true);

  // Keep separate API keys for each provider
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    const initialKeys: Record<string, string> = {
      gemini: "", cerebras: "", openai: "", mistral: "", grok: "", groq: "", ollama: "", local_rules: "",
    };
    if (aiConfig?.apiKeys) Object.assign(initialKeys, aiConfig.apiKeys);
    if (aiConfig?.provider && aiConfig?.apiKey) initialKeys[aiConfig.provider] = aiConfig.apiKey;
    return initialKeys;
  });

  // UI state
  const [showConfig, setShowConfig] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, completion: 0, total: 0 });

  // Live Model Fetcher State
  const [availableModels, setAvailableModels] = useState<FetchedModel[]>(FALLBACK_MODELS[provider] || []);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Subject Persona & Custom Prompt
  const [currentPersonaId, setCurrentPersonaId] = useState("general");
  const [customPersonaPrompt, setCustomPersonaPrompt] = useState("");

  // Chat History Sessions State
  const defaultWelcomeMessage = `Hello ${profile?.name || "there"}! I am your FlowTrack AI Study Assistant. I have read your study logs, goals, and profiles. Ask me anything about your study patterns, or select one of the suggested prompts below! 📚✨`;

  const [sessionsList, setSessionsList] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: crypto.randomUUID(),
        title: "New Study Session",
        personaId: "general",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [{ role: "assistant", content: defaultWelcomeMessage }],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessionsList[0]?.id || "");

  const activeSession = useMemo(() => {
    return sessionsList.find((s) => s.id === activeSessionId) || sessionsList[0];
  }, [sessionsList, activeSessionId]);

  const messages = activeSession?.messages || [];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Persist sessions helper
  const persistSessions = useCallback((updated: ChatSession[]) => {
    setSessionsList(updated);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  // Fetch live models from provider
  const refreshLiveModels = useCallback(async (targetProv = provider, targetKey = apiKey) => {
    setFetchingModels(true);
    setFetchError(null);
    try {
      const res = await fetchLiveModels(targetProv, targetKey, ollamaUrl);
      setAvailableModels(res.models);
      if (!res.success && res.error) {
        setFetchError(res.error);
      }
    } catch (err: any) {
      setFetchError(err.message || "Failed to fetch live models");
    } finally {
      setFetchingModels(false);
    }
  }, [provider, apiKey, ollamaUrl]);

  // Initial models refresh
  useEffect(() => {
    refreshLiveModels(provider, apiKey);
  }, [provider]);

  // Sync token usage
  useEffect(() => {
    db.settings.get("ai_token_usage").then(val => {
      if (val) {
        try { setTokenUsage(JSON.parse(val.value)); } catch {}
      }
    });
  }, []);

  const recordTokenUsage = useCallback(async (prompt: number, completion: number, total: number) => {
    setTokenUsage(prev => {
      const next = {
        prompt: prev.prompt + prompt,
        completion: prev.completion + completion,
        total: prev.total + total
      };
      void db.settings.put({ key: "ai_token_usage", value: JSON.stringify(next) });
      return next;
    });
  }, []);

  // Sync active persona when session changes
  useEffect(() => {
    if (activeSession) {
      setCurrentPersonaId(activeSession.personaId || "general");
      if (activeSession.customSystemPrompt) {
        setCustomPersonaPrompt(activeSession.customSystemPrompt);
      }
    }
  }, [activeSessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // ─── Multi-Chat Actions ─────────────────────────────────────────────
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Study Session",
      personaId: currentPersonaId,
      customSystemPrompt: customPersonaPrompt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          role: "assistant",
          content: `Hello ${profile?.name || "there"}! Starting a fresh study session. What concept or problem shall we solve? 🚀`,
        },
      ],
    };
    const updated = [newSession, ...sessionsList];
    persistSessions(updated);
    setActiveSessionId(newSession.id);
  };

  const deleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessionsList.length <= 1) {
      const reset: ChatSession[] = [
        {
          id: crypto.randomUUID(),
          title: "New Study Session",
          personaId: "general",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [{ role: "assistant", content: defaultWelcomeMessage }],
        },
      ];
      persistSessions(reset);
      setActiveSessionId(reset[0].id);
      return;
    }
    const filtered = sessionsList.filter((s) => s.id !== sessionId);
    persistSessions(filtered);
    if (activeSessionId === sessionId) {
      setActiveSessionId(filtered[0].id);
    }
  };

  // ─── Study Context & Persona System Prompt ──────────────────────────
  const studyContext = useMemo(() => {
    const totalHours = sessions.reduce((sum, s) => sum + s.actualSeconds, 0) / 3600;
    const completed = sessions.filter(s => s.status === "completed");
    const subjectMap: Record<string, number> = {};
    sessions.forEach(s => {
      const sub = subjects.find(sub => sub.id === s.subjectId);
      if (sub && s.actualSeconds > 0) {
        subjectMap[sub.name] = (subjectMap[sub.name] ?? 0) + s.actualSeconds / 3600;
      }
    });

    const recentList = sessions
      .slice(0, 8)
      .map(s => {
        const sub = subjects.find(sub => sub.id === s.subjectId);
        return `- ${sub?.name || "Deleted subject"}: ${toDurationLabel(Math.round(s.actualSeconds / 60))} studied (Date: ${new Date(s.startTime).toLocaleDateString()}) ${s.notes ? `[Notes: ${s.notes}]` : ""}`;
      })
      .join("\n");

    return {
      userName: profile?.name || "User",
      userAge: profile?.age || "Not specified",
      userProfession: profile?.profession || "Student",
      userGoal: profile?.goal || "Learn & Focus",
      dailyGoalHours,
      weeklyTargetHours,
      totalHours: totalHours.toFixed(1),
      dailyStreak: streakData.daily,
      longestStreak: streakData.longestStreak,
      completedCount: completed.length,
      subjectsStudied: Object.entries(subjectMap).map(([name, hr]) => `${name}: ${hr.toFixed(1)}h`).join(", "),
      recentActivity: recentList
    };
  }, [sessions, subjects, dailyGoalHours, weeklyTargetHours, profile, streakData]);

  const activePersona = useMemo(() => {
    return SUBJECT_PERSONAS.find(p => p.id === currentPersonaId) || SUBJECT_PERSONAS[0];
  }, [currentPersonaId]);

  const buildSystemPrompt = useCallback(() => {
    const personaInstruction = currentPersonaId === "custom" && customPersonaPrompt.trim()
      ? customPersonaPrompt.trim()
      : activePersona.systemPrompt;

    return `You are FlowTrack AI, an intelligent, empathetic, and comprehensive academic study mentor and coding architect.
ACTIVE SUBJECT PERSONA:
${personaInstruction}

CORE TUTORING CAPABILITIES:
1. Academic, Technical & Programming Tutor:
   - Always answer educational and technical questions thoroughly, step-by-step.
   - Use clean GitHub-Flavored Markdown (headers, bullet points, code blocks).
   - Use Mermaid diagrams (\`\`\`mermaid\nflowchart TD\n...\`\`\`) whenever explaining architectures, state transitions, algorithms, or study roadmaps.
2. Personalized Study Strategist:
   - User Profile: ${studyContext.userName} (${studyContext.userProfession}, Goal: ${studyContext.userGoal})
   - Tracked Hours: ${studyContext.totalHours}h | Daily Streak: ${studyContext.dailyStreak} days
   - Subjects Studied: ${studyContext.subjectsStudied || "None logged yet"}

Recent Activity:
${studyContext.recentActivity}`;
  }, [activePersona, currentPersonaId, customPersonaPrompt, studyContext]);

  // ─── Local Rule Fallback Engine ─────────────────────────────────────
  const getLocalRuleResponse = (query: string): string => {
    const q = query.toLowerCase();
    const name = studyContext.userName;

    if (q.includes("diagram") || q.includes("mermaid") || q.includes("flowchart") || q.includes("architecture")) {
      return `### 📊 Visual Study Architecture Map\n\n\`\`\`mermaid\nflowchart TD\n    A["☕ Core Programming & Concepts"] --> B["🧱 Data Structures & Algorithms"]\n    A --> C["🌐 Backend Engineering & APIs"]\n    B --> D["⚡ Search & Sort: O(log n)"]\n    B --> E["🌲 Trees, Heaps & DP"]\n    C --> F["🗄️ Database Architecture (ACID / WAL)"]\n    C --> G["🚀 REST Endpoints & Security"]\n    D --> H["🧠 Long-Term Memory (SM-2 SRS)"]\n    F --> H\n\`\`\`\n\n#### 💡 Key Takeaways:\n1. **Theoretical Foundations**: Master fundamental syntax and data structures first.\n2. **Applied Engineering**: Connect DSA directly with databases and REST APIs.\n3. **Spaced Repetition**: Keep intervals fresh in **SRS Flashcards**!`;
    }

    if (q.includes("java")) {
      return `### ☕ Java Fundamentals & JVM Architecture\n\n**Java** is a high-level, class-based, object-oriented language based on the **WORA** (*Write Once, Run Anywhere*) principle.\n\n#### 🌟 Core Pillars:\n1. **JVM, JRE & JDK**: JDK compiles source code to Bytecode (\`.class\`); JVM executes bytecode on native hardware via JIT compilation.\n2. **OOP Foundations**: Encapsulation, Inheritance, Polymorphism, Abstraction.\n3. **Concurrency**: Multithreading, Virtual Threads (Project Loom), Synchronized blocks, ExecutorService.\n\n\`\`\`java\npublic class StudySession {\n    public static void main(String[] args) {\n        System.out.println("Keep mastering Java with FlowTrack!");\n    }\n}\n\`\`\``;
    }

    if (q.includes("dsa") || q.includes("algorithm")) {
      return `### 📊 Data Structures & Algorithms (DSA) Roadmap\n\n1. **Linear Structures**: Arrays, Two-Pointer technique, HashMaps, Stacks, Queues.\n2. **Non-linear Structures**: Binary Search Trees, Heaps/Priority Queues, BFS/DFS Graphs.\n3. **Dynamic Programming**: Memoization (Top-down) vs Tabulation (Bottom-up).\n4. **Complexity Analysis**: Aim for $O(1)$ and $O(\\log n)$ access patterns where possible.`;
    }

    return `### 🤖 FlowTrack AI Assistant (${activePersona.name})\n\nHello **${name}**! I am focused on your study goals:\n- **Hours Logged**: ${studyContext.totalHours}h across **${studyContext.completedCount}** focus blocks.\n- **Current Streak**: ${studyContext.dailyStreak} days.\n\nFeel free to ask any conceptual doubts, coding problems, derivations, or schedule optimizations!`;
  };

  // ─── Groq Streaming Fetch ──────────────────────────────────────────
  const fetchGroqStreaming = async (userMessage: string) => {
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };

    const allMessages = [
      ...messages.filter(m => m.role === "user" || m.role === "assistant").slice(-10),
      { role: "user" as const, content: userMessage }
    ];

    const body = JSON.stringify({
      model: model || "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: buildSystemPrompt() }, ...allMessages],
      temperature: 0.5,
      stream: true,
      max_tokens: 2048
    });

    abortRef.current = new AbortController();

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: abortRef.current.signal
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(decodeAiProviderError(res.status, errData, provider));
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No readable stream");

    const decoder = new TextDecoder();
    let fullText = "";
    setStreamingText("");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          fullText += delta;
          setStreamingText(fullText);
        } catch {}
      }
    }

    const estPrompt = Math.round((buildSystemPrompt().length + userMessage.length) / 4);
    const estCompletion = Math.round(fullText.length / 4);
    void recordTokenUsage(estPrompt, estCompletion, estPrompt + estCompletion);
    return fullText;
  };

  // ─── Non-Streaming Fetch ───────────────────────────────────────────
  const fetchNonStreaming = async (userMessage: string): Promise<string> => {
    const endpoint = getProviderEndpoint(provider, model, ollamaUrl, customProviderEndpoint);
    const headers = getProviderHeaders(provider, apiKey);
    const allMessages = [
      ...messages.filter(m => m.role === "user" || m.role === "assistant").slice(-10),
      { role: "user", content: userMessage }
    ];

    const body = {
      model: model || "gpt-4o-mini",
      messages: [{ role: "system", content: buildSystemPrompt() }, ...allMessages],
      temperature: 0.5,
      max_tokens: 2048
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(decodeAiProviderError(res.status, errData, provider));
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "";
    if (data.usage) {
      void recordTokenUsage(data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0, data.usage.total_tokens || 0);
    } else {
      const estPrompt = Math.round((buildSystemPrompt().length + userMessage.length) / 4);
      const estCompletion = Math.round(reply.length / 4);
      void recordTokenUsage(estPrompt, estCompletion, estPrompt + estCompletion);
    }
    return reply || "No response from model.";
  };

  // ─── Gemini Fetch ──────────────────────────────────────────────────
  const fetchGemini = async (userMessage: string): Promise<string> => {
    const ipc = getIpc();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`;
    const reqBody = {
      contents: [{ role: "user", parts: [{ text: `${buildSystemPrompt()}\n\nUser Question: ${userMessage}` }] }]
    };

    let data;
    if (ipc) {
      const proxyRes = await ipc.invoke("secure-proxy-fetch", { url, body: reqBody });
      if (!proxyRes.ok) throw new Error(proxyRes.error || `HTTP ${proxyRes.status}`);
      data = proxyRes.data;
    } else {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(decodeAiProviderError(res.status, err, "gemini"));
      }
      data = await res.json();
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (data.usageMetadata) {
      void recordTokenUsage(data.usageMetadata.promptTokenCount || 0, data.usageMetadata.candidatesTokenCount || 0, data.usageMetadata.totalTokenCount || 0);
    } else {
      const estPrompt = Math.round((buildSystemPrompt().length + userMessage.length) / 4);
      const estCompletion = Math.round(reply.length / 4);
      void recordTokenUsage(estPrompt, estCompletion, estPrompt + estCompletion);
    }
    return reply || "Unable to fetch response from Gemini.";
  };

  // ─── Handle Send Message ───────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent, directMessage?: string) => {
    if (e) e.preventDefault();
    const messageToSend = directMessage || input.trim();
    if (!messageToSend || loading) return;

    const userMsg = { role: "user" as const, content: messageToSend };
    const currentMsgs = [...messages, userMsg];

    // Update active session messages
    const updatedSessions = sessionsList.map(s => {
      if (s.id === activeSession.id) {
        const newTitle = s.title === "New Study Session"
          ? (messageToSend.length > 28 ? messageToSend.slice(0, 28) + "..." : messageToSend)
          : s.title;
        return {
          ...s,
          title: newTitle,
          updatedAt: Date.now(),
          messages: currentMsgs,
        };
      }
      return s;
    });

    persistSessions(updatedSessions);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      let reply = "";
      if (provider === "local_rules") {
        await new Promise(r => setTimeout(r, 800));
        reply = getLocalRuleResponse(messageToSend);
      } else if (provider === "groq" && groqStreaming) {
        reply = await fetchGroqStreaming(messageToSend) || "";
      } else if (provider === "gemini") {
        reply = await fetchGemini(messageToSend);
      } else {
        reply = await fetchNonStreaming(messageToSend);
      }

      const finalMsgs = [...currentMsgs, { role: "assistant" as const, content: reply }];
      const finalSessions = sessionsList.map(s => {
        if (s.id === activeSession.id) {
          return { ...s, updatedAt: Date.now(), messages: finalMsgs };
        }
        return s;
      });
      persistSessions(finalSessions);
    } catch (err: any) {
      const errorMsg = err?.message || "Unknown error";
      const is429 = errorMsg.includes("429");
      const is404 = errorMsg.includes("404");

      let guidance = "Please verify your API Key and internet connection. Switch to **Local AI Rules** for 100% offline support!";
      if (is429) {
        guidance = "Your provider account has exhausted its free usage/spending limits. **Tip**: Switch to **Groq Cloud** (100% Free Llama 3.3) or **Gemini** in AI Setup for instant free responses!";
      } else if (is404) {
        guidance = "The selected model is inactive or decommissioned. Open **AI Setup** and select a verified model like `llama-3.3-70b-versatile`!";
      }

      const errReply = `❌ **API Error**: ${errorMsg}\n\n${guidance}`;
      const finalMsgs = [...currentMsgs, { role: "assistant" as const, content: errReply }];
      const finalSessions = sessionsList.map(s => {
        if (s.id === activeSession.id) {
          return { ...s, updatedAt: Date.now(), messages: finalMsgs };
        }
        return s;
      });
      persistSessions(finalSessions);
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  };

  // ─── Test Connection ───────────────────────────────────────────────
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      if (provider === "local_rules") {
        setConnectionResult({ success: true, message: "✅ Local Offline Rules Engine is active & ready!" });
        setTestingConnection(false);
        return;
      }

      if (provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }] })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(decodeAiProviderError(res.status, errData, "gemini"));
        }
        setConnectionResult({ success: true, message: "✅ Gemini API connection successful!" });
      } else {
        const endpoint = getProviderEndpoint(provider, model, ollamaUrl, customProviderEndpoint);
        const headers = getProviderHeaders(provider, apiKey);
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: model || "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(decodeAiProviderError(res.status, errData, provider));
        }
        setConnectionResult({ success: true, message: `✅ Successfully connected to ${provider} (${model})!` });
      }
    } catch (err: any) {
      setConnectionResult({ success: false, message: `❌ Connection failed: ${err.message}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const saveSettings = () => {
    setAiConfig({
      provider,
      apiKey,
      model,
      ollamaUrl,
      apiKeys: { ...apiKeys, [provider]: apiKey },
      customProvider: { name: customProviderName, endpoint: customProviderEndpoint, apiKey: "" }
    });
    setStatusMessage("✅ AI Settings saved successfully!");
    setTimeout(() => setStatusMessage(""), 2500);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden p-2.5 md:p-3 bg-slate-950 text-slate-100 select-none gap-2.5">
      {/* ─── LEFT: Collapsible Chat History Sidebar (ChatGPT Style) ─── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-3 shrink-0 overflow-hidden shadow-2xl"
          >
            {/* New Chat Button */}
            <button
              onClick={createNewChat}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition active:scale-98 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Study Chat</span>
            </button>

            {/* Chat Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pt-3 scrollbar-none">
              <span className="text-[10px] font-bold uppercase text-slate-500 px-2 tracking-wider">
                Recent Chats ({sessionsList.length})
              </span>
              {sessionsList.map((s) => {
                const isActive = s.id === activeSession.id;
                const persona = SUBJECT_PERSONAS.find(p => p.id === s.personaId) || SUBJECT_PERSONAS[0];
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer border transition text-left ${
                      isActive
                        ? "bg-purple-600/20 border-purple-500/40 text-white shadow-md shadow-purple-600/10"
                        : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-6">
                      <span className="text-sm shrink-0">{persona.icon}</span>
                      <div className="truncate">
                        <p className="text-xs font-semibold truncate leading-tight">{s.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {s.messages.length} msgs
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteChat(s.id, e)}
                      title="Delete chat"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Token Compact Counter at bottom of sidebar */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{tokenUsage.total.toLocaleString()} tokens</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                ${((tokenUsage.prompt * 0.00015 + tokenUsage.completion * 0.0006) / 1000).toFixed(4)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MAIN CHAT AREA (Full width, responsive) ─── */}
      <div className="flex-1 h-full flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Chat Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSidebarOpen(v => !v)}
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isSidebarOpen ? "Hide Chat History" : "Show Chat History"}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
                  {activeSession?.title || "Study Session"}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                    {activePersona.name}
                  </span>
                </h2>
              </div>
            </div>
          </div>

          {/* Right Controls: Subject Persona Switcher & AI Setup */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={currentPersonaId}
                onChange={(e) => {
                  const newP = e.target.value;
                  setCurrentPersonaId(newP);
                  const updated = sessionsList.map(s => s.id === activeSession.id ? { ...s, personaId: newP } : s);
                  persistSessions(updated);
                }}
                className="appearance-none bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl pl-2.5 pr-7 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {SUBJECT_PERSONAS.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowConfig(true)}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Open AI Setup & Model Config"
            >
              <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Setup</span>
            </button>
          </div>
        </div>

        {/* Custom Persona Prompt Box if selected */}
        {currentPersonaId === "custom" && (
          <div className="px-4 py-2 border-b border-slate-800 bg-purple-950/20 flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-purple-300 shrink-0">Custom Prompt:</span>
            <input
              type="text"
              value={customPersonaPrompt}
              onChange={(e) => {
                setCustomPersonaPrompt(e.target.value);
                const updated = sessionsList.map(s => s.id === activeSession.id ? { ...s, customSystemPrompt: e.target.value } : s);
                persistSessions(updated);
              }}
              placeholder="e.g. You are an expert tutor in Organic Chemistry and Reaction Mechanisms..."
              className="flex-1 bg-slate-900/90 border border-purple-500/30 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>
        )}

        {/* Messages Stream Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-5xl w-full mx-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "max-w-[85%] ml-auto flex-row-reverse" : "max-w-[90%] md:max-w-[88%] mr-auto"
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  msg.role === "user"
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                }`}
              >
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`rounded-2xl p-4 border text-sm leading-relaxed overflow-hidden shadow-lg ${
                  msg.role === "user"
                    ? "bg-cyan-500/10 border-cyan-500/30 text-white rounded-tr-none"
                    : "bg-slate-900/90 border-slate-800 text-slate-200 rounded-tl-none w-full"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Markdown text={msg.content} />
                ) : (
                  <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Streaming Text */}
          {loading && streamingText && (
            <div className="flex items-start gap-3 max-w-[88%] mr-auto">
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl p-4 bg-slate-900/90 border border-orange-500/30 text-slate-200 rounded-tl-none w-full">
                <Markdown text={streamingText} />
                <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1 align-middle" />
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && !streamingText && (
            <div className="flex items-start gap-3 max-w-[80%]">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="rounded-2xl p-3.5 border border-slate-800 bg-slate-900/80 text-xs text-slate-400 flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span>AI ({provider}) is formulating analysis & code...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompts when starting a chat */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Suggested Starters:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Architecture Flowchart (Mermaid)",
                "Java OOPs with Diagram",
                "Binary Search Tree rotations & code",
                "Derive Newton's laws with proofs",
                "Peak Study & Pomodoro Plan",
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setInput(p);
                    void handleSend(undefined, p);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500 text-[11px] text-slate-300 hover:text-white transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2 max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1.5 focus-within:border-cyan-500 transition">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${activePersona.name} anything about code, math, or study routine...`}
              disabled={loading}
              className="flex-1 bg-transparent text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            {loading && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition"
              >
                Stop
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* ─── SLIDE-OVER DRAWER: AI Setup & Model Config (Toggled with X) ─── */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Setup & Models</h3>
                    <p className="text-[11px] text-slate-400">Configure LLMs, API keys & live models</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfig(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close AI Setup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Token Tracker Card */}
                <Panel className="p-3 bg-slate-950 border-slate-800 space-y-2 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-white">Token Usage Stats</h4>
                    </div>
                    <button
                      onClick={() => {
                        const zero = { prompt: 0, completion: 0, total: 0 };
                        setTokenUsage(zero);
                        void db.settings.put({ key: "ai_token_usage", value: JSON.stringify(zero) });
                      }}
                      className="text-[10px] text-slate-400 hover:text-white underline"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-white/5 p-1.5">
                      <p className="text-xs font-bold text-indigo-300">{tokenUsage.prompt.toLocaleString()}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-500">Prompt (In)</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-1.5">
                      <p className="text-xs font-bold text-cyan-300">{tokenUsage.completion.toLocaleString()}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-500">Response (Out)</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-1.5">
                      <p className="text-xs font-bold text-amber-400">{tokenUsage.total.toLocaleString()}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-500">Total</p>
                    </div>
                  </div>
                </Panel>

                {/* Provider Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">AI Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      const prov = e.target.value as AiConfig["provider"];
                      setProvider(prov);
                      const matched = PROVIDERS.find(p => p.id === prov);
                      if (matched) setModel(matched.defaultModel || "");
                      setApiKey(apiKeys[prov] || "");
                      setConnectionResult(null);
                      refreshLiveModels(prov, apiKeys[prov] || "");
                    }}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* API Key (if needed) */}
                {provider !== "local_rules" && provider !== "ollama" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">API Key</label>
                      <span className="text-[10px] text-slate-500">Encrypted in local IndexedDB</span>
                    </div>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApiKey(val);
                        setApiKeys(prev => ({ ...prev, [provider]: val }));
                      }}
                      placeholder={`Paste your ${provider} API Key here...`}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                {/* Mistral Quota Notice */}
                {provider === "mistral" && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <span>⚠️</span> Mistral Free Tier Quota Notice:
                    </p>
                    <p className="text-amber-300/80 leading-relaxed text-[10px]">
                      Mistral requires phone or billing verification on <span className="text-white underline">console.mistral.ai</span> to activate chat compute tokens. If you get <strong>HTTP 429</strong>, switch to <strong>Groq Cloud ⚡</strong> (100% free & ultra-fast) or <strong>Gemini</strong>!
                    </p>
                  </div>
                )}

                {/* Ollama URL */}
                {provider === "ollama" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Ollama Host URL</label>
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                {/* Live Model Selector with Real-Time Fetch Button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Model Selection</label>
                    <button
                      onClick={() => refreshLiveModels(provider, apiKey)}
                      disabled={fetchingModels || provider === "local_rules"}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 disabled:opacity-40 transition"
                      title="Query provider API to get live models for your account"
                    >
                      <RefreshCw className={`w-3 h-3 ${fetchingModels ? "animate-spin" : ""}`} />
                      {fetchingModels ? "Fetching Live..." : "Fetch Live Models"}
                    </button>
                  </div>

                  {fetchError && (
                    <p className="text-[10px] text-amber-400/90 font-medium">⚠️ {fetchError}</p>
                  )}

                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Groq Streaming Toggle */}
                {provider === "groq" && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Streaming Mode</p>
                      <p className="text-[10px] text-slate-500">See tokens appear in real-time</p>
                    </div>
                    <button
                      onClick={() => setGroqStreaming(!groqStreaming)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        groqStreaming ? "bg-orange-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          groqStreaming ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Connection Test & Status */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="w-full py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white transition disabled:opacity-50"
                  >
                    {testingConnection ? "Testing Connection..." : "⚡ Test API Connection"}
                  </button>

                  {connectionResult && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs font-semibold ${
                        connectionResult.success
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {connectionResult.message}
                    </div>
                  )}

                  {connectionResult && !connectionResult.success && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          setProvider("groq");
                          setModel("llama-3.3-70b-versatile");
                          setConnectionResult(null);
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 transition font-medium"
                      >
                        ⚡ Switch to Groq Cloud (Free)
                      </button>
                      <button
                        onClick={() => {
                          setProvider("local_rules");
                          setModel("local-rules");
                          setConnectionResult(null);
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition font-medium"
                      >
                        🛡️ Switch to Offline Rules
                      </button>
                    </div>
                  )}
                </div>

                {/* Hardware Profiles Info */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400">Local Offline LLM Suggestions:</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Low RAM / Laptop: <code className="text-cyan-300">phi3:latest</code><br />
                    8GB RAM + Mid GPU: <code className="text-cyan-300">llama3:8b</code><br />
                    16GB+ RAM: <code className="text-cyan-300">qwen2.5:14b</code>
                  </p>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-medium">{statusMessage}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      saveSettings();
                      setShowConfig(false);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-xs font-bold text-white shadow-lg transition"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
