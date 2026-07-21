export type SessionStatus = "planned" | "in_progress" | "paused" | "completed";

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "custom";

export interface RecurrenceConfig {
  type: RecurrenceType;
  interval: number; // every N days/weeks/months
  endDate?: string; // optional end date
  daysOfWeek?: number[]; // for weekly: 0=Sun, 1=Mon, etc.
  occurrences?: number; // max number of occurrences
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  weeklyGoalMinutes?: number;
  createdAt: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  actualSeconds: number;
  colorTag: string;
  notes: string;
  tags: string[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  manualEntry: boolean;
  // Recurrence fields
  recurrence?: RecurrenceConfig;
  parentSessionId?: string; // if this is a recurring instance
  seriesId?: string; // to group recurring sessions
}

export interface TimerSnapshot {
  activeSessionId: string | null;
  startedAtMs: number | null;
  accumulatedSeconds: number;
  pausedAtMs: number | null;
  isPaused: boolean;
  hiddenAtMs: number | null;
  lastInteractionAtMs: number | null;
}

export interface AppSettings {
  key: string;
  value: string;
}

export type AnalyticsRange = "daily" | "weekly" | "monthly" | "yearly";

export interface AnalyticsMetric {
  label: string;
  fullLabel?: string;
  plannedHours: number;
  actualHours: number;
  completionPct: number;
  focusRatio: number;
  totalSessions: number;
}

export type AchievementType =
  | "first_session"
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "hours_10"
  | "hours_50"
  | "hours_100"
  | "hours_500"
  | "perfect_week"
  | "night_owl"
  | "early_bird"
  | "weekend_warrior"
  | "subject_master"
  | "focused_2h"
  | "focused_4h"
  | "daily_goal_7"
  | "daily_goal_30"
  | "all_subjects"
  | "strict_focus_5"
  | "day_warrior"
  | "subject_diversity"
  | "unstoppable"
  | "early_bird_champion";

export interface Achievement {
  id: AchievementType;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
}

export type ThemeName = "ocean" | "forest" | "sunset" | "galaxy" | "cyber" | "default" | "neon" | "paper";

export interface ThemeConfig {
  name: ThemeName;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  bgGradient: string;
}

export interface UserProfile {
  name: string;
  age: string;
  profession: string;
  goal: string;
}

// ========== Custom AI Provider ==========
export interface CustomAIProvider {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
}

export interface AiConfig {
  provider: "gemini" | "cerebras" | "openai" | "mistral" | "grok" | "ollama" | "local_rules" | "groq" | "custom";
  apiKey: string;
  model: string;
  ollamaUrl: string;
  apiKeys?: Record<string, string>;
  customProvider?: {
    name: string;
    endpoint: string;
    apiKey: string;
  };
  customProviders?: CustomAIProvider[];
  activeCustomProviderId?: string;
}

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "error";

export interface CloudUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// ========== App Usage Tracking (Digital Wellbeing) ==========
export interface AppUsageRecord {
  id: string;
  appName: string;
  icon?: string;
  category: "productivity" | "social" | "entertainment" | "study" | "communication" | "browser" | "system" | "other";
  duration: number; // seconds
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  isActive: boolean;
  processName?: string;
}

export interface BrowserTabRecord {
  id: string;
  tabTitle: string;
  url: string;
  favicon?: string;
  domain: string;
  duration: number; // seconds
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  visitCount: number;
}

export interface DailyAppUsageSummary {
  date: string;
  totalScreenTime: number; // seconds
  apps: AppUsageRecord[];
  browserTabs: BrowserTabRecord[];
  hourlyBreakdown: Record<number, number>; // hour -> seconds
  topApps: { name: string; duration: number; icon?: string }[];
  categories: Record<string, number>; // category -> seconds
}

// ========== Video Rest Break ==========
export interface VideoSchedule {
  enabled: boolean;
  intervalMinutes: number; // study interval before break (default 60)
  restMinutes: number; // rest break duration (default 10)
  lastPlayedAt: string | null;
  videosPlayed: number;
  autoPlay: boolean;
}

// ========== App Blocking ==========
export type BlockStrictLevel = "soft" | "medium" | "hard";

export interface AppBlockRule {
  id: string;
  appName: string;
  processName?: string;
  blocked: boolean;
  strictLevel: BlockStrictLevel;
  schedule: "always" | "study_hours" | "custom";
  customStartTime?: string; // HH:mm
  customEndTime?: string; // HH:mm
  category: string;
  createdAt: string;
}
