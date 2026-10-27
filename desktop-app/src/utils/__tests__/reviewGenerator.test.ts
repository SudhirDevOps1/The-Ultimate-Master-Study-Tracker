import { describe, it, expect } from "vitest";
import { generateMarkdownReview } from "../reviewGenerator";

describe("Markdown Standup & Review Generator (Commit F2)", () => {
  it("generates markdown with completed tasks and coding languages", () => {
    const md = generateMarkdownReview({
      dateRange: "2026-10-27",
      totalStudySeconds: 7200, // 2h
      focusScore: 88,
      completedTasks: ["Finish Graph BFS algorithm", "Read Chapter 4 of OS"],
      pendingTasks: ["LeetCode Daily Challenge"],
      subjectsBreakdown: [{ name: "DSA", seconds: 3600 }],
      languagesBreakdown: [{ name: "TypeScript", seconds: 3600 }],
      flashcardStats: { reviewed: 25, retentionRate: 0.92, leeches: 1 },
    });

    expect(md).toContain("# 📊 FlowTrack Pro Productivity Review");
    expect(md).toContain("2h 0m");
    expect(md).toContain("88/100 pts");
    expect(md).toContain("- [x] Finish Graph BFS algorithm");
    expect(md).toContain("- [ ] LeetCode Daily Challenge");
    expect(md).toContain("- **TypeScript:** 1h 0m");
    expect(md).toContain("- **Retention Rate:** 92%");
    expect(md).toContain("- **Leeches Flagged:** 1");
  });
});
