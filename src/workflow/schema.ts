import { z } from "zod";

export const nodeKindSchema = z.enum([
  "text",
  "upload_image",
  "upload_video",
  "llm",
  "crop_image",
  "extract_frame",
]);

export const graphSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

export const saveWorkflowSchema = z.object({
  name: z.string().min(1).max(120),
  graph: graphSchema,
});

export const runScopeSchema = z.enum(["FULL", "PARTIAL", "SINGLE"]);

export const createRunSchema = z.object({
  workflowId: z.string().min(1),
  scope: runScopeSchema,
  nodeIds: z.array(z.string()).optional(), // for PARTIAL or SINGLE
});

