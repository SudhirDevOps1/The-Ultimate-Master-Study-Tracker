/**
 * localDate.ts
 * Single source of truth for local calendar date representations across FlowTrack Pro.
 * Replaces all brittle toISOString().split("T")[0] calls that cause UTC midnight misattribution.
 */

/**
 * Converts a Date, epoch millisecond timestamp, or ISO string to a local calendar date string (YYYY-MM-DD).
 * Uses the local system clock (or explicit Date object's local time components).
 */
export function toLocalDateKey(input: Date | number | string = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a local calendar date string (YYYY-MM-DD) into a Date object set to 00:00:00.000 in local time.
 */
export function fromLocalDateKey(key: string): Date {
  if (!key || typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key.trim())) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  const [yStr, mStr, dStr] = key.trim().split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Extracts the local hour and minute for an activity entry or timestamp.
 */
export function localHourMinute(input: Date | number | string = new Date()): { hour: number; minute: number } {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes() };
  }
  return {
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}
