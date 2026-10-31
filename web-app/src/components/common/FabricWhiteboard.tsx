/**
 * FabricWhiteboard — a clean, single-file, Excalidraw-style infinite whiteboard.
 *
 * • Zero external component imports; everything (toolbar, panels, engine,
 *   history, export) lives here.
 * • One canvas init effect that runs exactly once; state flows into the engine
 *   through a single `live` ref so no handlers ever go stale.
 * • Custom render passes for the grid (viewport-tracking pattern) and the
 *   fading laser trail (no fabric objects, no history noise).
 * • Full drag-to-draw with live preview, Shift-constrained shapes, drag
 *   eraser, lasso selection, Excalidraw sketchy hand-drawn mode, pan/zoom (mouse, trackpad, pinch), touch/stylus support,
 *   clipboard paste, and a 60-step undo/redo history with autosave.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as fabric from "fabric";
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Minimize2, Menu, Download,
  Upload, Trash2, Grid3x3, Magnet, ChevronDown, Scan, Palette, FileImage,
  FileJson, FileCode2, Keyboard, MousePointer2, LassoSelect, Hand, Pencil, Highlighter,
  Zap, Eraser, Square, Circle, Diamond, Triangle, Cloud, Minus, ArrowRight, Type, StickyNote,
  ImagePlus, Lock, Unlock, BringToFront, SendToBack, Copy, Ban, X, Sparkles,
  GitFork, FileText, AlignLeft, AlignCenter, AlignRight, AlignJustify, ArrowUpDown, Check,
  ChevronLeft, ChevronRight, Plus, Home, ArrowLeft,
  LayoutTemplate, Layers, Group as GroupIcon, Ungroup as UngroupIcon,
  Eye, EyeOff, ChevronsUp, ChevronsDown,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { saveImageSafely } from "@/utils/dataExport";
import { renderMermaidToSvg, renderMermaidToPngDataUrl, MERMAID_PRESETS, extractMermaidCode, sanitizeMermaidLabels, buildFallbackMermaid } from "@/utils/mermaidHelper";
import { callUnifiedAI } from "@/utils/aiClient";
import { calculateAlignment, calculateDistribution, isPointInPolygon } from "@/utils/boardMath";

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                         */
/* -------------------------------------------------------------------------- */

type Tool =
  | "select" | "lasso" | "pan" | "pen" | "marker" | "laser" | "eraser"
  | "rect" | "ellipse" | "diamond" | "triangle" | "cloud" | "line" | "arrow" | "text" | "note";

export type WhiteboardSloppiness = "architect" | "artist" | "cartoonist";
export type WhiteboardFillStyle = "solid" | "hachure";

interface Theme {
  id: string; name: string; page: string; grid: string;
  gtype: "dots" | "lines" | "none"; ink: string; isDark: boolean;
}

const SHAPE_TOOLS = new Set<Tool>(["rect", "ellipse", "diamond", "triangle", "cloud", "line", "arrow"]);
const DRAW_TOOLS  = new Set<Tool>(["pen", "marker"]);
const TEXT_TYPES  = new Set(["i-text", "text", "textbox", "stickynotebox"]);

const GRID = 20;
const LASER_MS = 900;
const MAX_HIST = 60;
const AUTOSAVE_MS = 500;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 8;

const THEMES: Theme[] = [
  { id: "midnight",  name: "Midnight",   page: "#0b1120", grid: "rgba(148,163,184,0.30)", gtype: "dots",  ink: "#f8fafc", isDark: true  },
  { id: "graph",     name: "Graph",      page: "#0b1120", grid: "rgba(148,163,184,0.18)", gtype: "lines", ink: "#f8fafc", isDark: true  },
  { id: "oled",      name: "OLED",       page: "#000000", grid: "rgba(0,0,0,0)",           gtype: "none",  ink: "#f8fafc", isDark: true  },
  { id: "chalkboard",name: "Chalkboard", page: "#062a1d", grid: "rgba(16,185,129,0.24)",  gtype: "dots",  ink: "#ecfdf5", isDark: true  },
  { id: "blueprint", name: "Blueprint",  page: "#0d2748", grid: "rgba(125,211,252,0.22)", gtype: "lines", ink: "#e0f2fe", isDark: true  },
  { id: "white",     name: "Classic",    page: "#ffffff", grid: "rgba(100,116,139,0.28)", gtype: "dots",  ink: "#0f172a", isDark: false },
  { id: "paper",     name: "Warm Paper", page: "#faf6ee", grid: "rgba(180,138,88,0.28)",  gtype: "lines", ink: "#3f2d1c", isDark: false },
];

const STROKES = ["#f97316", "#ffffff", "#0f172a", "#ef4444", "#ec4899", "#a855f7", "#3b82f6", "#06b6d4", "#22c55e", "#eab308"];
const FILLS   = ["transparent", "#f9731633", "#ef444433", "#22c55e33", "#06b6d433", "#3b82f633", "#eab30833", "#8b5cf633", "#94a3b833"];

const FONTS = [
  { name: "Kalam (Notebook)",        family: "'Kalam', cursive" },
  { name: "Caveat (Marker)",          family: "'Caveat', cursive" },
  { name: "Architect (Draft)",        family: "'Architects Daughter', cursive" },
  { name: "Pacifico (Brush)",         family: "'Pacifico', cursive" },
  { name: "Dancing Script (Cursive)", family: "'Dancing Script', cursive" },
  { name: "Indie Flower (Casual)",    family: "'Indie Flower', cursive" },
  { name: "Patrick Hand (Class)",     family: "'Patrick Hand', cursive" },
  { name: "Shadows (Light)",          family: "'Shadows Into Light', cursive" },
  { name: "Gloria Hallelujah",        family: "'Gloria Hallelujah', cursive" },
  { name: "Amatic SC (Tall)",         family: "'Amatic SC', cursive" },
  { name: "Satisfy (Calligraphy)",    family: "'Satisfy', cursive" },
  { name: "Permanent Marker",         family: "'Permanent Marker', cursive" },
  { name: "Clean Sans",               family: "Inter, system-ui, sans-serif" },
  { name: "Code Mono",                family: "'JetBrains Mono', 'Courier New', monospace" },
];

export const NOTE_PALETTES = [
  { id: "yellow", name: "Canary Yellow", bg: "#fef08a", text: "#713f12", border: "#facc15" },
  { id: "peach", name: "Warm Peach", bg: "#fed7aa", text: "#7c2d12", border: "#fb923c" },
  { id: "pink", name: "Rose Pink", bg: "#fbcfe8", text: "#831843", border: "#f472b6" },
  { id: "purple", name: "Lavender", bg: "#e9d5ff", text: "#581c87", border: "#c084fc" },
  { id: "cyan", name: "Sky Cyan", bg: "#bae6fd", text: "#0c4a6e", border: "#38bdf8" },
  { id: "mint", name: "Mint Fresh", bg: "#a7f3d0", text: "#064e3b", border: "#34d399" },
  { id: "dark", name: "Slate Dark", bg: "#1e293b", text: "#f8fafc", border: "#475569" },
];

/**
 * StickyNoteBox — Custom Fabric Textbox tailored for Excalidraw / Miro style sticky notes.
 * Enforces a minimum rectangular card height and renders a rounded card with drop shadow
 * and palette borders so that notes are ALWAYS full-sized cards rather than tiny single-line text stripes.
 */
export class StickyNoteBox extends fabric.Textbox {
  static type = "StickyNoteBox";
  minHeight: number = 180;
  noteColorId: string = "yellow";
  noteBorderColor: string = "#facc15";

  constructor(text: string, options: any = {}) {
    // Fabric 7 exposes `type` as a getter-only accessor, so passing it through
    // options throws "Cannot set property type ... which has only a getter".
    // The instance type is derived from the static `type` field instead.
    const { minHeight, ...rest } = options;
    super(text, rest);
    if (typeof minHeight === "number" && Number.isFinite(minHeight)) {
      this.minHeight = minHeight;
    }
    this.initDimensions();
  }

  override initDimensions() {
    super.initDimensions();
    if (this.height < this.minHeight) {
      this.height = this.minHeight;
    }
  }

  override _renderBackground(ctx: CanvasRenderingContext2D) {
    if (!this.backgroundColor) return;
    const dim = this._getNonTransformedDimensions();
    const w = dim.x;
    const h = Math.max(dim.y, this.minHeight);
    const r = 14;

    ctx.save();
    // Soft realistic drop shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.shadowOffsetX = 0;

    // Draw rounded card rectangle
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(-w / 2, -h / 2, w, h, r);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.fillStyle = this.backgroundColor;
    ctx.fill();

    // Clean subtle card border
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = this.noteBorderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cute decorative tape / header accent bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(-w / 2 + 30, -h / 2, w - 60, 6);

    ctx.restore();
  }

  override toObject(propertiesToInclude?: any): any {
    return super.toObject([
      ...(propertiesToInclude || []),
      "minHeight",
      "noteColorId",
      "noteBorderColor",
      "customData",
    ]);
  }
}

try {
  (fabric as any).classRegistry?.setClass(StickyNoteBox, "StickyNoteBox");
  (fabric as any).classRegistry?.setClass(StickyNoteBox, "stickyNote");
} catch {}

export const isNoteObj = (o: fabric.Object | null | undefined): boolean => {
  if (!o) return false;
  return o instanceof StickyNoteBox || (o as any).customData?.type === "note" || Boolean((o as any).noteColorId);
};

/* -------------------------------------------------------------------------- */
/*  Markdown → canvas study card                                              */
/* -------------------------------------------------------------------------- */

const CARD_FONT_SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const CARD_FONT_MONO = "'JetBrains Mono', 'Cascadia Code', Consolas, monospace";

interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  link?: boolean;
}

interface InlineAtom {
  text: string;
  style: InlineStyle;
  space: boolean;
}

type BlockKind =
  | "heading" | "para" | "bullet" | "number" | "task"
  | "quote" | "code" | "rule" | "space" | "table";

interface MdBlock {
  kind: BlockKind;
  level?: number;
  marker?: string;
  checked?: boolean;
  atoms?: InlineAtom[];
  codeLines?: string[];
  rows?: string[][];
  indent: number;
}

interface MdLine {
  kind: BlockKind;
  level?: number;
  marker?: string;
  checked?: boolean;
  atoms?: InlineAtom[];
  codeLines?: string[];
  tableLines?: string[][][];
  indent: number;
  height: number;
  gapBefore: number;
  first: boolean;
}

const CARD_HEADING_SIZE: Record<number, number> = { 1: 19, 2: 16.5, 3: 15, 4: 14, 5: 13.5, 6: 13 };

function inlineFont(style: InlineStyle, size: number): string {
  const weight = style.bold ? "bold " : "";
  const slant = style.italic ? "italic " : "";
  const px = style.code ? Math.max(10, size - 1) : size;
  return `${weight}${slant}${px}px ${style.code ? CARD_FONT_MONO : CARD_FONT_SANS}`;
}

/**
 * Tokenises inline Markdown (`**bold**`, `*italic*`, `` `code` ``, `~~strike~~`,
 * `[label](url)`) into style-tagged atoms while keeping whitespace separate so
 * the layout pass can wrap text cleanly.
 */
function parseInlineMarkdown(text: string): InlineAtom[] {
  const atoms: InlineAtom[] = [];

  const push = (chunk: string, style: InlineStyle) => {
    if (!chunk) return;
    for (const part of chunk.split(/(\s+)/)) {
      if (part) atoms.push({ text: part, style, space: /^\s+$/.test(part) });
    }
  };

  const pattern = /(\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    push(text.slice(cursor, match.index), {});
    const raw = match[0];
    if (raw.startsWith("**") || raw.startsWith("__")) {
      push(raw.slice(2, -2), { bold: true });
    } else if (raw.startsWith("~~")) {
      push(raw.slice(2, -2), { strike: true });
    } else if (raw.startsWith("`")) {
      push(raw.slice(1, -1), { code: true });
    } else if (raw.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(raw);
      push(link ? link[1] : raw, { link: true });
    } else {
      push(raw.slice(1, -1), { italic: true });
    }
    cursor = match.index + raw.length;
  }

  push(text.slice(cursor), {});
  return atoms;
}

