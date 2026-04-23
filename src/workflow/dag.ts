import type { Edge } from "@xyflow/react";

export type Dag = {
  nodes: string[];
  incoming: Map<string, Set<string>>; // node -> set of deps (sources)
  outgoing: Map<string, Set<string>>; // node -> set of dependents (targets)
};

export function buildDag(args: { nodeIds: string[]; edges: Edge[] }): Dag {
  const { nodeIds, edges } = args;
  const nodeSet = new Set(nodeIds);

  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    incoming.set(id, new Set());
    outgoing.set(id, new Set());
  }

  for (const e of edges) {
    if (!e.source || !e.target) continue;
    if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue;
    incoming.get(e.target)!.add(e.source);
    outgoing.get(e.source)!.add(e.target);
  }

  return { nodes: nodeIds, incoming, outgoing };
}

export function upstreamClosure(args: { startNodeIds: string[]; dag: Dag }): string[] {
  const { startNodeIds, dag } = args;
  const keep = new Set<string>();
  const stack = [...startNodeIds];
  while (stack.length) {
    const cur = stack.pop()!;
    if (keep.has(cur)) continue;
    keep.add(cur);
    const deps = dag.incoming.get(cur);
    if (!deps) continue;
    for (const d of deps) stack.push(d);
  }
  return Array.from(keep);
}

export function topoLayers(args: { dag: Dag; subsetNodeIds?: string[] }): string[][] {
  const { dag, subsetNodeIds } = args;
  const subset = subsetNodeIds ? new Set(subsetNodeIds) : new Set(dag.nodes);

  const indegree = new Map<string, number>();
  for (const n of subset) indegree.set(n, 0);
  for (const n of subset) {
    const deps = dag.incoming.get(n);
    if (!deps) continue;
    let c = 0;
    for (const d of deps) if (subset.has(d)) c++;
    indegree.set(n, c);
  }

  const layers: string[][] = [];
  let frontier = Array.from(subset).filter((n) => (indegree.get(n) ?? 0) === 0);

  // stable-ish order
  frontier.sort();

  const processed = new Set<string>();

  while (frontier.length) {
    const layer = frontier;
    layers.push(layer);
    frontier = [];

    for (const n of layer) {
      processed.add(n);
      const outs = dag.outgoing.get(n);
      if (!outs) continue;
      for (const m of outs) {
        if (!subset.has(m)) continue;
        indegree.set(m, (indegree.get(m) ?? 0) - 1);
      }
    }

    for (const n of subset) {
      if (processed.has(n)) continue;
      if ((indegree.get(n) ?? 0) === 0) frontier.push(n);
    }
    frontier.sort();
  }

  // If not all processed, graph had a cycle (shouldn't happen due to connection rules)
  if (processed.size !== subset.size) {
    throw new Error("Graph contains a cycle; cannot compute DAG execution layers.");
  }

  return layers;
}

