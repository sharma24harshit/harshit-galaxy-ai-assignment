import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { saveWorkflowSchema } from "@/src/workflow/schema";
import { createSampleWorkflow } from "@/src/workflow/sample-workflow";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let workflow = await prisma.workflow.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        userId,
        name: "Product Marketing Kit Generator",
        graph: createSampleWorkflow() as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ workflow });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = saveWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, graph } = parsed.data;

  const existing = await prisma.workflow.findFirst({
    where: { userId, name },
    orderBy: { updatedAt: "desc" },
  });
  const cleanGraph = cleanJSON(graph);
  const workflow = existing
    ? await prisma.workflow.update({
        where: { id: existing.id },
        data: { graph: cleanGraph },
      })
    : await prisma.workflow.create({
        data: { userId, name, graph: cleanGraph },
      });

  return NextResponse.json({ workflow });
}

function cleanJSON(data: any) {
  return JSON.parse(JSON.stringify(data));
}