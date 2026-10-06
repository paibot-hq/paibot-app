// Searching the FAQ in the browser: the text is cut into pairs of characters (Japanese has no spaces to cut at), and the questions that share the
// most of the query's pairs, rare ones counting for more (BM25), come first. A few words with the same meaning are treated as one ("なくした" for
// "紛失"). Pure functions, tested without a browser. The questions and answers are from the Ministry of Internal Affairs and Communications' FAQ
// file (see scripts/faq-build.mjs).

export type Item = { id: string; category: number; question: string; answer: string };
export type Faq = {
  source: { name: string; page: string; file: string; updated: string };
  categories: string[];
  items: [string, number, string, string][];
};

export const toItems = (faq: Faq): Item[] => faq.items.map(([id, category, question, answer]) => ({ id, category, question, answer }));

// Text for matching: width, case and kana folded (full-width to half-width, capitals to small letters, katakana to hiragana), one character for
// one, so that a position in the folded text is a position in the original.
export function fold(text: string): string {
  let out = "";
  for (const char of text) {
    let c = char.normalize("NFKC");
    if ([...c].length !== 1) c = char;
    const code = c.codePointAt(0) as number;
    out += code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : c.toLowerCase();
  }
  return out;
}

const WORD = /[\p{L}\p{N}\p{M}ー]/u;
const ASCII = /[a-z0-9]/;
const HIRAGANA = /[\u3041-\u309f]/;
// Hiragana that join words (the particles): a pair of characters that has one next to a kanji or katakana is the join, not a word.
const PARTICLES = new Set([..."はがをにのでともへや"]);

// The terms of a text: letters and digits as whole words ("qr"), everything else as pairs of neighbouring characters (a lone character stands for
// itself), over runs of word characters. A pair is left out when it is a particle next to something that is not hiragana (年金|の, の|手続).
export function terms(text: string): string[] {
  const out: string[] = [];
  const chars: string[] = [], hira: boolean[] = [];
  for (const original of text) {
    chars.push(fold(original));
    hira.push(HIRAGANA.test(original));
  }
  let i = 0;
  while (i < chars.length) {
    if (!WORD.test(chars[i])) { i++; continue; }
    let j = i;
    while (j < chars.length && WORD.test(chars[j])) j++;
    let k = i;
    while (k < j) {
      if (ASCII.test(chars[k])) {
        let e = k;
        while (e < j && ASCII.test(chars[e])) e++;
        out.push(chars.slice(k, e).join(""));
        k = e;
      } else {
        let e = k;
        while (e < j && !ASCII.test(chars[e])) e++;
        if (e - k === 1) out.push(chars[k]);
        else {
          for (let p = k; p < e - 1; p++) {
            const joinsLeft = PARTICLES.has(chars[p]) && hira[p] && !hira[p + 1];
            const joinsRight = PARTICLES.has(chars[p + 1]) && hira[p + 1] && !hira[p];
            if (!joinsLeft && !joinsRight) out.push(chars[p] + chars[p + 1]);
          }
        }
        k = e;
      }
    }
    i = j;
  }
  return out;
}

// Words that mean the same in the FAQ, folded like the text. A query with one of them also looks for the others, with less weight.
export const SYNONYMS: string[][] = [
  ["なくし", "無くし", "失くし", "紛失", "落とし", "盗難"],
  ["引っ越", "引越", "転居", "転入", "転出"],
  ["遺失物", "落とし物", "落し物", "忘れ物"],
  ["結婚", "婚姻"],
  ["出産", "出生"],
  ["すまほ", "スマホ", "スマートフォン"],
  ["免許", "運転免許"],
  ["もらえ", "受給", "支給", "受け取"],
  ["やめ", "解約", "廃止", "脱退"],
  ["申し込", "申込", "申請"],
  ["届け出", "届出"],
  ["再発行", "再交付", "再作成"],
  ["税金", "租税"],
  ["お金", "給付", "手当"],
  ["こども", "子ども", "子供"],
  ["お年寄", "高齢者", "老人"],
  ["相談", "問い合わせ", "問合せ"],
  ["暗証番号", "パスワード"],
].map(group => group.map(fold));

export type Index = {
  items: Item[];
  folded: string[];                       // each question, folded (to find a phrase and to mark it)
  categories: string[];
  postings: Map<string, { docs: number[]; weight: number[] }>;
  length: number[];
  average: number;
};

const QUESTION_WEIGHT = 3, CATEGORY_WEIGHT = 2;

export function buildIndex(items: Item[], categories: string[]): Index {
  const postings = new Map<string, { docs: number[]; weight: number[] }>();
  const length: number[] = [];
  const folded: string[] = [];
  items.forEach((item, doc) => {
    folded.push(fold(item.question));
    const counts = new Map<string, number>();
    const add = (text: string, weight: number) => { for (const t of terms(text)) counts.set(t, (counts.get(t) ?? 0) + weight); };
    add(item.question, QUESTION_WEIGHT);
    add(categories[item.category] ?? "", CATEGORY_WEIGHT);
    add(item.answer.replace(/<([^<>,]+),https?:\/\/[^<>]+>/g, "$1"), 1);
    let total = 0;
    for (const [term, weight] of counts) {
      let list = postings.get(term);
      if (!list) { list = { docs: [], weight: [] }; postings.set(term, list); }
      list.docs.push(doc);
      list.weight.push(weight);
      total += weight;
    }
    length.push(total);
  });
  return { items, folded, categories, postings, length, average: length.reduce((a, b) => a + b, 0) / Math.max(1, length.length) };
}

