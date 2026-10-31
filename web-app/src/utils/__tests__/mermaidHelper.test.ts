import { describe, it, expect, beforeAll } from "vitest";
import {
  MERMAID_PRESETS,
  renderMermaidToSvg,
  renderMermaidToPngDataUrl,
  normalizeMermaidSvg,
  extractMermaidCode,
  sanitizeMermaidLabels,
  buildFallbackMermaid,
} from "../mermaidHelper";

beforeAll(() => {
  if (typeof window !== "undefined" && window.SVGElement) {
    const proto = window.SVGElement.prototype as any;
    if (!proto.getBBox) {
      proto.getBBox = function () {
        return { x: 0, y: 0, width: 120, height: 60 };
      };
    }
    if (!proto.getComputedTextLength) {
      proto.getComputedTextLength = function () {
        return 50;
      };
    }
  }
});

describe("mermaidHelper", () => {
  it("defines standard study presets with valid syntax", () => {
    expect(MERMAID_PRESETS.length).toBeGreaterThanOrEqual(4);
    const flowchart = MERMAID_PRESETS.find((p) => p.id === "flowchart");
    expect(flowchart).toBeDefined();
    expect(flowchart?.code).toContain("graph TD");
  });

  it("renders a valid Mermaid flowchart into sanitized SVG", async () => {
    const code = `graph TD\n  A["Start"] --> B["Finish"]`;
    const svg = await renderMermaidToSvg(code);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Start");
    expect(svg).toContain("Finish");
  }, 45000);

  it("rejects dangerous or script tags during SVG rendering", async () => {
    const maliciousCode = `graph TD\n  A["<script>alert(1)</script>Safe"] --> B["Node"]`;
    const svg = await renderMermaidToSvg(maliciousCode);
    expect(svg).not.toContain("<script>");
  }, 45000);

  it("normalizes SVG viewBox into explicit width and height attributes", () => {
    const sample = `<svg viewBox="0 0 850 420"><rect width="100" height="100"/></svg>`;
    const { svg, width, height } = normalizeMermaidSvg(sample);
    expect(width).toBe(850);
    expect(height).toBe(420);
    expect(svg).toContain('width="850"');
    expect(svg).toContain('height="420"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("synthesizes high-DPI data URL for whiteboard insertion", async () => {
    const code = `flowchart LR\n  A["Input"] --> B["Output"]`;
    const result = await renderMermaidToPngDataUrl(code);
    expect(result.dataUrl).toBeDefined();
    expect(result.dataUrl.startsWith("data:image/")).toBe(true);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  }, 45000);
});

describe("AI Mermaid normalisation", () => {
  it("extracts a fenced mermaid block and drops surrounding commentary", () => {
    const raw = `Sure! Here is the diagram you asked for:\n\n\`\`\`mermaid\nflowchart TD\n  A["Start"] --> B["End"]\n\`\`\`\n\nThis diagram shows the happy path.`;
    const code = extractMermaidCode(raw);
    expect(code.startsWith("flowchart TD")).toBe(true);
    expect(code).toContain('A["Start"] --> B["End"]');
    expect(code).not.toContain("Sure!");
    expect(code).not.toContain("happy path");
    expect(code).not.toContain("```");
  });

  it("recovers a diagram that follows plain prose with no fence", () => {
    const raw = `Here is a study workflow:\n\nflowchart LR\n  A[Read] --> B[Recall]\n  B --> C[Review]\n\nHope this helps!`;
    const code = extractMermaidCode(raw);
    expect(code.startsWith("flowchart LR")).toBe(true);
    expect(code).toContain("A[Read] --> B[Recall]");
    expect(code).not.toContain("Here is");
    expect(code).not.toContain("Hope this helps");
  });

  it("returns an empty string when the response has no diagram", () => {
    expect(extractMermaidCode("### Notes\n- Core definition\n- Key mechanisms")).toBe("");
  });

  it("quotes labels that contain parentheses, brackets or hashes", () => {
    const code = sanitizeMermaidLabels(`flowchart TD\n  A[Client (React)] --> B{Ready? (yes/no)}\n  A -->|fast (cached)| C[Step #1]`);
    expect(code).toContain('A["Client (React)"]');
    expect(code).toContain('B{"Ready? (yes/no)"}');
    expect(code).toContain('|"fast (cached)"|');
    expect(code).toContain('C["Step #1"]');
  });

  it("builds a deterministic, renderable fallback from any topic", async () => {
    const code = buildFallbackMermaid('Operating Systems "Deadlock" & Scheduling');
    expect(code.startsWith("flowchart TD")).toBe(true);
    expect(code).toContain("Operating Systems");
    expect(code).not.toContain('"Deadlock"');
    const svg = await renderMermaidToSvg(code);
    expect(svg).toContain("<svg");
  }, 45000);
});
