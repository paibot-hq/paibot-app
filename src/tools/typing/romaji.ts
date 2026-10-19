// Typing Japanese words in romaji: what may be typed for a word in kana, checked a key at a time. The same sound can be
// typed several ways (し: si, shi, ci), a small っ doubles the next consonant (かっぱ: kappa), ん is n or nn depending on
// what follows, and a sound like きゃ is kya, kilya or kixya; any way that is right is accepted. Pure functions, so they
// are tested without a browser.

// The ways to type each sound, by the kana it is written with (longest sounds first when reading a word: きゃ before き).
const TABLE: Record<string, string[]> = {
  あ: ["a"], い: ["i", "yi"], う: ["u", "wu"], え: ["e"], お: ["o"],
  か: ["ka", "ca"], き: ["ki"], く: ["ku", "cu", "qu"], け: ["ke"], こ: ["ko", "co"],
  さ: ["sa"], し: ["si", "shi", "ci"], す: ["su"], せ: ["se", "ce"], そ: ["so"],
  た: ["ta"], ち: ["ti", "chi"], つ: ["tu", "tsu"], て: ["te"], と: ["to"],
  な: ["na"], に: ["ni"], ぬ: ["nu"], ね: ["ne"], の: ["no"],
  は: ["ha"], ひ: ["hi"], ふ: ["hu", "fu"], へ: ["he"], ほ: ["ho"],
  ま: ["ma"], み: ["mi"], む: ["mu"], め: ["me"], も: ["mo"],
  や: ["ya"], ゆ: ["yu"], よ: ["yo"],
  ら: ["ra"], り: ["ri"], る: ["ru"], れ: ["re"], ろ: ["ro"],
  わ: ["wa"], を: ["wo"],
  が: ["ga"], ぎ: ["gi"], ぐ: ["gu"], げ: ["ge"], ご: ["go"],
  ざ: ["za"], じ: ["zi", "ji"], ず: ["zu"], ぜ: ["ze"], ぞ: ["zo"],
  だ: ["da"], ぢ: ["di"], づ: ["du"], で: ["de"], ど: ["do"],
  ば: ["ba"], び: ["bi"], ぶ: ["bu"], べ: ["be"], ぼ: ["bo"],
  ぱ: ["pa"], ぴ: ["pi"], ぷ: ["pu"], ぺ: ["pe"], ぽ: ["po"],
  ゔ: ["vu"],
  ぁ: ["la", "xa"], ぃ: ["li", "xi"], ぅ: ["lu", "xu"], ぇ: ["le", "xe"], ぉ: ["lo", "xo"],
  ゃ: ["lya", "xya"], ゅ: ["lyu", "xyu"], ょ: ["lyo", "xyo"], ゎ: ["lwa", "xwa"],
  きゃ: ["kya"], きゅ: ["kyu"], きょ: ["kyo"], ぎゃ: ["gya"], ぎゅ: ["gyu"], ぎょ: ["gyo"],
  しゃ: ["sya", "sha"], しゅ: ["syu", "shu"], しょ: ["syo", "sho"], じゃ: ["zya", "ja", "jya"], じゅ: ["zyu", "ju", "jyu"], じょ: ["zyo", "jo", "jyo"],
  ちゃ: ["tya", "cha", "cya"], ちゅ: ["tyu", "chu", "cyu"], ちょ: ["tyo", "cho", "cyo"],
  にゃ: ["nya"], にゅ: ["nyu"], にょ: ["nyo"], ひゃ: ["hya"], ひゅ: ["hyu"], ひょ: ["hyo"],
  びゃ: ["bya"], びゅ: ["byu"], びょ: ["byo"], ぴゃ: ["pya"], ぴゅ: ["pyu"], ぴょ: ["pyo"],
  みゃ: ["mya"], みゅ: ["myu"], みょ: ["myo"], りゃ: ["rya"], りゅ: ["ryu"], りょ: ["ryo"],
  ふぁ: ["fa"], ふぃ: ["fi"], ふぇ: ["fe"], ふぉ: ["fo"],
  てぃ: ["thi"], でぃ: ["dhi"], うぃ: ["wi"], うぇ: ["we"], ゔぁ: ["va"], ゔぃ: ["vi"], ゔぇ: ["ve"], ゔぉ: ["vo"],
  ー: ["-"], "、": [","], "。": ["."], "?": ["?"], "!": ["!"], " ": [" "],
};
// The sounds with two kana, to read before the single ones.
const PAIRS = Object.keys(TABLE).filter(k => k.length === 2);
// A pair also typed as the first kana and a small one (きゃ: ki + ixya is typed kilya or kixya; the table has it already
// as pairs, and each part is also typed alone), so any way of typing the parts is found by reading them one at a time.

// A pair also typed as its two kana one after the other: きゃ as き + ゃ is ki + lya or ki + xya (kilya, kixya), and ふぁ as
// ふ + ぁ is fu + la (fula) or hu + xa. The ways that are not already the pair's own.
function viaSmall(pair: string): string[] {
  const [first, small] = [pair[0], pair[1]];
  const out: string[] = [];
  for (const a of TABLE[first] ?? []) for (const b of TABLE[small] ?? []) out.push(a + b);
  return out.filter(way => !TABLE[pair].includes(way));
}