/** Splits Markdown source into block-level constructs (headings, lists, code…). */
function parseMarkdownBlocks(content: string): MdBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const leading = raw.length - raw.trimStart().length;
    const indent = Math.min(3, Math.floor(leading / 2)) * 12;

    if (!trimmed) {
      blocks.push({ kind: "space", indent: 0 });
      i++;
      continue;
    }

    // Fenced code block (```lang … ```)
    if (/^```/.test(trimmed)) {
      i++;
      const code: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "code", codeLines: code.length ? code : [""], indent: 0 });
      continue;
    }

    // Horizontal rule
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ kind: "rule", indent: 0 });
      i++;
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, atoms: parseInlineMarkdown(heading[2]), indent: 0 });
      i++;
      continue;
    }

    // Task list
    const task = /^[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(trimmed);
    if (task) {
      blocks.push({
        kind: "task",
        checked: task[1].toLowerCase() === "x",
        atoms: parseInlineMarkdown(task[2]),
        indent,
      });
      i++;
      continue;
    }

    // Bullet list
    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      blocks.push({ kind: "bullet", atoms: parseInlineMarkdown(bullet[1]), indent });
      i++;
      continue;
    }

    // Numbered list
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (numbered) {
      blocks.push({ kind: "number", marker: `${numbered[1]}.`, atoms: parseInlineMarkdown(numbered[2]), indent });
      i++;
      continue;
    }

    // Block quote (GitHub alert markers such as [!NOTE] are stripped)
    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      blocks.push({
        kind: "quote",
        atoms: parseInlineMarkdown(quote[1].replace(/^\[![A-Za-z]+\]\s*/, "")),
        indent,
      });
      i++;
      continue;
    }

    // Pipe table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        const isSeparator = /^\|?[\s:|-]+\|?$/.test(row) && row.includes("-");
        if (!isSeparator) {
          rows.push(row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()));
        }
        i++;
      }
      if (rows.length) blocks.push({ kind: "table", rows, indent: 0 });
      continue;
    }

    blocks.push({ kind: "para", atoms: parseInlineMarkdown(trimmed), indent });
    i++;
  }

  return blocks;
}

function measureInline(ctx: CanvasRenderingContext2D, atom: InlineAtom, size: number): number {
  ctx.font = inlineFont(atom.style, size);
  return ctx.measureText(atom.text).width;
}

/** Word-wraps inline atoms, breaking over-long single tokens by character. */
function wrapInline(ctx: CanvasRenderingContext2D, atoms: InlineAtom[], maxWidth: number, size: number): InlineAtom[][] {
  const lines: InlineAtom[][] = [];
  let current: InlineAtom[] = [];
  let width = 0;

  const flush = () => {
    while (current.length && current[current.length - 1].space) current.pop();
    if (current.length) lines.push(current);
    current = [];
    width = 0;
  };

  for (const atom of atoms) {
    const atomWidth = measureInline(ctx, atom, size);

    if (atomWidth > maxWidth && !atom.space && atom.text.length > 1) {
      let buffer = "";
      for (const ch of atom.text) {
        const test = buffer + ch;
        const testWidth = measureInline(ctx, { ...atom, text: test }, size);
        if (testWidth > maxWidth - width && buffer) {
          current.push({ ...atom, text: buffer });
          flush();
          buffer = ch;
        } else {
          buffer = test;
        }
      }
      if (buffer) {
        current.push({ ...atom, text: buffer });
        width += measureInline(ctx, { ...atom, text: buffer }, size);
      }
      continue;
    }

    if (width + atomWidth > maxWidth && current.length && !atom.space) flush();
    if (!current.length && atom.space) continue;
    current.push(atom);
    width += atomWidth;
  }

  flush();
  return lines;
}

function layoutMarkdown(ctx: CanvasRenderingContext2D, blocks: MdBlock[], innerWidth: number): MdLine[] {
  const lines: MdLine[] = [];

  for (const block of blocks) {
    if (block.kind === "space") {
      lines.push({ kind: "space", indent: 0, height: 10, gapBefore: 0, first: false });
      continue;
    }
    if (block.kind === "rule") {
      lines.push({ kind: "rule", indent: 0, height: 1, gapBefore: 8, first: false });
      continue;
    }

    if (block.kind === "code") {
      const source = block.codeLines ?? [""];
      const wrapped: string[] = [];
      ctx.font = `11.5px ${CARD_FONT_MONO}`;
      for (const rawLine of source) {
        const text = rawLine.replace(/\t/g, "  ");
        if (!text) {
          wrapped.push("");
          continue;
        }
        let buffer = "";
        for (const ch of text) {
          if (ctx.measureText(buffer + ch).width > innerWidth - 22 && buffer) {
            wrapped.push(buffer);
            buffer = ch;
          } else {
            buffer += ch;
          }
        }
        wrapped.push(buffer);
      }
      lines.push({
        kind: "code",
        indent: 0,
        height: Math.max(1, wrapped.length) * 15 + 16,
        gapBefore: 6,
        first: false,
        codeLines: wrapped,
      });
      continue;
    }

    if (block.kind === "table") {
      const rows = block.rows ?? [];
      if (!rows.length) continue;
      const cols = Math.max(1, ...rows.map((row) => row.length));
      const colWidth = innerWidth / cols;
      ctx.font = `12px ${CARD_FONT_SANS}`;

      const tableLines: string[][][] = rows.map((row) =>
        Array.from({ length: cols }, (_, ci) => {
          const cell = row[ci] ?? "";
          const wrapped: string[] = [];
          let buffer = "";
          for (const word of cell.split(/\s+/).filter(Boolean)) {
            const test = buffer ? `${buffer} ${word}` : word;
            if (ctx.measureText(test).width > colWidth - 14 && buffer) {
              wrapped.push(buffer);
              buffer = word;
            } else {
              buffer = test;
            }
          }
          wrapped.push(buffer);
          return wrapped;
        })
      );

      const height = tableLines.reduce(
        (sum, cells) => sum + Math.max(1, ...cells.map((cell) => cell.length)) * 15 + 10,
        4
      );
      lines.push({ kind: "table", indent: 0, height, gapBefore: 6, first: false, tableLines });
      continue;
    }

    // Text-like blocks
    const size = block.kind === "heading" ? CARD_HEADING_SIZE[block.level || 3] || 14 : 13;
    const textIndent =
      block.indent +
      (block.kind === "bullet" || block.kind === "task" ? 16 : block.kind === "number" ? 22 : block.kind === "quote" ? 14 : 0);
    const available = Math.max(60, innerWidth - textIndent);
    const wrapped = wrapInline(ctx, block.atoms ?? [], available, size);
    const lineHeight = block.kind === "heading" ? Math.round(size * 1.35) + 4 : 20;
    const gapBefore =
      block.kind === "heading" ? ((block.level || 3) <= 2 ? 12 : 8) : block.kind === "quote" ? 4 : 2;

    if (!wrapped.length) {
      lines.push({ kind: "space", indent: 0, height: 6, gapBefore: 0, first: false });
      continue;
    }

    wrapped.forEach((atoms, index) => {
      lines.push({
        kind: block.kind,
        level: block.level,
        marker: block.marker,
        checked: block.checked,
        atoms,
        indent: textIndent,
        height: lineHeight,
        gapBefore: index === 0 ? gapBefore : 0,
        first: index === 0,
      });
    });
  }

  return lines;
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

/** Draws inline atoms and returns the width consumed. */
function drawInline(
  ctx: CanvasRenderingContext2D,
  atoms: InlineAtom[],
  x: number,
  y: number,
  color: string,
  size: number,
  accent: string,
  base: InlineStyle = {}
): number {
  let cursor = x;
  for (const atom of atoms) {
    const style = { ...base, ...atom.style };
    ctx.font = inlineFont(style, size);
    const width = ctx.measureText(atom.text).width;

    if (!atom.space) {
      if (style.code) {
        const h = Math.max(12, size - 1);
        ctx.fillStyle = "rgba(56,189,248,0.14)";
        ctx.fillRect(cursor - 2, y - h + 1, width + 4, h + 4);
      }
      ctx.fillStyle = style.code ? "#7dd3fc" : style.link ? accent : color;
      ctx.fillText(atom.text, cursor, y);

      if (style.strike) {
        ctx.strokeStyle = ctx.fillStyle as string;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cursor, y - size * 0.32);
        ctx.lineTo(cursor + width, y - size * 0.32);
        ctx.stroke();
      }
      if (style.link) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cursor, y + 2);
        ctx.lineTo(cursor + width, y + 2);
        ctx.stroke();
      }
    }

    cursor += width;
  }
  return cursor - x;
}

/**
 * High-definition 2D canvas card renderer for structured Markdown study notes.
 * Parses headings, lists, tasks, quotes, tables, code fences and inline styling
 * so AI output looks like a designed card instead of raw Markdown text.
 */
export function renderMarkdownCardCanvas(
  title: string,
  content: string,
  accentColor = "#8b5cf6"
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cardWidth = 420;
  const padding = 24;
  const headerHeight = 60;
  const innerWidth = cardWidth - padding * 2;
  const scale = 2;

  const blocks = parseMarkdownBlocks(content);
  const lines = layoutMarkdown(ctx, blocks, innerWidth);
  const contentHeight = lines.reduce((sum, line) => sum + line.gapBefore + line.height, 0);
  const totalHeight = Math.max(180, padding + headerHeight + 10 + contentHeight + padding);

  canvas.width = cardWidth * scale;
  canvas.height = totalHeight * scale;
  ctx.scale(scale, scale);

  // Card background
  fillRoundRect(ctx, 0, 0, cardWidth, totalHeight, 16, "#0f172a", "#334155");

  // Accent bar on top
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(0, 0, cardWidth, 6, [16, 16, 0, 0]);
  else ctx.rect(0, 0, cardWidth, 6);
  ctx.fillStyle = accentColor;
  ctx.fill();

  // Header title
  ctx.fillStyle = "#f8fafc";
  ctx.font = `bold 16px ${CARD_FONT_SANS}`;
  ctx.fillText(ellipsize(ctx, title || "Study Note", innerWidth), padding, padding + 22);

  // Header subtitle
  ctx.fillStyle = "#64748b";
  ctx.font = `11px ${CARD_FONT_SANS}`;
  ctx.fillText(`FlowTrack Study Card • ${new Date().toLocaleDateString()}`, padding, padding + 40);

  // Divider
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding + 48);
  ctx.lineTo(cardWidth - padding, padding + 48);
  ctx.stroke();

  let y = padding + headerHeight + 10;

  for (const line of lines) {
    y += line.gapBefore;
    const x = padding + line.indent;
    const baseline = y + line.height - 6;

    if (line.kind === "space") {
      y += line.height;
      continue;
    }

    if (line.kind === "rule") {
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(cardWidth - padding, y);
      ctx.stroke();
      y += line.height + 8;
      continue;
    }

    if (line.kind === "code") {
      const codeLines = line.codeLines ?? [""];
      const boxHeight = Math.max(1, codeLines.length) * 15 + 16;
      fillRoundRect(ctx, padding, y, innerWidth, boxHeight, 8, "#0b1220", "#1e293b");
      ctx.font = `11.5px ${CARD_FONT_MONO}`;
      ctx.fillStyle = "#7dd3fc";
      codeLines.forEach((codeLine, index) => ctx.fillText(codeLine, padding + 10, y + 15 + index * 15));
      y += boxHeight;
      continue;
    }

    if (line.kind === "table") {
      const rows = line.tableLines ?? [];
      if (!rows.length) {
        y += line.height;
        continue;
      }
      const cols = rows[0].length;
      const colWidth = innerWidth / cols;
      let tableY = y;

      rows.forEach((cells, rowIndex) => {
        const rowHeight = Math.max(1, ...cells.map((cell) => cell.length)) * 15 + 10;
        if (rowIndex === 0) {
          ctx.fillStyle = "rgba(139,92,246,0.16)";
          ctx.fillRect(padding, tableY, innerWidth, rowHeight);
        }
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, tableY + rowHeight);
        ctx.lineTo(cardWidth - padding, tableY + rowHeight);
        ctx.stroke();

        ctx.font = `${rowIndex === 0 ? "bold " : ""}12px ${CARD_FONT_SANS}`;
        cells.forEach((cellLines, colIndex) => {
          ctx.fillStyle = rowIndex === 0 ? "#e2e8f0" : "#cbd5e1";
          cellLines.forEach((cellLine, lineIndex) => {
            ctx.fillText(cellLine, padding + colIndex * colWidth + 6, tableY + 15 + lineIndex * 15);
          });
        });

        tableY += rowHeight;
      });

      y += line.height;
      continue;
    }

    if (line.kind === "heading") {
      const size = CARD_HEADING_SIZE[line.level || 3] || 14;
      const color = (line.level || 3) <= 2 ? accentColor : "#e2e8f0";
      const width = drawInline(ctx, line.atoms ?? [], x, baseline, color, size, accentColor, { bold: true });
      if (line.first && (line.level || 3) <= 2) {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, baseline + 5);
        ctx.lineTo(x + Math.min(width, innerWidth - line.indent), baseline + 5);
        ctx.stroke();
      }
      y += line.height;
      continue;
    }

    if (line.kind === "bullet") {
      ctx.fillStyle = accentColor;
      ctx.font = `bold 14px ${CARD_FONT_SANS}`;
      ctx.fillText("•", x - 12, baseline);
      drawInline(ctx, line.atoms ?? [], x, baseline, "#cbd5e1", 13, accentColor);
      y += line.height;
      continue;
    }

    if (line.kind === "number") {
      ctx.fillStyle = accentColor;
      ctx.font = `bold 12px ${CARD_FONT_SANS}`;
      ctx.textAlign = "right";
      ctx.fillText(line.marker ?? "1.", x - 6, baseline);
      ctx.textAlign = "left";
      drawInline(ctx, line.atoms ?? [], x, baseline, "#cbd5e1", 13, accentColor);
      y += line.height;
      continue;
    }

    if (line.kind === "task") {
      const checked = Boolean(line.checked);
      ctx.fillStyle = checked ? "#10b981" : "#64748b";
      ctx.font = `13px ${CARD_FONT_SANS}`;
      ctx.fillText(checked ? "☑" : "☐", x - 17, baseline);
      drawInline(ctx, line.atoms ?? [], x, baseline, checked ? "#94a3b8" : "#cbd5e1", 13, accentColor);
      y += line.height;
      continue;
    }

    if (line.kind === "quote") {
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x - 10, y + 1, 3, Math.max(4, line.height - 4));
      ctx.globalAlpha = 1;
      drawInline(ctx, line.atoms ?? [], x, baseline, "#94a3b8", 13, accentColor);
      y += line.height;
      continue;
    }

    drawInline(ctx, line.atoms ?? [], x, baseline, "#cbd5e1", 13, accentColor);
    y += line.height;
  }

  return canvas;
}

/** Removes a wrapping ```markdown fence and leading chat preamble from AI notes. */
function normalizeMarkdownResponse(raw: string): string {
  let text = (raw || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const fence = /^```(?:markdown|md)?[ \t]*\n([\s\S]*?)```\s*$/i.exec(text);
  if (fence && fence[1].trim()) text = fence[1].trim();

  const lines = text.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (lines.length > 1 && /^(?:here|sure|certainly|below|these are|of course)\b/i.test(first) && first.endsWith(":")) {
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  }
  return lines.join("\n").trim();
}

const DASHES: Record<string, number[] | undefined> = {
  solid: undefined, dashed: [12, 9], dotted: [1, 7],
};
const KEYS: Record<string, Tool> = {
  v: "select", q: "lasso", h: "pan", p: "pen", m: "marker", x: "laser", e: "eraser",
  r: "rect", o: "ellipse", d: "diamond", g: "triangle", k: "cloud", l: "line", a: "arrow", t: "text", n: "note",
};

interface ToolMeta { id: Tool; icon: typeof MousePointer2; label: string; key: string; accent: string; }
const TOOLS: ToolMeta[] = [
  { id: "select",  icon: MousePointer2, label: "Select",   key: "V", accent: "bg-white/95 text-slate-900" },
  { id: "lasso",   icon: LassoSelect,   label: "Lasso",    key: "Q", accent: "bg-indigo-500 text-white" },
  { id: "pan",     icon: Hand,          label: "Pan",      key: "H", accent: "bg-emerald-400 text-slate-950" },
  { id: "pen",     icon: Pencil,        label: "Pen",      key: "P", accent: "bg-rose-500 text-white" },
  { id: "marker",  icon: Highlighter,   label: "Marker",   key: "M", accent: "bg-amber-400 text-slate-950" },
  { id: "laser",   icon: Zap,           label: "Laser",    key: "X", accent: "bg-red-500 text-white" },
  { id: "eraser",  icon: Eraser,        label: "Eraser",   key: "E", accent: "bg-slate-200 text-slate-900" },
  { id: "rect",    icon: Square,        label: "Rectangle",key: "R", accent: "bg-cyan-400 text-slate-950" },
  { id: "ellipse", icon: Circle,        label: "Ellipse",  key: "O", accent: "bg-cyan-400 text-slate-950" },
  { id: "diamond", icon: Diamond,       label: "Diamond",  key: "D", accent: "bg-cyan-400 text-slate-950" },
  { id: "triangle",icon: Triangle,      label: "Triangle", key: "G", accent: "bg-cyan-400 text-slate-950" },
  { id: "cloud",   icon: Cloud,         label: "Cloud",    key: "K", accent: "bg-cyan-400 text-slate-950" },
  { id: "line",    icon: Minus,         label: "Line",     key: "L", accent: "bg-cyan-400 text-slate-950" },
  { id: "arrow",   icon: ArrowRight,    label: "Arrow",    key: "A", accent: "bg-cyan-400 text-slate-950" },
  { id: "text",    icon: Type,          label: "Text",     key: "T", accent: "bg-violet-500 text-white" },
  { id: "note",    icon: StickyNote,    label: "Note",     key: "N", accent: "bg-amber-400 text-slate-950" },
];

const SHORTCUTS: [string, string][] = [
  ["V","Select"],["Q","Lasso Select"],["H","Pan"],["P","Pen"],["M","Marker"],["X","Laser"],["E","Eraser"],
  ["R","Rectangle"],["O","Ellipse"],["D","Diamond"],["L","Line"],["A","Arrow"],
  ["T","Text"],["N","Note"],["Space","Hold to pan"],
  ["Ctrl+Z","Undo"],["Ctrl+Shift+Z","Redo"],["Ctrl+D","Duplicate"],
  ["Ctrl+C / V","Copy / paste"],["Ctrl+A","Select all"],["Delete","Delete"],
  ["Ctrl+0","Reset zoom"],["Ctrl+1","Zoom to fit"],
  ["Ctrl+G","Group selection"],["Ctrl+Shift+G","Ungroup"],
  ["Ctrl+L","Lock / unlock"],["Ctrl+Shift+L","Unlock everything"],
  ["Shift+drag","Constrain"],["Alt+drag","Pan canvas"],
];

/* -------------------------------------------------------------------------- */
/*  Pure helpers                                                              */
/* -------------------------------------------------------------------------- */

const isTextObj  = (o?: fabric.Object | null) => !!o && TEXT_TYPES.has(o.type);
const isShape    = (t: Tool) => SHAPE_TOOLS.has(t);
const isDraw     = (t: Tool) => DRAW_TOOLS.has(t);
const clamp      = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isHex6     = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

const pointInPoly = (p: { x: number; y: number }, poly: { x: number; y: number }[]) => {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-10) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

export function createHachurePattern(color: string, gap = 8, lineWidth = 1.5): fabric.Pattern {
  const pCanvas = document.createElement("canvas");
  const size = gap * 4;
  pCanvas.width = size;
  pCanvas.height = size;
  const pCtx = pCanvas.getContext("2d");
  if (pCtx) {
    pCtx.strokeStyle = color;
    pCtx.lineWidth = lineWidth;
    pCtx.beginPath();
    for (let x = -size; x <= size * 2; x += gap) {
      pCtx.moveTo(x, 0);
      pCtx.lineTo(x + size, size);
    }
    pCtx.stroke();
  }
  return new fabric.Pattern({
    source: pCanvas,
    repeat: "repeat",
  });
}

const getRoughnessMultiplier = (sloppiness: WhiteboardSloppiness): number => {
  if (sloppiness === "architect") return 0.6;
  if (sloppiness === "cartoonist") return 2.6;
  return 1.4; // artist
};

function getSketchyRectPath(W: number, H: number, sloppiness: WhiteboardSloppiness = "artist"): string {
  const r = getRoughnessMultiplier(sloppiness);
  const o = r * 2.5; // corner overshoot
  const j = r * 0.8; // jitter
  return [
    `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`,
    `M ${-o} ${j * 0.4} L ${W + o} ${-j * 0.5}`,
    `M ${-o * 0.6} ${-j * 0.6} L ${W + o * 0.8} ${j * 0.4}`,
    `M ${W + j * 0.5} ${-o} L ${W - j * 0.4} ${H + o}`,
    `M ${W - j * 0.6} ${-o * 0.7} L ${W + j * 0.7} ${H + o * 0.8}`,
    `M ${W + o} ${H + j * 0.5} L ${-o} ${H - j * 0.6}`,
    `M ${W + o * 0.7} ${H - j * 0.4} L ${-o * 0.8} ${H + j * 0.5}`,
    `M ${j * 0.4} ${H + o} L ${-j * 0.6} ${-o}`,
    `M ${-j * 0.5} ${H + o * 0.7} L ${j * 0.6} ${-o * 0.8}`,
  ].join(" ");
}

function getSketchyDiamondPath(W: number, H: number, sloppiness: WhiteboardSloppiness = "artist"): string {
  const r = getRoughnessMultiplier(sloppiness);
  const o = r * 2.2;
  const j = r * 0.7;
  const p1 = { x: W / 2, y: 0 };
  const p2 = { x: W, y: H / 2 };
  const p3 = { x: W / 2, y: H };
  const p4 = { x: 0, y: H / 2 };
  return [
    `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`,
    `M ${p1.x - o * 0.5} ${p1.y - o * 0.3} L ${p2.x + o * 0.5} ${p2.y + o * 0.3}`,
    `M ${p1.x + j} ${p1.y} L ${p2.x} ${p2.y - j}`,
    `M ${p2.x + o * 0.3} ${p2.y - o * 0.5} L ${p3.x - o * 0.3} ${p3.y + o * 0.5}`,
    `M ${p2.x - j} ${p2.y} L ${p3.x} ${p3.y - j}`,
    `M ${p3.x + o * 0.5} ${p3.y + o * 0.3} L ${p4.x - o * 0.5} ${p4.y - o * 0.3}`,
    `M ${p3.x - j} ${p3.y} L ${p4.x} ${p4.y + j}`,
    `M ${p4.x - o * 0.3} ${p4.y + o * 0.5} L ${p1.x + o * 0.3} ${p1.y - o * 0.5}`,
    `M ${p4.x + j} ${p4.y} L ${p1.x} ${p1.y + j}`,
  ].join(" ");
}

function getSketchyTrianglePath(W: number, H: number, sloppiness: WhiteboardSloppiness = "artist"): string {
  const r = getRoughnessMultiplier(sloppiness);
  const o = r * 2.4;
  const j = r * 0.7;
  const p1 = { x: W / 2, y: 0 };
  const p2 = { x: W, y: H };
  const p3 = { x: 0, y: H };
  return [
    `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`,
    `M ${p1.x - o * 0.4} ${p1.y - o * 0.5} L ${p2.x + o * 0.5} ${p2.y + o * 0.3}`,
    `M ${p1.x + j} ${p1.y} L ${p2.x - j} ${p2.y}`,
    `M ${p2.x + o} ${p2.y + j * 0.5} L ${p3.x - o} ${p3.y - j * 0.5}`,
    `M ${p2.x + o * 0.7} ${p2.y - j} L ${p3.x - o * 0.7} ${p3.y + j}`,
    `M ${p3.x - o * 0.5} ${p3.y + o * 0.3} L ${p1.x + o * 0.4} ${p1.y - o * 0.5}`,
    `M ${p3.x + j} ${p3.y} L ${p1.x - j} ${p1.y}`,
  ].join(" ");
}

function getSketchyCloudPath(W: number, H: number, sloppiness: WhiteboardSloppiness = "artist"): string {
  const r = getRoughnessMultiplier(sloppiness);
  const j = r * 0.6;
  const cx = W / 2, cy = H / 2;
  const rx = Math.max(W / 2 - 8, 12), ry = Math.max(H / 2 - 8, 10);
  const numLobes = 7;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < numLobes; i++) {
    const a1 = (i / numLobes) * Math.PI * 2;
    const a2 = ((i + 1) / numLobes) * Math.PI * 2;
    const midA = (a1 + a2) / 2;
    const x1 = cx + rx * Math.cos(a1);
    const y1 = cy + ry * Math.sin(a1);
    const x2 = cx + rx * Math.cos(a2);
    const y2 = cy + ry * Math.sin(a2);
    const bulge = 1.35 + (i % 2 === 0 ? 0.1 : -0.1) * r;
    const ctrlX = cx + rx * bulge * Math.cos(midA);
    const ctrlY = cy + ry * bulge * Math.sin(midA);
    pts.push({ x: x1, y: y1 }, { x: ctrlX, y: ctrlY }, { x: x2, y: y2 });
  }
  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length; i += 3) {
    pathD += ` Q ${pts[i + 1].x} ${pts[i + 1].y} ${pts[i + 2].x} ${pts[i + 2].y}`;
  }
  pathD += " Z";
  let pass2 = ` M ${pts[0].x + j} ${pts[0].y - j}`;
  for (let i = 0; i < pts.length; i += 3) {
    pass2 += ` Q ${pts[i + 1].x - j} ${pts[i + 1].y + j} ${pts[i + 2].x + j} ${pts[i + 2].y - j}`;
  }
  return pathD + pass2;
}

