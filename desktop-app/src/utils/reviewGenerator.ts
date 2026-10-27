export interface ReviewReportData {
  dateRange: string;
  totalStudySeconds: number;
  focusScore?: number;
  completedTasks: string[];
  pendingTasks: string[];
  subjectsBreakdown: { name: string; seconds: number }[];
  languagesBreakdown?: { name: string; seconds: number }[];
  projectsBreakdown?: { name: string; seconds: number }[];
  flashcardStats?: { reviewed: number; retentionRate: number; leeches: number };
}

function fmtMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) return `${h}h ${remM}m`;
  return `${m}m`;
}

/**
 * Generates an executive daily standup or weekly review in clean GitHub-Flavored Markdown.
 * Perfect for GitHub Discussions, Notion, Discord, or personal notes.
 */
export function generateMarkdownReview(data: ReviewReportData): string {
  const lines: string[] = [];

  lines.push(`# 📊 FlowTrack Pro Productivity Review`);
  lines.push(`**Period:** ${data.dateRange}`);
  lines.push(`**Total Study / Focus Time:** ${fmtMinutes(data.totalStudySeconds)}`);
  if (data.focusScore !== undefined) {
    lines.push(`**Focus Score:** ${data.focusScore}/100 pts`);
  }
  lines.push(``);

  // 1. Completed Tasks
  lines.push(`## ✅ Completed Tasks & Achievements`);
  if (data.completedTasks.length === 0) {
    lines.push(`- *No completed tasks recorded in this period.*`);
  } else {
    for (const task of data.completedTasks) {
      lines.push(`- [x] ${task}`);
    }
  }
  lines.push(``);

  // 2. Coding & Languages
  if (
    (data.languagesBreakdown && data.languagesBreakdown.length > 0) ||
    (data.projectsBreakdown && data.projectsBreakdown.length > 0)
  ) {
    lines.push(`## 💻 Coding & Development Activity`);
    if (data.languagesBreakdown && data.languagesBreakdown.length > 0) {
      lines.push(`### Languages`);
      for (const lang of data.languagesBreakdown) {
        lines.push(`- **${lang.name}:** ${fmtMinutes(lang.seconds)}`);
      }
    }
    if (data.projectsBreakdown && data.projectsBreakdown.length > 0) {
      lines.push(`### Workspaces & Projects`);
      for (const proj of data.projectsBreakdown) {
        lines.push(`- **${proj.name}:** ${fmtMinutes(proj.seconds)}`);
      }
    }
    lines.push(``);
  }

  // 3. Subject Breakdown
  lines.push(`## 📚 Subject Focus Breakdown`);
  if (data.subjectsBreakdown.length === 0) {
    lines.push(`- *No subject sessions recorded.*`);
  } else {
    for (const subj of data.subjectsBreakdown) {
      lines.push(`- **${subj.name}:** ${fmtMinutes(subj.seconds)}`);
    }
  }
  lines.push(``);

  // 4. Flashcard & Memory Retention
  if (data.flashcardStats && data.flashcardStats.reviewed > 0) {
    lines.push(`## 🧠 SM-2 Spaced Repetition Stats`);
    lines.push(`- **Cards Reviewed:** ${data.flashcardStats.reviewed}`);
    lines.push(`- **Retention Rate:** ${Math.round(data.flashcardStats.retentionRate * 100)}%`);
    lines.push(`- **Leeches Flagged:** ${data.flashcardStats.leeches}`);
    lines.push(``);
  }

  // 5. Next Priorities
  if (data.pendingTasks.length > 0) {
    lines.push(`## 🎯 Next Priorities & Upcoming Tasks`);
    for (const task of data.pendingTasks) {
      lines.push(`- [ ] ${task}`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Generated autonomously by FlowTrack Pro.*`);

  return lines.join("\n");
}
