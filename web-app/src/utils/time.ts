export function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sec = (safeSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${sec}`;
}

export function minutesToHours(minutes: number): number {
  const safe = Math.max(0, Number(minutes) || 0);
  return Number((safe / 60).toFixed(2));
}

export function secondsToHours(seconds: number): number {
  const safe = Math.max(0, Number(seconds) || 0);
  return Number((safe / 3600).toFixed(2));
}

export function toDurationLabel(minutes: number): string {
  const safe = Math.max(0, Math.floor(Number(minutes) || 0));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function calcPlannedMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

export function formatTime12Hour(value: string | number | Date): string {
  if (!value) return "--:--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate12Hour(value: string | number | Date): string {
  if (!value) return "---";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "---";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime12Hour(value: string | number | Date): string {
  return `${formatDate12Hour(value)} • ${formatTime12Hour(value)}`;
}

export function formatTimeRange12Hour(start: string | number | Date, end: string | number | Date): string {
  return `${formatTime12Hour(start)} → ${formatTime12Hour(end)}`;
}
