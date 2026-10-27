export interface HeartbeatItem {
  id?: string;
  entity: string;
  type?: string;
  time: number;
  project?: string;
  branch?: string;
  language?: string;
  editor?: string;
  is_write?: boolean;
  lines?: number;
  lineno?: number;
}

export interface AggregatedCodingStats {
  totalSeconds: number;
  totalHeartbeats: number;
  languages: { name: string; seconds: number; percent: number }[];
  projects: { name: string; seconds: number; percent: number }[];
  editors: { name: string; seconds: number; percent: number }[];
}

/**
 * Aggregates raw heartbeat events into coding statistics.
 * Uses a standard 2-minute session window: consecutive heartbeats within 120s
 * add the difference to the total; single isolated heartbeats contribute 120s.
 */
export function aggregateCodingStats(heartbeats: HeartbeatItem[]): AggregatedCodingStats {
  if (!heartbeats || heartbeats.length === 0) {
    return {
      totalSeconds: 0,
      totalHeartbeats: 0,
      languages: [],
      projects: [],
      editors: [],
    };
  }

  // Sort chronologically
  const sorted = [...heartbeats].sort((a, b) => a.time - b.time);

  const langMap = new Map<string, number>();
  const projMap = new Map<string, number>();
  const editorMap = new Map<string, number>();
  let totalSec = 0;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;

    let duration = 120; // Default bucket for single heartbeat
    if (prev && cur.time >= prev.time && cur.time - prev.time <= 120) {
      duration = Math.max(1, Math.round(cur.time - prev.time));
    }

    totalSec += duration;

    const lang = cur.language && cur.language.trim() ? cur.language : "Other";
    langMap.set(lang, (langMap.get(lang) || 0) + duration);

    const proj = cur.project && cur.project.trim() ? cur.project : "Unknown Project";
    projMap.set(proj, (projMap.get(proj) || 0) + duration);

    const ed = cur.editor && cur.editor.trim() ? cur.editor : "Unknown Editor";
    editorMap.set(ed, (editorMap.get(ed) || 0) + duration);
  }

  const toSortedList = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([name, seconds]) => ({
        name,
        seconds,
        percent: totalSec > 0 ? Math.round((seconds / totalSec) * 100) : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds);

  return {
    totalSeconds: totalSec,
    totalHeartbeats: sorted.length,
    languages: toSortedList(langMap),
    projects: toSortedList(projMap),
    editors: toSortedList(editorMap),
  };
}
