// The search on the top page: what is searched, and how a query is matched and ranked. Pure functions, so they run in a
// test without a browser. Folding, romaji and typo distance come from sagasu (@paibot/sagasu, our own package).
import { normalize as fold, romajiToHiragana, editDistance } from "@paibot/sagasu";

export type EntryKind = "app" | "unit" | "item";
export type Entry = { key: string; kind: EntryKind; href: string; title: string; text: string; keywords: string; context: string };

// Text as it is compared: full-width and half-width forms alike (NFKC), lower case, katakana as hiragana, and without
// the long vowel mark, so "ポモドーロ" is found by "ぽもどろ" and, as romaji, by "pomodoro".
export function normalize(text: string): string {
  return fold(text);
}

export function tokens(query: string): string[] {
  return normalize(query).split(/[\s　]+/).filter(Boolean);
}

const KIND_ORDER: Record<EntryKind, number> = { app: 0, unit: 1, item: 2 };
const LATIN_WORD = /[a-z0-9]+/g;

type Fields = { title: string; keywords: string; context: string; text: string };
type Prepared = Fields & { entry: Entry; index: number; words: { title: string[]; keywords: string[]; context: string[]; text: string[] } };

export function prepare(entries: readonly Entry[]): Prepared[] {
  return entries.map((entry, index) => {
    const fields = { title: normalize(entry.title), keywords: normalize(entry.keywords), context: normalize(entry.context), text: normalize(entry.text) };
    const words = { title: fields.title.match(LATIN_WORD) ?? [], keywords: fields.keywords.match(LATIN_WORD) ?? [], context: fields.context.match(LATIN_WORD) ?? [], text: fields.text.match(LATIN_WORD) ?? [] };
    return { entry, index, ...fields, words };
  });
}

// How one word of the query is looked for. As typed first; only a word that nothing has as typed is tried as romaji
// ("omikuji" → "おみくじ") and then with a typo ("jsno" → "json"), so an English word that is there stays exact.
type Matcher = { alts: string[]; fuzzy: number };

function matches(item: Prepared, field: keyof Fields, m: Matcher): number {
  const value = item[field];
  for (const alt of m.alts) {
    const at = value.indexOf(alt);
    if (at >= 0) return at;
  }
  if (m.fuzzy && item.words[field].some(word => editDistance(word, m.alts[0], m.fuzzy) <= m.fuzzy)) return Number.MAX_SAFE_INTEGER;
  return -1;
}

const found = (prepared: readonly Prepared[], m: Matcher) =>
  prepared.some(item => matches(item, "title", m) >= 0 || matches(item, "keywords", m) >= 0 || matches(item, "context", m) >= 0 || matches(item, "text", m) >= 0);

function matcher(prepared: readonly Prepared[], word: string): Matcher {
  const m: Matcher = { alts: [word], fuzzy: 0 };
  if (found(prepared, m) || !/^[a-z'-]+$/.test(word)) return m;
  const kana = romajiToHiragana(word);
  // two kana ("name" → なめ) are in too many words (なめらか) to be worth guessing
  if (kana && [...kana].length >= 3) {
    m.alts.push(kana);
    if (found(prepared, m)) return m;
  }
  if (word.length >= 4) m.fuzzy = word.length >= 8 ? 2 : 1;
  return m;
}

// Every word of the query must be somewhere in the entry. A word in the title counts most (more at its start), then in
// the keywords or the group the entry belongs to, then in the description. Best first; apps, then units, then items.
export function search(prepared: readonly Prepared[], query: string, limit = 30): Entry[] {
  const words = tokens(query);
  if (!words.length) return [];
  const matchers = words.map(word => matcher(prepared, word));
  const scored: { entry: Entry; score: number; index: number }[] = [];
  for (const item of prepared) {
    let score = 0;
    let all = true;
    for (const m of matchers) {
      const at = matches(item, "title", m);
      if (at >= 0) score += 10 + (at === 0 ? 5 : 0);
      else if (matches(item, "keywords", m) >= 0 || matches(item, "context", m) >= 0) score += 4;
      else if (matches(item, "text", m) >= 0) score += 1;
      else { all = false; break; }
    }
    if (all) scored.push({ entry: item.entry, score, index: item.index });
  }
  scored.sort((a, b) => b.score - a.score || KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] || a.index - b.index);
  return scored.slice(0, limit).map(result => result.entry);
}
