import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Brain, Send, Settings2, ShieldCheck, Cpu, Bot, User, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { AiConfig } from "@/types/models";
import { useStreak } from "@/hooks/useStreak";
import { toDurationLabel } from "@/utils/time";
import { db } from "@/lib/db";

// ─── Lightweight markdown to JSX formatter ─────────────────────────────
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: Array<{
    type: "p" | "h1" | "h2" | "h3" | "h4" | "ul" | "ol" | "blockquote" | "code" | "hr" | "table";
    content: any;
    lang?: string;
  }> = [];
  
  let currentBlock: any = null;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Code block check
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "code",
          content: codeBlockContent.join("\n"),
          lang: codeBlockLang
        });
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    const trimmed = line.trim();

    // Table check
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const isSep = /^[|:\s\-]+$/.test(trimmed);
      if (currentBlock && currentBlock.type === "table") {
        if (!isSep) {
          const cells = trimmed.slice(1, -1).split("|").map(c => c.trim());
          currentBlock.content.rows.push(cells);
        }
      } else {
        if (currentBlock) blocks.push(currentBlock);
        const headers = trimmed.slice(1, -1).split("|").map(h => h.trim());
        currentBlock = { type: "table", content: { headers, rows: [] } };
      }
      continue;
    } else {
      if (currentBlock && currentBlock.type === "table") {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    }
    
    // Horizontal rule check
    if (trimmed === "---" || trimmed === "===" || trimmed === "___" || /^[=\-*_]{3,}$/.test(trimmed)) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({ type: "hr", content: "" });
      continue;
    }
    
    // Headers
    if (line.startsWith("# ")) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({ type: "h1", content: line.slice(2) });
      continue;
    }
    if (line.startsWith("## ")) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({ type: "h2", content: line.slice(3) });
      continue;
    }
    if (line.startsWith("### ")) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({ type: "h3", content: line.slice(4) });
      continue;
    }
    if (line.startsWith("#### ")) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({ type: "h4", content: line.slice(5) });
      continue;
    }
    
    // Blockquotes
    if (line.startsWith("> ")) {
      const blockquoteLine = line.slice(2);
      if (currentBlock && currentBlock.type === "blockquote") {
        currentBlock.content.push(blockquoteLine);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: "blockquote", content: [blockquoteLine] };
      }
      continue;
    }
    
    // Bullet lists
    const leadSpaces = line.length - line.trimStart().length;
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ");
    if (isBullet) {
      const itemText = trimmed.slice(2);
      const indentClass = leadSpaces >= 4 ? "pl-8" : leadSpaces >= 2 ? "pl-4" : "";
      const itemObj = { text: itemText, indentClass };
      if (currentBlock && currentBlock.type === "ul") {
        currentBlock.content.push(itemObj);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: "ul", content: [itemObj] };
      }
      continue;
    }
    
    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      const itemText = numMatch[2];
      const indentClass = leadSpaces >= 4 ? "pl-8" : leadSpaces >= 2 ? "pl-4" : "";
      const itemObj = { text: itemText, indentClass };
      if (currentBlock && currentBlock.type === "ol") {
        currentBlock.content.push(itemObj);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: "ol", content: [itemObj] };
      }
      continue;
    }
    
    // Empty line
    if (trimmed === "") {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }
    
    // Paragraph / inline text
    if (currentBlock && currentBlock.type === "p") {
      currentBlock.content.push(line);
    } else {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: "p", content: [line] };
    }
  }
  
  if (currentBlock) {
    blocks.push(currentBlock);
  }
  
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-200">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return <h1 key={idx} className="text-xl font-black text-white mt-4 mb-2">{parseInlineFormatting(block.content)}</h1>;
          case "h2":
            return <h2 key={idx} className="text-lg font-bold text-white mt-4 mb-2">{parseInlineFormatting(block.content)}</h2>;
          case "h3":
            return <h3 key={idx} className="text-md font-bold text-cyan-300 mt-3 mb-1">{parseInlineFormatting(block.content)}</h3>;
          case "h4":
            return <h4 key={idx} className="text-sm font-bold text-cyan-400 mt-2 mb-1">{parseInlineFormatting(block.content)}</h4>;
          case "ul":
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1 my-2">
                {(block.content as any[]).map((item, i) => (
                  <li key={i} className={item.indentClass}>{parseInlineFormatting(item.text)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1 my-2">
                {(block.content as any[]).map((item, i) => (
                  <li key={i} className={item.indentClass}>{parseInlineFormatting(item.text)}</li>
                ))}
              </ol>
            );
          case "blockquote":
            return (
              <blockquote key={idx} className="border-l-4 border-cyan-500 bg-slate-950/40 p-3 pl-4 rounded-r-lg italic text-slate-400 my-3">
                {(block.content as string[]).map((c, i) => (
                  <p key={i}>{parseInlineFormatting(c)}</p>
                ))}
              </blockquote>
            );
          case "code":
            return (
              <pre key={idx} className="bg-slate-950/80 border border-white/5 rounded-xl p-3 my-2 overflow-x-auto pretty-scrollbar font-mono text-xs text-pink-400">
                <code>{block.content}</code>
              </pre>
            );
          case "table":
            return (
              <div key={idx} className="overflow-x-auto my-3 rounded-xl border border-white/10 bg-slate-950/40">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      {block.content.headers.map((h: string, i: number) => (
                        <th key={i} className="p-3 font-semibold text-white">{parseInlineFormatting(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.content.rows.map((row: string[], ri: number) => (
                      <tr key={ri} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                        {row.map((cell: string, ci: number) => (
                          <td key={ci} className="p-3 text-slate-300">{parseInlineFormatting(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return <hr key={idx} className="border-white/10 my-4" />;
          case "p":
          default:
            return (
              <p key={idx} className="my-2 leading-relaxed">
                {parseInlineFormatting((block.content as string[]).join(" "))}
              </p>
            );
        }
      })}
    </div>
  );
}

function parseInlineFormatting(text: string): React.ReactNode {
  const result: React.ReactNode[] = [];
  let i = 0;
  let currentText = "";
  
  while (i < text.length) {
    // Check code tag
    if (text[i] === "`") {
      if (currentText) {
        result.push(currentText);
        currentText = "";
      }
      const endIdx = text.indexOf("`", i + 1);
      if (endIdx !== -1) {
        const codeText = text.slice(i + 1, endIdx);
        result.push(
          <code key={`code-${i}`} className="bg-slate-950 px-1.5 py-0.5 rounded text-xs text-pink-400 font-mono">
            {codeText}
          </code>
        );
        i = endIdx + 1;
        continue;
      }
    }
    
    // Check bold tag
    if (text.startsWith("**", i)) {
      if (currentText) {
        result.push(currentText);
        currentText = "";
      }
      const endIdx = text.indexOf("**", i + 2);
      if (endIdx !== -1) {
        const boldText = text.slice(i + 2, endIdx);
        result.push(
          <strong key={`bold-${i}`} className="font-bold text-white">
            {parseInlineFormatting(boldText)}
          </strong>
        );
        i = endIdx + 2;
        continue;
      }
    }
    
    // Check italic tag
    if (text[i] === "*") {
      if (currentText) {
        result.push(currentText);
        currentText = "";
      }
      const endIdx = text.indexOf("*", i + 1);
      if (endIdx !== -1) {
        const italicText = text.slice(i + 1, endIdx);
        result.push(
          <em key={`em-${i}`} className="italic text-slate-300">
            {parseInlineFormatting(italicText)}
          </em>
        );
        i = endIdx + 1;
        continue;
      }
    }
    
    currentText += text[i];
    i++;
  }
  
  if (currentText) {
    result.push(currentText);
  }
  
  return result;
}

// ─── Provider Configs ──────────────────────────────────────────────────
const PROVIDERS = [
  { id: "local_rules", name: "Local AI Rules (Free & Private)", needsKey: false, defaultModel: "local-rules" },
  { id: "gemini", name: "Google Gemini", needsKey: true, defaultModel: "gemini-1.5-flash" },
  { id: "groq", name: "Groq Cloud ⚡ (Ultra-Fast)", needsKey: true, defaultModel: "llama-3.3-70b-versatile" },
  { id: "cerebras", name: "Cerebras API (Ultra-Fast)", needsKey: true, defaultModel: "llama3.1-8b" },
  { id: "openai", name: "OpenAI ChatGPT", needsKey: true, defaultModel: "gpt-4o-mini" },
  { id: "mistral", name: "Mistral AI", needsKey: true, defaultModel: "mistral-tiny" },
  { id: "grok", name: "xAI Grok", needsKey: true, defaultModel: "grok-beta" },
  { id: "ollama", name: "Ollama (Local Offline)", needsKey: false, defaultModel: "llama3" },
  { id: "custom", name: "Custom Provider", needsKey: true, defaultModel: "" }
] as const;

// ─── Groq-specific model list ──────────────────────────────────────────
const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", tag: "Recommended", speed: "Fast" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", tag: "Fastest", speed: "Ultra-Fast" },
  { id: "llama3-70b-8192", name: "Llama 3 70B", tag: "Legacy", speed: "Fast" },
  { id: "llama3-8b-8192", name: "Llama 3 8B", tag: "Legacy", speed: "Ultra-Fast" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (32K ctx)", tag: "Long Context", speed: "Fast" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B IT", tag: "Lightweight", speed: "Ultra-Fast" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B", tag: "Reasoning", speed: "Fast" },
  { id: "qwen-qwq-32b", name: "Qwen QWQ 32B", tag: "Reasoning", speed: "Fast" }
] as const;

const HARDWARE_PROFILES = [
  { id: "cpu", name: "CPU Only / Low RAM (phi3 / qwen2.5:1.5b)", suggestion: "phi3:latest" },
  { id: "mid", name: "8GB RAM + Mid GPU (llama3:8b / gemma2:9b)", suggestion: "llama3:latest" },
  { id: "high", name: "16GB+ RAM + Apple M-Chip/RTX GPU (qwen2.5:14b)", suggestion: "qwen2.5:14b" }
];

// ─── Helper: build endpoint + headers per provider ─────────────────────
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
  const sessions       = useAppStore((s: AppState) => s.sessions);
  const subjects       = useAppStore((s: AppState) => s.subjects);
  const dailyGoalHours = useAppStore((s: AppState) => s.dailyGoalHours);
  const weeklyTargetHours = useAppStore((s: AppState) => s.weeklyTargetHours);
  const profile        = useAppStore((s: AppState) => s.profile);
  const aiConfig       = useAppStore((s: AppState) => s.aiConfig);
  const setAiConfig    = useAppStore((s: AppState) => s.setAiConfig);
  const streakData     = useStreak();

  const [provider, setProvider]     = useState<AiConfig["provider"]>(aiConfig?.provider ?? "local_rules");
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [apiKey, setApiKey]         = useState(aiConfig?.apiKey ?? "");
  const [model, setModel]           = useState(aiConfig?.model ?? "local-rules");
  const [ollamaUrl, setOllamaUrl]   = useState(aiConfig?.ollamaUrl ?? "http://localhost:11434");
  const [customProviderName, setCustomProviderName] = useState(aiConfig?.customProvider?.name ?? "");
  const [customProviderEndpoint, setCustomProviderEndpoint] = useState(aiConfig?.customProvider?.endpoint ?? "");
  const [groqStreaming, setGroqStreaming] = useState(true); // streaming ON by default for Groq

  // Keep separate API keys for each provider
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    const initialKeys: Record<string, string> = {
      gemini: "",
      cerebras: "",
      openai: "",
      mistral: "",
      grok: "",
      groq: "",
      ollama: "",
      local_rules: "",
    };
    if (aiConfig?.apiKeys) {
      Object.assign(initialKeys, aiConfig.apiKeys);
    }
    if (aiConfig?.provider && aiConfig?.apiKey) {
      initialKeys[aiConfig.provider] = aiConfig.apiKey;
    }
    return initialKeys;
  });

  const [showConfig, setShowConfig]         = useState(false);
  const [hardwareSuggestion, setHardwareSuggestion] = useState("");
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [detecting, setDetecting]           = useState(false);
  const [statusMessage, setStatusMessage]   = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, completion: 0, total: 0 });

  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: `Hello ${profile?.name || "there"}! I am your FlowTrack AI Study Assistant. I have read your study logs, goals, and profiles. Ask me anything about your study patterns, or select one of the suggested prompts below! 📚✨`
    }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState(""); // for Groq streaming

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef   = useRef<AbortController | null>(null); // to cancel streaming

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    db.settings.get("ai_token_usage").then(val => {
      if (val) {
        try {
          setTokenUsage(JSON.parse(val.value));
        } catch {}
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingText]);

  // Synchronize component states when aiConfig changes
  useEffect(() => {
    if (aiConfig) {
      setProvider(aiConfig.provider || "local_rules");
      setApiKey(aiConfig.apiKey || "");
      setModel(aiConfig.model || "");
      setOllamaUrl(aiConfig.ollamaUrl || "http://localhost:11434");
      setCustomProviderName(aiConfig.customProvider?.name || "");
      setCustomProviderEndpoint(aiConfig.customProvider?.endpoint || "");
      
      const newKeys = {
        gemini: "",
        cerebras: "",
        openai: "",
        mistral: "",
        grok: "",
        groq: "",
        ollama: "",
        local_rules: "",
        custom: "",
        ...aiConfig.apiKeys
      };
      if (aiConfig.provider && aiConfig.apiKey) {
        newKeys[aiConfig.provider] = aiConfig.apiKey;
      }
      setApiKeys(newKeys);
    }
  }, [aiConfig]);

  // Auto-save changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const updatedKeys = { ...apiKeys, [provider]: apiKey };
      const config: AiConfig = {
        provider,
        apiKey,
        model,
        ollamaUrl,
        apiKeys: updatedKeys
      };
      if (provider === "custom") {
        config.customProvider = {
          name: customProviderName,
          endpoint: customProviderEndpoint,
          apiKey: apiKey
        };
      }
      void setAiConfig(config);
    }, 800);
    return () => clearTimeout(timer);
  }, [provider, apiKey, model, ollamaUrl, customProviderName, customProviderEndpoint]);

  // ─── Test Connection ───────────────────────────────────────────────
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      if (provider === "local_rules") {
        setConnectionResult({ success: true, message: "Local rules engine is always connected!" });
        setTestingConnection(false);
        return;
      }
      if (provider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }] })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }
        setConnectionResult({ success: true, message: "Successfully connected to Gemini API!" });
      } else {
        const endpoint = getProviderEndpoint(provider, model, ollamaUrl, customProviderEndpoint);
        const headers = getProviderHeaders(provider, apiKey);
        const defaultModel = provider === "ollama" ? "llama3" : provider === "groq" ? "llama-3.3-70b-versatile" : provider === "custom" ? model : "gpt-4o-mini";
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: model || defaultModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }
        setConnectionResult({ success: true, message: `Successfully connected to ${provider === "custom" ? customProviderName : PROVIDERS.find(p => p.id === provider)?.name}!` });
      }
    } catch (e: any) {
      setConnectionResult({ success: false, message: e.message || "Connection failed. Please check key/url/model." });
    }
    setTestingConnection(false);
  };

  // ─── Save Settings ─────────────────────────────────────────────────
  const saveSettings = async () => {
    const updatedKeys = { ...apiKeys, [provider]: apiKey };
    setApiKeys(updatedKeys);
    const config: AiConfig = { 
      provider, 
      apiKey, 
      model, 
      ollamaUrl, 
      apiKeys: updatedKeys 
    };
    if (provider === "custom") {
      config.customProvider = {
        name: customProviderName,
        endpoint: customProviderEndpoint,
        apiKey: apiKey
      };
    }
    await setAiConfig(config);
    setStatusMessage("✅ AI Settings saved locally!");
    setTimeout(() => setStatusMessage(""), 2500);
  };

  // ─── Ollama Detect ─────────────────────────────────────────────────
  const handleOllamaDetect = async () => {
    setDetecting(true);
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`);
      const data = await res.json();
      if (data.models) {
        const names = data.models.map((m: any) => m.name);
        setDetectedModels(names);
        if (names.length > 0) setModel(names[0]);
        setStatusMessage(`✅ Detected ${names.length} local models!`);
      }
    } catch {
      setStatusMessage("❌ Ollama connection failed. Ensure Ollama is running & CORS is enabled.");
    }
    setDetecting(false);
    setTimeout(() => setStatusMessage(""), 4000);
  };

  // ─── Study Context for LLM ─────────────────────────────────────────
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

  const buildSystemPrompt = useCallback(() => {
    return `You are a strict, helpful, professional, and private AI study coach. Analyze the user's study patterns and give actionable advice. Speak in English (or Hindi if requested).
   
CRITICAL BOUNDARIES:
1. You MUST ONLY answer questions related to the user's studies, study tracker logs, time management, exam preparation, and focus/academic goals.
2. If the user asks general, external, or irrelevant questions (e.g. coding topics unrelated to their studied subjects, general programming, cooking recipes, random trivia, general chat), politely refuse and remind them to stay focused on their study goals.
3. Keep answers extremely short and concise to save tokens and avoid distraction.
4. Format your responses using clean Markdown.

User Profile:
- Name: ${studyContext.userName}
- Age: ${studyContext.userAge}
- Profession/Exam: ${studyContext.userProfession}
- Primary Goal: ${studyContext.userGoal}

Study Stats:
- Daily Goal: ${studyContext.dailyGoalHours} hours
- Weekly Target: ${studyContext.weeklyTargetHours} hours
- Current Streak: ${studyContext.dailyStreak} days
- Longest Streak: ${studyContext.longestStreak} days
- Total Hours Studied: ${studyContext.totalHours}h
- Subjects breakdown: ${studyContext.subjectsStudied}

Recent Activity Logs:
${studyContext.recentActivity}`;
  }, [studyContext]);

  // ─── Local Rule-Based Engine ────────────────────────────────────────
  const getLocalRuleResponse = (query: string): string => {
    const q = query.toLowerCase();
    const name = studyContext.userName;
    const subjectsList = subjects.map(s => s.name).join(", ");

    if (q.includes("why") && q.includes("less") || q.includes("kam padha") || q.includes("inconsistent")) {
      return `### 📊 Study Consistency Analysis for **${name}**\n\nLooking at your recent study sessions, you studied a total of **${studyContext.totalHours} hours** across your subjects.\n\nHere are some reasons why study output might be dropping:\n1. **Lack of scheduling**: You have planned sessions but the gap between them might be too large. Try setting a standard study routine.\n2. **Neglected subjects**: You studied **${studyContext.subjectsStudied || "no subjects yet"}**. If you focus on only one topic, you get burned out. Try shuffling subjects!\n\n**💡 Actionable Tip**: Start a small 15-minute study block today in **Strict Focus mode** to restart your momentum.`;
    }

    if (q.includes("time") || q.includes("hour") || q.includes("kb padhu") || q.includes("peak") || q.includes("when")) {
      return `### ⚡ Optimal Focus Window Analysis\n\nHi **${name}**, let's look at your study timings:\n- **Your daily goal**: ${studyContext.dailyGoalHours} hours.\n- **Your current streak**: ${studyContext.dailyStreak} days.\n\nBased on focus tracking, studying early in the morning (before 9 AM) or splitting study into two halves (e.g. 10 AM - 12 PM and 4 PM - 6 PM) produces the highest focus duration.\n\n**💡 Actionable Tip**: Use the **Pomodoro mode** in FlowTrack during your focus session. Set it to 25 mins focus and 5 mins break to maintain brain energy!`;
    }

    if (q.includes("plan") || q.includes("routine") || q.includes("subjects") || q.includes("suggest")) {
      return `### 📅 Personalized Study Routine for **${name}**\n\nYour primary goal is: *"${studyContext.userGoal}"* as a **${studyContext.userProfession}**.\n\nHere is a suggested plan based on your subjects (**${subjectsList || "No subjects added yet"}**):\n1. **Morning Block (45 mins)**: Focus on revision and high-difficulty topics first.\n2. **Midday Block (60 mins)**: Hands-on practice, coding, math, or notes writing.\n3. **Evening Block (30 mins)**: Light revision, planning tomorrow's sessions.\n\nMake sure to carry forward sessions automatically so you have a planned template ready every day!`;
    }

    return `### 🤖 Study Assistant Insights\n\nThank you for asking, **${name}**! Here is a summary of your stats:\n- **All Time Hours**: ${studyContext.totalHours} hours\n- **Completed Sessions**: ${studyContext.completedCount} focus blocks\n- **Streak**: ${studyContext.dailyStreak} days\n- **Subjects tracked**: ${studyContext.subjectsStudied || "None yet"}\n\n**💡 Recommended Study Tip**: Try to study at least 1 hour daily to maintain your **${studyContext.dailyStreak} days streak**. Focus on *${subjects[0]?.name || "your primary subject"}* tomorrow morning. Ask me more questions about your focus to get targeted advice!`;
  };

  // ─── Groq Streaming Fetch ──────────────────────────────────────────
  const fetchGroqStreaming = async (userMessage: string) => {
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };

    const allMessages = [
      ...messages.filter(m => m.role === "user" || m.role === "assistant").slice(-10), // last 10 for context
      { role: "user" as const, content: userMessage }
    ];

    const body = JSON.stringify({
      model: model || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...allMessages
      ],
      temperature: 0.5,
      stream: true,
      max_tokens: 2048
    });

    abortRef.current = new AbortController();

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
        signal: abortRef.current.signal
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error?.message || `HTTP ${res.status}`;
        throw new Error(errMsg);
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
        // Parse SSE lines
        const lines = chunk.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setStreamingText(fullText);
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }

      const estPrompt = Math.round((buildSystemPrompt().length + userMessage.length) / 4);
      const estCompletion = Math.round(fullText.length / 4);
      void recordTokenUsage(estPrompt, estCompletion, estPrompt + estCompletion);

      return fullText;
    } catch (e: any) {
      if (e.name === "AbortError") {
        return "⏹️ *Response generation stopped by user.*";
      }
      throw e;
    } finally {
      abortRef.current = null;
    }
  };

  // ─── Non-Streaming API Fetch (OpenAI-compatible) ────────────────────
  const fetchNonStreaming = async (userMessage: string): Promise<string> => {
    const endpoint = getProviderEndpoint(provider, model, ollamaUrl, customProviderEndpoint);
    const headers  = getProviderHeaders(provider, apiKey);
    const defaultModel = provider === "ollama" ? "llama3" : provider === "groq" ? "llama-3.3-70b-versatile" : provider === "custom" ? model : "gpt-4o-mini";

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model || defaultModel,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: userMessage }
        ],
        temperature: 0.5
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }

    // Gemini has different response structure
    if (provider === "gemini") {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (data.usageMetadata) {
        void recordTokenUsage(data.usageMetadata.promptTokenCount || 0, data.usageMetadata.candidatesTokenCount || 0, data.usageMetadata.totalTokenCount || 0);
      } else {
        const estPrompt = Math.round((buildSystemPrompt().length + userMessage.length) / 4);
        const estCompletion = Math.round(text.length / 4);
        void recordTokenUsage(estPrompt, estCompletion, estPrompt + estCompletion);
      }
      return text || "Unable to fetch response from Gemini.";
    }

    const reply = data.choices?.[0]?.message?.content || "";
    if (data.usage) {
      void recordTokenUsage(data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0, data.usage.total_tokens || 0);
    } else {
      const estPrompt = Math.round((buildSystemPrompt().length + userMessage.length) / 4);
      const estCompletion = Math.round(reply.length / 4);
      void recordTokenUsage(estPrompt, estCompletion, estPrompt + estCompletion);
    }

    return reply || "No response from model. Verify config.";
  };

  // ─── Gemini Fetch ──────────────────────────────────────────────────
  const fetchGemini = async (userMessage: string): Promise<string> => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${buildSystemPrompt()}\n\nUser Question: ${userMessage}` }] }
          ]
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
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

  // ─── Handle Send ────────────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent, directMessage?: string) => {
    if (e) e.preventDefault();
    const messageToSend = directMessage || input.trim();
    if (!messageToSend || loading) return;

    setMessages(prev => [...prev, { role: "user", content: messageToSend }]);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      // ── Local Rules ──
      if (provider === "local_rules") {
        setTimeout(() => {
          const reply = getLocalRuleResponse(messageToSend);
          setMessages(prev => [...prev, { role: "assistant", content: reply }]);
          setLoading(false);
        }, 1200);
        return;
      }

      let reply = "";

      // ── Groq with Streaming ──
      if (provider === "groq" && groqStreaming) {
        reply = await fetchGroqStreaming(messageToSend) || "";
      }
      // ── Groq Non-Streaming ──
      else if (provider === "groq" && !groqStreaming) {
        reply = await fetchNonStreaming(messageToSend);
      }
      // ── Gemini ──
      else if (provider === "gemini") {
        reply = await fetchGemini(messageToSend);
      }
      // ── OpenAI-compatible (cerebras, openai, mistral, grok, ollama, custom) ──
      else {
        reply = await fetchNonStreaming(messageToSend);
      }

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      console.error(e);
      const errorMsg = e?.message || "Unknown error";
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `❌ **API Error**: ${errorMsg}\n\nPlease verify your API Key, model name, and internet connection. Switch to **Local AI Rules** for offline help!`
        }
      ]);
    }

    setLoading(false);
    setStreamingText("");
  };

  // ─── Stop Streaming ────────────────────────────────────────────────
  const handleStopStreaming = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleSuggestionClick = (promptText: string) => {
    setInput(promptText);
    void handleSend(undefined, promptText);
  };

  // ─── Speed indicator color for Groq models ─────────────────────────
  const getSpeedColor = (speed: string) => {
    if (speed === "Ultra-Fast") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  };

  const getTagColor = (tag: string) => {
    if (tag === "Recommended") return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
    if (tag === "Fastest") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    if (tag === "Long Context") return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    if (tag === "Reasoning") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    if (tag === "Lightweight") return "text-pink-400 bg-pink-400/10 border-pink-400/20";
    return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  };

  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      {/* ─── Left Column: Chat ──────────────────────────────────────── */}
      <Panel className="flex flex-col h-[75vh] min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl shadow-lg text-slate-950 ${
              provider === "groq"
                ? "bg-gradient-to-br from-orange-400 to-orange-600"
                : "bg-gradient-to-br from-cyan-400 to-blue-500"
            }`}>
              {provider === "groq" ? <Zap className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">AI Study Assistant</h3>
              <p className="text-xs text-slate-400 font-medium italic">
                {provider === "local_rules"
                  ? "Local Rules Engine • 100% Private Offline"
                  : provider === "groq"
                    ? `Groq Cloud ⚡ • ${groqStreaming ? "Streaming ON" : "Streaming OFF"} • ${model}`
                    : `Powered by ${PROVIDERS.find(p => p.id === provider)?.name}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>AI Setup</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 pretty-scrollbar">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 max-w-[85%] ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div className={`p-2 rounded-xl text-xs ${
                msg.role === "user"
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : provider === "groq"
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-white/10 text-cyan-300"
              }`}>
                {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={`rounded-2xl p-4 border ${
                msg.role === "user"
                  ? "bg-cyan-500/10 border-cyan-500/30 text-white rounded-tr-none"
                  : provider === "groq"
                    ? "bg-orange-950/20 border-orange-500/15 text-slate-200 rounded-tl-none"
                    : "bg-slate-900/50 border-white/5 text-slate-200 rounded-tl-none"
              }`}>
                {msg.role === "assistant" ? <Markdown text={msg.content} /> : <p className="text-sm font-medium">{msg.content}</p>}
              </div>
            </div>
          ))}

          {/* Streaming text display */}
          {loading && streamingText && (
            <div className="flex items-start gap-3 max-w-[85%] mr-auto">
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-2xl p-4 bg-orange-950/20 border border-orange-500/15 text-slate-200 rounded-tl-none">
                <Markdown text={streamingText} />
                <span className="inline-block w-1.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {/* Loading indicator (non-streaming) */}
          {loading && !streamingText && (
            <div className="flex items-start gap-3 max-w-[80%]">
              <div className={`p-2 rounded-xl ${
                provider === "groq" ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-cyan-300"
              }`}>
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className={`rounded-2xl p-4 border text-sm flex items-center gap-3 ${
                provider === "groq"
                  ? "bg-orange-950/20 border-orange-500/15 text-orange-300"
                  : "bg-slate-900/50 border-white/5 text-slate-400"
              }`}>
                <span className={`h-2 w-2 rounded-full animate-ping ${
                  provider === "groq" ? "bg-orange-400" : "bg-cyan-400"
                }`} />
                <span>{provider === "groq" ? "Groq is generating at lightning speed..." : "AI is analyzing focus logs..."}</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length === 1 && (
          <div className="py-3 space-y-2">
            <p className="text-xs font-semibold text-slate-400">💡 Suggested Prompts:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Why did I study less?", text: "Why did I study less this week? Give me an analysis based on my subjects." },
                { label: "Optimize my schedule", text: "When is my peak study time? Analyze my sessions and recommend when to study." },
                { label: "Create revision plan", text: "Generate a custom 3-day revision routine for my subjects." }
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(p.text)}
                  className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 text-left transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="pt-3 border-t border-white/10 mt-2 flex gap-2">
          <input
            type="text"
            placeholder="Ask AI study coach a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          {loading && provider === "groq" && groqStreaming ? (
            <button
              onClick={handleStopStreaming}
              className="rounded-2xl bg-gradient-to-r from-red-500 to-red-600 p-3 px-5 text-white hover:scale-105 active:scale-95 transition-all text-xs font-bold"
            >
              ■ Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 p-3 px-5 text-slate-950 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </Panel>

      {/* ─── Right Column: Config ───────────────────────────────────── */}
      <AnimatePresence>
        {(showConfig || windowWidth >= 1280) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-5"
          >
            {/* Persisted Token Usage Tracker */}
            <Panel className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">API Token Tracker</h3>
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
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-2">
                  <p className="text-sm font-bold text-indigo-300">{tokenUsage.prompt.toLocaleString()}</p>
                  <p className="text-[9px] uppercase font-bold text-slate-500">Prompt (In)</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-2">
                  <p className="text-sm font-bold text-cyan-300">{tokenUsage.completion.toLocaleString()}</p>
                  <p className="text-[9px] uppercase font-bold text-slate-500">Response (Out)</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-2">
                  <p className="text-sm font-bold text-amber-400">{tokenUsage.total.toLocaleString()}</p>
                  <p className="text-[9px] uppercase font-bold text-slate-500">Total Tokens</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
                <span>Estimated Cost (Average):</span>
                <span className="font-mono text-emerald-400 font-bold">${((tokenUsage.prompt * 0.00015 + tokenUsage.completion * 0.0006) / 1000).toFixed(6)}</span>
              </div>
            </Panel>

            {/* AI Setup Config Panel */}
            <Panel className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">AI Setup Configuration</h3>
              </div>

              {/* Provider Select */}
              <div className="space-y-2">
                <label className="block text-xs text-slate-400 font-semibold uppercase">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const prov = e.target.value as AiConfig["provider"];
                    setProvider(prov);
                    const matched = PROVIDERS.find(p => p.id === prov);
                    if (matched) setModel(matched.defaultModel || "");
                    setApiKey(apiKeys[prov] || "");
                    setConnectionResult(null);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              {PROVIDERS.find(p => p.id === provider)?.needsKey && (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-400 font-semibold uppercase">API Key</label>
                  <input
                    type="password"
                    placeholder={
                      provider === "groq"
                        ? "Paste your Groq API key from console.groq.com..."
                        : "Paste your API key here..."
                    }
                    value={apiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setApiKey(val);
                      setApiKeys(prev => ({ ...prev, [provider]: val }));
                    }}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    {provider === "groq"
                      ? "Get free API key at console.groq.com — generous free tier available!"
                      : "API Key is saved securely in local IndexedDB only."}
                  </p>
                </div>
              )}

              {/* ─── Groq-Specific Config ─────────────────────────────── */}
              {provider === "groq" && (
                <div className="space-y-3 border border-orange-500/15 rounded-xl p-3 bg-orange-950/10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-bold text-orange-300">Groq Cloud Settings</span>
                  </div>

                  {/* Streaming Toggle */}
                  <div className="flex items-center justify-between">
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
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                          groqStreaming ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Model Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400 font-semibold uppercase">Groq Model</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full rounded-xl border border-orange-500/20 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-400"
                    >
                      {GROQ_MODELS.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.tag}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model Cards */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pretty-scrollbar">
                    {GROQ_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`w-full text-left rounded-lg border p-2 transition-all ${
                          model === m.id
                            ? "border-orange-400/50 bg-orange-400/10"
                            : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{m.name}</span>
                          <div className="flex gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${getTagColor(m.tag)}`}>
                              {m.tag}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${getSpeedColor(m.speed)}`}>
                              {m.speed}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Free Tier Info */}
                  <div className="rounded-lg bg-orange-500/5 border border-orange-500/10 p-2">
                    <p className="text-[10px] text-orange-300/80 leading-relaxed">
                      💡 <strong>Groq free tier:</strong> ~30 requests/min, ~14,400 requests/day. 
                      Llama 3.3 70B is the best all-rounder. Use 8B Instant for fastest responses.
                      DeepSeek R1 Distill for complex reasoning tasks.
                    </p>
                  </div>
                </div>
              )}

              {/* Ollama Config */}
              {provider === "ollama" && (
                <div className="space-y-2 border border-white/5 rounded-xl p-3 bg-white/5">
                  <label className="block text-xs text-slate-400 font-semibold uppercase">Ollama Local URL</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleOllamaDetect}
                      disabled={detecting}
                      className="rounded-lg bg-cyan-500/10 border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300 font-bold hover:bg-cyan-500/20"
                    >
                      {detecting ? "Checking..." : "🔄 Auto-Detect Models"}
                    </button>
                  </div>
                </div>
              )}

              {/* Model Name (non-Groq, non-Ollama-detected) */}
              {provider !== "groq" && !(provider === "ollama" && detectedModels.length > 0) && (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-400 font-semibold uppercase">Model Name</label>
                  <input
                    type="text"
                    placeholder="Enter model identifier..."
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {/* Ollama detected models */}
              {provider === "ollama" && detectedModels.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-400 font-semibold uppercase">Detected Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    {detectedModels.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Provider Config */}
              {provider === "custom" && (
                <div className="space-y-3 border border-purple-500/15 rounded-xl p-3 bg-purple-950/10">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-purple-300">Custom Provider Settings</span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400 font-semibold uppercase">Provider Name</label>
                    <input
                      type="text"
                      placeholder="e.g., My Custom API, Claude Instance..."
                      value={customProviderName}
                      onChange={(e) => setCustomProviderName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400 font-semibold uppercase">API Endpoint URL</label>
                    <input
                      type="text"
                      placeholder="https://api.example.com/v1/chat/completions"
                      value={customProviderEndpoint}
                      onChange={(e) => setCustomProviderEndpoint(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400 font-semibold uppercase">Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g., gpt-4, claude-3-sonnet, llama2..."
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-2">
                    <p className="text-[10px] text-purple-300/80 leading-relaxed">
                      💡 Custom provider must support OpenAI-compatible API format. Ensure endpoint accepts POST requests with `model`, `messages`, and `temperature` fields.
                    </p>
                  </div>
                </div>
              )}

              {connectionResult && (
                <div className={`rounded-xl p-3 text-xs font-semibold ${
                  connectionResult.success 
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/20 text-red-300"
                }`}>
                  {connectionResult.success ? "🟢" : "🔴"} {connectionResult.message}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {testingConnection ? "Testing..." : "⚡ Test Connection"}
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-400 font-medium">{statusMessage}</span>
                  <button
                    onClick={saveSettings}
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </Panel>

            {/* Hardware Model Suggestions */}
            <Panel className="space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Ollama Local Model Suggestions</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Suggesting local models to pull based on your computer hardware profile:
              </p>

              <div className="space-y-2">
                <label className="block text-xs text-slate-500 font-semibold">Select Hardware Profile</label>
                <select
                  value={hardwareSuggestion}
                  onChange={(e) => {
                    const prof = HARDWARE_PROFILES.find(p => p.id === e.target.value);
                    if (prof) {
                      setHardwareSuggestion(e.target.value);
                      if (provider === "ollama") setModel(prof.suggestion);
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                >
                  <option value="">Choose Profile</option>
                  {HARDWARE_PROFILES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  💡 How to download & run Ollama:
                </span>
                <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1">
                  <li>Download Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">ollama.com</a></li>
                  <li>Run command: `ollama run llama3` (or phi3)</li>
                  <li>Enable local browser access by setting the environment variable `OLLAMA_ORIGINS=*` before starting Ollama.</li>
                </ol>
              </div>
            </Panel>

            {/* Privacy Shield */}
            <Panel className="border border-emerald-500/10 bg-emerald-950/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold">Privacy Guaranteed</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All AI credentials and keys are strictly saved locally inside your browser's IndexedDB. Study logs are never transmitted anywhere except to your configured API endpoints. Select **Local AI Rules** or **Ollama** for 100% private offline operations.
              </p>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
