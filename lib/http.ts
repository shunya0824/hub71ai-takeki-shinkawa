import { z } from "zod";
const buckets = new Map<string, { count: number; until: number }>();
export function limitRequest(request: Request): boolean {
  // Suitable for a local single-process demo. Use shared storage and a trusted proxy identity before public deployment.
  const key = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  for (const [id, bucket] of buckets) if (bucket.until < now) buckets.delete(id);
  if (buckets.size > 1000) return false;
  const bucket = buckets.get(key) || { count: 0, until: now + 60000 };
  buckets.set(key, bucket); bucket.count++;
  return bucket.count <= 30;
}
export async function readBody(request: Request, max = 200000) {
  if (Number(request.headers.get("content-length") || 0) > max) throw new Error("Input is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > max) { await reader.cancel(); throw new Error("Input is too large."); }
      chunks.push(value);
    }
    const data = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(data));
  } catch (error) { if (error instanceof SyntaxError) throw new Error("Invalid JSON request."); throw error; }
}
export function failure(error: unknown) {
  return Response.json({ error: error instanceof z.ZodError ? "Please check the input fields and try again." : error instanceof Error ? error.message : "Something went wrong. Please retry." }, { status: 400 });
}
