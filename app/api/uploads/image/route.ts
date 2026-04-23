import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { uploadToTransloadit } from "@/trigger/lib/transloadit";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, JPEG, PNG, WEBP, and GIF images are supported" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    const result = await uploadToTransloadit({
      fileBuffer: buffer,
      fileName: file.name || "image-upload",
      mimeType: file.type,
    });

    return NextResponse.json({
      url: result.url,
      assemblyId: result.assemblyId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Image upload failed",
      },
      { status: 500 }
    );
  }
}
