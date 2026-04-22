import { task, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { runGeminiLLM } from "./llm";
import { cropImage } from "./crop-image";
import { extractFrameFromVideo } from "./extract-frame";

type GraphNode = {
  id: string;
  data?: any;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

function nowMs() {
  return Date.now();
}

function handleKey(handle: string | undefined) {
  const raw = handle ?? "";
  const parts = raw.split(":");
  return parts.length === 2 ? parts[1] : raw;
}

function nodeKind(node: GraphNode): string {
  return node?.data?.kind ?? "unknown";
}

function getManualInput(node: GraphNode, inputId: string): string {
  return node?.data?.inputs?.[inputId] ?? "";
}

function setNodeRun(
  nodeRuns: any,
  nodeId: string,
  patch: Record<string, any>
) {
  const prev = nodeRuns.nodes?.[nodeId] ?? {};
  nodeRuns.nodes = nodeRuns.nodes ?? {};
  nodeRuns.nodes[nodeId] = { ...prev, ...patch };
}

function resolveInputFromEdges(args: {
  nodeId: string;
  inputId: string;
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  outputsByNode: Record<string, any>;
}) {
  const { nodeId, inputId, edges, outputsByNode } = args;
  const incoming = edges.filter(
    (e) => e.target === nodeId && handleKey(e.targetHandle) === inputId
  );

  if (incoming.length === 0) return null;
  // multiple edges allowed (e.g., LLM images)
  const values = incoming
    .map((e) => {
      const outId = handleKey(e.sourceHandle);
      return outputsByNode[e.source]?.outputs?.[outId];
    })
    .filter((v) => typeof v === "string" && v.length > 0);

  return values;
}

export const orchestrateWorkflowRun = task({
  id: "workflow.run.orchestrate",
  run: async (payload: unknown) => {
    const schema = z.object({ runId: z.string().min(1) });
    const { runId } = schema.parse(payload);

    const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) throw new Error(`Run not found: ${runId}`);

    const workflow = await prisma.workflow.findUnique({
      where: { id: run.workflowId },
    });
    if (!workflow) throw new Error(`Workflow not found: ${run.workflowId}`);

    const graph = workflow.graph as any;
    const nodesArr = (graph?.nodes ?? []) as GraphNode[];
    const edgesArr = (graph?.edges ?? []) as GraphEdge[];
    const nodes = new Map(nodesArr.map((n) => [n.id, n]));

    const plan = (run.nodeRuns as any)?.plan;
    const layers: string[][] = plan?.layers ?? [];
    if (!Array.isArray(layers) || layers.length === 0) {
      throw new Error("Run plan missing layers");
    }

    const startedAtMs = nowMs();
    const nodeRuns = (run.nodeRuns as any) ?? { plan, nodes: {} };
    const outputsByNode: Record<string, any> = {};

    logger.info("Starting orchestration", { runId, layers: layers.length });

    try {
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        logger.info("Executing layer", { runId, layerIndex: i, nodeCount: layer.length });

        const results = await Promise.all(
          layer.map(async (nodeId) => {
            const node = nodes.get(nodeId);
            if (!node) {
              setNodeRun(nodeRuns, nodeId, {
                status: "failed",
                error: "Node not found in graph",
              });
              return;
            }

            const kind = nodeKind(node);
            const t0 = nowMs();
            setNodeRun(nodeRuns, nodeId, { status: "running", startedAt: new Date().toISOString() });

            try {
              // Build resolved inputs for supported node types
              if (kind === "text") {
                const text = getManualInput(node, "text");
                const outputs = { text };
                const dt = nowMs() - t0;
                outputsByNode[nodeId] = { outputs };
                setNodeRun(nodeRuns, nodeId, {
                  status: "success",
                  durationMs: dt,
                  inputs: { text },
                  outputs,
                  finishedAt: new Date().toISOString(),
                });
                return;
              }

              if (kind === "upload_image") {
                // UI upload will populate output URL; until then we treat as pre-provided.
                const imageUrl = node?.data?.outputs?.image_url ?? "";
                if (!imageUrl) throw new Error("Missing image_url output (upload not completed)");
                const outputs = { image_url: imageUrl };
                const dt = nowMs() - t0;
                outputsByNode[nodeId] = { outputs };
                setNodeRun(nodeRuns, nodeId, {
                  status: "success",
                  durationMs: dt,
                  inputs: {},
                  outputs,
                  finishedAt: new Date().toISOString(),
                });
                return;
              }

              if (kind === "upload_video") {
                const videoUrl = node?.data?.outputs?.video_url ?? "";
                if (!videoUrl) throw new Error("Missing video_url output (upload not completed)");
                const outputs = { video_url: videoUrl };
                const dt = nowMs() - t0;
                outputsByNode[nodeId] = { outputs };
                setNodeRun(nodeRuns, nodeId, {
                  status: "success",
                  durationMs: dt,
                  inputs: {},
                  outputs,
                  finishedAt: new Date().toISOString(),
                });
                return;
              }

              if (kind === "crop_image") {
                const resolvedImage = resolveInputFromEdges({
                  nodeId,
                  inputId: "image_url",
                  nodes,
                  edges: edgesArr,
                  outputsByNode,
                });
                const imageUrl = (resolvedImage?.[0] as string | undefined) ?? getManualInput(node, "image_url");
                if (!imageUrl) throw new Error("Missing image_url");

                const xPercent = Number(getManualInput(node, "x_percent") || "0");
                const yPercent = Number(getManualInput(node, "y_percent") || "0");
                const widthPercent = Number(getManualInput(node, "width_percent") || "100");
                const heightPercent = Number(getManualInput(node, "height_percent") || "100");

                const child = await cropImage.triggerAndWait({
                  imageUrl,
                  xPercent,
                  yPercent,
                  widthPercent,
                  heightPercent,
                });

                if (!child.ok) throw new Error("Crop task failed");
                const outputs = { output: child.imageUrl };
                const dt = nowMs() - t0;
                outputsByNode[nodeId] = { outputs };
                setNodeRun(nodeRuns, nodeId, {
                  status: "success",
                  durationMs: dt,
                  inputs: { imageUrl, xPercent, yPercent, widthPercent, heightPercent },
                  outputs,
                  finishedAt: new Date().toISOString(),
                });
                return;
              }

              if (kind === "extract_frame") {
                const resolvedVideo = resolveInputFromEdges({
                  nodeId,
                  inputId: "video_url",
                  nodes,
                  edges: edgesArr,
                  outputsByNode,
                });
                const videoUrl = (resolvedVideo?.[0] as string | undefined) ?? getManualInput(node, "video_url");
                if (!videoUrl) throw new Error("Missing video_url");

                const timestampRaw = getManualInput(node, "timestamp") || "0";
                const timestamp: number | string = /^\d+(\.\d+)?$/.test(timestampRaw)
                  ? Number(timestampRaw)
                  : timestampRaw;

                const child = await extractFrameFromVideo.triggerAndWait({
                  videoUrl,
                  timestamp,
                });

                if (!child.ok) throw new Error("Extract frame task failed");
                const outputs = { output: child.imageUrl };
                const dt = nowMs() - t0;
                outputsByNode[nodeId] = { outputs };
                setNodeRun(nodeRuns, nodeId, {
                  status: "success",
                  durationMs: dt,
                  inputs: { videoUrl, timestamp },
                  outputs,
                  finishedAt: new Date().toISOString(),
                });
                return;
              }

              if (kind === "llm") {
                const sysResolved = resolveInputFromEdges({
                  nodeId,
                  inputId: "system_prompt",
                  nodes,
                  edges: edgesArr,
                  outputsByNode,
                });
                const userResolved = resolveInputFromEdges({
                  nodeId,
                  inputId: "user_message",
                  nodes,
                  edges: edgesArr,
                  outputsByNode,
                });
                const imagesResolved = resolveInputFromEdges({
                  nodeId,
                  inputId: "images",
                  nodes,
                  edges: edgesArr,
                  outputsByNode,
                });

                const systemPrompt = (sysResolved?.[0] as string | undefined) ?? getManualInput(node, "system_prompt") || undefined;
                const userMessage = (userResolved?.[0] as string | undefined) ?? getManualInput(node, "user_message");
                if (!userMessage) throw new Error("Missing user_message");

                const imageUrls = (imagesResolved ?? []).filter((x) => typeof x === "string") as string[];

                const child = await runGeminiLLM.triggerAndWait({
                  model: node?.data?.inputs?.model || "gemini-1.5-flash",
                  systemPrompt,
                  userMessage,
                  imageUrls,
                });

                if (!child.ok) throw new Error("LLM task failed");
                const outputs = { output: child.text };
                const dt = nowMs() - t0;
                outputsByNode[nodeId] = { outputs };
                setNodeRun(nodeRuns, nodeId, {
                  status: "success",
                  durationMs: dt,
                  inputs: { systemPrompt, userMessage, imageUrls },
                  outputs,
                  finishedAt: new Date().toISOString(),
                });
                return;
              }

              // Unknown node kind
              throw new Error(`Unsupported node kind: ${kind}`);
            } catch (err) {
              const dt = nowMs() - t0;
              setNodeRun(nodeRuns, nodeId, {
                status: "failed",
                durationMs: dt,
                error: err instanceof Error ? err.message : "Unknown error",
                finishedAt: new Date().toISOString(),
              });
            }
          })
        );

        void results;
        await prisma.workflowRun.update({
          where: { id: runId },
          data: {
            nodeRuns,
          },
        });
      }

      const anyFailed = Object.values(nodeRuns.nodes ?? {}).some((n: any) => n.status === "failed");
      const finishedAt = new Date();
      const durationMs = nowMs() - startedAtMs;
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: anyFailed ? "PARTIAL" : "SUCCESS",
          finishedAt,
          durationMs,
          nodeRuns,
        },
      });

      logger.info("Orchestration complete", { runId, status: anyFailed ? "PARTIAL" : "SUCCESS" });
      return { ok: true as const, runId };
    } catch (e) {
      const finishedAt = new Date();
      const durationMs = nowMs() - startedAtMs;
      const message = e instanceof Error ? e.message : "Unknown error";
      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          finishedAt,
          durationMs,
          errorMessage: message,
          nodeRuns,
        },
      });
      logger.error("Orchestration failed", { runId, message });
      throw e;
    }
  },
});

