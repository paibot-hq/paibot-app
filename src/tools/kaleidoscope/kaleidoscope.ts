// The geometry of a kaleidoscope: every point drawn is copied round a centre, `segments` times, and with a mirror each copy is
// also reflected, as in a real kaleidoscope. Pure functions, so they are tested without a browser.

export type Point = { x: number; y: number };

// The copies of a point: `segments` turns round the centre, and with `mirror` the same turns of its reflection.
export function copies(point: Point, centre: Point, segments: number, mirror: boolean): Point[] {
  const n = Math.max(1, Math.floor(segments));
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  const out: Point[] = [];
  for (let k = 0; k < n; k++) {
    const angle = (2 * Math.PI * k) / n;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    out.push({ x: centre.x + dx * cos - dy * sin, y: centre.y + dx * sin + dy * cos });
    // The reflection across the horizontal axis through the centre, turned the same way.
    if (mirror) out.push({ x: centre.x + dx * cos + dy * sin, y: centre.y + dx * sin - dy * cos });
  }
  return out;
}

export type ColorMode = "rainbow" | "warm" | "cool" | "mono";
export const COLOR_MODES: readonly ColorMode[] = ["rainbow", "warm", "cool", "mono"];

// The hue of a stroke after it has travelled `distance` pixels: it drifts slowly round the colour wheel (or round a part of it).
export function hueFor(mode: ColorMode, distance: number): number {
  const turn = (distance / 900) % 1;
  if (mode === "warm") return Math.round(turn * 60 + 340) % 360;
  if (mode === "cool") return Math.round(turn * 100 + 170);
  if (mode === "mono") return 210;
  return Math.round(turn * 360);
}

export const lightnessFor = (mode: ColorMode) => (mode === "mono" ? 92 : 62);
export const saturationFor = (mode: ColorMode) => (mode === "mono" ? 10 : 92);

// A path that draws by itself ("おまかせ"): a slow Lissajous curve that wanders over the canvas, `t` in seconds.
export function autoPoint(t: number, size: number): Point {
  const half = size / 2;
  return {
    x: half + half * 0.82 * Math.sin(t * 0.9 + Math.sin(t * 0.23) * 1.7),
    y: half + half * 0.82 * Math.sin(t * 1.3 + 1.1 + Math.cos(t * 0.17) * 1.3),
  };
}
