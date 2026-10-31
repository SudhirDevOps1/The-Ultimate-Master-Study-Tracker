import type { AiConfig } from "@/types/models";

export interface FetchedModel {
  id: string;
  name: string;
}

export const FALLBACK_MODELS: Record<string, FetchedModel[]> = {
  gemini: [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fast & Balanced)" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Complex Reasoning)" },
    { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (32k Context)" },
    { id: "gemma2-9b-it", name: "Gemma 2 9B IT" },
  ],
  mistral: [
    { id: "mistral-small-latest", name: "Mistral Small (Fast)" },
    { id: "mistral-large-latest", name: "Mistral Large (High Accuracy)" },
    { id: "codestral-latest", name: "Codestral (Code & Architecture)" },
    { id: "open-mistral-nemo", name: "Mistral Nemo 12B" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o (Omni Multimodal)" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast & Efficient)" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  ],
  cerebras: [
    { id: "llama3.1-70b", name: "Llama 3.1 70B (Fast Inference)" },
    { id: "llama3.1-8b", name: "Llama 3.1 8B (Ultra Fast)" },
  ],
  ollama: [
    { id: "llama3:latest", name: "Llama 3 (Local)" },
    { id: "mistral:latest", name: "Mistral (Local)" },
    { id: "deepseek-r1:latest", name: "DeepSeek R1 (Local)" },
    { id: "phi3:latest", name: "Phi-3 Mini (Local)" },
  ],
  local_rules: [
    { id: "local-rules", name: "FlowTrack Offline Academic Engine" },
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

    return { success: true, models: fallback };
  } catch (err: any) {
    return {
      success: false,
      models: fallback,
      error: err.message || "Failed to fetch live models from provider",
    };
  }
}
