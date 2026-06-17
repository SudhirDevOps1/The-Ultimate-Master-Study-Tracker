import { useEffect, useState, useCallback } from 'react';
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
      setHistory((h) => [
        ...h,
        { phase: cycle.phase, completedAt: new Date().toISOString(), durationSeconds: cycle.durationSeconds },
      ]);
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

  useEffect(() => {
    if (!cycle.isActive || cycle.isPaused || !pomodoroMode) return;

    const interval = setInterval(() => {
      setCycle((c) => {
        if (c.remainingSeconds <= 1) {
          clearInterval(interval);
          setTimeout(() => skipToNextPhase(), 100);
          return {
            ...c,
            remainingSeconds: 0,
            isActive: false,
          };
        }
        return { ...c, remainingSeconds: c.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cycle.isActive, cycle.isPaused, pomodoroMode, skipToNextPhase]);

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