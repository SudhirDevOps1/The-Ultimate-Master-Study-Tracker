import { describe, it, expect } from "vitest";
import {
  wouldCreateCycle,
  reparentNode,
  removeNodeAndDescendants,
  cleanupRelationships,
  calculateTreeLayout,
  calculateDownscaleDimensions,
} from "../mindmapGraph";
import type { MindNode, MindMapRelationship } from "../../types/models";

describe("MindMap Graph Algorithms & Layout Engine (Pure Helpers)", () => {
  const sampleTree: MindNode[] = [
    { id: "root", parentId: null, text: "Operating Systems", x: 500, y: 320, color: "#a855f7" },
    { id: "proc", parentId: "root", text: "Processes", x: 260, y: 200, color: "#06b6d4", side: "left" },
    { id: "thread", parentId: "proc", text: "Threads", x: 20, y: 160, color: "#06b6d4", side: "left" },
    { id: "ipc", parentId: "proc", text: "IPC & Pipes", x: 20, y: 240, color: "#06b6d4", side: "left" },
    { id: "mem", parentId: "root", text: "Memory", x: 740, y: 200, color: "#10b981", side: "right" },
    { id: "paging", parentId: "mem", text: "Paging & TLB", x: 980, y: 160, color: "#10b981", side: "right" },
  ];

  it("detects and rejects cycles on reparenting", () => {
    // 1. Self parenting is invalid
    expect(wouldCreateCycle(sampleTree, "proc", "proc")).toBe(true);

    // 2. Parenting root under its own child 'proc' is a cycle
    expect(wouldCreateCycle(sampleTree, "root", "proc")).toBe(true);

    // 3. Parenting root under its own grandchild 'thread' is a cycle
    expect(wouldCreateCycle(sampleTree, "root", "thread")).toBe(true);

    // 4. Parenting 'proc' under its child 'thread' is a cycle
    expect(wouldCreateCycle(sampleTree, "proc", "thread")).toBe(true);

    // 5. Valid reparenting: moving 'thread' under 'mem' is NOT a cycle
    expect(wouldCreateCycle(sampleTree, "thread", "mem")).toBe(false);

    // 6. Valid reparenting: moving 'paging' under 'proc' is NOT a cycle
    expect(wouldCreateCycle(sampleTree, "paging", "proc")).toBe(false);

    // 7. Reparenting under root is valid
    expect(wouldCreateCycle(sampleTree, "thread", "root")).toBe(false);
  });

  it("reparents nodes cleanly when valid and guards on invalid attempts", () => {
    // Valid: reparent 'thread' under 'mem'
    const updated = reparentNode(sampleTree, "thread", "mem");
    const threadNode = updated.find((n) => n.id === "thread")!;
    expect(threadNode.parentId).toBe("mem");

    // Invalid: attempt to reparent 'proc' under 'thread'
    const rejected = reparentNode(sampleTree, "proc", "thread");
    const procNode = rejected.find((n) => n.id === "proc")!;
    expect(procNode.parentId).toBe("root"); // unchanged
  });

  it("removes a node and cascades deletion to all descendants", () => {
    const { remainingNodes, deletedIds } = removeNodeAndDescendants(sampleTree, "proc");

    expect(deletedIds.has("proc")).toBe(true);
    expect(deletedIds.has("thread")).toBe(true);
    expect(deletedIds.has("ipc")).toBe(true);
    expect(deletedIds.has("mem")).toBe(false);
    expect(deletedIds.has("root")).toBe(false);

    expect(remainingNodes.length).toBe(3);
    expect(remainingNodes.map((n) => n.id)).toEqual(["root", "mem", "paging"]);
  });

  it("cleans up cross-link relationships when connected nodes are deleted", () => {
    const relationships: MindMapRelationship[] = [
      { id: "r1", from: "thread", to: "ipc", label: "synchronizes" },
      { id: "r2", from: "ipc", to: "paging", label: "shared memory" },
      { id: "r3", from: "mem", to: "paging", label: "hardware mapping" },
    ];

    const deletedIds = new Set(["thread", "proc"]);
    const cleaned = cleanupRelationships(relationships, deletedIds);

    // r1 has thread (deleted) -> removed
    // r2 has ipc (not in deletedIds? wait, ipc was child of proc so deleted)
    deletedIds.add("ipc");
    const cleanedWithIpc = cleanupRelationships(relationships, deletedIds);

    expect(cleanedWithIpc.length).toBe(1);
    expect(cleanedWithIpc[0].id).toBe("r3");
    expect(cleanedWithIpc[0].from).toBe("mem");
    expect(cleanedWithIpc[0].to).toBe("paging");
  });

  it("calculates deterministic layouts across all three modes (balanced, right-only, tree)", () => {
    // Balanced
    const balanced = calculateTreeLayout(sampleTree, "balanced");
    expect(balanced.length).toBe(sampleTree.length);
    const bRoot = balanced.find((n) => n.id === "root")!;
    expect(bRoot.x).toBe(500);
    expect(bRoot.y).toBe(320);

    // Right-only
    const rightOnly = calculateTreeLayout(sampleTree, "right-only");
    expect(rightOnly.length).toBe(sampleTree.length);
    const rProc = rightOnly.find((n) => n.id === "proc")!;
    expect(rProc.side).toBe("right");
    expect(rProc.x).toBeGreaterThan(500);

    // Tree (top-to-bottom)
    const tree = calculateTreeLayout(sampleTree, "tree");
    expect(tree.length).toBe(sampleTree.length);
    const tProc = tree.find((n) => n.id === "proc")!;
    expect(tProc.y).toBeGreaterThan(320);
  });

  it("enforces image downscaling math <= 256px cap", () => {
    // Unchanged if small
    expect(calculateDownscaleDimensions(100, 80)).toEqual({ width: 100, height: 80 });

    // Landscape downscale
    const landscape = calculateDownscaleDimensions(1920, 1080);
    expect(landscape.width).toBe(256);
    expect(landscape.height).toBe(144);

    // Portrait downscale
    const portrait = calculateDownscaleDimensions(1080, 1920);
    expect(portrait.width).toBe(144);
    expect(portrait.height).toBe(256);

    // Square downscale
    const square = calculateDownscaleDimensions(1000, 1000);
    expect(square.width).toBe(256);
    expect(square.height).toBe(256);
  });

  it("gracefully processes legacy mind map nodes lacking new fields", () => {
    const legacyNode: MindNode = {
      id: "legacy-1",
      parentId: null,
      text: "Old Node",
      x: 100,
      y: 100,
      color: "#3b82f6",
    };

    const layout = calculateTreeLayout([legacyNode], "balanced");
    expect(layout[0].text).toBe("Old Node");
    expect(layout[0].notes).toBeUndefined();
    expect(layout[0].imageUrl).toBeUndefined();
    expect(layout[0].status).toBeUndefined();
  });
});
