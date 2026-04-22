import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { uploadToTransloadit } from "../lib/transloadit";

export const extractFrameFromVideo = task({
  id: "node.extract_frame.run",
  run: async (payload: unknown) => {
    const schema = z.object({
      videoUrl: z.string().url(),
      timestamp: z.union([z.number().min(0), z.string().min(1)]).default(0),
      outputFormat: z.enum(["png", "jpg"]).default("png"),
    });

    const input = schema.parse(payload);
    if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary path.");

    const res = await fetch(input.videoUrl);
    if (!res.ok) throw new Error(`Failed to fetch video: ${input.videoUrl}`);
    const buf = Buffer.from(await res.arrayBuffer());

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "nextflow-frame-"));
    const inFile = path.join(tmpDir, "in");
    const outFile = path.join(tmpDir, `out.${input.outputFormat}`);
    await fs.writeFile(inFile, buf);

    // We accept:
    // - seconds as number
    // - "50%" as a string: we approximate by extracting at 0 seconds for now unless duration probing is added
    const seek =
      typeof input.timestamp === "number"
        ? String(input.timestamp)
        : input.timestamp.trim().endsWith("%")
          ? "0"
          : input.timestamp.trim();

    await new Promise<void>((resolve, reject) => {
      const p = spawn(
        ffmpegPath as string,
        ["-y", "-ss", seek, "-i", inFile, "-frames:v", "1", outFile],
        { stdio: "ignore" }
      );
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
      fileName: `frame.${input.outputFormat}`,
      mimeType,
    });

    return { ok: true as const, imageUrl: uploaded.url };
  },
});

