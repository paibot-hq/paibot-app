// Judging a hand-drawn circle: the circle that fits the stroke best, how far the stroke strays from it, and whether it goes round once.

export type Point = { x: number; y: number };
export type Fit = { cx: number; cy: number; r: number };
export type Problem = "short" | "small" | "open" | "laps";
export type Judgement =
  | { ok: true; fit: Fit; score: number; rank: Rank; roundness: number; gap: number; deviations: number[] }
  | { ok: false; problem: Problem; fit: Fit | null };
export type Rank = "S" | "A" | "B" | "C" | "D";

export const MIN_POINTS = 12;
// The smallest radius judged, as a share of the board's side: a tiny circle hides the wobble.
export const MIN_RADIUS = 0.12;
// How far round the stroke must go (in turns), and how far beyond one turn it may go.
export const MIN_TURNS = 0.9;
export const MAX_TURNS = 1.35;

// The least-squares circle (Kåsa): solves x² + y² + Dx + Ey + F = 0 for the points. Null when they are on a line.
export function fitCircle(points: Point[]): Fit | null {
  const n = points.length;
  if (n < 3) return null;
  let mx = 0, my = 0;
  for (const p of points) { mx += p.x; my += p.y; }
  mx /= n; my /= n;
  // Centred on the mean, so that the sums stay small and the solve stays exact.
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const p of points) {
    const u = p.x - mx, v = p.y - my;
    suu += u * u; svv += v * v; suv += u * v;
    suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u;
  }
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-9 * Math.max(1, suu * svv)) return null;
  const a = (suuu + suvv) / 2, b = (svvv + svuu) / 2;
  const uc = (a * svv - b * suv) / det;
  const vc = (b * suu - a * suv) / det;
  const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  return Number.isFinite(r) ? { cx: uc + mx, cy: vc + my, r } : null;
}

// The angle the stroke sweeps round a centre, in turns (signed: positive is clockwise on a screen).
export function turnsAround(points: Point[], cx: number, cy: number): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    let d = Math.atan2(points[i].y - cy, points[i].x - cx) - Math.atan2(points[i - 1].y - cy, points[i - 1].x - cx);
    if (d > Math.PI) d -= 2 * Math.PI;
    else if (d < -Math.PI) d += 2 * Math.PI;
    total += d;
  }
  return total / (2 * Math.PI);
}

export function rankFor(score: number): Rank {
  return score >= 95 ? "S" : score >= 90 ? "A" : score >= 80 ? "B" : score >= 60 ? "C" : "D";
}

// The score out of 100 (one decimal): the stroke's RMS distance from the circle against the radius is the most of it, and a gap left
// between the ends costs a little more. A stroke 2% off scores about 92, 5% off 80, 10% off 60.
export function judge(points: Point[], side: number): Judgement {
  if (points.length < MIN_POINTS) return { ok: false, problem: "short", fit: null };
  const fit = fitCircle(points);
  if (!fit) return { ok: false, problem: "short", fit: null };
  if (fit.r < MIN_RADIUS * side) return { ok: false, problem: "small", fit };
  const turns = Math.abs(turnsAround(points, fit.cx, fit.cy));
  if (turns < MIN_TURNS) return { ok: false, problem: "open", fit };
  if (turns > MAX_TURNS) return { ok: false, problem: "laps", fit };
  const deviations = points.map(p => Math.hypot(p.x - fit.cx, p.y - fit.cy) - fit.r);
  const rms = Math.sqrt(deviations.reduce((sum, d) => sum + d * d, 0) / deviations.length);
  const first = points[0], last = points[points.length - 1];
  // Over one turn the ends pass each other, so there is no gap.
  const gap = turns >= 1 ? 0 : Math.hypot(last.x - first.x, last.y - first.y) / fit.r;
  const roundness = Math.max(0, 1 - rms / fit.r);
  const raw = 100 * (1 - 4 * rms / fit.r - 0.5 * Math.max(0, gap - 0.05));
  const score = Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
  return { ok: true, fit, score, rank: rankFor(score), roundness, gap, deviations };
}
