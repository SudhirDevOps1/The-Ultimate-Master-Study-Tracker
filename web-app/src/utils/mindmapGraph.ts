import type { MindNode, MindMapRelationship } from "../types/models";

/**
 * Checks whether reparenting `draggedId` under `targetParentId` would create a cycle
 * or is invalid (e.g. self-parenting or parenting under one's own descendant).
 */
export function wouldCreateCycle(
  nodes: MindNode[],
  draggedId: string,
  targetParentId: string | null
): boolean {
  if (!targetParentId) return false;
  if (draggedId === targetParentId) return true;

  const nodeMap = new Map<string, MindNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // Walk up from targetParentId towards root
  let currId: string | null = targetParentId;
  const visited = new Set<string>();

  while (currId) {
    if (currId === draggedId) {
      return true; // Target is inside dragged node's subtree!
    }
    if (visited.has(currId)) {
      break; // Safeguard against existing loops
    }
    visited.add(currId);
    const parentNode = nodeMap.get(currId);
    currId = parentNode ? parentNode.parentId : null;
  }

  return false;
}

/**
 * Pure helper to reparent a node in an immutable array of nodes.
 */
export function reparentNode(
  nodes: MindNode[],
  draggedId: string,
  newParentId: string | null
): MindNode[] {
  if (wouldCreateCycle(nodes, draggedId, newParentId)) {
    return nodes;
  }

  return nodes.map((node) => {
    if (node.id === draggedId) {
      return {
        ...node,
        parentId: newParentId,
      };
    }
    return node;
  });
}

/**
 * Recursively collects all descendant node IDs of a given node.
 */
export function getDescendantIds(nodes: MindNode[], rootId: string): Set<string> {
  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) {
      const list = childrenMap.get(node.parentId) || [];
      list.push(node.id);
      childrenMap.set(node.parentId, list);
    }
  }

  const result = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    result.add(current);
    const children = childrenMap.get(current) || [];
    for (const childId of children) {
      stack.push(childId);
    }
  }

  return result;
}

/**
 * Removes a node and all of its descendants immutably.
 */
export function removeNodeAndDescendants(
  nodes: MindNode[],
  nodeId: string
): { remainingNodes: MindNode[]; deletedIds: Set<string> } {
  const deletedIds = getDescendantIds(nodes, nodeId);
  const remainingNodes = nodes.filter((n) => !deletedIds.has(n.id));
  return { remainingNodes, deletedIds };
}

/**
 * Removes cross-link relationships that point to or from any deleted node.
 */
export function cleanupRelationships(
  relationships: MindMapRelationship[],
  deletedNodeIds: Set<string>
): MindMapRelationship[] {
  return relationships.filter(
    (rel) => !deletedNodeIds.has(rel.from) && !deletedNodeIds.has(rel.to)
  );
}

/**
 * Layout calculation for Balanced, Right-Only, and Tree hierarchy.
 */
