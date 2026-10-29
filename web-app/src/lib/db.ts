import Dexie, { type Table } from "dexie";
import type { AppSettings, StudySession, Subject, Task, Timebox, OcrEntry, MindMapDoc, StickyBoardDoc } from "@/types/models";
import type { NotepadDoc } from "@/types/notes";

export class FlowTrackDB extends Dexie {
  subjects!: Table<Subject, string>;
  sessions!: Table<StudySession, string>;
  settings!: Table<AppSettings, string>;
  tasks!: Table<Task, string>;
  timeboxes!: Table<Timebox, string>;
  ocrEntries!: Table<OcrEntry, string>;
  mindMaps!: Table<MindMapDoc, string>;
  boards!: Table<StickyBoardDoc, string>;
  notepadDocs!: Table<NotepadDoc, string>;

  constructor() {
    super("FlowTrackDB");

    // Version 1: Initial schema
    this.version(1).stores({
      subjects: "id, name, createdAt",
      sessions: "id, subjectId, startTime, endTime, status, updatedAt",
      settings: "key",
    });

    // Version 2: Added missing task/timebox/OCR tables, plus MindMap, StickyBoard & Notepad docs
    this.version(2).stores({
      subjects: "id, name, createdAt",
      sessions: "id, subjectId, startTime, endTime, status, updatedAt",
      settings: "key",
      tasks: "id, subjectId, status, dueDate, createdAt",
      timeboxes: "id, taskId, startTime, endTime, date",
      ocrEntries: "id, subjectId, timestamp",
      mindMaps: "id, title, updatedAt",
      boards: "id, title, updatedAt",
      notepadDocs: "id, category, updatedAt"
    });
  }
}

export const db = new FlowTrackDB();
