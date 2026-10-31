import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchLiveModels, FALLBACK_MODELS } from "../aiModelFetcher";
import { decodeAiProviderError } from "../aiClient";

describe("aiModelFetcher", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns local-rules models immediately without network", async () => {
    const res = await fetchLiveModels("local_rules", "");
    expect(res.success).toBe(true);
    expect(res.models[0].id).toBe("local-rules");
  });

  it("handles missing API key gracefully by returning fallback models", async () => {
    const res = await fetchLiveModels("groq", "   ");
    expect(res.success).toBe(false);
    expect(res.models.length).toBeGreaterThan(0);
    expect(res.models.some((m) => m.id.includes("llama"))).toBe(true);
    expect(res.error).toContain("API key is required");
  });

  it("parses Gemini models correctly when network succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          { name: "models/gemini-1.5-flash", displayName: "Gemini 1.5 Flash", supportedGenerationMethods: ["generateContent"] },
          { name: "models/text-embedding-004", displayName: "Embeddings", supportedGenerationMethods: ["embedContent"] },
        ],
      }),
    } as any);

    const res = await fetchLiveModels("gemini", "mock-gemini-key");
    expect(res.success).toBe(true);
    expect(res.models.length).toBe(1);
    expect(res.models[0].id).toBe("gemini-1.5-flash");
    expect(res.models[0].name).toBe("Gemini 1.5 Flash");
  });

  it("parses Groq and Mistral OpenAI-compatible models format", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: "llama-3.3-70b-versatile" }, { id: "mixtral-8x7b-32768" }],
      }),
    } as any);

    const res = await fetchLiveModels("groq", "mock-groq-key");
    expect(res.success).toBe(true);
    expect(res.models.map((m) => m.id)).toEqual(["llama-3.3-70b-versatile", "mixtral-8x7b-32768"]);
  });

  it("filters out inactive models and audio models from Groq", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: "whisper-large-v3", active: true },
          { id: "allam-2-7b", active: false },
          { id: "llama-3.1-8b-instant", active: true },
          { id: "llama-guard-3-8b", active: true },
          { id: "llama-3.3-70b-versatile", active: true },
        ],
      }),
    } as any);

    const res = await fetchLiveModels("groq", "mock-groq-key");
    expect(res.success).toBe(true);
    // whisper, allam-2-7b (inactive), and guard must be excluded
    const ids = res.models.map((m) => m.id);
    expect(ids).not.toContain("whisper-large-v3");
    expect(ids).not.toContain("allam-2-7b");
    expect(ids).not.toContain("llama-guard-3-8b");
    // llama-3.3-70b-versatile must be prioritized first
    expect(ids[0]).toBe("llama-3.3-70b-versatile");
    expect(ids[1]).toBe("llama-3.1-8b-instant");
  });

  it("falls back gracefully when network throws an error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network connection lost"));

    const res = await fetchLiveModels("mistral", "valid-key");
    expect(res.success).toBe(false);
    expect(res.models).toEqual(FALLBACK_MODELS.mistral);
    expect(res.error).toBe("Network connection lost");
  });

  describe("decodeAiProviderError", () => {
    it("decodes Mistral 429 quota exhaustion with guidance", () => {
      const err = decodeAiProviderError(429, { message: "Rate limit exceeded: You have reached your monthly spending limit." }, "mistral");
      expect(err).toContain("HTTP 429 (Quota / Rate Limit)");
      expect(err).toContain("Mistral Free Tier");
      expect(err).toContain("Groq Cloud");
    });

    it("decodes 404 model not found error with suggestion to pick verified model", () => {
      const err = decodeAiProviderError(404, { error: { message: "The model 'allam-2-7b' does not exist." } }, "groq");
      expect(err).toContain("HTTP 404 (Model Not Found)");
      expect(err).toContain("llama-3.3-70b-versatile");
    });

    it("decodes 401 unauthorized key errors", () => {
      const err = decodeAiProviderError(401, { message: "Unauthorized" }, "mistral");
      expect(err).toContain("HTTP 401 (Authentication Failed)");
    });
  });
});
