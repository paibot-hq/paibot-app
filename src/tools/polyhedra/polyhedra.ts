// The five regular polyhedra as plain geometry: vertices on the unit sphere, faces found from the vertices alone (every
// plane through three vertices with all the others on one side is a face), and the rotation and perspective to draw them.
// Pure functions, tested without a browser.

export type Vec = { x: number; y: number; z: number };
export type Solid = "tetra" | "cube" | "octa" | "dodeca" | "icosa";
export const SOLIDS: readonly Solid[] = ["tetra", "cube", "octa", "dodeca", "icosa"];

export type Polyhedron = { vertices: Vec[]; faces: number[][]; edges: [number, number][] };

const PHI = (1 + Math.sqrt(5)) / 2;
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec, b: Vec): Vec => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
export const length = (a: Vec) => Math.hypot(a.x, a.y, a.z);
const unit = (a: Vec): Vec => { const n = length(a) || 1; return { x: a.x / n, y: a.y / n, z: a.z / n }; };

function corners(solid: Solid): Vec[] {
  const signs = [-1, 1];
  const out: Vec[] = [];
  switch (solid) {
    case "tetra":
      return [{ x: 1, y: 1, z: 1 }, { x: 1, y: -1, z: -1 }, { x: -1, y: 1, z: -1 }, { x: -1, y: -1, z: 1 }];
    case "cube":
      for (const x of signs) for (const y of signs) for (const z of signs) out.push({ x, y, z });
      return out;
    case "octa":
      for (const s of signs) out.push({ x: s, y: 0, z: 0 }, { x: 0, y: s, z: 0 }, { x: 0, y: 0, z: s });
      return out;
    case "icosa":
      for (const a of signs) for (const b of signs) out.push({ x: 0, y: a, z: b * PHI }, { x: a, y: b * PHI, z: 0 }, { x: b * PHI, y: 0, z: a });
      return out;
    case "dodeca":
      for (const x of signs) for (const y of signs) for (const z of signs) out.push({ x, y, z });
      for (const a of signs) for (const b of signs) out.push({ x: 0, y: a / PHI, z: b * PHI }, { x: a / PHI, y: b * PHI, z: 0 }, { x: b * PHI, y: 0, z: a / PHI });
      return out;
  }
}

const EPS = 1e-6;

// Every face: the vertices on a plane that has all the vertices on one side of it, in order round the face.
export function buildFaces(vertices: Vec[]): number[][] {
  const seen = new Set<string>();
  const faces: number[][] = [];
  const n = vertices.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let normal = cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]));
    if (length(normal) < EPS) continue;
    normal = unit(normal);
    const d = dot(normal, vertices[i]);
    let above = false, below = false;
    for (const v of vertices) { const s = dot(normal, v) - d; if (s > EPS) above = true; else if (s < -EPS) below = true; }
    if (above && below) continue;
    if (d < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
    const members = vertices.map((_, index) => index).filter(index => Math.abs(dot(normal, vertices[index]) - Math.abs(d)) < EPS);
    const key = members.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    // Round the face, counterclockwise seen from outside.
    const centre = members.reduce((sum, index) => ({ x: sum.x + vertices[index].x / members.length, y: sum.y + vertices[index].y / members.length, z: sum.z + vertices[index].z / members.length }), { x: 0, y: 0, z: 0 });
    const u = unit(sub(vertices[members[0]], centre));
    const w = cross(normal, u);
    members.sort((p, q) => {
      const a = sub(vertices[p], centre), b = sub(vertices[q], centre);
      return Math.atan2(dot(a, w), dot(a, u)) - Math.atan2(dot(b, w), dot(b, u));
    });
    faces.push(members);
  }
  return faces;
}

function withEdges(vertices: Vec[], faces: number[][]): Polyhedron {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (const face of faces) {
    face.forEach((a, index) => {
      const b = face[(index + 1) % face.length];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (!seen.has(key)) { seen.add(key); edges.push(a < b ? [a, b] : [b, a]); }
    });
  }
  return { vertices, faces, edges };
}

export function polyhedron(solid: Solid): Polyhedron {
  const vertices = corners(solid).map(unit);
  return withEdges(vertices, buildFaces(vertices));
}

