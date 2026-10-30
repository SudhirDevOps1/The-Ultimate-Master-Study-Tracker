import { db } from "@/lib/db";
import type { OcrEntry } from "@/types/models";

const OCR_ENABLED_KEY = "flowtrack_ocr_enabled";

/**
 * Checks whether the user has explicitly opted into local OCR indexing (Rule S4).
 * Default is FALSE for privacy.
 */
export function isOcrEnabled(): boolean {
  try {
    return localStorage.getItem(OCR_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setOcrEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(OCR_ENABLED_KEY, String(enabled));
  } catch {}
}

/**
 * Redacts potential sensitive secrets (API keys, passwords, bearer tokens)
 * before storing into local OCR search index.
 */
export function sanitizeOcrText(text: string): string {
  if (!text) return "";
  let clean = text;
  // Redact bearer tokens and keys
  clean = clean.replace(/(?:bearer|token|key|secret|password|passwd)\s*(?:[:=]|\bis\b)\s*[^\s,;]+/gi, "[REDACTED_SECRET]");
  // Redact long high-entropy alphanumeric strings like auth tokens
  clean = clean.replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[REDACTED_HASH]");
  return clean.trim();
}

/**
 * Cleans raw OCR or extracted PDF text by removing hyphenation wraps,
 * collapsing redundant whitespace, and normalizing line endings.
 */
export function cleanExtractedText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Fix hyphenated line breaks (e.g. "micro-\nprocessor" -> "microprocessor")
  clean = clean.replace(/(\b[A-Za-z]+)-\n\s*([A-Za-z]+\b)/g, "$1$2");
  // Normalize multiple spaces into single space per line
  clean = clean.split("\n").map(line => line.replace(/[ \t]+/g, " ").trim()).join("\n");
  // Collapse more than 2 consecutive newlines into 2
  clean = clean.replace(/\n{3,}/g, "\n\n");
  return clean.trim();
}

/**
 * Preprocesses an HTML5 Canvas to boost Tesseract.js OCR accuracy
 * by applying luminosity grayscale, contrast boost, and binarization threshold.
 */
export function preprocessCanvasForOcr(
  canvas: HTMLCanvasElement,
  contrastVal = 45,
  thresholdVal = 145
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);
  try {
    const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imgData.data;
    const factor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      let contrasted = factor * (gray - 128) + 128;
      contrasted = Math.max(0, Math.min(255, contrasted));
      const binarized = contrasted < thresholdVal ? 0 : 255;
      data[i] = binarized;
      data[i + 1] = binarized;
      data[i + 2] = binarized;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Return original canvas if security policy or taint blocks getImageData
  }
  return offscreen;
}

/**
 * Records an extracted OCR timeline text segment into local Dexie.
 * Raw screenshot image buffer is NEVER saved to disk (Rule S4).
 */
export async function recordOcrEntry(rawText: string, appName: string, confidence = 0.9): Promise<OcrEntry | null> {
  if (!isOcrEnabled()) return null;

  const sanitized = sanitizeOcrText(rawText);
  if (!sanitized || sanitized.length < 3) return null;

  const entry: OcrEntry = {
    id: "ocr-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    appName: appName || "Desktop",
    extractedText: sanitized,
    confidence,
  };

  try {
    await db.ocrEntries.add(entry);
    return entry;
  } catch (err) {
    console.warn("[OcrEngine] Failed to save OCR entry:", err);
    return null;
  }
}

/**
 * Searches the local OCR timeline for text matches.
 */
export async function searchOcrTimeline(query: string, limit = 50): Promise<OcrEntry[]> {
  if (!query || !query.trim()) {
    return db.ocrEntries.orderBy("timestamp").reverse().limit(limit).toArray();
  }

  const cleanQuery = query.toLowerCase().trim();
  const all = await db.ocrEntries.orderBy("timestamp").reverse().limit(limit * 3).toArray();
  return all
    .filter(e => e.extractedText.toLowerCase().includes(cleanQuery) || e.appName.toLowerCase().includes(cleanQuery))
    .slice(0, limit);
}
