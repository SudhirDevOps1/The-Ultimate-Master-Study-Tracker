const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require("electron");
const path = require("path");
const fs   = require("fs");
const { execFile, exec } = require("child_process");

let mainWindow;
let tray;
let isQuitting = false;

// Path to native win-tracker.exe binary (compiled C# Win32 API helper)
const trackerExePath = app.isPackaged
  ? path.join(process.resourcesPath, "win-tracker.exe")
  : path.join(__dirname, "win-tracker.exe");

// ─── Persistent Activity Storage ─────────────────────────────────────────────
let dataDir  = null;
let activityLog = [];
let currentActivity = { processName: "", windowTitle: "", startMs: Date.now() };
// isSelf is defined below (after getForegroundWindow helper)

function getLogFile(date) {
  return path.join(dataDir, `${date}.json`);
}

function loadLogFromFile(date) {
  try {
    const file = getLogFile(date);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { /* ignore */ }
  return [];
}

function saveLogToFile() {
  if (!dataDir) return;
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const dateMap = new Map();
    for (const entry of activityLog) {
      if (!entry.isLive) {
        if (!dateMap.has(entry.date)) dateMap.set(entry.date, []);
        dateMap.get(entry.date).push(entry);
      }
    }
    for (const [date, entries] of dateMap) {
      fs.writeFileSync(getLogFile(date), JSON.stringify(entries, null, 2), "utf8");
    }
  } catch (e) {
    console.error("[ActivityLog] Save error:", e);
  }
}

// ─── Self-App Detection ───────────────────────────────────────────────────────
// Precisely matches only FlowTrack / Electron — NOT system apps or browsers.
// productName in package.json = "FlowTrackPro" → packaged exe = FlowTrackPro.exe
function isSelf(processName, windowTitle) {
  const p = (processName || "").toLowerCase().trim();
  const t = (windowTitle  || "").toLowerCase().trim();

  // Match by process exe name (all known variants)
  if (
    p === "electron"          || // Dev: Electron runtime
    p === "flowtrack"         || // Packaged v1
    p === "flowtrackpro"      || // Packaged v2 (current productName)
    p === "flowtrack-pro-desktop" ||
    p.startsWith("the-ultimate-master") || // Dev project dir exe
    p.includes("react-vite-tailwind")
  ) return true;

  // Match by window title (only our own app windows)
  if (
    t.includes("flowtrack")           ||
    t.includes("smart study tracker") ||
    t.includes("flowtrack pro")
  ) return true;

  return false;
}

// ─── Skip Decision (isSelf OR invalid reading) ────────────────────────────────
function shouldSkip(processName, windowTitle) {
  const p = (processName || "").toLowerCase().trim();
  const t = (windowTitle  || "").toLowerCase().trim();
  if (isSelf(p, t)) return true;
  if (!p || p === "unknown" || p === "idle") return true;
  if (t === "desktop / idle" || t === "desktop is idle") return true;
  return false;
}

// ─── App Name Normalizer ───────────────────────────────────────────────────────
// Turns raw exe names (msedge, chrome, code) into human-friendly display names.
const FRIENDLY_NAMES = {
  // Browsers
  chrome:         "Google Chrome",
  msedge:         "Microsoft Edge",
  firefox:        "Mozilla Firefox",
  brave:          "Brave Browser",
  opera:          "Opera",
  chromium:       "Chromium",
  iexplore:       "Internet Explorer",
  // Editors / IDEs
  code:           "VS Code",
  "code - insiders": "VS Code Insiders",
  idea64:         "IntelliJ IDEA",
  pycharm64:      "PyCharm",
  webstorm64:     "WebStorm",
  phpstorm64:     "PhpStorm",
  clion64:        "CLion",
  goland64:       "GoLand",
  devenv:         "Visual Studio",
  notepad:        "Notepad",
  notepad2:       "Notepad2",
  notepadplusplus:"Notepad++",
  sublime_text:   "Sublime Text",
  atom:           "Atom",
  vim:            "Vim",
  nvim:           "Neovim",
  "windowsterminal": "Windows Terminal",
  powershell:     "PowerShell",
  cmd:            "Command Prompt",
  bash:           "Git Bash",
  // Productivity
  winword:        "Microsoft Word",
  excel:          "Microsoft Excel",
  powerpnt:       "PowerPoint",
  onenote:        "OneNote",
  outlook:        "Outlook",
  teams:          "Microsoft Teams",
  msteams:        "Microsoft Teams",
  zoom:           "Zoom",
  slack:          "Slack",
  notion:         "Notion",
  obsidian:       "Obsidian",
  acrobat:        "Adobe Acrobat",
  acrord32:       "Adobe Reader",
  // Communication
  discord:        "Discord",
  telegram:       "Telegram",
  whatsapp:       "WhatsApp",
  skype:          "Skype",
  // Media
  vlc:            "VLC",
  spotify:        "Spotify",
  mpc_hc:         "MPC-HC",
  mpc_hc64:       "MPC-HC",
  potplayermini64:"PotPlayer",
  // Development tools
  git:            "Git",
  python:         "Python",
  node:           "Node.js",
  // System
  explorer:       "File Explorer",
  taskmgr:        "Task Manager",
  regedit:        "Registry Editor",
  mspaint:        "Paint",
  calc:           "Calculator",
};

