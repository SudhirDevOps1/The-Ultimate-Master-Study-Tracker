const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel, ...args) => {
      // Expose only white-listed secure channels
      const validChannels = [
        "secure-proxy-fetch",
        "get-active-window",
        "get-idle-time-ms",
        "get-activity-log",
        "get-tracked-dates",
        "export-activity-csv",
        "save-image-dialog",
        "export-app-data",
        "import-app-data",
        "get-app-version",
        "open-external-link"
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    }
  }
});
