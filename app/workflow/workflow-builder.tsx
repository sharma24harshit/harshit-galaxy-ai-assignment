"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type NodeTypes,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bot,
  Clapperboard,
  Crop,
  FolderClosed,
  ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Play,
  Redo2,
  Save,
  Sparkles,
  Type,
  Undo2,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import NextflowNode from "@/src/workflow/nodes/nextflow-node";
import { useWorkflowStore } from "@/src/stores/workflow-store";
import type { NodeKind } from "@/src/workflow/types";

const DND_MIME = "application/x-nextflow-nodekind";

const TOOL_ITEMS: Array<{
  kind: NodeKind;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
}> = [
  {
    kind: "text",
    label: "Text Node",
    icon: Type,
    iconClassName: "bg-white/10 text-white",
  },
  {
    kind: "upload_image",
    label: "Upload Image",
    icon: ImageIcon,
    iconClassName: "bg-sky-500/20 text-sky-200",
  },
  {
    kind: "upload_video",
    label: "Upload Video",
    icon: Video,
    iconClassName: "bg-amber-500/20 text-amber-200",
  },
  {
    kind: "llm",
    label: "Run any LLM",
    icon: Bot,
    iconClassName: "bg-violet-500/20 text-violet-200",
  },
  {
    kind: "crop_image",
    label: "Crop Image",
    icon: Crop,
    iconClassName: "bg-emerald-500/20 text-emerald-200",
  },
  {
    kind: "extract_frame",
    label: "Extract Frame",
    icon: Clapperboard,
    iconClassName: "bg-rose-500/20 text-rose-200",
  },
];

function SidebarItemButton(props: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active?: boolean;
  disabled?: boolean;
  iconClassName?: string;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
}) {
  const Icon = props.icon;

  return (
    <button
      type="button"
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.label}
      className={[
        "group flex h-11 w-full items-center rounded-2xl border text-sm transition-all",
        props.collapsed ? "justify-center px-0" : "gap-3 px-3 text-left",
        props.active
          ? "border-white/10 bg-white/[0.14] text-white"
          : "border-transparent bg-transparent text-white/78 hover:border-white/6 hover:bg-white/[0.08] hover:text-white",
        props.disabled ? "cursor-not-allowed opacity-35" : "active:scale-[0.99]",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
          props.active
            ? "bg-blue-500/20 text-blue-200"
            : props.iconClassName ?? "bg-white/10 text-white/80",
        ].join(" ")}
      >
        <Icon className="size-4" strokeWidth={2.1} />
      </span>
      {props.collapsed ? null : <span className="truncate">{props.label}</span>}
    </button>
  );
}

function SidebarSectionLabel(props: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (props.collapsed) return null;

  return (
    <div className="px-2 text-[11px] uppercase tracking-[0.22em] text-white/28">
      {props.children}
    </div>
  );
}

