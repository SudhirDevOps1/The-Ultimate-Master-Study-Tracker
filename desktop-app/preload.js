const { contextBridge, ipcRenderer } = require("electron");

// Whitelisted IPC channels for security
const ALLOWED_INVOKE_CHANNELS = [
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
  "open-external-link",
  "set-taskbar-progress",
  "toggle-always-on-top",
  "set-open-at-login",
  "send-windows-toast",
  "scan-local-folder",
];

const ALLOWED_LISTEN_CHANNELS = [
  "global-shortcut-toggle-timer",
  "save-session-state-sync",
];

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  ipcRenderer: {
    invoke: (channel, ...args) => {
      if (ALLOWED_INVOKE_CHANNELS.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      console.warn(`[Preload] Unauthorized invoke channel: ${channel}`);
      return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    },
    on: (channel, listener) => {
      if (ALLOWED_LISTEN_CHANNELS.includes(channel)) {
        const subscription = (_event, ...args) => listener(...args);
        ipcRenderer.on(channel, subscription);
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
      console.warn(`[Preload] Unauthorized listen channel: ${channel}`);
      return () => {};
    },
    off: (channel, listener) => {
      if (ALLOWED_LISTEN_CHANNELS.includes(channel)) {
        ipcRenderer.removeListener(channel, listener);
      }
    },
    removeListener: (channel, listener) => {
      if (ALLOWED_LISTEN_CHANNELS.includes(channel)) {
        ipcRenderer.removeListener(channel, listener);
      }
    },
    send: (channel, ...args) => {
      if (ALLOWED_INVOKE_CHANNELS.includes(channel) || ALLOWED_LISTEN_CHANNELS.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
  },
  shell: {
    openExternal: (url) => {
      return ipcRenderer.invoke("open-external-link", { url });
    },
  },
});
