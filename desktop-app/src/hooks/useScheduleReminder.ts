import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { StudySession } from "@/types/models";

// Persistent Session Notification Key Helper
function isNotifiedInStorage(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function markNotifiedInStorage(key: string) {
  try {
    sessionStorage.setItem(key, "true");
  } catch {
    // ignore
  }
}

export function useScheduleReminder() {
  const sessions = useAppStore((state) => state.sessions);
  const subjects = useAppStore((state) => state.subjects);
  const startSession = useAppStore((state) => state.startSession);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);

  // In-memory set backed by sessionStorage to prevent duplicate alerts across re-renders
  const notifiedKeys = useRef<Set<string>>(new Set());

  // Use refs to avoid effect recreation when arrays update
  const sessionsRef = useRef(sessions);
  const subjectsRef = useRef(subjects);
  sessionsRef.current = sessions;
  subjectsRef.current = subjects;

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default" && notificationsEnabled) {
      void Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    if (!notificationsEnabled) return;

    const checkUpcomingSessions = () => {
      const now = Date.now();
      const planned = sessionsRef.current.filter((s) => s.status === "planned");

      planned.forEach((session: StudySession) => {
        const startTime = new Date(session.startTime).getTime();
        const diffMs = startTime - now;
        const diffMin = diffMs / 60000;

        let milestoneKey: string | null = null;
        let title = "";
        let body = "";

        // ── Milestone 1: 5 Minutes Before Session (Between 4.0 and 5.5 min) ──────
        if (diffMin >= 4.0 && diffMin <= 5.5) {
          milestoneKey = `notified_5min_${session.id}`;
          const subject = subjectsRef.current.find((s) => s.id === session.subjectId);
          const subjectName = subject?.name || "Subject";
          const emoji = subject?.emoji || "📚";
          const url = subject?.url || "";

          title = `🔔 Study Reminder: ${emoji} ${subjectName}`;
          body = `Your scheduled session starts in 5 minutes! Ready to focus?${url ? `\nResource: ${url}` : ""}`;
        }
        // ── Milestone 2: Exact Start Time (Between -1.0 and 1.0 min) ──────────────
        else if (diffMin >= -1.0 && diffMin <= 1.0) {
          milestoneKey = `notified_start_${session.id}`;
          const subject = subjectsRef.current.find((s) => s.id === session.subjectId);
          const subjectName = subject?.name || "Subject";
          const emoji = subject?.emoji || "📚";

          title = `🚀 Session Starting: ${emoji} ${subjectName}`;
          body = `Your scheduled study time has arrived! Click to launch timer.`;
        }

        if (!milestoneKey) return;

        // Strict Check: Skip if already notified in memory OR sessionStorage
        if (notifiedKeys.current.has(milestoneKey) || isNotifiedInStorage(milestoneKey)) {
          return;
        }

        // Mark as notified IMMEDIATELY before triggering alert
        notifiedKeys.current.add(milestoneKey);
        markNotifiedInStorage(milestoneKey);

        // Send Notification via Electron IPC Toast (if in Electron) or HTML5 Notification
        if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
          try {
            void (window as any).electron.ipcRenderer.invoke("send-windows-toast", { title, message: body });
            return;
          } catch (e) {
            console.error("Failed to send Windows Toast IPC:", e);
          }
        }

        // HTML5 Web Notification Fallback
        try {
          const notification = new Notification(title, {
            body,
            icon: "/icon-192.png",
            tag: milestoneKey, // Tag guarantees OS deduplication/replacement
            requireInteraction: false, // Auto-dismiss after 6s to prevent stacking windows
          });

          notification.onclick = () => {
            try {
              window.focus();
              notification.close();
              setTimeout(() => {
                void startSession(session.id);
              }, 100);
            } catch (err) {
              console.error("Failed to start session via notification click:", err);
            }
          };
        } catch (err) {
          console.error("HTML5 Notification creation failed:", err);
        }
      });
    };

    // Check every 30 seconds
    checkUpcomingSessions();
    const interval = setInterval(checkUpcomingSessions, 30000);

    return () => clearInterval(interval);
  }, [startSession, notificationsEnabled]);
}
