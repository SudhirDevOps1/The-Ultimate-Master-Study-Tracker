/**
 * Robust, low-risk process and website block matching engine.
 * Protects system-critical processes, verifies schedules,
 * and eliminates false-positive substring kills.
 */

export const SYSTEM_DENY_LIST = new Set([
  "explorer",
  "applicationframehost",
  "dwm",
  "csrss",
  "winlogon",
  "services",
  "lsass",
  "svchost",
  "electron",
  "flowtrackpro",
  "flowtrack",
  "taskmgr",
  "regedit",
  "cmd",
  "powershell",
  "windowsterminal",
  "system",
  "idle",
  "systemsettings",
]);

export function normalizeProcess(p: string): string {
  return (p || "")
    .toLowerCase()
    .trim()
    .replace(/\.exe$/i, "");
}

export function isSystemProtected(processName: string): boolean {
  const norm = normalizeProcess(processName);
  return SYSTEM_DENY_LIST.has(norm);
}

export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== "string") return false;
  const clean = domain.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 253) return false;
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
  return domainRegex.test(clean);
}

export interface RuleScheduleInput {
  blocked?: boolean;
  enabled?: boolean;
  schedule?: "always" | "study_hours" | "custom" | string;
  customStartTime?: string; // HH:mm
  customEndTime?: string; // HH:mm
}

export function isRuleScheduleActive(
  rule: RuleScheduleInput,
  now: Date = new Date(),
  isFocusSessionActive: boolean = false
): boolean {
  if (rule.blocked === false || rule.enabled === false) return false;
  const sched = rule.schedule || "always";

  if (sched === "always") return true;

  if (sched === "study_hours") {
    return Boolean(isFocusSessionActive);
  }

  if (sched === "custom") {
    if (!rule.customStartTime || !rule.customEndTime) return true;
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = rule.customStartTime.split(":").map(Number);
    const [endH, endM] = rule.customEndTime.split(":").map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return true;

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      // Daytime window (e.g., 09:00 - 17:00)
      return currentMins >= startTotal && currentMins <= endTotal;
    } else {
      // Overnight window (e.g., 22:00 - 04:00)
      return currentMins >= startTotal || currentMins <= endTotal;
    }
  }

  return true;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchApp(target: string, processName: string): boolean {
  if (!target || !processName) return false;
  if (isSystemProtected(target) || isSystemProtected(processName)) return false;

  const cleanTarget = normalizeProcess(target);
  const cleanProc = normalizeProcess(processName);

  if (cleanTarget.length < 2 || cleanProc.length < 2) return false;

  // Exact process match (e.g., "whatsapp" === "whatsapp")
  if (cleanProc === cleanTarget) return true;

  // Helper or worker process (e.g. "slack-helper", "whatsapp.service")
  if (cleanProc.startsWith(`${cleanTarget}.`) || cleanProc.startsWith(`${cleanTarget}-`)) {
    return true;
  }

  return false;
}

const BROWSER_PROCESSES = new Set([
  "chrome",
  "msedge",
  "firefox",
  "brave",
  "opera",
  "vivaldi",
  "safari",
  "chromium",
  "arc",
]);

export function matchWebsite(
  targetDomain: string,
  processName: string,
  windowTitle: string,
  isWebview: boolean = false
): boolean {
  if (!targetDomain) return false;

  const cleanDomain = targetDomain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "");

  if (cleanDomain.length < 3) return false;

  if (isWebview) {
    return (windowTitle || "").toLowerCase().includes(cleanDomain);
  }

  const cleanProc = normalizeProcess(processName);
  const isBrowser = Array.from(BROWSER_PROCESSES).some(b => cleanProc.includes(b));
  if (!isBrowser) return false;

  const title = (windowTitle || "").toLowerCase();

  // If domain has a dot (e.g. "youtube.com", "x.com")
  if (cleanDomain.includes(".")) {
    const brand = cleanDomain.split(".")[0];
    if (brand.length >= 4) {
      const brandRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(brand)}([^a-z0-9]|$)`, "i");
      if (brandRegex.test(title)) return true;
    }
    // Full domain check with boundary (e.g., "x.com")
    const fullRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanDomain)}([^a-z0-9]|$)`, "i");
    return fullRegex.test(title);
  }

  // Bare brand name >= 4 characters
  if (cleanDomain.length >= 4) {
    const brandRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanDomain)}([^a-z0-9]|$)`, "i");
    return brandRegex.test(title);
  }

  return false;
}
