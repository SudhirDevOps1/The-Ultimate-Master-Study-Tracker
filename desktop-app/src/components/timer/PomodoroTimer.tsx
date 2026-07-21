import { motion } from 'framer-motion';
import { formatSeconds } from '@/utils/time';
import { usePomodoro } from '@/hooks/usePomodoro';

export function PomodoroTimer() {
  const pomodoro = usePomodoro();
  const { cycle, settings, isEnabled } = pomodoro;

  if (!isEnabled) {
    return (
      <div className="soft-card rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pomodoro is disabled</p>
        <p className="mt-2 text-sm text-slate-300">Enable Pomodoro mode from the timer page to use focus cycles.</p>
      </div>
    );
  }

  const phaseLabels = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  };

  const phaseColors = {
    work: 'from-amber-400 to-orange-500',
    shortBreak: 'from-emerald-400 to-cyan-500',
    longBreak: 'from-violet-400 to-indigo-500',
  };

  const progress = cycle.durationSeconds > 0 ? ((cycle.durationSeconds - cycle.remainingSeconds) / cycle.durationSeconds) * 100 : 0;

  return (
    <div className="soft-card rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pomodoro Timer</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{phaseLabels[cycle.phase]}</h3>
          <p className="mt-1 text-sm text-slate-300">
            Cycle {cycle.cycleNumber} of {settings.cyclesBeforeLongBreak}
          </p>
        </div>
        <div className="rounded-xl bg-white/8 px-3 py-2 text-right">
          <p className="text-xs text-slate-400">Remaining</p>
          <p className="text-lg font-semibold text-white">{formatSeconds(cycle.remainingSeconds)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${phaseColors[cycle.phase]}`}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.6 }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {cycle.isActive ? (
          <>
            {cycle.isPaused ? (
              <button
                onClick={pomodoro.resumePomodoro}
                className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={pomodoro.pausePomodoro}
                className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950"
              >
                Pause
              </button>
            )}
            <button
              onClick={pomodoro.stopPomodoro}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/8"
            >
              Stop
            </button>
            <button
              onClick={pomodoro.skipToNextPhase}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/8"
            >
              Skip to {cycle.phase === 'work' ? 'Break' : 'Focus'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={pomodoro.startPomodoro}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white"
            >
              Start {phaseLabels[cycle.phase]}
            </button>
            <button
              onClick={pomodoro.skipToNextPhase}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/8"
            >
              Skip to {cycle.phase === 'work' ? 'Break' : 'Focus'}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
        <div>
          <p className="font-medium text-slate-300">{settings.workMinutes}m</p>
          <p>Focus</p>
        </div>
        <div>
          <p className="font-medium text-slate-300">{settings.shortBreakMinutes}m</p>
          <p>Short Break</p>
        </div>
        <div>
          <p className="font-medium text-slate-300">{settings.longBreakMinutes}m</p>
          <p>Long Break</p>
        </div>
      </div>
    </div>
  );
}