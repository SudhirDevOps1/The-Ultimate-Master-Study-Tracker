/**
 * FlowTrack Pro - Centralized Version & Release Configuration
 * 
 * SINGLE SOURCE OF TRUTH:
 * Updating APP_VERSION here automatically updates:
 *  - What's New / Welcome changelog modal & localStorage tracking
 *  - Dashboard version badges
 *  - Settings page version indicators
 *  - Study report validation signatures
 *  - System Guide release badges
 */

export const APP_VERSION = "0.3.0";
export const APP_NAME = "FlowTrack Pro";
export const APP_EDITION = "2026 Enterprise Edition";
export const APP_RELEASE_DATE = "2026-10-30";

export interface ChangelogHighlight {
  icon: string;
  title: string;
  description: string;
}

export interface VersionChangelog {
  version: string;
  releaseDate: string;
  badge: string;
  title: string;
  description: string;
  highlights: ChangelogHighlight[];
}

export const CURRENT_CHANGELOG: VersionChangelog = {
  version: APP_VERSION,
  releaseDate: APP_RELEASE_DATE,
  badge: `Shipped: v${APP_VERSION}`,
  title: `What's New in FlowTrack Pro v${APP_VERSION}!`,
  description: "Explore the latest premium features, low-RAM optimizations, and security updates added to your tracker.",
  highlights: [
    {
      icon: "⏱️",
      title: "Modernized Circular Study Timer",
      description: "High-precision SVG dial with quick duration presets (15m, 25m, 45m, 60m, 90m), Zen focus overlay, and automatic audio suspension."
    },
    {
      icon: "🤖",
      title: "AI Smart Scheduler & Timeblocking",
      description: "24-hour visual schedule blocks with conflict-detection, 1-click recovery recommendations, and persistent 5m pre-alerts."
    },
    {
      icon: "🗂️",
      title: "SRS Flashcard Studio (SuperMemo SM-2)",
      description: "Spaced repetition algorithm with Ease Factors (EF >= 1.3), Zen review flip mode, LaTeX math formulas, and code snippet rendering."
    },
    {
      icon: "📊",
      title: "Deep Analytics & Focus Breakdown",
      description: "Tiered overview with macro KPIs, real-time distraction incursion tracking, and diagnostic telemetry probes without fake mocks."
    },
    {
      icon: "🛡️",
      title: "Distraction Shield & Process Blocker",
      description: "Configurable Soft, Medium, and Hard distraction enforcement with OS active window monitoring."
    },
    {
      icon: "📅",
      title: "Unified Calendar & Exam Readiness Vault",
      description: "Multi-week study density heatmaps with syllabus readiness tracking and milestone countdowns."
    },
    {
      icon: "⚡",
      title: "Ultra Low-RAM Invariants (<128MB Heap)",
      description: "Auto-disposal of Web Audio contexts, single active webview DOM, and spliced activity logs for 60 FPS fluidity."
    }
  ]
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getChangelogStorageKey(version = APP_VERSION): string {
  return `flowtrack_changelog_v${version}`;
}

export function hasSeenCurrentChangelog(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(getChangelogStorageKey()) === "true";
  } catch {
    return false;
  }
}

export function markCurrentChangelogAsSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getChangelogStorageKey(), "true");
  } catch {
    // Ignore quota or disabled storage
  }
}
