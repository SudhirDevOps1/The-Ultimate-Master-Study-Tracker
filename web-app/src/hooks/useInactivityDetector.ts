import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

const INACTIVITY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const SYSTEM_POLL_MS          = 5_000;          // Check Win32 API every 5s for fast response

/**
 * 💥 HYBRID SMART INACTIVITY DETECTOR (DUAL-LAYER ENGINE)
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LAYER 1: Win32 API (Hardware-Level System Idle Tracker)                  │
 * │  - Polls Windows GetLastInputInfo via Electron IPC                       │
 * │  - Tracks hardware Mouse, Keyboard, Touchpad, Stylus, Gamepad            │
 * │  - Works globally even when FlowTrack is minimized or in System Tray!     │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ LAYER 2: In-App DOM Event Watcher (Instant Reaction Engine)               │
 * │  - Captures instant mousemove, keydown, scroll, touchstart, wheel events  │
 * │  - Instantly resets idle timer & resumes session without waiting for IPC │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function useInactivityDetector() {
  const timer                = useAppStore((s) => s.timer);
  const strictFocusMode      = useAppStore((s) => s.strictFocusMode);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const markTimerInteraction = useAppStore((s) => s.markTimerInteraction);

  const hasAutoPausedRef     = useRef(false);
  const lastInteractionMsRef = useRef<number>(Date.now());

  const isElectron = typeof window !== "undefined" && !!(window as any).require;

  // ── LAYER 2: Instant In-App DOM Activity Watcher ─────────────────────────
  const recordDOMActivity = useCallback(() => {
    const now = Date.now();
    lastInteractionMsRef.current = now;

    const state = useAppStore.getState();
    void state.markTimerInteraction(now);

    // If auto-paused, instant DOM interaction in-app immediately resumes!
    if (hasAutoPausedRef.current && state.timer.activeSessionId && state.timer.isPaused) {
      hasAutoPausedRef.current = false;
      console.log("[HybridInactivity] Instant In-App DOM activity detected -> Auto Resuming session!");
      void state.resumeSession();
    }
  }, []);

  useEffect(() => {
    if (!strictFocusMode || !timer.activeSessionId) return;

    const events = [
      "mousemove", "mousedown", "mouseup", "keydown", "keypress",
      "scroll", "touchstart", "touchmove", "wheel", "pointerdown", "focus"
    ] as const;

    events.forEach((e) => document.addEventListener(e, recordDOMActivity, { passive: true, capture: true }));

    return () => {
      events.forEach((e) => document.removeEventListener(e, recordDOMActivity, { capture: true }));
    };
  }, [strictFocusMode, timer.activeSessionId, recordDOMActivity]);

  // ── LAYER 1: Win32 API Hardware Polling + Hybrid Decision Engine ──────────
  useEffect(() => {
    if (!strictFocusMode || !timer.activeSessionId) return;

    let ipcRenderer: any = null;
    if (isElectron) {
      try {
        ipcRenderer = (window as any).require("electron").ipcRenderer;
      } catch {
        ipcRenderer = null;
      }
    }

    const checkHybridInactivity = async () => {
      const state = useAppStore.getState();
      if (!state.timer.activeSessionId) return;

      let effectiveIdleMs = Date.now() - lastInteractionMsRef.current;

      // Query Win32 API if in Electron
      if (ipcRenderer) {
        try {
          const hardwareIdleMs = await ipcRenderer.invoke("get-idle-time-ms") as number;
          // Hybrid logic: Take the minimum of hardware idle and DOM idle
          effectiveIdleMs = Math.min(hardwareIdleMs, effectiveIdleMs);
        } catch {
          /* Fallback to DOM idle */
        }
      }

      // Check Inactivity threshold (10 Mins)
      if (effectiveIdleMs >= INACTIVITY_THRESHOLD_MS) {
        if (!hasAutoPausedRef.current && !state.timer.isPaused) {
          hasAutoPausedRef.current = true;
          const mins = Math.round(effectiveIdleMs / 60000);
          console.log(`[HybridInactivity] ${mins}min hardware/software idle -> Auto-pausing session`);

          void state.pauseSession();

          if (notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("FlowTrack – Session Auto-Paused", {
              body: `No activity detected for ${mins} minutes.\nSession paused — move mouse or type to resume.`,
              icon: "/icon-192.png",
              tag:  "flowtrack-autopause",
            });
          }
        }
      } else {
        // Active again
        if (hasAutoPausedRef.current && state.timer.isPaused) {
          hasAutoPausedRef.current = false;
          console.log("[HybridInactivity] Activity resumed -> Auto Resuming session!");
          void state.resumeSession();
        }
        void state.markTimerInteraction(Date.now() - effectiveIdleMs);
      }
    };

    const interval = setInterval(() => void checkHybridInactivity(), SYSTEM_POLL_MS);
    void checkHybridInactivity();

    return () => clearInterval(interval);
  }, [isElectron, strictFocusMode, timer.activeSessionId, notificationsEnabled]);

  return { lastActivityTime: lastInteractionMsRef.current };
}
