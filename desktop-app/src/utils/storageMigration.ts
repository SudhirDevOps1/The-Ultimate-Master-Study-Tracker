import { db } from "../lib/db";
import type { MindNode, MindMapRelationship, MindMapDoc, StickyBoardDoc } from "../types/models";
import type { StickyNote, BoardFrame, BoardConnector, NotepadDoc } from "../types/notes";

export const MIGRATION_FLAG_KEY = "flowtrack_storage_migration_v2";
export const LEGACY_MINDMAP_KEY = "flowtrack_pro_mindmap_nodes_v2";
export const LEGACY_STICKY_KEY = "workspace_sticky_notes";
export const LEGACY_NOTEPAD_KEY = "flowtrack_notepad_docs_v2";

export const DEFAULT_MAP_ID = "default_mindmap";
export const DEFAULT_BOARD_ID = "default_board";

const hasIndexedDB = (): boolean => {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined" && window.indexedDB !== null;
};

/**
 * Idempotently migrates localStorage mind maps, sticky notes, and notepad documents
 * into Dexie v2 tables, protecting against browser 5-10 MB localStorage limits.
 */
export async function initStorageMigration(): Promise<void> {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;

    const migrationDone = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationDone === "v2-done") return;

    if (hasIndexedDB()) {
      // 1. Mind Map Migration
      const rawMindMap = localStorage.getItem(LEGACY_MINDMAP_KEY);
      if (rawMindMap) {
        try {
          const parsedNodes: MindNode[] = JSON.parse(rawMindMap);
          if (Array.isArray(parsedNodes) && parsedNodes.length > 0) {
            const existing = await db.mindMaps.get(DEFAULT_MAP_ID);
            if (!existing) {
              const now = new Date().toISOString();
              await db.mindMaps.put({
                id: DEFAULT_MAP_ID,
                title: "My Mind Map",
                nodes: parsedNodes,
                relationships: [],
                layoutMode: "balanced",
                createdAt: now,
                updatedAt: now,
              });
            }
          }
        } catch (err) {
          console.warn("[StorageMigration] Failed to parse legacy mindmap:", err);
        }
      }

      // 2. Sticky Notes Migration
      const rawSticky = localStorage.getItem(LEGACY_STICKY_KEY);
      if (rawSticky) {
        try {
          const parsedNotes: StickyNote[] = JSON.parse(rawSticky);
          if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
            const existing = await db.boards.get(DEFAULT_BOARD_ID);
            if (!existing) {
              const now = new Date().toISOString();
              await db.boards.put({
                id: DEFAULT_BOARD_ID,
                title: "Study Notes Board",
                notes: parsedNotes,
                frames: [],
                connectors: [],
                createdAt: now,
                updatedAt: now,
              });
            }
          }
        } catch (err) {
          console.warn("[StorageMigration] Failed to parse legacy sticky notes:", err);
        }
      }

      // 3. Notepad Documents Migration
      const rawNotepad = localStorage.getItem(LEGACY_NOTEPAD_KEY);
      if (rawNotepad) {
        try {
          const parsedDocs: NotepadDoc[] = JSON.parse(rawNotepad);
          if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
            for (const doc of parsedDocs) {
              if (doc && doc.id) {
                const existing = await db.notepadDocs.get(doc.id);
                if (!existing) {
                  await db.notepadDocs.put(doc);
                }
              }
            }
          }
        } catch (err) {
          console.warn("[StorageMigration] Failed to parse legacy notepad docs:", err);
        }
      }
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, "v2-done");
  } catch (err) {
    console.warn("[StorageMigration] Storage migration error:", err);
  }
}

/**
 * Loads mind map data from Dexie with fallback to localStorage.
 */
export async function loadMindMap(): Promise<{
  nodes: MindNode[];
  relationships: MindMapRelationship[];
  layoutMode: "balanced" | "right-only" | "tree";
}> {
  if (hasIndexedDB()) {
    try {
      const doc = await db.mindMaps.get(DEFAULT_MAP_ID);
      if (doc && Array.isArray(doc.nodes)) {
        return {
          nodes: doc.nodes,
          relationships: doc.relationships || [],
          layoutMode: doc.layoutMode || "balanced",
        };
      }
    } catch (err) {
      console.warn("[StorageMigration] Dexie loadMindMap failed, falling back to localStorage", err);
    }
  }

  // Fallback to localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem(LEGACY_MINDMAP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return {
            nodes: parsed,
            relationships: [],
            layoutMode: "balanced",
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return { nodes: [], relationships: [], layoutMode: "balanced" };
}

/**
 * Saves mind map data to Dexie and mirrors to localStorage.
 */
export async function saveMindMap(
  nodes: MindNode[],
  relationships: MindMapRelationship[] = [],
  layoutMode: "balanced" | "right-only" | "tree" = "balanced"
): Promise<void> {
  const now = new Date().toISOString();
  const doc: MindMapDoc = {
    id: DEFAULT_MAP_ID,
    title: "My Mind Map",
    nodes,
    relationships,
    layoutMode,
    updatedAt: now,
    createdAt: now,
  };

  if (hasIndexedDB()) {
    try {
      await db.mindMaps.put(doc);
    } catch (err) {
      console.warn("[StorageMigration] Dexie saveMindMap error:", err);
    }
  }

  // Also mirror to localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(LEGACY_MINDMAP_KEY, JSON.stringify(nodes));
    } catch {
      // quota safe
    }
  }
}

/**
 * Loads sticky board data from Dexie with fallback to localStorage.
 */
export async function loadStickyBoard(): Promise<{
  notes: StickyNote[];
  frames: BoardFrame[];
  connectors: BoardConnector[];
}> {
  if (hasIndexedDB()) {
    try {
      const doc = await db.boards.get(DEFAULT_BOARD_ID);
      if (doc && Array.isArray(doc.notes)) {
        return {
          notes: doc.notes as StickyNote[],
          frames: (doc.frames as BoardFrame[]) || [],
          connectors: (doc.connectors as BoardConnector[]) || [],
        };
      }
    } catch (err) {
      console.warn("[StorageMigration] Dexie loadStickyBoard failed, falling back to localStorage", err);
    }
  }

  // Fallback to localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem(LEGACY_STICKY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return {
            notes: parsed,
            frames: [],
            connectors: [],
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return { notes: [], frames: [], connectors: [] };
}

/**
 * Saves sticky board data to Dexie and mirrors to localStorage.
 */
export async function saveStickyBoard(
  notes: StickyNote[],
  frames: BoardFrame[] = [],
  connectors: BoardConnector[] = []
): Promise<void> {
  const now = new Date().toISOString();
  const doc: StickyBoardDoc = {
    id: DEFAULT_BOARD_ID,
    title: "Study Notes Board",
    notes,
    frames,
    connectors,
    updatedAt: now,
    createdAt: now,
  };

  if (hasIndexedDB()) {
    try {
      await db.boards.put(doc);
    } catch (err) {
      console.warn("[StorageMigration] Dexie saveStickyBoard error:", err);
    }
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(LEGACY_STICKY_KEY, JSON.stringify(notes));
    } catch {
      // quota safe
    }
  }
}
