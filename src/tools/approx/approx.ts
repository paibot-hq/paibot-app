// Three ways to approach the same function with the same number of numbers: a Taylor polynomial (the first n terms that are not zero, around 0),
// a Fourier series (the n biggest coefficients) and a small neural network (3h + 1 numbers) trained on the spot. Pure functions, tested without a
// browser.

export type TargetId = "sin" | "wiggle" | "gauss" | "runge" | "exp" | "atan" | "abs" | "step" | "line";

export type Target = {
  id: TargetId;
  f: (x: number) => number;
  half: number;                         // the function is approached over [-half, half]
  view: { yMin: number; yMax: number };
  // The Taylor coefficient of x^p around 0; null where there is no Taylor series (a corner or a jump at 0).
  taylor: ((p: number) => number) | null;
};

const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));
const sign = (m: number) => (m % 2 === 0 ? 1 : -1);
const WIGGLE: [number, number][] = [[1, 1], [3, 0.5], [7, 0.25]];

export const TARGETS: Record<TargetId, Target> = {
  sin: { id: "sin", f: Math.sin, half: 2 * Math.PI, view: { yMin: -2, yMax: 2 }, taylor: p => (p % 2 === 1 ? sign((p - 1) / 2) / factorial(p) : 0) },
  wiggle: { id: "wiggle", f: x => WIGGLE.reduce((s, [a, c]) => s + c * Math.sin(a * x), 0), half: 2 * Math.PI, view: { yMin: -2.2, yMax: 2.2 },
    taylor: p => (p % 2 === 1 ? WIGGLE.reduce((s, [a, c]) => s + (c * Math.pow(a, p) * sign((p - 1) / 2)) / factorial(p), 0) : 0) },
  gauss: { id: "gauss", f: x => Math.exp(-x * x), half: 4, view: { yMin: -0.5, yMax: 1.5 }, taylor: p => (p % 2 === 0 ? sign(p / 2) / factorial(p / 2) : 0) },
  runge: { id: "runge", f: x => 1 / (1 + x * x), half: 3, view: { yMin: -0.5, yMax: 1.5 }, taylor: p => (p % 2 === 0 ? sign(p / 2) : 0) },
  exp: { id: "exp", f: Math.exp, half: 3, view: { yMin: -2, yMax: 22 }, taylor: p => 1 / factorial(p) },
  atan: { id: "atan", f: Math.atan, half: 3, view: { yMin: -2, yMax: 2 }, taylor: p => (p % 2 === 1 ? sign((p - 1) / 2) / p : 0) },
  abs: { id: "abs", f: Math.abs, half: 2, view: { yMin: -0.5, yMax: 2.5 }, taylor: null },
  step: { id: "step", f: x => (x > 0 ? 1 : x < 0 ? -1 : 0), half: 3, view: { yMin: -1.6, yMax: 1.6 }, taylor: null },
  line: { id: "line", f: x => x, half: 3, view: { yMin: -3.5, yMax: 3.5 }, taylor: p => (p === 1 ? 1 : 0) },
};
export const TARGET_IDS = Object.keys(TARGETS) as TargetId[];

// ---- Taylor ----
export type Term = { power: number; coefficient: number };
// The first n terms that are not zero, or null when the function has no Taylor series.
export function taylorTerms(target: Target, n: number): Term[] | null {
  if (!target.taylor) return null;
  const out: Term[] = [];
  for (let p = 0; out.length < n && p < 400; p++) {
    const c = target.taylor(p);
    if (c !== 0) out.push({ power: p, coefficient: c });
  }
  return out;
}
export const taylorEval = (terms: Term[], x: number) => terms.reduce((s, t) => s + t.coefficient * Math.pow(x, t.power), 0);

// ---- Fourier ----
// A coefficient: the constant, or the cosine (kind "a") or sine (kind "b") of the k-th harmonic.
export type Coefficient = { kind: "a" | "b"; k: number; value: number };
const MAX_HARMONIC = 120;
const SAMPLES = 4096;

// The Fourier coefficients of f over [-half, half] (repeated with period 2 half), by the midpoint rule, and the n biggest of them.
export function fourierBest(f: (x: number) => number, half: number, n: number): Coefficient[] {
  const xs = Array.from({ length: SAMPLES }, (_, i) => -half + (2 * half * (i + 0.5)) / SAMPLES);
  const ys = xs.map(f);
  const all: Coefficient[] = [{ kind: "a", k: 0, value: ys.reduce((s, y) => s + y, 0) / SAMPLES }];
  for (let k = 1; k <= MAX_HARMONIC; k++) {
    let a = 0, b = 0;
    for (let i = 0; i < SAMPLES; i++) { const angle = (Math.PI * k * xs[i]) / half; a += ys[i] * Math.cos(angle); b += ys[i] * Math.sin(angle); }
    all.push({ kind: "a", k, value: (2 * a) / SAMPLES }, { kind: "b", k, value: (2 * b) / SAMPLES });
  }
  return all
    .filter(c => Math.abs(c.value) > 1e-10)
    .sort((p, q) => Math.abs(q.value) - Math.abs(p.value) || p.k - q.k || (p.kind < q.kind ? -1 : 1))
    .slice(0, n);
}
export function fourierEval(coefficients: Coefficient[], half: number, x: number): number {
  let s = 0;
  for (const c of coefficients) {
    if (c.k === 0) s += c.value;
    else s += c.value * (c.kind === "a" ? Math.cos((Math.PI * c.k * x) / half) : Math.sin((Math.PI * c.k * x) / half));
  }
  return s;
}

