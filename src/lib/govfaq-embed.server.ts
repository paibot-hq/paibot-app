import { DIM, MODEL, quantize, toBase64 } from "../tools/govfaq/govfaq-vectors.ts";
import { readJsonPost } from "./json-post.server.ts";

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
// A question of 200 characters is at most 800 bytes of UTF-8, in a body that holds nothing else.
const MAX_BODY_BYTES = 4096;
const headers = { "Cache-Control": "no-store" };
const fail = (status: number, error: string, extra: Record<string, string> = {}) => Response.json({ error }, { status, headers: { ...headers, ...extra } });

export async function handleEmbed(request: Request, deps: EmbedDeps): Promise<Response> {
  const posted = await readJsonPost(request, MAX_BODY_BYTES);
  if (!posted.ok) return fail(posted.status, posted.error, posted.status === 405 ? { Allow: "POST" } : {});
  const body = posted.body;
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

// Workers AI through its REST address instead of the binding, for running the site on your own computer: the binding reaches the real service
// through a helper Worker that Cloudflare Access can turn away. It is used only where LOCAL_AI_ACCOUNT_ID and LOCAL_AI_TOKEN are set
// (in .dev.vars, which is never deployed); the deployed Worker uses the binding. Gives what the binding gives: the `result` of the answer.
export function restAi(options: { accountId: string; token: string; fetchImpl?: typeof fetch }): NonNullable<EmbedDeps["ai"]> {
  const { accountId, token, fetchImpl = fetch } = options;
  return {
    async run(model, input) {
      const response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`Workers AI answered ${response.status}`);
      // A question asked with `stream: true` is answered with the stream itself, as the binding does.
      if ((input as { stream?: unknown } | null)?.stream === true && response.body) return response.body;
      return ((await response.json()) as { result?: unknown }).result;
    },
  };
}
