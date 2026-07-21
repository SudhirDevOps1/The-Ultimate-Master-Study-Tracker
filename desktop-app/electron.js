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
const SELF_NAMES = ["flowtrackpro", "flowtrack", "electron"];

function isSelf(proc, title) {
  const p = (proc  || "").toLowerCase();
  const t = (title || "").toLowerCase();
  return SELF_NAMES.some(s => p.includes(s) || t.includes(s));
}

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

function isSelf(processName = "", windowTitle = "") {
  const p = (processName || "").toLowerCase();
  const t = (windowTitle || "").toLowerCase();
  return (
    p.includes("flowtrack") ||
    p.includes("electron") ||
    p.includes("react-vite-tailwind") ||
    t.includes("flowtrack") ||
    t.includes("smart study tracker") ||
    t.includes("flowtrack pro")
  );
}

// ── Direct Native Win32 Active Window Fetcher (0ms Latency) ───────────────────
function getForegroundWindow() {
  return new Promise((resolve) => {
    if (!fs.existsSync(trackerExePath)) {
      return resolve({ title: "Desktop / Idle", process: "unknown" });
    }
    execFile(trackerExePath, { timeout: 1000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({
          title: parsed.title || "Desktop / Idle",
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

    const hasChanged = processName !== currentActivity.processName || windowTitle !== currentActivity.windowTitle;

    if (hasChanged) {
      const durationSeconds = Math.round((now - currentActivity.startMs) / 1000);
      if (currentActivity.processName && durationSeconds >= 2 && !isSelf(currentActivity.processName, currentActivity.windowTitle)) {
        const startDt = new Date(currentActivity.startMs);
        activityLog.push({
          appName:         currentActivity.processName,
          title:           currentActivity.windowTitle,
          durationSeconds,
          startTime:       startDt.toISOString(),
          date:            startDt.toISOString().split("T")[0],
          hour:            startDt.getHours(),
          minute:          startDt.getMinutes(),
        });
        if (activityLog.length > 5000) activityLog.splice(0, activityLog.length - 5000);
      }

      currentActivity = { processName, windowTitle, startMs: now };
    } else {
      const durationSeconds = Math.round((now - currentActivity.startMs) / 1000);
      if (currentActivity.processName && durationSeconds >= 2 && !isSelf(currentActivity.processName, currentActivity.windowTitle)) {
        const today = new Date().toISOString().split("T")[0];
        const existingIdx = activityLog.findIndex(e => e.isLive);
        const liveEntry = {
          appName: currentActivity.processName,
          title: currentActivity.windowTitle,
          durationSeconds,
          startTime: new Date(currentActivity.startMs).toISOString(),
          date: today,
          hour: new Date(currentActivity.startMs).getHours(),
          minute: new Date(currentActivity.startMs).getMinutes(),
          isLive: true
        };

        if (existingIdx !== -1) {
          activityLog[existingIdx] = liveEntry;
        } else {
          activityLog.push(liveEntry);
        }
      }
    }
  }, 2000);

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

  const today = new Date().toISOString().split("T")[0];
  const loaded = loadLogFromFile(today);
  activityLog.push(...loaded);
  console.log(`[ActivityLog] Loaded ${loaded.length} entries from disk for ${today}`);

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

app.on("before-quit", () => {
  isQuitting = true;
  saveLogToFile();
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle("get-idle-time-ms", async () => await getSystemIdleMs());

ipcMain.handle("get-active-window", async () => {
  const info = await getForegroundWindow();
  if (!info) return { title: "Desktop / Idle", process: "unknown", isSelf: false };
  return { title: info.title || "Desktop / Idle", process: info.process || "unknown", isSelf: isSelf(info.process, info.title) };
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
