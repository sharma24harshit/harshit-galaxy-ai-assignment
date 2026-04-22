import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { uploadToTransloadit } from "../lib/transloadit";

export const cropImage = task({
  id: "node.crop_image.run",
  run: async (payload: unknown) => {
    const schema = z.object({
      imageUrl: z.string().url(),
      xPercent: z.number().min(0).max(100).default(0),
      yPercent: z.number().min(0).max(100).default(0),
      widthPercent: z.number().min(0).max(100).default(100),
      heightPercent: z.number().min(0).max(100).default(100),
      outputFormat: z.enum(["png", "jpg"]).default("png"),
    });

    const input = schema.parse(payload);
    if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary path.");

    const res = await fetch(input.imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${input.imageUrl}`);
    const buf = Buffer.from(await res.arrayBuffer());

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "nextflow-crop-"));
    const inFile = path.join(tmpDir, "in");
    const outFile = path.join(tmpDir, `out.${input.outputFormat}`);
    await fs.writeFile(inFile, buf);

    // Crop uses percentage-based expression:
    // w = in_w * wp/100, h = in_h * hp/100
    // x = in_w * xp/100, y = in_h * yp/100
    const cropExpr = `crop=iw*${input.widthPercent}/100:ih*${input.heightPercent}/100:iw*${input.xPercent}/100:ih*${input.yPercent}/100`;

    await new Promise<void>((resolve, reject) => {
      const p = spawn(ffmpegPath as string, ["-y", "-i", inFile, "-vf", cropExpr, outFile], {
        stdio: "ignore",
      });
      p.on("error", reject);
      p.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });

    const outBuf = await fs.readFile(outFile);
    const mimeType = input.outputFormat === "png" ? "image/png" : "image/jpeg";
    const uploaded = await uploadToTransloadit({
      fileBuffer: outBuf,
      fileName: `crop.${input.outputFormat}`,
      mimeType,
    });

    return { ok: true as const, imageUrl: uploaded.url };
  },
});

