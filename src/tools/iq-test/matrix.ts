// The puzzles of the IQ test: 3 x 3 matrices in the manner of Raven's progressive matrices, made anew by a program each
// time (no published test's items are used). Pure functions, so they are tested without a browser.
//
// Four kinds of puzzle (families):
// - figures: a figure's shape, how many there are, their size and their fill;
// - nested: a large outer figure with a small one inside, each with its own shape and fill;
// - lines: lines drawn from a set of eight (the sides of a square, its diagonals and middle lines);
// - dots: dots on a 3 x 3 grid.
// In the first two, each attribute follows a rule along every row: the same throughout, the same along each row (a
// row its own value), a step up or down (by one or two) from one panel to the next, three values taking turns (each
// row the same three, moved along), or, for the count only, the third being the sum of the first two. In the other two
// the third panel of a row is made from the first two (all their lines, the lines both have, or the lines just one
// has), or, for the dots, the pattern moves along one place at a time.
//
// The bottom right panel is missing. The eight choices are the answer with three of its parts (attributes, or lines,
// or dots) each either kept or changed (2 x 2 x 2), so every changed part is in exactly half of the choices: comparing
// the choices alone (a known shortcut with such tests) says nothing about which is right. A puzzle that could be read
// two ways (two rules fitting the rows, with different answers) is made again.

export type Family = "figures" | "nested" | "lines" | "dots";
export const FAMILIES: readonly Family[] = ["figures", "nested", "lines", "dots"];
// A panel: attribute values (figures, nested) or a bit mask of lines or dots ({ mask }).
export type Panel = Record<string, number>;
export type Puzzle = { family: Family; cells: Panel[]; choices: Panel[]; answer: number; level: number; rules: string[] };

type Attr = { name: string; values: number; sum?: boolean };
// How many values each attribute has (shapes: triangle, square, pentagon, hexagon, circle; count: 1-4; size: 3 steps;
// fills: white to black in 5 steps, the outer one only the three lightest, so the inner figure shows). 0-based.
export const SPECS: Record<"figures" | "nested", Attr[]> = {
  figures: [{ name: "shape", values: 5 }, { name: "count", values: 4, sum: true }, { name: "size", values: 3 }, { name: "fill", values: 5 }],
  nested: [{ name: "outer", values: 5 }, { name: "outerFill", values: 3 }, { name: "inner", values: 5 }, { name: "innerFill", values: 5 }],
};
export const BITS: Record<"lines" | "dots", number> = { lines: 8, dots: 9 };

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
const sameSet = (x: readonly number[], y: readonly number[]) => [...x].sort().join() === [...y].sort().join();

// ---- Attribute rules (figures, nested) ----

type Rule =
  | { kind: "constant"; value: number }
  | { kind: "rowConstant"; values: number[] }
  | { kind: "progression"; step: number; starts: number[] }
  | { kind: "distribute"; values: number[]; shift: number }
  | { kind: "sum"; firsts: number[][] };

function makeRule(next: () => number, attr: Attr, changes: boolean): Rule {
  const n = attr.values;
  if (!changes) return { kind: "constant", value: int(next, n) };
  const kinds: Rule["kind"][] = ["progression", "progression", "distribute", "distribute", "rowConstant", ...(attr.sum ? ["sum" as const, "sum" as const] : [])];
  const kind = pick(next, kinds);
  if (kind === "rowConstant") return { kind, values: shuffled(next, Array.from({ length: n }, (_, i) => i)).slice(0, 3) };
  if (kind === "progression") {
    const size = n >= 5 && next() < 0.3 ? 2 : 1;
    const step = next() < 0.5 ? size : -size;
    const span = 2 * size;
    const starts = Array.from({ length: 3 }, () => (step > 0 ? int(next, n - span) : span + int(next, n - span)));
    // Two rows alike and a third not would read just as well as "the same three values in every row", with another
    // answer: so when the first two are alike, so is the third.
    if (starts[0] === starts[1]) starts[2] = starts[0];
    return { kind, step, starts };
  }
  if (kind === "distribute") return { kind, values: shuffled(next, Array.from({ length: n }, (_, i) => i)).slice(0, 3), shift: next() < 0.5 ? 1 : 2 };
  // sum: counts are 0-based (0 is one figure), so the third has first + second + 1 figures, at most four.
  return { kind: "sum", firsts: Array.from({ length: 3 }, () => { const a = int(next, 2); return [a, int(next, 2 - a)]; }) };
}

