import { useMemo } from "react";
import { isSameDay } from "date-fns";
import { useAppStore } from "@/store/useAppStore";

export function useSessions() {
  const sessions = useAppStore((state) => state.sessions);
  const subjects = useAppStore((state) => state.subjects);

  const todaySessions = useMemo(
    () => sessions.filter((session) => isSameDay(new Date(session.startTime), new Date())),
    [sessions]
  );

  return { sessions, subjects, todaySessions };
}
