import { useAppStore } from "@/store/useAppStore";
import type { AiConfig } from "@/types/models";
import { buildFallbackMermaid } from "@/utils/mermaidHelper";

/**
 * Decodes error payloads from various AI providers (OpenAI, Mistral, Groq, Gemini, Ollama)
 * into human-readable messages with actionable guidance.
 */
export function decodeAiProviderError(status: number, errData: any, provider: string): string {
  const rawMsg =
    errData?.message ||
    errData?.error?.message ||
    errData?.error ||
    errData?.detail?.[0]?.msg ||
    errData?.detail ||
    (typeof errData === "string" ? errData : "");

  const provLabel = provider ? provider.toUpperCase() : "Provider";

  if (status === 429) {
    if (provider === "mistral") {
      return `HTTP 429 (Quota / Rate Limit): Mistral Free Tier limits reached. Mistral requires billing or phone verification on console.mistral.ai for API chat access. For instant free chat without credit limits, try Groq Cloud (Ultra-Fast) or Google Gemini!`;
    }
    return `HTTP 429 (Rate Limit Exceeded): ${rawMsg || "Too many requests or quota exhausted."} Switch to Groq Cloud (Free Llama 3.3) or Gemini for instant response.`;
  }

  if (status === 404) {
    return `HTTP 404 (Model Not Found): ${rawMsg || "The selected model is not available for chat on this provider."} Please select an active chat model like 'llama-3.3-70b-versatile' (Groq) or 'mistral-small-latest' (Mistral).`;
  }

  if (status === 401 || status === 403) {
    return `HTTP ${status} (Authentication Failed): ${rawMsg || "Invalid API key or unauthorized."} Please verify the API key generated from your ${provLabel} dashboard.`;
  }

  if (rawMsg) {
    return `${provLabel} Error (HTTP ${status}): ${rawMsg}`;
  }

  return `${provLabel} returned HTTP ${status}`;
}

export interface AIResponse {
  success: boolean;
  text: string;
  provider: string;
  model: string;
  error?: string;
}

/**
 * What the caller intends to do with the response. The offline fallback uses
 * this so a diagram request never receives Markdown prose (which Mermaid then
 * fails to parse) and a notes request never receives Mermaid source.
 */
export type AIIntent = "text" | "markdown" | "mermaid";

/**
 * Universal Unified AI Client for FlowTrack Pro.
 * Automatically utilizes the user's active API key and provider configuration
 * saved in the centralized Zustand store.
 * Supports: Gemini, Groq, Mistral, Cerebras, OpenAI, xAI Grok, Ollama, and Local Fallback.
 */
