// The surface z = f(x, y) as small four-cornered faces for the 3D picture: a grid of values over [-half, half]², the places
// where f is not a number or runs off to a pole left as holes, and everything scaled into a box (x and y to -1..1, the height to
// -0.7..0.7) so any formula fits the picture. Pure functions, tested without a browser.

export type Vec = { x: number; y: number; z: number };
// A face: four corners (in the scene's coordinates, y up) and its height as a fraction 0..1 of the range, for the colour.
export type Quad = { points: [Vec, Vec, Vec, Vec]; t: number };
export type Surface = { quads: Quad[]; zMin: number; zMax: number; zero: number };

export const HEIGHT = 0.7;
// How far past the middle 90% of the values a value may be and still be drawn (poles are left out, a steep hill is not).
const REACH = 20;

export function buildSurface(f: (x: number, y: number) => number, half: number, n = 40): Surface {
  const grid: number[][] = [];
  const finite: number[] = [];
  for (let i = 0; i <= n; i++) {
    const row: number[] = [];
    for (let j = 0; j <= n; j++) {
      const z = f(-half + (2 * half * i) / n, -half + (2 * half * j) / n);
      row.push(z);
      if (Number.isFinite(z)) finite.push(z);
    }
    grid.push(row);
  }
  finite.sort((a, b) => a - b);
  let zMin = 0, zMax = 0;
  if (finite.length > 0) {
    const low = finite[Math.floor((finite.length - 1) * 0.05)], high = finite[Math.floor((finite.length - 1) * 0.95)];
    const reach = Math.max(high - low, 1e-9) * REACH;
    const kept = finite.filter(z => z >= low - reach && z <= high + reach);
    zMin = kept[0];
    zMax = kept[kept.length - 1];
    for (const row of grid) row.forEach((z, j) => { if (z < zMin || z > zMax) row[j] = NaN; });
  }
  const span = zMax - zMin > 1e-12 ? zMax - zMin : 1;
  const mid = (zMin + zMax) / 2;
  const up = (z: number) => ((z - mid) / (span / 2)) * HEIGHT;
  const at = (i: number, j: number): Vec => ({ x: -1 + (2 * i) / n, y: up(grid[i][j]), z: -1 + (2 * j) / n });
  const quads: Quad[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const corners = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
    if (!corners.every(Number.isFinite)) continue;
    const average = corners.reduce((a, b) => a + b, 0) / 4;
    quads.push({ points: [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], t: (average - zMin) / span });
  }
  // Where the plane z = 0 is in the box (the axes are drawn there), kept inside it.
  const zero = Math.max(-HEIGHT, Math.min(HEIGHT, up(0)));
  return { quads, zMin, zMax, zero };
}

// Turned about the vertical axis by `yaw`, then about the horizontal one by `pitch` (as in the polyhedra).
export function rotate(p: Vec, yaw: number, pitch: number): Vec {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
  return { x: x1, y: p.y * cx - z1 * sx, z: p.y * sx + z1 * cx };
}

// Perspective: the eye is 4 in front of the centre; z grows away from the eye.
export function project(p: Vec, width: number, height: number, zoom = 1): { x: number; y: number } {
  const scale = (4 / (4 + p.z)) * Math.min(width, height) * 0.28 * zoom;
  return { x: width / 2 + p.x * scale, y: height / 2 - p.y * scale };
}

export function faceNormal(q: Quad): Vec {
  const [a, , c, d] = q.points;
  const b = q.points[1];
  const u = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }, v = { x: d.x - b.x, y: d.y - b.y, z: d.z - b.z };
  const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
  const length = Math.hypot(n.x, n.y, n.z) || 1;
  return { x: n.x / length, y: n.y / length, z: n.z / length };
}
