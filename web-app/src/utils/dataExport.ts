import type { StudySession, Subject } from "@/types/models";

export function exportSessionsToCSV(sessions: StudySession[], subjects: Subject[]): void {
  const subjectMap = new Map(subjects.map(s => [s.id, s.name]));

  const headers = [
    "Date",
    "Subject",
    "Start Time",
    "End Time",
    "Planned Minutes",
    "Actual Minutes",
    "Completion %",
    "Status",
    "Notes",
    "Tags",
  ];

  const rows = sessions.map(session => {
    const subjectName = subjectMap.get(session.subjectId) || "Unknown";
    const startDate = new Date(session.startTime);
    const endDate = new Date(session.endTime);
    const actualMinutes = Math.round(session.actualSeconds / 60);
    const completion = session.plannedMinutes > 0 
      ? ((actualMinutes / session.plannedMinutes) * 100).toFixed(1)
      : "0";

    return [
      startDate.toLocaleDateString("en-US"),
      subjectName,
      startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      endDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      session.plannedMinutes,
      actualMinutes,
      completion,
      session.status.replace("_", " "),
      `"${(session.notes || "").replace(/"/g, '""')}"`,
      `"${session.tags.join(", ")}"`,
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(",")),
  ].join("\n");

  downloadCSV(csvContent, "study-sessions.csv");
}

export function exportSubjectStatsToCSV(sessions: StudySession[], subjects: Subject[]): void {
  const stats = subjects.map(subject => {
    const subjectSessions = sessions.filter(s => s.subjectId === subject.id);
    const totalMinutes = subjectSessions.reduce((acc, s) => acc + s.actualSeconds / 60, 0);
    const completedSessions = subjectSessions.filter(s => s.status === "completed").length;
    const totalSessions = subjectSessions.length;
    const avgCompletion = totalSessions > 0
      ? subjectSessions.reduce((acc, s) => {
          const pct = s.plannedMinutes > 0 ? ((s.actualSeconds / 60) / s.plannedMinutes) * 100 : 0;
          return acc + pct;
        }, 0) / totalSessions
      : 0;

    return [
      subject.name,
      subject.emoji || "📚",
      totalMinutes.toFixed(1),
      completedSessions,
      totalSessions,
      avgCompletion.toFixed(1),
      (totalMinutes / 60).toFixed(1),
    ];
  });

  const headers = [
    "Subject",
    "Emoji",
    "Total Minutes",
    "Completed Sessions",
    "Total Sessions",
    "Avg Completion %",
    "Total Hours",
  ];

  const csvContent = [
    headers.join(","),
    ...stats.map(row => row.join(",")),
  ].join("\n");

  downloadCSV(csvContent, "subject-stats.csv");
}

export function exportAllDataToCSV(sessions: StudySession[], subjects: Subject[]): void {
  // Create a zip-like structure by exporting both files
  exportSessionsToCSV(sessions, subjects);
  setTimeout(() => {
    exportSubjectStatsToCSV(sessions, subjects);
  }, 500);
}

function downloadCSV(content: string, filename: string): void {
  const element = document.createElement("a");
  const file = new Blob([content], { type: "text/csv;charset=utf-8" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}

/**
 * Universal Native & Browser Image Saver.
 * In Electron: triggers native Windows/OS save dialog and saves directly to disk.
 * In Web Browser: triggers automatic anchor download.
 */
export async function saveImageSafely(
  dataUrl: string,
  defaultFilename: string
): Promise<{ success: boolean; filePath?: string; filename?: string; canceled?: boolean; error?: string }> {
  const ipc = (window as any).electron?.ipcRenderer;
  if (ipc) {
    try {
      const res = await ipc.invoke("save-image-file", { dataUrl, defaultFilename });
      if (res?.success) {
        return { success: true, filePath: res.filePath, filename: res.filename };
      }
      if (res?.reason === "canceled") {
        return { success: false, canceled: true };
      }
      if (res?.error) {
        console.warn("Native file save error, falling back to browser download:", res.error);
      }
    } catch (err: any) {
      console.warn("Native file save invoke failed, falling back to browser download:", err);
    }
  }

  // Web Browser / DOM Fallback
  try {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, filename: defaultFilename };
  } catch (err: any) {
    console.error("DOM image download failed:", err);
    return { success: false, error: err?.message || "Failed to download image" };
  }
}

/**
 * Safely opens a saved image.
 * Uses native MSPaint fallback if default Windows Photo viewer throws "Incorrect function".
 */
export async function openSavedImageSafely(filePath: string): Promise<boolean> {
  const ipc = (window as any).electron?.ipcRenderer;
  if (ipc && filePath) {
    try {
      const res = await ipc.invoke("open-image-safely", filePath);
      return !!res?.success;
    } catch (err) {
      console.warn("open-image-safely failed:", err);
    }
  }
  return false;
}
