// The puzzles of the IQ test: 3 x 3 matrices of figures in the manner of Raven's progressive matrices, made anew by a
// program each time (no published test's items are used). Pure functions, so they are tested without a browser.
//
// A figure has four attributes: its shape, how many there are, their size and their fill. Along each row every
// attribute follows a rule: the same throughout, a step up or down from one figure to the next, three values taking
// turns (each row the same three, moved along), or, for the count only, the third being the sum of the first two.
// The bottom right figure is missing; the eight choices are the answer with three of its attributes each either kept
// or changed (2 x 2 x 2), so every value of those attributes is in exactly half of the choices: comparing the choices
// alone (a known shortcut with such tests) says nothing about which is right.

export type Attribute = "shape" | "count" | "size" | "fill";
export const ATTRIBUTES: readonly Attribute[] = ["shape", "count", "size", "fill"];
// How many values each attribute has (shape: triangle, square, pentagon, hexagon, circle; count: 1-4; size: 3 steps;
// fill: white to black in 5 steps). Values are 0-based.
export const VALUES: Record<Attribute, number> = { shape: 5, count: 4, size: 3, fill: 5 };

export type Figure = Record<Attribute, number>;
export type Rule = { kind: "constant"; value: number } | { kind: "progression"; step: number; starts: number[] } | { kind: "distribute"; values: number[]; shift: number } | { kind: "sum" ; firsts: number[][] };
export type Puzzle = { cells: Figure[]; choices: Figure[]; answer: number; rules: Record<Attribute, Rule>; level: number };

