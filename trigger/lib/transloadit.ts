import crypto from "crypto";

type AssemblyResponse = {
  ok: "ASSEMBLY_UPLOADED" | string;
  assembly_id: string;
  assembly_ssl_url: string;
  uploads?: Array<{ ssl_url?: string }>;
  results?: Record<string, Array<{ ssl_url?: string; url?: string }>>;
};

function assertEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function uploadToTransloadit(args: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ url: string; assemblyId: string }> {
  const key = assertEnv("TRANSLOADIT_KEY");
  const secret = assertEnv("TRANSLOADIT_SECRET");

  // Minimal "upload-only" assembly.
  // We request a store result so we can read a stable URL back.
  const expires = new Date(Date.now() + 5 * 60_000).toISOString();
  const params = {
    auth: { key, expires },
    template_id: undefined,
    steps: {
      ":original": {
        robot: "/upload/handle",
      },
    },
  };

  const paramsStr = JSON.stringify(params);
  const signature = crypto.createHmac("sha1", secret).update(paramsStr).digest("hex");

  const form = new FormData();
  form.append("params", paramsStr);
  form.append("signature", signature);
  form.append(
    "file",
    new Blob([new Uint8Array(args.fileBuffer)], { type: args.mimeType }),
    args.fileName
  );

  const res = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Transloadit upload failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as AssemblyResponse;
  const url =
  json?.results?.[":original"]?.[0]?.ssl_url ??
  json?.uploads?.[0]?.ssl_url;

  if (!url) throw new Error("Transloadit upload succeeded but no URL returned.");
  return { url, assemblyId: json.assembly_id };
}

