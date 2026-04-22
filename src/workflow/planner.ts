import type { Edge } from "reactflow";
import { buildDag, topoLayers, upstreamClosure } from "./dag";

export type RunPlan = {
  scope: "FULL" | "PARTIAL" | "SINGLE";
  requestedNodeIds: string[];
  effectiveNodeIds: string[]; // includes required upstream deps
  layers: string[][]; // parallelizable batches
};

export function createRunPlan(args: {
  scope: RunPlan["scope"];
  requestedNodeIds: string[];
  allNodeIds: string[];
  edges: Edge[];
}): RunPlan {
  const { scope, requestedNodeIds, allNodeIds, edges } = args;

  const dag = buildDag({ nodeIds: allNodeIds, edges });

  const effectiveNodeIds =
    scope === "FULL"
      ? allNodeIds
      : upstreamClosure({
          startNodeIds: requestedNodeIds,
          dag,
        });

  const layers = topoLayers({ dag, subsetNodeIds: effectiveNodeIds });

  return {
    scope,
    requestedNodeIds,
    effectiveNodeIds,
    layers,
  };
}