// A word in kana as the sounds to type, in order. A small っ, and ん, depend on what follows, so they are marked and
// resolved by `candidates`. Null when the word has a kana that cannot be typed.
export type Unit = { kind: "sound"; options: string[] } | { kind: "tsu" } | { kind: "n" };
export function parse(word: string): Unit[] | null {
  const units: Unit[] = [];
  for (let i = 0; i < word.length; ) {
    const pair = word.slice(i, i + 2);
    if (PAIRS.includes(pair)) { units.push({ kind: "sound", options: [...TABLE[pair], ...viaSmall(pair)] }); i += 2; continue; }
    const one = word[i];
    if (one === "っ") units.push({ kind: "tsu" });
    else if (one === "ん") units.push({ kind: "n" });
    else if (TABLE[one]) units.push({ kind: "sound", options: TABLE[one] });
    else return null;
    i++;
  }
  return units;
}

// Every way a unit can be typed given what follows it (the next unit, or none at the end of the word).
function waysFor(unit: Unit, next: Unit | undefined): string[] {
  if (unit.kind === "sound") return unit.options;
  const following = next && next.kind === "sound" ? next.options : next?.kind === "n" ? ["n"] : next?.kind === "tsu" ? ["l", "x"] : [];
  if (unit.kind === "n") {
    // "n" alone is allowed unless the next sound starts with a vowel, y or n (it would read as na, nya, ...); "nn" and
    // "xn" always are; at the end of a word only "nn" and "xn" (a lone n is not taken as finished).
    const alone = !!next && following.every(w => !/^[aiueoyn]/.test(w) && !/^'/.test(w));
    return [...(alone ? ["n"] : []), "nn", "xn"];
  }
  // っ: the next consonant typed once more (the doubled consonant's first key; the sound itself, with that consonant, is
  // the next unit's: kappa is ka, p, pa), or a small tsu on its own (ltu, xtu); never before a vowel or n.
  const doubled = following.filter(w => /^[b-df-hj-mp-tv-z]/.test(w) && !/^n/.test(w)).map(w => w[0]);
  return [...new Set(doubled)].concat(["ltu", "xtu", "ltsu", "xtsu"]);
}

// The ways to type the word from some unit on, as a list of whole strings would be too many for long words, so typing is
// followed with a set of states instead: (unit index, how much of one of its ways is typed).
type State = { unit: number; way: string; at: number };

// Where typing a word stands: the keys typed so far are accepted if some way of typing the word starts with them. `done`
// is true when the word is finished; `next` are the keys that would be accepted now.
export type Progress = { ok: boolean; done: boolean; typed: string; shown: string; next: string[] };

// The key `ch` typed after `typed` (the keys accepted so far), for a word. Returns the new progress; a wrong key leaves
// `typed` as it was and says ok = false.
export function advance(units: readonly Unit[], typed: string, ch: string): Progress {
  const after = typed + ch;
  const states = statesAfter(units, after);
  if (!states.length) return { ...progressOf(units, typed), ok: false };
  return { ...progressOf(units, after), ok: true };
}

function statesAfter(units: readonly Unit[], typed: string): State[] {
  // Start with the first unit, nothing typed of it; read the keys one at a time, keeping every state that can go on.
  let states: State[] = units.length ? initial(units, 0) : [];
  if (!units.length) return typed ? [] : [{ unit: 0, way: "", at: 0 }];
  for (const key of typed) {
    const nextStates: State[] = [];
    for (const s of states) {
      if (s.unit >= units.length) continue;
      if (s.way[s.at] !== key) continue;
      const at = s.at + 1;
      if (at < s.way.length) nextStates.push({ ...s, at });
      else if (s.unit + 1 >= units.length) nextStates.push({ unit: units.length, way: "", at: 0 });
      else nextStates.push(...initial(units, s.unit + 1));  // this unit is finished: on to the next, whose ways depend on what follows it
    }
    states = dedupe(nextStates);
    if (!states.length) return [];
  }
  return states;
}

const initial = (units: readonly Unit[], index: number): State[] => waysFor(units[index], units[index + 1]).map(way => ({ unit: index, way, at: 0 }));
const dedupe = (states: State[]) => { const seen = new Set<string>(); return states.filter(s => { const k = `${s.unit}|${s.way}|${s.at}`; if (seen.has(k)) return false; seen.add(k); return true; }); };

function progressOf(units: readonly Unit[], typed: string): { done: boolean; typed: string; shown: string; next: string[] } {
  const states = statesAfter(units, typed);
  const done = states.some(s => s.unit >= units.length);
  const next = [...new Set(states.filter(s => s.unit < units.length).map(s => s.way[s.at]))];
  // What to show as the word: the way that is typed so far and the shortest way for the rest.
  return { done, typed, shown: typed + restOf(units, states), next };
}

// The shortest way to finish the word from the states reached (the first of those that are still going).
function restOf(units: readonly Unit[], states: State[]): string {
  let best: string | null = null;
  for (const s of states) {
    if (s.unit >= units.length) return "";
    let rest = s.way.slice(s.at);
    for (let u = s.unit + 1; u < units.length; u++) rest += shortest(units, u);
    if (best === null || rest.length < best.length) best = rest;
  }
  return best ?? "";
}

function shortest(units: readonly Unit[], index: number): string {
  const ways = waysFor(units[index], units[index + 1]);
  return [...ways].sort((a, b) => a.length - b.length || (a < b ? -1 : 1))[0] ?? "";
}

// The way to show for a word before anything is typed: the shortest way, with the keys that would be accepted first.
export function start(units: readonly Unit[]): Progress {
  return { ok: true, ...progressOf(units, "") };
}

// How many keys the shortest way of typing a word takes (what a word is worth: the typed length of the word).
export function keyCount(word: string): number {
  const units = parse(word);
  if (!units) return 0;
  return units.reduce((sum, _, i) => sum + shortest(units, i).length, 0);
}
