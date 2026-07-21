import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * Hook to detect user inactivity and auto-pause sessions
 * When Strict Focus Mode is enabled, auto-pauses after 10 minutes of no activity
 */
export function useInactivityDetector() {
  const strictFocusMode = useAppStore((state) => state.strictFocusMode);
  const timer = useAppStore((state) => state.timer);
  const pauseSession = useAppStore((state) => state.pauseSession);
  const markTimerInteraction = useAppStore((state) => state.markTimerInteraction);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const hasNotifiedRef = useRef<boolean>(false);
  const INACTIVITY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Record user interaction
   */
  const recordInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    hasNotifiedRef.current = false;

    // Mark interaction in store
    void markTimerInteraction();
  }, [markTimerInteraction]);

  /**
   * Setup activity listeners
   */
  useEffect(() => {
    if (!strictFocusMode || !timer.activeSessionId) {
      return;
    }

    const handleActivity = () => recordInteraction();

    // Add listeners
    document.addEventListener("mousemove", handleActivity, true);
    document.addEventListener("mousedown", handleActivity, true);
    document.addEventListener("keydown", handleActivity, true);
    document.addEventListener("scroll", handleActivity, true);
    document.addEventListener("touchstart", handleActivity, true);
    document.addEventListener("touchmove", handleActivity, true);

    return () => {
      document.removeEventListener("mousemove", handleActivity, true);
      document.removeEventListener("mousedown", handleActivity, true);
      document.removeEventListener("keydown", handleActivity, true);
      document.removeEventListener("scroll", handleActivity, true);
      document.removeEventListener("touchstart", handleActivity, true);
      document.removeEventListener("touchmove", handleActivity, true);
    };
  }, [strictFocusMode, timer.activeSessionId, recordInteraction]);

  /**
   * Check for inactivity and auto-pause
   */
  useEffect(() => {
    if (!strictFocusMode || !timer.activeSessionId || timer.isPaused) {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    inactivityTimerRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteractionRef.current;

      if (timeSinceLastInteraction >= INACTIVITY_THRESHOLD_MS && !hasNotifiedRef.current) {
        hasNotifiedRef.current = true;

        // Send notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("FlowTrack - Auto Pause", {
            body: "No activity detected for 10 minutes. Your session has been paused.",
            tag: "flowtrack-autopause",
            badge: "🤖"
          });
        }

        // Auto-pause the session
        console.log("[v0] Auto-pausing session due to 10-minute inactivity");
        void pauseSession();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [strictFocusMode, timer.activeSessionId, timer.isPaused, pauseSession]);

  return {
    lastInteractionTime: lastInteractionRef.current,
    recordInteraction
  };
}
