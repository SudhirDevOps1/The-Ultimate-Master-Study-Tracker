import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AppGuide } from "@/components/common/AppGuide";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { DashboardPage } from "@/pages/DashboardPage";
import { TimerPage } from "@/pages/TimerPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SubjectsPage } from "@/pages/SubjectsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { AchievementsPage } from "@/pages/AchievementsPage";
import { GuidePage } from "@/pages/GuidePage";
import { AIAssistantPage } from "@/pages/AIAssistantPage";
import { TodayTasksPage } from "@/pages/TodayTasksPage";
import { AppTrackingPage } from "@/pages/AppTrackingPage";
import { StudyNotesPage } from "@/pages/StudyNotesPage";
import { StudyNotesBoardPage } from "@/pages/StudyNotesBoardPage";
import { useTimer } from "@/hooks/useTimer";

import { VideoRestBreak } from "@/components/timer/VideoRestBreak";

export function App() {
  const initApp = useAppStore((state: AppState) => state.initApp);
  const loading = useAppStore((state: AppState) => state.loading);
  const timer = useAppStore((state) => state.timer);
  const sessions = useAppStore((state) => state.sessions);
  const subjects = useAppStore((state) => state.subjects);
  const { remainingSeconds } = useTimer();

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === timer.activeSessionId) ?? null,
    [sessions, timer.activeSessionId]
  );
  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === activeSession?.subjectId) ?? null,
    [subjects, activeSession]
  );

  useEffect(() => {
    void initApp();
  }, [initApp]);

  useEffect(() => {
    const plannedSecs = (activeSession as any)?.plannedDurationSeconds || activeSession?.durationSeconds || 1500;
    if (activeSession && !timer.isPaused && plannedSecs > 0) {
      const elapsed = plannedSecs - remainingSeconds;
      const progress = Math.max(0, Math.min(1, elapsed / plannedSecs));
      if (typeof window !== "undefined" && (window as any).electron) {
        (window as any).electron.ipcRenderer?.invoke?.("set-taskbar-progress", { progress });
      }
    } else {
      if (typeof window !== "undefined" && (window as any).electron) {
        (window as any).electron.ipcRenderer?.invoke?.("set-taskbar-progress", { progress: -1 });
      }
    }

    if (activeSession && !timer.isPaused) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const hrs = Math.floor(remainingSeconds / 3600);
      const mins = Math.floor((remainingSeconds % 3600) / 60);
      const secs = remainingSeconds % 60;
      const timeStr = hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
      
      document.title = `[${timeStr}] ${activeSubject?.name || "Focus"} - FlowTrack`;
    } else {
      document.title = "FlowTrack - Smart Study Tracker";
    }
    return () => {
      document.title = "FlowTrack - Smart Study Tracker";
    };
  }, [activeSession, remainingSeconds, timer.isPaused, activeSubject]);

  if (loading) {
    return (
      <div className="grid-bg flex min-h-screen items-center justify-center px-6 text-center">
        <div className="glass rounded-3xl border border-white/10 px-8 py-10">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">FlowTrack</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Loading your study workspace</h1>
          <p className="mt-2 text-sm text-slate-300">Preparing sessions, analytics, subjects, and offline data.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <AnimatedRoutes />
        <AppGuide />
        <VideoRestBreak />
      </HashRouter>
    </ErrorBoundary>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <DashboardPage />
              </motion.div>
            }
          />
          <Route
            path="/today"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <TodayTasksPage />
              </motion.div>
            }
          />
          <Route
            path="/timer"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <TimerPage />
              </motion.div>
            }
          />
          <Route
            path="/study-workspace"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <StudyNotesPage />
              </motion.div>
            }
          />
          <Route
            path="/notes-board"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <StudyNotesBoardPage />
              </motion.div>
            }
          />
          <Route
            path="/app-tracking"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <AppTrackingPage />
              </motion.div>
            }
          />
          <Route
            path="/analytics"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <AnalyticsPage />
              </motion.div>
            }
          />
          <Route
            path="/history"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <HistoryPage />
              </motion.div>
            }
          />
          <Route
            path="/subjects"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <SubjectsPage />
              </motion.div>
            }
          />
          <Route
            path="/settings"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <SettingsPage />
              </motion.div>
            }
          />
          <Route
            path="/calendar"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <CalendarPage />
              </motion.div>
            }
          />
          <Route
            path="/achievements"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <AchievementsPage />
              </motion.div>
            }
          />
          <Route
            path="/guide"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <GuidePage />
              </motion.div>
            }
          />
          <Route
            path="/ai"
            element={
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full"
              >
                <AIAssistantPage />
              </motion.div>
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
