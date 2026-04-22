import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { saveWorkflowSchema } from "@/src/workflow/schema";
import { createSampleWorkflow } from "@/src/workflow/sample-workflow";

export async function GET() {
  const { userId } = auth();
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
        graph: createSampleWorkflow(),
      },
    });
  }

  return NextResponse.json({ workflow });
}

export async function POST(req: Request) {
  const { userId } = auth();
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

  const workflow = existing
    ? await prisma.workflow.update({
        where: { id: existing.id },
        data: { graph },
      })
    : await prisma.workflow.create({
        data: { userId, name, graph },
      });

  return NextResponse.json({ workflow });
}