function getSketchyEllipsePath(W: number, H: number, sloppiness: WhiteboardSloppiness = "artist"): string {
  const r = getRoughnessMultiplier(sloppiness);
  const rx = W / 2, ry = H / 2;
  const cx = rx, cy = ry;
  const j = r * 1.2;
  let p1 = `M ${cx + rx} ${cy} `;
  p1 += `A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} `;
  p1 += `A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} Z `;
  p1 += `M ${cx + rx + j * 0.4} ${cy + j * 0.5} `;
  p1 += `A ${rx + j * 0.6} ${ry - j * 0.4} 0 1 0 ${cx - rx - j * 0.5} ${cy - j * 0.3} `;
  p1 += `A ${rx - j * 0.4} ${ry + j * 0.6} 0 1 0 ${cx + rx + j * 0.8} ${cy - j * 0.2} `;
  return p1;
}

function getSketchyLinePath(ax: number, ay: number, bx: number, by: number, sloppiness: WhiteboardSloppiness = "artist"): string {
  const r = getRoughnessMultiplier(sloppiness);
  const o = r * 2.5;
  const ang = Math.atan2(by - ay, bx - ax);
  const perpX = -Math.sin(ang) * (r * 0.8);
  const perpY = Math.cos(ang) * (r * 0.8);
  const dx = Math.cos(ang) * o;
  const dy = Math.sin(ang) * o;
  return [
    `M ${ax - dx} ${ay - dy} L ${bx + dx} ${by + dy}`,
    `M ${ax - dx * 0.6 + perpX} ${ay - dy * 0.6 + perpY} L ${bx + dx * 0.8 - perpX} ${by + dy * 0.8 - perpY}`,
  ].join(" ");
}

const arrowPathD = (
  ax: number, ay: number, bx: number, by: number, w: number,
  sketchy = false, sloppiness: WhiteboardSloppiness = "artist"
) => {
  const ang = Math.atan2(by - ay, bx - ax);
  const len = Math.hypot(bx - ax, by - ay);
  const k = clamp(10 + w * 1.4, 8, Math.max(8, len * 0.45));
  const a1 = ang - Math.PI / 7, a2 = ang + Math.PI / 7;
  if (!sketchy) {
    return `M ${ax} ${ay} L ${bx} ${by} `
         + `M ${bx - k * Math.cos(a1)} ${by - k * Math.sin(a1)} `
         + `L ${bx} ${by} `
         + `L ${bx - k * Math.cos(a2)} ${by - k * Math.sin(a2)}`;
  }
  const r = getRoughnessMultiplier(sloppiness);
  const j = r * 0.8;
  return [
    `M ${ax} ${ay} L ${bx} ${by}`,
    `M ${ax + j} ${ay - j} L ${bx - j * 0.5} ${by + j * 0.5}`,
    `M ${bx - k * Math.cos(a1)} ${by - k * Math.sin(a1)} L ${bx} ${by}`,
    `M ${bx - (k + j) * Math.cos(a1) + j} ${by - (k + j) * Math.sin(a1)} L ${bx} ${by}`,
    `M ${bx - k * Math.cos(a2)} ${by - k * Math.sin(a2)} L ${bx} ${by}`,
    `M ${bx - (k - j) * Math.cos(a2) - j} ${by - (k - j) * Math.sin(a2)} L ${bx} ${by}`,
  ].join(" ");
};

const cursorFor = (t: Tool) =>
  t === "pan"    ? "grab"
  : t === "eraser" ? "cell"
  : t === "text" ? "text"
  : t === "select" ? "default"
  : "crosshair";

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export interface FabricWhiteboardProps {
  storageKey?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onExitFullscreen?: () => void;
}
export const DEFAULT_STORAGE_KEY = "excalidraw_board_v1";

interface LaserPt { x: number; y: number; t: number; }

interface LiveState {
  tool: Tool; locked: boolean; showGrid: boolean; snap: boolean; theme: Theme;
  stroke: string; fill: string; width: number; style: string; opacity: number;
  font: string; size: number; sketchy: boolean; noteColor: string;
  sloppiness: WhiteboardSloppiness; fillStyle: WhiteboardFillStyle;
}

