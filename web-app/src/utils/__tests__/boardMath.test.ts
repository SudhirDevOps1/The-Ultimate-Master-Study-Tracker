import { describe, it, expect } from "vitest";
import {
  snapToGrid,
  isInsideMarquee,
  moveFrameAndChildren,
  cleanupBoardConnectors,
  getNotesInReadingOrder,
  generateBoardTemplate,
  calculateAlignment,
  calculateDistribution,
  isPointInPolygon,
} from "../boardMath";
import type { StickyNote, BoardFrame, BoardConnector } from "../../types/notes";

describe("Study Notes Board Algorithms & Geometric Math (Pure Helpers)", () => {
  it("computes accurate grid snapping for 8px and 16px steps", () => {
    // 8px step
    expect(snapToGrid(0, 8)).toBe(0);
    expect(snapToGrid(5, 8)).toBe(8);
    expect(snapToGrid(12, 8)).toBe(16);
    expect(snapToGrid(17, 8)).toBe(16);

    // 16px step
    expect(snapToGrid(0, 16)).toBe(0);
    expect(snapToGrid(7, 16)).toBe(0);
    expect(snapToGrid(9, 16)).toBe(16);
    expect(snapToGrid(25, 16)).toBe(32);
  });

  it("performs accurate marquee selection hit-testing", () => {
    const note = { x: 100, y: 100, w: 200, h: 150 };

    // Completely contains note
    expect(isInsideMarquee(note, { x1: 50, y1: 50, x2: 400, y2: 400 })).toBe(true);

    // Intersects note corner
    expect(isInsideMarquee(note, { x1: 0, y1: 0, x2: 150, y2: 150 })).toBe(true);

    // Completely outside to the right
    expect(isInsideMarquee(note, { x1: 350, y1: 50, x2: 500, y2: 400 })).toBe(false);

    // Completely outside to the bottom
    expect(isInsideMarquee(note, { x1: 50, y1: 300, x2: 400, y2: 500 })).toBe(false);

    // Reverse drag direction (bottom-right to top-left)
    expect(isInsideMarquee(note, { x1: 400, y1: 400, x2: 50, y2: 50 })).toBe(true);
  });

  it("translates a frame and all its child notes synchronously", () => {
    const frame: BoardFrame = { id: "f1", title: "Frame 1", x: 100, y: 100, w: 400, h: 300 };
    const notes: StickyNote[] = [
      {
        id: "n1",
        text: "Inside Frame",
        color: "c",
        textColor: "tc",
        font: "f",
        date: "d",
        time: "t",
        subject: "s",
        x: 120,
        y: 140,
        frameId: "f1",
      },
      {
        id: "n2",
        text: "Outside Frame",
        color: "c",
        textColor: "tc",
        font: "f",
        date: "d",
        time: "t",
        subject: "s",
        x: 600,
        y: 200,
      },
    ];

    const { updatedNotes, updatedFrame } = moveFrameAndChildren(notes, frame, 50, 80);

    expect(updatedFrame.x).toBe(150);
    expect(updatedFrame.y).toBe(180);

    const updatedN1 = updatedNotes.find((n) => n.id === "n1")!;
    expect(updatedN1.x).toBe(170);
    expect(updatedN1.y).toBe(220);

    const updatedN2 = updatedNotes.find((n) => n.id === "n2")!;
    expect(updatedN2.x).toBe(600); // Unchanged
    expect(updatedN2.y).toBe(200); // Unchanged
  });

  it("cleans up dangling connectors when connected notes are removed", () => {
    const connectors: BoardConnector[] = [
      { id: "c1", from: "n1", to: "n2", label: "arrow 1" },
      { id: "c2", from: "n2", to: "n3", label: "arrow 2" },
      { id: "c3", from: "n3", to: "n4", label: "arrow 3" },
    ];

    const deletedIds = new Set(["n2"]);
    const cleaned = cleanupBoardConnectors(connectors, deletedIds);

    expect(cleaned.length).toBe(1);
    expect(cleaned[0].id).toBe("c3");
    expect(cleaned[0].from).toBe("n3");
    expect(cleaned[0].to).toBe("n4");
  });

  it("sorts notes in standard academic reading order (top-to-bottom, left-to-right)", () => {
    const notes: StickyNote[] = [
      { id: "n-bottom-right", text: "4", color: "", textColor: "", font: "", date: "", time: "", subject: "", x: 500, y: 400 },
      { id: "n-top-right", text: "2", color: "", textColor: "", font: "", date: "", time: "", subject: "", x: 400, y: 100 },
      { id: "n-top-left", text: "1", color: "", textColor: "", font: "", date: "", time: "", subject: "", x: 100, y: 100 },
      { id: "n-bottom-left", text: "3", color: "", textColor: "", font: "", date: "", time: "", subject: "", x: 100, y: 400 },
    ];

    const sorted = getNotesInReadingOrder(notes);
    expect(sorted.map((n) => n.text)).toEqual(["1", "2", "3", "4"]);
  });

  it("generates deterministic Cornell, Feynman, and Exam templates without overlapping cards", () => {
    const cornell = generateBoardTemplate("cornell", "Distributed Systems");
    expect(cornell.frames.length).toBe(1);
    expect(cornell.notes.length).toBe(3);
    expect(cornell.connectors.length).toBe(2);
    expect(cornell.frames[0].title).toContain("Distributed Systems");

    const feynman = generateBoardTemplate("feynman", "Quantum Computing");
    expect(feynman.notes.length).toBe(3);
    expect(feynman.frames[0].title).toContain("Quantum Computing");

    const exam = generateBoardTemplate("examRevision", "Database Internals");
    expect(exam.notes.length).toBe(4);
  });

  it("calculates accurate alignment for Left, Center, Right, Top, Middle, Bottom", () => {
    const boxes = [
      { left: 100, top: 50, width: 60, height: 40 },
      { left: 300, top: 120, width: 80, height: 60 },
      { left: 200, top: 200, width: 100, height: 80 },
    ];

    const leftAligned = calculateAlignment(boxes, "left");
    expect(leftAligned.every((b) => b.left === 100)).toBe(true);

    const rightAligned = calculateAlignment(boxes, "right");
    // maxRight = 380
    expect(rightAligned[0].left).toBe(380 - 60);
    expect(rightAligned[1].left).toBe(380 - 80);
    expect(rightAligned[2].left).toBe(380 - 100);

    const topAligned = calculateAlignment(boxes, "top");
    expect(topAligned.every((b) => b.top === 50)).toBe(true);
  });

  it("calculates uniform distribution across horizontal and vertical axes", () => {
    const boxes = [
      { left: 0, top: 0, width: 50, height: 30 },
      { left: 400, top: 400, width: 50, height: 30 },
      { left: 50, top: 50, width: 50, height: 30 },
    ];

    const distributedH = calculateDistribution(boxes, "horizontal");
    const sortedH = [...distributedH].sort((a, b) => a.left - b.left);
    const gap1 = sortedH[1].left - (sortedH[0].left + sortedH[0].width);
    const gap2 = sortedH[2].left - (sortedH[1].left + sortedH[1].width);
    expect(Math.abs(gap1 - gap2)).toBeLessThan(0.001);
  });

  it("accurately tests points inside and outside arbitrary polygons for lasso", () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ];

    expect(isPointInPolygon({ x: 50, y: 20 }, triangle)).toBe(true);
    expect(isPointInPolygon({ x: 50, y: 50 }, triangle)).toBe(true);
    expect(isPointInPolygon({ x: -10, y: 20 }, triangle)).toBe(false);
    expect(isPointInPolygon({ x: 150, y: 20 }, triangle)).toBe(false);
    expect(isPointInPolygon({ x: 50, y: 120 }, triangle)).toBe(false);
  });
});
