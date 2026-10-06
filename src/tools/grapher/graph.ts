// The maths of the grapher's drawing: the window on the plane (a centre and pixels per unit), nice tick spacing and the polylines
// of a curve, broken where it is undefined or jumps across the screen (1/x, tan x). Pure functions, tested without a browser.

export type View = { cx: number; cy: number; scale: number };
export const MIN_SCALE = 1e-3;
export const MAX_SCALE = 1e6;

export const toScreen = (view: View, width: number, height: number, x: number, y: number) =>
  ({ x: width / 2 + (x - view.cx) * view.scale, y: height / 2 - (y - view.cy) * view.scale });
export const fromScreen = (view: View, width: number, height: number, sx: number, sy: number) =>
  ({ x: view.cx + (sx - width / 2) / view.scale, y: view.cy - (sy - height / 2) / view.scale });

// Zooms by `factor` keeping the point under (sx, sy) where it is.
export function zoomAt(view: View, width: number, height: number, sx: number, sy: number, factor: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
  const before = fromScreen(view, width, height, sx, sy);
  return { scale, cx: before.x - (sx - width / 2) / scale, cy: before.y + (sy - height / 2) / scale };
}

// A step of 1, 2 or 5 times a power of ten that gives about `target` ticks across `span`.
export function niceStep(span: number, target = 8): number {
  const raw = span / target;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / power;
  return (fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10) * power;
}

export function formatTick(value: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const text = Math.abs(value) < step * 1e-9 ? "0" : value.toFixed(Math.min(decimals, 12));
  if (Math.abs(value) >= 1e7 || (value !== 0 && Math.abs(value) < 1e-5)) return value.toExponential(0).replace("e+", "e");
  return text;
}

export function ticks(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let k = Math.ceil(from / step); k * step <= to; k++) out.push(k * step);
  return out;
}

// The curve y = f(x) as screen polylines: one point for every `stride` pixels across, a new line where f is not a number,
// is far off the screen, or jumps by more than a screen's height between two neighbours (an asymptote).
export function polylines(f: (x: number) => number, view: View, width: number, height: number, stride = 1): { x: number; y: number }[][] {
  const lines: { x: number; y: number }[][] = [];
  let line: { x: number; y: number }[] = [];
  let previous: number | null = null;
  const flush = () => { if (line.length > 1) lines.push(line); line = []; previous = null; };
  for (let sx = 0; sx <= width + stride; sx += stride) {
    const { x } = fromScreen(view, width, height, sx, 0);
    const y = f(x);
    const sy = height / 2 - (y - view.cy) * view.scale;
    if (!Number.isFinite(y) || Math.abs(sy) > height * 40) { flush(); continue; }
    if (previous !== null && Math.abs(sy - previous) > height * 1.2) flush();
    line.push({ x: sx, y: sy });
    previous = sy;
  }
  flush();
  return lines;
}