function valueAt(rule: Rule, r: number, c: number): number {
  if (rule.kind === "constant") return rule.value;
  if (rule.kind === "rowConstant") return rule.values[r];
  if (rule.kind === "progression") return rule.starts[r] + rule.step * c;
  if (rule.kind === "distribute") return rule.values[(c + r * rule.shift) % 3];
  const [a, b] = rule.firsts[r];
  return c === 0 ? a : c === 1 ? b : a + b + 1;
}

// Every value the bottom right could take for one attribute, under any rule that both full rows obey (as a reader would
// find them, from the first two rows and the first two panels of the third).
export function attributeReadings(values: readonly number[], sum: boolean): Set<number> {
  const v = values;
  const [r0, r1] = [v.slice(0, 3), v.slice(3, 6)];
  const [a, b] = [v[6], v[7]];
  const out = new Set<number>();
  if (v.slice(0, 8).every(x => x === v[0])) out.add(v[0]);
  if ([r0, r1].every(r => r[0] === r[1] && r[1] === r[2]) && a === b) out.add(a);
  const step = r0[1] - r0[0];
  if (step !== 0 && [r0, r1].every(r => r[1] - r[0] === step && r[2] - r[1] === step) && b - a === step) out.add(b + step);
  if (new Set(r0).size === 3 && sameSet(r0, r1) && a !== b && r0.includes(a) && r0.includes(b)) out.add(r0.find(x => x !== a && x !== b)!);
  if (sum && [r0, r1].every(r => r[2] === r[0] + r[1] + 1)) out.add(a + b + 1);
  return out;
}

function attributePuzzle(next: () => number, family: "figures" | "nested", level: number): Puzzle {
  const spec = SPECS[family];
  const changing = new Set(shuffled(next, spec).slice(0, Math.max(1, Math.min(spec.length, level))).map(a => a.name));
  let rules: Record<string, Rule>, cells: Panel[];
  do {
    rules = Object.fromEntries(spec.map(a => [a.name, makeRule(next, a, changing.has(a.name))]));
    cells = Array.from({ length: 9 }, (_, i) => Object.fromEntries(spec.map(a => [a.name, valueAt(rules[a.name], Math.floor(i / 3), i % 3)])));
  } while (spec.some(a => attributeReadings(cells.map(cell => cell[a.name]), Boolean(a.sum)).size !== 1));
  const correct = cells[8];
  // Three attributes to vary among the choices, the changing ones first; for each, one other value.
  const varied = [...shuffled(next, spec.filter(a => changing.has(a.name))), ...shuffled(next, spec.filter(a => !changing.has(a.name)))].slice(0, 3);
  const others = varied.map(a => (correct[a.name] + 1 + int(next, a.values - 1)) % a.values);
  const choices = shuffled(next, Array.from({ length: 8 }, (_, mask) => ({ ...correct, ...Object.fromEntries(varied.flatMap((a, i) => (mask & (1 << i) ? [[a.name, others[i]]] : []))) })));
  return { family, cells, choices, answer: choices.findIndex(c => spec.every(a => c[a.name] === correct[a.name])), level, rules: spec.map(a => `${a.name}:${rules[a.name].kind}`) };
}

// ---- Mask rules (lines, dots) ----

export type MaskRule = "or" | "and" | "xor" | "right" | "down";
const popcount = (m: number) => { let n = 0; for (; m; m &= m - 1) n++; return n; };
// The dots one place to the right (or down) on the 3 x 3 grid, coming round at the edge. Bit 3 * row + column.
const moveDots = (m: number, way: "right" | "down" | "left" | "up") => {
  let out = 0;
  for (let i = 0; i < 9; i++) {
    if (!(m & (1 << i))) continue;
    const r = Math.floor(i / 3), c = i % 3;
    const [nr, nc] = way === "right" ? [r, (c + 1) % 3] : way === "left" ? [r, (c + 2) % 3] : way === "down" ? [(r + 1) % 3, c] : [(r + 2) % 3, c];
    out |= 1 << (nr * 3 + nc);
  }
  return out;
};
const combine = (op: "or" | "and" | "xor", a: number, b: number) => (op === "or" ? a | b : op === "and" ? a & b : a ^ b);

