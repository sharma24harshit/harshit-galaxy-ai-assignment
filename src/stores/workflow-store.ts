import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from "reactflow";
import { isValidTypedConnection } from "@/src/workflow/connection";
import { NODE_SPECS, type NextflowNode, type NextflowNodeData, type NodeKind } from "@/src/workflow/types";
import { createSampleWorkflow } from "@/src/workflow/sample-workflow";

type Snapshot = {
  nodes: NextflowNode[];
  edges: Edge[];
};

type WorkflowApiShape = {
  id: string;
  name: string;
  graph: { nodes: any[]; edges: any[] };
};

type RunApiShape = {
  id: string;
  workflowId: string;
  scope: "FULL" | "PARTIAL" | "SINGLE";
  status: "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  nodeRuns: any | null;
};

function normalizeConnectedInputs(nodes: NextflowNode[], edges: Edge[]) {
  const connectedByNode = new Map<string, Set<string>>();
  for (const e of edges) {
    const targetHandle = e.targetHandle?.split(":")[1];
    if (!e.target || !targetHandle) continue;
    if (!connectedByNode.has(e.target)) connectedByNode.set(e.target, new Set());
    connectedByNode.get(e.target)!.add(targetHandle);
  }

  return nodes.map((n) => {
    const spec = NODE_SPECS[n.data.kind];
    const nextConnected: Record<string, boolean> = { ...n.data.connectedInputs };
    for (const input of spec.inputs) {
      nextConnected[input.id] = connectedByNode.get(n.id)?.has(input.id) ?? false;
    }
    return { ...n, data: { ...n.data, connectedInputs: nextConnected } };
  });
}

function cloneSnapshot(s: Snapshot): Snapshot {
  return {
    nodes: s.nodes.map((n) => ({ ...n, data: { ...n.data, inputs: { ...n.data.inputs }, connectedInputs: { ...n.data.connectedInputs }, outputs: { ...n.data.outputs } } })),
    edges: s.edges.map((e) => ({ ...e })),
  };
}

function defaultInputsForKind(kind: NodeKind): Record<string, string> {
  const spec = NODE_SPECS[kind];
  const inputs: Record<string, string> = {};
  if (kind === "text") inputs["text"] = "";
  for (const h of spec.inputs) {
    if (h.id === "x_percent") inputs[h.id] = "0";
    else if (h.id === "y_percent") inputs[h.id] = "0";
    else if (h.id === "width_percent") inputs[h.id] = "100";
    else if (h.id === "height_percent") inputs[h.id] = "100";
    else if (h.id === "timestamp") inputs[h.id] = "0";
    else inputs[h.id] = "";
  }
  return inputs;
}

function defaultConnectedInputsForKind(kind: NodeKind): Record<string, boolean> {
  const spec = NODE_SPECS[kind];
  const connected: Record<string, boolean> = {};
  for (const h of spec.inputs) connected[h.id] = false;
  return connected;
}

function defaultOutputsForKind(kind: NodeKind): Record<string, string> {
  const spec = NODE_SPECS[kind];
  const outputs: Record<string, string> = {};
  for (const h of spec.outputs) outputs[h.id] = "";
  return outputs;
}

