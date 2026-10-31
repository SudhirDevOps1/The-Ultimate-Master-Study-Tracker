/**
 * CommonJS mirror of blockMatch.ts for Electron Main process.
 */

const SYSTEM_DENY_LIST = new Set([
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

function normalizeProcess(p) {
  return (p || "")
    .toLowerCase()
    .trim()
    .replace(/\.exe$/i, "");
}

function isSystemProtected(processName) {
  const norm = normalizeProcess(processName);
  return SYSTEM_DENY_LIST.has(norm);
}

function isValidDomain(domain) {
  if (!domain || typeof domain !== "string") return false;
  const clean = domain.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 253) return false;
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
  return domainRegex.test(clean);
}

function isRuleScheduleActive(rule, now = new Date(), isFocusSessionActive = false) {
  if (rule.blocked === false || rule.enabled === false) return false;
  const sched = rule.schedule || "always";

  if (sched === "always") return true;

  if (sched === "study_hours") {
    return Boolean(isFocusSessionActive);
  }

  if (sched === "custom") {
    if (!rule.customStartTime || !rule.customEndTime) return true;
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (rule.customStartTime || "00:00").split(":").map(Number);
    const [endH, endM] = (rule.customEndTime || "23:59").split(":").map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return true;

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      return currentMins >= startTotal && currentMins <= endTotal;
    } else {
      return currentMins >= startTotal || currentMins <= endTotal;
    }
  }

  return true;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchApp(target, processName) {
  if (!target || !processName) return false;
  if (isSystemProtected(target) || isSystemProtected(processName)) return false;

  const cleanTarget = normalizeProcess(target);
  const cleanProc = normalizeProcess(processName);

  if (cleanTarget.length < 2 || cleanProc.length < 2) return false;

  if (cleanProc === cleanTarget) return true;

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

function matchWebsite(targetDomain, processName, windowTitle, isWebview = false) {
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

  if (cleanDomain.includes(".")) {
    const brand = cleanDomain.split(".")[0];
    if (brand.length >= 4) {
      const brandRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(brand)}([^a-z0-9]|$)`, "i");
      if (brandRegex.test(title)) return true;
    }
    const fullRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanDomain)}([^a-z0-9]|$)`, "i");
    return fullRegex.test(title);
  }

  if (cleanDomain.length >= 4) {
    const brandRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanDomain)}([^a-z0-9]|$)`, "i");
    return brandRegex.test(title);
  }

  return false;
}

module.exports = {
  SYSTEM_DENY_LIST,
  normalizeProcess,
  isSystemProtected,
  isValidDomain,
  isRuleScheduleActive,
  matchApp,
  matchWebsite,
};
