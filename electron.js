const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load build output or Vite dev server
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC communication endpoints for active window tracking
ipcMain.handle("get-active-window", async () => {
  try {
    const { exec } = require("child_process");
    const psCommand = `
      Add-Type -TypeDefinition "
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport(\\"user32.dll\\")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport(\\"user32.dll\\")]
          public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
          [DllImport(\\"user32.dll\\")]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
        }
      "
      $hwnd = [Win32]::GetForegroundWindow()
      $titleBuilder = New-Object System.Text.StringBuilder(256)
      [Win32]::GetWindowText($hwnd, $titleBuilder, 256) | Out-Null
      $processId = 0
      [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
      $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
      $result = @{
        title = $titleBuilder.ToString()
        process = if ($proc) { $proc.Name } else { "unknown" }
      }
      $result | ConvertTo-Json
    `;
    
    return new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "${psCommand.replace(/\n/g, " ").replace(/"/g, '\\"')}"`, (error, stdout) => {
        if (error || !stdout) {
          resolve({ title: "Desktop / Idle", process: "unknown" });
          return;
        }
        try {
          const data = JSON.parse(stdout.trim());
          resolve({
            title: data.title || "Desktop / Idle",
            process: data.process || "unknown"
          });
        } catch {
          resolve({ title: "Desktop / Idle", process: "unknown" });
        }
      });
    });
  } catch (err) {
    return { title: "Desktop / Idle", process: "unknown" };
  }
});
