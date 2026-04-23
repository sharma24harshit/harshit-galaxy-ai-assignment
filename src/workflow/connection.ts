import type { Connection, Edge, Node } from "@xyflow/react";
import { NODE_SPECS, type NextflowNodeData, type NodeKind, type ValueType } from "./types";

function parseHandleId(handleId: string | null | undefined) {
  if (!handleId) return null;
  const [dir, handle] = handleId.split(":");
  if (dir !== "in" && dir !== "out") return null;
  if (!handle) return null;
  return { dir, handle };
}

function findValueTypeForHandle(kind: NodeKind, dir: "in" | "out", handle: string): ValueType | null {
  const spec = NODE_SPECS[kind];
  const list = dir === "in" ? spec.inputs : spec.outputs;
  const match = list.find((h) => h.id === handle);
  return match?.valueType ?? null;
}

export function isValidTypedConnection(args: {
  connection: Connection;
  nodes: Node<NextflowNodeData>[];
  edges: Edge[];
}): boolean {
  const { connection, nodes, edges } = args;
  if (!connection.source || !connection.target) return false;

  const source = nodes.find((n) => n.id === connection.source);
  const target = nodes.find((n) => n.id === connection.target);
  if (!source || !target) return false;

  const s = parseHandleId(connection.sourceHandle);
  const t = parseHandleId(connection.targetHandle);
  if (!s || !t) return false;
  if (s.dir !== "out") return false;
  if (t.dir !== "in") return false;

  const sourceType = findValueTypeForHandle(source.data.kind, "out", s.handle);
  const targetType = findValueTypeForHandle(target.data.kind, "in", t.handle);
  if (!sourceType || !targetType) return false;

  // Disallow cycles (DAG only)
  if (wouldCreateCycle({ edges, sourceId: connection.source, targetId: connection.target })) {
    return false;
  }

  // Type match rules
  if (sourceType !== targetType) return false;

  // Single-connection inputs: if already connected, block unless the handle is marked multiple
  const targetSpec = NODE_SPECS[target.data.kind];
  const inputSpec = targetSpec.inputs.find((h) => h.id === t.handle);
  if (!inputSpec) return false;
  const alreadyConnected = edges.some(
    (e) => e.target === target.id && e.targetHandle === connection.targetHandle
  );
  if (alreadyConnected && !inputSpec.multiple) return false;

  return true;
}

export function wouldCreateCycle(args: { edges: Edge[]; sourceId: string; targetId: string }) {
  const { edges, sourceId, targetId } = args;
  // Adding edge sourceId -> targetId creates cycle if sourceId is reachable from targetId
  const adjacency = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    if (!adjacency.has(e.source)) adjacency.set(e.source, new Set());
    adjacency.get(e.source)!.add(e.target);
  }
  // include the prospective edge
  if (!adjacency.has(sourceId)) adjacency.set(sourceId, new Set());
  adjacency.get(sourceId)!.add(targetId);

  const visited = new Set<string>();
  const stack: string[] = [targetId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === sourceId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const next = adjacency.get(cur);
    if (!next) continue;
    for (const n of next) stack.push(n);
  }
  return false;
}

