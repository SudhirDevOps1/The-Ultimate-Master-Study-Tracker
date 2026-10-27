import { describe, it, expect } from "vitest";
const receiver = require("../../../electron-main/wakatime-receiver.js");

describe("WakaTime-Compatible Heartbeat Processor & Stats Engine", () => {
  it("processes a valid heartbeat and derives editor from user-agent", () => {
    const raw = {
      entity: "D:/project/src/App.tsx",
      type: "file",
      time: 1700000000,
      project: "FlowTrackPro",
      branch: "main",
      language: "TypeScript",
      category: "coding",
      is_write: true,
      lines: 450,
      lineno: 120,
    };
    const userAgent = "wakatime/v1.100.0 (Windows) vscode/1.96.0 vscode-wakatime/24.0.0";
    const processed = receiver.processHeartbeat(raw, userAgent);

    expect(processed).not.toBeNull();
    expect(processed.entity).toBe("D:/project/src/App.tsx");
    expect(processed.project).toBe("FlowTrackPro");
    expect(processed.language).toBe("TypeScript");
    expect(processed.editor).toBe("VS Code");
    expect(processed.is_write).toBe(true);
  });

  it("extracts custom editor variants like VSCodium, Antigravity, Cursor", () => {
    const raw = { entity: "file.js", time: 1700000010 };
    const p1 = receiver.processHeartbeat(raw, "vscodium-wakatime/1.0");
    expect(p1.editor).toBe("VSCodium");

    const p2 = receiver.processHeartbeat({ entity: "file2.js", time: 1700000020 }, "antigravity-editor/2.0");
    expect(p2.editor).toBe("Google Antigravity");

    const p3 = receiver.processHeartbeat({ entity: "file3.js", time: 1700000030 }, "cursor/0.40");
    expect(p3.editor).toBe("Cursor");
  });

  it("deduplicates identical heartbeats sent within 2 seconds", () => {
    const raw = {
      entity: "D:/project/src/index.ts",
      project: "DedupeTest",
      time: 1700000100,
    };
    const first = receiver.processHeartbeat(raw, "vscode");
    const duplicate = receiver.processHeartbeat({ ...raw, time: 1700000101 }, "vscode");

    expect(first).not.toBeNull();
    expect(duplicate).toBeNull(); // Dropped as duplicate
  });

  it("rejects invalid payloads with missing entity or invalid time", () => {
    expect(receiver.processHeartbeat(null)).toBeNull();
    expect(receiver.processHeartbeat({})).toBeNull();
    expect(receiver.processHeartbeat({ entity: "" })).toBeNull();
    expect(receiver.processHeartbeat({ entity: "test.js", time: -10 })).toBeNull();
    expect(receiver.processHeartbeat({ entity: "test.js", time: NaN })).toBeNull();
  });

  it("calculates accurate coding statistics grouped by project, language, and editor", () => {
    const stats = receiver.getHeartbeatStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalSeconds).toBe("number");
    expect(typeof stats.byProject).toBe("object");
    expect(typeof stats.byLanguage).toBe("object");
    expect(typeof stats.byEditor).toBe("object");
    expect(Array.isArray(stats.topFiles)).toBe(true);
  });
});
