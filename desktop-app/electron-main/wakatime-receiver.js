const { toLocalDateKey } = require("./local-date.js");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Hardened WakaTime-compatible Heartbeat Receiver
 * Runs entirely in the Electron main process over loopback (127.0.0.1) only.
 * Hardened against DNS rebinding, timing attacks, denial-of-service, and remote calls.
 */

let server = null;
let activePort = 7777;
let receiverConfig = {
  enabled: true,
  port: 7777,
  requireApiKey: false,
  apiKey: "00000000-0000-4000-8000-000000000000",
  debugLogging: false,
};

let heartbeatsDir = "";
let todayHeartbeats = []; // In-memory buffer capped at 2000 entries
let lastHeartbeatTimestamp = 0;
let saveDebounceTimer = null;
let lastSavedDate = "";

/**
 * Get date string (YYYY-MM-DD) in local time
 */
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Prevent length timing attack by comparing dummy buffer
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extract API key from Authorization header
 */
function extractAuthKey(authHeader) {
  if (!authHeader) return "";
  if (authHeader.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
      return decoded.split(":")[0] || decoded;
    } catch {
      return "";
    }
  }
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return authHeader.trim();
}

/**
 * Read request body with hard 2 MB limit
 */
function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("PAYLOAD_TOO_LARGE"));
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString("utf8");
        const data = bodyStr.trim() ? JSON.parse(bodyStr) : {};
        resolve(data);
      } catch (err) {
        reject(new Error("INVALID_JSON"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Persist today's heartbeats to disk
 */
function flushHeartbeatsToDisk(targetDate) {
  if (!heartbeatsDir || todayHeartbeats.length === 0) return true;
  const dateToSave = targetDate || lastSavedDate || getLocalDateString();
  const filePath = path.join(heartbeatsDir, `${dateToSave}.json`);
  try {
    if (!fs.existsSync(heartbeatsDir)) {
      fs.mkdirSync(heartbeatsDir, { recursive: true });
    }
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(todayHeartbeats, null, 2), "utf8");
    fs.renameSync(tmp, filePath);
    lastSavedDate = dateToSave;
    return true;
  } catch (err) {
    console.error("[wakatime] Failed to save heartbeats:", err && err.message);
    return false;
  }
}

/**
 * Load today's heartbeats from disk on startup
 */
function loadTodayHeartbeats() {
  if (!heartbeatsDir) return;
  const today = getLocalDateString();
  const filePath = path.join(heartbeatsDir, `${today}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        todayHeartbeats = parsed.slice(-2000);
      }
    }
  } catch (err) {
    todayHeartbeats = [];
  }
}

/**
 * Purge heartbeat files older than 180 days
 */
function purgeOldHeartbeats() {
  if (!heartbeatsDir || !fs.existsSync(heartbeatsDir)) return;
  try {
    const files = fs.readdirSync(heartbeatsDir);
    const now = Date.now();
    const maxAgeMs = 180 * 24 * 60 * 60 * 1000;
    for (const file of files) {
      if (file.endsWith(".json")) {
        const dateStr = file.replace(".json", "");
        const fileDate = new Date(dateStr);
        if (!isNaN(fileDate.getTime()) && now - fileDate.getTime() > maxAgeMs) {
          fs.unlinkSync(path.join(heartbeatsDir, file));
        }
      }
    }
  } catch (err) {
    console.error("[wakatime] Error purging old heartbeats:", err && err.message);
  }
}

function sanitizeEntityPath(rawPath) {
  if (typeof rawPath !== "string") return "unknown-file";
  let str = rawPath.trim();
  try {
    const os = require("os");
    const homedir = os.homedir();
    if (homedir && str.toLowerCase().startsWith(homedir.toLowerCase())) {
      str = "~" + str.slice(homedir.length);
    }
  } catch {}
  return str.replace(/\\/g, "/").slice(0, 500);
}

/**
 * Process a single heartbeat payload
 */
function processHeartbeat(raw, userAgent = "") {
  if (!raw || typeof raw !== "object" || !raw.entity) return null;

  const timeVal = typeof raw.time === "number" ? raw.time : Date.now() / 1000;
  if (isNaN(timeVal) || timeVal <= 0) return null;

  const today = getLocalDateString();
  if (lastSavedDate && lastSavedDate !== today) {
    // Day rollover: flush previous day buffer into previous day's file
    const flushed = flushHeartbeatsToDisk(lastSavedDate);
    if (flushed) {
      todayHeartbeats = [];
      lastSavedDate = today;
    }
  }

  // Deduplicate: same entity, same project, within 2 seconds
  const dedupeKey = `${raw.entity}|${raw.project || ""}|${Math.floor(timeVal / 2)}`;
  const recentDedupe = todayHeartbeats.slice(-10);
  const isDuplicate = recentDedupe.some(
    h => `${h.entity}|${h.project || ""}|${Math.floor(h.time / 2)}` === dedupeKey
  );
  if (isDuplicate) return null;

  // Derive editor name from user-agent or raw editor field
  let editorName = String(raw.editor || "");
  if (!editorName && userAgent) {
    if (/vscode/i.test(userAgent)) editorName = "VS Code";
    else if (/vscodium/i.test(userAgent)) editorName = "VSCodium";
    else if (/antigravity/i.test(userAgent)) editorName = "Google Antigravity";
    else if (/cursor/i.test(userAgent)) editorName = "Cursor";
    else if (/intellij|idea/i.test(userAgent)) editorName = "IntelliJ IDEA";
    else if (/pycharm/i.test(userAgent)) editorName = "PyCharm";
    else if (/webstorm/i.test(userAgent)) editorName = "WebStorm";
    else if (/sublime/i.test(userAgent)) editorName = "Sublime Text";
    else if (/neovim|nvim/i.test(userAgent)) editorName = "Neovim";
    else if (/vim/i.test(userAgent)) editorName = "Vim";
    else editorName = "Editor";
  }

  const sanitizedEntity = sanitizeEntityPath(raw.entity);
  const proj = String(raw.project || "Unknown Project").slice(0, 100);
  const record = {
    id: String(raw.id || `${timeVal}|${sanitizedEntity}|${proj}`).replace(/[^a-zA-Z0-9_\-.:]/g, "_"),
    entity: sanitizedEntity,
    type: String(raw.type || "file").slice(0, 50),
    time: timeVal,
    project: proj,
    branch: String(raw.branch || "").slice(0, 100),
    language: String(raw.language || "Unknown").slice(0, 50),
    category: String(raw.category || "coding").slice(0, 50),
    is_write: Boolean(raw.is_write),
    lines: typeof raw.lines === "number" ? raw.lines : undefined,
    lineno: typeof raw.lineno === "number" ? raw.lineno : undefined,
    cursorpos: typeof raw.cursorpos === "number" ? raw.cursorpos : undefined,
    editor: editorName.slice(0, 50),
    machine_name: String(raw.machine_name || "localhost").slice(0, 50),
    ...(raw.isDiagnostic ? { isDiagnostic: true } : {}),
  };

  todayHeartbeats.push(record);
  if (todayHeartbeats.length > 2000) {
    todayHeartbeats.shift();
  }

  lastHeartbeatTimestamp = Date.now();

  // Debounced write to disk (>= 2s)
  if (!saveDebounceTimer) {
    saveDebounceTimer = setTimeout(() => {
      saveDebounceTimer = null;
      flushHeartbeatsToDisk();
    }, 2500);
  }

  return record;
}

/**
 * Handle incoming HTTP requests
 */
async function handleRequest(req, res) {
  // Enforce security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");

  // Foreign Origin check (reject cross-origin requests from external web pages)
  const origin = req.headers["origin"];
  if (origin) {
    const isLocalOrigin =
      origin.startsWith("http://127.0.0.1") ||
      origin.startsWith("http://localhost") ||
      origin.startsWith("https://127.0.0.1") ||
      origin.startsWith("https://localhost");
    if (!isLocalOrigin) {
      res.writeHead(403);
      return res.end(JSON.stringify({ ok: false, error: "Forbidden: Cross-origin request not allowed" }));
    }
  }

  // Loopback check (Rule S6)
  const remote = req.socket.remoteAddress || "";
  const isLoopback =
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1";

  if (!isLoopback) {
    res.writeHead(403);
    return res.end(JSON.stringify({ ok: false, error: "Forbidden: Loopback only" }));
  }

  // Enforce Content-Type on POST requests
  if (req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      res.writeHead(415);
      return res.end(JSON.stringify({ ok: false, error: "Unsupported Media Type: expected application/json" }));
    }
  }

  // Host header DNS-rebinding check (Rule S6)
  const host = req.headers["host"] || "";
  const isHostValid =
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("[::1]");

  if (!isHostValid) {
    res.writeHead(403);
    return res.end(JSON.stringify({ ok: false, error: "Forbidden: Invalid Host header" }));
  }

  const parsedUrl = new URL(req.url, `http://${host || "127.0.0.1"}`);
  const pathname = parsedUrl.pathname;

  // Friendly Root, Health & API Info endpoints (prevents 404 when user visits http://127.0.0.1:7777/api/v1)
  const isInfoEndpoint =
    req.method === "GET" &&
    (pathname === "/" ||
     pathname === "/api" ||
     pathname === "/api/v1" ||
     pathname === "/api/v1/" ||
     pathname === "/api/compat/wakatime/v1" ||
     pathname === "/api/compat/wakatime/v1/" ||
     pathname === "/health" ||
     pathname === "/api/v1/health");

  if (isInfoEndpoint) {
    res.writeHead(200);
    return res.end(
      JSON.stringify(
        {
          ok: true,
          service: "FlowTrack Pro WakaTime & Coding Integration",
          status: "online",
          version: "wakatime-local-v1",
          port: activePort,
          heartbeats_today: todayHeartbeats.length,
          message: "Local WakaTime receiver is active and ready to log heartbeats.",
          endpoints: {
            heartbeats: "/api/v1/users/current/heartbeats",
            status: "/api/v1/users/current/status",
            summaries: "/api/v1/users/current/summaries",
            health: "/health",
            buckets: "/api/0/buckets",
          },
          config_example:
            "[settings]\napi_key = 00000000-0000-4000-8000-000000000000\napi_url = http://127.0.0.1:" +
            activePort +
            "/api/v1",
        },
        null,
        2
      )
    );
  }

  // API Key Check if required
  if (receiverConfig.requireApiKey) {
    const authHeader = req.headers["authorization"] || "";
    const key = extractAuthKey(authHeader);
    if (!timingSafeEqualStr(key, receiverConfig.apiKey) && !timingSafeEqualStr(key, "flowtrack-local")) {
      res.writeHead(401);
      return res.end(JSON.stringify({ ok: false, error: "Unauthorized: Invalid API key" }));
    }
  }

  // Supported WakaTime URL patterns (both /api/v1/ and /api/compat/wakatime/v1/)
  const isHeartbeatPost =
    (pathname === "/api/v1/users/current/heartbeats" ||
     pathname === "/api/compat/wakatime/v1/users/current/heartbeats") &&
    req.method === "POST";

  const isBulkHeartbeatPost =
    (pathname === "/api/v1/users/current/heartbeats.bulk" ||
     pathname === "/api/compat/wakatime/v1/users/current/heartbeats.bulk") &&
    req.method === "POST";

  const isStatusGet =
    (pathname === "/api/v1/users/current/status" ||
     pathname === "/api/compat/wakatime/v1/users/current/status" ||
     pathname === "/api/v1/users/current" ||
     pathname === "/api/compat/wakatime/v1/users/current") &&
    req.method === "GET";

  const isSummariesGet =
    (pathname === "/api/v1/users/current/summaries" ||
     pathname === "/api/compat/wakatime/v1/users/current/summaries") &&
    req.method === "GET";

    // ActivityWatch / FlowTrack local read-only Query API (Rule S1, S2, S11)
  if (pathname === "/api/0/buckets" || pathname === "/api/v1/buckets") {
    if (req.method !== "GET") {
      res.writeHead(405);
      return res.end(JSON.stringify({ error: "Method Not Allowed - Read Only API" }));
    }
    const buckets = {
      "flowtrack-wakatime-heartbeats": {
        id: "flowtrack-wakatime-heartbeats",
        name: "WakaTime IDE Heartbeats",
        type: "coding",
        client: "flowtrack-pro",
        hostname: "localhost",
        created: new Date().toISOString(),
      },
      "flowtrack-activity-window": {
        id: "flowtrack-activity-window",
        name: "Active Window Tracker",
        type: "window",
        client: "flowtrack-pro",
        hostname: "localhost",
        created: new Date().toISOString(),
      }
    };
    res.writeHead(200);
    return res.end(JSON.stringify(buckets));
  }

  if ((pathname.startsWith("/api/0/buckets/") || pathname.startsWith("/api/v1/buckets/")) && pathname.endsWith("/events")) {
    if (req.method !== "GET") {
      res.writeHead(405);
      return res.end(JSON.stringify({ error: "Method Not Allowed - Read Only API" }));
    }
    const today = getLocalDateString();
    const log = getDayHeartbeats(today);
    const limit = Math.min(500, parseInt(parsedUrl.searchParams.get("limit") || "100", 10));
    const slice = log.slice(-limit);
    const events = slice.map((h, idx) => {
      let duration = 120;
      if (idx > 0) {
        const gap = Math.round(h.time - slice[idx - 1].time);
        if (gap > 0 && gap <= 120) duration = gap;
      }
      return {
        id: h.id || `${Math.round(h.time)}|${h.entity}|${h.project}`,
        timestamp: new Date(h.time * 1000).toISOString(),
        duration,
        data: {
          app: h.editor,
          project: h.project,
          file: h.entity,
          language: h.language,
        }
      };
    });
    res.writeHead(200);
    return res.end(JSON.stringify(events));
  }

  // Support GET on heartbeats endpoint for local inspection
  if (
    (pathname === "/api/v1/users/current/heartbeats" ||
     pathname === "/api/compat/wakatime/v1/users/current/heartbeats") &&
    req.method === "GET"
  ) {
    res.writeHead(200);
    return res.end(JSON.stringify({ data: todayHeartbeats }));
  }

  if (isHeartbeatPost) {
    try {
      const body = await readJsonBody(req);
      const userAgent = req.headers["user-agent"] || "";
      const processed = processHeartbeat(body, userAgent);
      res.writeHead(201);
      return res.end(JSON.stringify({ data: processed ? [processed] : [] }));
    } catch (err) {
      const status = err.message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      res.writeHead(status);
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (isBulkHeartbeatPost) {
    try {
      const body = await readJsonBody(req);
      const userAgent = req.headers["user-agent"] || "";
      const items = Array.isArray(body) ? body : Array.isArray(body.heartbeats) ? body.heartbeats : [];
      const saved = [];
      for (const item of items) {
        const res = processHeartbeat(item, userAgent);
        if (res) saved.push(res);
      }
      res.writeHead(201);
      return res.end(JSON.stringify({ data: saved }));
    } catch (err) {
      const status = err.message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      res.writeHead(status);
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (isStatusGet) {
    res.writeHead(200);
    return res.end(
      JSON.stringify({
        data: {
          is_logged_in: true,
          username: "local-user",
          last_heartbeat_at: lastHeartbeatTimestamp
            ? new Date(lastHeartbeatTimestamp).toISOString()
            : null,
          heartbeats_today_count: todayHeartbeats.length,
        },
      })
    );
  }

  if (isSummariesGet) {
    // Return empty summaries array rather than invented numbers
    res.writeHead(200);
    return res.end(JSON.stringify({ data: [] }));
  }

  // Unknown route -> plain 404
  res.writeHead(404);
  res.end(JSON.stringify({ ok: false, error: "Not Found" }));
}

/**
 * Start the receiver with automatic port conflict handling
 */
function startReceiver(userDataPath, preferredPort = 7777) {
  if (server) return Promise.resolve(activePort);

  heartbeatsDir = path.join(userDataPath, "heartbeats");
  loadTodayHeartbeats();
  purgeOldHeartbeats();

  activePort = preferredPort;

  return new Promise((resolve, reject) => {
    function attemptListen(port) {
      const s = http.createServer(handleRequest);
      s.maxConnections = 8;
      s.requestTimeout = 10000;

      s.on("error", err => {
        if (err.code === "EADDRINUSE") {
          console.warn(`[wakatime] Port ${port} is in use, trying ${port + 1}...`);
          try { s.close(); } catch {}
          if (port < preferredPort + 20) {
            attemptListen(port + 1);
          } else {
            console.error("[wakatime] Failed to find free port for receiver.");
            reject(new Error("Failed to find free port for receiver"));
          }
        } else {
          console.error("[wakatime] Server error:", err);
          reject(err);
        }
      });

      s.listen(port, "127.0.0.1", () => {
        server = s;
        const addr = s.address();
        activePort = typeof addr === "object" && addr ? addr.port : port;
        console.log(`[wakatime] Local receiver listening on http://127.0.0.1:${activePort}`);
        resolve(activePort);
      });
    }

    attemptListen(preferredPort);
  });
}

/**
 * Graceful shutdown
 */
function stopReceiver() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  flushHeartbeatsToDisk();
  return new Promise(resolve => {
    if (server) {
      const s = server;
      server = null;
      s.close(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Aggregations for coding stats tab
 */
/**
 * Retrieve raw heartbeat records for a specific date (YYYY-MM-DD)
 */
function getDayHeartbeats(targetDate = getLocalDateString()) {
  const localToday = getLocalDateString();
  const utcToday = new Date().toISOString().split("T")[0];
  if (!targetDate || targetDate === localToday || targetDate === utcToday) {
    if (todayHeartbeats.length > 0) {
      return [...todayHeartbeats];
    }
  }
  if (heartbeatsDir) {
    const filePath = path.join(heartbeatsDir, `${targetDate}.json`);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      return [];
    }
  }
  if (!targetDate || targetDate === localToday || targetDate === utcToday) {
    return [...todayHeartbeats];
  }
  return [];
}

function getHeartbeatStats(targetDate = getLocalDateString(), customEntries = null) {
  let entries = [];
  if (Array.isArray(customEntries)) {
    entries = customEntries;
  } else if (targetDate === getLocalDateString()) {
    entries = todayHeartbeats;
  } else if (heartbeatsDir) {
    const filePath = path.join(heartbeatsDir, `${targetDate}.json`);
    try {
      if (fs.existsSync(filePath)) {
        entries = JSON.parse(fs.readFileSync(filePath, "utf8"));
      }
    } catch {
      entries = [];
    }
  }

  if (!entries || entries.length === 0) {
    return {
      totalSeconds: 0,
      byProject: {},
      byLanguage: {},
      byEditor: {},
      byCategory: {},
      topFiles: [],
    };
  }

  // Exclude diagnostic test pulses from all statistics
  const nonDiagnostic = entries.filter(e => !e.isDiagnostic);
  if (nonDiagnostic.length === 0) {
    return {
      totalSeconds: 0,
      byProject: {},
      byLanguage: {},
      byEditor: {},
      byCategory: {},
      topFiles: [],
    };
  }

  // Sort chronologically
  const sorted = [...nonDiagnostic].sort((a, b) => a.time - b.time);

  // If there is only one heartbeat in the day, duration is 0 (isolated ping cannot imply 120s work)
  if (sorted.length === 1) {
    return {
      totalSeconds: 0,
      byProject: { [sorted[0].project || "Unknown Project"]: 0 },
      byLanguage: { [sorted[0].language || "Unknown"]: 0 },
      byEditor: { [sorted[0].editor || "Editor"]: 0 },
      byCategory: { [sorted[0].category || "coding"]: 0 },
      topFiles: [{ file: path.basename(sorted[0].entity || "untitled"), seconds: 0 }],
    };
  }

  let totalSeconds = 0;
  const byProject = {};
  const byLanguage = {};
  const byEditor = {};
  const byCategory = {};
  const fileTime = {};

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const next = i < sorted.length - 1 ? sorted[i + 1] : null;

    // Rule: for i > 0: min(gapFromPrev, 120); for i = 0: min(gapToNext, 120)
    let duration = 0;
    if (i > 0 && prev) {
      const gap = Math.max(0, curr.time - prev.time);
      duration = Math.min(gap, 120);
    } else if (i === 0 && next) {
      const gap = Math.max(0, next.time - curr.time);
      duration = Math.min(gap, 120);
    }

    totalSeconds += duration;

    // Project
    const proj = curr.project || "Unknown Project";
    byProject[proj] = (byProject[proj] || 0) + duration;

    // Language
    const lang = curr.language || "Unknown";
    byLanguage[lang] = (byLanguage[lang] || 0) + duration;

    // Editor
    const ed = curr.editor || "Editor";
    byEditor[ed] = (byEditor[ed] || 0) + duration;

    // Category
    const cat = curr.category || "coding";
    byCategory[cat] = (byCategory[cat] || 0) + duration;

    // File
    const file = path.basename(curr.entity || "untitled");
    fileTime[file] = (fileTime[file] || 0) + duration;
  }

  const topFiles = Object.entries(fileTime)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, seconds]) => ({ file, seconds }));

  return {
    totalSeconds,
    byProject,
    byLanguage,
    byEditor,
    byCategory,
    topFiles,
  };
}

function clearHeartbeats(options = { scope: "today" }) {
  const scope = typeof options === "string" ? options : (options && options.scope) || "today";
  todayHeartbeats = [];
  if (heartbeatsDir && fs.existsSync(heartbeatsDir)) {
    if (scope === "all") {
      const files = fs.readdirSync(heartbeatsDir);
      for (const f of files) {
        if (f.endsWith(".json")) {
          try { fs.unlinkSync(path.join(heartbeatsDir, f)); } catch {}
        }
      }
    } else {
      // today only
      const todayFile = path.join(heartbeatsDir, `${getLocalDateString()}.json`);
      try {
        if (fs.existsSync(todayFile)) fs.unlinkSync(todayFile);
      } catch {}
    }
  }
  return { success: true, scope };
}

function purgeDiagnosticHeartbeats() {
  const beforeCount = todayHeartbeats.length;
  todayHeartbeats = todayHeartbeats.filter(h => !h.isDiagnostic);
  const purgedCount = beforeCount - todayHeartbeats.length;
  flushHeartbeatsToDisk();
  return { success: true, count: purgedCount };
}

function getActivePort() {
  return activePort;
}

module.exports = {
  startReceiver,
  stopReceiver,
  processHeartbeat,
  getHeartbeatStats,
  getDayHeartbeats,
  getStatus: () => ({
    isRunning: Boolean(server),
    port: activePort,
    heartbeatsToday: todayHeartbeats.length,
    lastHeartbeatAt: lastHeartbeatTimestamp,
  }),
  setConfig: newCfg => {
    receiverConfig = { ...receiverConfig, ...newCfg };
  },
  getHeartbeatsDir: () => heartbeatsDir,
  DEFAULT_PORT: 7777,
  HOST: "127.0.0.1",
  clearHeartbeats,
  purgeDiagnosticHeartbeats,
  getActivePort,
};