export async function callUnifiedAI(
  prompt: string,
  systemPrompt?: string,
  intent: AIIntent = "text"
): Promise<AIResponse> {
  const { aiConfig } = useAppStore.getState();
  const provider = aiConfig?.provider || "local_rules";
  const apiKey = aiConfig?.apiKey || (aiConfig?.apiKeys ? aiConfig.apiKeys[provider] : "") || "";
  const model = aiConfig?.model || "";
  const ollamaUrl = aiConfig?.ollamaUrl || "http://localhost:11434";
  const customEndpoint = aiConfig?.customProvider?.endpoint || "";

  const defaultSys = systemPrompt || "You are FlowTrack Pro's academic and technical AI tutor. Provide concise, clear, and highly educational explanations.";

  // 1. Google Gemini API
  if (provider === "gemini") {
    if (!apiKey) {
      return getLocalRuleFallback(prompt, "Gemini API key is missing. Using offline academic tutor:", intent);
    }
    try {
      const activeModel = model || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${defaultSys}\n\nUser Question:\n${prompt}` }]
            }
          ]
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(decodeAiProviderError(res.status, errData, "gemini"));
      }

      const data = await res.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { success: true, text: answer, provider: "gemini", model: activeModel };
    } catch (err: any) {
      console.warn("Gemini API call failed, falling back to local tutor:", err);
      return getLocalRuleFallback(prompt, `(Gemini network error: ${err.message}) Local Offline Tutor:`, intent);
    }
  }

  // 2. Universal OpenAI-Compatible Providers (20+ Platforms)
  const endpointMap: Record<string, string> = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
    sambanova: "https://api.sambanova.ai/v1/chat/completions",
    cerebras: "https://api.cerebras.ai/v1/chat/completions",
    deepseek: "https://api.deepseek.com/chat/completions",
    github_models: "https://models.inference.ai.azure.com/chat/completions",
    huggingface: "https://api-inference.huggingface.co/v1/chat/completions",
    together: "https://api.together.xyz/v1/chat/completions",
    deepinfra: "https://api.deepinfra.com/v1/openai/chat/completions",
    novita: "https://api.novita.ai/v3/openai/chat/completions",
    hyperbolic: "https://api.hyperbolic.xyz/v1/chat/completions",
    fireworks: "https://api.fireworks.ai/inference/v1/chat/completions",
    cohere: "https://api.cohere.com/v2/chat",
    perplexity: "https://api.perplexity.ai/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
    grok: "https://api.x.ai/v1/chat/completions",
    openai: "https://api.openai.com/v1/chat/completions",
    cloudflare: "https://api.cloudflare.com/client/v4/accounts/ai/v1/chat/completions",
    ollama: `${ollamaUrl}/v1/chat/completions`,
    lmstudio: "http://localhost:1234/v1/chat/completions",
    custom: customEndpoint
  };

  const endpoint = endpointMap[provider];

  if (endpoint) {
    if (provider !== "ollama" && provider !== "lmstudio" && !apiKey) {
      return getLocalRuleFallback(prompt, `${provider.toUpperCase()} API key is missing. Using offline academic tutor:`, intent);
    }

    try {
      const defaultModels: Record<string, string> = {
        groq: "llama-3.3-70b-versatile",
        openrouter: "meta-llama/llama-3.3-70b-instruct:free",
        sambanova: "Meta-Llama-3.1-70B-Instruct",
        cerebras: "llama3.1-8b",
        deepseek: "deepseek-chat",
        github_models: "gpt-4o-mini",
        huggingface: "mistralai/Mistral-7B-Instruct-v0.3",
        together: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        deepinfra: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        novita: "meta-llama/llama-3.1-8b-instruct",
        hyperbolic: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        fireworks: "accounts/fireworks/models/llama-v3p1-70b-instruct",
        cohere: "command-r",
        perplexity: "sonar",
        mistral: "mistral-small-latest",
        grok: "grok-beta",
        openai: "gpt-4o-mini",
        cloudflare: "@cf/meta/llama-3.1-8b-instruct",
        ollama: "llama3:latest",
        lmstudio: "local-model",
        custom: "custom-model"
      };

      const activeModel = model || defaultModels[provider] || "gpt-4o-mini";

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (apiKey && provider !== "ollama" && provider !== "lmstudio") {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      if (provider === "openrouter") {
        headers["HTTP-Referer"] = "https://flowtrack.pro";
        headers["X-Title"] = "FlowTrack Pro";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: activeModel,
          messages: [
            { role: "system", content: defaultSys },
            { role: "user", content: prompt }
          ],
          temperature: 0.6
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(decodeAiProviderError(res.status, errJson, provider));
      }

      const data = await res.json();
      const answer = data.choices?.[0]?.message?.content || "";
      return { success: true, text: answer, provider, model: activeModel };
    } catch (err: any) {
      console.warn(`${provider} API call failed, falling back to local tutor:`, err);
      return getLocalRuleFallback(prompt, `(${provider} API error: ${err.message}) Local Offline Tutor:`, intent);
    }
  }

  // 3. Default: Offline Local Academic Tutor
  return getLocalRuleFallback(prompt, undefined, intent);
}

/**
 * High-quality offline academic knowledge engine
 */
function getLocalRuleFallback(prompt: string, prefixNotice?: string, intent: AIIntent = "text"): AIResponse {
  const lower = prompt.toLowerCase();
  let answer = "";

  // Diagram requests must never receive prose: Mermaid cannot parse it.
  if (intent === "mermaid") {
    return {
      success: true,
      text: buildFallbackMermaid(prompt),
      provider: "local_rules",
      model: "offline-diagrammer",
    };
  }

  if (lower.includes("java")) {
    answer = `### ☕ Java Fundamentals & Architecture
- **Overview**: Java is a high-level, robust, object-oriented language based on the **WORA** (Write Once, Run Anywhere) principle.
- **JVM, JRE & JDK**:
  - **JDK**: Development tools + compiler (\`javac\`).
  - **JRE**: Libraries + Java Virtual Machine.
  - **JVM**: Executes bytecode (\`.class\`) converting it to native machine instructions.
- **OOP Pillars**:
  1. **Encapsulation**: Bundling data with methods via private fields and public getters/setters.
  2. **Inheritance**: Code reusability using \`extends\`.
  3. **Polymorphism**: Method Overloading (Compile-time) & Overriding (Runtime).
  4. **Abstraction**: Hiding internal implementation using Abstract classes and Interfaces.
- **Collections**: \`ArrayList\`, \`LinkedList\`, \`HashSet\`, \`HashMap\`, \`PriorityQueue\`.`;
  } else if (lower.includes("python")) {
    answer = `### ⚡ Python & Modern Engineering
- **Interpreted & Dynamically Typed**: Clean syntax focusing on developer productivity.
- **Key Concepts**:
  - **Generators**: Lazy evaluation yielding values one at a time using \`yield\` (O(1) memory).
  - **Decorators**: Higher-order functions wrapping behavior around existing functions using \`@\`.
  - **List Comprehensions**: Elegant syntax like \`[x**2 for x in nums if x % 2 == 0]\`.
  - **AsyncIO**: Concurrent non-blocking I/O with \`async\` and \`await\`.`;
  } else if (lower.includes("dsa") || lower.includes("data structure") || lower.includes("algorithm")) {
    answer = `### 📊 Data Structures & Algorithms (DSA) Roadmap
1. **Linear Data Structures**: Arrays, Strings, Two Pointers, Sliding Window, Linked Lists, Stacks, Queues.
2. **Non-Linear Structures**: Binary Trees, BST, Heaps/Priority Queues, Hash Tables.
3. **Advanced Graph Algorithms**: BFS, DFS, Dijkstra's Shortest Path, Topological Sort, Disjoint Set Union (DSU).
4. **Dynamic Programming**: Memoization (Top-down) vs Tabulation (Bottom-up), 0/1 Knapsack, LCS, LIS.`;
  } else {
    answer = `### 📖 Academic Concept Summary:
Here is a structured breakdown for **"${prompt.slice(0, 50)}..."**:
- **Core Definition**: Fundamental principle and theoretical baseline.
- **Key Mechanisms**: How the components interact in practical scenarios.
- **Best Practices**: Step-by-step problem-solving and memory anchors.`;
  }

  const finalBody = prefixNotice ? `> [!NOTE]\n> ${prefixNotice}\n\n${answer}` : answer;
  return { success: true, text: finalBody, provider: "local_rules", model: "offline-tutor" };
}