// A small, fast pseudo-random generator (mulberry32): the same seed gives the same test.
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (next: () => number, n: number) => Math.floor(next() * n);
const pick = <T>(next: () => number, items: readonly T[]) => items[int(next, items.length)];
function shuffled<T>(next: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = int(next, i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export const QUESTIONS = 16;
// How many attributes change along the rows in each question: the test gets harder as it goes.
export const LEVELS = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4];

// A rule for an attribute that changes along the rows (or stays the same, when `changes` is false).
function makeRule(next: () => number, attribute: Attribute, changes: boolean): Rule {
  const n = VALUES[attribute];
  if (!changes) return { kind: "constant", value: int(next, n) };
  const kinds: Rule["kind"][] = attribute === "count" ? ["progression", "distribute", "sum"] : ["progression", "distribute"];
  const kind = pick(next, kinds);
  if (kind === "progression") {
    const step = next() < 0.5 ? 1 : -1;
    // Each row starts where its three values fit: v, v + step, v + 2 * step all within 0 .. n - 1.
    const starts = Array.from({ length: 3 }, () => (step > 0 ? int(next, n - 2) : 2 + int(next, n - 2)));
    // Two rows alike and a third not would read just as well as "the same three values in every row", with another
    // answer: so when the first two are alike, so is the third.
    if (starts[0] === starts[1]) starts[2] = starts[0];
    return { kind, step, starts };
  }
  if (kind === "distribute") return { kind, values: shuffled(next, Array.from({ length: n }, (_, i) => i)).slice(0, 3), shift: next() < 0.5 ? 1 : 2 };
  // sum: counts are 0-based (0 is one figure), so the third has first + second + 1 figures, at most four.
  const firsts = Array.from({ length: 3 }, () => { const a = int(next, 2); const b = int(next, 2 - a); return [a, b]; });
  return { kind: "sum", firsts };
}

// The value of an attribute in row `r`, column `c`.
export function valueAt(rule: Rule, r: number, c: number): number {
  if (rule.kind === "constant") return rule.value;
  if (rule.kind === "progression") return rule.starts[r] + rule.step * c;
  if (rule.kind === "distribute") return rule.values[(c + r * rule.shift) % 3];
  const [a, b] = rule.firsts[r];
  return c === 0 ? a : c === 1 ? b : a + b + 1;
}

// Every value the bottom right could take, for one attribute, under any of the rules that both full rows obey (as a
// reader would find them, from the first two rows and the first two figures of the third).
export function readings(cells: readonly Figure[], attribute: Attribute): Set<number> {
  const v = cells.map(cell => cell[attribute]);
  const [r0, r1] = [v.slice(0, 3), v.slice(3, 6)];
  const [a, b] = [v[6], v[7]];
  const out = new Set<number>();
  if (v.slice(0, 8).every(x => x === v[0])) out.add(v[0]);
  const step = r0[1] - r0[0];
  if (step !== 0 && [r0, r1].every(r => r[1] - r[0] === step && r[2] - r[1] === step) && b - a === step) out.add(b + step);
  const same = (x: number[], y: number[]) => [...x].sort().join() === [...y].sort().join();
  if (new Set(r0).size === 3 && same(r0, r1) && a !== b && r0.includes(a) && r0.includes(b)) out.add(r0.find(x => x !== a && x !== b)!);
  if (attribute === "count" && [r0, r1].every(r => r[2] === r[0] + r[1] + 1)) out.add(a + b + 1);
  return out;
}

// A puzzle of the given level (1-4 changing attributes), from a seed. One whose figures could be read two ways (two
// rules fitting the rows with different answers) is made again.
export function makePuzzle(seed: number, level: number): Puzzle {
  const next = random(seed);
  const changing = new Set(shuffled(next, ATTRIBUTES).slice(0, Math.max(1, Math.min(4, level))));
  let rules: Record<Attribute, Rule>, cells: Figure[];
  do {
    rules = Object.fromEntries(ATTRIBUTES.map(a => [a, makeRule(next, a, changing.has(a))])) as Record<Attribute, Rule>;
    cells = Array.from({ length: 9 }, (_, i) => Object.fromEntries(ATTRIBUTES.map(a => [a, valueAt(rules[a], Math.floor(i / 3), i % 3)])) as Figure);
  } while (ATTRIBUTES.some(a => readings(cells, a).size !== 1));
  const correct = cells[8];
  // Three attributes to vary among the choices, the changing ones first; for each, one other value.
  const varied = [...shuffled(next, [...changing]), ...shuffled(next, ATTRIBUTES.filter(a => !changing.has(a)))].slice(0, 3);
  const others = varied.map(a => { const n = VALUES[a]; return (correct[a] + 1 + int(next, n - 1)) % n; });
  const combos = Array.from({ length: 8 }, (_, mask) => ({ ...correct, ...Object.fromEntries(varied.flatMap((a, i) => (mask & (1 << i) ? [[a, others[i]]] : []))) }) as Figure);
  const choices = shuffled(next, combos);
  return { cells, choices, answer: choices.findIndex(f => ATTRIBUTES.every(a => f[a] === correct[a])), rules, level };
}

// A whole test: QUESTIONS puzzles, getting harder.
export const makeTest = (seed: number) => LEVELS.map((level, i) => makePuzzle(Math.imul(seed ^ 0x5bd1e995, i + 1) >>> 0, level));

// ---- Scores among everyone's ----

export const TIME_LIMIT_S = 10 * 60;
export const isKeptResult = (score: unknown, seconds: unknown): boolean =>
  Number.isInteger(score) && (score as number) >= 0 && (score as number) <= QUESTIONS && Number.isInteger(seconds) && (seconds as number) > 0 && (seconds as number) <= TIME_LIMIT_S + 5;

export type Distribution = { counts: number[]; total: number };
export function distributionFrom(rows: readonly { score: number; count: number }[]): Distribution {
  const counts = Array<number>(QUESTIONS + 1).fill(0);
  for (const { score, count } of rows) if (score >= 0 && score <= QUESTIONS) counts[Math.floor(score)] += Number(count);
  return { counts, total: counts.reduce((a, b) => a + b, 0) };
}

// Where a score stands among everyone's (this one included): `better` scored more, `same` the same. The share below it,
// counting half of the ties (the mid-rank), placed on the normal curve of IQ (mean 100, standard deviation 15).
export function standing(better: number, same: number, total: number) {
  const n = Math.max(1, total);
  const below = Math.max(0, n - better - same);
  const p = Math.min(1 - 0.5 / n, Math.max(0.5 / n, (below + same / 2) / n));
  const iq = Math.round(Math.min(160, Math.max(40, 100 + 15 * probit(p))));
  return { iq, top: Math.min(99, Math.max(1, Math.round((1 - p) * 100))) };
}

// The inverse of the standard normal distribution (Acklam's rational approximation, good to about 1e-9).
export function probit(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - low) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
