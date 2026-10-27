import Dexie, { type Table } from "dexie";
import type { AppSettings, StudySession, Subject, Task, Timebox } from "@/types/models";

class FlowTrackDB extends Dexie {
  subjects!: Table<Subject, string>;
  sessions!: Table<StudySession, string>;
  settings!: Table<AppSettings, string>;
  tasks!: Table<Task, string>;
  timeboxes!: Table<Timebox, string>;

  constructor() {
    super("FlowTrackDB");
    this.version(1).stores({
      subjects: "id, name, createdAt",
      sessions: "id, subjectId, startTime, endTime, status, updatedAt",
      settings: "key",
    });
  }
}

export const db = new FlowTrackDB();
