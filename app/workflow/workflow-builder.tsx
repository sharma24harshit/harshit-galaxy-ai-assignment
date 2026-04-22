"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  Controls,
  type NodeTypes,
  type Connection,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import NextflowNode from "@/src/workflow/nodes/nextflow-node";
import { useWorkflowStore } from "@/src/stores/workflow-store";
import type { NodeKind } from "@/src/workflow/types";

const DND_MIME = "application/x-nextflow-nodekind";

function SidebarButton(props: {
  kind: NodeKind;
  label: string;
  onClick: (kind: NodeKind) => void;
}) {
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_MIME, props.kind);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => props.onClick(props.kind)}
      className="h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-left px-3 active:scale-[0.99]"
      title="Click to add, or drag to canvas"
    >
      {props.label}
    </button>
  );
}

export default function WorkflowBuilder() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const workflow = useWorkflowStore((s) => s.workflow);
  const isLoadingWorkflow = useWorkflowStore((s) => s.isLoadingWorkflow);
  const isSavingWorkflow = useWorkflowStore((s) => s.isSavingWorkflow);
  const workflowError = useWorkflowStore((s) => s.workflowError);
  const loadWorkflowFromServer = useWorkflowStore((s) => s.loadWorkflowFromServer);
  const saveWorkflowToServer = useWorkflowStore((s) => s.saveWorkflowToServer);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNodeAt = useWorkflowStore((s) => s.addNodeAt);
  const deleteSelection = useWorkflowStore((s) => s.deleteSelection);
  const createRunOnServer = useWorkflowStore((s) => s.createRunOnServer);
  const loadRunsFromServer = useWorkflowStore((s) => s.loadRunsFromServer);
  const runs = useWorkflowStore((s) => s.runs);
  const isLoadingRuns = useWorkflowStore((s) => s.isLoadingRuns);
  const runsError = useWorkflowStore((s) => s.runsError);
  const expandedRunId = useWorkflowStore((s) => s.expandedRunId);
  const runDetailsById = useWorkflowStore((s) => s.runDetailsById);
  const toggleRunExpanded = useWorkflowStore((s) => s.toggleRunExpanded);
  const applyRunOutputsToCanvas = useWorkflowStore((s) => s.applyRunOutputsToCanvas);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const canUndo = useWorkflowStore((s) => s.canUndo);
  const canRedo = useWorkflowStore((s) => s.canRedo);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [isDragOver, setIsDragOver] = useState(false);

  const nodeTypes = useMemo<NodeTypes>(() => ({ nextflowNode: NextflowNode }), []);

  useEffect(() => {
    void loadWorkflowFromServer();
    void loadRunsFromServer();
  }, [loadRunsFromServer, loadWorkflowFromServer]);

  // Poll runs while any are RUNNING
  useEffect(() => {
    if (runs.some((r) => r.status === "RUNNING")) {
      const t = window.setInterval(() => {
        void loadRunsFromServer();
      }, 2000);
      return () => window.clearInterval(t);
    }
    return;
  }, [loadRunsFromServer, runs]);

  const addFromSidebar = useCallback(
    (kind: NodeKind) => {
      const el = wrapperRef.current;
      if (!el) {
        addNodeAt(kind, 80 + Math.random() * 40, 80 + Math.random() * 40);
        return;
      }

      const rect = el.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const pos = screenToFlowPosition(center);
      addNodeAt(kind, pos.x, pos.y);
    },
    [addNodeAt]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection);
    },
    [onConnect]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((mod && key === "y") || (mod && key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
        return;
      }
      if (key === "delete" || key === "backspace") {
        const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
        const selectedEdgeIds = edges.filter((ed) => ed.selected).map((ed) => ed.id);
        if (selectedNodeIds.length || selectedEdgeIds.length) {
          e.preventDefault();
          deleteSelection(selectedNodeIds, selectedEdgeIds);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelection, edges, nodes, redo, undo]);

  const selectedNodeIds = useMemo(() => nodes.filter((n) => n.selected).map((n) => n.id), [nodes]);
  const focusedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  return (
    <div className="h-[calc(100vh-3rem)] grid grid-cols-[18rem_1fr_20rem]">
      <aside className="border-r border-white/10 bg-[#0b0d12]">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-white/70">
              {workflow?.name ?? "Workflow"}
              {isLoadingWorkflow ? <span className="text-white/40"> (loading…)</span> : null}
            </div>
            <button
              onClick={() => void saveWorkflowToServer()}
              disabled={isSavingWorkflow || isLoadingWorkflow}
              className="h-8 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs disabled:opacity-40"
            >
              {isSavingWorkflow ? "Saving…" : "Save"}
            </button>
          </div>
          {workflowError ? (
            <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 text-red-100 text-xs p-2">
              {workflowError}
            </div>
          ) : null}

          <div className="text-xs text-white/60 mb-2">Quick access</div>
          <div className="grid gap-2">
            <SidebarButton kind="text" label="Text Node" onClick={addFromSidebar} />
            <SidebarButton kind="upload_image" label="Upload Image" onClick={addFromSidebar} />
            <SidebarButton kind="upload_video" label="Upload Video" onClick={addFromSidebar} />
            <SidebarButton kind="llm" label="Run any LLM" onClick={addFromSidebar} />
            <SidebarButton kind="crop_image" label="Crop Image" onClick={addFromSidebar} />
            <SidebarButton kind="extract_frame" label="Extract Frame" onClick={addFromSidebar} />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="h-9 px-3 rounded-md bg-white/5 border border-white/10 text-xs disabled:opacity-40"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="h-9 px-3 rounded-md bg-white/5 border border-white/10 text-xs disabled:opacity-40"
            >
              Redo
            </button>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4 grid gap-2">
            <div className="text-xs text-white/60">Run</div>
            <button
              onClick={() => void createRunOnServer({ scope: "FULL" })}
              className="h-9 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-left"
            >
              Run workflow
            </button>
            <button
              onClick={() => void createRunOnServer({ scope: "PARTIAL", nodeIds: selectedNodeIds })}
              disabled={selectedNodeIds.length === 0}
              className="h-9 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-left disabled:opacity-40"
            >
              Run selection ({selectedNodeIds.length})
            </button>
            <button
              onClick={() => (focusedNodeId ? void createRunOnServer({ scope: "SINGLE", nodeIds: [focusedNodeId] }) : null)}
              disabled={!focusedNodeId}
              className="h-9 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-left disabled:opacity-40"
            >
              Run focused node
            </button>
          </div>
        </div>
      </aside>

      <main className="relative" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={null}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(DND_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            const kind = e.dataTransfer.getData(DND_MIME) as NodeKind;
            if (!kind) return;
            e.preventDefault();
            setIsDragOver(false);

            const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            addNodeAt(kind, pos.x, pos.y);
          }}
        >
          <Background
            variant="dots"
            gap={16}
            size={1}
            color="rgba(255,255,255,0.10)"
          />
          <MiniMap pannable zoomable className="!bg-[#0b0d12] !border !border-white/10" />
          <Controls className="!bg-[#0b0d12] !border !border-white/10" />
          {isDragOver ? (
            <div className="pointer-events-none absolute inset-0 ring-2 ring-white/15" />
          ) : null}
        </ReactFlow>
      </main>

      <aside className="border-l border-white/10 bg-[#0b0d12]">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-white/60">Workflow history</div>
            <button
              onClick={() => void loadRunsFromServer()}
              className="h-8 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
            >
              Refresh
            </button>
          </div>

          {runsError ? (
            <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 text-red-100 text-xs p-2">
              {runsError}
            </div>
          ) : null}

          {isLoadingRuns ? (
            <div className="text-sm text-white/40">Loading…</div>
          ) : runs.length === 0 ? (
            <div className="text-sm text-white/40">No runs yet.</div>
          ) : (
            <div className="grid gap-2">
              {runs.map((r) => {
                const started = new Date(r.startedAt).toLocaleString();
                const badge =
                  r.status === "SUCCESS"
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"
                    : r.status === "FAILED"
                      ? "bg-red-500/20 text-red-200 border-red-500/30"
                      : r.status === "RUNNING"
                        ? "bg-yellow-500/20 text-yellow-200 border-yellow-500/30"
                        : "bg-white/5 text-white/60 border-white/10";

                const isExpanded = expandedRunId === r.id;
                const details = runDetailsById[r.id];
                const planLayers: string[][] | null =
                  details?.nodeRuns?.plan?.layers ?? r.nodeRuns?.plan?.layers ?? null;

                return (
                  <div key={r.id} className="rounded-lg border border-white/10 bg-white/5">
                    <button
                      onClick={() => void toggleRunExpanded(r.id)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left"
                    >
                      <div className="grid">
                        <div className="text-sm text-white/90">Run {r.id.slice(0, 6)}</div>
                        <div className="text-xs text-white/50">
                          {started} · {r.scope}
                        </div>
                      </div>
                      <div className={["text-[11px] px-2 py-1 rounded border", badge].join(" ")}>
                        {r.status}
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="px-3 pb-3 grid gap-2">
                        {r.errorMessage ? (
                          <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-100 text-xs p-2">
                            {r.errorMessage}
                          </div>
                        ) : null}

                        {planLayers ? (
                          <div className="rounded-md border border-white/10 bg-black/20 p-2">
                            <div className="text-xs text-white/60 mb-1">Execution layers (parallel)</div>
                            <div className="text-xs text-white/70 whitespace-pre-wrap">
                              {planLayers
                                .map((layer, i) => `Layer ${i + 1}: ${layer.join(", ")}`)
                                .join("\n")}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-white/40">No plan details.</div>
                        )}

                        <button
                          onClick={() => applyRunOutputsToCanvas(r.id)}
                          className="h-9 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-left"
                        >
                          Apply outputs to canvas
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