function normalizeAppName(rawProcess) {
  const key = (rawProcess || "").toLowerCase().trim().replace(/\.exe$/, "");
  return FRIENDLY_NAMES[key] || rawProcess;
}



// ── Direct Native Win32 Active Window Fetcher via win-tracker.exe ─────────────
// STRICT: win-tracker.exe only. No fallback. If not available → returns null.
function getForegroundWindow() {
  return new Promise((resolve) => {
    if (!fs.existsSync(trackerExePath)) {
      console.warn("[Tracker] win-tracker.exe not found at:", trackerExePath);
      return resolve(null);
    }
    execFile(trackerExePath, { timeout: 1000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({
          title:   parsed.title   || "",
          process: parsed.process || "unknown"
        });
      } catch {
        resolve(null);
      }
    });
  });
}

// ── Native System Idle Time ──────────────────────────────────────────────────
function getSystemIdleMs() {
  return new Promise((resolve) => {
    const script = `$code = 'using System; using System.Runtime.InteropServices; public class I { [StructLayout(LayoutKind.Sequential)] public struct L { public uint c; public uint t; } [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref L p); public static uint Get() { var l = new L(); l.c = (uint)Marshal.SizeOf(l); GetLastInputInfo(ref l); return (uint)Environment.TickCount - l.t; } }'; Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue; [I]::Get()`;
    
    exec(`powershell -NoProfile -NonInteractive -Command "${script}"`, { timeout: 1500 }, (err, stdout) => {
      if (err || !stdout) return resolve(0);
      resolve(parseInt(stdout.trim()) || 0);
    });
  });
}

// ── Background Activity Tracker Loop (Every 2 seconds) ────────────────────────
function startActivityTracker() {
  setInterval(async () => {
    const info = await getForegroundWindow();
    if (!info || !info.process) return;

    const { process: processName, title: windowTitle } = info;
    const now = Date.now();

    // Skip self-app and truly invalid readings
    if (shouldSkip(processName, windowTitle)) {
      // Still update currentActivity so we don't log a stale entry next time
      if (currentActivity.processName !== processName) {
        currentActivity = { processName, windowTitle, startMs: now };
      }
      return;
    }

    const hasChanged = processName !== currentActivity.processName || windowTitle !== currentActivity.windowTitle;

    if (hasChanged) {
      // Flush the previous activity (if it was a valid non-self app)
      const durationSeconds = Math.round((now - currentActivity.startMs) / 1000);
      if (
        currentActivity.processName &&
        durationSeconds >= 3 &&
        !shouldSkip(currentActivity.processName, currentActivity.windowTitle)
      ) {
        const startDt = new Date(currentActivity.startMs);
        activityLog.push({
          appName:         normalizeAppName(currentActivity.processName),
          rawProcess:      currentActivity.processName,
          title:           currentActivity.windowTitle,
          durationSeconds,
          startTime:       startDt.toISOString(),
          date:            startDt.toISOString().split("T")[0],
          hour:            startDt.getHours(),
          minute:          startDt.getMinutes(),
        });
        // Cap memory at 10,000 entries
        if (activityLog.length > 10000) activityLog.splice(0, activityLog.length - 10000);
      }

      currentActivity = { processName, windowTitle, startMs: now };
    } else {
      // Same app still active — update live entry
      const durationSeconds = Math.round((now - currentActivity.startMs) / 1000);
      if (durationSeconds >= 2) {
        const today = new Date().toISOString().split("T")[0];
        const existingIdx = activityLog.findIndex(e => e.isLive);
        const liveEntry = {
          appName:         normalizeAppName(currentActivity.processName),
          rawProcess:      currentActivity.processName,
          title:           currentActivity.windowTitle,
          durationSeconds,
          startTime:       new Date(currentActivity.startMs).toISOString(),
          date:            today,
          hour:            new Date(currentActivity.startMs).getHours(),
          minute:          new Date(currentActivity.startMs).getMinutes(),
          isLive:          true
        };

        if (existingIdx !== -1) activityLog[existingIdx] = liveEntry;
        else                    activityLog.push(liveEntry);
      }
    }
  }, 2000);

  // Auto-save to disk every 30 seconds
  setInterval(saveLogToFile, 30_000);
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, "public", "favicon.png");
  let icon;
  try { icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }); }
  catch { icon = nativeImage.createEmpty(); }

  tray = new Tray(icon);
  tray.setToolTip("FlowTrack – Study Tracker");
  const menu = Menu.buildFromTemplate([
    { label: "📖 Open FlowTrack", click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: "separator" },
    { label: "❌ Quit FlowTrack",  click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
    else { mainWindow.show(); mainWindow.focus(); }
  });
  tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
}

