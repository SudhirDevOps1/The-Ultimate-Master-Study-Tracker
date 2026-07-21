import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/lib/db';

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroCycle {
  phase: PomodoroPhase;
  durationSeconds: number;
  remainingSeconds: number;
  isActive: boolean;
  isPaused: boolean;
  cycleNumber: number;
}

interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  desktopNotifications: boolean;
}

export function usePomodoro() {
  const pomodoroMode = useAppStore((state) => state.pomodoroMode);
  const [settings, setSettings] = useState<PomodoroSettings>({
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    autoStartBreaks: true,
    autoStartWork: false,
    desktopNotifications: true,
  });

  const [cycle, setCycle] = useState<PomodoroCycle>({
    phase: 'work',
    durationSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isActive: false,
    isPaused: false,
    cycleNumber: 1,
  });

  const [history, setHistory] = useState<Array<{ phase: PomodoroPhase; completedAt: string; durationSeconds: number }>>([]);

  useEffect(() => {
    async function load() {
      const saved = await db.settings.get('pomodoroSettings');
      if (saved) {
        setSettings(JSON.parse(saved.value));
      }
    }
    load();
  }, []);

  const saveSettings = useCallback(async (newSettings: PomodoroSettings) => {
    await db.settings.put({ key: 'pomodoroSettings', value: JSON.stringify(newSettings) });
    setSettings(newSettings);
  }, []);

  const skipToNextPhase = useCallback(() => {
    let nextPhase: PomodoroPhase = 'work';
    let nextCycleNumber = cycle.cycleNumber;

    if (cycle.phase === 'work') {
      if (cycle.cycleNumber >= settings.cyclesBeforeLongBreak) {
        nextPhase = 'longBreak';
        nextCycleNumber = 1;
      } else {
        nextPhase = 'shortBreak';
        nextCycleNumber = cycle.cycleNumber + 1;
      }
    } else {
      nextPhase = 'work';
    }

    const durationSeconds = {
      work: settings.workMinutes * 60,
      shortBreak: settings.shortBreakMinutes * 60,
      longBreak: settings.longBreakMinutes * 60,
    }[nextPhase];

    if (cycle.isActive && cycle.phase === 'work') {
      const completedEntry = { phase: cycle.phase, completedAt: new Date().toISOString(), durationSeconds: cycle.durationSeconds };
      setHistory((h) => [...h, completedEntry]);

      void (async () => {
        await db.settings.put({
          key: `pomodoro_completed_${Date.now()}`,
          value: JSON.stringify(completedEntry)
        });
      })();
    }

    const newCycle: PomodoroCycle = {
      phase: nextPhase,
      durationSeconds,
      remainingSeconds: durationSeconds,
      isActive: (settings.autoStartBreaks && nextPhase !== 'work') || (settings.autoStartWork && nextPhase === 'work'),
      isPaused: false,
      cycleNumber: nextCycleNumber,
    };

    setCycle(newCycle);

    if (settings.desktopNotifications && Notification.permission === 'granted') {
      new Notification(`Pomodoro ${nextPhase === 'work' ? 'Work' : 'Break'} ${nextPhase === 'longBreak' ? '(Long)' : ''}`, {
        body: `${nextPhase === 'work' ? 'Time to focus!' : 'Time to relax!'}`,
        icon: '/icon-192.png',
      });
    }
  }, [cycle, settings]);

  // ✅ BUG FIX: Keep a ref to the latest skipToNextPhase so the interval
  // closure never goes stale — fixes stale-closure issue when called inside setInterval
  const skipRef = useRef(skipToNextPhase);
  useEffect(() => { skipRef.current = skipToNextPhase; }, [skipToNextPhase]);

  const startPomodoro = useCallback(() => {
    if (cycle.isActive && !cycle.isPaused) return;

    const newCycle = { ...cycle, isActive: true, isPaused: false };
    setCycle(newCycle);

    if (cycle.remainingSeconds === cycle.durationSeconds) {
      if (settings.desktopNotifications && Notification.permission === 'granted') {
        new Notification(`Pomodoro ${cycle.phase === 'work' ? 'Work' : 'Break'} Started`, {
          body: `Focus for ${Math.floor(cycle.durationSeconds / 60)} minutes`,
          icon: '/icon-192.png',
        });
      }
    }
  }, [cycle, settings.desktopNotifications]);

  const pausePomodoro = useCallback(() => {
    if (!cycle.isActive || cycle.isPaused) return;
    setCycle((c) => ({ ...c, isPaused: true }));
  }, [cycle]);

  const resumePomodoro = useCallback(() => {
    if (!cycle.isActive || !cycle.isPaused) return;
    setCycle((c) => ({ ...c, isPaused: false }));
  }, [cycle]);

  const stopPomodoro = useCallback(() => {
    if (!cycle.isActive) return;
    setCycle((c) => ({
      ...c,
      isActive: false,
      isPaused: false,
      remainingSeconds: c.durationSeconds,
    }));
  }, [cycle]);

  // ✅ BUG FIX: Timestamp-based countdown instead of simple setInterval decrement.
  // Previously setInterval was throttled by the browser/OS when minimized,
  // causing the Pomodoro to lose time. Now we calculate remaining from a
  // real timestamp so it's always accurate even after minimize/restore.
  useEffect(() => {
    if (!cycle.isActive || cycle.isPaused || !pomodoroMode) return;

    // Capture the "start of this running phase" timestamp and remaining at that moment
    const phaseStartMs = Date.now();
    const remainingAtStart = cycle.remainingSeconds;

    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - phaseStartMs) / 1000);
      const newRemaining = Math.max(0, remainingAtStart - elapsedSec);

      if (newRemaining <= 0) {
        clearInterval(interval);
        // Use ref to avoid stale closure
        skipRef.current();
        return;
      }

      setCycle((c) => {
        // Avoid unnecessary re-renders if value hasn't changed
        if (c.remainingSeconds === newRemaining) return c;
        return { ...c, remainingSeconds: newRemaining };
      });
    }, 500); // 500ms for smooth display while being efficient

    return () => clearInterval(interval);
    // Note: skipToNextPhase intentionally excluded — we use skipRef instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle.isActive, cycle.isPaused, pomodoroMode]);

  useEffect(() => {
    if (settings.desktopNotifications && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [settings.desktopNotifications]);

  return {
    settings,
    cycle,
    history,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    stopPomodoro,
    skipToNextPhase,
    saveSettings,
    isEnabled: pomodoroMode,
  };
}
