const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require("electron");
const path = require("path");
const fs   = require("fs");
const { exec } = require("child_process");

let mainWindow;
let tray;
let isQuitting = false;

// ─── Persistent Activity Storage (ActivityWatch-style) ────────────────────────
let dataDir  = null;
let activityLog = [];          // In-memory array of logged entries
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

function saveLogToFile() {
  if (!dataDir) return;
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Group entries by date and save
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

// ── Windows API: Active Foreground Window via Fast PowerShell ──────────────────
function getForegroundWindow() {
  return new Promise((resolve) => {
    const ps = `
      $h = [Win32ActiveWindow]::GetForegroundWindow()
      $sb = New-Object System.Text.StringBuilder(256)
      [Win32ActiveWindow]::GetWindowText($h, $sb, 256) | Out-Null
      $pid = 0
      [Win32ActiveWindow]::GetWindowThreadProcessId($h, [ref]$pid) | Out-Null
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
      @{ title = $sb.ToString(); process = if($proc){$proc.Name}else{"unknown"} } | ConvertTo-Json
    `;
    const fullCmd = `powershell -NoProfile -NonInteractive -Command "
      if (-not ([System.Management.Automation.PSTypeName]'Win32ActiveWindow').Type) {
        Add-Type -TypeDefinition '
          using System; using System.Runtime.InteropServices;
          public class Win32ActiveWindow {
            [DllImport(\\"user32.dll\\")] public static extern IntPtr GetForegroundWindow();
            [DllImport(\\"user32.dll\\")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder t, int c);
            [DllImport(\\"user32.dll\\")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
          }
        '
      }
      ${ps.replace(/\n/g, " ")}
    "`;

    exec(fullCmd, { timeout: 2500 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      try { resolve(JSON.parse(stdout.trim())); } catch { resolve(null); }
    });
  });
}

// ── Windows API: System Idle Time ─────────────────────────────────────────────
function getSystemIdleMs() {
  return new Promise((resolve) => {
    const ps = `
      if (-not ([System.Management.Automation.PSTypeName]'Win32SystemIdle').Type) {
        Add-Type -TypeDefinition '
          using System; using System.Runtime.InteropServices;
          public class Win32SystemIdle {
            [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
            [DllImport(\\"user32.dll\\")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO p);
            public static uint GetIdleMs() {
              var l = new LASTINPUTINFO(); l.cbSize = (uint)System.Runtime.InteropServices.Marshal.SizeOf(l);
              GetLastInputInfo(ref l); return (uint)Environment.TickCount - l.dwTime;
            }
          }
        '
      }
      [Win32SystemIdle]::GetIdleMs()
    `;
    exec(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/\n/g, " ")}"`, { timeout: 2500 }, (err, stdout) => {
      if (err || !stdout) return resolve(0);
      resolve(parseInt(stdout.trim()) || 0);
    });
  });
}

// ── Background Live Tracker Loop (Every 3 seconds) ─────────────────────────────
function startActivityTracker() {
  setInterval(async () => {
    const info = await getForegroundWindow();
    if (!info) return;

    const { process: processName, title: windowTitle } = info;
    const now = Date.now();

    // Check if foreground app/window has changed
    const hasChanged = processName !== currentActivity.processName || windowTitle !== currentActivity.windowTitle;

    if (hasChanged) {
      // Commit previous window session to array if valid
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

      // Reset current active window tracker
      currentActivity = { processName, windowTitle, startMs: now };
    } else {
      // Same window is still active! Accumulate live duration in place into log
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
  }, 3000);

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