function newNode(args: { kind: NodeKind; id: string; x: number; y: number }): NextflowNode {
  const { kind, id, x, y } = args;
  const spec = NODE_SPECS[kind];

  const data: NextflowNodeData = {
    kind,
    label: spec.title,
    inputs: defaultInputsForKind(kind),
    connectedInputs: defaultConnectedInputsForKind(kind),
    outputs: defaultOutputsForKind(kind),
    status: "idle",
  };

  return {
    id,
    type: "nextflowNode",
    position: { x, y },
    data,
  };
}

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}`;
}

type WorkflowState = {
  workflow: WorkflowApiShape | null;
  isLoadingWorkflow: boolean;
  isSavingWorkflow: boolean;
  workflowError: string | null;

  nodes: NextflowNode[];
  edges: Edge[];
  past: Snapshot[];
  future: Snapshot[];

  ensureSampleLoaded: () => void;
  loadWorkflowFromServer: () => Promise<void>;
  saveWorkflowToServer: () => Promise<void>;
  setGraph: (nodes: NextflowNode[], edges: Edge[]) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNodeAt: (kind: NodeKind, x: number, y: number) => void;
  updateNodeInput: (nodeId: string, inputId: string, value: string) => void;
  deleteSelection: (selectedNodeIds: string[], selectedEdgeIds: string[]) => void;

  runAllScaffold: () => void;
  runSelectionScaffold: (nodeIds: string[]) => void;
  runNodeScaffold: (nodeId: string) => void;

  runs: RunApiShape[];
  isLoadingRuns: boolean;
  runsError: string | null;
  expandedRunId: string | null;
  runDetailsById: Record<string, RunApiShape>;
  loadRunsFromServer: () => Promise<void>;
  createRunOnServer: (args: { scope: "FULL" | "PARTIAL" | "SINGLE"; nodeIds?: string[] }) => Promise<void>;
  toggleRunExpanded: (runId: string) => Promise<void>;
  applyRunOutputsToCanvas: (runId: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: null,
  isLoadingWorkflow: false,
  isSavingWorkflow: false,
  workflowError: null,

  nodes: [],
  edges: [],
  past: [],
  future: [],

  ensureSampleLoaded: () => {
    if (get().nodes.length > 0) return;
    const sample = createSampleWorkflow();
    set({ nodes: normalizeConnectedInputs(sample.nodes, sample.edges), edges: sample.edges });
  },

  setGraph: (nodes, edges) => {
    set({
      nodes: normalizeConnectedInputs(nodes, edges),
      edges,
      past: [],
      future: [],
    });
  },

  loadWorkflowFromServer: async () => {
    set({ isLoadingWorkflow: true, workflowError: null });
    try {
      const res = await fetch("/api/workflows", { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load workflow: ${res.status} ${text}`);
      }
      const json = (await res.json()) as { workflow: WorkflowApiShape };
      const wf = json.workflow;
      set({ workflow: wf });

      const nodes = (wf.graph?.nodes ?? []) as NextflowNode[];
      const edges = (wf.graph?.edges ?? []) as Edge[];
      get().setGraph(nodes, edges);
    } catch (e) {
      set({ workflowError: e instanceof Error ? e.message : "Failed to load workflow" });
      // fall back to sample so UI isn't empty
      get().ensureSampleLoaded();
    } finally {
      set({ isLoadingWorkflow: false });
    }
  },

  saveWorkflowToServer: async () => {
    const wf = get().workflow;
    set({ isSavingWorkflow: true, workflowError: null });
    try {
      const name = wf?.name ?? "My workflow";
      const payload = { name, graph: { nodes: get().nodes, edges: get().edges } };
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to save workflow: ${res.status} ${text}`);
      }
      const json = (await res.json()) as { workflow: WorkflowApiShape };
      set({ workflow: json.workflow });
    } catch (e) {
      set({ workflowError: e instanceof Error ? e.message : "Failed to save workflow" });
    } finally {
      set({ isSavingWorkflow: false });
    }
  },

  onNodesChange: (changes) => {
    const before = { nodes: get().nodes, edges: get().edges };
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
    const after = { nodes: get().nodes, edges: get().edges };
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      set((state) => ({ past: [...state.past, cloneSnapshot(before)], future: [] }));
    }
  },

  onEdgesChange: (changes) => {
    const before = { nodes: get().nodes, edges: get().edges };
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
    const after = { nodes: get().nodes, edges: get().edges };
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      set((state) => ({ past: [...state.past, cloneSnapshot(before)], future: [] }));
    }
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    if (!isValidTypedConnection({ connection, nodes, edges })) return;

    const before = { nodes, edges };

    // Mark the target input as connected (disables manual input)
    const target = connection.target;
    const targetHandle = connection.targetHandle?.split(":")[1];
    const targetNode = nodes.find((n) => n.id === target);

    const nextNodes =
      targetNode && targetHandle
        ? nodes.map((n) =>
            n.id !== targetNode.id
              ? n
              : {
                  ...n,
                  data: {
                    ...n.data,
                    connectedInputs: {
                      ...n.data.connectedInputs,
                      [targetHandle]: true,
                    },
                  },
                }
          )
        : nodes;

    const nextEdges = addEdge(
      {
        ...connection,
        type: "default",
        animated: true,
        style: { stroke: "rgba(255,255,255,0.35)" },
      },
      edges
    );

    set({ nodes: nextNodes, edges: nextEdges, past: [...get().past, cloneSnapshot(before)], future: [] });
  },

  addNodeAt: (kind, x, y) => {
    const before = { nodes: get().nodes, edges: get().edges };
    const id = nextId(kind);
    set((state) => ({
      nodes: [...state.nodes, newNode({ kind, id, x, y })],
      past: [...state.past, cloneSnapshot(before)],
      future: [],
    }));
  },

  updateNodeInput: (nodeId, inputId, value) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (node.data.connectedInputs[inputId]) return;

    const before = { nodes: get().nodes, edges: get().edges };
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id !== nodeId
          ? n
          : {
              ...n,
              data: {
                ...n.data,
                inputs: {
                  ...n.data.inputs,
                  [inputId]: value,
                },
              },
            }
      ),
      past: [...state.past, cloneSnapshot(before)],
      future: [],
    }));
  },

  deleteSelection: (selectedNodeIds, selectedEdgeIds) => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;
    const before = { nodes: get().nodes, edges: get().edges };

    set((state) => {
      const remainingNodes = state.nodes.filter((n) => !selectedNodeIds.includes(n.id));
      const remainingEdges = state.edges.filter((e) => !selectedEdgeIds.includes(e.id));

      // Recompute connectedInputs based on remaining edges
      const connectedByNode = new Map<string, Set<string>>();
      for (const e of remainingEdges) {
        const targetHandle = e.targetHandle?.split(":")[1];
        if (!e.target || !targetHandle) continue;
        if (!connectedByNode.has(e.target)) connectedByNode.set(e.target, new Set());
        connectedByNode.get(e.target)!.add(targetHandle);
      }

      const nextNodes = remainingNodes.map((n) => {
        const spec = NODE_SPECS[n.data.kind];
        const connectedInputs: Record<string, boolean> = { ...n.data.connectedInputs };
        for (const input of spec.inputs) {
          connectedInputs[input.id] = connectedByNode.get(n.id)?.has(input.id) ?? false;
        }
        return { ...n, data: { ...n.data, connectedInputs } };
      });

      return {
        nodes: nextNodes,
        edges: remainingEdges,
        past: [...state.past, cloneSnapshot(before)],
        future: [],
      };
    });
  },

  runAllScaffold: () => {
    const nodeIds = get().nodes.map((n) => n.id);
    get().runSelectionScaffold(nodeIds);
  },

  runSelectionScaffold: (nodeIds) => {
    if (nodeIds.length === 0) return;
    set((state) => ({
      nodes: state.nodes.map((n) =>
        nodeIds.includes(n.id)
          ? { ...n, data: { ...n.data, status: "running", errorMessage: undefined } }
          : n
      ),
    }));

    window.setTimeout(() => {
      set((state) => ({
        nodes: state.nodes.map((n) => {
          if (!nodeIds.includes(n.id)) return n;
          const isLLM = n.data.kind === "llm";
          return {
            ...n,
            data: {
              ...n.data,
              status: "error",
              errorMessage:
                "Execution will be wired in Step 3 via Trigger.dev tasks.",
              outputs: isLLM
                ? { ...n.data.outputs, output: n.data.outputs.output || "" }
                : { ...n.data.outputs },
            },
          };
        }),
      }));
    }, 600);
  },

  runNodeScaffold: (nodeId) => {
    get().runSelectionScaffold([nodeId]);
  },

  runs: [],
  isLoadingRuns: false,
  runsError: null,
  expandedRunId: null,
  runDetailsById: {},

  loadRunsFromServer: async () => {
    set({ isLoadingRuns: true, runsError: null });
    try {
      const res = await fetch("/api/runs", { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load runs: ${res.status} ${text}`);
      }
      const json = (await res.json()) as { runs: RunApiShape[] };
      set({ runs: json.runs ?? [] });
    } catch (e) {
      set({ runsError: e instanceof Error ? e.message : "Failed to load runs" });
    } finally {
      set({ isLoadingRuns: false });
    }
  },

  createRunOnServer: async ({ scope, nodeIds }) => {
    const wf = get().workflow;
    if (!wf?.id) {
      await get().loadWorkflowFromServer();
    }
    const workflowId = get().workflow?.id;
    if (!workflowId) return;

    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflowId, scope, nodeIds }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      set({ runsError: `Failed to create run: ${res.status} ${text}` });
      return;
    }

    await get().loadRunsFromServer();
  },

  toggleRunExpanded: async (runId) => {
    const current = get().expandedRunId;
    if (current === runId) {
      set({ expandedRunId: null });
      return;
    }

    set({ expandedRunId: runId, runsError: null });
    if (get().runDetailsById[runId]) return;

    try {
      const res = await fetch(`/api/runs/${runId}`, { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load run details: ${res.status} ${text}`);
      }
      const json = (await res.json()) as { run: RunApiShape };
      set((state) => ({
        runDetailsById: { ...state.runDetailsById, [runId]: json.run },
      }));
    } catch (e) {
      set({ runsError: e instanceof Error ? e.message : "Failed to load run details" });
    }
  },

  applyRunOutputsToCanvas: (runId) => {
    const run = get().runDetailsById[runId] ?? get().runs.find((r) => r.id === runId);
    const nodeRuns = (run as any)?.nodeRuns?.nodes;
    if (!nodeRuns) return;

    set((state) => ({
      nodes: state.nodes.map((n) => {
        const nr = nodeRuns[n.id];
        if (!nr) return n;
        const status =
          nr.status === "success" ? "success" : nr.status === "running" ? "running" : nr.status === "failed" ? "error" : n.data.status;
        const outputs = nr.outputs ? { ...n.data.outputs, ...nr.outputs } : n.data.outputs;
        const errorMessage = nr.error ? String(nr.error) : undefined;
        return {
          ...n,
          data: { ...n.data, status, outputs, errorMessage },
        };
      }),
    }));
  },

  undo: () => {
    const past = get().past;
    if (past.length === 0) return;
    const current = { nodes: get().nodes, edges: get().edges };
    const prev = past[past.length - 1];
    set((state) => ({
      nodes: cloneSnapshot(prev).nodes,
      edges: cloneSnapshot(prev).edges,
      past: state.past.slice(0, -1),
      future: [cloneSnapshot(current), ...state.future],
    }));
  },

  redo: () => {
    const future = get().future;
    if (future.length === 0) return;
    const current = { nodes: get().nodes, edges: get().edges };
    const next = future[0];
    set((state) => ({
      nodes: cloneSnapshot(next).nodes,
      edges: cloneSnapshot(next).edges,
      past: [...state.past, cloneSnapshot(current)],
      future: state.future.slice(1),
    }));
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));

