import type { StudySession, Subject } from "@/types/models";

export interface BackupPayload {
  exportedAt: string;
  app: "FlowTrack";
  subjects: Subject[];
  sessions: StudySession[];
  settings?: { key: string; value: string }[];
  activities?: any[];
}

export function exportData(payload: BackupPayload): void {
  const cleanedPayload = JSON.parse(JSON.stringify(payload)) as BackupPayload;
  if (cleanedPayload.settings) {
    cleanedPayload.settings = cleanedPayload.settings.map(setting => {
      if (setting.key === "ai_config") {
        try {
          const parsed = JSON.parse(setting.value);
          if (parsed.apiKey) parsed.apiKey = "";
          if (parsed.apiKeys) {
            Object.keys(parsed.apiKeys).forEach(k => {
              parsed.apiKeys[k] = "";
            });
          }
          return { key: setting.key, value: JSON.stringify(parsed) };
        } catch {
          return setting;
        }
      }
      return setting;
    });
  }

  const blob = new Blob([JSON.stringify(cleanedPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<BackupPayload> {
  const text = await file.text();
  
  let parsed: any;
  try {
    parsed = JSON.parse(text) as BackupPayload;
  } catch (e) {
    throw new Error("Invalid JSON format: File is corrupted or not a valid backup");
  }
  
  // Strict structure validation
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid backup format: Must be a JSON object");
  }

  // Validate core fields
  if (parsed.subjects && !Array.isArray(parsed.subjects)) {
    throw new Error("Invalid structure: 'subjects' must be an array");
  }
  if (parsed.sessions && !Array.isArray(parsed.sessions)) {
    throw new Error("Invalid structure: 'sessions' must be an array");
  }

  // Sanitize session data
  if (parsed.sessions && Array.isArray(parsed.sessions)) {
    parsed.sessions = parsed.sessions.filter((session: any) => {
      // Validate required session fields
      if (!session.id || !session.subjectId || !session.startTime || !session.endTime) {
        console.warn("[Import] Skipping invalid session:", session);
        return false;
      }
      
      // Ensure numeric fields
      if (typeof session.plannedMinutes !== "number") session.plannedMinutes = 0;
      if (typeof session.actualSeconds !== "number") session.actualSeconds = 0;
      
      // Sanitize status
      const validStatuses = ["planned", "in_progress", "paused", "completed"];
      if (!validStatuses.includes(session.status)) {
        session.status = "planned";
      }

      return true;
    });
  }

  // Sanitize subject data
  if (parsed.subjects && Array.isArray(parsed.subjects)) {
    parsed.subjects = parsed.subjects.filter((subject: any) => {
      // Validate required subject fields
      if (!subject.id || !subject.name || !subject.color) {
        console.warn("[Import] Skipping invalid subject:", subject);
        return false;
      }
      
      // Ensure weeklyGoalMinutes is numeric if present
      if (subject.weeklyGoalMinutes && typeof subject.weeklyGoalMinutes !== "number") {
        subject.weeklyGoalMinutes = 0;
      }

      return true;
    });
  }

  // Ensure standard fields exist. If missing, initialize them to prevent UI crashes.
  if (!parsed.subjects) parsed.subjects = [];
  if (!parsed.sessions) parsed.sessions = [];
  
  // Set app header if not present
  parsed.app = "FlowTrack";
  
  // Add import timestamp
  parsed.importedAt = new Date().toISOString();
  
  return parsed;
}

export interface ImportValidationReport {
  isValid: boolean;
  subjectsCount: number;
  sessionsCount: number;
  skippedSessions: number;
  skippedSubjects: number;
  warnings: string[];
  errors: string[];
  estimatedStorageSize: number; // in bytes
}

export function validateImportFile(payload: BackupPayload): ImportValidationReport {
  const warnings: string[] = [];
  const errors: string[] = [];
  let skippedSessions = 0;
  let skippedSubjects = 0;

  // Check app identifier
  if (payload.app !== "FlowTrack") {
    warnings.push("This backup was not created by FlowTrack. Compatibility may be limited.");
  }

  // Validate sessions
  let sessionCount = 0;
  if (payload.sessions && Array.isArray(payload.sessions)) {
    payload.sessions.forEach((session: any) => {
      if (!session.id || !session.subjectId || !session.startTime || !session.endTime) {
        skippedSessions++;
      } else if (typeof session.actualSeconds !== "number" || session.actualSeconds < 0) {
        warnings.push(`Session "${session.id}" has invalid time data.`);
        sessionCount++;
      } else {
        sessionCount++;
      }
    });
  }

  // Validate subjects
  let subjectCount = 0;
  if (payload.subjects && Array.isArray(payload.subjects)) {
    payload.subjects.forEach((subject: any) => {
      if (!subject.id || !subject.name || !subject.color) {
        skippedSubjects++;
      } else {
        subjectCount++;
      }
    });
  }

  // Check for orphaned sessions (sessions with deleted subjects)
  if (payload.sessions && payload.subjects) {
    const subjectIds = new Set(payload.subjects.map((s: any) => s.id));
    const orphaned = payload.sessions.filter((s: any) => !subjectIds.has(s.subjectId));
    if (orphaned.length > 0) {
      warnings.push(`${orphaned.length} sessions reference deleted subjects. They will be imported but won't display subjects.`);
    }
  }

  // Estimate storage size
  const estimatedSize = JSON.stringify(payload).length;

  return {
    isValid: errors.length === 0,
    subjectsCount: subjectCount,
    sessionsCount: sessionCount,
    skippedSessions,
    skippedSubjects,
    warnings,
    errors,
    estimatedStorageSize: estimatedSize
  };
}

