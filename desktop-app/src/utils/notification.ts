export async function sendNotification(title: string, options?: NotificationOptions) {
  // Check if we are running in Electron and IPC is available
  if (typeof window !== 'undefined' && (window as any).electron && (window as any).electron.ipcRenderer) {
    try {
      await (window as any).electron.ipcRenderer.invoke("send-windows-toast", {
        title,
        body: options?.body || ""
      });
      return;
    } catch (e) {
      console.error("Failed to send Windows Toast via IPC:", e);
      // Fallback to standard HTML5 Notification
    }
  }

  // Fallback for Web/Browser or if IPC fails
  if (Notification.permission === "granted") {
    new Notification(title, {
      ...options,
      icon: options?.icon || "/icon-192.png"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, {
          ...options,
          icon: options?.icon || "/icon-192.png"
        });
      }
    });
  }
}
