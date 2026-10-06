// Drawing a closed curve with turning circles: the discrete Fourier transform of the curve's points (as complex numbers) gives circles,
// each turning at a whole number of times per loop, whose arms added end to end have the curve's point at their tip.
// Pure functions, tested without a browser.

export type Point = { x: number; y: number };
export type Term = { freq: number; re: number; im: number; amplitude: number; phase: number };

// The curve cut into n points at equal steps along its length, and closed (the last point leads back to the first).
export function resample(points: Point[], n: number): Point[] {
  if (points.length === 0) return Array.from({ length: n }, () => ({ x: 0, y: 0 }));
  const closed = [...points, points[0]];
  const lengths = [0];
  for (let i = 1; i < closed.length; i++) lengths.push(lengths[i - 1] + Math.hypot(closed[i].x - closed[i - 1].x, closed[i].y - closed[i - 1].y));
  const total = lengths[lengths.length - 1];
  if (total < 1e-9) return Array.from({ length: n }, () => ({ ...points[0] }));
  const out: Point[] = [];
  let segment = 1;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / n;
    while (segment < closed.length - 1 && lengths[segment] < target) segment++;
    const span = lengths[segment] - lengths[segment - 1] || 1;
    const u = (target - lengths[segment - 1]) / span;
    out.push({ x: closed[segment - 1].x + (closed[segment].x - closed[segment - 1].x) * u, y: closed[segment - 1].y + (closed[segment].y - closed[segment - 1].y) * u });
  }
  return out;
}

// The circles, biggest first: X_k = (1/N) sum z_n e^(-2 pi i k n / N), for k from -N/2 to N/2 - 1.
export function dft(points: Point[]): Term[] {
  const n = points.length;
  const terms: Term[] = [];
  for (let m = 0; m < n; m++) {
    const freq = m < n / 2 ? m : m - n;
    let re = 0, im = 0;
    for (let j = 0; j < n; j++) {
      const angle = (-2 * Math.PI * freq * j) / n;
      const c = Math.cos(angle), s = Math.sin(angle);
      re += points[j].x * c - points[j].y * s;
      im += points[j].x * s + points[j].y * c;
    }
    re /= n; im /= n;
    terms.push({ freq, re, im, amplitude: Math.hypot(re, im), phase: Math.atan2(im, re) });
  }
  return terms.sort((a, b) => b.amplitude - a.amplitude || Math.abs(a.freq) - Math.abs(b.freq) || a.freq - b.freq);
}

// The centres of the first `count` circles at time t (0..1 is one loop), each circle's centre at the tip of the one before:
// the first entry is the origin, the last is the point of the curve.
export function chain(terms: Term[], t: number, count: number): Point[] {
  const out: Point[] = [{ x: 0, y: 0 }];
  let x = 0, y = 0;
  for (let k = 0; k < Math.min(count, terms.length); k++) {
    const angle = 2 * Math.PI * terms[k].freq * t + terms[k].phase;
    x += terms[k].amplitude * Math.cos(angle);
    y += terms[k].amplitude * Math.sin(angle);
    out.push({ x, y });
  }
  return out;
}

export function evaluate(terms: Term[], t: number, count: number): Point {
  return chain(terms, t, count).at(-1) as Point;
}

// The curve drawn by the first `count` circles, as `samples` points over one loop.
export function trace(terms: Term[], count: number, samples: number): Point[] {
  return Array.from({ length: samples }, (_, i) => evaluate(terms, i / samples, count));
}

// How far, on average (root mean square), the first `count` circles' curve is from the points.
export function error(points: Point[], terms: Term[], count: number): number {
  let sum = 0;
  points.forEach((p, j) => { const q = evaluate(terms, j / points.length, count); sum += (p.x - q.x) ** 2 + (p.y - q.y) ** 2; });
  return Math.sqrt(sum / points.length);
}

// Moved to the middle and scaled so the curve's farthest point is `radius` from the centre of a `size` square.
export function fit(points: Point[], size: number, radius: number): Point[] {
  const mean = points.reduce((m, p) => ({ x: m.x + p.x / points.length, y: m.y + p.y / points.length }), { x: 0, y: 0 });
  const reach = Math.max(...points.map(p => Math.hypot(p.x - mean.x, p.y - mean.y)), 1e-9);
  return points.map(p => ({ x: size / 2 + ((p.x - mean.x) / reach) * radius, y: size / 2 + ((p.y - mean.y) / reach) * radius }));
}

const sample = (count: number, f: (t: number) => Point): Point[] => Array.from({ length: count }, (_, i) => f((2 * Math.PI * i) / count));
const polygon = (corners: Point[]): Point[] => corners;

export const PRESETS = {
  heart: () => sample(600, t => ({ x: 16 * Math.sin(t) ** 3, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) })),
  star: () => polygon([0, 2, 4, 1, 3].map(k => ({ x: Math.sin((2 * Math.PI * k) / 5), y: -Math.cos((2 * Math.PI * k) / 5) }))),
  trefoil: () => sample(600, t => ({ x: Math.sin(t) + 2 * Math.sin(2 * t), y: Math.cos(t) - 2 * Math.cos(2 * t) })),
  infinity: () => sample(600, t => ({ x: Math.cos(t) / (1 + Math.sin(t) ** 2), y: (Math.sin(t) * Math.cos(t)) / (1 + Math.sin(t) ** 2) })),
  treble: () => sample(600, t => ({ x: Math.sin(t) * (1 + 0.5 * Math.cos(5 * t)), y: -Math.cos(t) * (1 + 0.5 * Math.cos(5 * t)) })),
} as const;
export type PresetName = keyof typeof PRESETS;
export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];
