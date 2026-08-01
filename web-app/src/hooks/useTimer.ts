import { useEffect, useMemo, useState, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";

function playCompletionSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.error("Audio beep failed", e);
  }
}

export function useTimer() {
  const timer = useAppStore((state) => state.timer);
  const sessions = useAppStore((state) => state.sessions);
  const strictFocusMode = useAppStore((state) => state.strictFocusMode);
  const pauseSession = useAppStore((state) => state.pauseSession);
  const setHiddenAt = useAppStore((state) => state.setHiddenAt);
  const markTimerInteraction = useAppStore((state) => state.markTimerInteraction);
  const getActiveElapsed = useAppStore((state) => state.getActiveElapsed);
  const syncActiveSession = useAppStore((state) => state.syncActiveSession);
  const [nowMs, setNowMs] = useState(Date.now());
  const notifiedSessionsRef = useRef<Set<string>>(new Set());
  const hasStoppedRef = useRef<Set<string>>(new Set()); // FIX B2: Guard against double-stop

  // ─── 1-second tick: sync elapsed, check inactivity & completion ──────────
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setNowMs(now);

      const state = useAppStore.getState();
      const currentTimer = state.timer;

      // Strict Focus Mode inactivity check
      if (
        state.strictFocusMode &&
        currentTimer.activeSessionId &&
        !currentTimer.isPaused &&
        currentTimer.lastInteractionAtMs
      ) {
        const inactiveMs = now - currentTimer.lastInteractionAtMs;
        if (inactiveMs >= 10 * 60 * 1000) { // 10 minutes
          void state.pauseSession();
          if (state.notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("FlowTrack - Inactivity Auto-Pause", {
              body: "Your study session was auto-paused due to 10 minutes of inactivity. Stay focused! 🔒",
              icon: "/icon-192.png",
            });
          }
        }
      }

      // Study Target Over Notification Check
      if (currentTimer.activeSessionId && !currentTimer.isPaused) {
        const activeSession = state.sessions.find(s => s.id === currentTimer.activeSessionId);
        if (activeSession && activeSession.plannedMinutes > 0) {
          const elapsed = state.getActiveElapsed(now);
          const plannedSeconds = activeSession.plannedMinutes * 60;
          if (elapsed >= plannedSeconds && !notifiedSessionsRef.current.has(currentTimer.activeSessionId)) {
            notifiedSessionsRef.current.add(currentTimer.activeSessionId);
            playCompletionSound();
            if (state.notificationsEnabled && typeof Notification !== "undefined") {
              const subjectName = state.subjects.find(s => s.id === activeSession.subjectId)?.name || "Subject";
              const title = "FlowTrack - Study Target Reached! 🎉";
              const body = `Congratulations! You have completed your planned study target of ${activeSession.plannedMinutes} minutes for ${subjectName}.`;

              if (Notification.permission === "granted") {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.ready.then(registration => {
                    void registration.showNotification(title, {
                      body,
                      icon: "/icon-192.png",
                      badge: "/icon-192.png",
                      vibrate: [100, 50, 100],
                    } as any);
                  });
                } else {
                  new Notification(title, { body, icon: "/icon-192.png" });
                }
              } else if (Notification.permission === "default") {
                Notification.requestPermission().then(permission => {
                  if (permission === "granted") {
                    new Notification(title, { body, icon: "/icon-192.png" });
                  }
                });
              }
            }

            // FIX B2: Use hasStoppedRef to guard against double-stop race condition.
            // Without this, if user clicks Stop during the 500ms window, stopSession
            // fires twice which can corrupt session data.
            if (!hasStoppedRef.current.has(currentTimer.activeSessionId)) {
              hasStoppedRef.current.add(currentTimer.activeSessionId);
              setTimeout(async () => {
                await state.stopSession();
              }, 500);
            }
          }
        }
      }

      void syncActiveSession(now);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [syncActiveSession]);

  // ─── Visibility & focus events ───────────────────────────────────────────
  useEffect(() => {
    const onVisibleInteraction = () => {
      if (document.hidden) return;
      void markTimerInteraction(Date.now());
      setNowMs(Date.now());
    };

    const updateVisibility = () => {
      const state = useAppStore.getState();
      const isPipActive = state.isPipActive;
      const autoPauseOnHidden = state.autoPauseOnHidden;
      const strictFocusMode = state.strictFocusMode;

      if (document.hidden) {
        void setHiddenAt(Date.now());
        void syncActiveSession(Date.now());

        // Standard Timing mode (strictFocusMode: false) NEVER pauses on window switch!
        // Only pause if strictFocusMode is active AND autoPauseOnHidden is explicitly true AND not in PiP mode
        if (strictFocusMode && autoPauseOnHidden && !isPipActive) {
          void pauseSession();
        }
        return;
      }

      // Tab / window became visible again — resume tracking
      void setHiddenAt(null);
      void markTimerInteraction(Date.now());
      void syncActiveSession(Date.now());
      setNowMs(Date.now());
    };

    const syncOnExit = () => {
      const state = useAppStore.getState();
      void syncActiveSession(Date.now());
    };

    const syncOnFocus = () => {
      void markTimerInteraction(Date.now());
      void syncActiveSession(Date.now());
      setNowMs(Date.now());
    };

    const interactionEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "mousemove", "touchstart", "wheel"];

    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("pagehide", syncOnExit);
    window.addEventListener("beforeunload", syncOnExit);
    window.addEventListener("focus", syncOnFocus);
    interactionEvents.forEach((eventName) => window.addEventListener(eventName, onVisibleInteraction, { passive: true }));

    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("pagehide", syncOnExit);
      window.removeEventListener("beforeunload", syncOnExit);
      window.removeEventListener("focus", syncOnFocus);
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, onVisibleInteraction));
    };
  }, [markTimerInteraction, pauseSession, setHiddenAt, strictFocusMode, syncActiveSession]);

  // ─── App-tracking: Poll active window via local Python backend ───────────
  // Works when user runs START_BACKEND.bat on their PC + opens web-app in browser.
  // Automatically disables when backend is not running (e.g. Vercel-only access).
  useEffect(() => {
    let activeInterval: number | undefined;

    const pollActiveWindow = async () => {
      const state = useAppStore.getState();
      if (!state.isBackendConnected || !state.backendUrl) {
        state.setActiveWindow("");
        return;
      }
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`${state.backendUrl}/active-window`, { signal: controller.signal });
        const data = await res.json();
        if (data && typeof data.title === "string") {
          state.setActiveWindow(data.title);
        }
      } catch {
        state.setActiveWindow("");
      }
    };

    activeInterval = window.setInterval(pollActiveWindow, 5000);
    void pollActiveWindow();

    return () => { if (activeInterval) window.clearInterval(activeInterval); };
  }, []);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === timer.activeSessionId) ?? null,
    [sessions, timer.activeSessionId]
  );

  const elapsedSeconds = getActiveElapsed(nowMs);
  const plannedSeconds = (activeSession?.plannedMinutes ?? 0) * 60;
  const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds);
  const progress = plannedSeconds > 0 ? Math.min(100, (elapsedSeconds / plannedSeconds) * 100) : 0;

  return { activeSession, elapsedSeconds, remainingSeconds, progress };
}
