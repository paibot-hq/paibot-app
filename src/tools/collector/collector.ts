// The coupon collector's problem: n kinds, each draw equally likely to be any of them. How many draws until `goal` kinds are in hand,
// starting from `have`? Exact answers (mean, spread, the whole distribution) and a collection to fill by hand or many times over.

export const MAX_KINDS = 1000;

export type Problem = { n: number; have: number; goal: number };

// Whole numbers in range, the goal above what is already in hand: anything typed becomes a problem that can be solved.
export function normalize(raw: { n: number; have: number; goal: number }): Problem {
  const whole = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(x) ? Math.round(x) : lo));
  const n = whole(raw.n, 1, MAX_KINDS);
  const goal = whole(raw.goal, 1, n);
  const have = whole(raw.have, 0, goal - 1);
  return { n, have, goal };
}

// With i kinds in hand a new one comes with chance (n - i) / n, so it takes n / (n - i) draws on average (a geometric wait).
export function waits({ n, have, goal }: Problem): { kinds: number; chance: number; mean: number }[] {
  const out = [];
  for (let i = have; i < goal; i++) out.push({ kinds: i, chance: (n - i) / n, mean: n / (n - i) });
  return out;
}

// The waits are independent, so their means and their variances (1 - p) / p² add up.
export function mean(problem: Problem): number {
  return waits(problem).reduce((sum, w) => sum + w.mean, 0);
}

export function deviation(problem: Problem): number {
  return Math.sqrt(waits(problem).reduce((sum, w) => sum + (1 - w.chance) / (w.chance * w.chance), 0));
}

// cdf[t] is the chance that `goal` kinds are in hand after t draws, followed until it is within `tail` of certain.
// The chances of holding each number of kinds are carried forward one draw at a time (an exact Markov chain, no sampling).
export function distribution({ n, have, goal }: Problem, tail = 1e-5): number[] {
  const p = new Float64Array(goal - have + 1);
  p[0] = 1;
  const cdf = [0];
  if (goal === have) return [1];
  const limit = 50 * Math.ceil(mean({ n, have, goal })) + 100;
  for (let t = 1; t <= limit; t++) {
    // From the top down, so each state passes on what it held before this draw.
    p[goal - have] += p[goal - have - 1] * (n - (goal - 1)) / n;
    for (let j = goal - have - 1; j >= 1; j--) {
      const i = have + j;
      p[j] = p[j] * (i / n) + p[j - 1] * ((n - (i - 1)) / n);
    }
    p[0] *= have / n;
    cdf.push(p[goal - have]);
    if (p[goal - have] >= 1 - tail) break;
  }
  return cdf;
}

// The fewest draws that reach the goal with at least chance q.
export function quantile(cdf: number[], q: number): number {
  const t = cdf.findIndex(c => c >= q - 1e-12);
  return t < 0 ? cdf.length - 1 : t;
}

export function chanceWithin(cdf: number[], t: number): number {
  if (t < 0) return 0;
  return t < cdf.length ? cdf[t] : cdf[cdf.length - 1] < 1 - 1e-3 ? cdf[cdf.length - 1] : 1;
}

// A collection being filled: how many of each kind came out, in what order.
export type Collection = { counts: number[]; draws: number; kinds: number; last: number | null; firstAt: number[] };

export function emptyCollection(n: number, have = 0): Collection {
  // The kinds already in hand are the first ones, each counted once, drawn "before" the first draw.
  const counts = Array.from({ length: n }, (_, i) => (i < have ? 1 : 0));
  return { counts, draws: 0, kinds: have, last: null, firstAt: counts.map(c => (c ? 0 : -1)) };
}

export function draw(c: Collection, random: () => number): Collection {
  return drawMany(c, 1, random);
}

// `count` draws, stopping early once `goal` kinds are in hand (when a goal is given).
export function drawMany(c: Collection, count: number, random: () => number, goal = Infinity): Collection {
  const n = c.counts.length;
  const counts = c.counts.slice();
  const firstAt = c.firstAt.slice();
  let { draws, kinds, last } = c;
  for (let k = 0; k < count && kinds < goal; k++) {
    const kind = Math.min(n - 1, Math.floor(random() * n));
    draws++;
    if (counts[kind] === 0) { firstAt[kind] = draws; kinds++; }
    counts[kind]++;
    last = kind;
  }
  return { counts, draws, kinds, last, firstAt };
}

// Draws until the goal, without keeping every step (fast enough to repeat a thousand times).
export function trial({ n, have, goal }: Problem, random: () => number): number {
  const seen = new Uint8Array(n);
  for (let i = 0; i < have; i++) seen[i] = 1;
  let kinds = have, draws = 0;
  while (kinds < goal) {
    const kind = Math.min(n - 1, Math.floor(random() * n));
    draws++;
    if (!seen[kind]) { seen[kind] = 1; kinds++; }
  }
  return draws;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
