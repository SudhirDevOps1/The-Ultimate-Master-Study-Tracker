/**
 * trackerMath.ts
 * Pure, deterministic mathematical and algorithmic primitives for activity tracking.
 * Used for stable identity, zero-truncation merging, AFK/sleep boundary calculation.
 */

export interface ActivityEntry {
  id?: string;
  appName: string;
  rawProcess?: string;
  title: string;
  durationSeconds: number;
  activeSeconds?: number;
  afkSeconds?: number;
  startTime: string;
  date?: string;
  hour?: number;
  minute?: number;
  isAfk?: boolean;
  idleSeconds?: number;
  isLive?: boolean;
}

export interface SplitSegmentOptions {
  startMs: number;
  endMs: number;
  lastPollMs: number;
  idleSec: number;
  afkThresholdSec: number;
  pollIntervalMs?: number;
}

export interface SplitSegmentResult {
  activeSeconds: number;
  afkSeconds: number;
  totalSeconds: number;
  endedAtMs: number;
  isGap: boolean;
}

/**
 * Deterministic 8-character hex hash based on 32-bit FNV-1a.
 * Fast, pure, and dependency-free.
 */
export function hash8(str: string): string {
  let h = 0x811c9dc5;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Generates a stable deterministic ID for an activity entry:
 * ${startTime}|${rawProcess}|${hash8(title)}
 */
export function generateEntryId(startTime: string, rawProcess: string, title: string): string {
  return `${startTime}|${rawProcess || "unknown"}|${hash8(title || "")}`;
}

/**
 * Ensures an entry has a valid, deterministic ID.
 */
export function ensureEntryId(entry: ActivityEntry): ActivityEntry & { id: string } {
  if (entry.id && typeof entry.id === "string" && entry.id.trim().length > 0) {
    return entry as ActivityEntry & { id: string };
  }
  return {
    ...entry,
    id: generateEntryId(entry.startTime, entry.rawProcess, entry.title),
  };
}

/**
 * Pure read-merge-write helper per dirty day.
 * - Deduplicates entries by stable ID.
 * - Sorts chronologically by startTime ascending.
 * - Safety guard: If the merged count is strictly less than existing.length, aborts to prevent data loss.
 * - Bounds storage by maxEntriesPerDay (default 50,000 entries/day).
 */
export function mergeDayEntries(
  existing: ActivityEntry[] = [],
  incoming: ActivityEntry[] = [],
  maxEntriesPerDay = 50000
): { merged: ActivityEntry[]; aborted: boolean; reason?: string } {
  const existingWithIds = existing.map(ensureEntryId);
  const incomingWithIds = incoming.map(ensureEntryId);

  const map = new Map<string, ActivityEntry>();

  for (const e of existingWithIds) {
    if (!e.isLive) {
      map.set(e.id, e);
    }
  }

  for (const e of incomingWithIds) {
    if (!e.isLive) {
      // Incoming updates or supplements existing
      map.set(e.id, e);
    }
  }

  // Safety check: Never allow merge result to shrink an existing day's persisted count
  if (map.size < existingWithIds.filter(e => !e.isLive).length) {
    return {
      merged: existingWithIds.filter(e => !e.isLive),
      aborted: true,
      reason: `Merge would decrease entries from ${existingWithIds.length} to ${map.size}`,
    };
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const tA = new Date(a.startTime).getTime();
    const tB = new Date(b.startTime).getTime();
    return tA - tB;
  });

  // Bound file capacity at documented maximum (50,000 entries/day)
  const capped = merged.length > maxEntriesPerDay ? merged.slice(merged.length - maxEntriesPerDay) : merged;

  return { merged: capped, aborted: false };
}

/**
 * Splits a tracked segment at AFK, sleep, and lock boundaries.
 * Rules:
 * 1. Sleep/gap: If endMs - lastPollMs > 3 * pollIntervalMs, system was sleeping or halted.
 *    Segment closes at lastPollMs and gap is not attributed to foreground app.
 * 2. Idle/AFK: If idleSec >= afkThresholdSec, interaction stopped at (endMs - idleSec * 1000).
 *    Pre-idle time is active, post-idle time is AFK.
 * 3. Total always equals active + afk; neither can be negative.
 */
export function splitSegment(options: SplitSegmentOptions): SplitSegmentResult {
  const {
    startMs,
    endMs,
    lastPollMs,
    idleSec,
    afkThresholdSec,
    pollIntervalMs = 3500,
  } = options;

  const gapThreshold = 3 * pollIntervalMs;
  const isGap = lastPollMs > 0 && endMs - lastPollMs > gapThreshold;

  // If a sleep/freeze gap occurred, close segment at lastPollMs
  const effectiveEndMs = isGap ? Math.max(startMs, lastPollMs) : endMs;
  const rawDurationSeconds = Math.max(0, Math.round((effectiveEndMs - startMs) / 1000));

  if (idleSec < afkThresholdSec) {
    // Normal active segment
    return {
      activeSeconds: rawDurationSeconds,
      afkSeconds: 0,
      totalSeconds: rawDurationSeconds,
      endedAtMs: effectiveEndMs,
      isGap,
    };
  }

  // User became AFK: idleSec indicates how long since last input
  const idleMs = Math.max(0, idleSec * 1000);
  const userStoppedMs = Math.max(startMs, Math.min(effectiveEndMs, effectiveEndMs - idleMs));

  const activeSeconds = Math.max(0, Math.round((userStoppedMs - startMs) / 1000));
  const afkSeconds = Math.max(0, Math.round((effectiveEndMs - userStoppedMs) / 1000));
  const totalSeconds = activeSeconds + afkSeconds;

  return {
    activeSeconds,
    afkSeconds,
    totalSeconds,
    endedAtMs: effectiveEndMs,
    isGap,
  };
}

/**
 * Reads entry duration safely with backward compatibility.
 * Old entries without activeSeconds/afkSeconds are transparently normalized.
 */
export function normalizeEntryDuration(entry: ActivityEntry): {
  activeSeconds: number;
  afkSeconds: number;
  totalSeconds: number;
} {
  const duration = Math.max(0, Number(entry.durationSeconds) || 0);

  if (typeof entry.activeSeconds === "number" && typeof entry.afkSeconds === "number") {
    return {
      activeSeconds: Math.max(0, entry.activeSeconds),
      afkSeconds: Math.max(0, entry.afkSeconds),
      totalSeconds: Math.max(0, entry.durationSeconds || (entry.activeSeconds + entry.afkSeconds)),
    };
  }

  // Legacy fallback
  const isAfk = Boolean(entry.isAfk);
  const activeSeconds = isAfk ? 0 : duration;
  const afkSeconds = isAfk ? duration : 0;

  return {
    activeSeconds,
    afkSeconds,
    totalSeconds: duration,
  };
}