// ─── Main Window ──────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860, minWidth: 960, minHeight: 640,
    show:  false,
    title: "FlowTrack – Smart Study Tracker",
    icon:  path.join(__dirname, "public", "favicon.png"),
    webPreferences: {
      nodeIntegration:      true,
      contextIsolation:     false,
      backgroundThrottling: false,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) mainWindow.loadURL("http://localhost:5173");
  else        mainWindow.loadFile(path.join(__dirname, "dist/index.html"));

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (process.platform === "win32" && tray) {
        try {
          tray.displayBalloon({
            iconType: "info", title: "FlowTrack is still running",
            content: "Study timer runs in the background. Right-click tray icon to quit.",
            noSound: true,
          });
        } catch { /* ignore */ }
      }
    }
  });

  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (input.type === "keyDown" && input.control && input.shift && input.key === "I") {
      if (mainWindow.webContents.isDevToolsOpened()) mainWindow.webContents.closeDevTools();
      else mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });
}

// ─── Single Instance Lock ──────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  dataDir = path.join(app.getPath("userData"), "activity-log");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Load all historical activity log dates into memory (max 30 days)
  try {
    const files = fs.readdirSync(dataDir)
      .filter(f => f.endsWith(".json"))
      .sort()
      .slice(-30);
    for (const f of files) {
      const entries = JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
      activityLog.push(...entries);
    }
    console.log(`[ActivityLog] Loaded ${activityLog.length} entries from ${files.length} day(s)`);
  } catch (e) {
    console.error("[ActivityLog] Startup load error:", e);
  }

  createWindow();
  createTray();
  startActivityTracker();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else { mainWindow.show(); mainWindow.focus(); }
  });

  // Global System-Wide Shortcuts
  try {
    const { globalShortcut } = require("electron");
    globalShortcut.register("CommandOrControl+Alt+P", () => {
      if (mainWindow) {
        mainWindow.webContents.send("global-shortcut-toggle-timer");
        if (process.platform === "win32" && tray) {
          try {
            tray.displayBalloon({
              iconType: "info",
              title: "FlowTrack Pro Hotkey",
              content: "Study Timer Toggled (Ctrl+Alt+P)",
              noSound: true,
            });
          } catch { /* ignore */ }
        }
      }
    });
  } catch (err) {
    console.error("[Shortcut Error]", err);
  }
});

app.on("will-quit", () => {
  try {
    const { globalShortcut } = require("electron");
    globalShortcut.unregisterAll();
  } catch { /* ignore */ }
});

app.on("before-quit", (e) => {
  isQuitting = true;
  saveLogToFile();
  if (mainWindow) {
    mainWindow.webContents.send("save-session-state-sync");
  }
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle("get-idle-time-ms", async () => await getSystemIdleMs());

ipcMain.handle("get-active-window", async () => {
  const info = await getForegroundWindow();
  if (!info) return { title: "", process: "", appName: "", isSelf: false, skip: true };
  const skip = shouldSkip(info.process, info.title);
  return {
    title:    info.title   || "",
    process:  info.process || "unknown",
    appName:  skip ? "" : normalizeAppName(info.process),
    isSelf:   isSelf(info.process, info.title),
    skip,
  };
});

ipcMain.handle("set-taskbar-progress", async (_e, { progress }) => {
  if (mainWindow) {
    try {
      const p = Math.max(0, Math.min(1, Number(progress) || 0));
      mainWindow.setProgressBar(p > 0 && p < 1 ? p : -1);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false };
});

ipcMain.handle("toggle-always-on-top", async (_e, { flag }) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(Boolean(flag), "screen-saver");
    return { success: true, isAlwaysOnTop: mainWindow.isAlwaysOnTop() };
  }
  return { success: false };
});

ipcMain.handle("set-open-at-login", async (_e, { openAtLogin }) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(openAtLogin) });
  return { success: true, openAtLogin: app.getLoginItemSettings().openAtLogin };
});

