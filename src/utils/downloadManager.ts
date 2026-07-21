import type { StudySession, Subject } from "@/types/models";
import { format } from "date-fns";
import { downloadThrottler } from "@/utils/downloadOptimization";

export type DownloadFormat = "pdf" | "csv" | "json" | "html";

interface DownloadProgress {
  isLoading: boolean;
  progress: number;
  message: string;
}

export class DownloadManager {
  static async downloadReport(
    format: DownloadFormat,
    sessions: StudySession[],
    subjects: Subject[],
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    try {
      // Throttle downloads to prevent accidental duplicates
      if (!downloadThrottler.canDownload()) {
        throw new Error("Please wait before downloading again");
      }

      onProgress?.({ isLoading: true, progress: 10, message: "Preparing report..." });

      switch (format) {
        case "pdf":
          await this.downloadPDF(sessions, subjects, onProgress);
          break;
        case "csv":
          await this.downloadCSV(sessions, subjects, onProgress);
          break;
        case "json":
          await this.downloadJSON(sessions, subjects, onProgress);
          break;
        case "html":
          await this.downloadHTML(sessions, subjects, onProgress);
          break;
      }

      onProgress?.({ isLoading: false, progress: 100, message: "Download complete!" });
    } catch (error) {
      console.error("[v0] Download error:", error);
      throw new Error(`Failed to download ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private static async downloadPDF(
    _sessions: StudySession[],
    _subjects: Subject[],
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    onProgress?.({ isLoading: true, progress: 20, message: "Generating PDF..." });

    // Open print dialog which saves as PDF
    await new Promise(resolve => setTimeout(resolve, 300));
    window.print();

    onProgress?.({ isLoading: true, progress: 80, message: "PDF ready" });
  }

  private static async downloadCSV(
    sessions: StudySession[],
    subjects: Subject[],
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    onProgress?.({ isLoading: true, progress: 30, message: "Converting to CSV..." });

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

    onProgress?.({ isLoading: true, progress: 50, message: "Processing data..." });

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

    onProgress?.({ isLoading: true, progress: 75, message: "Creating download..." });

    this.triggerDownload(csvContent, "study-sessions.csv", "text/csv");

    onProgress?.({ isLoading: true, progress: 90, message: "Finalizing..." });
  }

  private static async downloadJSON(
    sessions: StudySession[],
    subjects: Subject[],
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    onProgress?.({ isLoading: true, progress: 30, message: "Generating JSON..." });

    await new Promise(resolve => setTimeout(resolve, 200));

    const exportData = {
      exportedAt: new Date().toISOString(),
      app: "FlowTrack",
      version: "1.0",
      totalSessions: sessions.length,
      totalSubjects: subjects.length,
      data: {
        subjects,
        sessions,
      },
      summary: {
        totalStudyTime: sessions.reduce((acc, s) => acc + s.actualSeconds, 0) / 3600,
        uniqueStudyDays: new Set(sessions.map(s => format(new Date(s.startTime), "yyyy-MM-dd"))).size,
        averageSessionLength: sessions.length > 0 
          ? Math.round(sessions.reduce((acc, s) => acc + s.actualSeconds, 0) / sessions.length / 60)
          : 0,
      },
    };

    onProgress?.({ isLoading: true, progress: 70, message: "Creating download..." });

    const jsonContent = JSON.stringify(exportData, null, 2);
    this.triggerDownload(jsonContent, "study-data.json", "application/json");

    onProgress?.({ isLoading: true, progress: 90, message: "Finalizing..." });
  }

  private static async downloadHTML(
    sessions: StudySession[],
    subjects: Subject[],
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    onProgress?.({ isLoading: true, progress: 30, message: "Generating HTML..." });

    const totalSeconds = sessions.reduce((acc, s) => acc + s.actualSeconds, 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);

    onProgress?.({ isLoading: true, progress: 50, message: "Building report..." });

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlowTrack Study Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 900;
    }
    .header p {
      font-size: 0.9em;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .stat-label {
      font-size: 0.8em;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 2em;
      font-weight: 900;
      color: #333;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      font-size: 1.5em;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
      color: #333;
    }
    .subject-row {
      display: flex;
      justify-content: space-between;
      padding: 15px;
      background: #f8f9fa;
      margin-bottom: 10px;
      border-radius: 6px;
      align-items: center;
    }
    .subject-name {
      font-weight: 600;
      flex: 1;
    }
    .progress-bar {
      flex: 1;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      margin: 0 20px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }
    .subject-hours {
      font-weight: 900;
      min-width: 80px;
      text-align: right;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      color: #999;
      font-size: 0.9em;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 FlowTrack Study Report</h1>
      <p>Performance Analytics & Study Summary</p>
    </div>
    
    <div class="content">
      <div class="stats">
        <div class="stat-card">
          <div class="stat-label">Total Study Time</div>
          <div class="stat-value">${totalHours}h</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Sessions</div>
          <div class="stat-value">${sessions.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Subjects Studied</div>
          <div class="stat-value">${subjects.length}</div>
        </div>
      </div>

      <div class="section">
        <h2>Subject Breakdown</h2>
        ${subjects.map(subject => {
          const subSessions = sessions.filter(s => s.subjectId === subject.id);
          const subSeconds = subSessions.reduce((acc, s) => acc + s.actualSeconds, 0);
          const subHours = (subSeconds / 3600).toFixed(1);
          const percentage = totalHours === "0.0" ? 0 : Math.round((parseFloat(subHours) / parseFloat(totalHours)) * 100);
          return `
            <div class="subject-row">
              <div class="subject-name">${subject.emoji || "📚"} ${subject.name}</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
              </div>
              <div class="subject-hours">${subHours}h (${percentage}%)</div>
            </div>
          `;
        }).join("")}
      </div>

      <div class="section">
        <h2>Study Statistics</h2>
        <div class="stat-card">
          <div class="stat-label">Average Session Duration</div>
          <div class="stat-value">${sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.actualSeconds, 0) / sessions.length / 60) : 0} min</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}</p>
      <p>FlowTrack Pro v1.0 • Privacy First • Data Owned by User</p>
    </div>
  </div>
</body>
</html>
    `;

    onProgress?.({ isLoading: true, progress: 75, message: "Creating download..." });

    this.triggerDownload(htmlContent, "study-report.html", "text/html");

    onProgress?.({ isLoading: true, progress: 90, message: "Finalizing..." });
  }

  private static triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export async function downloadReport(
  format: DownloadFormat,
  sessions: StudySession[],
  subjects: Subject[],
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  return DownloadManager.downloadReport(format, sessions, subjects, onProgress);
}
