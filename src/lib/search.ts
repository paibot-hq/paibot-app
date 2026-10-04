// The search on the top page: what is searched, and how a query is matched and ranked. Pure functions, so they run in a
// test without a browser.

export type EntryKind = "app" | "unit" | "item";
export type Entry = { key: string; kind: EntryKind; href: string; title: string; text: string; keywords: string; context: string };

// Text as it is compared: full-width and half-width forms alike (NFKC), lower case, and katakana as hiragana (so
// "ポモドーロ" is found by "ぽもどーろ").
export function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

export function tokens(query: string): string[] {
  return normalize(query).split(/[\s　]+/).filter(Boolean);
}

const KIND_ORDER: Record<EntryKind, number> = { app: 0, unit: 1, item: 2 };

type Prepared = { entry: Entry; title: string; keywords: string; context: string; text: string; index: number };

export function prepare(entries: readonly Entry[]): Prepared[] {
  return entries.map((entry, index) => ({ entry, title: normalize(entry.title), keywords: normalize(entry.keywords), context: normalize(entry.context), text: normalize(entry.text), index }));
}

// Every word of the query must be somewhere in the entry. A word in the title counts most (more at its start), then in
// the keywords or the group the entry belongs to, then in the description. Best first; apps, then units, then items.
export function search(prepared: readonly Prepared[], query: string, limit = 30): Entry[] {
  const words = tokens(query);
  if (!words.length) return [];
  const scored: { entry: Entry; score: number; index: number }[] = [];
  for (const item of prepared) {
    let score = 0;
    let all = true;
    for (const word of words) {
      const at = item.title.indexOf(word);
      if (at >= 0) score += 10 + (at === 0 ? 5 : 0);
      else if (item.keywords.includes(word) || item.context.includes(word)) score += 4;
      else if (item.text.includes(word)) score += 1;
      else { all = false; break; }
    }
    if (all) scored.push({ entry: item.entry, score, index: item.index });
  }
  scored.sort((a, b) => b.score - a.score || KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] || a.index - b.index);
  return scored.slice(0, limit).map(result => result.entry);
}
