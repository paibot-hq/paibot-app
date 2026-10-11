// The JSON body of a POST that one of the site's own pages sent, or why it is refused. A page's fetch sends its Origin
// and "application/json"; another site can only send a "simple" request (text/plain, a form) without asking the browser
// first, so requiring both stops a page elsewhere from making its visitors' browsers call an API of this site. It does
// not stop a program that writes these headers itself: per-client limits are still needed for that.
export type JsonPost = { ok: true; body: unknown } | { ok: false; status: number; error: string };

export async function readJsonPost(request: Request, maxBytes: number): Promise<JsonPost> {
  if (request.method !== "POST") return { ok: false, status: 405, error: "POST only" };
  if (request.headers.get("Origin") !== new URL(request.url).origin) return { ok: false, status: 403, error: "Not from this site" };
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") return { ok: false, status: 415, error: "JSON only" };
  // Content-Length can be absent or wrong, so the bytes are also counted as they are read, and reading stops past the limit.
  if (Number(request.headers.get("Content-Length") ?? 0) > maxBytes) return { ok: false, status: 413, error: "Too large" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (let read = await reader.read(); !read.done; read = await reader.read()) {
      size += read.value.length;
      if (size > maxBytes) { await reader.cancel(); return { ok: false, status: 413, error: "Too large" }; }
      chunks.push(read.value);
    }
  }
  const bytes = new Uint8Array(size);
  chunks.reduce((at, chunk) => (bytes.set(chunk, at), at + chunk.length), 0);
  try { return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) }; } catch { return { ok: false, status: 400, error: "Invalid JSON" }; }
}
