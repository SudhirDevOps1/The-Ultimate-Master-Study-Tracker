import { sendNotification } from '@/utils/notification';
import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

const INACTIVITY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
// FIX P5: Increased poll interval 2s → 5s to reduce win-tracker.exe spawns
// Each execFile call creates a new child process — 30/min was causing CPU spikes
const SYSTEM_POLL_MS = 5_000;

/**
 * HYBRID SMART INACTIVITY DETECTOR (DUAL-LAYER ENGINE)
 *
 * LAYER 1: Win32 API (Hardware-Level System Idle Tracker)
 *  - Polls Windows GetLastInputInfo via Electron IPC
 *  - Tracks hardware Mouse, Keyboard, Touchpad, Stylus, Gamepad
 *  - Works globally even when FlowTrack is minimized or in System Tray!
 *
 * LAYER 2: In-App DOM Event Watcher (Instant Reaction Engine)
 *  - Captures instant mousemove, keydown, scroll, touchstart, wheel events
 *  - Instantly resets idle timer without waiting for IPC poll
 */
export function useInactivityDetector() {
  const timer                = useAppStore((s) => s.timer);
  const strictFocusMode      = useAppStore((s) => s.strictFocusMode);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);

  const hasAutoPausedRef     = useRef(false);
  const lastInteractionMsRef = useRef<number>(Date.now());

  const isElectron = typeof window !== "undefined" && (!!(window as any).electron?.isElectron || !!(window as any).require);

  // ── LAYER 2: Instant In-App DOM Activity Watcher ─────────────────────────
  // FIX P4: Removed redundant IndexedDB write from recordDOMActivity.
  // Previously, BOTH useTimer.ts AND useInactivityDetector wrote to DB on every
  // event. Now only the ref is updated here; DB writes happen via the throttled
  // markTimerInteraction in useTimer.ts which is already attached to the same events.
  const recordDOMActivity = useCallback(() => {
    const now = Date.now();
    lastInteractionMsRef.current = now;

    const state = useAppStore.getState();

    // If auto-paused by inactivity, instant DOM interaction resumes session
    if (hasAutoPausedRef.current && state.timer.activeSessionId && state.timer.isPaused) {
      hasAutoPausedRef.current = false;
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
    if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      try {
        ipcRenderer = (window as any).electron.ipcRenderer;
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
          /* Fallback to DOM idle tracking */
        }
      }

      // Check Inactivity threshold (10 minutes)
      if (effectiveIdleMs >= INACTIVITY_THRESHOLD_MS) {
        if (!hasAutoPausedRef.current && !state.timer.isPaused) {
          hasAutoPausedRef.current = true;
          const mins = Math.round(effectiveIdleMs / 60000);
          // FIX V3: Removed console.log — production builds shouldn't leak
          // activity metadata (idle time, session events) to DevTools

          void state.pauseSession();

          if (notificationsEnabled) {
            const title = "⏸️ FlowTrack – Session Auto-Paused";
            const body = `No activity detected for ${mins} minutes.\nSession paused — move mouse or type to resume.`;
            if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
              try {
                void (window as any).electron.ipcRenderer.invoke("send-windows-toast", { title, message: body });
              } catch {
                /* fallback */
              }
            } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                sendNotification(title, {
                  body,
                  icon: "/icon-192.png",
                  tag: "flowtrack-autopause",
                });
              } catch {
                /* ignore */
              }
            }
          }
        }
      } else {
        // Active again
        if (hasAutoPausedRef.current && state.timer.isPaused) {
          hasAutoPausedRef.current = false;
          // FIX V3: Removed console.log
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
