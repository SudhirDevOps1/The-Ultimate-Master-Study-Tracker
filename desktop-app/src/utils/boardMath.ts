import { toLocalDateKey } from "@/utils/localDate";
import type { StickyNote, BoardFrame, BoardConnector } from "../types/notes";

/**
 * Snaps a coordinate to the nearest grid step (typically 8px or 16px).
 */
export function snapToGrid(val: number, step = 16): number {
  if (step <= 0) return val;
  return Math.round(val / step) * step;
}

/**
 * Tests whether a note's bounding box intersects with or is inside a marquee selection rect.
 */
export function isInsideMarquee(
  note: { x: number; y: number; w?: number; h?: number },
  marquee: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  const noteW = note.w || 260;
  const noteH = note.h || 200;
  const minX = Math.min(marquee.x1, marquee.x2);
  const maxX = Math.max(marquee.x1, marquee.x2);
  const minY = Math.min(marquee.y1, marquee.y2);
  const maxY = Math.max(marquee.y1, marquee.y2);

  // Axis-Aligned Bounding Box (AABB) intersection
  return (
    note.x + noteW >= minX &&
    note.x <= maxX &&
    note.y + noteH >= minY &&
    note.y <= maxY
  );
}

/**
 * Moves a frame and all notes that belong to it by (dx, dy).
 */
export function moveFrameAndChildren(
  notes: StickyNote[],
  frame: BoardFrame,
  dx: number,
  dy: number
): { updatedNotes: StickyNote[]; updatedFrame: BoardFrame } {
  const updatedFrame: BoardFrame = {
    ...frame,
    x: frame.x + dx,
    y: frame.y + dy,
  };

  const updatedNotes = notes.map((note) => {
    if (note.frameId === frame.id) {
      return {
        ...note,
        x: (note.x || 0) + dx,
        y: (note.y || 0) + dy,
      };
    }
    return note;
  });

  return { updatedNotes, updatedFrame };
}

/**
 * Cleans up connectors that point to or from any deleted note ID.
 */
export function cleanupBoardConnectors(
  connectors: BoardConnector[],
  deletedNoteIds: Set<string>
): BoardConnector[] {
  return connectors.filter(
    (conn) => !deletedNoteIds.has(conn.from) && !deletedNoteIds.has(conn.to)
  );
}

/**
 * Sorts notes in standard academic reading order: top-to-bottom, left-to-right.
 * Notes within 40px vertically are considered to be on the same row.
 */
export function getNotesInReadingOrder(notes: StickyNote[]): StickyNote[] {
  return [...notes].sort((a, b) => {
    const yA = a.y ?? 0;
    const yB = b.y ?? 0;
    const xA = a.x ?? 0;
    const xB = b.x ?? 0;

    // If vertically within 40px, sort left-to-right
    if (Math.abs(yA - yB) < 40) {
      return xA - xB;
    }
    return yA - yB;
  });
}

/**
 * Generates deterministic notes and frames for academic templates with user's subject name.
 */
