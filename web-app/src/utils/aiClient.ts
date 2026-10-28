import { useAppStore } from "@/store/useAppStore";
import type { AiConfig } from "@/types/models";

export interface AIResponse {
  success: boolean;
  text: string;
  provider: string;
  model: string;
  error?: string;
}

/**
 * Universal Unified AI Client for FlowTrack Pro.
 * Automatically utilizes the user's active API key and provider configuration
 * saved in the centralized Zustand store.
 * Supports: Gemini, Groq, Mistral, Cerebras, OpenAI, xAI Grok, Ollama, and Local Fallback.
 */
export async function callUnifiedAI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
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
      return getLocalRuleFallback(prompt, "Gemini API key is missing. Using offline academic tutor:");
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
        throw new Error(errData?.error?.message || `Gemini API error ${res.status}`);
      }

      const data = await res.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { success: true, text: answer, provider: "gemini", model: activeModel };
    } catch (err: any) {
      console.warn("Gemini API call failed, falling back to local tutor:", err);
      return getLocalRuleFallback(prompt, `(Gemini network error: ${err.message}) Local Offline Tutor:`);
    }
  }

  // 2. OpenAI-Compatible Providers (Groq, Cerebras, Mistral, Grok, OpenAI, Ollama, Custom)
  const endpointMap: Record<string, string> = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    cerebras: "https://api.cerebras.ai/v1/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
    grok: "https://api.x.ai/v1/chat/completions",
    openai: "https://api.openai.com/v1/chat/completions",
    ollama: `${ollamaUrl}/v1/chat/completions`,
    custom: customEndpoint
  };

  const endpoint = endpointMap[provider];

  if (endpoint) {
    if (provider !== "ollama" && !apiKey) {
      return getLocalRuleFallback(prompt, `${provider.toUpperCase()} API key is missing. Using offline academic tutor:`);
    }

    try {
      const defaultModels: Record<string, string> = {
        groq: "llama-3.3-70b-versatile",
        cerebras: "llama3.1-8b",
        mistral: "mistral-small-latest",
        grok: "grok-beta",
        openai: "gpt-4o-mini",
        ollama: "llama3",
        custom: "custom-model"
      };

      const activeModel = model || defaultModels[provider] || "gpt-4o-mini";

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (apiKey && provider !== "ollama") {
        headers["Authorization"] = `Bearer ${apiKey}`;
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
        throw new Error(errJson?.error?.message || `${provider} returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const answer = data.choices?.[0]?.message?.content || "";
      return { success: true, text: answer, provider, model: activeModel };
    } catch (err: any) {
      console.warn(`${provider} API call failed, falling back to local tutor:`, err);
      return getLocalRuleFallback(prompt, `(${provider} API error: ${err.message}) Local Offline Tutor:`);
    }
  }

  // 3. Default: Offline Local Academic Tutor
  return getLocalRuleFallback(prompt);
}

/**
 * High-quality offline academic knowledge engine
 */
function getLocalRuleFallback(prompt: string, prefixNotice?: string): AIResponse {
  const lower = prompt.toLowerCase();
  let answer = "";

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