// ---- A small neural network: one input, h tanh units, one output; 3h + 1 numbers ----
export type Net = { hidden: number; p: Float64Array; m: Float64Array; v: Float64Array; steps: number };
export const netSize = (hidden: number) => 3 * hidden + 1;
export const hiddenFor = (budget: number) => Math.max(1, Math.floor((budget - 1) / 3));

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Layout of p: input weights, input biases, output weights (h each), then the output bias.
export function createNet(hidden: number, rng: () => number): Net {
  const p = new Float64Array(netSize(hidden));
  for (let i = 0; i < hidden; i++) {
    p[i] = (rng() * 2 - 1) * 3;                       // w1
    p[hidden + i] = (rng() * 2 - 1) * 3;              // b1
    p[2 * hidden + i] = ((rng() * 2 - 1) * 0.8) / Math.sqrt(hidden);   // w2
  }
  return { hidden, p, m: new Float64Array(p.length), v: new Float64Array(p.length), steps: 0 };
}

export function netEval(net: Net, x: number): number {
  const { hidden: h, p } = net;
  let y = p[3 * h];
  for (let i = 0; i < h; i++) y += p[2 * h + i] * Math.tanh(p[i] * x + p[h + i]);
  return y;
}

// The mean squared error over the points, and its gradient with respect to every number.
export function gradient(net: Net, xs: number[], ts: number[]): { loss: number; grad: Float64Array } {
  const { hidden: h, p } = net;
  const grad = new Float64Array(p.length);
  const n = xs.length;
  let loss = 0;
  const act = new Float64Array(h);
  for (let j = 0; j < n; j++) {
    let y = p[3 * h];
    for (let i = 0; i < h; i++) { act[i] = Math.tanh(p[i] * xs[j] + p[h + i]); y += p[2 * h + i] * act[i]; }
    const err = y - ts[j];
    loss += err * err / n;
    const dy = (2 * err) / n;
    grad[3 * h] += dy;
    for (let i = 0; i < h; i++) {
      grad[2 * h + i] += dy * act[i];
      const dz = dy * p[2 * h + i] * (1 - act[i] * act[i]);
      grad[i] += dz * xs[j];
      grad[h + i] += dz;
    }
  }
  return { loss, grad };
}

// One step of Adam on all the points; returns the loss before the step.
export function train(net: Net, xs: number[], ts: number[], rate = 0.02): number {
  const { loss, grad } = gradient(net, xs, ts);
  net.steps++;
  const b1 = 0.9, b2 = 0.999;
  for (let i = 0; i < net.p.length; i++) {
    net.m[i] = b1 * net.m[i] + (1 - b1) * grad[i];
    net.v[i] = b2 * net.v[i] + (1 - b2) * grad[i] * grad[i];
    const mh = net.m[i] / (1 - Math.pow(b1, net.steps)), vh = net.v[i] / (1 - Math.pow(b2, net.steps));
    net.p[i] -= (rate * mh) / (Math.sqrt(vh) + 1e-8);
  }
  return loss;
}

// The points the network is taught from: x scaled to -1..1, and the target scaled to about -1..1.
export function lesson(target: Target, count = 256): { xs: number[]; ts: number[]; scale: number } {
  let top = 1e-9;
  const values: number[] = [];
  const raw = Array.from({ length: count }, (_, i) => -target.half + (2 * target.half * (i + 0.5)) / count);
  for (const x of raw) { const y = target.f(x); values.push(y); top = Math.max(top, Math.abs(y)); }
  return { xs: raw.map(x => x / target.half), ts: values.map(y => y / top), scale: top };
}

// ---- Comparing ----
// The root mean square distance between two functions over [-half, half].
export function rms(a: (x: number) => number, b: (x: number) => number, half: number, samples = 800): number {
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const x = -half + (2 * half * (i + 0.5)) / samples;
    sum += (a(x) - b(x)) ** 2;
  }
  return Math.sqrt(sum / samples);
}

export type Method = "taylor" | "fourier" | "network";
export const METHODS: readonly Method[] = ["taylor", "fourier", "network"];
// The method with the smallest error (those without a number do not take part).
export function winner(errors: Record<Method, number | null>): Method | null {
  let best: Method | null = null;
  for (const m of METHODS) {
    const e = errors[m];
    if (e !== null && Number.isFinite(e) && (best === null || e < (errors[best] as number))) best = m;
  }
  return best;
}
