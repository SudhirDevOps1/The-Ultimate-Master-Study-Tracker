import { describe, it, expect } from "vitest";
import { aggregateCodingStats, type HeartbeatItem } from "../editorInfo";

describe("Coding Stats & Editor Aggregator", () => {
  it("handles empty heartbeats cleanly with honest zeroes", () => {
    const stats = aggregateCodingStats([]);
    expect(stats.totalSeconds).toBe(0);
    expect(stats.totalHeartbeats).toBe(0);
    expect(stats.languages).toHaveLength(0);
    expect(stats.projects).toHaveLength(0);
    expect(stats.editors).toHaveLength(0);
  });

  it("accurately aggregates coding time by language and editor", () => {
    const heartbeats: HeartbeatItem[] = [
      { entity: "App.tsx", time: 1000, language: "TypeScript", project: "FlowTrack", editor: "VS Code" },
      { entity: "App.tsx", time: 1060, language: "TypeScript", project: "FlowTrack", editor: "VS Code" },
      { entity: "main.py", time: 2000, language: "Python", project: "StudyAI", editor: "Cursor" },
    ];

    const stats = aggregateCodingStats(heartbeats);
    expect(stats.totalHeartbeats).toBe(3);
    expect(stats.totalSeconds).toBeGreaterThan(0);

    const ts = stats.languages.find(l => l.name === "TypeScript");
    expect(ts).toBeDefined();

    const py = stats.languages.find(l => l.name === "Python");
    expect(py).toBeDefined();

    const ed = stats.editors.find(e => e.name === "VS Code");
    expect(ed).toBeDefined();
  });
});
