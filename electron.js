const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require("electron");
const path = require("path");
const fs   = require("fs");
const { exec } = require("child_process");

let mainWindow;
let tray;
let isQuitting = false;

// ─── Persistent Activity Storage (ActivityWatch-style) ────────────────────────
// All data stored locally in user's AppData — NEVER uploaded anywhere
let dataDir  = null;           // set after app.whenReady
let activityLog = [];          // in-memory log for today
let currentActivity = { processName: "", windowTitle: "", startMs: Date.now() };
const SELF_NAMES = ["flowtrackpro", "flowtrack", "electron"];

function isSelf(proc, title) {
  const p = (proc  || "").toLowerCase();
  const t = (title || "").toLowerCase();
  return SELF_NAMES.some(s => p.includes(s) || t.includes(s));
}

// ── File helpers ──────────────────────────────────────────────────────────────
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

/**
 * Save all in-memory entries to their respective date files.
 * Called every 30 s automatically + on before-quit.
 */
function saveLogToFile() {
  if (!dataDir) return;
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Flush current in-progress activity first
    const dur = Math.round((Date.now() - currentActivity.startMs) / 1000);
    if (currentActivity.processName && dur >= 5 && !isSelf(currentActivity.processName, currentActivity.windowTitle)) {
      const today = new Date().toISOString().split("T")[0];
      activityLog.push({
        appName: currentActivity.processName,
        title:   currentActivity.windowTitle,
        durationSeconds: dur,
        startTime: new Date(currentActivity.startMs).toISOString(),
        date: today,
        hour: new Date(currentActivity.startMs).getHours(),
      });
      currentActivity.startMs = Date.now(); // reset window for next accumulation
    }

    // Group by date and write
    const dateMap = new Map();
    for (const entry of activityLog) {
      if (!dateMap.has(entry.date)) dateMap.set(entry.date, []);
      dateMap.get(entry.date).push(entry);
    }
    for (const [date, entries] of dateMap) {
      fs.writeFileSync(getLogFile(date), JSON.stringify(entries, null, 2), "utf8");
    }
  } catch (e) {
    console.error("[ActivityLog] Save error:", e);
  }
}

// ── Windows API: active foreground window ──────────────────────────────────
function getForegroundWindow() {
  return new Promise((resolve) => {
    const ps = `
      Add-Type -TypeDefinition @'
        using System; using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder t, int c);
          [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
        }
'@
      $h = [Win32]::GetForegroundWindow()
      $sb = New-Object System.Text.StringBuilder(256)
      [Win32]::GetWindowText($h, $sb, 256) | Out-Null
      $pid = 0; [Win32]::GetWindowThreadProcessId($h, [ref]$pid) | Out-Null
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
      @{ title = $sb.ToString(); process = if($proc){$proc.Name}else{"unknown"} } | ConvertTo-Json
    `;
    exec(
      `powershell -NoProfile -NonInteractive -Command "${ps.replace(/\n/g, " ")}"`,
      { timeout: 3000 },
      (err, stdout) => {
        if (err || !stdout) return resolve(null);
        try { resolve(JSON.parse(stdout.trim())); } catch { resolve(null); }
      }
    );
  });
}

// ── Windows API: system idle time (keyboard + mouse + touchpad) ───────────
function getSystemIdleMs() {
  return new Promise((resolve) => {
    const ps = `
      Add-Type @'
        using System; using System.Runtime.InteropServices;
        public class Idle {
          [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
          [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO p);
          public static uint GetIdleMs() {
            var l = new LASTINPUTINFO(); l.cbSize = (uint)System.Runtime.InteropServices.Marshal.SizeOf(l);
            GetLastInputInfo(ref l); return (uint)Environment.TickCount - l.dwTime;
          }
        }
'@
      [Idle]::GetIdleMs()
    `;
    exec(
      `powershell -NoProfile -NonInteractive -Command "${ps.replace(/\n/g, " ")}"`,
      { timeout: 3000 },
      (err, stdout) => {
        if (err || !stdout) return resolve(0);
        resolve(parseInt(stdout.trim()) || 0);
      }
    );
  });
}

// ── Background tracker loop (every 5 s) ──────────────────────────────────────
function startActivityTracker() {
  setInterval(async () => {
    const info = await getForegroundWindow();
    if (!info) return;
    const { process: processName, title: windowTitle } = info;

    // Same window still active — keep accumulating
    if (processName === currentActivity.processName && windowTitle === currentActivity.windowTitle) return;

    // Window changed — commit previous entry
    const durationSeconds = Math.round((Date.now() - currentActivity.startMs) / 1000);
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
      // Keep max 5000 entries in memory to avoid RAM bloat
      if (activityLog.length > 5000) activityLog.splice(0, activityLog.length - 5000);
    }
    currentActivity = { processName, windowTitle, startMs: Date.now() };
  }, 5000);

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
      backgroundThrottling: false,  // timers never throttle on minimize
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

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Set up persistent data directory
  dataDir = path.join(app.getPath("userData"), "activity-log");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Load today's existing log from disk (survives restarts!)
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
});

app.on("before-quit", () => {
  isQuitting = true;
  saveLogToFile(); // Always save before quitting
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// ─── IPC: Idle time (Windows GetLastInputInfo) ────────────────────────────────
ipcMain.handle("get-idle-time-ms", async () => await getSystemIdleMs());

// ─── IPC: Currently active window ────────────────────────────────────────────
ipcMain.handle("get-active-window", async () => {
  const info = await getForegroundWindow();
  if (!info) return { title: "Desktop / Idle", process: "unknown", isSelf: false };
  return { title: info.title || "Desktop / Idle", process: info.process || "unknown", isSelf: isSelf(info.process, info.title) };
});

// ─── IPC: Activity log for a specific date ───────────────────────────────────
ipcMain.handle("get-activity-log", async (_e, { date } = {}) => {
  const today = new Date().toISOString().split("T")[0];
  const requested = date || today;

  if (requested === today) {
    const entries = [...activityLog.filter(e => e.date === today)];
    // Append live current entry
    const dur = Math.round((Date.now() - currentActivity.startMs) / 1000);
    if (currentActivity.processName && dur >= 2 && !isSelf(currentActivity.processName, currentActivity.windowTitle)) {
      entries.push({
        appName: currentActivity.processName,
        title:   currentActivity.windowTitle,
        durationSeconds: dur,
        startTime: new Date(currentActivity.startMs).toISOString(),
        date: today,
        hour: new Date(currentActivity.startMs).getHours(),
        minute: new Date(currentActivity.startMs).getMinutes(),
        isLive: true,
      });
    }
    return entries;
  }
  // Historical date: load from file
  return loadLogFromFile(requested);
});

// ─── IPC: List all dates that have data ──────────────────────────────────────
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

// ─── IPC: Export to CSV ───────────────────────────────────────────────────────
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

// ─── IPC: Save image dialog ───────────────────────────────────────────────────
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