// Every mask the bottom right could have, under any rule both full rows obey.
export function maskReadings(cells: readonly number[], family: "lines" | "dots"): Set<number> {
  const rows = [cells.slice(0, 3), cells.slice(3, 6)];
  const [a, b] = [cells[6], cells[7]];
  const out = new Set<number>();
  for (const op of ["or", "and", "xor"] as const) if (rows.every(r => r[2] === combine(op, r[0], r[1]))) out.add(combine(op, a, b));
  if (family === "dots") {
    for (const way of ["right", "left", "down", "up"] as const) {
      if (rows.every(r => r[1] === moveDots(r[0], way) && r[2] === moveDots(r[1], way)) && b === moveDots(a, way)) out.add(moveDots(b, way));
    }
  }
  return out;
}

function randomMask(next: () => number, bits: number, low: number, high: number) {
  for (;;) { const m = int(next, 1 << bits); const n = popcount(m); if (n >= low && n <= high) return m; }
}

function maskPuzzle(next: () => number, family: "lines" | "dots", level: number): Puzzle {
  const bits = BITS[family];
  const rules: MaskRule[] = family === "dots"
    ? level <= 2 ? ["right", "down"] : level === 3 ? ["or", "xor"] : ["xor"]
    : level <= 2 ? ["or", "and"] : level === 3 ? ["and", "xor"] : ["xor"];
  const rule = pick(next, rules);
  let cells: number[];
  for (;;) {
    cells = [];
    for (let r = 0; r < 3; r++) {
      if (rule === "right" || rule === "down") {
        const start = randomMask(next, bits, 2, 4);
        cells.push(start, moveDots(start, rule), moveDots(moveDots(start, rule), rule));
      } else {
        const a = randomMask(next, bits, 2, 5), b = randomMask(next, bits, 2, 5), c = combine(rule, a, b);
        cells.push(a, b, c);
      }
    }
    // Every panel shows something, the third is not just a copy of one of the first two, and only one rule fits.
    const plain = cells.every(m => m !== 0) && [0, 1, 2].every(r => rule === "right" || rule === "down" || (cells[r * 3 + 2] !== cells[r * 3] && cells[r * 3 + 2] !== cells[r * 3 + 1]));
    if (plain && new Set(cells.slice(0, 8)).size >= 5 && maskReadings(cells, family).size === 1) break;
  }
  const correct = cells[8];
  // Three lines or dots to vary among the choices, none of which leaves a choice empty.
  let flips: number[];
  do flips = shuffled(next, Array.from({ length: bits }, (_, i) => i)).slice(0, 3);
  while (Array.from({ length: 8 }, (_, m) => flips.reduce((x, bit, i) => (m & (1 << i) ? x ^ (1 << bit) : x), correct)).some(x => x === 0));
  const choices = shuffled(next, Array.from({ length: 8 }, (_, m) => ({ mask: flips.reduce((x, bit, i) => (m & (1 << i) ? x ^ (1 << bit) : x), correct) })));
  return { family, cells: cells.map(mask => ({ mask })), choices, answer: choices.findIndex(c => c.mask === correct), level, rules: [rule] };
}

// ---- A test ----

export function makePuzzle(seed: number, family: Family, level: number): Puzzle {
  const next = random(seed);
  return family === "figures" || family === "nested" ? attributePuzzle(next, family, level) : maskPuzzle(next, family, level);
}

export const QUESTIONS = 16;
// The sixteen puzzles: the four kinds taking turns, getting harder (the level is how many attributes change, or for
// lines and dots which rules come up).
export const PLAN: readonly [Family, number][] = [
  ["figures", 1], ["dots", 1], ["nested", 1], ["lines", 2],
  ["figures", 2], ["dots", 2], ["nested", 2], ["lines", 2],
  ["figures", 3], ["dots", 3], ["nested", 3], ["lines", 3],
  ["figures", 3], ["dots", 4], ["nested", 4], ["figures", 4],
];
export const makeTest = (seed: number) => PLAN.map(([family, level], i) => makePuzzle(Math.imul(seed ^ 0x5bd1e995, i + 1) >>> 0, family, level));

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
