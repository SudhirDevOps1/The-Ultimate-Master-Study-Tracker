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
  clean = clean.replace(/(?:bearer|token|key|secret|password|passwd)\s*[:=]\s*[^\s,;]+/gi, "[REDACTED_SECRET]");
  // Redact long high-entropy alphanumeric strings like auth tokens
  clean = clean.replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[REDACTED_HASH]");
  return clean.trim();
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
