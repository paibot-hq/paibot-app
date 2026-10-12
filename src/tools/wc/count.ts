// How the character count tool counts. A "character" is what a person sees as one (an extended grapheme
// cluster): a flag, a family emoji, or "か" plus a dakuten each count as 1, not 2 or 5 as they would by code point.

export type TextStats = {
  // Characters as seen (grapheme clusters).
  characters: number;
  // The same, without whitespace (spaces, the ideographic space, tabs, line breaks).
  withoutSpaces: number;
  // For developers: what other counts would say about the same text.
  codePoints: number;
  utf16: number;
  utf8: number;
};

// Intl.Segmenter is in every current browser and in Workers; where it is missing the count falls back to code points.
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const blank = /^\s+$/u;
const encoder = new TextEncoder();

export function countText(text: string): TextStats {
  const pieces = segmenter ? [...segmenter.segment(text)].map(part => part.segment) : [...text];
  return {
    characters: pieces.length,
    withoutSpaces: pieces.filter(piece => !blank.test(piece)).length,
    codePoints: [...text].length,
    utf16: text.length,
    utf8: encoder.encode(text).length,
  };
}

// The limit box holds a string; only a whole number of 1 or more is a limit.
export function parseLimit(value: string): number | null {
  if (!/^\d{1,9}$/.test(value.trim())) return null;
  const limit = Number(value.trim());
  return limit >= 1 ? limit : null;
}

export type LimitStatus = { state: "none" | "left" | "reached" | "over"; amount: number };

export function limitStatus(count: number, limit: number | null): LimitStatus {
  if (limit === null) return { state: "none", amount: 0 };
  if (count < limit) return { state: "left", amount: limit - count };
  if (count === limit) return { state: "reached", amount: 0 };
  return { state: "over", amount: count - limit };
}
