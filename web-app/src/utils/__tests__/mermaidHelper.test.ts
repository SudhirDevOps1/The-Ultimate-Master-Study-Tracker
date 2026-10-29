import { describe, it, expect, beforeAll } from "vitest";
import { MERMAID_PRESETS, renderMermaidToSvg } from "../mermaidHelper";

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
});
