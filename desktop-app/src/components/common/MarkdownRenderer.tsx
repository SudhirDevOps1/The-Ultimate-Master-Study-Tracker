import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-markup";
import React, { useState, Component, type ReactNode } from "react";
import DOMPurify from "dompurify";
import { MermaidChart } from "./MermaidChart";
import { Copy, Check, Terminal, ExternalLink, AlertTriangle } from "lucide-react";
import { latexToMathML } from "@/utils/latexToMathML";
import { isMermaidStartLine } from "@/utils/mermaidHelper";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Security: Protocol whitelist for safe links
const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

function isSafeUrl(url: string): boolean {
  try {
    const trimmed = url.trim();
    if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("#")) {
      return true;
    }
    const parsed = new URL(trimmed);
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("blob:") || trimmed.startsWith("/") || trimmed.startsWith("./")) {
    return true;
  }
  return isSafeUrl(trimmed);
}

// Sanitization config allowing native MathML tags and SVG
const SANITIZE_CONFIG = {
  ADD_TAGS: [
    "math", "mrow", "mfrac", "msup", "msub", "msubsup",
    "msqrt", "mroot", "mi", "mn", "mo", "mtext", "mspace", "span"
  ],
  ADD_ATTR: ["xmlns", "display", "fence", "width", "mathvariant", "class"],
};

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

// Error boundary to prevent any markdown parsing error from breaking the application
class MarkdownErrorBoundary extends Component<
  { children: ReactNode; fallbackContent?: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallbackContent?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[MarkdownRenderer] Error rendering markdown:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <pre className="whitespace-pre-wrap font-mono text-[11px] overflow-x-auto">
            {this.props.fallbackContent || "Failed to render formatted content."}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <MarkdownErrorBoundary fallbackContent={content}>
      <MarkdownRendererInner content={content} className={className} />
    </MarkdownErrorBoundary>
  );
}

