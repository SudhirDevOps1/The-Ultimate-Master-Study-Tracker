/**
 * App Activity Tracker
 * Monitors browser tabs and system application usage
 * Stores hourly and daily stats for study analytics
 */

export interface AppUsageEntry {
  appName: string;
  appIcon?: string;
  category: "browser_tab" | "system_app" | "idle";
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  durationSeconds: number;
  url?: string; // for browser tabs
  isActive: boolean;
  date: string; // YYYY-MM-DD
}

export interface DailyAppStats {
  date: string; // YYYY-MM-DD
  totalTime: number; // seconds
  apps: Record<string, { name: string; duration: number; icon?: string; category: string }>;
  hourlyBreakdown: Record<number, number>; // hour -> seconds
}

class AppActivityTracker {
  private activities: Map<string, AppUsageEntry> = new Map();
  private currentApp: { name: string; startTime: number; category: "browser_tab" | "system_app" | "idle" } | null = null;
  private isMonitoring = false;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private lastInteractionTime = Date.now();
  private inactivityThreshold = 10 * 60 * 1000; // 10 minutes

  /**
   * Start monitoring app/tab changes
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.setupListeners();
    this.startInactivityDetection();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    if (this.inactivityTimer) clearInterval(this.inactivityTimer);
    this.removeListeners();
  }

  private boundRecordInteraction = () => this.recordInteraction();
  private boundVisibilityChange = () => this.handleVisibilityChange();

  /**
   * Setup browser activity listeners
   */
  private setupListeners() {
    // Focus events
    window.addEventListener("focus", this.boundRecordInteraction);
    window.addEventListener("blur", this.boundRecordInteraction);

    // User activity events
    document.addEventListener("click", this.boundRecordInteraction);
    document.addEventListener("keydown", this.boundRecordInteraction);
    document.addEventListener("mousemove", this.boundRecordInteraction);
    document.addEventListener("scroll", this.boundRecordInteraction);

    // Visibility change
    document.addEventListener("visibilitychange", this.boundVisibilityChange);

    // Tab title changes (for detecting different tabs/apps)
    this.monitorBrowserTabs();
  }

  /**
   * Remove event listeners
   */
  private removeListeners() {
    window.removeEventListener("focus", this.boundRecordInteraction);
    window.removeEventListener("blur", this.boundRecordInteraction);
    document.removeEventListener("click", this.boundRecordInteraction);
    document.removeEventListener("keydown", this.boundRecordInteraction);
    document.removeEventListener("mousemove", this.boundRecordInteraction);
    document.removeEventListener("scroll", this.boundRecordInteraction);
    document.removeEventListener("visibilitychange", this.boundVisibilityChange);
  }

  /**
   * Record user interaction
   */
  private recordInteraction() {
    this.lastInteractionTime = Date.now();
  }

  /**
   * Start checking for inactivity
   */
  private startInactivityDetection() {
    this.inactivityTimer = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - this.lastInteractionTime;

      if (inactiveTime >= this.inactivityThreshold) {
        this.recordInactivity();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Record inactivity
   */
  private recordInactivity() {
    if (this.currentApp) {
      this.currentApp.name = "Idle / No Activity";
      this.currentApp.category = "idle";
    }
  }

  /**
   * Handle visibility change (tab switch)
   */
  private handleVisibilityChange() {
    if (document.hidden) {
      this.endCurrentActivity();
    } else {
      this.startNewActivity();
    }
  }

  /**
   * Monitor browser tabs using title and URL
   */
  private monitorBrowserTabs() {
    let lastTitle = document.title;
    let lastUrl = window.location.href;

    const observer = new MutationObserver(() => {
      if (document.title !== lastTitle || window.location.href !== lastUrl) {
        lastTitle = document.title;
        lastUrl = window.location.href;
        this.recordTabChange(lastTitle, lastUrl);
      }
    });

    observer.observe(document.head, { childList: true, subtree: true });
  }

  /**
   * Record browser tab change
   */
  private recordTabChange(title: string, url: string) {
    if (this.currentApp) {
      this.endCurrentActivity();
    }

    // Extract domain or app name from title and URL
    const appName = this.extractAppName(title, url);
    this.startNewActivity(appName, "browser_tab", url);
  }

  /**
   * Extract app name from tab title and URL
   */
  private extractAppName(title: string, url: string): string {
    // Try to get domain from URL
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace("www.", "");
      
      // Capitalize first letter
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      // Fallback to title
      return title.split(" ")[0] || "Unknown Tab";
    }
  }

  /**
   * End current activity
   */
  private endCurrentActivity() {
    if (!this.currentApp) return;

    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - this.currentApp.startTime) / 1000);