// Shapes with a number to turn: the corners of a prism or pyramid, how finely a geodesic polyhedron is cut.
export type Kind = Solid | "prism" | "pyramid" | "geodesic";
export const KINDS: readonly Kind[] = [...SOLIDS, "prism", "pyramid", "geodesic"];
export const PARAMETERS: Partial<Record<Kind, { min: number; max: number; initial: number }>> = {
  prism: { min: 3, max: 20, initial: 5 },
  pyramid: { min: 3, max: 20, initial: 5 },
  geodesic: { min: 1, max: 5, initial: 2 },
};

// An n-gon on a ring with the same ring above (prism) or one point above (pyramid); the origin is inside either.
function ring(n: number, y: number, radius: number): Vec[] {
  return Array.from({ length: n }, (_, k) => ({ x: radius * Math.cos((2 * Math.PI * k) / n), y, z: radius * Math.sin((2 * Math.PI * k) / n) }));
}

export function prism(n: number): Polyhedron {
  const vertices = [...ring(n, 0.6, 0.8), ...ring(n, -0.6, 0.8)];
  return withEdges(vertices, buildFaces(vertices));
}

export function pyramid(n: number): Polyhedron {
  const vertices = [...ring(n, -0.5, 0.9), { x: 0, y: 1, z: 0 }];
  return withEdges(vertices, buildFaces(vertices));
}

// The icosahedron with each face cut into frequency² small triangles, the new corners pushed out onto the sphere:
// 10 f² + 2 vertices, 30 f² edges and 20 f² faces.
export function geodesic(frequency: number): Polyhedron {
  const base = polyhedron("icosa");
  const vertices: Vec[] = [];
  const index = new Map<string, number>();
  const at = (p: Vec) => {
    const q = unit(p);
    // Rounded to integers (+ 0 turns -0 into 0), so the same corner reached from two faces is one vertex.
    const key = `${Math.round(q.x * 1e6) + 0},${Math.round(q.y * 1e6) + 0},${Math.round(q.z * 1e6) + 0}`;
    let found = index.get(key);
    if (found === undefined) { found = vertices.length; vertices.push(q); index.set(key, found); }
    return found;
  };
  const faces: number[][] = [];
  const f = frequency;
  for (const [ia, ib, ic] of base.faces) {
    const a = base.vertices[ia], b = base.vertices[ib], c = base.vertices[ic];
    const point = (i: number, j: number): Vec => ({
      x: a.x + ((b.x - a.x) * i + (c.x - a.x) * j) / f,
      y: a.y + ((b.y - a.y) * i + (c.y - a.y) * j) / f,
      z: a.z + ((b.z - a.z) * i + (c.z - a.z) * j) / f,
    });
    for (let i = 0; i < f; i++) for (let j = 0; i + j < f; j++) {
      faces.push([at(point(i, j)), at(point(i + 1, j)), at(point(i, j + 1))]);
      if (i + j < f - 1) faces.push([at(point(i + 1, j)), at(point(i + 1, j + 1)), at(point(i, j + 1))]);
    }
  }
  return withEdges(vertices, faces);
}

export function build(kind: Kind, n = PARAMETERS[kind]?.initial ?? 0): Polyhedron {
  if (kind === "prism") return prism(n);
  if (kind === "pyramid") return pyramid(n);
  if (kind === "geodesic") return geodesic(n);
  return polyhedron(kind);
}

// Turned about the vertical axis by `yaw`, then about the horizontal one by `pitch`.
export function rotate(p: Vec, yaw: number, pitch: number): Vec {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  return { x: x1, y: p.y * cx - z1 * sx, z: p.y * sx + z1 * cx };
}

// Perspective: the eye is `distance` in front of the centre, looking at it; z grows away from the eye.
export function project(p: Vec, size: number, distance = 4): { x: number; y: number; scale: number } {
  const scale = distance / (distance + p.z);
  return { x: size / 2 + p.x * scale * size * 0.3, y: size / 2 - p.y * scale * size * 0.3, scale };
}

export const LIGHT: Vec = unit({ x: -0.4, y: 0.7, z: -0.6 });

// How bright a face is (0.25..1), from the angle between its normal and the light.
export function brightness(normal: Vec): number {
  return 0.25 + 0.75 * Math.max(0, dot(normal, LIGHT));
}

export function faceNormal(vertices: Vec[], face: number[]): Vec {
  const a = vertices[face[0]], b = vertices[face[1]], c = vertices[face[2]];
  return unit(cross(sub(b, a), sub(c, a)));
}