ipcMain.handle("send-windows-toast", async (_e, { title, message }) => {
  if (process.platform === "win32" && tray) {
    try {
      tray.displayBalloon({
        iconType: "info",
        title: title || "FlowTrack Pro Alert",
        content: message || "Focus session update",
        noSound: false,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false };
});

ipcMain.handle("get-activity-log", async (_e, { date } = {}) => {
  const today = new Date().toISOString().split("T")[0];
  const requested = date || today;

  if (requested === today) {
    return activityLog;
  }
  return loadLogFromFile(requested);
});

ipcMain.handle("get-tracked-dates", async () => {
  try {
    if (!dataDir || !fs.existsSync(dataDir)) return [];
    return fs.readdirSync(dataDir)
      .filter(f => f.endsWith(".json"))
      .map(f => f.replace(".json", ""))
      .sort()
      .reverse();
  } catch { return []; }
});

ipcMain.handle("export-activity-csv", async (_e, { date } = {}) => {
  try {
    const entries = date ? loadLogFromFile(date) : activityLog;
    const csvLines = [
      "Date,App,Window Title,Duration (seconds),Duration (readable),Start Time,Hour"
    ];
    const fmtSecs = s => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };
    for (const e of entries) {
      const title = (e.title || "").replace(/"/g, '""');
      csvLines.push(`"${e.date}","${e.appName}","${title}",${e.durationSeconds},"${fmtSecs(e.durationSeconds)}","${e.startTime}",${e.hour}`);
    }
    const csv = csvLines.join("\n");

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Export Activity Log",
      defaultPath: `flowtrack-activity-${date || new Date().toISOString().split("T")[0]}.csv`,
      filters: [{ name: "CSV Files", extensions: ["csv"] }],
    });
    if (filePath) { fs.writeFileSync(filePath, csv, "utf8"); return { success: true, path: filePath }; }
    return { success: false, reason: "cancelled" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("save-image-dialog", async (_e, { base64Data, defaultFilename }) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save Image", defaultPath: defaultFilename,
      filters: [{ name: "Images", extensions: ["png"] }],
    });
    if (filePath) {
      fs.writeFileSync(filePath, base64Data.split(";base64,").pop(), { encoding: "base64" });
      return { success: true, path: filePath };
    }
    return { success: false, reason: "cancelled" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Full App Data Export (JSON Backup) ───────────────────────────────────────
ipcMain.handle("export-app-data", async (_e, { appData }) => {
  try {
    // Merge localStorage appData with all activity logs from disk
    const allActivityDates = (dataDir && fs.existsSync(dataDir))
      ? fs.readdirSync(dataDir).filter(f => f.endsWith(".json")).sort()
      : [];

    const allActivityData = {};
    for (const f of allActivityDates) {
      const date = f.replace(".json", "");
      try {
        allActivityData[date] = JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
      } catch { allActivityData[date] = []; }
    }
    // Also save today's in-memory data
    const today = new Date().toISOString().split("T")[0];
    allActivityData[today] = activityLog.filter(e => !e.isLive);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      version: "3.1.0",
      appData: appData || {},        // localStorage data (sessions, subjects, etc.)
      activityLog: allActivityData,  // All tracked app usage, grouped by date
    };

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Export FlowTrack App Data",
      defaultPath: `flowtrack-backup-${today}.json`,
      filters: [{ name: "JSON Backup", extensions: ["json"] }],
    });
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(exportPayload, null, 2), "utf8");
      return { success: true, path: filePath };
    }
    return { success: false, reason: "cancelled" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Full App Data Import (JSON Restore) ─────────────────────────────────────
ipcMain.handle("import-app-data", async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Import FlowTrack App Data",
      filters: [{ name: "JSON Backup", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (!filePaths || !filePaths[0]) return { success: false, reason: "cancelled" };

    const raw = fs.readFileSync(filePaths[0], "utf8");
    const payload = JSON.parse(raw);

    // Validate payload structure
    if (!payload.version || !payload.exportedAt) {
      return { success: false, error: "Invalid backup file: missing version or exportedAt" };
    }

    // Restore activity log files to disk
    if (payload.activityLog && typeof payload.activityLog === "object") {
      if (!dataDir) dataDir = path.join(app.getPath("userData"), "activity-log");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      for (const [date, entries] of Object.entries(payload.activityLog)) {
        if (Array.isArray(entries) && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          fs.writeFileSync(path.join(dataDir, `${date}.json`), JSON.stringify(entries, null, 2), "utf8");
        }
      }

      // Reload today's activity into memory
      const today = new Date().toISOString().split("T")[0];
      const fresh = payload.activityLog[today] || [];
      activityLog.splice(0, activityLog.length, ...fresh);
    }

    return {
      success: true,
      appData: payload.appData || {},  // Return localStorage data for renderer to restore
      exportedAt: payload.exportedAt,
      version: payload.version,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
