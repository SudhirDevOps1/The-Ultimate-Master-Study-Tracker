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
    const activeWin = require("active-win");
    const win = activeWin.sync();
    if (win) {
      return { 
        title: win.title || "Desktop / Idle", 
        process: win.owner.name || "unknown" 
      };
    }
    return { title: "Desktop / Idle", process: "unknown" };
  } catch (err) {
    // Graceful fallback for non-supported OS environments
    return { title: "Desktop / Idle", process: "unknown" };
  }
});
