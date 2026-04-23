import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

export const runGeminiLLM = task({
  id: "node.llm.run",
  run: async (payload: unknown) => {
    const schema = z.object({
      model: z.string().min(1).default("gemini-2.5-flash"),
      systemPrompt: z.string().optional(),
      userMessage: z.string().min(1),
      imageUrls: z.array(z.string().url()).default([]),
    });

    const input = schema.parse(payload);
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("Missing env: GOOGLE_GENERATIVE_AI_API_KEY");

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: input.model,
      systemInstruction: input.systemPrompt ? input.systemPrompt : undefined,
    });

    const parts: Part[] = [{ text: input.userMessage }];

    // Gemini expects inlineData for images; we fetch each URL and base64 it.
    for (const url of input.imageUrls) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      parts.push({
        inlineData: {
          data: buf.toString("base64"),
          mimeType: contentType,
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const text = result.response.text();
    return { ok: true as const, text };
  },
});