function MarkdownRendererInner({ content, className = "" }: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return (
      <div className="py-6 text-center text-slate-500 italic text-xs">
        (Empty document preview)
      </div>
    );
  }

  const lines = content.split("\n");
  const blocks: Array<{
    type: "h1" | "h2" | "h3" | "h4" | "p" | "ul" | "ol" | "blockquote" | "code" | "mermaid" | "hr" | "table" | "math";
    content: any;
    lang?: string;
  }> = [];

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeBlockLang = "";
  let inMathBlock = false;
  let mathBlockBuffer: string[] = [];
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let currentList: { type: "ul" | "ol"; items: { text: string; isTask?: boolean; checked?: boolean }[] } | null = null;
  let currentQuote: string[] = [];

  const flushList = () => {
    if (currentList) {
      blocks.push({ type: currentList.type, content: currentList.items });
      currentList = null;
    }
  };

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      blocks.push({ type: "blockquote", content: [...currentQuote] });
      currentQuote = [];
    }
  };

  const flushTable = () => {
    if (currentTable) {
      blocks.push({ type: "table", content: currentTable });
      currentTable = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // 1. Math Block ($$...$$)
    if (trimmed.startsWith("$$")) {
      flushList();
      flushQuote();
      flushTable();

      if (inMathBlock) {
        // Closing multiline math block
        const formula = mathBlockBuffer.join("\n");
        blocks.push({ type: "math", content: formula });
        inMathBlock = false;
        mathBlockBuffer = [];
        continue;
      } else if (trimmed.endsWith("$$") && trimmed.length > 2) {
        // Single-line block math: $$ formula $$
        const formula = trimmed.slice(2, -2).trim();
        blocks.push({ type: "math", content: formula });
        continue;
      } else {
        // Opening multiline math block
        inMathBlock = true;
        const remainder = trimmed.slice(2).trim();
        if (remainder) mathBlockBuffer.push(remainder);
        continue;
      }
    }

    if (inMathBlock) {
      if (trimmed.endsWith("$$")) {
        const remainder = trimmed.slice(0, -2).trim();
        if (remainder) mathBlockBuffer.push(remainder);
        const formula = mathBlockBuffer.join("\n");
        blocks.push({ type: "math", content: formula });
        inMathBlock = false;
        mathBlockBuffer = [];
      } else {
        mathBlockBuffer.push(rawLine);
      }
      continue;
    }

    // 2. Code Block Fence (```)
    if (trimmed.startsWith("```")) {
      flushList();
      flushQuote();
      flushTable();

      if (inCodeBlock) {
        const fullCode = codeBlockBuffer.join("\n");
        const cleanLang = codeBlockLang.trim().toLowerCase();
        const isMermaid =
          cleanLang === "mermaid" ||
          cleanLang === "mmd" ||
          cleanLang === "mermaidjs" ||
          (!cleanLang && isMermaidStartLine(fullCode));

        if (isMermaid) {
          blocks.push({ type: "mermaid", content: fullCode, lang: "mermaid" });
        } else {
          blocks.push({ type: "code", content: fullCode, lang: codeBlockLang });
        }
        inCodeBlock = false;
        codeBlockBuffer = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(rawLine);
      continue;
    }

    // 3. Table row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      flushQuote();

      const isSeparator = /^[|:\s\-]+$/.test(trimmed);
      if (isSeparator) {
        continue;
      }

      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // 4. Blockquote
    if (line.startsWith("> ") || line === ">") {
      flushList();
      currentQuote.push(line.startsWith("> ") ? line.slice(2) : "");
      continue;
    } else {
      flushQuote();
    }

    // 5. Horizontal Rule
    if (/^[=\-*_]{3,}$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "hr", content: "" });
      continue;
    }

    // 6. Headings
    if (line.startsWith("# ")) {
      flushList();
      blocks.push({ type: "h1", content: line.slice(2) });
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push({ type: "h2", content: line.slice(3) });
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", content: line.slice(4) });
      continue;
    }
    if (line.startsWith("#### ")) {
      flushList();
      blocks.push({ type: "h4", content: line.slice(5) });
      continue;
    }

    // 7. Task List or Unordered List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemRaw = trimmed.slice(2);
      let isTask = false;
      let checked = false;
      let text = itemRaw;

      if (itemRaw.startsWith("[ ] ")) {
        isTask = true;
        checked = false;
        text = itemRaw.slice(4);
      } else if (itemRaw.startsWith("[x] ") || itemRaw.startsWith("[X] ")) {
        isTask = true;
        checked = true;
        text = itemRaw.slice(4);
      }

      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push({ text, isTask, checked });
      continue;
    }

    // 8. Ordered List
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push({ text: olMatch[2] });
      continue;
    }

    flushList();

    // 9. Paragraph or Empty
    if (trimmed.length > 0) {
      blocks.push({ type: "p", content: line });
    }
  }

  flushList();
  flushQuote();
  flushTable();

  // If still in unclosed blocks, flush them gracefully
  if (inMathBlock && mathBlockBuffer.length > 0) {
    blocks.push({ type: "math", content: mathBlockBuffer.join("\n") });
  }
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    const fullCode = codeBlockBuffer.join("\n");
    const cleanLang = codeBlockLang.trim().toLowerCase();
    const isMermaid =
      cleanLang === "mermaid" ||
      cleanLang === "mmd" ||
      cleanLang === "mermaidjs" ||
      (!cleanLang && isMermaidStartLine(fullCode));

    if (isMermaid) {
      blocks.push({ type: "mermaid", content: fullCode, lang: "mermaid" });
    } else {
      blocks.push({ type: "code", content: fullCode, lang: codeBlockLang });
    }
  }

  return (
    <div className={`space-y-3 leading-relaxed text-slate-300 text-sm ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={idx}
                className="text-2xl font-black text-white mt-5 mb-2 pb-1.5 border-b border-white/10 flex items-center gap-2"
              >
                <span className="w-1.5 h-5 rounded-full bg-cyan-400" />
                <span>{renderInline(block.content)}</span>
              </h1>
            );
          case "h2":
            return (
              <h2
                key={idx}
                className="text-lg font-bold text-cyan-300 mt-4 mb-2 flex items-center gap-2"
              >
                <span className="w-1.5 h-4 rounded-full bg-indigo-500" />
                <span>{renderInline(block.content)}</span>
              </h2>
            );
          case "h3":
            return (
              <h3 key={idx} className="text-base font-semibold text-white mt-3 mb-1">
                {renderInline(block.content)}
              </h3>
            );
          case "h4":
            return (
              <h4 key={idx} className="text-sm font-semibold text-slate-300 mt-2 mb-1">
                {renderInline(block.content)}
              </h4>
            );
          case "p":
            return (
              <p key={idx} className="my-1.5 text-slate-300 leading-relaxed">
                {renderInline(block.content)}
              </p>
            );
          case "math":
            return (
              <div
                key={idx}
                className="my-3 p-3 overflow-x-auto text-center bg-slate-950/70 border border-slate-800/80 rounded-2xl shadow-inner font-serif text-slate-100"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(latexToMathML(block.content, true)),
                }}
              />
            );
          case "hr":
            return <hr key={idx} className="my-4 border-slate-800" />;
          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="my-3 border-l-4 border-purple-500/70 bg-purple-500/5 px-4 py-2 rounded-r-xl italic text-slate-300 space-y-1"
              >
                {block.content.map((q: string, qi: number) => (
                  <p key={qi}>{renderInline(q)}</p>
                ))}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={idx} className="space-y-1.5 my-2 pl-4 list-none">
                {block.content.map((item: any, ii: number) => {
                  if (item.isTask) {
                    return (
                      <li key={ii} className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          readOnly
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0 cursor-default"
                        />
                        <span className={item.checked ? "line-through text-slate-500" : ""}>
                          {renderInline(item.text)}
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={ii} className="flex items-start gap-2 text-slate-300">
                      <span className="text-purple-400 mt-1.5 text-[8px]">•</span>
                      <span>{renderInline(item.text)}</span>
                    </li>
                  );
                })}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="space-y-1.5 my-2 pl-6 list-decimal text-slate-300">
                {block.content.map((item: any, ii: number) => (
                  <li key={ii} className="pl-1">
                    {renderInline(item.text)}
                  </li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div
                key={idx}
                className="overflow-x-auto my-3 rounded-2xl border border-white/10 bg-slate-950/60 shadow-lg"
              >
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04]">
                      {block.content.headers.map((h: string, i: number) => (
                        <th key={i} className="p-3 font-bold text-white">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.content.rows.map((row: string[], ri: number) => (
                      <tr
                        key={ri}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        {row.map((cell: string, ci: number) => (
                          <td key={ci} className="p-3 text-slate-300">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "mermaid":
            return <MermaidChart key={idx} chart={block.content} />;
          case "code":
            return <CodeBlock key={idx} code={block.content} lang={block.lang} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  py: "python",
  python: "python",
  java: "java",
  sql: "sql",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  cs: "csharp",
  csharp: "csharp",
  go: "go",
  golang: "go",
  rs: "rust",
  rust: "rust",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  css: "css",
  md: "markdown",
  markdown: "markdown",
  html: "markup",
  xml: "markup",
  markup: "markup",
};

function highlightCodeWithPrism(code: string, lang?: string): { html: string; resolvedLang: string } {
  if (!lang) {
    return {
      html: code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
      resolvedLang: "text"
    };
  }

  const rawLang = lang.trim().toLowerCase();
  const resolved = LANGUAGE_ALIASES[rawLang] || rawLang;
  const grammar = (Prism.languages as any)[resolved];

  if (!grammar) {
    return {
      html: code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
      resolvedLang: rawLang
    };
  }

  try {
    return {
      html: Prism.highlight(code, grammar, resolved),
      resolvedLang: resolved
    };
  } catch {
    return {
      html: code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
      resolvedLang: rawLang
    };
  }
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const lines = React.useMemo(() => code.split("\n"), [code]);
  const { html, resolvedLang } = React.useMemo(() => highlightCodeWithPrism(code, lang), [code, lang]);

  return (
    <div className="my-3 rounded-2xl border border-white/10 bg-slate-950/95 overflow-hidden shadow-xl group">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-300 uppercase text-[11px] tracking-wide">{resolvedLang || lang || "code"}</span>
          <span className="text-[10px] text-slate-500 font-normal">({lines.length} lines)</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 hover:text-white font-semibold transition"
          title="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      {/* Code Body with Line Numbers & Syntax Highlighting */}
      <div className="p-3.5 overflow-x-auto pretty-scrollbar flex text-xs font-mono leading-relaxed bg-[#090d16]/90">
        {/* Line Numbers */}
        <div className="select-none pr-3 text-right text-slate-600 font-mono border-r border-white/10 shrink-0 min-w-[2.2rem]">
          {lines.map((_, i) => (
            <div key={i} className="leading-relaxed">{i + 1}</div>
          ))}
        </div>

        {/* Highlighted Code */}
        <pre className="pl-3.5 overflow-x-visible font-mono leading-relaxed flex-1 text-slate-200">
          <code
            className={`language-${resolvedLang} font-mono`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    </div>
  );
}

/**
 * Rich inline formatter supporting:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Strikethrough: ~~text~~
 * - Inline Code: `code`
 * - Inline Math: $formula$
 * - Markdown Images: ![alt](url)
 * - Safe Markdown Links: [label](url)
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return "";

  // Tokenize regex capturing:
  // 1. Images: !\[.*?\]\(.*?\)
  // 2. Links: \[.*?\]\(.*?\)
  // 3. Math: \$[^\$]+?\$
  // 4. Code: `.*?`
  // 5. Strikethrough: ~~.*?~~
  // 6. Bold: \*\*.*?\*\* or __.*?__
  // 7. Italic: \*.*?\* or _.*?_
  const tokenRegex = /(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)|\$[^\$]+?\$|`[^`]+?`|~~.*?~~|\*\*.*?\*\*|__.*?__|\*[^*]+?\*|_[^_]+?_)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Image: ![alt](url)
    const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      if (isSafeImageUrl(src)) {
        return (
          <img
            key={idx}
            src={src}
            alt={alt}
            className="inline-block max-h-48 rounded-xl border border-white/10 my-1 object-contain"
          />
        );
      }
      return <span key={idx} className="text-slate-500 italic">[unsafe image omitted]</span>;
    }

    // Link: [title](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const href = linkMatch[2];
      if (isSafeUrl(href)) {
        const isExternal = href.startsWith("http");
        return (
          <a
            key={idx}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 inline-flex items-center gap-0.5 font-medium"
          >
            <span>{label}</span>
            {isExternal && <ExternalLink className="w-3 h-3 inline" />}
          </a>
        );
      }
      return <span key={idx} className="text-slate-400">{label}</span>;
    }

    // Inline Math: $formula$
    if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
      const formula = part.slice(1, -1);
      const mathml = latexToMathML(formula, false);
      return (
        <span
          key={idx}
          className="inline-block align-baseline font-serif px-0.5 text-slate-100"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(mathml) }}
        />
      );
    }

    // Inline Code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <del key={idx} className="line-through text-slate-500">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
    ) {
      return (
        <strong key={idx} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
    ) {
      return (
        <em key={idx} className="italic text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}