export function FabricWhiteboard({
  storageKey = DEFAULT_STORAGE_KEY,
  isFullscreen: isFullscreenProp,
  onToggleFullscreen,
  onExitFullscreen,
}: FabricWhiteboardProps) {
  const { showToast } = useToast();
  const navigate = useNavigate();

  /* --- DOM refs --------------------------------------------------------- */
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const fcRef = useRef<fabric.Canvas | null>(null);
  const imgFileRef = useRef<HTMLInputElement | null>(null);
  const jsonFileRef = useRef<HTMLInputElement | null>(null);

  /* --- Reactive state (drives UI + panels) ----------------------------- */
  const [tool, setTool] = useState<Tool>("pen");
  const [locked, setLocked] = useState(false);
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(false);
  const [sketchy, setSketchy] = useState(true);
  const [sloppiness, setSloppiness] = useState<WhiteboardSloppiness>("artist");
  const [fillStyle, setFillStyle] = useState<WhiteboardFillStyle>("solid");

  const [stroke, setStroke] = useState(THEMES[0].ink);
  const [fill, setFill] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeStyle, setStrokeStyle] = useState("solid");
  const [opacity, setOpacity] = useState(1);
  const [fontFamily, setFontFamily] = useState(FONTS[0].family);
  const [fontSize, setFontSize] = useState(24);
  const [noteColor, setNoteColor] = useState("yellow");

  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSel, setHasSel] = useState(false);
  const [isMultiSel, setIsMultiSel] = useState(false);
  const [selIsText, setSelIsText] = useState(false);
  const [selIsNote, setSelIsNote] = useState(false);

  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const fullscreen = isFullscreenProp !== undefined ? isFullscreenProp : internalFullscreen;
  const setFullscreen = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
    if (isFullscreenProp !== undefined && onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalFullscreen(valOrFn);
    }
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [layersTick, setLayersTick] = useState(0);
  /** Measured height of the top bar — panels below it follow wrapping. */
  const [barH, setBarH] = useState(66);
  const [ready, setReady] = useState(false);

  // Mermaid Modal & AI state
  const [mermaidModalOpen, setMermaidModalOpen] = useState(false);
  const [mermaidCode, setMermaidCode] = useState(MERMAID_PRESETS[0]?.code || "flowchart TD\n  A[Start] --> B(Process)\n  B --> C{Decision}\n  C -->|Yes| D[Done]\n  C -->|No| B");
  const [mermaidPreviewSvg, setMermaidPreviewSvg] = useState("");
  const [mermaidAiPrompt, setMermaidAiPrompt] = useState("");
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [mermaidError, setMermaidError] = useState<string | null>(null);

  // Markdown Modal & AI state
  const [markdownModalOpen, setMarkdownModalOpen] = useState(false);
  const [markdownTitle, setMarkdownTitle] = useState("Study Summary");
  const [markdownContent, setMarkdownContent] = useState("### 📌 Key Takeaways\n- Principle 1: Clarity of thought\n- Principle 2: Iterative revision\n\n```python\n# Practical test\ndef review():\n    return 'Mastered!'\n```\n\n- [ ] Review before exam\n- [x] Initial comprehension complete");
  const [markdownAccent, setMarkdownAccent] = useState("#8b5cf6");
  const [markdownAiPrompt, setMarkdownAiPrompt] = useState("");
  const [isGeneratingMarkdown, setIsGeneratingMarkdown] = useState(false);

  // Slide Deck Management
  const [slides, setSlides] = useState<{ id: string; title: string; json: string }[]>(() => {
    try {
      const raw = localStorage.getItem(`${storageKey}_slides_v1`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{ id: "slide-1", title: "Slide 1", json: "" }];
  });
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const theme = useMemo(() => THEMES.find(t => t.id === themeId) ?? THEMES[0], [themeId]);

  /* --- Single live ref: engine always sees latest values --------------- */
  const live = useRef<LiveState>({
    tool, locked, showGrid, snap, theme,
    stroke, fill, width: strokeWidth, style: strokeStyle, opacity,
    font: fontFamily, size: fontSize, sketchy, noteColor,
    sloppiness, fillStyle,
  });
  useEffect(() => {
    live.current = {
      tool, locked, showGrid, snap, theme,
      stroke, fill, width: strokeWidth, style: strokeStyle, opacity,
      font: fontFamily, size: fontSize, sketchy, noteColor,
      sloppiness, fillStyle,
    };
  });

  /* --- History --------------------------------------------------------- */
  const histRef = useRef<string[]>([]);
  const idxRef = useRef(-1);
  const suspendRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const persist = useCallback((json: string) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, json); } catch { /* quota */ }
    }, AUTOSAVE_MS);
  }, [storageKey]);

  const layersOpenRef = useRef(false);
  /** Cheap re-sync trigger for the Layers panel — only does work while it is open. */
  const bumpLayers = useCallback(() => {
    if (layersOpenRef.current) setLayersTick((t) => (t + 1) % 100000);
  }, []);

  /* Track the top bar's real height so overlay panels always start below it,
     even when the toolbar wraps onto two rows on a narrow window. */
  useEffect(() => {
    const el = topBarRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBarH(el.getBoundingClientRect().height + 6));
    ro.observe(el);
    setBarH(el.getBoundingClientRect().height + 6);
    return () => ro.disconnect();
  }, []);

  const pushHistory = useCallback(() => {
    const c = fcRef.current;
    if (!c || suspendRef.current) return;
    const json = JSON.stringify(c.toJSON());
    if (histRef.current[idxRef.current] === json) return;
    histRef.current = histRef.current.slice(0, idxRef.current + 1);
    histRef.current.push(json);
    if (histRef.current.length > MAX_HIST) histRef.current.shift();
    idxRef.current = histRef.current.length - 1;
    setCanUndo(idxRef.current > 0);
    setCanRedo(false);
    persist(json);
    bumpLayers();
  }, [persist, bumpLayers]);

  const loadJSON = useCallback(async (json: string) => {
    const c = fcRef.current;
    if (!c) return;
    suspendRef.current = true;
    c.discardActiveObject();
    await c.loadFromJSON(json);
    c.requestRenderAll();
    suspendRef.current = false;
    setHasSel(false);
    setSelIsText(false);
    persist(json);
  }, [persist]);

  const undo = useCallback(async () => {
    if (idxRef.current <= 0) return;
    idxRef.current -= 1;
    await loadJSON(histRef.current[idxRef.current]);
    setCanUndo(idxRef.current > 0);
    setCanRedo(true);
  }, [loadJSON]);

  const redo = useCallback(async () => {
    if (idxRef.current >= histRef.current.length - 1) return;
    idxRef.current += 1;
    await loadJSON(histRef.current[idxRef.current]);
    setCanUndo(true);
    setCanRedo(idxRef.current < histRef.current.length - 1);
  }, [loadJSON]);

  const mutateSelection = useCallback((fn: (o: fabric.Object) => void) => {
    const c = fcRef.current;
    if (!c) return false;
    const objs = c.getActiveObjects();
    if (!objs.length) return false;
    objs.forEach(fn);
    c.requestRenderAll();
    pushHistory();
    return true;
  }, [pushHistory]);

  /* --- Callback refs (so the once-only keyboard handler is always fresh) */
  const cbs = useRef({
    undo, redo,
    duplicate:  async () => { /* set below */ },
    copy:       async () => { /* set below */ },
    paste:      async () => { /* set below */ },
    deleteSel:  () => { /* set below */ },
    resetView:  () => { /* set below */ },
    fitView:    () => { /* set below */ },
    selectAll:  () => { /* set below */ },
    group:      () => { /* set below */ },
    ungroup:    () => { /* set below */ },
    lockSel:    () => { /* set below */ },
    unlockAll:  () => { /* set below */ },
  });

  /* ============================================================ ENGINE == */
  useEffect(() => {
    const el = canvasElRef.current, host = hostRef.current;
    if (!el || !host) return;

    if (!document.getElementById("wb-fonts")) {
      const l = document.createElement("link");
      l.id = "wb-fonts";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&family=Architects+Daughter&family=Caveat:wght@500;700&family=Dancing+Script:wght@600&family=Gloria+Hallelujah&family=Indie+Flower&family=Kalam:wght@400;700&family=Pacifico&family=Patrick+Hand&family=Permanent+Marker&family=Satisfy&family=Shadows+Into+Light&family=Inter:wght@500;700&family=JetBrains+Mono&display=swap";
      document.head.appendChild(l);
    }
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        fcRef.current?.requestRenderAll();
      });
    }

    const c = new fabric.Canvas(el, {
      width: host.clientWidth || 1200,
      height: host.clientHeight || 700,
      backgroundColor: "",
      preserveObjectStacking: true,
      selection: true,
      selectionColor: "rgba(6,182,212,0.12)",
      selectionBorderColor: "#22d3ee",
      selectionLineWidth: 1,
      enableRetinaScaling: true,
      allowTouchScrolling: false,
      fireRightClick: true,
      stopContextMenu: true,
    });
    fcRef.current = c;

    fabric.Object.prototype.set({
      cornerColor: "#ffffff",
      cornerStrokeColor: "#22d3ee",
      cornerStyle: "circle",
      cornerSize: 9,
      transparentCorners: false,
      borderColor: "#22d3ee",
      borderScaleFactor: 1.4,
      padding: 4,
    });

    const brush = new fabric.PencilBrush(c);
    brush.decimate = 3;
    brush.strokeLineCap = "round";
    brush.strokeLineJoin = "round";
    c.freeDrawingBrush = brush;

    /* ---- Grid: cached pattern that tracks viewport ----------------- */
    const patCache = new Map<string, CanvasPattern | null>();
    const makePattern = (
      ctx: CanvasRenderingContext2D, size: number, color: string, type: "dots" | "lines" | "none",
    ): CanvasPattern | null => {
      const key = `${size}|${color}|${type}`;
      const cached = patCache.get(key);
      if (cached !== undefined) return cached;
      const s = Math.max(4, Math.round(size));
      const tile = document.createElement("canvas");
      tile.width = tile.height = s;
      const tx = tile.getContext("2d");
      if (!tx) { patCache.set(key, null); return null; }
      if (type === "dots") {
        tx.fillStyle = color;
        tx.beginPath();
        tx.arc(1.25, 1.25, 1.25, 0, Math.PI * 2);
        tx.fill();
      } else if (type === "lines") {
        tx.strokeStyle = color;
        tx.lineWidth = 1;
        tx.beginPath();
        tx.moveTo(0.5, 0); tx.lineTo(0.5, s);
        tx.moveTo(0, 0.5); tx.lineTo(s, 0.5);
        tx.stroke();
      }
      const pat = ctx.createPattern(tile, "repeat");
      patCache.set(key, pat);
      return pat;
    };

    c.on("before:render", (opt) => {
      const ctx = (opt as unknown as { ctx: CanvasRenderingContext2D }).ctx;
      if (!ctx || ctx !== c.getContext()) return;
      const { showGrid, theme } = live.current;
      if (!showGrid || theme.gtype === "none") return;
      const vpt = c.viewportTransform;
      let size = GRID * c.getZoom();
      while (size < 12) size *= 2;
      while (size > 96) size /= 2;
      const sq = Math.max(4, Math.round(size));
      const pat = makePattern(ctx, sq, theme.grid, theme.gtype);
      if (!pat) return;
      let ox = vpt[4] % sq, oy = vpt[5] % sq;
      if (ox > 0) ox -= sq;
      if (oy > 0) oy -= sq;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, c.getWidth() - ox + sq, c.getHeight() - oy + sq);
      ctx.restore();
    });

    /* ---- Laser trail: pure canvas, no objects ---------------------- */
    const laser: LaserPt[] = [];
    let rafId = 0;
    const loop = () => {
      rafId = 0;
      if (fcRef.current && laser.length) {
        fcRef.current.requestRenderAll();
        rafId = requestAnimationFrame(loop);
      }
    };
    const pumpLaser = () => { if (!rafId) rafId = requestAnimationFrame(loop); };

    c.on("after:render", (opt) => {
      const ctx = (opt as unknown as { ctx: CanvasRenderingContext2D }).ctx;
      if (!ctx || ctx !== c.getContext() || !laser.length) return;
      const now = performance.now();
      while (laser.length && now - laser[0].t > LASER_MS) laser.shift();
      if (laser.length < 2) return;
      ctx.save();
      ctx.lineCap = ctx.lineJoin = "round";
      for (let i = 1; i < laser.length; i++) {
        const a = clamp(1 - (now - laser[i].t) / LASER_MS, 0, 1);
        if (a < 0.02) continue;
        ctx.beginPath();
        ctx.moveTo(laser[i - 1].x, laser[i - 1].y);
        ctx.lineTo(laser[i].x, laser[i].y);
        ctx.strokeStyle = `rgba(239,68,68,${a * 0.35})`;
        ctx.lineWidth = 14 * a;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(laser[i - 1].x, laser[i - 1].y);
        ctx.lineTo(laser[i].x, laser[i].y);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = Math.max(1, 4 * a);
        ctx.stroke();
      }
      ctx.restore();
    });

    /* ---- Shape construction with robust Hand-Drawn Sketchy Mode --- */
    const snapVal = (v: number) => live.current.snap ? Math.round(v / GRID) * GRID : v;

    const buildShape = (t: Tool, a: fabric.Point, b: fabric.Point): fabric.Object | null => {
      const L = live.current;
      const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      const base = {
        stroke: L.stroke, strokeWidth: L.width, strokeDashArray: DASHES[L.style],
        strokeUniform: true, opacity: L.opacity,
        strokeLineCap: "round" as const, strokeLineJoin: "round" as const,
      };
      const fl = L.fill === "transparent" ? "" : L.fill;
      const finalFill = fl ? (L.fillStyle === "hachure" ? createHachurePattern(fl) : fl) : "";

      switch (t) {
        case "rect": {
          const W = Math.max(w, 2), H = Math.max(h, 2);
          if (L.sketchy) {
            const pathD = getSketchyRectPath(W, H, L.sloppiness);
            return new fabric.Path(pathD, { ...base, left, top, fill: finalFill, objectCaching: false });
          }
          return new fabric.Rect({ ...base, left, top, width: W, height: H, fill: finalFill, rx: 10, ry: 10 });
        }
        case "ellipse": {
          const rx = Math.max(w / 2, 1), ry = Math.max(h / 2, 1);
          if (L.sketchy) {
            const pathD = getSketchyEllipsePath(Math.max(w, 2), Math.max(h, 2), L.sloppiness);
            return new fabric.Path(pathD, { ...base, left, top, fill: finalFill, objectCaching: false });
          }
          return new fabric.Ellipse({ ...base, left, top, rx, ry, fill: finalFill });
        }
        case "diamond": {
          const W = Math.max(w, 2), H = Math.max(h, 2);
          if (L.sketchy) {
            const pathD = getSketchyDiamondPath(W, H, L.sloppiness);
            return new fabric.Path(pathD, { ...base, left, top, fill: finalFill, objectCaching: false });
          }
          const pts = [{ x: W / 2, y: 0 }, { x: W, y: H / 2 }, { x: W / 2, y: H }, { x: 0, y: H / 2 }];
          return new fabric.Polygon(pts, { ...base, left, top, fill: finalFill, objectCaching: false });
        }
        case "triangle": {
          const W = Math.max(w, 2), H = Math.max(h, 2);
          if (L.sketchy) {
            const pathD = getSketchyTrianglePath(W, H, L.sloppiness);
            return new fabric.Path(pathD, { ...base, left, top, fill: finalFill, objectCaching: false });
          }
          const pts = [{ x: W / 2, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
          return new fabric.Polygon(pts, { ...base, left, top, fill: finalFill, objectCaching: false });
        }
        case "cloud": {
          const W = Math.max(w, 10), H = Math.max(h, 10);
          const pathD = getSketchyCloudPath(W, H, L.sloppiness);
          return new fabric.Path(pathD, { ...base, left, top, fill: finalFill, objectCaching: false });
        }
        case "line": {
          if (L.sketchy) {
            const pathD = getSketchyLinePath(a.x, a.y, b.x, b.y, L.sloppiness);
            return new fabric.Path(pathD, base);
          }
          return new fabric.Line([a.x, a.y, b.x, b.y], base);
        }
        case "arrow": {
          const pathD = arrowPathD(a.x, a.y, b.x, b.y, L.width, L.sketchy, L.sloppiness);
          return new fabric.Path(pathD, base);
        }
        default: return null;
      }
    };

    const cleanupOrphans = () => {
      const active = c.getActiveObject();
      let changed = false;
      c.getObjects().forEach((o) => {
        if (o instanceof fabric.IText && o !== active) {
          const raw = (o.text || "").trim();
          if (!raw || raw === "Type text here") {
            c.remove(o);
            changed = true;
          }
        }
      });
      if (changed) c.requestRenderAll();
    };

    const addText = (x: number, y: number) => {
      cleanupOrphans();
      const L = live.current;
      const font = L.sketchy ? FONTS[0].family : L.font;
      const it = new fabric.IText("Type text here", {
        left: x, top: y - L.size / 2,
        fontFamily: font, fontSize: L.size,
        fill: L.stroke, opacity: L.opacity,
        editable: true, selectable: true, evented: true,
      });

      const onExit = () => {
        const raw = (it.text || "").trim();
        if (!raw || raw === "Type text here") {
          c.remove(it);
          c.requestRenderAll();
        }
      };
      it.on("editing:exited", onExit);
      it.on("deselected", onExit);

      c.add(it);
      c.setActiveObject(it);
      it.enterEditing();
      it.selectAll();
      c.requestRenderAll();
      pushHistory();
      if (!L.locked) setTool("select");
    };

    const addNote = (x: number, y: number, textContent = "📌 Sticky Note\n\nClick to write your concepts or formulas...") => {
      cleanupOrphans();
      const L = live.current;
      const font = L.sketchy ? FONTS[0].family : L.font;
      const curPalette = NOTE_PALETTES.find(p => p.id === L.noteColor) || NOTE_PALETTES[0];

      // Anti-collision staggering: offset if position collides
      let targetX = x - 120;
      let targetY = y - 90;
      const collides = c.getObjects().some(o => {
        const b = o.getBoundingRect();
        return Math.abs(b.left - targetX) < 40 && Math.abs(b.top - targetY) < 40;
      });
      if (collides) {
        targetX += 32;
        targetY += 32;
      }

      const n = new StickyNoteBox(textContent, {
        left: targetX, top: targetY, width: 240,
        fontFamily: font, fontSize: 18, lineHeight: 1.35,
        fill: curPalette.text,
        backgroundColor: curPalette.bg,
        padding: 16,
        splitByGrapheme: true,
        selectable: true, evented: true,
      });
      n.minHeight = 180;
      n.noteColorId = curPalette.id;
      n.noteBorderColor = curPalette.border;
      (n as any).customData = { type: "note", colorId: curPalette.id };

      c.add(n);
      c.setActiveObject(n);
      n.enterEditing();
      n.selectAll();
      c.requestRenderAll();
      pushHistory();
      if (!L.locked) setTool("select");
      showToast(`Created ${curPalette.name} sticky note`, "success");
    };

    /* ---- Interaction state ---------------------------------------- */
    let creating = false;
    let startPt: fabric.Point | null = null;
    let preview: fabric.Object | null = null;

    let panning = false;
    let lastX = 0, lastY = 0;
    let spaceHeld = false;
    let drawSuspended = false;

    let erasing = false;
    let laserOn = false;

    let lassoOn = false;
    let lassoPts: { x: number; y: number }[] = [];
    let lassoPoly: fabric.Polygon | null = null;

    const clientXY = (e: fabric.TPointerEvent) => {
      if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent) {
        const p = e.touches[0] ?? e.changedTouches[0];
        return { x: p?.clientX ?? 0, y: p?.clientY ?? 0 };
      }
      const m = e as MouseEvent;
      return { x: m.clientX, y: m.clientY };
    };

    const wantsPan = (e: fabric.TPointerEvent) =>
      live.current.tool === "pan" || spaceHeld
      || (e as MouseEvent).altKey === true
      || (e as MouseEvent).button === 1;

    /* Pan gestures must trump the pen — kill drawing mode BEFORE fabric
       initiates a stroke on mouse:down. */
    c.on("mouse:down:before", (opt) => {
      if (c.isDrawingMode && wantsPan(opt.e)) {
        drawSuspended = true;
        c.isDrawingMode = false;
      }
    });

    c.on("mouse:down", (opt) => {
      cleanupOrphans();
      const t = live.current.tool;

      if (wantsPan(opt.e)) {
        panning = true;
        c.selection = false;
        c.setCursor("grabbing");
        const p = clientXY(opt.e);
        lastX = p.x; lastY = p.y;
        return;
      }

      if (t === "eraser") {
        erasing = true;
        suspendRef.current = true;
        if (opt.target) { c.remove(opt.target); c.requestRenderAll(); }
        return;
      }

      if (t === "laser") {
        laserOn = true;
        const vp = c.getViewportPoint(opt.e);
        laser.push({ x: vp.x, y: vp.y, t: performance.now() });
        pumpLaser();
        return;
      }

      const sp = c.getScenePoint(opt.e);

      if (t === "lasso") {
        lassoOn = true;
        lassoPts = [{ x: sp.x, y: sp.y }];
        if (lassoPoly) c.remove(lassoPoly);
        lassoPoly = new fabric.Polygon([{ x: sp.x, y: sp.y }], {
          fill: "rgba(99, 102, 241, 0.18)",
          stroke: "#6366f1",
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          selectable: false,
          evented: false,
          strokeUniform: true,
        });
        c.add(lassoPoly);
        c.requestRenderAll();
        return;
      }

      if (isShape(t)) {
        creating = true;
        suspendRef.current = true;
        startPt = new fabric.Point(snapVal(sp.x), snapVal(sp.y));
        preview = null;
        return;
      }
      if (t === "text") addText(sp.x, sp.y);
      else if (t === "note") addNote(sp.x, sp.y);
    });

    c.on("mouse:move", (opt) => {
      if (panning) {
        const p = clientXY(opt.e);
        const vpt = c.viewportTransform;
        vpt[4] += p.x - lastX; vpt[5] += p.y - lastY;
        lastX = p.x; lastY = p.y;
        c.setViewportTransform(vpt);
        c.setCursor("grabbing");
        return;
      }
      if (erasing) {
        if (opt.target) { c.remove(opt.target); c.requestRenderAll(); }
        return;
      }
      if (laserOn) {
        const vp = c.getViewportPoint(opt.e);
        laser.push({ x: vp.x, y: vp.y, t: performance.now() });
        if (laser.length > 400) laser.shift();
        pumpLaser();
        return;
      }
      if (lassoOn && lassoPoly) {
        const sp = c.getScenePoint(opt.e);
        lassoPts.push({ x: sp.x, y: sp.y });
        lassoPoly.set({ points: [...lassoPts] });
        c.requestRenderAll();
        return;
      }
      if (creating && startPt) {
        const sp = c.getScenePoint(opt.e);
        const end = new fabric.Point(snapVal(sp.x), snapVal(sp.y));
        if ((opt.e as MouseEvent).shiftKey) {
          const t = live.current.tool;
          if (t === "line" || t === "arrow") {
            if (Math.abs(end.x - startPt.x) >= Math.abs(end.y - startPt.y)) end.y = startPt.y;
            else end.x = startPt.x;
          } else {
            const d = Math.max(Math.abs(end.x - startPt.x), Math.abs(end.y - startPt.y));
            end.x = startPt.x + (Math.sign(end.x - startPt.x) || 1) * d;
            end.y = startPt.y + (Math.sign(end.y - startPt.y) || 1) * d;
          }
        }
        if (preview) c.remove(preview);
        preview = buildShape(live.current.tool, startPt, end);
        if (preview) c.add(preview);
        c.requestRenderAll();
      }
    });

    const finishInteraction = () => {
      if (drawSuspended) {
        drawSuspended = false;
        c.isDrawingMode = isDraw(live.current.tool);
      }
      if (panning) {
        panning = false;
        c.selection = live.current.tool === "select";
        c.setCursor(cursorFor(live.current.tool));
      }
      if (erasing) {
        erasing = false;
        suspendRef.current = false;
        pushHistory();
      }
      if (laserOn) laserOn = false;
      if (lassoOn) {
        lassoOn = false;
        if (lassoPoly) { c.remove(lassoPoly); lassoPoly = null; }
        if (lassoPts.length >= 3) {
          const allObjects = c.getObjects();
          const matched = allObjects.filter((o) => {
            if (o === lassoPoly || !o.evented) return false;
            // Test center point in scene coords
            const center = o.getCenterPoint();
            if (isPointInPolygon(center, lassoPts)) return true;
            // Test all 4 scene corners
            const ac = o.aCoords;
            if (ac) {
              const pts = [ac.tl, ac.tr, ac.br, ac.bl];
              if (pts.some((pt) => pt && isPointInPolygon(pt, lassoPts))) return true;
            }
            return false;
          });

          if (matched.length > 0) {
            c.discardActiveObject();
            setTool("select");
            setTimeout(() => {
              if (matched.length === 1) {
                c.setActiveObject(matched[0]);
              } else {
                const sel = new fabric.ActiveSelection(matched, { canvas: c });
                c.setActiveObject(sel);
              }
              c.requestRenderAll();
            }, 20);
          }
        }
        lassoPts = [];
        c.requestRenderAll();
      }
      if (creating) {
        creating = false;
        const t = live.current.tool, s = startPt;
        let obj = preview;
        preview = null;
        startPt = null;

        // Simple click (no drag) → drop a sensible default-sized shape.
        const tiny = !obj ||
          ((obj.width ?? 0) * (obj.scaleX ?? 1) < 6 &&
           (obj.height ?? 0) * (obj.scaleY ?? 1) < 6);
        if (tiny && s) {
          if (obj) c.remove(obj);
          const b = new fabric.Point(
            s.x + (t === "line" || t === "arrow" ? 160 : 140),
            s.y + (t === "line" || t === "arrow" ? 0 : 90),
          );
          obj = buildShape(t, s, b);
          if (obj) c.add(obj);
        }
        suspendRef.current = false;
        if (obj) {
          obj.setCoords();
          c.setActiveObject(obj);
          pushHistory();
        }
        c.requestRenderAll();
        if (!live.current.locked) setTool("select");
      }
    };

    c.on("mouse:up", finishInteraction);

    // Safety net: pointer released outside canvas, or window loses focus.
    const escape = () => {
      if (panning || erasing || creating || laserOn || lassoOn || drawSuspended) finishInteraction();
    };
    window.addEventListener("pointerup", escape);
    window.addEventListener("blur", escape);

    /* Double-click empty canvas → drop a text object. */
    c.on("mouse:dblclick", (opt) => {
      if (opt.target && (opt.target as any).customData?.type === "mermaid") {
        const code = (opt.target as any).customData.code;
        if (code) {
          setMermaidCode(code);
          setMermaidModalOpen(true);
          return;
        }
      }
      if (live.current.tool !== "select" || opt.target) return;
      const sp = c.getScenePoint(opt.e);
      addText(sp.x, sp.y);
    });

    c.on("text:editing:exited", (opt) => {
      const t = opt.target as fabric.IText | undefined;
      if (t && !t.text?.trim()) {
        c.remove(t);
        c.requestRenderAll();
      } else {
        pushHistory();
      }
    });

    /* ---- Wheel: pinch-zoom, ctrl-zoom, trackpad pan ---------------- */
    c.on("mouse:wheel", (opt) => {
      const e = opt.e;
      e.preventDefault(); e.stopPropagation();
      const vpt = c.viewportTransform;
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > 0.5) {
        vpt[4] -= e.deltaX; vpt[5] -= e.deltaY;
        c.setViewportTransform(vpt);
        return;
      }
      const factor = 0.999 ** (e.deltaY * (e.ctrlKey ? 2.5 : 1));
      const z = clamp(c.getZoom() * factor, MIN_ZOOM, MAX_ZOOM);
      c.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), z);
      setZoom(z);
    });

    /* ---- Touch: pinch-zoom + two-finger pan ------------------------ */
    const upper = c.upperCanvasEl;
    let pinchDist = 0, pinching = false;
    let pinchMid = { x: 0, y: 0 };
    const distOf = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length !== 2) return;
      pinching = true;
      creating = false; panning = false; erasing = false; laserOn = false; lassoOn = false;
      if (preview) { c.remove(preview); preview = null; }
      if (lassoPoly) { c.remove(lassoPoly); lassoPoly = null; }
      suspendRef.current = false;
      (c as unknown as { _isCurrentlyDrawing?: boolean })._isCurrentlyDrawing = false;
      pinchDist = distOf(ev.touches);
      const r = upper.getBoundingClientRect();
      pinchMid = {
        x: (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - r.left,
        y: (ev.touches[0].clientY + ev.touches[1].clientY) / 2 - r.top,
      };
      ev.preventDefault();
    };
    const onTouchMove = (ev: TouchEvent) => {
      if (!pinching || ev.touches.length !== 2) return;
      ev.preventDefault();
      const d = distOf(ev.touches);
      if (!pinchDist) pinchDist = d;
      const r = upper.getBoundingClientRect();
      const mid = {
        x: (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - r.left,
        y: (ev.touches[0].clientY + ev.touches[1].clientY) / 2 - r.top,
      };
      const z = clamp(c.getZoom() * (d / pinchDist), MIN_ZOOM, MAX_ZOOM);
      c.zoomToPoint(new fabric.Point(mid.x, mid.y), z);
      const vpt = c.viewportTransform;
      vpt[4] += mid.x - pinchMid.x; vpt[5] += mid.y - pinchMid.y;
      c.setViewportTransform(vpt);
      pinchDist = d; pinchMid = mid;
      setZoom(z);
    };
    const onTouchEnd = (ev: TouchEvent) => {
      if (ev.touches.length < 2 && pinching) { pinching = false; pinchDist = 0; }
    };
    upper.addEventListener("touchstart", onTouchStart, { passive: false });
    upper.addEventListener("touchmove", onTouchMove, { passive: false });
    upper.addEventListener("touchend", onTouchEnd);
    upper.addEventListener("touchcancel", onTouchEnd);

    /* ---- Snap on move, history & selection tracking ---------------- */
    c.on("object:moving", (opt) => {
      if (!live.current.snap || !opt.target) return;
      opt.target.set({
        left: Math.round((opt.target.left ?? 0) / GRID) * GRID,
        top:  Math.round((opt.target.top  ?? 0) / GRID) * GRID,
      });
    });
    c.on("object:added",    () => pushHistory());
    c.on("object:modified", () => pushHistory());
    c.on("object:removed",  () => pushHistory());

    const readSel = () => {
      const objs = c.getActiveObjects();
      setHasSel(objs.length > 0);
      setIsMultiSel(objs.length > 1);
      setSelIsText(objs.some(isTextObj));
      const hasNote = objs.some(isNoteObj);
      setSelIsNote(hasNote);
      const o = objs[0];
      if (!o) return;
      if (hasNote) {
        const nId = (o as any).noteColorId || (o as any).customData?.colorId;
        if (nId) setNoteColor(nId);
      }
      if (isTextObj(o)) {
        const t = o as fabric.IText;
        if (typeof t.fill === "string") setStroke(t.fill);
        if (t.fontFamily) setFontFamily(t.fontFamily);
        if (t.fontSize) setFontSize(Math.round(t.fontSize));
      } else {
        if (typeof o.stroke === "string" && o.stroke) setStroke(o.stroke);
        if (typeof o.fill   === "string") setFill(o.fill || "transparent");
        if (o.strokeWidth) setStrokeWidth(o.strokeWidth);
      }
      if (typeof o.opacity === "number") setOpacity(o.opacity);
    };
    c.on("selection:created", readSel);
    c.on("selection:updated", readSel);
    c.on("selection:cleared", () => {
      setHasSel(false);
      setIsMultiSel(false);
      setSelIsText(false);
      setSelIsNote(false);
    });

    /* ---- Restore or seed history ---------------------------------- */
    (async () => {
      const saved = localStorage.getItem(storageKey);
      suspendRef.current = true;
      if (saved) { try { await c.loadFromJSON(saved); } catch { /* ignore */ } }
      c.requestRenderAll();
      suspendRef.current = false;
      const seed = JSON.stringify(c.toJSON());
      histRef.current = [seed];
      idxRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
      setReady(true);
    })();

    /* ---- Viewport resize ------------------------------------------ */
    const ro = new ResizeObserver(() => {
      if (!fcRef.current || !host) return;
      fcRef.current.setDimensions({ width: host.clientWidth, height: host.clientHeight });
      fcRef.current.requestRenderAll();
    });
    ro.observe(host);

    /* ---- Keyboard --------------------------------------------------- */
    const isEditing = () => {
      const a = c.getActiveObject() as fabric.IText | undefined;
      return !!a && !!a.isEditing;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (isEditing()) return;

      const meta = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (e.code === "Space" && !spaceHeld) {
        spaceHeld = true;
        if (c.isDrawingMode) { drawSuspended = true; c.isDrawingMode = false; }
        c.defaultCursor = "grab";
        c.setCursor("grab");
        e.preventDefault();
        return;
      }
      if (meta && k === "z") { e.preventDefault(); e.shiftKey ? cbs.current.redo() : cbs.current.undo(); return; }
      if (meta && k === "y") { e.preventDefault(); cbs.current.redo(); return; }
      if (meta && k === "d") { e.preventDefault(); cbs.current.duplicate(); return; }
      if (meta && k === "c") { e.preventDefault(); cbs.current.copy(); return; }
      if (meta && k === "v") { e.preventDefault(); cbs.current.paste(); return; }
      if (meta && k === "a") { e.preventDefault(); cbs.current.selectAll(); return; }
      if (meta && k === "0") { e.preventDefault(); cbs.current.resetView(); return; }
      if (meta && k === "1") { e.preventDefault(); cbs.current.fitView(); return; }
      if (meta && k === "g") {
        e.preventDefault();
        e.shiftKey ? cbs.current.ungroup() : cbs.current.group();
        return;
      }
      if (meta && k === "l") {
        e.preventDefault();
        e.shiftKey ? cbs.current.unlockAll() : cbs.current.lockSel();
        return;
      }
      if (meta) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        cbs.current.deleteSel();
        return;
      }
      if (e.key === "Escape") {
        c.discardActiveObject();
        c.requestRenderAll();
        setTool("select");
        return;
      }
      const mapped = KEYS[k];
      if (mapped) setTool(mapped);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld = false;
        if (drawSuspended) {
          drawSuspended = false;
          c.isDrawingMode = isDraw(live.current.tool);
        }
        c.defaultCursor = cursorFor(live.current.tool);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    /* ---- Paste images from clipboard ------------------------------- */
    const onPaste = (e: ClipboardEvent) => {
      if (isEditing()) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (!it.type.startsWith("image/")) continue;
        e.preventDefault();
        const f = it.getAsFile();
        if (!f) continue;
        const r = new FileReader();
        r.onload = () => {
          fabric.FabricImage.fromURL(r.result as string).then((img) => {
            const maxW = c.getWidth() * 0.6;
            if ((img.width ?? 0) > maxW) img.scaleToWidth(maxW);
            const cp = c.getVpCenter();
            img.set({ left: cp.x - img.getScaledWidth() / 2, top: cp.y - img.getScaledHeight() / 2 });
            c.add(img);
            c.setActiveObject(img);
            c.requestRenderAll();
            setTool("select");
            showToast("Image pasted", "success");
          });
        };
        r.readAsDataURL(f);
        return;
      }
    };
    document.addEventListener("paste", onPaste);

    /* ---- Cleanup --------------------------------------------------- */
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", escape);
      window.removeEventListener("blur", escape);
      document.removeEventListener("paste", onPaste);
      upper.removeEventListener("touchstart", onTouchStart);
      upper.removeEventListener("touchmove", onTouchMove);
      upper.removeEventListener("touchend", onTouchEnd);
      upper.removeEventListener("touchcancel", onTouchEnd);
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      c.dispose();
      fcRef.current = null;
    };
    // storageKey is the only long-lived dependency; state flows via live ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  /* --- Tool → canvas mode sync & Brush Color Sync --------------------- */
  useEffect(() => {
    const c = fcRef.current;
    if (!c) return;

    const drawing = isDraw(tool);
    c.isDrawingMode = drawing;
    if (c.freeDrawingBrush) {
      const b = c.freeDrawingBrush as fabric.PencilBrush;
      if (tool === "marker") {
        b.color = isHex6(stroke) ? `${stroke}59` : stroke;
        b.width = Math.max(12, strokeWidth * 4);
      } else {
        b.color = stroke;
        b.width = strokeWidth;
      }
      b.decimate = 3;
      b.strokeLineCap = "round";
      b.strokeLineJoin = "round";
    }
    c.selection = tool === "select";
    c.skipTargetFind = !(tool === "select" || tool === "eraser");
    c.forEachObject((o) => {
      o.selectable = (tool === "select" || tool === "lasso");
      o.evented = (tool === "select" || tool === "eraser" || tool === "lasso");
    });
    c.defaultCursor = cursorFor(tool);
    c.hoverCursor = tool === "select" ? "move" : c.defaultCursor;
    if (tool !== "select" && tool !== "lasso") c.discardActiveObject();
    c.requestRenderAll();
  }, [tool, stroke, strokeWidth, ready]);

  /* Keep newly-added objects interactive in the current tool mode */
  useEffect(() => {
    const c = fcRef.current;
    if (!c) return;
    const handler = (opt: { target?: fabric.Object }) => {
      if (!opt.target) return;
      opt.target.selectable = (live.current.tool === "select" || live.current.tool === "lasso");
      opt.target.evented = (live.current.tool === "select" || live.current.tool === "eraser" || live.current.tool === "lasso");
    };
    c.on("object:added", handler);
    return () => { c.off("object:added", handler); };
  }, [ready]);

  useEffect(() => { fcRef.current?.requestRenderAll(); }, [showGrid, themeId]);

  /* Auto-switch ink colour when the theme's default ink changes and the user
     hasn't picked a custom colour yet. */
  const prevInkRef = useRef(theme.ink);
  useEffect(() => {
    if (stroke === prevInkRef.current) setStroke(theme.ink);
    prevInkRef.current = theme.ink;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  /* --- Actions -------------------------------------------------------- */
  const clipboardRef = useRef<fabric.Object | null>(null);

  const duplicate = useCallback(async () => {
    const c = fcRef.current;
    const act = c?.getActiveObject();
    if (!c || !act) { showToast("Pehle koi object select karo", "warning"); return; }
    const cl = await act.clone();
    c.discardActiveObject();
    cl.set({ left: (cl.left ?? 0) + 24, top: (cl.top ?? 0) + 24, evented: true });
    if (cl instanceof fabric.ActiveSelection) {
      cl.canvas = c;
      cl.forEachObject((o) => c.add(o));
      cl.setCoords();
    } else c.add(cl);
    c.setActiveObject(cl);
    c.requestRenderAll();
  }, [showToast]);

  const copySel = useCallback(async () => {
    const c = fcRef.current;
    const act = c?.getActiveObject();
    if (!c || !act) return;
    clipboardRef.current = await act.clone();
    showToast("Copied", "info");
  }, [showToast]);

  const paste = useCallback(async () => {
    const c = fcRef.current;
    if (!c || !clipboardRef.current) return;
    const cl = await clipboardRef.current.clone();
    c.discardActiveObject();
    cl.set({ left: (cl.left ?? 0) + 28, top: (cl.top ?? 0) + 28, evented: true });
    if (cl instanceof fabric.ActiveSelection) {
      cl.canvas = c;
      cl.forEachObject((o) => c.add(o));
      cl.setCoords();
    } else c.add(cl);
    c.setActiveObject(cl);
    c.requestRenderAll();
  }, []);

  const deleteSel = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (!objs.length) return;
    objs.forEach((o) => c.remove(o));
    c.discardActiveObject();
    c.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const selectAll = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    c.discardActiveObject();
    const all = c.getObjects().filter((o) => o.selectable !== false);
    if (!all.length) return;
    c.setActiveObject(new fabric.ActiveSelection(all, { canvas: c }));
    c.requestRenderAll();
  }, []);

  const bringFront = useCallback(() => {
    const c = fcRef.current, a = c?.getActiveObject();
    if (c && a) { c.bringObjectToFront(a); c.requestRenderAll(); pushHistory(); }
  }, [pushHistory]);

  const sendBack = useCallback(() => {
    const c = fcRef.current, a = c?.getActiveObject();
    if (c && a) { c.sendObjectToBack(a); c.requestRenderAll(); pushHistory(); }
  }, [pushHistory]);

  /* --- Grouping & locking (Excalidraw / tldraw parity) ---------------- */
  const groupSelection = useCallback(() => {
    const c = fcRef.current;
    const act = c?.getActiveObject();
    if (!c) return;
    if (!(act instanceof fabric.ActiveSelection) || act.size() < 2) {
      showToast("Select at least 2 objects to group", "warning");
      return;
    }
    // Fabric 7 dropped ActiveSelection#toGroup(), so build the group explicitly.
    const objects = c.getActiveObjects();
    c.discardActiveObject();
    c.remove(...objects);
    const group = new fabric.Group(objects);
    c.add(group);
    c.setActiveObject(group);
    c.requestRenderAll();
    pushHistory();
    showToast(`Grouped ${group.size()} objects`, "success");
  }, [pushHistory, showToast]);

  const ungroupSelection = useCallback(() => {
    const c = fcRef.current;
    const act = c?.getActiveObject();
    if (!c) return;
    if (!(act instanceof fabric.Group) || act instanceof fabric.ActiveSelection) {
      showToast("Select a group first", "warning");
      return;
    }
    // Fabric 7 dropped Group#toActiveSelection(), so unpack manually.
    const objects = act.getObjects().slice();
    const count = objects.length;
    act.removeAll();
    c.remove(act);
    c.add(...objects);
    const sel = new fabric.ActiveSelection(objects, { canvas: c });
    c.setActiveObject(sel);
    c.requestRenderAll();
    pushHistory();
    showToast(`Ungrouped ${count} objects`, "success");
  }, [pushHistory, showToast]);

  const lockSelection = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (!objs.length) { showToast("Select something to lock", "warning"); return; }
    const shouldLock = objs.some((o) => !(o as any).__locked);
    objs.forEach((o) => {
      (o as any).__locked = shouldLock;
      o.set({
        selectable: !shouldLock,
        evented: !shouldLock,
        lockMovementX: shouldLock,
        lockMovementY: shouldLock,
        lockRotation: shouldLock,
        lockScalingX: shouldLock,
        lockScalingY: shouldLock,
        hoverCursor: shouldLock ? "not-allowed" : "move",
      });
    });
    c.discardActiveObject();
    c.requestRenderAll();
    pushHistory();
    showToast(shouldLock ? `Locked ${objs.length} object(s)` : `Unlocked ${objs.length} object(s)`, "success");
  }, [pushHistory, showToast]);

  const unlockAll = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    let n = 0;
    c.getObjects().forEach((o) => {
      if (!(o as any).__locked) return;
      (o as any).__locked = false;
      o.set({
        selectable: true, evented: true,
        lockMovementX: false, lockMovementY: false, lockRotation: false,
        lockScalingX: false, lockScalingY: false, hoverCursor: "move",
      });
      n += 1;
    });
    c.requestRenderAll();
    if (n) { pushHistory(); showToast(`Unlocked ${n} object(s)`, "success"); }
    else showToast("Nothing is locked", "info");
  }, [pushHistory, showToast]);

  /* --- Layers panel --------------------------------------------------- */
  const [layerRows, setLayerRows] = useState<
    { index: number; type: string; label: string; locked: boolean; hidden: boolean; active: boolean }[]
  >([]);

  useEffect(() => {
    if (!layersOpen) return;
    const c = fcRef.current;
    if (!c) return;
    const activeSet = new Set<fabric.Object>(c.getActiveObjects());
    const rows = c.getObjects().map((o, index) => {
      const type = String((o as any).type ?? "object");
      let label = type.charAt(0).toUpperCase() + type.slice(1);
      if (isNoteObj(o)) label = "Sticky note";
      else if (isTextObj(o)) label = String((o as any).text ?? "Text").replace(/\s+/g, " ").slice(0, 34) || "Text";
      else if (type === "image") label = "Image";
      else if (type === "path") label = "Drawing";
      else if (type === "group") label = `Group · ${(o as any).size?.() ?? 0} items`;
      return {
        index,
        type,
        label,
        locked: !!(o as any).__locked,
        hidden: o.visible === false,
        active: activeSet.has(o),
      };
    });
    setLayerRows(rows.reverse());
  }, [layersOpen, layersTick]);

  const layerObjectAt = (index: number) => fcRef.current?.getObjects()[index];

  const selectLayer = useCallback((index: number) => {
    const c = fcRef.current;
    const o = layerObjectAt(index);
    if (!c || !o) return;
    if (o.selectable === false) { showToast("Object is locked — unlock it first", "warning"); return; }
    c.discardActiveObject();
    c.setActiveObject(o);
    c.requestRenderAll();
  }, [showToast]);

  const toggleLayerLock = useCallback((index: number) => {
    const c = fcRef.current;
    const o = layerObjectAt(index);
    if (!c || !o) return;
    const locked = !(o as any).__locked;
    (o as any).__locked = locked;
    o.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked, hoverCursor: locked ? "not-allowed" : "move" });
    if (locked) c.discardActiveObject();
    c.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const toggleLayerVisible = useCallback((index: number) => {
    const c = fcRef.current;
    const o = layerObjectAt(index);
    if (!c || !o) return;
    o.set({ visible: o.visible === false });
    c.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const moveLayer = useCallback((index: number, dir: 1 | -1) => {
    const c = fcRef.current;
    const o = layerObjectAt(index);
    if (!c || !o) return;
    if (dir > 0) c.bringObjectForward(o); else c.sendObjectBackwards(o);
    c.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const deleteLayer = useCallback((index: number) => {
    const c = fcRef.current;
    const o = layerObjectAt(index);
    if (!c || !o) return;
    c.remove(o);
    c.discardActiveObject();
    c.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  /* --- Miro-style starter templates ----------------------------------- */
  const applyTemplate = useCallback((id: string) => {
    const c = fcRef.current;
    if (!c) return;
    const cp = c.getVpCenter();
    const ink = theme.ink;
    const add = (o: fabric.Object) => { c.add(o); return o; };

    const box = (x: number, y: number, w: number, h: number, text: string, accent: string) => {
      const rect = new fabric.Rect({
        left: x, top: y, width: w, height: h, rx: 14, ry: 14,
        fill: `${accent}1f`, stroke: accent, strokeWidth: 2, strokeUniform: true,
      });
      const label = new fabric.Textbox(text, {
        left: x + 14, top: y + 14, width: Math.max(40, w - 28),
        fontSize: 16, fontFamily: FONTS[0].family, fill: ink, lineHeight: 1.25,
      });
      return add(new fabric.Group([rect, label]));
    };
    const link = (x1: number, y1: number, x2: number, y2: number, color: string) =>
      add(new fabric.Path(arrowPathD(x1, y1, x2, y2, 2, false), {
        stroke: color, strokeWidth: 2, fill: "", strokeUniform: true, strokeLineCap: "round",
      }));
    const text = (s: string, x: number, y: number, size = 18, color = ink, w = 320) =>
      add(new fabric.Textbox(s, { left: x, top: y, width: w, fontSize: size, fontFamily: FONTS[0].family, fill: color, lineHeight: 1.25 }));

    switch (id) {
      case "mindmap": {
        const cx = cp.x - 110, cy = cp.y - 44;
        box(cx, cy, 220, 88, "Central idea", "#8b5cf6");
        const branches = [
          { dx: -320, dy: -190, t: "Branch 1" },
          { dx: 200, dy: -190, t: "Branch 2" },
          { dx: -320, dy: 150, t: "Branch 3" },
          { dx: 200, dy: 150, t: "Branch 4" },
        ];
        branches.forEach((b) => {
          box(cx + b.dx, cy + b.dy, 180, 80, b.t, "#22d3ee");
          const sx = b.dx < 0 ? cx : cx + 220;
          const sy = cy + 44;
          const ex = b.dx < 0 ? cx + b.dx + 180 : cx + b.dx;
          const ey = cy + b.dy + 40;
          link(sx, sy, ex, ey, "#64748b");
        });
        break;
      }
      case "kanban": {
        const cols = ["To do", "In progress", "Done"];
        const colors = ["#f59e0b", "#3b82f6", "#10b981"];
        const startX = cp.x - 390;
        cols.forEach((title, i) => {
          const x = startX + i * 264;
          box(x, cp.y - 200, 240, 56, title, colors[i]);
          box(x, cp.y - 128, 240, 84, "Card title\nAdd details…", "#64748b");
          box(x, cp.y - 32, 240, 84, "Card title\nAdd details…", "#64748b");
        });
        break;
      }
      case "flow": {
        const x = cp.x - 110;
        box(x, cp.y - 240, 220, 80, "Start", "#10b981");
        box(x, cp.y - 100, 220, 80, "Process step", "#3b82f6");
        box(x, cp.y + 40, 220, 80, "Decision?", "#f59e0b");
        box(x, cp.y + 180, 220, 80, "Done", "#8b5cf6");
        link(x + 110, cp.y - 160, x + 110, cp.y - 100, "#64748b");
        link(x + 110, cp.y - 20, x + 110, cp.y + 40, "#64748b");
        link(x + 110, cp.y + 120, x + 110, cp.y + 180, "#64748b");
        break;
      }
      case "swot": {
        const cells = [
          { t: "Strengths", c: "#10b981", dx: -280, dy: -220 },
          { t: "Weaknesses", c: "#f59e0b", dx: 0, dy: -220 },
          { t: "Opportunities", c: "#3b82f6", dx: -280, dy: 0 },
          { t: "Threats", c: "#ef4444", dx: 0, dy: 0 },
        ];
        cells.forEach((cell) => box(cp.x + cell.dx, cp.y + cell.dy, 260, 200, `${cell.t}\n\n`, cell.c));
        break;
      }
      case "cornell": {
        const w = 720, h = 480;
        const x = cp.x - w / 2, y = cp.y - h / 2;
        add(new fabric.Rect({ left: x, top: y, width: w, height: h, fill: "transparent", stroke: "#94a3b8", strokeWidth: 2 }));
        add(new fabric.Line([x + 200, y, x + 200, y + h], { stroke: "#94a3b8", strokeWidth: 2 }));
        add(new fabric.Line([x, y + h - 140, x + w, y + h - 140], { stroke: "#94a3b8", strokeWidth: 2 }));
        text("Cues / questions", x + 12, y + 12, 16, "#94a3b8", 176);
        text("Notes", x + 216, y + 12, 16, "#94a3b8", w - 236);
        text("Summary", x + 12, y + h - 128, 16, "#94a3b8", w - 24);
        break;
      }
      case "timeline": {
        const y = cp.y;
        const x0 = cp.x - 360;
        add(new fabric.Line([x0, y, x0 + 720, y], { stroke: "#64748b", strokeWidth: 3 }));
        for (let i = 0; i < 5; i += 1) {
          const px = x0 + i * 180;
          add(new fabric.Circle({ left: px - 9, top: y - 9, radius: 9, fill: "#22d3ee", stroke: "#0ea5e9", strokeWidth: 2 }));
          text(`Milestone ${i + 1}`, px - 70, y + 24, 14, ink, 160);
        }
        break;
      }
      default:
        break;
    }

    c.requestRenderAll();
    pushHistory();
    setTemplatesOpen(false);
    showToast("Template added to the board", "success");
  }, [theme.ink, pushHistory, showToast]);

  /* --- Slide Deck Operations ----------------------------------------- */
  const persistSlides = useCallback((updatedSlides: { id: string; title: string; json: string }[]) => {
    setSlides(updatedSlides);
    try {
      localStorage.setItem(`${storageKey}_slides_v1`, JSON.stringify(updatedSlides));
    } catch {}
  }, [storageKey]);

  const switchSlide = useCallback(async (targetIdx: number) => {
    const c = fcRef.current;
    if (!c || targetIdx < 0 || targetIdx >= slides.length || targetIdx === activeSlideIdx) return;
    const currentJson = JSON.stringify(c.toJSON());
    const updated = [...slides];
    updated[activeSlideIdx] = { ...updated[activeSlideIdx], json: currentJson };
    persistSlides(updated);
    setActiveSlideIdx(targetIdx);
    const targetJson = updated[targetIdx].json;
    if (targetJson) {
      await loadJSON(targetJson);
    } else {
      c.clear();
      c.requestRenderAll();
    }
    showToast(`Switched to ${updated[targetIdx].title}`, "info");
  }, [slides, activeSlideIdx, persistSlides, loadJSON, showToast]);

  const addNewSlide = useCallback(async () => {
    const c = fcRef.current;
    if (!c) return;
    const currentJson = JSON.stringify(c.toJSON());
    const updated = [...slides];
    updated[activeSlideIdx] = { ...updated[activeSlideIdx], json: currentJson };
    const newSlide = {
      id: crypto.randomUUID(),
      title: `Slide ${updated.length + 1}`,
      json: "",
    };
    updated.push(newSlide);
    persistSlides(updated);
    setActiveSlideIdx(updated.length - 1);
    c.clear();
    c.requestRenderAll();
    showToast(`Created new slide (${newSlide.title})`, "success");
  }, [slides, activeSlideIdx, persistSlides, showToast]);

  const deleteCurrentSlide = useCallback(async () => {
    const c = fcRef.current;
    if (!c) return;
    if (slides.length <= 1) {
      c.clear();
      c.requestRenderAll();
      const reset = [{ id: "slide-1", title: "Slide 1", json: "" }];
      persistSlides(reset);
      setActiveSlideIdx(0);
      showToast("Cleared slide canvas", "info");
      return;
    }
    const filtered = slides.filter((_, idx) => idx !== activeSlideIdx);
    const nextIdx = Math.max(0, activeSlideIdx - 1);
    persistSlides(filtered);
    setActiveSlideIdx(nextIdx);
    const nextJson = filtered[nextIdx]?.json;
    if (nextJson) {
      await loadJSON(nextJson);
    } else {
      c.clear();
      c.requestRenderAll();
    }
    showToast("Deleted slide", "warning");
  }, [slides, activeSlideIdx, persistSlides, loadJSON, showToast]);

  /* --- Alignment & Distribution -------------------------------------- */
  const alignSelection = (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const c = fcRef.current;
    if (!c) return;
    const active = c.getActiveObject();
    if (!active) return;

    if (active instanceof fabric.ActiveSelection) {
      const objs = active.getObjects();
      if (objs.length < 2) return;

      const boxes = objs.map((o) => ({
        left: o.left,
        top: o.top,
        width: o.getScaledWidth(),
        height: o.getScaledHeight(),
      }));

      const aligned = calculateAlignment(boxes, type);
      objs.forEach((o, i) => {
        o.set({ left: aligned[i].left, top: aligned[i].top });
        o.setCoords();
      });
      c.requestRenderAll();
      pushHistory();
      showToast(`Aligned ${type}`, "info");
    }
  };

  const distributeSelection = (axis: "horizontal" | "vertical") => {
    const c = fcRef.current;
    if (!c) return;
    const active = c.getActiveObject();
    if (!active || !(active instanceof fabric.ActiveSelection)) return;

    const objs = active.getObjects();
    if (objs.length < 3) {
      showToast("Select 3 or more objects to distribute", "warning");
      return;
    }

    const boxes = objs.map((o) => ({
      left: o.left,
      top: o.top,
      width: o.getScaledWidth(),
      height: o.getScaledHeight(),
    }));

    const distributed = calculateDistribution(boxes, axis);
    objs.forEach((o, i) => {
      o.set({ left: distributed[i].left, top: distributed[i].top });
      o.setCoords();
    });
    c.requestRenderAll();
    pushHistory();
    showToast(`Distributed ${axis}`, "info");
  };

  /* --- Mermaid Diagram & AI Generation ------------------------------- */
  useEffect(() => {
    if (!mermaidModalOpen) return;
    let cancelled = false;
    renderMermaidToSvg(mermaidCode)
      .then((svg) => {
        if (!cancelled) {
          setMermaidPreviewSvg(svg);
          setMermaidError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMermaidError(err.message || "Invalid syntax");
        }
      });
    return () => { cancelled = true; };
  }, [mermaidModalOpen, mermaidCode]);

  const insertMermaidDiagram = async () => {
    const c = fcRef.current;
    if (!c) return;
    try {
      const { dataUrl, width, height } = await renderMermaidToPngDataUrl(mermaidCode);
      const img = await fabric.FabricImage.fromURL(dataUrl);
      const maxW = c.getWidth() * 0.7;
      if ((img.width ?? width ?? 0) > maxW) img.scaleToWidth(maxW);
      const cp = c.getVpCenter();
      img.set({
        left: cp.x - img.getScaledWidth() / 2,
        top: cp.y - img.getScaledHeight() / 2,
      });
      (img as any).customData = { type: "mermaid", code: mermaidCode };
      c.add(img);
      c.setActiveObject(img);
      c.requestRenderAll();
      pushHistory();
      setMermaidModalOpen(false);
      showToast("Inserted Mermaid diagram onto canvas", "success");
    } catch (err: any) {
      console.error(err);
      setMermaidError(err.message || "Failed to render Mermaid diagram");
      showToast("Mermaid syntax error", "warning");
    }
  };

  const handleGenerateAiDiagram = async () => {
    if (!mermaidAiPrompt.trim()) {
      showToast("Please enter a diagram topic or workflow", "warning");
      return;
    }
    setIsGeneratingDiagram(true);
    setMermaidError(null);
    try {
      const sysPrompt = "You are an expert system architect and diagrammer. Reply with a single valid Mermaid diagram only. Start with the diagram keyword (flowchart, graph, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, mindmap, timeline, gantt, pie). Wrap any node label that contains parentheses, brackets, colons or punctuation in double quotes. Do not use markdown fences and do not add commentary before or after the code.";
      const prompt = `Create a detailed, professional Mermaid diagram for: ${mermaidAiPrompt.trim()}`;
      const res = await callUnifiedAI(prompt, sysPrompt, "mermaid");

      if (!res.text || !res.text.trim()) {
        showToast("AI returned an empty diagram. Try rephrasing the topic.", "warning");
        return;
      }

      // Never paste raw model output: extract only the diagram body, repair
      // unquoted labels, then prove it renders before replacing the editor.
      let finalCode = sanitizeMermaidLabels(extractMermaidCode(res.text));
      let normalised = false;

      try {
        if (!finalCode) throw new Error("No Mermaid source found in the AI response");
        await renderMermaidToSvg(finalCode);
      } catch {
        // Prose answer, unsupported syntax or broken labels → guaranteed-valid
        // structured diagram built from the user's own topic.
        finalCode = buildFallbackMermaid(mermaidAiPrompt);
        normalised = true;
        try {
          await renderMermaidToSvg(finalCode);
        } catch {
          showToast("Could not build a valid Mermaid diagram. Try a simpler topic.", "warning");
          return;
        }
      }

      setMermaidCode(finalCode);
      showToast(
        normalised
          ? "AI output normalised into a valid diagram"
          : "Generated Mermaid diagram with AI!",
        "success"
      );
    } catch (err: any) {
      console.error(err);
      showToast("AI diagram generation failed", "warning");
    } finally {
      setIsGeneratingDiagram(false);
    }
  };

  /* --- Markdown Card & AI Notes -------------------------------------- */
  const insertMarkdownCard = async () => {
    const c = fcRef.current;
    if (!c) return;
    try {
      const canvas = renderMarkdownCardCanvas(markdownTitle, markdownContent, markdownAccent);
      const dataUrl = canvas.toDataURL("image/png");
      const img = await fabric.FabricImage.fromURL(dataUrl);
      const maxW = c.getWidth() * 0.55;
      if ((img.width ?? 0) > maxW) img.scaleToWidth(maxW);
      const cp = c.getVpCenter();
      img.set({
        left: cp.x - img.getScaledWidth() / 2,
        top: cp.y - img.getScaledHeight() / 2,
      });
      (img as any).customData = { type: "markdown", title: markdownTitle, content: markdownContent, accent: markdownAccent };
      c.add(img);
      c.setActiveObject(img);
      c.requestRenderAll();
      pushHistory();
      setMarkdownModalOpen(false);
      showToast("Inserted Markdown study card onto whiteboard", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to create study note card", "error");
    }
  };

  const handleGenerateAiMarkdown = async () => {
    if (!markdownAiPrompt.trim()) {
      showToast("Please enter a topic for AI study notes", "warning");
      return;
    }
    setIsGeneratingMarkdown(true);
    try {
      const sysPrompt = "You are an elite academic tutor writing a revision card. Return well-structured GitHub-flavoured Markdown only: a # title, ## sections, bullet lists, numbered steps, a pipe table when comparing items, fenced code blocks for technical examples, and a - [ ] checklist of must-remember points. Use inline **bold**, *italic* and `code`. Do not wrap the whole answer in a code fence and do not add chat commentary.";
      const prompt = `Produce structured revision study notes on: ${markdownAiPrompt.trim()}`;
      const res = await callUnifiedAI(prompt, sysPrompt, "markdown");
      const clean = normalizeMarkdownResponse(res.text || "");

      if (!clean) {
        showToast("AI returned empty notes. Try rephrasing the topic.", "warning");
        return;
      }

      const heading = /^#{1,6}\s+(.+)$/m.exec(clean);
      const derivedTitle = (heading?.[1] || markdownAiPrompt.trim()).replace(/[*_`#]/g, "").trim();
      setMarkdownTitle(derivedTitle.slice(0, 60) || markdownAiPrompt.trim().slice(0, 60));
      setMarkdownContent(clean);
      showToast("Generated study notes with AI!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("AI note generation failed", "warning");
    } finally {
      setIsGeneratingMarkdown(false);
    }
  };

  /* --- View ----------------------------------------------------------- */
  const zoomBy = useCallback((f: number) => {
    const c = fcRef.current;
    if (!c) return;
    const z = clamp(c.getZoom() * f, MIN_ZOOM, MAX_ZOOM);
    c.zoomToPoint(new fabric.Point(c.getWidth() / 2, c.getHeight() / 2), z);
    setZoom(z);
  }, []);

  const resetView = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
  }, []);

  const fitView = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    const objs = c.getObjects();
    if (!objs.length) { resetView(); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objs.forEach((o) => {
      const r = o.getBoundingRect();
      if (r.left < minX) minX = r.left;
      if (r.top  < minY) minY = r.top;
      if (r.left + r.width  > maxX) maxX = r.left + r.width;
      if (r.top  + r.height > maxY) maxY = r.top  + r.height;
    });
    const pad = 100, w = maxX - minX, h = maxY - minY;
    if (w <= 0 || h <= 0) { resetView(); return; }
    const z = clamp(Math.min((c.getWidth() - pad) / w, (c.getHeight() - pad) / h), MIN_ZOOM, MAX_ZOOM);
    c.setViewportTransform([
      z, 0, 0, z,
      c.getWidth() / 2 - (minX + w / 2) * z,
      c.getHeight() / 2 - (minY + h / 2) * z,
    ]);
    setZoom(z);
  }, [resetView]);

  /* Keep the keyboard handler's callback refs current */
  useEffect(() => {
    cbs.current = {
      undo, redo, duplicate, copy: copySel, paste, deleteSel,
      resetView, fitView, selectAll,
      group: groupSelection, ungroup: ungroupSelection,
      lockSel: lockSelection, unlockAll,
    };
  });

  /* --- Style updaters that mutate current selection & pencil brush ------ */
  const setStrokeA = (v: string) => {
    setStroke(v);
    if (fcRef.current?.freeDrawingBrush) {
      const b = fcRef.current.freeDrawingBrush as fabric.PencilBrush;
      b.color = tool === "marker" && isHex6(v) ? `${v}59` : v;
    }
    mutateSelection((o) => { if (isTextObj(o)) o.set({ fill: v }); else o.set({ stroke: v }); });
  };
  const setFillA = (v: string) => {
    setFill(v);
    mutateSelection((o) => { if (!isTextObj(o)) o.set({ fill: v === "transparent" ? "" : v }); });
  };
  const setWidthA = (v: number) => {
    setStrokeWidth(v);
    if (fcRef.current?.freeDrawingBrush) {
      const b = fcRef.current.freeDrawingBrush as fabric.PencilBrush;
      b.width = tool === "marker" ? Math.max(12, v * 4) : v;
    }
    mutateSelection((o) => { if (!isTextObj(o)) o.set({ strokeWidth: v }); });
  };
  const setStyleA = (v: string) => {
    setStrokeStyle(v);
    mutateSelection((o) => o.set({ strokeDashArray: DASHES[v] ?? null }));
  };
  const setOpacityA = (v: number) => {
    setOpacity(v);
    mutateSelection((o) => o.set({ opacity: v }));
  };
  const setFontA = (v: string) => {
    setFontFamily(v);
    mutateSelection((o) => { if (isTextObj(o)) (o as fabric.IText).set({ fontFamily: v }); });
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.load(`24px ${v}`).then(() => {
        fcRef.current?.requestRenderAll();
      }).catch(() => {
        fcRef.current?.requestRenderAll();
      });
    } else {
      fcRef.current?.requestRenderAll();
    }
  };
  const setSizeA = (v: number) => {
    setFontSize(v);
    mutateSelection((o) => { if (isTextObj(o)) o.set({ fontSize: v }); });
  };
  const setNoteColorA = (v: string) => {
    setNoteColor(v);
    const pal = NOTE_PALETTES.find((p) => p.id === v);
    if (!pal) return;
    mutateSelection((o) => {
      if (isNoteObj(o) || isTextObj(o)) {
        o.set({ backgroundColor: pal.bg, fill: pal.text });
        if (o instanceof StickyNoteBox) {
          o.noteBorderColor = pal.border;
          o.noteColorId = pal.id;
        }
        if ((o as any).customData) {
          (o as any).customData.colorId = pal.id;
        }
      }
    });
  };

  const setNoteSizePreset = (w: number, h: number) => {
    const c = fcRef.current;
    if (!c) return;
    let changed = false;
    mutateSelection((o) => {
      if (o instanceof StickyNoteBox) {
        o.set({ width: w });
        o.minHeight = h;
        o.initDimensions();
        changed = true;
      }
    });
    if (changed) {
      showToast(`Note resized to ${w}×${h}px`, "info");
    }
  };

  const dropStickyNoteInCenter = useCallback(() => {
    const c = fcRef.current;
    if (!c) return;
    const cp = c.getVpCenter();
    const L = live.current;
    const font = L.sketchy ? FONTS[0].family : L.font;
    const curPalette = NOTE_PALETTES.find((p) => p.id === L.noteColor) || NOTE_PALETTES[0];
    const n = new StickyNoteBox("📌 Sticky Note\n\nClick to write your concepts or formulas...", {
      left: cp.x - 120, top: cp.y - 90, width: 240,
      fontFamily: font, fontSize: 18, lineHeight: 1.35,
      fill: curPalette.text,
      backgroundColor: curPalette.bg,
      padding: 16,
      splitByGrapheme: true,
      selectable: true, evented: true,
    });
    n.minHeight = 180;
    n.noteColorId = curPalette.id;
    n.noteBorderColor = curPalette.border;
    (n as any).customData = { type: "note", colorId: curPalette.id };

    c.add(n);
    c.setActiveObject(n);
    n.enterEditing();
    c.requestRenderAll();
    pushHistory();
    setTool("select");
    showToast(`Added ${curPalette.name} sticky note`, "success");
  }, [showToast, pushHistory]);

  const getDescriptiveFilename = (extension: string, extra = ""): string => {
    const c = fcRef.current;
    let label = "StudyNotes";
    if (c) {
      const textObj = c.getObjects().find((o: any) => typeof o.text === "string" && o.text.trim().length > 0) as any;
      if (textObj && textObj.text) {
        const clean = textObj.text.replace(/[^\w\s-]/g, "").trim().slice(0, 30).replace(/\s+/g, "_");
        if (clean) label = clean;
      }
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const suffix = extra ? `_${extra}` : "";
    return `FlowTrack_Whiteboard_${label}${suffix}_${dateStr}.${extension}`;
  };

  /* --- Import / export ------------------------------------------------ */
  const downloadURL = async (href: string, name: string, revoke = false) => {
    if (href.startsWith("data:image/")) {
      const res = await saveImageSafely(href, name);
      if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 4000);
      if (res.success) {
        showToast(`💾 Saved: ${res.filename || name}`, "success");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = href; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 4000);
    showToast(`💾 Downloaded: ${name}`, "success");
  };

  const onImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const c = fcRef.current;
    if (!c) return;
    try {
      const url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const img = await fabric.FabricImage.fromURL(url);
      const maxW = c.getWidth() * 0.6;
      if ((img.width ?? 0) > maxW) img.scaleToWidth(maxW);
      const cp = c.getVpCenter();
      img.set({ left: cp.x - img.getScaledWidth() / 2, top: cp.y - img.getScaledHeight() / 2 });
      c.add(img);
      c.setActiveObject(img);
      c.requestRenderAll();
      setTool("select");
      showToast("Image added", "success");
    } catch {
      showToast("Image load nahi hui", "error");
    }
    if (imgFileRef.current) imgFileRef.current.value = "";
  };

  const onJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      JSON.parse(text);
      await loadJSON(text);
      pushHistory();
      showToast("Board imported", "success");
    } catch {
      showToast("Invalid board file", "error");
    }
    if (jsonFileRef.current) jsonFileRef.current.value = "";
  };

  const withBackground = <T,>(fn: () => T, transparent: boolean): T => {
    const c = fcRef.current!;
    const prev = c.backgroundColor;
    if (!transparent) c.backgroundColor = theme.page;
    const out = fn();
    c.backgroundColor = prev;
    c.requestRenderAll();
    return out;
  };

  const exportPNG = (multiplier: number, transparent = false) => {
    const c = fcRef.current;
    if (!c) return;
    setExportOpen(false);

    // Calculate content-aware bounding box of all objects to avoid giant empty voids
    const objects = c.getObjects();
    let cropOpts: Record<string, number> = {};

    if (objects.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      objects.forEach(obj => {
        const bound = obj.getBoundingRect();
        minX = Math.min(minX, bound.left);
        minY = Math.min(minY, bound.top);
        maxX = Math.max(maxX, bound.left + bound.width);
        maxY = Math.max(maxY, bound.top + bound.height);
      });

      if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
        const padding = 60;
        const left = Math.max(0, Math.floor(minX - padding));
        const top = Math.max(0, Math.floor(minY - padding));
        const width = Math.ceil((maxX - minX) + padding * 2);
        const height = Math.ceil((maxY - minY) + padding * 2);
        cropOpts = { left, top, width, height };
      }
    }

    const url = withBackground(
      () => c.toDataURL({ format: "png", quality: 1, multiplier, enableRetinaScaling: false, ...cropOpts }),
      transparent,
    );
    const filename = getDescriptiveFilename("png", multiplier > 1 ? `${multiplier}x` : "");
    downloadURL(url, filename);
  };

  const exportSVG = () => {
    const c = fcRef.current;
    if (!c) return;
    setExportOpen(false);
    const svg = withBackground(() => c.toSVG(), false);
    const filename = getDescriptiveFilename("svg");
    downloadURL(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), filename, true);
  };

  const exportJSON = () => {
    const c = fcRef.current;
    if (!c) return;
    setExportOpen(false);
    downloadURL(
      URL.createObjectURL(new Blob([JSON.stringify(c.toJSON())], { type: "application/json" })),
      getDescriptiveFilename("json"), true,
    );
    showToast("Board file exported", "success");
  };

  const exportNotesToStickyBoard = () => {
    const c = fcRef.current;
    if (!c) return;
    setExportOpen(false);
    
    // Find all textboxes and IText
    const objects = c.getObjects();
    const textObjects = objects.filter(o => o.type === "textbox" || o.type === "i-text" || o.type === "text") as (fabric.Textbox | fabric.IText)[];
    
    if (textObjects.length === 0) {
      showToast("No notes found on the whiteboard to save", "warning");
      return;
    }

    try {
      const existing = localStorage.getItem("workspace_sticky_notes");
      const currentNotes = existing ? JSON.parse(existing) : [];
      
      const newNotes = textObjects.map(tb => {
        const text = tb.text || "";
        const now = new Date();
        return {
          id: crypto.randomUUID(),
          title: "From Whiteboard",
          text: text.replace("📌 Sticky Note\\n", "").replace("📌 Sticky Note", "").trim(),
          color: "bg-yellow-500/15 border-yellow-400/35",
          textColor: "text-amber-200",
          font: "font-sans",
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          subject: "Whiteboard Extract",
          pinned: false
        };
      }).filter(n => n.text.length > 0);

      if (newNotes.length === 0) {
        showToast("No valid text found to save", "warning");
        return;
      }

      localStorage.setItem("workspace_sticky_notes", JSON.stringify([...newNotes, ...currentNotes]));
      showToast(`Successfully saved ${newNotes.length} note(s) to Sticky Board!`, "success");
    } catch (err) {
      console.error("Failed to save notes", err);
      showToast("Failed to save notes to Sticky Board", "warning");
    }
  };

  const clearBoard = () => {
    const c = fcRef.current;
    if (!c) return;
    setMenuOpen(false);
    if (!c.getObjects().length) { showToast("Board already empty", "info"); return; }
    if (!window.confirm("Poora board clear kar dein?")) return;
    suspendRef.current = true;
    c.remove(...c.getObjects());
    c.discardActiveObject();
    c.requestRenderAll();
    suspendRef.current = false;
    pushHistory();
    showToast("Board cleared", "info");
  };

  /* Escape closes fullscreen too */
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        if (onExitFullscreen) onExitFullscreen();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [fullscreen, onExitFullscreen]);

  /* ============================================================== UI == */

  const shell = fullscreen
    ? "fixed inset-0 z-[100] rounded-none h-full w-full"
    : "relative h-full w-full flex-1 rounded-2xl";

  const hint =
    tool === "select" ? "Drag to marquee-select · double-click for text"
    : tool === "lasso"  ? "Draw a loop around items to select them"
    : tool === "pan"    ? "Drag to move · Space also pans"
    : tool === "pen"    ? "Draw freely · scroll to zoom"
    : tool === "marker" ? "Semi-transparent highlighter"
    : tool === "laser"  ? "Hold & move — trail fades"
    : tool === "eraser" ? "Drag over strokes to erase"
    : isShape(tool)     ? "Drag to size · Shift = perfect ratio"
    : tool === "text"   ? "Click to start typing"
    : tool === "note"   ? "Click to drop a sticky note"
    : "";

  const showProps = hasSel || isShape(tool) || isDraw(tool) || tool === "text" || tool === "note";

  // Small helpers to keep JSX terse.
  const btnBase = "flex items-center justify-center rounded-xl transition-all";
  const iconBtn = "h-9 w-9 " + btnBase;
  const island = "pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl";
  const groupSep = (i: number) => (i === 2 || i === 7 || i === 12);

  return (
    <div
      className={`${shell} flex w-full flex-col overflow-hidden border border-white/10 shadow-2xl`}
      style={{ background: theme.page }}
    >
      <input ref={imgFileRef}  type="file" accept="image/*"        onChange={onImageFile} className="hidden" />
      <input ref={jsonFileRef} type="file" accept="application/json" onChange={onJSONFile}  className="hidden" />

      {/* Canvas host */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={hostRef} className="absolute inset-0" style={{ touchAction: "none" }}>
          <canvas ref={canvasElRef} />
        </div>

        {/* ============================================================
            TOP BAR — one flex row: menu | tools | history+export.
            Previously each cluster was absolutely positioned, so the
            centred toolbar slid underneath "Exit Fullscreen"/"Export"
            at any window narrower than ~1400px (the Mermaid and Markdown
            buttons became invisible). Flex guarantees no overlap: the
            toolbar shrinks and scrolls instead.
           ============================================================ */}
        <div ref={topBarRef} className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start gap-2 p-3">
        {/* LEFT: menu */}
        <div className="pointer-events-none order-1 flex shrink-0 gap-2">
          <div className={`${island} relative p-1`}>
            <button
              onClick={() => { setMenuOpen(v => !v); setExportOpen(false); }}
              className={`${iconBtn} text-slate-300 hover:bg-white/10 hover:text-white`}
              title="Menu"
              aria-label="Menu"
            >
              <Menu className="h-[17px] w-[17px]" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 w-64 space-y-3 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
                  <div className="space-y-1 pb-2 border-b border-white/10">
                    <button
                      onClick={() => navigate("/")}
                      className="flex w-full items-center gap-2 rounded-xl bg-purple-600/20 border border-purple-500/30 px-2.5 py-2 text-left text-[12px] font-bold text-purple-300 hover:bg-purple-600/30 hover:text-white transition-all"
                    >
                      <Home className="h-4 w-4 text-purple-400" />
                      <span>Return to Dashboard</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Theme</p>
                    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                      <Palette className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                      <select
                        value={themeId}
                        onChange={(e) => setThemeId(e.target.value)}
                        className="w-full cursor-pointer bg-transparent text-[11px] font-bold text-slate-200 focus:outline-none"
                      >
                        {THEMES.map((t) => (
                          <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setShowGrid(v => !v)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all ${
                        showGrid ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      <Grid3x3 className="h-3.5 w-3.5" /> Grid
                    </button>
                    <button
                      onClick={() => setSnap(v => !v)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all ${
                        snap ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      <Magnet className="h-3.5 w-3.5" /> Snap
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const next = !sketchy;
                      setSketchy(next);
                      showToast(next ? "✨ Hand-Drawn Sketchy Mode ON" : "Clean Mode ON", "info");
                    }}
                    className={`flex w-full items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                      sketchy ? "border-purple-400/60 bg-purple-500/20 text-purple-300" : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-purple-400" /> Sketchy Hand-Drawn Mode</span>
                    <span className={`text-[10px] font-black uppercase ${sketchy ? "text-purple-300" : "text-slate-500"}`}>{sketchy ? "ON" : "OFF"}</span>
                  </button>

                  <div className="h-px bg-white/10" />

                  <button
                    onClick={() => { jsonFileRef.current?.click(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <Upload className="h-3.5 w-3.5 text-cyan-300" /> Import board
                  </button>
                  <button
                    onClick={clearBoard}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-rose-300 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear board
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

{/* CONTEXTUAL SELECTION BAR — own full-width row (order-4) so it can never
            sit on top of the toolbar, whatever the window width. */}
        {hasSel && (
          <div className="pointer-events-none order-4 flex w-full justify-center">
            <div className={`${island} flex items-center gap-1.5 p-1 shadow-2xl border border-cyan-500/30 bg-slate-900/95 backdrop-blur-xl`}>
              <button
                onClick={bringFront}
                title="Bring to Front (Ctrl+])"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <BringToFront className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Front</span>
              </button>
              <button
                onClick={sendBack}
                title="Send to Back (Ctrl+[)"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <SendToBack className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="h-4 w-px bg-white/15" />
              <button
                onClick={duplicate}
                title="Duplicate (Ctrl+D)"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
              <button
                onClick={deleteSel}
                title="Delete (Del / Backspace)"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>

              {selIsNote && (
                <>
                  <div className="h-4 w-px bg-white/15" />
                  <div className="flex items-center gap-1 pl-1">
                    {NOTE_PALETTES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setNoteColorA(p.id)}
                        title={p.name}
                        style={{ backgroundColor: p.bg, borderColor: p.border }}
                        className={`h-5 w-5 rounded-full border transition-all hover:scale-110 ${
                          noteColor === p.id ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900" : ""
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CENTER: tools — wraps onto extra rows on narrow windows so every
            button stays reachable instead of scrolling out of sight. */}
        <div className="pointer-events-none order-2 flex min-w-0 flex-1 justify-center">
          <div className={`${island} flex w-fit max-w-full flex-wrap items-center justify-center gap-0.5 p-1`}>
            {TOOLS.map(({ id, icon: Icon, label, key, accent }, i) => {
              const active = tool === id;
              return (
                <button
                  key={id}
                  onClick={() => setTool(id)}
                  title={`${label} · ${key}`}
                  aria-pressed={active}
                  aria-label={label}
                  className={`${iconBtn} relative shrink-0 ${groupSep(i) ? "ml-1" : ""} ${
                    active ? `${accent} scale-[1.06] shadow-lg` : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
                  {active && (
                    <span className="pointer-events-none absolute -bottom-0.5 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full bg-current opacity-70" />
                  )}
                </button>
              );
            })}
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button
              onClick={() => {
                const next = !sketchy;
                setSketchy(next);
                showToast(next ? "✨ Hand-Drawn Sketchy Mode ON" : "Clean Mode ON", "info");
              }}
              title={sketchy ? "Hand-drawn sketchy mode ON" : "Turn ON hand-drawn sketchy mode"}
              className={`${iconBtn} ${sketchy ? "bg-purple-500 text-white shadow-lg ring-2 ring-purple-400/50" : "text-slate-400 hover:bg-white/10 hover:text-purple-300"}`}
            >
              <Sparkles className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={() => setMermaidModalOpen(true)}
              title="Mermaid Diagrams & AI Generator"
              className={`${iconBtn} text-slate-400 hover:bg-white/10 hover:text-cyan-300`}
            >
              <GitFork className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={() => setMarkdownModalOpen(true)}
              title="Markdown Study Notes & AI Generator"
              className={`${iconBtn} text-slate-400 hover:bg-white/10 hover:text-purple-300`}
            >
              <FileText className="h-[17px] w-[17px]" />
            </button>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button
              onClick={() => { setTemplatesOpen(true); setLayersOpen(false); }}
              title="Templates — mind map, kanban, flow, SWOT, Cornell, timeline"
              className={`${iconBtn} shrink-0 ${templatesOpen ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-white/10 hover:text-indigo-300"}`}
            >
              <LayoutTemplate className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={() => {
                setLayersOpen((v) => {
                  const next = !v;
                  layersOpenRef.current = next;
                  if (next) setLayersTick((t) => (t + 1) % 100000);
                  return next;
                });
                setTemplatesOpen(false);
              }}
              title="Layers panel"
              className={`${iconBtn} shrink-0 ${layersOpen ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:bg-white/10 hover:text-cyan-300"}`}
            >
              <Layers className="h-[17px] w-[17px]" />
            </button>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button
              onClick={groupSelection}
              disabled={!isMultiSel}
              title="Group selection (Ctrl+G)"
              className={`${iconBtn} shrink-0 ${isMultiSel ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-600"}`}
            >
              <GroupIcon className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={ungroupSelection}
              title="Ungroup selection (Ctrl+Shift+G)"
              className={`${iconBtn} shrink-0 text-slate-400 hover:bg-white/10 hover:text-white`}
            >
              <UngroupIcon className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={lockSelection}
              disabled={!hasSel}
              title="Lock / unlock selection (Ctrl+L)"
              className={`${iconBtn} shrink-0 ${hasSel ? "text-slate-400 hover:bg-white/10 hover:text-amber-300" : "text-slate-600"}`}
            >
              <Lock className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={() => imgFileRef.current?.click()}
              title="Insert image"
              className={`${iconBtn} text-slate-400 hover:bg-white/10 hover:text-emerald-300`}
            >
              <ImagePlus className="h-[17px] w-[17px]" />
            </button>
            <button
              onClick={() => setLocked(v => !v)}
              title={locked ? "Tool stays active after use" : "Switch to Select after use"}
              className={`${iconBtn} ${locked ? "bg-white/15 text-white" : "text-slate-500 hover:bg-white/10 hover:text-white"}`}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* RIGHT: history / fullscreen / export */}
        <div className="pointer-events-none order-3 flex shrink-0 flex-wrap justify-end gap-2">
          <div className={`${island} flex items-center gap-0.5 p-1`}>
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`${iconBtn} ${canUndo ? "text-slate-300 hover:bg-white/10 hover:text-white" : "cursor-not-allowed text-slate-700"}`}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className={`${iconBtn} ${canRedo ? "text-slate-300 hover:bg-white/10 hover:text-white" : "cursor-not-allowed text-slate-700"}`}
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <div className={`${island} flex items-center gap-0.5 p-1`}>
            <button
              onClick={() => setHelpOpen(true)}
              title="Shortcuts"
              className={`${iconBtn} text-slate-300 hover:bg-white/10 hover:text-white`}
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (onExitFullscreen && fullscreen) {
                  onExitFullscreen();
                  setFullscreen(false);
                } else if (onExitFullscreen) {
                  onExitFullscreen();
                } else {
                  setFullscreen(v => !v);
                }
              }}
              title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
              className={`${iconBtn} text-slate-300 hover:bg-white/10 hover:text-white`}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          {fullscreen && (
            <div className={`${island} p-1`}>
              <button
                onClick={() => {
                  if (onExitFullscreen) onExitFullscreen();
                  else if (onToggleFullscreen) onToggleFullscreen();
                  else setFullscreen(false);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg transition-all hover:bg-purple-500 border border-purple-400/40"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
                <kbd className="rounded bg-purple-800/80 px-1 py-0.5 text-[10px] font-mono">Esc</kbd>
              </button>
            </div>
          )}

          <div className={`${island} relative p-1`}>
            <button
              onClick={() => { setExportOpen(v => !v); setMenuOpen(false); }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 shadow-lg transition-all hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl">
                  {[
                    { label: "PNG · 1× (screen)",    icon: FileImage, fn: () => exportPNG(1) },
                    { label: "PNG · 2× (retina)",    icon: FileImage, fn: () => exportPNG(2) },
                    { label: "PNG · 4× (ultra HD)",  icon: FileImage, fn: () => exportPNG(4) },
                    { label: "PNG · transparent",    icon: FileImage, fn: () => exportPNG(2, true) },
                    { label: "SVG (vector)",         icon: FileCode2, fn: exportSVG },
                    { label: "Board file (.json)",   icon: FileJson,  fn: exportJSON },
                    { label: "Save Notes to Sticky Board", icon: StickyNote, fn: exportNotesToStickyBoard },
                  ].map(({ label, icon: I, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <I className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        </div>{/* /TOP BAR */}

        {/* LEFT: properties (contextual) — starts below the bar; pushed further
            down when the selection row is visible so the two never collide. */}
        {showProps && (
          <div
            className="pointer-events-none absolute bottom-16 left-3 z-20 flex items-start transition-[top] duration-150"
            style={{ top: barH }}
          >
            <div className={`${island} scrollbar-none w-[214px] max-h-full space-y-3 overflow-y-auto p-3`}>
              {(tool === "note" || selIsNote) ? (
                <>
                  <PanelSection label="Sticky Note Colors">
                    <div className="grid grid-cols-4 gap-1.5">
                      {NOTE_PALETTES.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setNoteColorA(p.id)}
                          title={p.name}
                          style={{ background: p.bg }}
                          className={`flex h-8 w-full flex-col items-center justify-center rounded-lg border text-[10px] font-bold shadow-sm transition-all ${
                            noteColor === p.id
                              ? "border-slate-900 ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 scale-105 shadow-md"
                              : "border-black/20 hover:scale-105"
                          }`}
                        >
                          <span style={{ color: p.text }} className="text-xs">Aa</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium text-center pt-0.5">
                      {NOTE_PALETTES.find((p) => p.id === noteColor)?.name}
                    </p>
                  </PanelSection>

                  <PanelSection label="Note Card Size">
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => setNoteSizePreset(180, 140)}
                        className="flex h-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        Small
                      </button>
                      <button
                        onClick={() => setNoteSizePreset(240, 180)}
                        className="flex h-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        Medium
                      </button>
                      <button
                        onClick={() => setNoteSizePreset(320, 240)}
                        className="flex h-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        Large
                      </button>
                    </div>
                  </PanelSection>

                  <div className="pt-1">
                    <button
                      onClick={dropStickyNoteInCenter}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-2.5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      <span>+ Drop Note on Canvas</span>
                    </button>
                  </div>

                  <PanelSection label="Font">
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontA(e.target.value)}
                      className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-slate-200 focus:outline-none"
                    >
                      {FONTS.map((f) => (
                        <option key={f.name} value={f.family} className="bg-slate-900">{f.name}</option>
                      ))}
                    </select>
                  </PanelSection>

                  <PanelSection label={`Font Size · ${fontSize}`}>
                    <div className="flex gap-1.5">
                      {[16, 20, 24, 32].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSizeA(s)}
                          className={`h-7 flex-1 rounded-lg border text-[11px] font-bold transition-all ${
                            fontSize === s ? "border-cyan-400 bg-cyan-500/20 text-white" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          {s === 16 ? "S" : s === 20 ? "M" : s === 24 ? "L" : "XL"}
                        </button>
                      ))}
                    </div>
                  </PanelSection>

                  <PanelSection label={`Opacity · ${Math.round(opacity * 100)}%`}>
                    <input
                      type="range" min={20} max={100} value={Math.round(opacity * 100)}
                      onChange={(e) => setOpacityA(Number(e.target.value) / 100)}
                      className="h-1 w-full cursor-pointer accent-cyan-400"
                    />
                  </PanelSection>
                </>
              ) : (
                <>
                  <PanelSection label={isDraw(tool) ? "Pen Color" : "Stroke Color"}>
                    <div className="grid grid-cols-5 gap-1.5">
                      {STROKES.map((clr) => (
                        <button
                          key={clr}
                          onClick={() => setStrokeA(clr)}
                          title={clr}
                          style={{ background: clr }}
                          className={`h-6 w-full rounded-md border transition-all ${
                            stroke === clr ? "border-white ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950" : "border-white/20 hover:scale-105"
                          }`}
                        />
                      ))}
                    </div>
                    <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-300">
                      <input
                        type="color"
                        value={isHex6(stroke) ? stroke : "#ffffff"}
                        onChange={(e) => setStrokeA(e.target.value)}
                        className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      Custom Color
                    </label>
                  </PanelSection>

                  {(hasSel || isShape(tool)) && (
                    <>
                      <PanelSection label="Fill">
                        <div className="grid grid-cols-5 gap-1.5">
                          {FILLS.map((clr) => (
                            <button
                              key={clr}
                              onClick={() => setFillA(clr)}
                              title={clr === "transparent" ? "No fill" : clr}
                              style={clr === "transparent" ? undefined : { background: clr }}
                              className={`flex h-6 w-full items-center justify-center rounded-md border transition-all ${
                                fill === clr ? "border-white ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950" : "border-white/20 hover:scale-105"
                              } ${clr === "transparent" ? "bg-slate-800" : ""}`}
                            >
                              {clr === "transparent" && <Ban className="h-3 w-3 text-slate-500" />}
                            </button>
                          ))}
                        </div>
                      </PanelSection>

                      {fill !== "transparent" && (
                        <PanelSection label="Fill Style">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => setFillStyle("solid")}
                              className={`h-7 rounded-lg border text-[11px] font-bold transition-all ${
                                fillStyle === "solid"
                                  ? "border-cyan-400 bg-cyan-500/20 text-white"
                                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                              }`}
                            >
                              Solid
                            </button>
                            <button
                              onClick={() => setFillStyle("hachure")}
                              className={`h-7 rounded-lg border text-[11px] font-bold transition-all ${
                                fillStyle === "hachure"
                                  ? "border-cyan-400 bg-cyan-500/20 text-white"
                                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                              }`}
                              title="Excalidraw Diagonal Cross-Hatch Pattern"
                            >
                              Hachure
                            </button>
                          </div>
                        </PanelSection>
                      )}

                      <PanelSection label="Sloppiness (Excalidraw)">
                        <div className="grid grid-cols-3 gap-1">
                          {(["architect", "artist", "cartoonist"] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => {
                                setSketchy(true);
                                setSloppiness(mode);
                              }}
                              className={`h-7 rounded-lg border text-[10px] font-bold capitalize transition-all ${
                                sketchy && sloppiness === mode
                                  ? "border-cyan-400 bg-cyan-500/20 text-white"
                                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                              }`}
                              title={
                                mode === "architect" ? "Clean Architect Single-Pass" :
                                mode === "artist" ? "Organic Artist Double-Pass (Default)" :
                                "Expressive Cartoonist"
                              }
                            >
                              {mode === "architect" ? "Arch" : mode === "artist" ? "Artist" : "Cartoon"}
                            </button>
                          ))}
                        </div>
                      </PanelSection>
                    </>
                  )}

                  <PanelSection label={`${isDraw(tool) ? "Pen Size" : "Width"} · ${strokeWidth}px`}>
                    <div className="flex gap-1.5">
                      {[2, 4, 8, 14].map((w) => (
                        <button
                          key={w}
                          onClick={() => setWidthA(w)}
                          className={`flex h-7 flex-1 items-center justify-center rounded-lg border transition-all ${
                            strokeWidth === w ? "border-cyan-400 bg-cyan-500/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <span className="block w-4 rounded-full bg-slate-200" style={{ height: Math.min(w, 8) }} />
                        </button>
                      ))}
                    </div>
                    <input
                      type="range" min={1} max={40} value={strokeWidth}
                      onChange={(e) => setWidthA(Number(e.target.value))}
                      className="mt-1 h-1 w-full cursor-pointer accent-cyan-400"
                    />
                  </PanelSection>

                  {!isDraw(tool) && (
                    <PanelSection label="Style">
                      <div className="flex gap-1.5">
                        {Object.keys(DASHES).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStyleA(s)}
                            title={s}
                            className={`flex h-7 flex-1 items-center justify-center rounded-lg border transition-all ${
                              strokeStyle === s ? "border-cyan-400 bg-cyan-500/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <svg width="22" height="6" viewBox="0 0 22 6">
                              <line
                                x1="1" y1="3" x2="21" y2="3"
                                stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"
                                strokeDasharray={s === "dashed" ? "5 4" : s === "dotted" ? "0.5 4" : undefined}
                              />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </PanelSection>
                  )}

                  {(selIsText || tool === "text") && (
                    <>
                      <PanelSection label="Font">
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontA(e.target.value)}
                          className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-slate-200 focus:outline-none"
                        >
                          {FONTS.map((f) => (
                            <option key={f.name} value={f.family} className="bg-slate-900">{f.name}</option>
                          ))}
                        </select>
                      </PanelSection>
                      <PanelSection label={`Size · ${fontSize}`}>
                        <div className="flex gap-1.5">
                          {[16, 24, 36, 56].map((s) => (
                            <button
                              key={s}
                              onClick={() => setSizeA(s)}
                              className={`h-7 flex-1 rounded-lg border text-[11px] font-bold transition-all ${
                                fontSize === s ? "border-cyan-400 bg-cyan-500/20 text-white" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                              }`}
                            >
                              {s === 16 ? "S" : s === 24 ? "M" : s === 36 ? "L" : "XL"}
                            </button>
                          ))}
                        </div>
                      </PanelSection>
                    </>
                  )}

                  <PanelSection label={`Opacity · ${Math.round(opacity * 100)}%`}>
                    <input
                      type="range" min={10} max={100} value={Math.round(opacity * 100)}
                      onChange={(e) => setOpacityA(Number(e.target.value) / 100)}
                      className="h-1 w-full cursor-pointer accent-cyan-400"
                    />
                  </PanelSection>
                </>
              )}

              {isMultiSel && (
                <PanelSection label="Align & Distribute">
                  <div className="grid grid-cols-3 gap-1">
                    <IconAction onClick={() => alignSelection("left")} title="Align Left">
                      <AlignLeft className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction onClick={() => alignSelection("center")} title="Align Center">
                      <AlignCenter className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction onClick={() => alignSelection("right")} title="Align Right">
                      <AlignRight className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction onClick={() => alignSelection("top")} title="Align Top">
                      <span className="text-[10px] font-bold">Top</span>
                    </IconAction>
                    <IconAction onClick={() => alignSelection("middle")} title="Align Middle">
                      <span className="text-[10px] font-bold">Mid</span>
                    </IconAction>
                    <IconAction onClick={() => alignSelection("bottom")} title="Align Bottom">
                      <span className="text-[10px] font-bold">Bot</span>
                    </IconAction>
                  </div>
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    <IconAction onClick={() => distributeSelection("horizontal")} title="Distribute Horizontally">
                      <span className="text-[10px] font-bold">↔ Dist H</span>
                    </IconAction>
                    <IconAction onClick={() => distributeSelection("vertical")} title="Distribute Vertically">
                      <span className="text-[10px] font-bold">↕ Dist V</span>
                    </IconAction>
                  </div>
                </PanelSection>
              )}

              {hasSel && (
                <PanelSection label="Selection">
                  <div className="grid grid-cols-4 gap-1.5">
                    <IconAction onClick={bringFront} title="Bring to front"><BringToFront className="h-3.5 w-3.5" /></IconAction>
                    <IconAction onClick={sendBack}   title="Send to back"><SendToBack   className="h-3.5 w-3.5" /></IconAction>
                    <IconAction onClick={duplicate}  title="Duplicate (Ctrl+D)"><Copy    className="h-3.5 w-3.5" /></IconAction>
                    <IconAction onClick={deleteSel}  title="Delete (Del)" danger><Trash2 className="h-3.5 w-3.5" /></IconAction>
                  </div>
                </PanelSection>
              )}
            </div>
          </div>
        )}

        {/* ============================================ RIGHT: Layers panel */}
        {layersOpen && (
          <div className="pointer-events-none absolute bottom-16 right-3 z-20 flex w-[250px] items-start" style={{ top: barH }}>
            <div className={`${island} flex max-h-full w-full flex-col overflow-hidden`}>
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  <Layers className="h-3.5 w-3.5" /> Layers
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={unlockAll}
                    title="Unlock everything"
                    className="rounded-md px-1.5 py-1 text-[10px] font-semibold text-slate-400 hover:bg-white/10 hover:text-amber-300"
                  >
                    Unlock all
                  </button>
                  <button
                    onClick={() => { setLayersOpen(false); layersOpenRef.current = false; }}
                    className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                    title="Close layers"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-1.5">
                {layerRows.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[11px] text-slate-500">
                    Board is empty — draw something and it will appear here.
                  </p>
                ) : (
                  layerRows.map((row) => (
                    <div
                      key={row.index}
                      className={`group flex items-center gap-1 rounded-lg px-1.5 py-1 ${
                        row.active ? "bg-cyan-500/15 ring-1 ring-cyan-500/40" : "hover:bg-white/5"
                      }`}
                    >
                      <button
                        onClick={() => selectLayer(row.index)}
                        className={`min-w-0 flex-1 truncate text-left text-[11px] ${
                          row.locked ? "text-slate-500" : "text-slate-200"
                        }`}
                        title={row.label}
                      >
                        {row.label}
                      </button>
                      <button
                        onClick={() => moveLayer(row.index, 1)}
                        title="Move up (forward)"
                        className="rounded p-0.5 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white"
                      >
                        <ChevronsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveLayer(row.index, -1)}
                        title="Move down (backward)"
                        className="rounded p-0.5 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white"
                      >
                        <ChevronsDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleLayerVisible(row.index)}
                        title={row.hidden ? "Show" : "Hide"}
                        className={`rounded p-0.5 hover:bg-white/10 ${row.hidden ? "text-slate-600" : "text-slate-400 hover:text-white"}`}
                      >
                        {row.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => toggleLayerLock(row.index)}
                        title={row.locked ? "Unlock" : "Lock"}
                        className={`rounded p-0.5 hover:bg-white/10 ${row.locked ? "text-amber-300" : "text-slate-400 hover:text-amber-300"}`}
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteLayer(row.index)}
                        title="Delete"
                        className="rounded p-0.5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="shrink-0 border-t border-white/10 px-3 py-1.5 text-[10px] text-slate-500">
                {layerRows.length} object{layerRows.length === 1 ? "" : "s"} · top of list = front
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center">
          <div className={`${island} flex items-center gap-1.5 px-3 py-1.5 shadow-xl`}>
            <button
              onClick={() => switchSlide(Math.max(0, activeSlideIdx - 1))}
              disabled={activeSlideIdx === 0}
              title="Previous Slide"
              className={`${iconBtn} h-7 w-7 ${activeSlideIdx === 0 ? "opacity-30 cursor-not-allowed" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 px-1 text-[12px] font-semibold text-slate-200">
              <span className="text-cyan-400 font-bold">Slide {activeSlideIdx + 1}</span>
              <span className="text-slate-500">/</span>
              <span>{slides.length}</span>
            </div>
            <button
              onClick={() => switchSlide(Math.min(slides.length - 1, activeSlideIdx + 1))}
              disabled={activeSlideIdx >= slides.length - 1}
              title="Next Slide"
              className={`${iconBtn} h-7 w-7 ${activeSlideIdx >= slides.length - 1 ? "opacity-30 cursor-not-allowed" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="mx-1 h-4 w-px bg-white/15" />
            <button
              onClick={addNewSlide}
              title="Add New Slide / Page"
              className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Slide</span>
            </button>
            {slides.length > 1 && (
              <button
                onClick={deleteCurrentSlide}
                title="Delete Current Slide"
                className="flex items-center rounded-lg border border-rose-500/20 bg-rose-500/10 p-1 text-rose-300 hover:bg-rose-500/20 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ============================================ BOTTOM-LEFT: zoom = */}
        <div className={`${island} absolute bottom-3 left-3 z-20 flex items-center gap-0.5 p-1`}>
          <button onClick={() => zoomBy(1 / 1.2)} title="Zoom out" className={`${iconBtn} h-8 w-8 text-slate-300 hover:bg-white/10 hover:text-white`}>
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={resetView} title="Reset (Ctrl+0)" className="min-w-[52px] rounded-lg px-1 py-1 font-mono text-[11px] font-bold text-white hover:bg-white/10">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => zoomBy(1.2)} title="Zoom in" className={`${iconBtn} h-8 w-8 text-slate-300 hover:bg-white/10 hover:text-white`}>
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="mx-0.5 h-4 w-px bg-white/15" />
          <button onClick={fitView} title="Zoom to fit (Ctrl+1)" className={`${iconBtn} h-8 w-8 text-slate-300 hover:bg-white/10 hover:text-white`}>
            <Scan className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ============================================ BOTTOM-RIGHT: hint */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 hidden rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] font-medium text-slate-400 backdrop-blur-xl md:block">
          {hint}
        </div>

        {/* ============================================ BOTTOM-RIGHT: hint */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 hidden rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] font-medium text-slate-400 backdrop-blur-xl md:block">
          {hint}
        </div>

        {/* ============================================ Templates gallery (Miro-style) */}
        {templatesOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
            onClick={() => setTemplatesOpen(false)}
          >
            <div
              className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/40 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/20 text-indigo-300">
                    <LayoutTemplate className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Templates</h3>
                    <p className="text-[11px] text-slate-400">Drop a ready-made board layout, then edit anything on it</p>
                  </div>
                </div>
                <button
                  onClick={() => setTemplatesOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    { id: "mindmap",  name: "Mind map",        desc: "Central idea + 4 branches",      icon: GitFork,        tint: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-300" },
                    { id: "kanban",   name: "Kanban board",    desc: "To do · In progress · Done",     icon: Layers,         tint: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-300" },
                    { id: "flow",     name: "Flowchart",       desc: "Start → process → decision → done", icon: GitFork,     tint: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300" },
                    { id: "swot",     name: "SWOT analysis",   desc: "Strengths, weaknesses, opportunities, threats", icon: LayoutTemplate, tint: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300" },
                    { id: "cornell",  name: "Cornell notes",   desc: "Cues · notes · summary layout",  icon: FileText,       tint: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-300" },
                    { id: "timeline", name: "Timeline",        desc: "5 milestones on a horizontal line", icon: Scan,        tint: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-300" },
                  ].map((tpl) => {
                    const TplIcon = tpl.icon;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl.id)}
                        className={`group flex flex-col items-start gap-2 rounded-xl border bg-gradient-to-br p-3 text-left transition hover:scale-[1.02] hover:shadow-lg ${tpl.tint}`}
                      >
                        <TplIcon className="h-5 w-5" />
                        <span className="text-xs font-bold text-white">{tpl.name}</span>
                        <span className="text-[11px] leading-snug text-slate-400">{tpl.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-[11px] text-slate-500">
                  Templates are inserted at the centre of your current view and can be moved, restyled or deleted like any other object.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ Mermaid Diagram Studio Modal */}
        {mermaidModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
            onClick={() => setMermaidModalOpen(false)}
          >
            <div
              className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <GitFork className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mermaid Diagram Studio</h3>
                    <p className="text-[11px] text-slate-400">Insert code-rendered architectures, flowcharts & sequence diagrams</p>
                  </div>
                </div>
                <button
                  onClick={() => setMermaidModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* AI Diagram Prompt */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Diagram Generator
                    </span>
                    <span className="text-[10px] text-slate-400">Describe flow, system, or sequence</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mermaidAiPrompt}
                      onChange={(e) => setMermaidAiPrompt(e.target.value)}
                      placeholder="e.g. Microservices event bus architecture with Kafka and Redis..."
                      onKeyDown={(e) => e.key === "Enter" && handleGenerateAiDiagram()}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      onClick={handleGenerateAiDiagram}
                      disabled={isGeneratingDiagram}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                    >
                      {isGeneratingDiagram ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Generate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Templates & Presets</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MERMAID_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setMermaidCode(p.code)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor & Preview Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Mermaid Syntax
                    </label>
                    <textarea
                      value={mermaidCode}
                      onChange={(e) => setMermaidCode(e.target.value)}
                      rows={12}
                      className="w-full h-[240px] font-mono text-xs rounded-xl border border-white/10 bg-slate-950/80 p-3 text-slate-200 focus:border-cyan-500 focus:outline-none resize-none"
                      spellCheck={false}
                    />
                    {mermaidError && (
                      <p className="mt-1 text-[11px] text-rose-400">{mermaidError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Live Preview
                    </label>
                    {/* Fixed viewport; the SVG is forced to fit. Mermaid emits
                        width="100%" with no height, so overriding width with
                        w-auto collapsed it to 0x0 — never do that. */}
                    <div className="flex h-[240px] items-center justify-center overflow-auto rounded-xl border border-white/10 bg-slate-950/40 p-3">
                      {mermaidPreviewSvg ? (
                        <div
                          className="w-full [&>svg]:h-[208px] [&>svg]:w-full"
                          dangerouslySetInnerHTML={{ __html: mermaidPreviewSvg }}
                        />
                      ) : (
                        <div className="text-center text-xs text-slate-500">
                          {mermaidError ? "Syntax error in diagram" : "Loading preview..."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-5 py-3 bg-slate-950/40">
                <button
                  onClick={() => setMermaidModalOpen(false)}
                  className="rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={insertMermaidDiagram}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:bg-cyan-400"
                >
                  <Check className="h-3.5 w-3.5" />
                  Insert onto Whiteboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ Markdown Study Card Modal */}
        {markdownModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
            onClick={() => setMarkdownModalOpen(false)}
          >
            <div
              className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Markdown Study Card</h3>
                    <p className="text-[11px] text-slate-400">Generate or draft structured revision notes to pin onto canvas</p>
                  </div>
                </div>
                <button
                  onClick={() => setMarkdownModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* AI Study Notes prompt */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-purple-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Study Note Generator
                    </span>
                    <span className="text-[10px] text-slate-400">Enter any exam concept or topic</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={markdownAiPrompt}
                      onChange={(e) => setMarkdownAiPrompt(e.target.value)}
                      placeholder="e.g. Java Concurrency & Thread Synchronization fundamentals..."
                      onKeyDown={(e) => e.key === "Enter" && handleGenerateAiMarkdown()}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={handleGenerateAiMarkdown}
                      disabled={isGeneratingMarkdown}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50"
                    >
                      {isGeneratingMarkdown ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Drafting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Generate Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Card Title</label>
                    <input
                      type="text"
                      value={markdownTitle}
                      onChange={(e) => setMarkdownTitle(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none mb-3"
                    />

                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Accent Color</label>
                    <div className="flex gap-2 mb-3">
                      {["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setMarkdownAccent(c)}
                          style={{ backgroundColor: c }}
                          className={`h-6 w-6 rounded-full border transition-all ${
                            markdownAccent === c ? "ring-2 ring-white scale-110" : "border-transparent opacity-80 hover:opacity-100"
                          }`}
                        />
                      ))}
                    </div>

                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Markdown Content</label>
                    <textarea
                      value={markdownContent}
                      onChange={(e) => setMarkdownContent(e.target.value)}
                      rows={8}
                      className="w-full font-mono text-xs rounded-xl border border-white/10 bg-slate-950/80 p-3 text-slate-200 focus:border-purple-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Visual Preview</label>
                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4 h-[300px] overflow-y-auto">
                      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: markdownAccent }} />
                        <h4 className="text-xs font-bold text-white">{markdownTitle || "Untitled Card"}</h4>
                      </div>
                      {/* Real Markdown rendering (headings, lists, code, tables,
                          math, mermaid) instead of raw pre-wrapped text. */}
                      {markdownContent.trim() ? (
                        <div className="text-[11px]">
                          <MarkdownRenderer content={markdownContent} />
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">Nothing to preview yet — start typing Markdown on the left.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-5 py-3 bg-slate-950/40">
                <button
                  onClick={() => setMarkdownModalOpen(false)}
                  className="rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={insertMarkdownCard}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-purple-400"
                >
                  <Check className="h-3.5 w-3.5" />
                  Insert onto Whiteboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ Shortcuts overlay */}
        {helpOpen && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm"
            onClick={() => setHelpOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white">Keyboard shortcuts</h3>
                <button onClick={() => setHelpOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
                {SHORTCUTS.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-white/5 py-1">
                    <span className="text-slate-400">{v}</span>
                    <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-200">{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tiny inline UI helpers                                                    */
/* -------------------------------------------------------------------------- */

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function IconAction({
  onClick, title, danger, children,
}: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 items-center justify-center rounded-lg border transition-all ${
        danger
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