export type Hit = { doc: number; score: number; coverage: number };
const K1 = 1.2, B = 0.75;
// A result needs to share this much (by the weight of the terms) of what was asked.
export const MIN_COVERAGE = 0.4;
// And the weight of its terms must come to this much.
export const MIN_CLUE = 0.9;

// The query's terms with their weights: its own terms at 1 (a pair of plain hiragana, which any sentence has, at 0.35), and those of the words
// that mean the same at SYNONYM_WEIGHT.
export const SYNONYM_WEIGHT = 0.6;
export function queryTerms(query: string): Map<string, number> {
  const folded = fold(query);
  const out = new Map<string, number>();
  for (const t of terms(query)) out.set(t, /^[\u3041-\u309f]{2}$/.test(t) ? 0.35 : 1);
  for (const group of SYNONYMS) {
    const present = group.find(word => folded.includes(word));
    if (!present) continue;
    for (const other of group) if (other !== present) for (const t of terms(other)) if (!out.has(t)) out.set(t, SYNONYM_WEIGHT);
  }
  return out;
}

// The best matches for a query, best first: those with the terms of the query in the question and the answer, optionally within one category.
export function search(index: Index, query: string, options: { category?: number | null; limit?: number } = {}): Hit[] {
  const wanted = queryTerms(query);
  // A query of only a pair or two of plain hiragana ("いつ", "とは") says too little to find anything.
  if ([...wanted.values()].reduce((a, b) => a + b, 0) < MIN_CLUE) return [];
  const n = index.items.length;
  const scores = new Map<number, { score: number; matched: number }>();
  let possible = 0;
  for (const [term, weight] of wanted) {
    const list = index.postings.get(term);
    // A term of the query that is nowhere in the FAQ is asked for and not met: it counts as much as the rarest one (a synonym that is missing is no loss).
    if (!list) { if (weight !== SYNONYM_WEIGHT) possible += Math.log(1 + (n + 0.5) / 0.5) * weight; continue; }
    const idf = Math.log(1 + (n - list.docs.length + 0.5) / (list.docs.length + 0.5));
    possible += idf * weight;
    list.docs.forEach((doc, i) => {
      if (options.category != null && index.items[doc].category !== options.category) return;
      const tf = list.weight[i];
      const part = idf * weight * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * index.length[doc]) / index.average)));
      const entry = scores.get(doc) ?? { score: 0, matched: 0 };
      entry.score += part;
      entry.matched += idf * weight;
      scores.set(doc, entry);
    });
  }
  if (possible === 0) return [];
  // The whole of the asked phrase in a question is worth more.
  const phrase = [...fold(query)].filter(c => WORD.test(c)).join("");
  const hits: Hit[] = [];
  for (const [doc, { score, matched }] of scores) {
    const coverage = matched / possible;
    if (coverage < MIN_COVERAGE) continue;
    let s = score * (0.5 + coverage);
    if (phrase.length >= 2 && [...index.folded[doc]].filter(c => WORD.test(c)).join("").includes(phrase)) s *= 1.6;
    hits.push({ doc, score: s, coverage });
  }
  hits.sort((a, b) => b.score - a.score || a.doc - b.doc);
  // Of the best of them, those whose question itself has more of what was asked, rather than only the answer, come first.
  const best = hits.slice(0, 200);
  const idfOf = (term: string) => { const list = index.postings.get(term); return list ? Math.log(1 + (n - list.docs.length + 0.5) / (list.docs.length + 0.5)) : 0; };
  for (const hit of best) {
    const inQuestion = new Set(terms(index.items[hit.doc].question));
    let met = 0;
    for (const [term, weight] of wanted) if (inQuestion.has(term)) met += idfOf(term) * weight;
    hit.score *= 0.8 + 0.6 * Math.min(1, met / possible);
  }
  best.sort((a, b) => b.score - a.score || a.doc - b.doc);
  return best.slice(0, options.limit ?? 50);
}

// The parts of a text that share a pair of characters with the query, as [start, end) ranges in the text (for marking).
export function highlight(text: string, query: string): [number, number][] {
  const pairs = new Set([...queryTerms(query).keys()].filter(t => [...t].length === 2));
  const chars = [...fold(text)];
  const ranges: [number, number][] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    if (!pairs.has(chars[i] + chars[i + 1])) continue;
    const last = ranges[ranges.length - 1];
    if (last && i <= last[1]) last[1] = i + 2; else ranges.push([i, i + 2]);
  }
  return ranges;
}

// An answer as parts: text, and the links the file writes as <label,address> (only http and https ones are kept as links).
export type Part = { text: string } | { label: string; url: string };
export function parseAnswer(answer: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of answer.matchAll(/<([^<>,]+),(https?:\/\/[^<>\s]+)>/g)) {
    if (m.index > last) parts.push({ text: answer.slice(last, m.index) });
    parts.push({ label: m[1].trim(), url: m[2] });
    last = m.index + m[0].length;
  }
  if (last < answer.length) parts.push({ text: answer.slice(last) });
  return parts;
}

// The first part of an answer as plain text (links by their labels), cut to `length` characters.
export function snippet(answer: string, length = 110): string {
  const plain = parseAnswer(answer).map(p => ("text" in p ? p.text : p.label)).join("").replace(/\s+/g, " ").replace(/※これから先は、外部のサイトに移動します。/g, "").trim();
  const chars = [...plain];
  return chars.length > length ? `${chars.slice(0, length).join("")}…` : plain;
}

// How many questions each category has, the biggest first.
export function categoryCounts(items: Item[], categories: string[]): { category: number; name: string; count: number }[] {
  const counts = new Map<number, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return [...counts].map(([category, count]) => ({ category, name: categories[category] ?? "", count })).sort((a, b) => b.count - a.count || a.category - b.category);
}
