const { contextBridge, ipcRenderer } = require("electron");

// Whitelisted IPC channels for security
const ALLOWED_INVOKE_CHANNELS = [
  "secure-proxy-fetch",
  "get-active-window",
  "get-foreground-window",
  "get-idle-time-ms",
  "get-activity-log",
  "get-tracked-dates",
  "export-activity-csv",
  "save-image-dialog",
  "save-image-file",
  "open-image-safely",
  "export-app-data",
  "import-app-data",
  "get-app-version",
  "open-external-link",
  "open-activity-log-folder",
  "get-data-directory-path",
  "set-taskbar-progress",
  "toggle-always-on-top",
  "set-open-at-login",
  "send-windows-toast",
  "scan-local-folder",
  "open-in-vlc",
  "get-block-rules",
  "focus-main-window",
  "save-block-rules",
  "enforce-block-rules",
  "sync-hosts-file",
  "get-running-apps",
  "get-desktop-settings",
  "save-desktop-settings",
  // Webview Activity Tracking (Web Portals Browser page)
  "webview-activity-report",
  "webview-activity-clear",
  "get-active-webview-domain",
  // Clear activity tracking logs
  "clear-activity-log",
  // Auto-Updater (electron-updater)
  "check-for-updates",
  "restart-and-install-update",
  // PiP Window
  "open-pip-window",
  "sync-timer-state",
  "request-timer-sync",
  // Window Controls (Cross-platform Minimize / Maximize / Close)
  "window-minimize",
  "window-maximize",
  "window-close",
  "is-window-maximized",
  // WakaTime Heartbeat Receiver IPCs
  "heartbeat-status",
  "heartbeat-get-day",
  "heartbeat-stats",
  "heartbeat-clear",
  "purge-diagnostic-heartbeats",
  "open-heartbeat-folder",
  "heartbeat-set-config",
  "send-test-heartbeat",
  "auto-configure-wakatime-cfg",
  // Browser Extensions & Enhanced Shield IPCs
  "get-installed-extensions",
  "install-extension-folder",
  "toggle-extension",
  "remove-extension",
  "toggle-enhanced-adblock",
  // Download Management IPCs
  "open-downloads-folder",
  "show-item-in-folder",
  // Low-RAM Memory Trimmer
  "purge-memory",
];

const ALLOWED_LISTEN_CHANNELS = [
  "global-shortcut-toggle-timer",
  "save-session-state-sync",
  "toast-message",
  "update-status-event",
  "pip-window-closed",
  "timer-state-updated",
  "request-timer-sync",
  "active-window-changed",
  "user-afk-status-changed",
  "download-progress",
  "download-completed",
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
