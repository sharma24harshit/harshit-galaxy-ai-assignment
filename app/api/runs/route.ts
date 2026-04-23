import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { createRunSchema } from "@/src/workflow/schema";
import { createRunPlan } from "@/src/workflow/planner";
import { tasks } from "@trigger.dev/sdk/v3";
import type { orchestrateWorkflowRun } from "@/trigger/tasks/orchestrate-run";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runs = await prisma.workflowRun.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ runs });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { workflowId, scope, nodeIds } = parsed.data;

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const graph = workflow.graph as { nodes?: { id?: string }[]; edges?: any[] } | null;
  const allNodeIds = Array.isArray(graph?.nodes)
    ? graph!.nodes.map((n) => n?.id).filter((x): x is string => typeof x === "string")
    : [];
  const edges = Array.isArray(graph?.edges) ? (graph!.edges as any[]) : [];

  const requested =
    scope === "FULL"
      ? allNodeIds
      : scope === "SINGLE"
        ? nodeIds?.slice(0, 1) ?? []
        : nodeIds ?? [];

  const plan = createRunPlan({
    scope,
    requestedNodeIds: requested,
    allNodeIds,
    edges: edges as any,
  });

  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      userId,
      scope,
      status: "RUNNING",
      nodeRuns: {
        plan,
        nodes: {},
      },
    },
  });

  // Kick off orchestration via Trigger.dev (background)
  try {
    await tasks.trigger<typeof orchestrateWorkflowRun>("workflow.run.orchestrate", { runId: run.id });
  } catch (e) {
    // If triggering fails (missing TRIGGER_SECRET_KEY etc), mark run failed with a friendly message
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          e instanceof Error
            ? `Failed to trigger execution: ${e.message}`
            : "Failed to trigger execution",
      },
    });
  }

  return NextResponse.json({ run });
}

