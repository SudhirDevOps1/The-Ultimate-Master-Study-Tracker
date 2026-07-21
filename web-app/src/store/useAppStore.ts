import { create } from "zustand";
import { db } from "@/lib/db";
import { calcPlannedMinutes } from "@/utils/time";
import { createMockSessions, createMockSubjects } from "@/utils/mockData";
import { applyTheme, getThemeColors } from "@/utils/themes";
import { getInitialAchievements, calculateAchievements } from "@/utils/achievements";
import type { StudySession, Subject, TimerSnapshot, ThemeName, Achievement, AchievementType, RecurrenceConfig, SessionStatus, UserProfile, AiConfig, AppSettings } from "@/types/models";
import { format, subDays } from "date-fns";
import type { CloudSyncStatus, CloudUser } from "@/types/models";

interface CreateSessionInput {
  subjectId: string;
  startTime: string;
  endTime: string;
  colorTag: string;
  notes: string;
  tags: string[];
}

export interface AppState {
  subjects: Subject[];
  sessions: StudySession[];
  timer: TimerSnapshot;
  loading: boolean;
  pomodoroMode: boolean;
  strictFocusMode: boolean;
  autoPauseOnHidden: boolean;
  dailyGoalHours: number;
  weeklyTargetHours: number;
  focusMusicEnabled: boolean;
  notificationsEnabled: boolean;
  keyboardShortcutsEnabled: boolean;
  theme: ThemeName;
  achievements: Achievement[];
  dailyGoalHitStreak: number;
  totalXP: number;
  level: number;
  rank: string;
  xpToNextLevel: number;
  xpProgress: number; // 0-100
  isPipActive: boolean;
  setIsPipActive: (active: boolean) => void;
  profile: UserProfile;
  setUserProfile: (profile: UserProfile) => Promise<void>;
  cloudSyncStatus: CloudSyncStatus;
  setCloudSyncStatus: (status: CloudSyncStatus) => void;
  user: CloudUser | null;
  setUser: (user: CloudUser | null) => void;
  aiConfig: AiConfig;
  setAiConfig: (config: AiConfig) => Promise<void>;
  autoCarryForward: boolean;
  setAutoCarryForward: (enabled: boolean) => void;
  activeWindow: string;
  setActiveWindow: (title: string) => void;
  backendStats: any | null;
  backendActivities: any[];
  isBackendConnected: boolean;
  backendUrl: string;
  setBackendUrl: (url: string) => Promise<void>;
  fetchBackendData: () => Promise<void>;
  updateDailyGoalStreak: (newSessions: StudySession[]) => Promise<void>;
  initApp: () => Promise<void>;
  createSubject: (name: string, color: string, emoji?: string, weeklyGoalMinutes?: number) => Promise<void>;
  updateSubject: (id: string, name: string, color: string, emoji?: string, weeklyGoalMinutes?: number) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  createSession: (input: CreateSessionInput) => Promise<void>;
  updateSession: (session: StudySession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  importAll: (subjects: Subject[], sessions: StudySession[], settings?: AppSettings[], activities?: any[]) => Promise<void>;
  addManualEntry: (input: {
    subjectId: string;
    date: string;
    hours: number;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  startSession: (sessionId: string) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  setHiddenAt: (ms: number | null) => Promise<void>;
  markTimerInteraction: (ms?: number) => Promise<void>;
  getActiveElapsed: (nowMs: number) => number;
  syncActiveSession: (nowMs?: number) => Promise<void>;
  setPomodoroMode: (enabled: boolean) => void;
  setStrictFocusMode: (enabled: boolean) => void;
  setAutoPauseOnHidden: (enabled: boolean) => void;
  setDailyGoalHours: (hours: number) => void;
  setWeeklyTargetHours: (hours: number) => void;
  setFocusMusicEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setKeyboardShortcutsEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemeName) => void;
  recalculateAchievements: () => void;
  setDailyGoalHitStreak: (streak: number) => void;
  cloneSession: (sessionId: string, targetDate: string) => Promise<void>;
  rescheduleSession: (sessionId: string, targetDate: string) => Promise<void>;
  moveSessionToNextDay: (sessionId: string) => Promise<void>;
  createRecurringSessions: (sessionId: string, config: RecurrenceConfig) => Promise<void>;
  bulkReschedule: (sessionIds: string[], offsetDays: number) => Promise<void>;
}

const defaultTimer: TimerSnapshot = {
  activeSessionId: null,
  startedAtMs: null,
  accumulatedSeconds: 0,
  pausedAtMs: null,
  isPaused: false,
  hiddenAtMs: null,
  lastInteractionAtMs: null,
};

const STRICT_INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

// Simple operation lock to prevent race conditions between concurrent session operations
let sessionOperationInProgress = false;

async function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  // Wait for any ongoing operation to complete
  while (sessionOperationInProgress) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  sessionOperationInProgress = true;
  try {
    return await operation();
  } finally {
    sessionOperationInProgress = false;
  }
}

async function saveTimer(timer: TimerSnapshot): Promise<void> {
  await db.settings.put({ key: "timer", value: JSON.stringify(timer) });
}

function sortSessions(sessions: StudySession[]) {
  return [...sessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

function calculateTotalActiveDays(sessions: StudySession[]): number {
  const days = new Set<string>();
  sessions.forEach((s) => {
    if (s.actualSeconds > 0) {
      const day = new Date(s.startTime).toDateString();
      days.add(day);
    }
  });
  return days.size;
}
function calculateGamificationStats(sessions: StudySession[]) {
  const totalSeconds = sessions.reduce((sum, s) => sum + s.actualSeconds, 0);
  const totalXP = Math.floor(totalSeconds / 36);
  const level = Math.floor(totalXP / 1000) + 1;
  const xpInCurrentLevel = totalXP % 1000;
  const xpProgress = (xpInCurrentLevel / 1000) * 100;
  const xpToNextLevel = 1000 - xpInCurrentLevel;

  let rank = "Seeker";
  if (level > 50) rank = "Zen Sage";
  else if (level > 40) rank = "Grandmaster";
  else if (level > 30) rank = "Master";
  else if (level > 20) rank = "Architect";
  else if (level > 10) rank = "Scholar";

  return { totalXP, level, rank, xpToNextLevel, xpProgress };
}

function clampElapsedSeconds(_session: StudySession | undefined, elapsedSeconds: number) {
  return Math.max(0, Math.floor(elapsedSeconds));
}

export const useAppStore = create<AppState>()((set: any, get: any) => ({
  subjects: [],
  sessions: [],
  timer: defaultTimer,
  loading: true,
  pomodoroMode: false,
  strictFocusMode: false,
  autoPauseOnHidden: true,
  dailyGoalHours: 4,
  weeklyTargetHours: 20,
  focusMusicEnabled: false,
  notificationsEnabled: true,
  keyboardShortcutsEnabled: true,
  theme: "default",
  achievements: getInitialAchievements(),
  dailyGoalHitStreak: 0,
  totalXP: 0,
  level: 1,
  rank: "Seeker",
  xpToNextLevel: 1000,
  xpProgress: 0,
  isPipActive: false,

  profile: { name: "", age: "", profession: "", goal: "" },
  cloudSyncStatus: "idle",
  user: null,
  aiConfig: { provider: "local_rules", apiKey: "", model: "", ollamaUrl: "http://localhost:11434" },
  autoCarryForward: true,
  activeWindow: "Desktop / Idle",
  backendStats: null,
  backendActivities: [],
  isBackendConnected: false,
  backendUrl: "http://localhost:5001",
  setBackendUrl: async (url: string) => {
    let cleanUrl = url.trim().replace(/\/$/, "");
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "http://" + cleanUrl;
    }
    await db.settings.put({ key: "backendUrl", value: cleanUrl });
    set({ backendUrl: cleanUrl });
    void get().fetchBackendData();
  },
  fetchBackendData: async () => {
    const url = get().backendUrl;
    if (!url) {
      set({ isBackendConnected: false });
      return;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const statsRes = await fetch(`${url}/stats?range=all`, { signal: controller.signal });
      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      const statsData = await statsRes.json();
      
      const activitiesRes = await fetch(`${url}/export?type=activities&format=json`, { signal: controller.signal });
      if (!activitiesRes.ok) throw new Error("Failed to fetch activities");
      const activitiesData = await activitiesRes.json();
      clearTimeout(timeoutId);

      set({
        backendStats: statsData,
        backendActivities: activitiesData.activities || [],
        isBackendConnected: true
      });
    } catch (e) {
      set({ isBackendConnected: false });
    }
  },

  initApp: async () => {
    try {
      const [subjects, sessions, timerSetting, pomodoroSetting, goalSetting, strictFocusSetting, weeklyTargetSetting, focusMusicSetting, notificationsSetting, keyboardShortcutsSetting, themeSetting, achievementsSetting, dailyGoalHitStreakSetting, autoPauseOnHiddenSetting, profileSetting, aiConfigSetting, autoCarryForwardSetting, backendUrlSetting] = await Promise.all([
        db.subjects.toArray(),
        db.sessions.toArray(),
        db.settings.get("timer"),
        db.settings.get("pomodoroMode"),
        db.settings.get("dailyGoalHours"),
        db.settings.get("strictFocusMode"),
        db.settings.get("weeklyTargetHours"),
        db.settings.get("focusMusicEnabled"),
        db.settings.get("notificationsEnabled"),
        db.settings.get("keyboardShortcutsEnabled"),
        db.settings.get("theme"),
        db.settings.get("achievements"),
        db.settings.get("dailyGoalHitStreak"),
        db.settings.get("autoPauseOnHidden"),
        db.settings.get("user_profile"),
        db.settings.get("ai_config"),
        db.settings.get("autoCarryForward"),
        db.settings.get("backendUrl"),
      ]);

      let finalSessions = [...sessions];
      const autoCarryEnabled = autoCarryForwardSetting ? autoCarryForwardSetting.value === "true" : true;

      if (autoCarryEnabled && subjects.length > 0 && sessions.length > 0) {
        const todayStr = new Date().toDateString();
        const todaySessions = sessions.filter(s => new Date(s.startTime).toDateString() === todayStr);
        
        if (todaySessions.length === 0) {
          const pastSessions = sessions
            .filter(s => new Date(s.startTime).getTime() < new Date().setHours(0,0,0,0))
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
          
          if (pastSessions.length > 0) {
            const lastActiveDateStr = new Date(pastSessions[0].startTime).toDateString();
            const sessionsToClone = pastSessions.filter(s => new Date(s.startTime).toDateString() === lastActiveDateStr);
            
            const clonedList: StudySession[] = [];
            for (const s of sessionsToClone) {
              const origStart = new Date(s.startTime);
              const origEnd = new Date(s.endTime);
              
              const todayStart = new Date();
              todayStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
              
              const todayEnd = new Date();
              todayEnd.setHours(origEnd.getHours(), origEnd.getMinutes(), 0, 0);
              if (todayEnd <= todayStart) {
                todayEnd.setDate(todayEnd.getDate() + 1);
              }
              
              // Skip if a session with same subject and same time already exists
              const isDuplicate = finalSessions.some(existing =>
                existing.subjectId === s.subjectId &&
                new Date(existing.startTime).toDateString() === todayStart.toDateString() &&
                new Date(existing.startTime).getHours() === todayStart.getHours() &&
                new Date(existing.startTime).getMinutes() === todayStart.getMinutes()
              );
              if (isDuplicate) continue;
              
              clonedList.push({
                id: crypto.randomUUID(),
                subjectId: s.subjectId,
                startTime: todayStart.toISOString(),
                endTime: todayEnd.toISOString(),
                plannedMinutes: s.plannedMinutes,
                actualSeconds: 0,
                colorTag: s.colorTag,
                notes: s.notes,
                tags: s.tags,
                status: "planned",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                manualEntry: false,
              });
            }
            if (clonedList.length > 0) {
              await db.sessions.bulkAdd(clonedList);
              finalSessions = [...clonedList, ...finalSessions];
            }
          }
        }
      }

      if (subjects.length === 0 && finalSessions.length === 0) {
        const seedSubjects = createMockSubjects();
        const seedSessions = createMockSessions();
        await db.subjects.bulkPut(seedSubjects);
        await db.sessions.bulkPut(seedSessions);
        set({ 
          subjects: seedSubjects, 
          sessions: sortSessions(seedSessions), 
          loading: false,
          ...calculateGamificationStats(seedSessions)
        });
        return;
      }

      const themeValue = (themeSetting?.value ?? "default") as ThemeName;
      applyTheme(getThemeColors(themeValue));

      const parsedTimer = timerSetting ? (JSON.parse(timerSetting.value) as Partial<TimerSnapshot>) : null;
      let safeTimer: TimerSnapshot = {
        ...defaultTimer,
        ...parsedTimer,
        lastInteractionAtMs: parsedTimer?.lastInteractionAtMs ?? parsedTimer?.startedAtMs ?? null,
      };

      if (parsedTimer && parsedTimer.activeSessionId && !parsedTimer.isPaused) {
        const activeSession = finalSessions.find(s => s.id === parsedTimer.activeSessionId);
        if (activeSession) {
          const startedAt = parsedTimer.startedAtMs ?? Date.now();
          const lastInteraction = parsedTimer.lastInteractionAtMs ?? startedAt;
          const interactionLimit = startedAt + STRICT_INACTIVITY_LIMIT_MS;
          const cutoffMs = Math.min(lastInteraction, interactionLimit);
          const elapsedSinceStart = Math.max(0, Math.floor((cutoffMs - startedAt) / 1000));
          const newAccumulated = Math.max(0, Math.floor((parsedTimer.accumulatedSeconds || 0) + elapsedSinceStart));

          safeTimer = {
            ...safeTimer,
            accumulatedSeconds: newAccumulated,
            isPaused: true,
            pausedAtMs: lastInteraction,
            startedAtMs: null,
            hiddenAtMs: null,
          };

          await db.settings.put({ key: "timer", value: JSON.stringify(safeTimer) });
          await db.sessions.update(parsedTimer.activeSessionId, {
            status: "paused",
            actualSeconds: newAccumulated,
            updatedAt: new Date().toISOString(),
          });

          finalSessions = finalSessions.map(s =>
            s.id === parsedTimer.activeSessionId
              ? { ...s, status: "paused", actualSeconds: newAccumulated, updatedAt: new Date().toISOString() }
              : s
          );
        }
      }

      const unlockedIds: AchievementType[] = achievementsSetting ? JSON.parse(achievementsSetting.value) : [];
      const dailyStreak = calculateTotalActiveDays(finalSessions);
      const dailyGoalHitStreakVal = Number(dailyGoalHitStreakSetting?.value ?? 0);
      const achievements = calculateAchievements(finalSessions, subjects, dailyStreak, unlockedIds, dailyGoalHitStreakVal);

      set({
        subjects,
        sessions: sortSessions(finalSessions),
        timer: safeTimer,
        ...calculateGamificationStats(finalSessions),
        pomodoroMode: pomodoroSetting?.value === "true",
        strictFocusMode: strictFocusSetting?.value === "true",
        autoPauseOnHidden: autoPauseOnHiddenSetting ? autoPauseOnHiddenSetting.value === "true" : true,
        dailyGoalHours: Number(goalSetting?.value ?? 4),
        weeklyTargetHours: Number(weeklyTargetSetting?.value ?? 20),
        focusMusicEnabled: focusMusicSetting?.value === "true",
        notificationsEnabled: notificationsSetting?.value === "true",
        keyboardShortcutsEnabled: keyboardShortcutsSetting?.value === "true",
        theme: themeValue,
        achievements,
        dailyGoalHitStreak: dailyGoalHitStreakVal,
        profile: profileSetting ? JSON.parse(profileSetting.value) : { name: "", age: "", profession: "", goal: "" },
        aiConfig: aiConfigSetting ? JSON.parse(aiConfigSetting.value) : { provider: "local_rules", apiKey: "", model: "", ollamaUrl: "http://localhost:11434" },
        autoCarryForward: autoCarryEnabled,
        backendUrl: backendUrlSetting?.value ?? "http://localhost:5001",
        loading: false,
      });
      void get().fetchBackendData();
    } catch (error) {
      console.error("[initApp] Initialization failed:", error);
      set({ loading: false });
    }
  },

  createSubject: async (name: string, color: string, emoji?: string, weeklyGoalMinutes?: number) => {
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name,
      color,
      emoji,
      weeklyGoalMinutes,
      createdAt: new Date().toISOString(),
    };
    await db.subjects.add(newSubject);
    set((state: AppState) => ({ subjects: [...state.subjects, newSubject] }));
  },

  updateSubject: async (id: string, name: string, color: string, emoji?: string, weeklyGoalMinutes?: number) => {
    await db.subjects.update(id, { name, color, emoji, weeklyGoalMinutes });
    set((state: AppState) => ({
      subjects: state.subjects.map((s) => (s.id === id ? { ...s, name, color, emoji, weeklyGoalMinutes } : s)),
      sessions: state.sessions.map((session) => (session.subjectId === id ? { ...session, colorTag: color } : session)),
    }));
  },

  deleteSubject: async (id: string) => {
    await db.subjects.delete(id);
    await db.sessions.where("subjectId").equals(id).delete();
    const timer = get().timer;
    if (timer.activeSessionId) {
      const activeSession = get().sessions.find((session: StudySession) => session.id === timer.activeSessionId);
      if (activeSession?.subjectId === id) {
        await saveTimer(defaultTimer);
        set({ timer: defaultTimer });
      }
    }
      set((state: AppState) => {
        const newSessions = state.sessions.filter((session) => session.subjectId !== id);
        return {
          subjects: state.subjects.filter((subject) => subject.id !== id),
          sessions: sortSessions(newSessions),
          ...calculateGamificationStats(newSessions)
        };
      });
  },

  createSession: async (input: CreateSessionInput) => {
    const plannedMinutes = calcPlannedMinutes(input.startTime, input.endTime);
    const session: StudySession = {
      id: crypto.randomUUID(),
      subjectId: input.subjectId,
      startTime: input.startTime,
      endTime: input.endTime,
      plannedMinutes,
      actualSeconds: 0,
      colorTag: input.colorTag,
      notes: input.notes,
      tags: input.tags,
      status: "planned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manualEntry: false,
    };
    await db.sessions.add(session);
    set((state: AppState) => {
      const newSessions = [session, ...state.sessions];
      return {
        sessions: sortSessions(newSessions),
        ...calculateGamificationStats(newSessions)
      };
    });
  },

  updateSession: async (session: StudySession) => {
    const updated = { ...session, updatedAt: new Date().toISOString() };
    await db.sessions.put(updated);

    const timer = get().timer;
    let newSessionsList = get().sessions;
    if (timer.activeSessionId === updated.id) {
      const nextTimer: TimerSnapshot = {
        ...timer,
        accumulatedSeconds: clampElapsedSeconds(updated, updated.actualSeconds),
        startedAtMs: timer.isPaused ? null : Date.now(),
        lastInteractionAtMs: timer.lastInteractionAtMs ?? Date.now(),
      };
      await saveTimer(nextTimer);
      newSessionsList = get().sessions.map((item: StudySession) => (item.id === updated.id ? { ...updated, actualSeconds: nextTimer.accumulatedSeconds } : item));
      set({ timer: nextTimer });
    } else {
      newSessionsList = get().sessions.map((item: StudySession) => (item.id === updated.id ? updated : item));
    }

    if (updated.status === "completed") {
      await get().updateDailyGoalStreak(newSessionsList);
    }

    set({
      sessions: sortSessions(newSessionsList),
      ...calculateGamificationStats(newSessionsList)
    });
  },

  deleteSession: async (id: string) => {
    await db.sessions.delete(id);
    const timer = get().timer;
    if (timer.activeSessionId === id) {
      await saveTimer(defaultTimer);
      set((state: AppState) => {
        const newSessions = state.sessions.filter((item: StudySession) => item.id !== id);
        return {
          timer: defaultTimer,
          sessions: sortSessions(newSessions),
          ...calculateGamificationStats(newSessions)
        };
      });
      return;
    }
    set((state: AppState) => {
      const newSessions = state.sessions.filter((item: StudySession) => item.id !== id);
      return {
        sessions: sortSessions(newSessions),
        ...calculateGamificationStats(newSessions)
      };
    });
  },

  importAll: async (subjects: Subject[], sessions: StudySession[], settings?: { key: string; value: string }[], activities?: any[]) => {
    await (db as any).transaction("rw", [db.subjects, db.sessions, db.settings], async () => {
      await db.subjects.clear();
      await db.sessions.clear();
      await db.subjects.bulkAdd(subjects);
      await db.sessions.bulkAdd(sessions);
      if (settings && settings.length > 0) {
        for (const setting of settings) {
          if (setting.key === "ai_config") {
            const existing = await db.settings.get("ai_config");
            if (existing) {
              try {
                const parsedNew = JSON.parse(setting.value);
                const parsedExisting = JSON.parse(existing.value);
                if (parsedExisting.apiKey && !parsedNew.apiKey) parsedNew.apiKey = parsedExisting.apiKey;
                if (parsedExisting.apiKeys && parsedNew.apiKeys) {
                   for (const k in parsedExisting.apiKeys) {
                     if (!parsedNew.apiKeys[k]) parsedNew.apiKeys[k] = parsedExisting.apiKeys[k];
                   }
                }
                setting.value = JSON.stringify(parsedNew);
              } catch (e) {
                // ignore
              }
            }
          }
          await db.settings.put(setting);
        }
      }
    });

    // Pushing data to local Python backend SQLite Database
    try {
      const parsedSettings: Record<string, string> = {};
      if (settings) {
        settings.forEach(s => {
          parsedSettings[s.key] = s.value;
        });
      }
      const url = get().backendUrl;
      if (url) {
        await fetch(`${url}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjects,
            sessions,
            settings: parsedSettings,
            activities: activities || []
          })
        });
      }
    } catch (e) {
      console.warn("Python backend offline. Could not restore sqlite activities tracking records.", e);
    }

    await get().initApp();
  },

  addManualEntry: async (input: { subjectId: string; date: string; hours: number; notes?: string; tags?: string[] }) => {
    const plannedMinutes = input.hours * 60;
    const session: StudySession = {
      id: crypto.randomUUID(),
      subjectId: input.subjectId,
      startTime: input.date,
      endTime: input.date,
      plannedMinutes,
      actualSeconds: plannedMinutes * 60,
      colorTag: get().subjects.find((s: Subject) => s.id === input.subjectId)?.color ?? "#ccc",
      notes: input.notes ?? "",
      tags: input.tags ?? [],
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manualEntry: true,
    };
    await db.sessions.add(session);
    const newSessions = [session, ...get().sessions];
    
    await get().updateDailyGoalStreak(newSessions);

    set({
      sessions: sortSessions(newSessions),
      ...calculateGamificationStats(newSessions)
    });
  },

  startSession: async (sessionId: string) => {
    const session = get().sessions.find((item: StudySession) => item.id === sessionId);
    if (!session) return;

    const currentTimer = get().timer;
    if (currentTimer.activeSessionId && currentTimer.activeSessionId !== sessionId) {
      await get().stopSession();
    }

    const now = Date.now();
    const timer: TimerSnapshot = {
      activeSessionId: session.id,
      startedAtMs: now,
      accumulatedSeconds: clampElapsedSeconds(session, session.actualSeconds),
      pausedAtMs: null,
      isPaused: false,
      hiddenAtMs: null,
      lastInteractionAtMs: now,
    };
    await saveTimer(timer);
    await db.sessions.update(session.id, { status: "in_progress", updatedAt: new Date().toISOString() });
      set((state: AppState) => {
        const newSessions: StudySession[] = state.sessions.map((item: StudySession) => (item.id === session.id ? { ...item, status: "in_progress" as SessionStatus, updatedAt: new Date().toISOString() } : item));
        return {
          timer,
          sessions: sortSessions(newSessions),
          ...calculateGamificationStats(newSessions)
        };
      });
  },

  pauseSession: async () => {
    const timer = get().timer;
    if (!timer.activeSessionId || timer.isPaused || !timer.startedAtMs) return;
    const activeSession = get().sessions.find((session: StudySession) => session.id === timer.activeSessionId);
    const elapsedSinceStart = Math.floor((Date.now() - timer.startedAtMs) / 1000);
    const nextAccumulated = clampElapsedSeconds(activeSession, timer.accumulatedSeconds + elapsedSinceStart);
    const nextTimer: TimerSnapshot = {
      ...timer,
      accumulatedSeconds: nextAccumulated,
      isPaused: true,
      pausedAtMs: Date.now(),
      startedAtMs: null,
      hiddenAtMs: null,
    };
    await saveTimer(nextTimer);
    await db.sessions.update(timer.activeSessionId, {
      status: "paused",
      actualSeconds: nextAccumulated,
      updatedAt: new Date().toISOString(),
    });
    set((state: AppState) => {
      const newSessions: StudySession[] = state.sessions.map((session: StudySession) =>
        session.id === timer.activeSessionId
          ? { ...session, status: "paused" as SessionStatus, actualSeconds: nextAccumulated, updatedAt: new Date().toISOString() }
          : session
      );
      return {
        timer: nextTimer,
        sessions: sortSessions(newSessions),
        ...calculateGamificationStats(newSessions)
      };
    });
  },

  resumeSession: async () => {
    const timer = get().timer;
    if (!timer.activeSessionId || !timer.isPaused) return;
    const now = Date.now();
    const nextTimer: TimerSnapshot = {
      ...timer,
      startedAtMs: now,
      isPaused: false,
      pausedAtMs: null,
      hiddenAtMs: null,
      lastInteractionAtMs: now,
    };
    await saveTimer(nextTimer);
    await db.sessions.update(timer.activeSessionId, { status: "in_progress", updatedAt: new Date().toISOString() });
    set((state: AppState) => {
      const newSessions: StudySession[] = state.sessions.map((session: StudySession) =>
        session.id === timer.activeSessionId ? { ...session, status: "in_progress" as SessionStatus, updatedAt: new Date().toISOString() } : session
      );
      return {
        timer: nextTimer,
        sessions: sortSessions(newSessions),
        ...calculateGamificationStats(newSessions)
      };
    });
  },

  stopSession: async () => {
    return withSessionLock(async () => {
      const timer = get().timer;
      if (!timer.activeSessionId) return;
      const activeSession = get().sessions.find((session: StudySession) => session.id === timer.activeSessionId);
      const elapsed = clampElapsedSeconds(activeSession, get().getActiveElapsed(Date.now()));
      
      // Strict study logic: if studied less than 60 seconds, revert status to planned
      const finalStatus = elapsed >= 60 ? "completed" : "planned";
      
      await db.sessions.update(timer.activeSessionId, {
        status: finalStatus,
        actualSeconds: elapsed,
        updatedAt: new Date().toISOString(),
      });
      await saveTimer(defaultTimer);
      
      const newSessions: StudySession[] = get().sessions.map((session: StudySession) =>
        session.id === timer.activeSessionId
          ? { ...session, actualSeconds: elapsed, status: finalStatus as SessionStatus, updatedAt: new Date().toISOString() }
          : session
      );
      
      await get().updateDailyGoalStreak(newSessions);

      set({
        timer: defaultTimer,
        sessions: sortSessions(newSessions),
        ...calculateGamificationStats(newSessions)
      });
    });
  },

  setHiddenAt: async (ms: number | null) => {
    const nextTimer = { ...get().timer, hiddenAtMs: ms };
    await saveTimer(nextTimer);
    set({ timer: nextTimer });
  },

  markTimerInteraction: async (ms?: number) => {
    const timer = get().timer;
    if (!timer.activeSessionId) return;
    const nextTimer = { ...timer, lastInteractionAtMs: ms ?? Date.now() };
    await saveTimer(nextTimer);
    set({ timer: nextTimer });
  },

  getActiveElapsed: (nowMs: number) => {
    const timer = get().timer;
    if (!timer.activeSessionId) return 0;

    const activeSession = get().sessions.find((session: StudySession) => session.id === timer.activeSessionId);
    if (!activeSession) return timer.accumulatedSeconds;
    if (timer.isPaused || !timer.startedAtMs) return clampElapsedSeconds(activeSession, timer.accumulatedSeconds);

    const strictFocusMode = get().strictFocusMode;
    const autoPauseOnHidden = get().autoPauseOnHidden;
    const rawDeltaMs = Math.max(0, nowMs - timer.startedAtMs);

    if (!strictFocusMode && !autoPauseOnHidden) {
      return clampElapsedSeconds(activeSession, timer.accumulatedSeconds + Math.floor(rawDeltaMs / 1000));
    }

    const hiddenAtMs = timer.hiddenAtMs;
    const lastInteractionAtMs = timer.lastInteractionAtMs ?? timer.startedAtMs;
    const interactionExpiryMs = lastInteractionAtMs + STRICT_INACTIVITY_LIMIT_MS;

    const isPipActive = get().isPipActive;
    let cutoffMs = nowMs;
    
    // 1. Common Inactivity Cap (Movement check)
    cutoffMs = Math.min(cutoffMs, interactionExpiryMs);

    // 2. Tab Visibility Check (Only if NOT in PiP mode)
    if (autoPauseOnHidden && hiddenAtMs !== null && !isPipActive) {
      cutoffMs = Math.min(cutoffMs, hiddenAtMs);
    }

    const approvedDeltaMs = Math.max(0, cutoffMs - timer.startedAtMs);
    return clampElapsedSeconds(activeSession, timer.accumulatedSeconds + Math.floor(approvedDeltaMs / 1000));
  },

  syncActiveSession: async (nowMs?: number) => {
    return withSessionLock(async () => {
      const timer = get().timer;
      if (!timer.activeSessionId) return;
      
      const activeSession = get().sessions.find((s: StudySession) => s.id === timer.activeSessionId);
      if (!activeSession) return;

      if (timer.isPaused || !timer.startedAtMs) return;

      const currentMs = nowMs ?? Date.now();
      const elapsed = get().getActiveElapsed(currentMs);
      const clampedElapsed = clampElapsedSeconds(activeSession, elapsed);

      await db.sessions.update(timer.activeSessionId, { 
        actualSeconds: clampedElapsed,
        updatedAt: new Date().toISOString()
      });
      
      set((state: AppState) => {
        const newSessions: StudySession[] = state.sessions.map((session: StudySession) =>
          session.id === timer.activeSessionId ? { ...session, actualSeconds: clampedElapsed, updatedAt: new Date().toISOString() } : session
        );
        return {
          sessions: sortSessions(newSessions),
          ...calculateGamificationStats(newSessions)
        };
      });
    });
  },

  setPomodoroMode: (enabled: boolean) => {
    void db.settings.put({ key: "pomodoroMode", value: String(enabled) });
    set({ pomodoroMode: enabled });
  },

  setStrictFocusMode: (enabled: boolean) => {
    void db.settings.put({ key: "strictFocusMode", value: String(enabled) });
    set({ strictFocusMode: enabled });
  },

  setAutoPauseOnHidden: (enabled: boolean) => {
    void db.settings.put({ key: "autoPauseOnHidden", value: String(enabled) });
    set({ autoPauseOnHidden: enabled });
  },

  setDailyGoalHours: (hours: number) => {
    void db.settings.put({ key: "dailyGoalHours", value: String(hours) });
    set({ dailyGoalHours: hours });
  },

  setWeeklyTargetHours: (hours: number) => {
    void db.settings.put({ key: "weeklyTargetHours", value: String(hours) });
    set({ weeklyTargetHours: hours });
  },

  setFocusMusicEnabled: (enabled: boolean) => {
    void db.settings.put({ key: "focusMusicEnabled", value: String(enabled) });
    set({ focusMusicEnabled: enabled });
  },

  setNotificationsEnabled: (enabled: boolean) => {
    void db.settings.put({ key: "notificationsEnabled", value: String(enabled) });
    set({ notificationsEnabled: enabled });
  },

  setKeyboardShortcutsEnabled: (enabled: boolean) => {
    void db.settings.put({ key: "keyboardShortcutsEnabled", value: String(enabled) });
    set({ keyboardShortcutsEnabled: enabled });
  },

  setTheme: (theme: ThemeName) => {
    void db.settings.put({ key: "theme", value: theme });
    applyTheme(getThemeColors(theme));
    set({ theme });
  },

  recalculateAchievements: () => {
    const { sessions, subjects, dailyGoalHitStreak } = get();
    const dailyStreak = calculateTotalActiveDays(sessions);
    const achievements = calculateAchievements(sessions, subjects, dailyStreak, [], dailyGoalHitStreak);
    set({ achievements });
  },

  setDailyGoalHitStreak: (streak: number) => {
    void db.settings.put({ key: "dailyGoalHitStreak", value: String(streak) });
    set({ dailyGoalHitStreak: streak });
  },

  cloneSession: async (sessionId: string, targetDate: string) => {
    const session = get().sessions.find((s: StudySession) => s.id === sessionId);
    if (!session) return;

    const originalStart = new Date(session.startTime);
    const originalEnd = new Date(session.endTime);
    const targetDateObj = new Date(targetDate);

    // Keep same time, change date
    const newStart = new Date(targetDateObj);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

    const newEnd = new Date(targetDateObj);
    newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes(), 0, 0);

    // Handle overnight sessions
    if (newEnd <= newStart) {
      newEnd.setDate(newEnd.getDate() + 1);
    }

    const clonedSession: StudySession = {
      ...session,
      id: crypto.randomUUID(),
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      plannedMinutes: calcPlannedMinutes(newStart.toISOString(), newEnd.toISOString()),
      actualSeconds: 0,
      status: "planned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manualEntry: false,
      parentSessionId: session.id,
      notes: session.notes || "",
      tags: session.tags || [],
    };

    await db.sessions.add(clonedSession);
    set((state: AppState) => {
      const newSessions = [clonedSession, ...state.sessions];
      return {
        sessions: sortSessions(newSessions),
        ...calculateGamificationStats(newSessions)
      };
    });
  },

  rescheduleSession: async (sessionId: string, targetDate: string) => {
    const session = get().sessions.find((s: StudySession) => s.id === sessionId);
    if (!session) return;

    const originalStart = new Date(session.startTime);
    const originalEnd = new Date(session.endTime);
    const targetDateObj = new Date(targetDate);

    // Keep same time, change date
    const newStart = new Date(targetDateObj);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

    const newEnd = new Date(targetDateObj);
    newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes(), 0, 0);

    // Handle overnight sessions
    if (newEnd <= newStart) {
      newEnd.setDate(newEnd.getDate() + 1);
    }

    const updated: StudySession = {
      ...session,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      plannedMinutes: calcPlannedMinutes(newStart.toISOString(), newEnd.toISOString()),
      updatedAt: new Date().toISOString(),
    };

    await db.sessions.put(updated);
    set((state: AppState) => {
      const newSessions = state.sessions.map((s: StudySession) => (s.id === sessionId ? updated : s));
      return {
        sessions: sortSessions(newSessions),
        ...calculateGamificationStats(newSessions)
      };
    });
  },


  moveSessionToNextDay: async (sessionId: string) => {
    const session = get().sessions.find((s: StudySession) => s.id === sessionId);
    if (!session) return;

    const currentStart = new Date(session.startTime);
    const nextDay = new Date(currentStart);
    nextDay.setDate(nextDay.getDate() + 1);

    await get().rescheduleSession(sessionId, nextDay.toISOString().split("T")[0]);
  },

  createRecurringSessions: async (sessionId: string, config: RecurrenceConfig) => {
    const session = get().sessions.find((s: StudySession) => s.id === sessionId);
    if (!session || config.type === "none") return;

    const seriesId = crypto.randomUUID();
    const originalStart = new Date(session.startTime);
    const originalEnd = new Date(session.endTime);
    const maxOccurrences = config.occurrences ?? 30;
    const endDate = config.endDate ? new Date(config.endDate) : null;

    const newSessions: StudySession[] = [];
    let currentDate = new Date(originalStart);

    for (let i = 0; i < maxOccurrences; i++) {
      // Skip first (original session)
      if (i === 0) {
        // Update original with series info
        const updated = { ...session, seriesId, recurrence: config, updatedAt: new Date().toISOString() };
        await db.sessions.put(updated);
        set((state: AppState) => {
        const newSessions = state.sessions.map((s) => (s.id === sessionId ? updated : s));
        return {
          sessions: sortSessions(newSessions),
          ...calculateGamificationStats(newSessions)
        };
      });
        // Move to next occurrence
        currentDate = getNextOccurrence(currentDate, config);
        continue;
      }

      // Check end date
      if (endDate && currentDate > endDate) break;

      const newStart = new Date(currentDate);
      newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

      const newEnd = new Date(currentDate);
      newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes(), 0, 0);

      if (newEnd <= newStart) {
        newEnd.setDate(newEnd.getDate() + 1);
      }

      const recurring: StudySession = {
        id: crypto.randomUUID(),
        subjectId: session.subjectId,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        plannedMinutes: session.plannedMinutes,
        actualSeconds: 0,
        colorTag: session.colorTag,
        notes: session.notes,
        tags: session.tags,
        status: "planned",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        manualEntry: false,
        seriesId,
        parentSessionId: session.id,
        recurrence: config,
      };

      newSessions.push(recurring);
      currentDate = getNextOccurrence(currentDate, config);
    }

    if (newSessions.length > 0) {
      await db.sessions.bulkAdd(newSessions);
      set((state: AppState) => ({ sessions: sortSessions([...newSessions, ...state.sessions]) }));
    }
  },

  bulkReschedule: async (sessionIds: string[], offsetDays: number) => {
    const updates: StudySession[] = [];

    for (const id of sessionIds) {
      const session = get().sessions.find((s: StudySession) => s.id === id);
      if (!session) continue;

      const newStart = new Date(session.startTime);
      newStart.setDate(newStart.getDate() + offsetDays);

      const newEnd = new Date(session.endTime);
      newEnd.setDate(newEnd.getDate() + offsetDays);

      const updated: StudySession = {
        ...session,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        updatedAt: new Date().toISOString(),
      };

      updates.push(updated);
      await db.sessions.put(updated);
    }

    set((state: AppState) => ({
      sessions: sortSessions(
        state.sessions.map((s: StudySession) => {
          const update = updates.find((u: StudySession) => u.id === s.id);
          return update ?? s;
        })
      ),
    }));
  },

  setIsPipActive: (active: boolean) => {
    set({ isPipActive: active });
  },

  setUserProfile: async (profile: UserProfile) => {
    await db.settings.put({ key: "user_profile", value: JSON.stringify(profile) });
    set({ profile });
  },

  setCloudSyncStatus: (status: CloudSyncStatus) => set({ cloudSyncStatus: status }),
  setUser: (user: CloudUser | null) => set({ user }),

  setAiConfig: async (config: AiConfig) => {
    await db.settings.put({ key: "ai_config", value: JSON.stringify(config) });
    set({ aiConfig: config });
  },

  setAutoCarryForward: (enabled: boolean) => {
    void db.settings.put({ key: "autoCarryForward", value: String(enabled) });
    set({ autoCarryForward: enabled });
  },

  setActiveWindow: (title: string) => {
    set({ activeWindow: title });
  },

  updateDailyGoalStreak: async (newSessions: StudySession[]) => {
    const dailyGoalHours = get().dailyGoalHours;
    
    const dayStudySeconds: Record<string, number> = {};
    newSessions.forEach(s => {
      if (s.actualSeconds > 0 && s.status === "completed") {
        const dateKey = format(new Date(s.startTime), "yyyy-MM-dd");
        dayStudySeconds[dateKey] = (dayStudySeconds[dateKey] ?? 0) + s.actualSeconds;
      }
    });

    let streak = 0;
    let cursor = new Date();
    
    const todayKey = format(cursor, "yyyy-MM-dd");
    const todaySeconds = dayStudySeconds[todayKey] ?? 0;
    
    if (todaySeconds >= dailyGoalHours * 3600) {
      while (true) {
        const key = format(cursor, "yyyy-MM-dd");
        if ((dayStudySeconds[key] ?? 0) >= dailyGoalHours * 3600) {
          streak += 1;
          cursor = subDays(cursor, 1);
        } else {
          break;
        }
      }
    } else {
      cursor = subDays(cursor, 1);
      const yesterdayKey = format(cursor, "yyyy-MM-dd");
      if ((dayStudySeconds[yesterdayKey] ?? 0) >= dailyGoalHours * 3600) {
        while (true) {
          const key = format(cursor, "yyyy-MM-dd");
          if ((dayStudySeconds[key] ?? 0) >= dailyGoalHours * 3600) {
            streak += 1;
            cursor = subDays(cursor, 1);
          } else {
            break;
          }
        }
      }
    }

    await db.settings.put({ key: "dailyGoalHitStreak", value: String(streak) });
    set({ dailyGoalHitStreak: streak });
    get().recalculateAchievements();
  },
}));

// Helper to calculate next occurrence based on recurrence config
function getNextOccurrence(current: Date, config: RecurrenceConfig): Date {
  const next = new Date(current);
  const interval = config.interval || 1;

  switch (config.type) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly":
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        // Find next day of week
        const currentDay = next.getDay();
        const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);
        const nextDay = sortedDays.find((d) => d > currentDay);
        if (nextDay !== undefined) {
          next.setDate(next.getDate() + (nextDay - currentDay));
        } else {
          // Go to next week's first day
          next.setDate(next.getDate() + (7 - currentDay + sortedDays[0]) + (interval - 1) * 7);
        }
      } else {
        next.setDate(next.getDate() + 7 * interval);
      }
      break;
    case "monthly":
      next.setMonth(next.getMonth() + interval);
      break;
    case "custom":
      next.setDate(next.getDate() + interval);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}
