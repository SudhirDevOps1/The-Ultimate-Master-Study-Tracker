import { describe, it, expect } from "vitest";
import type { Task, Timebox } from "../../types/models";

describe("Task Model & Timeboxing Integrity (Commit E2)", () => {
  it("creates a well-formed Task object", () => {
    const task: Task = {
      id: "task-101",
      title: "Implement Graph BFS Algorithm",
      description: "Practice traversal questions on LeetCode",
      subjectId: "subj-dsa",
      estimatedMinutes: 45,
      actualMinutes: 30,
      status: "in_progress",
      priority: "high",
      dueDate: "2026-10-30",
      createdAt: new Date().toISOString(),
    };

    expect(task.id).toBe("task-101");
    expect(task.status).toBe("in_progress");
    expect(task.priority).toBe("high");
    expect(task.estimatedMinutes).toBe(45);
  });

  it("creates a well-formed Timebox linked to a Task", () => {
    const timebox: Timebox = {
      id: "tb-202",
      taskId: "task-101",
      startTime: "2026-10-27T10:00:00.000Z",
      endTime: "2026-10-27T10:45:00.000Z",
      plannedMinutes: 45,
      actualMinutes: 40,
      notes: "Solved Problem 133 and 200",
    };

    expect(timebox.taskId).toBe("task-101");
    expect(timebox.plannedMinutes).toBe(45);
    expect(timebox.actualMinutes).toBe(40);
  });
});
