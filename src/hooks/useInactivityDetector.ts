import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

const INACTIVITY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const ELECTRON_POLL_MS        = 15_000;          // check every 15s via Windows API
const BROWSER_CHECK_MS        = 30_000;          // check every 30s via DOM events

/**
 * Detects user inactivity and auto-pauses the study session.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  In Electron (Desktop App)                                              │
 * │  Uses Windows  GetLastInputInfo  API via IPC — returns the REAL system  │
 * │  idle time including keyboard, mouse, touchpad — even when the window   │
 * │  is MINIMIZED or the app is in the background. Like ActivityWatch.      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  In Browser (fallback)                                                  │
 * │  Tracks DOM events (mousemove, keydown, touchstart, wheel …).           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * After 10 minutes of NO input → session is auto-paused + notification shown.
 * When user moves mouse / types again → session resumes automatically.
 */
export function useInactivityDetector() {
  const timer               = useAppStore((s) => s.timer);
  const strictFocusMode     = useAppStore((s) => s.strictFocusMode);
  const notificationsEnabled= useAppStore((s) => s.notificationsEnabled);
  const pauseSession        = useAppStore((s) => s.pauseSession);
  const resumeSession       = useAppStore((s) => s.resumeSession);
  const markTimerInteraction= useAppStore((s) => s.markTimerInteraction);

  const hasAutoPausedRef    = useRef(false);
  const lastDOMActivityRef  = useRef(Date.now());

  // Detect if running inside Electron
  const isElectron = typeof window !== "undefined" && !!(window as any).require;

  // ── Electron path: poll Windows GetLastInputInfo ──────────────────────────
  useEffect(() => {
    // Only run in Electron; only when a session is active; only in strict mode
    if (!isElectron || !strictFocusMode || !timer.activeSessionId) return;

    let ipcRenderer: any;
    try {
      ipcRenderer = (window as any).require("electron").ipcRenderer;
    } catch {
      return; // not inside Electron
    }

    const check = async () => {
      const state = useAppStore.getState();
      // Re-read live state (avoids stale closure)
      if (!state.timer.activeSessionId) return;

      let idleMs = 0;
      try {
        idleMs = await ipcRenderer.invoke("get-idle-time-ms") as number;
      } catch {
        return;
      }

      if (idleMs >= INACTIVITY_THRESHOLD_MS) {
        if (!hasAutoPausedRef.current && !state.timer.isPaused) {
          hasAutoPausedRef.current = true;
          console.log(`[InactivityDetector] ${Math.round(idleMs / 60000)}min idle → auto-pausing`);

          void state.pauseSession();

          if (notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("FlowTrack – Session Auto-Paused", {
              body: `No keyboard/mouse activity for ${Math.round(idleMs / 60000)} minutes.\nSession paused — move to resume.`,
              icon: "/icon-192.png",
              tag:  "flowtrack-autopause",
            });
          }
        }
      } else {
        // User is active again
        if (hasAutoPausedRef.current) {
          hasAutoPausedRef.current = false;
          // Auto-resume the session
          void state.resumeSession();
        }
        // Update last interaction timestamp so timer knows user is active
        void state.markTimerInteraction(Date.now() - idleMs);
      }
    };

    const interval = setInterval(() => void check(), ELECTRON_POLL_MS);
    void check();
    return () => clearInterval(interval);
  }, [isElectron, strictFocusMode, timer.activeSessionId, notificationsEnabled]);

  // ── Browser / non-Electron fallback: DOM event tracking ──────────────────
  const recordDOMActivity = useCallback(() => {
    lastDOMActivityRef.current = Date.now();
    hasAutoPausedRef.current   = false;
    void markTimerInteraction();
  }, [markTimerInteraction]);

  useEffect(() => {
    if (isElectron) return;              // Electron uses the IPC path above
    if (!strictFocusMode || !timer.activeSessionId || timer.isPaused) return;

    const events = ["mousemove","mousedown","keydown","keypress","scroll","touchstart","touchmove","wheel"] as const;
    events.forEach(e => document.addEventListener(e, recordDOMActivity, { passive: true, capture: true }));

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastDOMActivityRef.current;
      const state  = useAppStore.getState();
      if (!state.timer.activeSessionId || state.timer.isPaused) return;

      if (idleMs >= INACTIVITY_THRESHOLD_MS && !hasAutoPausedRef.current) {
        hasAutoPausedRef.current = true;
        void state.pauseSession();
        if (notificationsEnabled && Notification.permission === "granted") {
          new Notification("FlowTrack – Auto Pause", {
            body: `No activity for ${Math.round(idleMs / 60000)} minutes. Session paused.`,
            icon: "/icon-192.png",
            tag:  "flowtrack-autopause",
          });
        }
      }
    }, BROWSER_CHECK_MS);

    return () => {
      events.forEach(e => document.removeEventListener(e, recordDOMActivity, { capture: true }));
      clearInterval(interval);
    };
  }, [isElectron, strictFocusMode, timer.activeSessionId, timer.isPaused, notificationsEnabled, recordDOMActivity]);

  return { lastActivityTime: lastDOMActivityRef.current };
}
