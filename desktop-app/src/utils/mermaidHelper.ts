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

let mermaidInitialized = false;

/**
 * Initializes and renders Mermaid diagram string to a clean, sanitized SVG string.
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

  return sanitized;
}