export function generateBoardTemplate(
  templateKey: "cornell" | "feynman" | "lectureSummary" | "examRevision",
  subjectName = "Study Subject"
): { notes: StickyNote[]; frames: BoardFrame[]; connectors: BoardConnector[] } {
  const dateStr = toLocalDateKey();
  const timeStr = "12:00";
  const baseId = `tmpl-${Date.now()}`;

  if (templateKey === "cornell") {
    const frameId = `${baseId}-f1`;
    const frame: BoardFrame = {
      id: frameId,
      title: `Cornell Notes: ${subjectName}`,
      x: 100,
      y: 100,
      w: 860,
      h: 580,
      color: "border-purple-500/30",
    };

    const notes: StickyNote[] = [
      {
        id: `${baseId}-cues`,
        title: "Cue Column & Questions",
        text: "- Key Questions to Answer\n- Important Terms & Acronyms\n- Formulas & Concepts",
        color: "bg-yellow-500/15 border-yellow-400/35",
        textColor: "text-amber-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 120,
        y: 140,
        w: 240,
        h: 340,
        frameId,
      },
      {
        id: `${baseId}-notes`,
        title: "Main Lecture Notes",
        text: "1. Detailed explanations and proofs\n2. Worked examples and edge cases\n3. Diagrams & system interactions",
        color: "bg-cyan-500/15 border-cyan-400/35",
        textColor: "text-cyan-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 380,
        y: 140,
        w: 560,
        h: 340,
        frameId,
      },
      {
        id: `${baseId}-summary`,
        title: "Summary (Bottom Line)",
        text: "**Core Takeaway:** In 2-3 sentences, summarize the fundamental insight of this topic for rapid exam recall.",
        color: "bg-emerald-500/15 border-emerald-400/35",
        textColor: "text-emerald-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 120,
        y: 500,
        w: 820,
        h: 160,
        frameId,
      },
    ];

    const connectors: BoardConnector[] = [
      { id: `${baseId}-conn1`, from: `${baseId}-cues`, to: `${baseId}-notes`, label: "proves" },
      { id: `${baseId}-conn2`, from: `${baseId}-notes`, to: `${baseId}-summary`, label: "concludes" },
    ];

    return { notes, frames: [frame], connectors };
  } else if (templateKey === "feynman") {
    const frameId = `${baseId}-feynman`;
    const frame: BoardFrame = {
      id: frameId,
      title: `Feynman Technique: ${subjectName}`,
      x: 100,
      y: 100,
      w: 880,
      h: 560,
    };

    const notes: StickyNote[] = [
      {
        id: `${baseId}-step1`,
        title: "1. Teach It Simply",
        text: `Explain ${subjectName} as if teaching a 12-year-old. No jargon, only plain words and intuitive analogies.`,
        color: "bg-purple-500/15 border-purple-400/35",
        textColor: "text-purple-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 120,
        y: 140,
        w: 360,
        h: 220,
        frameId,
      },
      {
        id: `${baseId}-step2`,
        title: "2. Identify Knowledge Gaps",
        text: `Where did the explanation break down? List specific edge cases, formulas, or theorems you got stuck on.`,
        color: "bg-rose-500/15 border-rose-400/35",
        textColor: "text-rose-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 500,
        y: 140,
        w: 360,
        h: 220,
        frameId,
      },
      {
        id: `${baseId}-step3`,
        title: "3. Review & Simplify",
        text: `Consult documentation or textbook. Rewrite the concept until it can be stated in 1 crystal-clear sentence.`,
        color: "bg-emerald-500/15 border-emerald-400/35",
        textColor: "text-emerald-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 310,
        y: 380,
        w: 360,
        h: 220,
        frameId,
      },
    ];

    const connectors: BoardConnector[] = [
      { id: `${baseId}-c1`, from: `${baseId}-step1`, to: `${baseId}-step2`, label: "stuck on" },
      { id: `${baseId}-c2`, from: `${baseId}-step2`, to: `${baseId}-step3`, label: "resolves" },
    ];

    return { notes, frames: [frame], connectors };
  } else if (templateKey === "lectureSummary") {
    const notes: StickyNote[] = [
      {
        id: `${baseId}-topics`,
        title: "Topics Covered",
        text: `- ${subjectName} Core Mechanics\n- Key Definitions\n- Assumptions & Constraints`,
        color: "bg-cyan-500/15 border-cyan-400/35",
        textColor: "text-cyan-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 100,
        y: 100,
        w: 280,
        h: 240,
      },
      {
        id: `${baseId}-actions`,
        title: "Action Items & Practice",
        text: `- Solve Problem Set #3\n- Review slides 14-22\n- Write unit test for the algorithm`,
        color: "bg-yellow-500/15 border-yellow-400/35",
        textColor: "text-amber-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 410,
        y: 100,
        w: 280,
        h: 240,
      },
      {
        id: `${baseId}-questions`,
        title: "Questions for Instructor",
        text: `1. How does ${subjectName} scale under high concurrency?\n2. Is this covered in midterm?`,
        color: "bg-pink-500/15 border-pink-400/35",
        textColor: "text-pink-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 720,
        y: 100,
        w: 280,
        h: 240,
      },
    ];

    return { notes, frames: [], connectors: [] };
  } else {
    // Exam Revision 4-Quadrant
    const notes: StickyNote[] = [
      {
        id: `${baseId}-high-freq`,
        title: "🔥 High-Yield Guaranteed",
        text: `Theorems, formulas, and definitions that always show up on exams for ${subjectName}.`,
        color: "bg-rose-500/15 border-rose-400/35",
        textColor: "text-rose-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 100,
        y: 100,
        w: 320,
        h: 220,
      },
      {
        id: `${baseId}-pitfalls`,
        title: "⚠️ Common Pitfalls & Traps",
        text: `Typical sign errors, boundary condition oversights, and misread questions.`,
        color: "bg-yellow-500/15 border-yellow-400/35",
        textColor: "text-amber-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 450,
        y: 100,
        w: 320,
        h: 220,
      },
      {
        id: `${baseId}-proofs`,
        title: "📐 Derivations & Diagrams",
        text: `Step-by-step mathematical proofs or architecture state transitions.`,
        color: "bg-cyan-500/15 border-cyan-400/35",
        textColor: "text-cyan-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 100,
        y: 350,
        w: 320,
        h: 220,
      },
      {
        id: `${baseId}-quick-review`,
        title: "⚡ 5-Minute Pre-Exam Checklist",
        text: `Quick-fire recap points to glance at right before entering the exam room.`,
        color: "bg-emerald-500/15 border-emerald-400/35",
        textColor: "text-emerald-200",
        font: "font-sans",
        date: dateStr,
        time: timeStr,
        subject: subjectName,
        x: 450,
        y: 350,
        w: 320,
        h: 220,
      },
    ];

    return { notes, frames: [], connectors: [] };
  }
}

