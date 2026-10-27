export interface BreakSettings {
  eyeCare2020Enabled: boolean;     // 20-20-20 Eye Rest (Default: true)
  continuousFocus50Enabled: boolean; // 50m Focus Stretch (Default: true)
  postureStretch90Enabled: boolean;  // 90m Ergonomic Stretch (Default: true)
  eyeCareIntervalSeconds?: number;   // Default: 20 * 60 (1200s)
  focusIntervalSeconds?: number;     // Default: 50 * 60 (3000s)
  postureIntervalSeconds?: number;   // Default: 90 * 60 (5400s)
}

export type BreakType = "eye_care" | "continuous_focus" | "posture_stretch";

export interface BreakDecision {
  shouldTrigger: boolean;
  type?: BreakType;
  durationSeconds?: number;
  reason?: string;
  suppressedReason?: string;
}

export interface BreakEvaluationState {
  nowMs: number;
  sessionStartedAtMs: number;
  lastBreakAtMs: number;
  continuousSeconds: number;
  idleMs: number;                 // From get-idle-time-ms
  inPomodoroBreak: boolean;
  isFullscreenVideo: boolean;
  dndEnabled: boolean;
  settings: BreakSettings;
}

export const DEFAULT_BREAK_SETTINGS: BreakSettings = {
  eyeCare2020Enabled: true,
  continuousFocus50Enabled: true,
  postureStretch90Enabled: true,
  eyeCareIntervalSeconds: 20 * 60, // 20 min
  focusIntervalSeconds: 50 * 60,   // 50 min
  postureIntervalSeconds: 90 * 60, // 90 min
};

/**
 * Calculates the next scheduled break timestamp based on current progress.
 */
export function nextBreakAt(
  lastBreakAtMs: number,
  settings: BreakSettings = DEFAULT_BREAK_SETTINGS
): { nextAtMs: number; type: BreakType } {
  const eyeInterval = (settings.eyeCareIntervalSeconds ?? 1200) * 1000;
  return {
    nextAtMs: lastBreakAtMs + eyeInterval,
    type: "eye_care",
  };
}

/**
 * Evaluates whether an ergonomic rest break should trigger right now.
 * Pure function: all environmental states (idle, full-screen, DND) are passed in.
 */
export function shouldBreak(state: BreakEvaluationState): BreakDecision {
  const {
    continuousSeconds,
    idleMs,
    inPomodoroBreak,
    isFullscreenVideo,
    dndEnabled,
    settings,
  } = state;

  // ── Suppression Rules ──
  // 1. Suppress if user is currently AFK (idle > 2 minutes)
  if (idleMs > 120_000) {
    return { shouldTrigger: false, suppressedReason: "User is AFK/idle" };
  }

  // 2. Suppress if currently taking a Pomodoro break
  if (inPomodoroBreak) {
    return { shouldTrigger: false, suppressedReason: "Already in Pomodoro break" };
  }

  // 3. Suppress if Do-Not-Disturb is active
  if (dndEnabled) {
    return { shouldTrigger: false, suppressedReason: "Do Not Disturb is active" };
  }

  // 4. Suppress if fullscreen video or presentation is playing
  if (isFullscreenVideo) {
    return { shouldTrigger: false, suppressedReason: "Fullscreen video is active" };
  }

  // ── Trigger Hierarchy ──
  const postureInterval = settings.postureIntervalSeconds ?? 5400;
  const focusInterval = settings.focusIntervalSeconds ?? 3000;
  const eyeInterval = settings.eyeCareIntervalSeconds ?? 1200;

  // Priority 1: 90-Minute Ergonomic Posture & Body Stretch
  if (settings.postureStretch90Enabled && continuousSeconds >= postureInterval && continuousSeconds % postureInterval < 3) {
    return {
      shouldTrigger: true,
      type: "posture_stretch",
      durationSeconds: 120, // 2 minutes
      reason: formatBreakReason("posture_stretch"),
    };
  }

  // Priority 2: 50-Minute Continuous Deep-Work Break Offer
  if (settings.continuousFocus50Enabled && continuousSeconds >= focusInterval && continuousSeconds % focusInterval < 3) {
    return {
      shouldTrigger: true,
      type: "continuous_focus",
      durationSeconds: 300, // 5 minutes
      reason: formatBreakReason("continuous_focus"),
    };
  }

  // Priority 3: 20-20-20 Ergonomic Optic Nerve Care (Every 20 minutes for 20 seconds)
  if (settings.eyeCare2020Enabled && continuousSeconds >= eyeInterval && continuousSeconds % eyeInterval < 3) {
    return {
      shouldTrigger: true,
      type: "eye_care",
      durationSeconds: 20, // 20 seconds
      reason: formatBreakReason("eye_care"),
    };
  }

  return { shouldTrigger: false };
}

/**
 * Human-readable break guidance messages.
 */
export function formatBreakReason(type: BreakType): string {
  switch (type) {
    case "eye_care":
      return "20-20-20 Eye Care: Look at an object 20 feet away for 20 seconds to relax your optic nerves.";
    case "continuous_focus":
      return "50-Minute Deep Work Milestone: Stand up, stretch, and grab water for 5 minutes.";
    case "posture_stretch":
      return "90-Minute Ergonomic Reset: Roll your shoulders, stretch your wrists, and correct your spine posture.";
  }
}
