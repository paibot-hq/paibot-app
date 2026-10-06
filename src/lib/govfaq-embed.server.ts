import { DIM, MODEL, quantize, toBase64 } from "../tools/govfaq/govfaq-vectors.ts";

// POST /api/govfaq/embed: a question in, its vector (1,024 numbers as bytes, in base64) out. The vector is made by Cloudflare's own Workers AI,
// with the model the FAQ's vectors were made with (the browser compares the two). The route only does this one thing: nothing the visitor sends
// is run as anything else, and it is limited per client IP. The dependencies are passed in so it can be tested without Cloudflare
// (src/routes/api.govfaq.embed.ts gives it the real ones).
export type EmbedDeps = {
  // Whether this client may ask again now.
  within: (key: string) => Promise<boolean>;
  ai: { run: (model: string, input: unknown) => Promise<unknown> } | undefined;
};

export const MAX_QUESTION = 200;
const headers = { "Cache-Control": "no-store" };
const fail = (status: number, error: string, extra: Record<string, string> = {}) => Response.json({ error }, { status, headers: { ...headers, ...extra } });

export async function handleEmbed(request: Request, deps: EmbedDeps): Promise<Response> {
  if (request.method !== "POST") return fail(405, "POST only", { Allow: "POST" });
  let body: unknown;
  try { body = await request.json(); } catch { return fail(400, "Invalid JSON"); }
  const q = typeof (body as { q?: unknown })?.q === "string" ? ((body as { q: string }).q).trim() : "";
  if (!q || [...q].length > MAX_QUESTION) return fail(400, "A question of 1 to 200 characters is needed");
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!(await deps.within(`govfaq:${ip}`))) return fail(429, "Too many questions", { "Retry-After": "30" });
  if (!deps.ai) return fail(503, "Unavailable");
  try {
    const result = (await deps.ai.run(MODEL, { text: [q] })) as { data?: unknown };
    const row = Array.isArray(result?.data) ? (result.data as unknown[])[0] : undefined;
    if (!Array.isArray(row) || row.length !== DIM || !row.every(n => typeof n === "number" && Number.isFinite(n))) return fail(503, "Unavailable");
    return Response.json({ model: MODEL, dim: DIM, vector: toBase64(quantize(row as number[])) }, { headers });
  } catch {
    return fail(503, "Unavailable");
  }
}
