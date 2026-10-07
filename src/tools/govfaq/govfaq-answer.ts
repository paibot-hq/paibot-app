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

const NO_ANSWER = "FAQ_NO_ANSWER";

// The text to show for what has been written so far: nothing while it could still turn out to be the "no answer" word, and without the [id] marks
// (a mark still being written is left off too).
export function partialText(written: string): string | null {
  const text = written.trim();
  if (NO_ANSWER.startsWith(text)) return null;
  return withoutMarks(written.replace(/[ \t]*\[[^\]\n]{0,24}$/, ""));
}

// Asks for an answer and reads it as it comes: `onText` gets the text to show each time more of it has been written. At the end it gives the whole
// answer and the FAQs to show under it, or null when there is none. (A reply that is not a stream, one JSON object, is read the same way.)
export async function askAnswer(question: string, ids: string[], onText: (text: string) => void = () => {}, fetchImpl: typeof fetch = fetch, timeout = ANSWER_TIMEOUT): Promise<{ answer: string; used: string[] } | null> {
  if (ids.length === 0) return null;
  const finish = (answer: unknown, used: unknown) => {
    if (typeof answer !== "string" || !answer.trim() || !Array.isArray(used)) return null;
    const kept = used.filter((id): id is string => typeof id === "string" && ids.includes(id));
    return kept.length > 0 ? { answer, used: kept } : null;
  };
  try {
    const response = await fetchImpl(ANSWER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: question, ids }), signal: AbortSignal.timeout(timeout) });
    if (!response.ok) return null;
    if (!response.body || (response.headers.get("content-type") ?? "").includes("application/json")) {
      const body = (await response.json()) as { answer?: unknown; used?: unknown };
      return finish(body.answer, body.used);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", written = "", last: { answer?: unknown; used?: unknown } | null = null;
    const line = (text: string) => {
      if (!text.trim()) return;
      const event = JSON.parse(text) as { t?: unknown; done?: unknown; answer?: unknown; used?: unknown };
      if (typeof event.t === "string") {
        written += event.t;
        const shown = partialText(written);
        if (shown) onText(shown);
      } else if (event.done === true) last = event;
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      parts.forEach(line);
    }
    line(buffer);
    // Without the last line (cut short), what was written is the answer, with the FAQs it was given.
    return last ? finish((last as { answer?: unknown }).answer, (last as { used?: unknown }).used) : finish(written, ids);
  } catch { return null; }
}

// The answer without the [id] marks the model puts after the sentences (the FAQs they name are shown under it).
export const withoutMarks = (answer: string): string => answer.replace(/[ \t]*\[[^\[\]\s]{1,24}\]/g, "").replace(/[ \t]+\n/g, "\n").trim();
