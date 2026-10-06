// The search by meaning in the browser: the FAQ's vectors (a file made by scripts/govfaq-embed.mjs) are fetched once, the Worker turns a question into
// a vector (the only thing that leaves the page: the question), and the nearest FAQs are found here. The two kinds of search are merged
// (see `rank`); when the vectors or the AI are not there, the search by words alone goes on as before.
import { decodeVectors, DIM, fromBase64, fuse, MODEL, nearest, signature } from "./govfaq-vectors.ts";
import { search, SURE_COVERAGE, type Index, type Item } from "./govfaq-search.ts";

export type Vectors = { data: Int8Array; dim: number };

// By meaning alone, a question must be at least this near (cosine) to be offered, and at least this near to be said to be the answer. These are
// first guesses to be measured with the real vectors (see docs/plans or the PR), not known values.
export const SEM_MIN = 0.55;
export const SEM_SURE = 0.72;

export const VECTORS_URL = "/govfaq-vectors.bin";
export const EMBED_URL = "/api/govfaq/embed";
export const EMBED_TIMEOUT = 6000;

// The vectors, if the file is there and is the one made from this very FAQ; otherwise null (nothing breaks: the search by words is used).
export async function loadVectors(items: Item[], fetchImpl: typeof fetch = fetch): Promise<Vectors | null> {
  try {
    const response = await fetchImpl(VECTORS_URL);
    if (!response.ok) return null;
    const { header, data } = decodeVectors(new Uint8Array(await response.arrayBuffer()));
    if (header.model !== MODEL || header.dim !== DIM || header.count !== items.length || header.signature !== signature(items)) return null;
    return { data, dim: header.dim };
  } catch { return null; }
}

// A question as a vector, from the Worker; null when it cannot (no AI, too many questions, no network, too slow).
export async function embedQuestion(question: string, fetchImpl: typeof fetch = fetch, timeout = EMBED_TIMEOUT): Promise<Int8Array | null> {
  try {
    const response = await fetchImpl(EMBED_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }), signal: AbortSignal.timeout(timeout) });
    if (!response.ok) return null;
    const body = (await response.json()) as { model?: string; dim?: number; vector?: string };
    if (body.model !== MODEL || body.dim !== DIM || typeof body.vector !== "string") return null;
    const vector = fromBase64(body.vector);
    return vector.length === DIM ? vector : null;
  } catch { return null; }
}

export type Ranked = { doc: number; sure: boolean; from: "both" | "lexical" | "semantic" };

// The candidates for a question, best first: what the search by words finds and what is near in meaning, merged by rank (what both find comes first).
// Without a vector (or without the FAQ's) it is the search by words alone.
export function rank(index: Index, query: string, options: { vectors?: Vectors | null; vector?: Int8Array | null; category?: number | null; limit?: number } = {}): Ranked[] {
  const limit = options.limit ?? 50;
  const lexical = search(index, query, { category: options.category, limit: 50 });
  const coverage = new Map(lexical.map(hit => [hit.doc, hit.coverage]));
  const { vectors, vector, category } = options;
  const close = vectors && vector && vector.length === vectors.dim
    ? nearest(vectors.data, vectors.dim, vector, 50, category == null ? undefined : doc => index.items[doc].category === category).filter(hit => hit.score >= SEM_MIN)
    : [];
  if (close.length === 0) return lexical.slice(0, limit).map(hit => ({ doc: hit.doc, sure: hit.coverage >= SURE_COVERAGE, from: "lexical" as const }));
  const similarity = new Map(close.map(hit => [hit.doc, hit.score]));
  return fuse(lexical.map(hit => hit.doc), close.map(hit => hit.doc), limit).map(({ doc, from }) => ({
    doc, from,
    sure: (coverage.get(doc) ?? 0) >= SURE_COVERAGE || (similarity.get(doc) ?? 0) >= SEM_SURE,
  }));
}
