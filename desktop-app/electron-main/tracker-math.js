/**
 * tracker-math.js
 * CommonJS implementation of activity tracker primitives for Electron main process.
 */

function hash8(str) {
  let h = 0x811c9dc5;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function generateEntryId(startTime, rawProcess, title) {
  return `${startTime}|${rawProcess || "unknown"}|${hash8(title || "")}`;
}

function ensureEntryId(entry) {
  if (entry && entry.id && typeof entry.id === "string" && entry.id.trim().length > 0) {
    return entry;
  }
  return {
    ...entry,
    id: generateEntryId(entry.startTime, entry.rawProcess, entry.title),
  };
}

function mergeDayEntries(existing = [], incoming = [], maxEntriesPerDay = 50000) {
  const existingWithIds = existing.map(ensureEntryId);
  const incomingWithIds = incoming.map(ensureEntryId);

  const map = new Map();

  for (const e of existingWithIds) {
    if (!e.isLive) {
      map.set(e.id, e);
    }
  }

  for (const e of incomingWithIds) {
    if (!e.isLive) {
      map.set(e.id, e);
    }
  }

  // Guard: merged size must not shrink existing persisted entries count
  const nonLiveExistingCount = existingWithIds.filter(e => !e.isLive).length;
  if (map.size < nonLiveExistingCount) {
    return {
      merged: existingWithIds.filter(e => !e.isLive),
      aborted: true,
      reason: `Merge would decrease entries from ${nonLiveExistingCount} to ${map.size}`,
    };
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const tA = new Date(a.startTime).getTime();
    const tB = new Date(b.startTime).getTime();
    return tA - tB;
  });

  const capped = merged.length > maxEntriesPerDay ? merged.slice(merged.length - maxEntriesPerDay) : merged;

  return { merged: capped, aborted: false };
}

function splitSegment(options) {
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

  const effectiveEndMs = isGap ? Math.max(startMs, lastPollMs) : endMs;
  const rawDurationSeconds = Math.max(0, Math.round((effectiveEndMs - startMs) / 1000));

  if (idleSec < afkThresholdSec) {
    return {
      activeSeconds: rawDurationSeconds,
      afkSeconds: 0,
      totalSeconds: rawDurationSeconds,
      endedAtMs: effectiveEndMs,
      isGap,
    };
  }

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

module.exports = {
  hash8,
  generateEntryId,
  ensureEntryId,
  mergeDayEntries,
  splitSegment,
};
