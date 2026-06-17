import type { StudySession, Subject } from "@/types/models";

export interface BackupPayload {
  exportedAt: string;
  app: "FlowTrack";
  subjects: Subject[];
  sessions: StudySession[];
  settings?: { key: string; value: string }[];
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
  const parsed = JSON.parse(text) as BackupPayload;
  if (parsed.app !== "FlowTrack") {
    throw new Error("Invalid FlowTrack backup file");
  }
  return parsed;
}
