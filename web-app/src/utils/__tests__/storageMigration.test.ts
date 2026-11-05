import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../../lib/db";
import {
  initStorageMigration,
  loadMindMap,
  saveMindMap,
  loadStickyBoard,
  saveStickyBoard,
  MIGRATION_FLAG_KEY,
  LEGACY_MINDMAP_KEY,
  LEGACY_STICKY_KEY,
} from "../storageMigration";
import type { MindNode } from "../../types/models";
import type { StickyNote } from "../../types/notes";

describe("Storage Migration & Dexie v2 Schema Integrity", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("verifies Dexie instance defines all expected v2 store schema properties", () => {
    expect(db.name).toBe("FlowTrackDB");
    // Dexie declares tables property
    expect(db.tables).toBeDefined();
    const tableNames = db.tables.map((t) => t.name);
    expect(tableNames).toContain("subjects");
    expect(tableNames).toContain("sessions");
    expect(tableNames).toContain("settings");
    expect(tableNames).toContain("tasks");
    expect(tableNames).toContain("timeboxes");
    expect(tableNames).toContain("ocrEntries");
    expect(tableNames).toContain("mindMaps");
    expect(tableNames).toContain("boards");
    expect(tableNames).toContain("notepadDocs");
  });

  it("migrates legacy localStorage items and sets migration flag", async () => {
    const legacyNodes: MindNode[] = [
      { id: "root", parentId: null, text: "Algorithms", x: 100, y: 100, color: "#10b981" },
      { id: "c1", parentId: "root", text: "Sorting", x: 200, y: 150, color: "#3b82f6" },
    ];
    const legacyNotes: StickyNote[] = [
      {
        id: "note-1",
        text: "Revise Quicksort",
        color: "bg-yellow-500/15",
        textColor: "text-amber-200",
        font: "font-sans",
        date: "2026-10-29",
        time: "10:00",
        subject: "DSA",
      },
    ];

    localStorage.setItem(LEGACY_MINDMAP_KEY, JSON.stringify(legacyNodes));
    localStorage.setItem(LEGACY_STICKY_KEY, JSON.stringify(legacyNotes));

    await initStorageMigration();

    expect(localStorage.getItem(MIGRATION_FLAG_KEY)).toBe("v2-done");

    const loadedMap = await loadMindMap();
    expect(loadedMap.nodes.length).toBe(2);
    expect(loadedMap.nodes[0].text).toBe("Algorithms");

    const loadedBoard = await loadStickyBoard();
    expect(loadedBoard.notes.length).toBe(1);
    expect(loadedBoard.notes[0].text).toBe("Revise Quicksort");
  });

  it("supports saveMindMap and loadMindMap roundtrip", async () => {
    const nodes: MindNode[] = [
      { id: "root", parentId: null, text: "Systems", x: 300, y: 200, color: "#a855f7" },
    ];
    const relationships = [
      { id: "rel-1", from: "root", to: "c1", label: "depends on" },
    ];

    await saveMindMap(nodes, relationships, "right-only");

    const loaded = await loadMindMap();
    expect(loaded.nodes.length).toBe(1);
    expect(loaded.nodes[0].text).toBe("Systems");
  });

  it("supports saveStickyBoard and loadStickyBoard roundtrip", async () => {
    const notes: StickyNote[] = [
      {
        id: "n1",
        text: "Note in Frame",
        color: "bg-cyan-500/15",
        textColor: "text-cyan-200",
        font: "font-mono",
        date: "2026-10-29",
        time: "12:00",
        subject: "OS",
        frameId: "f1",
      },
    ];
    const frames = [
      { id: "f1", title: "Processes", x: 10, y: 10, w: 300, h: 400 },
    ];
    const connectors = [
      { id: "conn-1", from: "n1", to: "n2", label: "IPC" },
    ];

    await saveStickyBoard(notes, frames, connectors);

    const loaded = await loadStickyBoard();
    expect(loaded.notes.length).toBe(1);
    expect(loaded.notes[0].text).toBe("Note in Frame");
  });
});
