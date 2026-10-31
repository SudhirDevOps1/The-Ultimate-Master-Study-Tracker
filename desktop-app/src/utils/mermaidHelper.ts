import DOMPurify from "dompurify";

export interface MermaidPreset {
  id: string;
  name: string;
  code: string;
}

export const MERMAID_PRESETS: MermaidPreset[] = [
  {
    id: "flowchart",
    name: "System Architecture Flow",
    code: `graph TD
    Client["🌐 Client (React / Mobile)"] --> API["⚡ API Gateway / Reverse Proxy"]
    API --> Auth["🔐 Auth Service (JWT / OAuth2)"]
    API --> Core["⚙️ Core Study Tracker Service"]
    Core --> DB[("🗄️ SQLite / Dexie Local DB")]
    Core --> Cache[("⚡ In-Memory Cache")]`,
  },
  {
    id: "sequence",
    name: "Authentication Sequence",
    code: `sequenceDiagram
    autonumber
    actor User as 👤 User
    participant App as 💻 Desktop App
    participant Auth as 🔐 Auth Provider
    participant Vault as 🛡️ Encrypted Vault

    User->>App: Enter Master Password
    App->>Auth: Derive PBKDF2 Key (100k iter)
    Auth-->>App: Master Key Hash
    App->>Vault: Decrypt AES-256-GCM Vault
    Vault-->>User: Decrypted Study Data Ready`,
  },
  {
    id: "dsa",
    name: "Binary Tree / Hierarchy",
    code: `graph TD
    Root["50 (Root)"] --> Left["25"]
    Root --> Right["75"]
    Left --> LL["10"]
    Left --> LR["35"]
    Right --> RL["60"]
    Right --> RR["90"]`,
  },
  {
    id: "states",
    name: "Focus Session State Machine",
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Focusing : Start 25m Timer
    Focusing --> Paused : Break Alert / AFK
    Paused --> Focusing : Resume
    Focusing --> Break : Completed (Chime)
    Break --> Focusing : Next Pomodoro Cycle
    Break --> [*] : End Session`,
  },
];

/* -------------------------------------------------------------------------- */
/*  AI output normalisation                                                   */
/* -------------------------------------------------------------------------- */

/** Diagram keywords that Mermaid accepts as the first meaningful line. */
export const MERMAID_KEYWORDS = [
  "flowchart", "graph", "sequenceDiagram", "classDiagram", "classDiagram-v2",
  "stateDiagram-v2", "stateDiagram", "erDiagram", "journey", "gantt", "pie",
  "mindmap", "timeline", "gitGraph", "quadrantChart", "requirementDiagram",
  "C4Context", "C4Container", "C4Component", "C4Dynamic", "C4Deployment",
  "sankey-beta", "xychart-beta", "block-beta", "packet-beta", "architecture-beta",
];

export const isMermaidStartLine = (line: string): boolean => {
  const t = line.trim();
  if (!t) return false;
  return MERMAID_KEYWORDS.some(
    (kw) => t === kw || t.startsWith(`${kw} `) || t.startsWith(`${kw}\t`) || t.startsWith(`${kw};`)
  );
};

/** Removes a trailing ``` fence and obvious chat/prose lines that follow a diagram. */
const trimTrailingProse = (lines: string[]): string[] => {
  const out = [...lines];
  while (out.length) {
    const last = out[out.length - 1].trim();
    if (!last) { out.pop(); continue; }
    if (last.startsWith("```")) { out.pop(); continue; }
    const looksLikeProse =
      /^(?:#{1,6}\s|>\s|\*\*|__|[-*+]\s)/.test(last) ||
      /^(?:here|this|the (?:above|diagram)|note:|explanation|hope|let me|i hope|above diagram)\b/i.test(last);
    if (!looksLikeProse) break;
    out.pop();
  }
  return out;
};

/**
 * Extracts the raw Mermaid source out of an AI response.
 *
 * Handles the three shapes models usually return:
 *  1. a clean code block, with or without a ```mermaid fence,
 *  2. a fenced block surrounded by commentary,
 *  3. plain prose followed by the diagram (the most common failure mode).
 *
 * The result is *only* the diagram body — never prose, never markdown headings.
 */
export function extractMermaidCode(raw: string): string {
  if (!raw) return "";
  let text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) return "";

  // 1. Prefer an explicitly fenced mermaid block anywhere in the response.
  const fenced = /```(?:mermaid|mmd|mermaidjs)?[ \t]*\n([\s\S]*?)```/i.exec(text);
  if (fenced && fenced[1].trim()) text = fenced[1].trim();
  else {
    // 2. Single-line fence: ```flowchart TD; A-->B```
    const inline = /```(?:mermaid|mmd)?[ \t]*([^\n`]*flowchart[^\n`]*)```/i.exec(text);
    if (inline && inline[1].trim()) text = inline[1].trim();
  }

  const lines = text.split("\n");
  const start = lines.findIndex(isMermaidStartLine);
  const body = start > 0 ? lines.slice(start) : lines;

  return trimTrailingProse(body).join("\n").trim();
}

/** Characters that force a Mermaid label to be quoted. */
const LABEL_NEEDS_QUOTES = /[()[\]{}"#;]/;

const quoteLabel = (label: string): string => `"${label.replace(/"/g, "'").replace(/\s*\n\s*/g, " ").trim()}"`;

/**
 * Repairs the most common Mermaid syntax mistakes models make: unquoted node
 * labels that contain brackets, parentheses, hashes or semicolons. Without
 * this pass Mermaid throws "Lexical error / Parse error" for perfectly
 * readable AI output such as `A[Client (React)]`.
 */
export function sanitizeMermaidLabels(code: string): string {
  if (!code) return "";
  return code
    .split("\n")
    .map((line) => {
      if (/^\s*%%/.test(line)) return line; // comment
      let out = line;
      // A[Label] / A[Label with (parens)]
      out = out.replace(/([A-Za-z0-9_]+)\[([^"\]]+)\]/g, (match, id: string, label: string) =>
        LABEL_NEEDS_QUOTES.test(label) ? `${id}[${quoteLabel(label)}]` : match
      );
      // A{Decision (yes/no)}
      out = out.replace(/([A-Za-z0-9_]+)\{([^"}]+)\}/g, (match, id: string, label: string) =>
        LABEL_NEEDS_QUOTES.test(label) ? `${id}{${quoteLabel(label)}}` : match
      );
      // Edge labels: -->|yes (fast)| becomes -->|"yes (fast)"|
      out = out.replace(/\|([^"|\n]+)\|/g, (match, label: string) =>
        LABEL_NEEDS_QUOTES.test(label) ? `|${quoteLabel(label)}|` : match
      );
      return out;
    })
    .join("\n");
}

/**
 * Deterministic, always-valid Mermaid fallback used when an AI response cannot
 * be turned into renderable syntax (for example the offline tutor, which
 * answers with Markdown prose instead of a diagram).
 */
export function buildFallbackMermaid(topic: string): string {
  const clean =
    (topic || "Study Topic")
      .replace(/["\n\r\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 56) || "Study Topic";

  return `flowchart TD
    T["${clean}"] --> A["Definition & Scope"]
    T --> B["Key Components"]
    T --> C["Process / Flow"]
    B --> D["Examples"]
    C --> E["Common Pitfalls"]
    D --> F["Summary & Revision"]
    E --> F`;
}

let mermaidInitialized = false;

/**
 * Normalizes an SVG string produced by Mermaid:
 * 1. Ensures explicit pixel width and height derived from viewBox so browsers
 *    and canvas engines (such as Fabric.js) do not treat the image as zero-sized.
 * 2. Ensures standard XML namespaces (xmlns and xmlns:xlink).
 */
export function normalizeMermaidSvg(rawSvg: string): { svg: string; width: number; height: number } {
  if (!rawSvg) return { svg: "", width: 600, height: 400 };

  let svg = rawSvg.trim();
  let width = 600;
  let height = 400;

  // Extract viewBox="minX minY width height"
  const vbMatch = svg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (vbMatch) {
    const parsedW = Math.ceil(parseFloat(vbMatch[3]));
    const parsedH = Math.ceil(parseFloat(vbMatch[4]));
    if (parsedW > 0 && Number.isFinite(parsedW)) width = parsedW;
    if (parsedH > 0 && Number.isFinite(parsedH)) height = parsedH;
  }

  // Ensure xmlns is present on the root <svg> tag
  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!svg.includes('xmlns:xlink="http://www.w3.org/1999/xlink"') && svg.includes("xlink:href")) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  // Overwrite or insert explicit pixel width and height
  if (/width=["'][^"']*["']/i.test(svg)) {
    svg = svg.replace(/\bwidth=["'][^"']*["']/i, `width="${width}"`);
  } else {
    svg = svg.replace(/<svg\b/i, `<svg width="${width}"`);
  }

  if (/height=["'][^"']*["']/i.test(svg)) {
    svg = svg.replace(/\bheight=["'][^"']*["']/i, `height="${height}"`);
  } else {
    svg = svg.replace(/<svg\b/i, `<svg height="${height}"`);
  }

  return { svg, width, height };
}

/**
 * Initializes and renders Mermaid diagram string to a clean, sanitized SVG string.
 * Configured with htmlLabels: false so node labels use native SVG <text> elements,
 * ensuring seamless rendering on HTML5 canvas contexts without foreignObject sandboxing blocks.
 */
export async function renderMermaidToSvg(code: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        darkMode: true,
        background: "#020617",
        primaryColor: "#7c3aed",
        primaryTextColor: "#f8fafc",
        primaryBorderColor: "#a855f7",
        lineColor: "#38bdf8",
        secondaryColor: "#0f172a",
        tertiaryColor: "#1e1b4b",
      },
      securityLevel: "loose",
      fontFamily: "Inter, system-ui, sans-serif",
      flowchart: {
        htmlLabels: false,
        curve: "basis",
      },
    });
    mermaidInitialized = true;
  }

  const id = `mermaid-whiteboard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const { svg } = await mermaid.render(id, code.trim());

  // Sanitize SVG output securely using DOMPurify
  const sanitized = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["style", "foreignObject", "marker"],
    ADD_ATTR: ["xmlns", "viewBox", "width", "height", "transform", "class", "style", "marker-end", "marker-start"],
  });

  const { svg: normalized } = normalizeMermaidSvg(sanitized);
  return normalized;
}

/**
 * High-definition vector-to-raster synthesizer for Mermaid diagrams:
 * Renders pure SVG, normalizes viewBox dimensions, and rasterizes onto a 2x
 * devicePixelRatio canvas. Produces a crisp PNG data URL with guaranteed
 * non-zero intrinsic dimensions for seamless Fabric.js whiteboard insertion.
 */
export async function renderMermaidToPngDataUrl(
  code: string,
  scale = 2
): Promise<{ dataUrl: string; width: number; height: number }> {
  const rawSvg = await renderMermaidToSvg(code);
  const { svg, width, height } = normalizeMermaidSvg(rawSvg);
  const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  if (typeof window === "undefined" || typeof document === "undefined" || typeof Image === "undefined") {
    return { dataUrl, width, height };
  }

  return new Promise((resolve) => {
    const img = new Image();

    // In non-canvas or test environments, fallback safely on load/error
    img.onload = () => {
      try {
        const finalW = width || img.naturalWidth || 600;
        const finalH = height || img.naturalHeight || 400;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(finalW * scale);
        canvas.height = Math.round(finalH * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ dataUrl, width: finalW, height: finalH });
          return;
        }

        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, finalW, finalH);
        const pngUrl = canvas.toDataURL("image/png");
        resolve({ dataUrl: pngUrl, width: finalW, height: finalH });
      } catch {
        resolve({ dataUrl, width, height });
      }
    };

    img.onerror = () => {
      resolve({ dataUrl, width, height });
    };

    img.src = dataUrl;

    // Safety timeout: if image decoding is suspended, resolve with SVG data URL
    setTimeout(() => {
      resolve({ dataUrl, width, height });
    }, 1500);
  });
}