export interface CanvasBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calculates new coordinates for a list of boxes aligned to a target edge or center.
 */
export function calculateAlignment(
  boxes: CanvasBox[],
  type: "left" | "center" | "right" | "top" | "middle" | "bottom"
): CanvasBox[] {
  if (boxes.length <= 1) return [...boxes];
  const minLeft = Math.min(...boxes.map((b) => b.left));
  const maxRight = Math.max(...boxes.map((b) => b.left + b.width));
  const minTop = Math.min(...boxes.map((b) => b.top));
  const maxBottom = Math.max(...boxes.map((b) => b.top + b.height));
  const centerX = minLeft + (maxRight - minLeft) / 2;
  const centerY = minTop + (maxBottom - minTop) / 2;

  return boxes.map((b) => {
    switch (type) {
      case "left":
        return { ...b, left: minLeft };
      case "center":
        return { ...b, left: centerX - b.width / 2 };
      case "right":
        return { ...b, left: maxRight - b.width };
      case "top":
        return { ...b, top: minTop };
      case "middle":
        return { ...b, top: centerY - b.height / 2 };
      case "bottom":
        return { ...b, top: maxBottom - b.height };
    }
  });
}

/**
 * Calculates evenly distributed coordinates for a list of boxes along an axis.
 */
export function calculateDistribution(
  boxes: CanvasBox[],
  axis: "horizontal" | "vertical"
): CanvasBox[] {
  if (boxes.length <= 2) return [...boxes];

  if (axis === "horizontal") {
    const sorted = [...boxes].sort((a, b) => a.left - b.left);
    const minLeft = sorted[0].left;
    const maxRight = sorted[sorted.length - 1].left + sorted[sorted.length - 1].width;
    const totalBoxWidth = sorted.reduce((sum, b) => sum + b.width, 0);
    const totalSpace = maxRight - minLeft - totalBoxWidth;
    const gap = totalSpace / (sorted.length - 1);

    let currentX = minLeft;
    const newPosMap = new Map<CanvasBox, number>();
    sorted.forEach((box) => {
      newPosMap.set(box, currentX);
      currentX += box.width + gap;
    });

    return boxes.map((b) => ({ ...b, left: newPosMap.get(b) ?? b.left }));
  } else {
    const sorted = [...boxes].sort((a, b) => a.top - b.top);
    const minTop = sorted[0].top;
    const maxBottom = sorted[sorted.length - 1].top + sorted[sorted.length - 1].height;
    const totalBoxHeight = sorted.reduce((sum, b) => sum + b.height, 0);
    const totalSpace = maxBottom - minTop - totalBoxHeight;
    const gap = totalSpace / (sorted.length - 1);

    let currentY = minTop;
    const newPosMap = new Map<CanvasBox, number>();
    sorted.forEach((box) => {
      newPosMap.set(box, currentY);
      currentY += box.height + gap;
    });

    return boxes.map((b) => ({ ...b, top: newPosMap.get(b) ?? b.top }));
  }
}

/**
 * Pure ray-casting point-in-polygon algorithm.
 */
export function isPointInPolygon(
  p: { x: number; y: number },
  poly: { x: number; y: number }[]
): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y;
    const xj = poly[j].x,
      yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-10) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
