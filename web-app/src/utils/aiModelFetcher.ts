import type { AiConfig } from "@/types/models";

export interface FetchedModel {
  id: string;
  name: string;
}

export const FALLBACK_MODELS: Record<string, FetchedModel[]> = {
  // ── 100% Free / Generous Free Tiers ──
  local_rules: [
    { id: "local-rules", name: "FlowTrack Offline Academic Engine (100% Free & Private)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile (100% Free Ultra-Fast)" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant (Ultra-Fast Free)" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (32k Context Free)" },
    { id: "gemma2-9b-it", name: "Gemma 2 9B IT (Free)" },
    { id: "qwen-2.5-32b", name: "Qwen 2.5 32B (Free)" },
  ],
  openrouter: [
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (100% Free)" },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Exp (100% Free)" },
    { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 Reasoner (100% Free)" },
    { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (100% Free)" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Instruct (100% Free)" },
  ],
  sambanova: [
    { id: "Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B Instruct (100% Free Fast)" },
    { id: "Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct (100% Free Ultra-Fast)" },
    { id: "Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B Instruct (100% Free)" },
    { id: "Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct (100% Free)" },
  ],
  gemini: [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Free Tier 15 RPM)" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Complex Reasoning)" },
    { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental Free)" },
  ],
  github_models: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (GitHub Developer Free)" },
    { id: "Phi-3.5-mini-instruct", name: "Phi-3.5 Mini Instruct (Free)" },
    { id: "Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B (GitHub Free)" },
    { id: "AI21-Jamba-1.5-Mini", name: "Jamba 1.5 Mini (GitHub Free)" },
  ],
  cerebras: [
    { id: "llama3.1-8b", name: "Llama 3.1 8B (Free Ultra-Fast 1800 T/s)" },
    { id: "llama3.1-70b", name: "Llama 3.1 70B (Free High-Speed)" },
  ],
  huggingface: [
    { id: "mistralai/Mistral-7B-Instruct-v0.3", name: "Mistral 7B Instruct v0.3 (Free)" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B Instruct (Free)" },
    { id: "meta-llama/Meta-Llama-3-8B-Instruct", name: "Llama 3 8B Instruct (Free)" },
  ],

  // ── High Performance / Low Cost / Trial Credits ──
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek V3 (Chat & Coding)" },
    { id: "deepseek-reasoner", name: "DeepSeek R1 (Deep Chain-of-Thought)" },
  ],
  together: [
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", name: "Llama 3.1 8B Turbo (Fast)" },
    { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", name: "Mixtral 8x7B (High Quality)" },
    { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B Turbo" },
  ],
  deepinfra: [
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct" },
    { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B Instruct" },
  ],
  novita: [
    { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
  ],
  hyperbolic: [
    { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B Instruct" },
    { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B Instruct" },
  ],
  fireworks: [
    { id: "accounts/fireworks/models/llama-v3p1-70b-instruct", name: "Llama 3.1 70B Instruct" },
    { id: "accounts/fireworks/models/qwen2p5-72b-instruct", name: "Qwen 2.5 72B Instruct" },
  ],
  cohere: [
    { id: "command-r", name: "Command R (Conversational & RAG)" },
    { id: "command-r-plus", name: "Command R+ (Enterprise Reasoning)" },
  ],
  perplexity: [
    { id: "sonar", name: "Sonar (Live Search Augmented)" },
    { id: "sonar-pro", name: "Sonar Pro (Deep Web Search)" },
    { id: "sonar-reasoning", name: "Sonar Reasoning (Search + Chain-of-Thought)" },
  ],

  // ── Commercial Flagships ──
  openai: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast & Efficient)" },
    { id: "gpt-4o", name: "GPT-4o (Omni Multimodal)" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  ],
  mistral: [
    { id: "mistral-small-latest", name: "Mistral Small (Fast)" },
    { id: "codestral-latest", name: "Codestral (Code & Architecture)" },
    { id: "mistral-large-latest", name: "Mistral Large (High Accuracy)" },
    { id: "open-mistral-nemo", name: "Mistral Nemo 12B" },
  ],
  grok: [
    { id: "grok-beta", name: "Grok Beta (Fast Real-Time)" },
    { id: "grok-2-vision-1212", name: "Grok 2 Vision" },
  ],

  // ── 100% Offline Local Inference ──
  ollama: [
    { id: "llama3:latest", name: "Llama 3 (Local Offline)" },
    { id: "deepseek-r1:latest", name: "DeepSeek R1 (Local Offline)" },
    { id: "mistral:latest", name: "Mistral (Local Offline)" },
    { id: "phi3:latest", name: "Phi-3 Mini (Local Offline)" },
  ],
  lmstudio: [
    { id: "local-model", name: "LM Studio Active Model (Port 1234)" },
  ],

  // ── Cloudflare / Custom ──
  cloudflare: [
    { id: "@cf/meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct (10k Neurons/Day Free)" },
    { id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", name: "DeepSeek R1 Distill 32B" },
  ],
  custom: [
    { id: "custom-model", name: "Custom Configured Model" },
  ],
};

/**
 * Fetches real-time available models from the provider's API.
 * Gracefully falls back to curated models if offline or on network error.
 */
export async function fetchLiveModels(
  provider: AiConfig["provider"],
  apiKey: string,
  ollamaUrl = "http://localhost:11434"
): Promise<{ success: boolean; models: FetchedModel[]; error?: string }> {
  const fallback = FALLBACK_MODELS[provider] || FALLBACK_MODELS.local_rules;

  if (provider === "local_rules") {
    return { success: true, models: fallback };
  }

  try {
    if (provider === "gemini") {
      if (!apiKey.trim()) return { success: false, models: fallback, error: "API key is required" };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const rawList = Array.isArray(data?.models) ? data.models : [];
      const models: FetchedModel[] = rawList
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => {
          const id = (m.name || "").replace("models/", "");
          return { id, name: m.displayName || id };
        });
      return { success: true, models: models.length > 0 ? models : fallback };
    }

    if (provider === "groq") {
      if (!apiKey.trim()) return { success: false, models: fallback, error: "API key is required" };
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || errJson?.message || `Groq API returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const raw = Array.isArray(data?.data) ? data.data : [];
      // Filter out inactive models, audio models (whisper), guardrails, embeddings
      const filtered = raw
        .filter((m: any) => {
          if (m.active === false) return false;
          const id = (m.id || "").toLowerCase();
          if (id.includes("whisper") || id.includes("tts") || id.includes("guard") || id.includes("bge") || id.includes("embed")) return false;
          return true;
        })
        .map((m: any) => ({ id: m.id, name: m.id }));

      // Prioritize fast, high-quality production chat models at top of list
      const priorityOrder = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
        "qwen-2.5-32b",
        "deepseek-r1-distill-llama-70b",
      ];
      filtered.sort((a, b) => {
        const idxA = priorityOrder.indexOf(a.id);
        const idxB = priorityOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      return { success: true, models: filtered.length > 0 ? filtered : fallback };
    }

    if (provider === "mistral") {
      if (!apiKey.trim()) return { success: false, models: fallback, error: "API key is required" };
      const res = await fetch("https://api.mistral.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.message || errJson?.error?.message || `Mistral API returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const raw = Array.isArray(data?.data) ? data.data : [];
      const filtered = raw
        .filter((m: any) => {
          const id = (m.id || "").toLowerCase();
          if (id.includes("embed") || id.includes("moderation")) return false;
          return true;
        })
        .map((m: any) => ({ id: m.id, name: m.id }));

      const priorityOrder = [
        "mistral-small-latest",
        "codestral-latest",
        "mistral-large-latest",
        "open-mistral-nemo",
        "open-codestral-mamba",
      ];
      filtered.sort((a, b) => {
        const idxA = priorityOrder.indexOf(a.id);
        const idxB = priorityOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      return { success: true, models: filtered.length > 0 ? filtered : fallback };
    }

    if (provider === "openai") {
      if (!apiKey.trim()) return { success: false, models: fallback, error: "API key is required" };
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) throw new Error(`OpenAI API returned HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data?.data) ? data.data : [];
      const chatModels = raw
        .filter((m: any) => m.id.includes("gpt") || m.id.includes("o1") || m.id.includes("o3"))
        .map((m: any) => ({ id: m.id, name: m.id }));
      return { success: true, models: chatModels.length > 0 ? chatModels : fallback };
    }

    if (provider === "cerebras") {
      if (!apiKey.trim()) return { success: false, models: fallback, error: "API key is required" };
      const res = await fetch("https://api.cerebras.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) throw new Error(`Cerebras API returned HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data?.data) ? data.data : [];
      const models = raw.map((m: any) => ({ id: m.id, name: m.id }));
      return { success: true, models: models.length > 0 ? models : fallback };
    }

    if (provider === "ollama") {
      const url = (ollamaUrl.trim() || "http://localhost:11434").replace(/\/$/, "");
      const res = await fetch(`${url}/api/tags`);
      if (!res.ok) throw new Error(`Ollama returned HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data?.models) ? data.models : [];
      const models = raw.map((m: any) => ({ id: m.name, name: `${m.name} (${Math.round((m.size || 0) / (1024 * 1024))}MB)` }));
      return { success: true, models: models.length > 0 ? models : fallback };
    }

    // Universal OpenAI-compatible models discovery
    const openAiModelsEndpoints: Partial<Record<AiConfig["provider"], string>> = {
      openrouter: "https://openrouter.ai/api/v1/models",
      sambanova: "https://api.sambanova.ai/v1/models",
      deepseek: "https://api.deepseek.com/models",
      together: "https://api.together.xyz/v1/models",
      deepinfra: "https://api.deepinfra.com/v1/openai/models",
      novita: "https://api.novita.ai/v3/openai/models",
      hyperbolic: "https://api.hyperbolic.xyz/v1/models",
      fireworks: "https://api.fireworks.ai/inference/v1/models",
      perplexity: "https://api.perplexity.ai/models",
      github_models: "https://models.inference.ai.azure.com/models",
      lmstudio: "http://localhost:1234/v1/models",
    };

    const targetEndpoint = openAiModelsEndpoints[provider];
    if (targetEndpoint) {
      if (provider !== "lmstudio" && !apiKey.trim()) {
        return { success: false, models: fallback, error: "API key is required" };
      }
      const headers: Record<string, string> = {};
      if (apiKey.trim()) {
        headers["Authorization"] = `Bearer ${apiKey.trim()}`;
      }
      if (provider === "openrouter") {
        headers["HTTP-Referer"] = "https://flowtrack.pro";
        headers["X-Title"] = "FlowTrack Pro";
      }

      const res = await fetch(targetEndpoint, { headers });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || errJson?.message || `${provider} returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const raw = Array.isArray(data?.data) ? data.data : [];
      let models = raw
        .filter((m: any) => m.active !== false)
        .map((m: any) => ({
          id: m.id,
          name: provider === "openrouter" && m.id.endsWith(":free") ? `🌟 ${m.name || m.id}` : (m.name || m.id)
        }));

      if (provider === "openrouter") {
        // Put free models first
        models.sort((a: any, b: any) => {
          const aFree = a.id.endsWith(":free");
          const bFree = b.id.endsWith(":free");
          if (aFree && !bFree) return -1;
          if (!aFree && bFree) return 1;
          return a.name.localeCompare(b.name);
        });
      }

      return { success: true, models: models.length > 0 ? models : fallback };
    }

    return { success: true, models: fallback };
  } catch (err: any) {
    return {
      success: false,
      models: fallback,
      error: err.message || "Failed to fetch live models from provider",
    };
  }
}