    if (durationSeconds >= 1) {
      const startIso = new Date(this.currentApp.startTime).toISOString();
      const endIso = new Date(endTime).toISOString();
      const today = new Date().toISOString().split("T")[0];

      const entry: AppUsageEntry = {
        appName: this.currentApp.name,
        category: this.currentApp.category,
        startTime: startIso,
        endTime: endIso,
        durationSeconds,
        isActive: true,
        date: today
      };

      const key = `${today}_${this.currentApp.name}_${this.currentApp.startTime}`;
      this.activities.set(key, entry);

      // Persist to localStorage
      this.persistActivity(entry);
    }

    this.currentApp = null;
  }

  /**
   * Start new activity
   */
  private startNewActivity(appName?: string, category?: "browser_tab" | "system_app" | "idle", url?: string) {
    this.endCurrentActivity();

    this.currentApp = {
      name: appName || "FlowTrack Study",
      startTime: Date.now(),
      category: category || "browser_tab"
    };
  }

  /**
   * Persist activity to localStorage
   */
  private persistActivity(entry: AppUsageEntry) {
    try {
      const key = `app_activity_${entry.date}`;
      const existing = localStorage.getItem(key);
      const data = existing ? JSON.parse(existing) : [];
      data.push(entry);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("[v0] Error persisting app activity:", error);
    }
  }

  /**
   * Get daily app stats
   */
  getDailyStats(date: string): DailyAppStats {
    const stats: DailyAppStats = {
      date,
      totalTime: 0,
      apps: {},
      hourlyBreakdown: {}
    };

    try {
      const key = `app_activity_${date}`;
      const data = localStorage.getItem(key);
      if (!data) return stats;

      const entries: AppUsageEntry[] = JSON.parse(data);

      entries.forEach(entry => {
        stats.totalTime += entry.durationSeconds;

        // App breakdown
        if (!stats.apps[entry.appName]) {
          stats.apps[entry.appName] = {
            name: entry.appName,
            duration: 0,
            category: entry.category
          };
        }
        stats.apps[entry.appName].duration += entry.durationSeconds;

        // Hourly breakdown
        const hour = new Date(entry.startTime).getHours();
        stats.hourlyBreakdown[hour] = (stats.hourlyBreakdown[hour] || 0) + entry.durationSeconds;
      });
    } catch (error) {
      console.error("[v0] Error getting daily stats:", error);
    }

    return stats;
  }

  /**
   * Get all activities for a date
   */
  getActivities(date: string): AppUsageEntry[] {
    try {
      const key = `app_activity_${date}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("[v0] Error getting activities:", error);
      return [];
    }
  }

  /**
   * Export all app data
   */
  exportAllData(): Record<string, any> {
    const allData: Record<string, AppUsageEntry[]> = {};

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("app_activity_")) {
          const date = key.replace("app_activity_", "");
          const data = localStorage.getItem(key);
          if (data) {
            allData[date] = JSON.parse(data);
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error exporting data:", error);
    }

    return allData;
  }

  /**
   * Clear all app activity data
   */
  clearAllData() {
    try {
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("app_activity_")) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error("[v0] Error clearing data:", error);
    }
  }
}

// Export singleton instance
export const appActivityTracker = new AppActivityTracker();
