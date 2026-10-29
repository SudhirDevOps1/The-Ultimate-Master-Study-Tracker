import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchLiveModels, FALLBACK_MODELS } from "../aiModelFetcher";

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

  it("falls back gracefully when network throws an error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network connection lost"));

    const res = await fetchLiveModels("mistral", "valid-key");
    expect(res.success).toBe(false);
    expect(res.models).toEqual(FALLBACK_MODELS.mistral);
    expect(res.error).toBe("Network connection lost");
  });
});
