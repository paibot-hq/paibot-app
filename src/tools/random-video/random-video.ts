// Random videos from Wikidata: items with a YouTube video ID (property P1651), about 89,000 of them in October 2026 (singles,
// films, songs, episodes, games, talks ...). A batch is fifty of them from a random place in the list, with the item's name
// and description in the page's language. Pure functions, so they are tested without a browser.

export const ENDPOINT = "https://query.wikidata.org/sparql";
export const BATCH = 50;
// A little under the number of IDs, so a batch from anywhere below it is full; the list only grows.
export const KNOWN = 85000;

export type Video = { id: string; item: string; title: string; description: string };

// A YouTube video ID: eleven of A-Z, a-z, 0-9, "-" and "_".
export const isVideoId = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id);

const LANGUAGES: Record<string, string> = { ja: "ja,en,mul", en: "en,mul", zh: "zh,en,mul" };

export const randomOffset = (next: () => number) => Math.floor(next() * (KNOWN - BATCH));

// The query for a batch starting at `offset`, with names in the page's language (or English, or the item's own).
export function batchQuery(offset: number, locale: string) {
  const languages = LANGUAGES[locale] ?? LANGUAGES.en;
  return `SELECT ?item ?id ?itemLabel ?itemDescription WHERE {
  { SELECT ?item ?id WHERE { ?item wdt:P1651 ?id } OFFSET ${Math.max(0, Math.floor(offset))} LIMIT ${BATCH} }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
}`;
}

export const batchUrl = (offset: number, locale: string) => `${ENDPOINT}?format=json&query=${encodeURIComponent(batchQuery(offset, locale))}`;

type Binding = Record<string, { value: string } | undefined>;

// The videos of an answer, each ID once and only well-formed ones. An item with no name in any language shows its Q-number.
export function parseBatch(answer: unknown): Video[] {
  const bindings = (answer as { results?: { bindings?: Binding[] } })?.results?.bindings ?? [];
  const seen = new Set<string>();
  const videos: Video[] = [];
  for (const b of bindings) {
    const id = b.id?.value ?? "";
    const item = (b.item?.value ?? "").split("/").pop() ?? "";
    if (!isVideoId(id) || !/^Q\d+$/.test(item) || seen.has(id)) continue;
    seen.add(id);
    videos.push({ id, item, title: b.itemLabel?.value || item, description: b.itemDescription?.value ?? "" });
  }
  return videos;
}

// The batch in a random order, so two people starting at the same place do not see the same order.
export function shuffle<T>(items: readonly T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// YouTube player errors that mean "this one cannot be played here" (bad ID, removed or private, embedding not allowed):
// the page goes on to the next video.
export const SKIPPED_ERRORS = new Set([2, 5, 100, 101, 150]);

// A keyword narrows the videos to the items Wikidata's search finds for it (in names, descriptions and aliases, in any
// language), among those with a YouTube video ID: up to SEARCH_LIMIT of them, all fetched at once.
export const SEARCH_LIMIT = 500;
export const MAX_KEYWORD = 60;

// The keyword as typed, tidied: one line, spaces collapsed, at most MAX_KEYWORD characters.
export const tidyKeyword = (keyword: string) => keyword.replace(/\s+/g, " ").trim().slice(0, MAX_KEYWORD);

// A string inside the query's double quotes: backslashes and quotes escaped, so a keyword cannot end the string.
const sparqlString = (text: string) => text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export function searchQuery(keyword: string, locale: string) {
  const languages = LANGUAGES[locale] ?? LANGUAGES.en;
  return `SELECT ?item ?id ?itemLabel ?itemDescription WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "Search"; wikibase:limit ${SEARCH_LIMIT};
      mwapi:srsearch "haswbstatement:P1651 ${sparqlString(tidyKeyword(keyword))}"; mwapi:srlimit "max".
    ?item wikibase:apiOutputItem mwapi:title.
  }
  ?item wdt:P1651 ?id .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${languages}". }
}`;
}

export const searchUrl = (keyword: string, locale: string) => `${ENDPOINT}?format=json&query=${encodeURIComponent(searchQuery(keyword, locale))}`;
