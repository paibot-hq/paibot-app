// The answer written from the FAQs, in the browser: which of the found FAQs are given to the Worker (by id only; the Worker has the texts), and
// what comes back. When it cannot be had (no AI, too many questions, no network, too slow, the FAQs do not answer) it is null and the chat shows
// the nearest FAQs as they are written.
import type { Index, Item } from "./govfaq-search.ts";

export const ANSWER_URL = "/api/govfaq/answer";
export const ANSWER_TIMEOUT = 25000;
// How many of the found FAQs the answer is written from.
export const GIVEN = 4;

// The first `limit` of the ranked FAQs, each question once (the same question is in several fields).
export function candidates(index: Index, ranked: { doc: number }[], limit = GIVEN): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const { doc } of ranked) {
    const item = index.items[doc];
    if (seen.has(item.question)) continue;
    seen.add(item.question);
    out.push(item);
    if (out.length === limit) break;
  }
  return out;
}

export async function askAnswer(question: string, ids: string[], fetchImpl: typeof fetch = fetch, timeout = ANSWER_TIMEOUT): Promise<{ answer: string; used: string[] } | null> {
  if (ids.length === 0) return null;
  try {
    const response = await fetchImpl(ANSWER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: question, ids }), signal: AbortSignal.timeout(timeout) });
    if (!response.ok) return null;
    const body = (await response.json()) as { answer?: unknown; used?: unknown };
    if (typeof body.answer !== "string" || !body.answer.trim() || !Array.isArray(body.used)) return null;
    const used = body.used.filter((id): id is string => typeof id === "string" && ids.includes(id));
    return used.length > 0 ? { answer: body.answer, used } : null;
  } catch { return null; }
}

// The answer without the [id] marks the model puts after the sentences (the FAQs they name are shown under it).
export const withoutMarks = (answer: string): string => answer.replace(/[ \t]*\[[^\[\]\s]{1,24}\]/g, "").replace(/[ \t]+\n/g, "\n").trim();
