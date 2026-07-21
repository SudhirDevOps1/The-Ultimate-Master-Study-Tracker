export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Service workers only work over http/https, not file://
  if (window.location.protocol === "file:") return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js").then(async (registration) => {
      try {
        // Only attempt background sync if supported
        if ("sync" in registration) {
          const sync = (registration as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          }).sync;
          
          if (sync && typeof sync.register === "function") {
            await sync.register("sync-timer").catch((error) => {
              console.warn("[v0] Background sync registration failed:", error);
            });
          }
        }
      } catch (error) {
        // Silently fail background sync registration (optional feature)
        console.debug("[v0] Service worker sync feature not available:", error);
      }
    }).catch((error) => {
      console.debug("[v0] Service worker registration failed:", error);
    });
  });
}