export function calculateTreeLayout(
  nodes: MindNode[],
  mode: "balanced" | "right-only" | "tree" = "balanced"
): MindNode[] {
  if (nodes.length === 0) return [];

  const root = nodes.find((n) => n.parentId === null) || nodes[0];
  const childrenMap = new Map<string, MindNode[]>();

  for (const n of nodes) {
    if (n.parentId) {
      const list = childrenMap.get(n.parentId) || [];
      list.push(n);
      childrenMap.set(n.parentId, list);
    }
  }

  const updatedNodes = new Map<string, MindNode>();
  for (const n of nodes) {
    updatedNodes.set(n.id, { ...n });
  }

  const rootX = 500;
  const rootY = 320;
  const updatedRoot = { ...root, x: rootX, y: rootY };
  updatedNodes.set(root.id, updatedRoot);

  const directChildren = childrenMap.get(root.id) || [];

  if (mode === "tree") {
    // Vertical Tree (top-to-bottom)
    const levelHeight = 120;
    const nodeWidth = 180;

    function layoutSubtreeV(parentId: string, startX: number, depth: number): number {
      const children = childrenMap.get(parentId) || [];
      if (children.length === 0) {
        return nodeWidth;
      }

      let currentX = startX;
      for (const child of children) {
        const subtreeWidth = layoutSubtreeV(child.id, currentX, depth + 1);
        const childX = currentX + subtreeWidth / 2;
        const childY = rootY + depth * levelHeight;
        const node = updatedNodes.get(child.id)!;
        updatedNodes.set(child.id, { ...node, x: childX, y: childY, side: undefined });
        currentX += subtreeWidth + 30;
      }

      return Math.max(nodeWidth, currentX - startX - 30);
    }

    let startX = rootX - ((directChildren.length * 200) / 2);
    for (const child of directChildren) {
      const w = layoutSubtreeV(child.id, startX, 1);
      const childX = startX + w / 2;
      const childY = rootY + levelHeight;
      const node = updatedNodes.get(child.id)!;
      updatedNodes.set(child.id, { ...node, x: childX, y: childY, side: undefined });
      startX += w + 40;
    }
  } else if (mode === "right-only") {
    // Classic mindmap expanding strictly to the right
    const horizontalGap = 240;
    const verticalGap = 70;

    function layoutBranchRight(childId: string, depth: number, startY: number): number {
      const children = childrenMap.get(childId) || [];
      if (children.length === 0) {
        const node = updatedNodes.get(childId)!;
        updatedNodes.set(childId, {
          ...node,
          x: rootX + depth * horizontalGap,
          y: startY,
          side: "right",
        });
        return verticalGap;
      }

      let currY = startY;
      for (const ch of children) {
        const h = layoutBranchRight(ch.id, depth + 1, currY);
        currY += h;
      }

      const totalH = currY - startY;
      const midY = startY + totalH / 2 - verticalGap / 2;
      const node = updatedNodes.get(childId)!;
      updatedNodes.set(childId, {
        ...node,
        x: rootX + depth * horizontalGap,
        y: midY,
        side: "right",
      });
      return totalH;
    }

    let currentY = rootY - ((directChildren.length * verticalGap) / 2);
    for (const child of directChildren) {
      const branchHeight = layoutBranchRight(child.id, 1, currentY);
      currentY += branchHeight + 20;
    }
  } else {
    // Balanced Mindmap (Left and Right halves)
    const leftChildren = directChildren.slice(0, Math.ceil(directChildren.length / 2));
    const rightChildren = directChildren.slice(Math.ceil(directChildren.length / 2));

    const horizontalGap = 240;
    const verticalGap = 70;

    function layoutBranch(
      childId: string,
      side: "left" | "right",
      depth: number,
      startY: number
    ): number {
      const children = childrenMap.get(childId) || [];
      const sign = side === "left" ? -1 : 1;

      if (children.length === 0) {
        const node = updatedNodes.get(childId)!;
        updatedNodes.set(childId, {
          ...node,
          x: rootX + sign * (depth * horizontalGap),
          y: startY,
          side,
        });
        return verticalGap;
      }

      let currY = startY;
      for (const ch of children) {
        const h = layoutBranch(ch.id, side, depth + 1, currY);
        currY += h;
      }

      const totalH = currY - startY;
      const midY = startY + totalH / 2 - verticalGap / 2;
      const node = updatedNodes.get(childId)!;
      updatedNodes.set(childId, {
        ...node,
        x: rootX + sign * (depth * horizontalGap),
        y: midY,
        side,
      });
      return totalH;
    }

    // Layout left branch
    let leftY = rootY - ((leftChildren.length * verticalGap) / 2);
    for (const child of leftChildren) {
      const h = layoutBranch(child.id, "left", 1, leftY);
      leftY += h + 20;
    }

    // Layout right branch
    let rightY = rootY - ((rightChildren.length * verticalGap) / 2);
    for (const child of rightChildren) {
      const h = layoutBranch(child.id, "right", 1, rightY);
      rightY += h + 20;
    }
  }

  return Array.from(updatedNodes.values());
}

/**
 * Pure image downscaling and compression math to enforce Low-RAM invariants:
 * Maximum 256px on longest side, <= 200 KB dataURL payload.
 */
export function calculateDownscaleDimensions(
  width: number,
  height: number,
  maxDimension = 256
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: maxDimension, height: maxDimension };
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = width / height;
  if (width > height) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / ratio),
    };
  } else {
    return {
      width: Math.round(maxDimension * ratio),
      height: maxDimension,
    };
  }
}