function WorkflowBuilderContent() {
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const nodeTypes = useMemo<NodeTypes>(() => ({ nextflowNode: NextflowNode }), []);

  useEffect(() => {
    void loadWorkflowFromServer();
    void loadRunsFromServer();
  }, [loadRunsFromServer, loadWorkflowFromServer]);

  useEffect(() => {
    if (runs.some((r) => r.status === "RUNNING")) {
      const timer = window.setInterval(() => {
        void loadRunsFromServer();
      }, 2000);
      return () => window.clearInterval(timer);
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
    [addNodeAt, screenToFlowPosition]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection);
    },
    [onConnect]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? event.metaKey : event.ctrlKey;

      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if ((mod && key === "y") || (mod && key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
        return;
      }
      if (key === "delete" || key === "backspace") {
        const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
        const selectedEdgeIds = edges.filter((edge) => edge.selected).map((edge) => edge.id);
        if (selectedNodeIds.length || selectedEdgeIds.length) {
          event.preventDefault();
          deleteSelection(selectedNodeIds, selectedEdgeIds);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelection, edges, nodes, redo, undo]);

  const selectedNodeIds = useMemo(
    () => nodes.filter((n) => n.selected).map((n) => n.id),
    [nodes]
  );
  const focusedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  return (
    <div
      className={[
        "h-[calc(100vh-3rem)] grid transition-[grid-template-columns] duration-300 ease-out",
        isSidebarCollapsed
          ? "grid-cols-[4.75rem_1fr_20rem]"
          : "grid-cols-[18rem_1fr_20rem]",
      ].join(" ")}
    >
      <aside className="border-r border-white/10 bg-black">
        <div className="flex h-full flex-col px-3 py-4">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            className={[
              "flex h-11 w-full items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/80 transition-all hover:bg-white/[0.08] hover:text-white",
              isSidebarCollapsed ? "justify-center px-0" : "justify-between px-3",
            ].join(" ")}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {/* <span className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/8 text-white">
                <PanelsTopLeft className="size-4" strokeWidth={2.1} />
              </span>
              {isSidebarCollapsed ? null : (
                <span className="text-sm font-medium text-white">Navigation</span>
              )}
            </span> */}
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="size-4 text-white/75" strokeWidth={2.1} />
            ) : (
              <PanelLeftClose className="size-4 text-white/55" strokeWidth={2.1} />
            )}
          </button>

          {isSidebarCollapsed ? null : (
            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/28">
                Workflow
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-medium text-white">
                    {workflow?.name ?? "Untitled"}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    {isLoadingWorkflow ? "Loading..." : "Node editor"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void saveWorkflowToServer()}
                  disabled={isSavingWorkflow || isLoadingWorkflow}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/75 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-40"
                  title={isSavingWorkflow ? "Saving..." : "Save workflow"}
                >
                  <Save className="size-4" strokeWidth={2.1} />
                </button>
              </div>
            </div>
          )}

          {workflowError && !isSidebarCollapsed ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {workflowError}
            </div>
          ) : null}

          {/* <div className="mt-5">
            <SidebarSectionLabel collapsed={isSidebarCollapsed}>
              Workspace
            </SidebarSectionLabel>
            <div className="mt-2 grid gap-1.5">
              <SidebarItemButton
                icon={Sparkles}
                label="Nextflow"
                collapsed={isSidebarCollapsed}
                iconClassName="bg-fuchsia-500/15 text-fuchsia-200"
              />
              <SidebarItemButton
                icon={Workflow}
                label="Node Editor"
                collapsed={isSidebarCollapsed}
                active
              />
              <SidebarItemButton
                icon={FolderClosed}
                label="Assets"
                collapsed={isSidebarCollapsed}
                iconClassName="bg-cyan-500/15 text-cyan-200"
              />
            </div>
          </div> */}

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
            <SidebarSectionLabel collapsed={isSidebarCollapsed}>Tools</SidebarSectionLabel>
            <div className="mt-2 grid gap-1.5">
              {TOOL_ITEMS.map((item) => (
                <SidebarItemButton
                  key={item.kind}
                  icon={item.icon}
                  label={item.label}
                  collapsed={isSidebarCollapsed}
                  iconClassName={item.iconClassName}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DND_MIME, item.kind);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => addFromSidebar(item.kind)}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            {isSidebarCollapsed ? (
              <div className="grid gap-2">
                <SidebarItemButton
                  icon={Save}
                  label={isSavingWorkflow ? "Saving..." : "Save workflow"}
                  collapsed
                  disabled={isSavingWorkflow || isLoadingWorkflow}
                  onClick={() => void saveWorkflowToServer()}
                />
                <SidebarItemButton
                  icon={Undo2}
                  label="Undo"
                  collapsed
                  disabled={!canUndo()}
                  onClick={undo}
                />
                <SidebarItemButton
                  icon={Redo2}
                  label="Redo"
                  collapsed
                  disabled={!canRedo()}
                  onClick={redo}
                />
                <SidebarItemButton
                  icon={Play}
                  label="Run workflow"
                  collapsed
                  onClick={() => void createRunOnServer({ scope: "FULL" })}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <SidebarItemButton
                    icon={Undo2}
                    label="Undo"
                    collapsed={false}
                    disabled={!canUndo()}
                    onClick={undo}
                  />
                  <SidebarItemButton
                    icon={Redo2}
                    label="Redo"
                    collapsed={false}
                    disabled={!canRedo()}
                    onClick={redo}
                  />
                </div>
                <SidebarItemButton
                  icon={Play}
                  label="Run workflow"
                  collapsed={false}
                  onClick={() => void createRunOnServer({ scope: "FULL" })}
                />
                <SidebarItemButton
                  icon={Play}
                  label={`Run selection (${selectedNodeIds.length})`}
                  collapsed={false}
                  disabled={selectedNodeIds.length === 0}
                  onClick={() =>
                    void createRunOnServer({ scope: "PARTIAL", nodeIds: selectedNodeIds })
                  }
                />
                <SidebarItemButton
                  icon={Play}
                  label="Run focused node"
                  collapsed={false}
                  disabled={!focusedNodeId}
                  onClick={() =>
                    focusedNodeId
                      ? void createRunOnServer({
                          scope: "SINGLE",
                          nodeIds: [focusedNodeId],
                        })
                      : null
                  }
                />
              </div>
            )}
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
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes(DND_MIME)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => {
            const kind = event.dataTransfer.getData(DND_MIME) as NodeKind;
            if (!kind) return;
            event.preventDefault();
            setIsDragOver(false);

            const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            addNodeAt(kind, pos.x, pos.y);
          }}
        >
          <Background variant="dots" gap={16} size={1} color="rgba(255,255,255,0.10)" />
          <MiniMap pannable zoomable className="!bg-[#0b0d12] !border !border-white/10" />
          <Controls className="!bg-[#0b0d12] !border !border-white/10" />
          {isDragOver ? (
            <div className="pointer-events-none absolute inset-0 ring-2 ring-white/15" />
          ) : null}
        </ReactFlow>
      </main>

      <aside className="border-l border-white/10 bg-[#0b0d12]">
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-white/60">Workflow history</div>
            <button
              type="button"
              onClick={() => void loadRunsFromServer()}
              className="h-8 rounded-md border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"
            >
              Refresh
            </button>
          </div>

          {runsError ? (
            <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-100">
              {runsError}
            </div>
          ) : null}

          {isLoadingRuns ? (
            <div className="text-sm text-white/40">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="text-sm text-white/40">No runs yet.</div>
          ) : (
            <div className="grid gap-2">
              {runs.map((run) => {
                const started = new Date(run.startedAt).toLocaleString();
                const badge =
                  run.status === "SUCCESS"
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"
                    : run.status === "FAILED"
                      ? "bg-red-500/20 text-red-200 border-red-500/30"
                      : run.status === "RUNNING"
                        ? "bg-yellow-500/20 text-yellow-200 border-yellow-500/30"
                        : "bg-white/5 text-white/60 border-white/10";

                const isExpanded = expandedRunId === run.id;
                const details = runDetailsById[run.id];
                const planLayers: string[][] | null =
                  details?.nodeRuns?.plan?.layers ?? run.nodeRuns?.plan?.layers ?? null;

                return (
                  <div key={run.id} className="rounded-lg border border-white/10 bg-white/5">
                    <button
                      type="button"
                      onClick={() => void toggleRunExpanded(run.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left"
                    >
                      <div className="grid">
                        <div className="text-sm text-white/90">
                          Run {run.id.slice(0, 6)}
                        </div>
                        <div className="text-xs text-white/50">
                          {started} - {run.scope}
                        </div>
                      </div>
                      <div className={["rounded border px-2 py-1 text-[11px]", badge].join(" ")}>
                        {run.status}
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="grid gap-2 px-3 pb-3">
                        {run.errorMessage ? (
                          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-100">
                            {run.errorMessage}
                          </div>
                        ) : null}

                        {planLayers ? (
                          <div className="rounded-md border border-white/10 bg-black/20 p-2">
                            <div className="mb-1 text-xs text-white/60">
                              Execution layers (parallel)
                            </div>
                            <div className="whitespace-pre-wrap text-xs text-white/70">
                              {planLayers
                                .map((layer, index) => `Layer ${index + 1}: ${layer.join(", ")}`)
                                .join("\n")}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-white/40">No plan details.</div>
                        )}

                        <button
                          type="button"
                          onClick={() => applyRunOutputsToCanvas(run.id)}
                          className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-left text-xs hover:bg-white/10"
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

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent />
    </ReactFlowProvider>
  );
}
