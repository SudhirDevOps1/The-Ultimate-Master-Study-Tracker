import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { StudySession } from "@/types/models";

export function useScheduleReminder() {
  const sessions = useAppStore((state) => state.sessions);
  const subjects = useAppStore((state) => state.subjects);
  const startSession = useAppStore((state) => state.startSession);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  
  // Track already notified session IDs to prevent double alerts
  const notifiedSessions = useRef<Set<string>>(new Set());

  // Use refs to avoid effect recreation when arrays update
  const sessionsRef = useRef(sessions);
  const subjectsRef = useRef(subjects);
  sessionsRef.current = sessions;
  subjectsRef.current = subjects;

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    
    // Request permission if default
    if (Notification.permission === "default" && notificationsEnabled) {
      void Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    if (!notificationsEnabled) return;

    const checkUpcomingSessions = () => {
      const now = new Date().getTime();
      const planned = sessionsRef.current.filter((s) => s.status === "planned");

      planned.forEach((session: StudySession) => {
        const startTime = new Date(session.startTime).getTime();
        const diffMs = startTime - now;
        const diffMin = diffMs / 60000;

        // Trigger if session is starting in 4.5 to 5.5 minutes
        if (diffMin > 4.5 && diffMin < 5.5) {
          if (!notifiedSessions.current.has(session.id)) {
            notifiedSessions.current.add(session.id);
            
            const subject = subjectsRef.current.find((s) => s.id === session.subjectId);
            const subjectName = subject?.name || "Subject";
            const emoji = subject?.emoji || "📚";
            const url = subject?.url || "";

            const title = `🔔 Study Reminder: ${emoji} ${subjectName}`;
            const body = `Your scheduled session starts in 5 minutes! Ready to focus?${url ? `\nResource: ${url}` : ""}`;

            const notification = new Notification(title, {
              body,
              icon: "/icon-192.png",
              requireInteraction: true,
            });

            notification.onclick = () => {
              try {
                window.focus();
                notification.close();
                // Add a small safety buffer before initiating timer context transition
                setTimeout(() => {
                  void startSession(session.id);
                }, 100);
              } catch (err) {
                console.error("Failed to start session via notification trigger:", err);
              }
            };
          }
        }
      });
    };

    // Run immediately and then every 30 seconds without triggers dependency loop
    checkUpcomingSessions();
    const interval = setInterval(checkUpcomingSessions, 30000);

    return () => clearInterval(interval);
  }, [startSession, notificationsEnabled]);
}
