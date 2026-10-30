import { describe, it, expect } from "vitest";
import { checkSessionOverlap } from "../sessionValidation";
import type { StudySession } from "../../types/models";

describe("Session Overlap & Duplicate Validation (Part H / F6 - Defect B24)", () => {
  const existingSessions: StudySession[] = [
    {
      id: "sess-1",
      subjectId: "math",
      startTime: "2026-10-30T10:00:00.000Z",
      endTime: "2026-10-30T11:00:00.000Z",
      actualSeconds: 3600,
      plannedMinutes: 60,
      status: "completed",
      createdAt: "2026-10-30T10:00:00.000Z",
    },
    {
      id: "sess-2",
      subjectId: "physics",
      startTime: "2026-10-30T14:00:00.000Z",
      endTime: "2026-10-30T15:00:00.000Z",
      actualSeconds: 3600,
      plannedMinutes: 60,
      status: "completed",
      createdAt: "2026-10-30T14:00:00.000Z",
    },
  ];

  it("detects exact duplicate session for the same subject", () => {
    const res = checkSessionOverlap(
      {
        startTime: "2026-10-30T10:00:00.000Z",
        endTime: "2026-10-30T11:00:00.000Z",
        subjectId: "math",
      },
      existingSessions
    );

    expect(res.isDuplicate).toBe(true);
    expect(res.severity).toBe("error");
    expect(res.overlappingSessions.length).toBe(1);
    expect(res.overlappingSessions[0].id).toBe("sess-1");
  });

  it("does NOT flag an overlap as duplicate if subjects are different", () => {
    // In old buggy code (B24), !newSession.subjectId made every overlap a duplicate!
    // When newSession has subjectId "chemistry" overlapping with "math", they are different subjects!
    const res = checkSessionOverlap(
      {
        startTime: "2026-10-30T10:30:00.000Z",
        endTime: "2026-10-30T11:30:00.000Z",
        subjectId: "chemistry",
      },
      existingSessions
    );

    expect(res.isDuplicate).toBe(false);
    expect(res.overlappingSessions.length).toBe(0);
  });

  it("does NOT falsely match existing sessions when newSession has no subjectId", () => {
    // Overlapping in time with sess-1 (math), but newSession has no subjectId specified
    const res = checkSessionOverlap(
      {
        startTime: "2026-10-30T10:15:00.000Z",
        endTime: "2026-10-30T10:45:00.000Z",
      },
      existingSessions
    );

    // Should not claim it's a duplicate of math
    expect(res.isDuplicate).toBe(false);
    expect(res.overlappingSessions.length).toBe(0);
  });

  it("detects partial overlap when subject matches", () => {
    const res = checkSessionOverlap(
      {
        startTime: "2026-10-30T10:30:00.000Z",
        endTime: "2026-10-30T11:30:00.000Z",
        subjectId: "math",
      },
      existingSessions
    );

    expect(res.isDuplicate).toBe(false);
    expect(res.severity).toBe("warning");
    expect(res.overlappingSessions.length).toBe(1);
    expect(res.overlappingSessions[0].id).toBe("sess-1");
  });

  it("passes cleanly when there is no time overlap", () => {
    const res = checkSessionOverlap(
      {
        startTime: "2026-10-30T12:00:00.000Z",
        endTime: "2026-10-30T13:00:00.000Z",
        subjectId: "math",
      },
      existingSessions
    );

    expect(res.isDuplicate).toBe(false);
    expect(res.overlappingSessions.length).toBe(0);
    expect(res.severity).toBe("info");
  });
});
