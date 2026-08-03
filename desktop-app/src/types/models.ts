// Shared Data Models across FlowTrack Pro Ecosystem

export type RecurrenceType = "none" | "daily" | "weekly" | "custom_days" | "monthly" | "custom";

export interface RecurrenceConfig {
  type: RecurrenceType;
  customDays?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  daysOfWeek?: number[];
  endDate?: string;      // YYYY-MM-DD string, optional cap
  interval?: number;
  occurrences?: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  targetHours?: number;
  weeklyGoalMinutes?: number;
  emoji?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SessionStatus = "planned" | "in_progress" | "paused" | "completed" | "cancelled";

export interface StudySession {
  id: string;
  subjectId: string;
  startTime: string; // ISO String
  endTime?: string;   // ISO String
  plannedMinutes: number;
  actualSeconds: number;
  notes?: string;
  tags?: string[];
  status: SessionStatus;
  isOverdue?: boolean;
  recurrence?: RecurrenceConfig;
  streakContribution?: boolean;
  colorTag?: string;
  manualEntry?: boolean;
  seriesId?: string;
  parentSessionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  targetHours: number;
  currentHours: number;
  deadline: string;
  completed: boolean;
}

export interface ExamCountdown {
  id: string;
  subjectId: string;
  title: string;
  examDate: string; // ISO String
  targetScore?: string;
  notes?: string;
}

export interface Flashcard {
  id: string;
  subjectId: string;
  question: string;
  answer: string;
  options?: string[]; // Multiple choice options
  correctOptionIndex?: number;
  difficulty?: "easy" | "medium" | "hard";
  lastReviewed?: string;
  nextReviewDate?: string;
  easeFactor?: number;
  intervalDays?: number;
  repetitionCount?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subjectId?: string;
  updatedAt: string;
  tags?: string[];
}

export interface UserProfile {
  name: string;
  email?: string;
  avatarUrl?: string;
  goal?: string;
  age?: number | string;
  profession?: string;
  dailyContext?: string;
  goldenRule?: string;
}

export type ThemeName = "ocean" | "forest" | "sunset" | "galaxy" | "cyber" | "default" | "neon" | "paper" | string;

export interface ThemeConfig {
  mode?: "dark" | "light" | "custom";
  accentColor?: string;
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  bgGradient?: string;
  gradientFrom?: string;
  gradientTo?: string;
  borderGlow?: string;
  textGradient?: string;
  cardBg?: string;
  hoverGlow?: string;
  activeRing?: string;
}

export type TimerMode = "stopwatch" | "pomodoro" | "countdown";

export interface PomodoroConfig {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number; // e.g. every 4 sessions
}

export interface TimerState {
  mode: TimerMode;
  activeSessionId: string | null;
  elapsedSeconds: number;
  isPaused: boolean;
  isBreak: boolean;
  pomodoroCount: number;
  lastInteractionAtMs?: number;
}

export interface TimerSnapshot {
  activeSessionId: string | null;
  elapsedSeconds?: number;
  isPaused: boolean;
  startedAtMs?: number;
  pausedAtMs?: number;
  hiddenAtMs?: number;
  lastInteractionAtMs?: number;
  accumulatedSeconds?: number;
}

export interface Achievement {
  id: string;
  title?: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  name?: string;
  color?: string;
  progress?: number;
  maxProgress?: number;
}

export type AchievementType = string;

export type AIProvider = "gemini" | "ollama" | "custom" | "openai" | "groq" | "cerebras" | "mistral" | "grok" | "local_rules" | "none";

export interface CustomAIProvider {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  modelName: string;
}

export interface AiConfig {
  provider: AIProvider;
  geminiApiKey?: string;
  ollamaModel?: string;
  ollamaUrl?: string;
  apiKey?: string;
  model?: string;
  customProviderEndpoint?: string;
  apiKeys?: Record<string, string>;
  customProvider?: {
    name: string;
    endpoint: string;
    apiKey: string;
  };
  customProviders?: CustomAIProvider[];
  activeCustomProviderId?: string;
}

export interface AppSettings {
  key?: string;
  value?: any;
  theme?: string;
  dailyGoalHours?: number;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  strictFocusMode?: boolean;
}

export type AnalyticsRange = "day" | "week" | "month" | "year" | "all" | "last7days" | "last30days" | "last90days" | "last6months" | "last12months" | "alltime" | "daily" | "weekly" | "monthly" | "yearly";

export interface AnalyticsMetric {
  id?: string;
  name?: string;
  value?: number;
  unit?: string;
  label?: string;
  fullLabel?: string;
  plannedHours?: number;
  actualHours?: number;
  completionPct?: number;
  focusRatio?: number;
  totalSessions?: number;
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
  ruleType?: "app" | "website";
  createdAt: string;
}
