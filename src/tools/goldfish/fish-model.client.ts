// A goldfish in 3D, built from numbers rather than loaded: its body from cross-sections along its length (how high the
// back, how deep the belly and how wide it is at each point, so that it narrows into the stalk before the tail and has a
// head with a mouth and gill covers), painted with its colours here (so that each red-and-white fish is patched its own
// way) under textures baked in Blender from these same shapes (public/goldfish/, scripts/goldfish/: the scales, their
// bumps and the shade the fins cast; the fins' rays; the irises), eyes with a golden iris and a pupil (a demekin's on stalks), and the fins a
// goldfish has: the dorsal fin, two pectoral and two pelvic fins, the anal fin(s) and the tail, single and forked for a
// wakin, double for a ryukin and a demekin. Each fin is a fan of rays whose skin is clearer towards its edge. The fish's
// own units: nose towards +z, back towards +y, about 1 long. Browser only (three.js).
import * as THREE from "three";
import { random, type Fish, type Kind } from "./swim";

type V3 = THREE.Vector3;
const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---- The body ----

// How finely the body is made: enough for a smooth outline, few enough to bend ten fish every frame on a phone.
const BODY_RINGS = 48, BODY_AROUND = 32;

// Along the body, u from 0 (the end of the tail stalk) to 1 (the tip of the snout): [u, back above the spine, belly below
// it, half the width, height of the spine].
type Key = [number, number, number, number, number];
type Shape = { keys: Key[]; zTail: number; zNose: number; gill: number; eye: { u: number; phi: number; r: number }; dorsal: number; tail: { length: number; twin: boolean } };

const SHAPES: Record<Kind, Shape> = {
  // Streamlined, with a long tail stalk and a single forked tail.
  wakin: {
    keys: [[0, 0.045, 0.045, 0.024, 0], [0.1, 0.058, 0.058, 0.03, 0], [0.25, 0.115, 0.105, 0.052, 0.004], [0.45, 0.165, 0.145, 0.08, 0.008], [0.6, 0.17, 0.145, 0.085, 0.006],
      [0.75, 0.145, 0.125, 0.08, 0], [0.86, 0.112, 0.098, 0.072, -0.006], [0.94, 0.074, 0.066, 0.054, -0.012], [0.985, 0.036, 0.034, 0.028, -0.016], [1, 0, 0, 0, -0.018]],
    zTail: -0.5, zNose: 0.5, gill: 0.74, eye: { u: 0.865, phi: 1.12, r: 0.036 }, dorsal: 0.2, tail: { length: 0.46, twin: false },
  },
  // Short and deep, the back rising steeply behind the head into a hump.
  ryukin: {
    keys: [[0, 0.05, 0.05, 0.026, 0], [0.1, 0.07, 0.07, 0.034, 0], [0.25, 0.19, 0.165, 0.075, 0.01], [0.42, 0.265, 0.205, 0.105, 0.02], [0.56, 0.27, 0.2, 0.11, 0.02],
      [0.68, 0.215, 0.165, 0.1, 0.006], [0.8, 0.14, 0.12, 0.084, -0.01], [0.9, 0.086, 0.078, 0.064, -0.02], [0.97, 0.046, 0.042, 0.036, -0.026], [1, 0, 0, 0, -0.028]],
    zTail: -0.4, zNose: 0.42, gill: 0.7, eye: { u: 0.85, phi: 1.28, r: 0.034 }, dorsal: 0.3, tail: { length: 0.74, twin: true },
  },
  // An egg of a body, with eyes on stalks.
  demekin: {
    keys: [[0, 0.05, 0.05, 0.026, 0], [0.12, 0.08, 0.076, 0.04, 0], [0.3, 0.18, 0.17, 0.085, 0.006], [0.5, 0.22, 0.2, 0.1, 0.01], [0.66, 0.2, 0.18, 0.1, 0.006],
      [0.8, 0.15, 0.13, 0.09, 0], [0.9, 0.1, 0.09, 0.075, -0.008], [0.96, 0.06, 0.055, 0.05, -0.014], [0.99, 0.03, 0.028, 0.025, -0.018], [1, 0, 0, 0, -0.02]],
    zTail: -0.42, zNose: 0.44, gill: 0.72, eye: { u: 0.83, phi: 1.4, r: 0.062 }, dorsal: 0.22, tail: { length: 0.6, twin: true },
  },
};

// The body's measures at u, by a smooth curve through the keys (Catmull-Rom, for keys unevenly spaced).
function measures(keys: Key[], u: number): [number, number, number, number] {
  let i = 0;
  while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const h = k2[0] - k1[0], t = h > 0 ? (u - k1[0]) / h : 0;
  const t2 = t * t, t3 = t2 * t;
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 1; c <= 4; c++) {
    const m1 = ((k2[c] - k0[c]) / Math.max(1e-6, k2[0] - k0[0])) * h;
    const m2 = ((k3[c] - k1[c]) / Math.max(1e-6, k3[0] - k1[0])) * h;
    out[c - 1] = (2 * t3 - 3 * t2 + 1) * k1[c] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * k2[c] + (t3 - t2) * m2;
  }
  // Never negative (the curve may dip just before the tip).
  out[0] = Math.max(0, out[0]); out[1] = Math.max(0, out[1]); out[2] = Math.max(0, out[2]);
  return out;
}

// A point on the body: u along it, phi around it (0 on the back, pi under the belly, positive to the fish's left, +x).
// The section is a rounded oval (a superellipse), taller than it is wide.
function bodyPoint(shape: Shape, u: number, phi: number): V3 {
  const [top, bottom, width, centre] = measures(shape.keys, u);
  const c = Math.cos(phi), s = Math.sin(phi), e = 0.86;
  const y = centre + (c >= 0 ? top : bottom) * Math.sign(c) * Math.abs(c) ** e;
  const x = width * Math.sign(s) * Math.abs(s) ** e;
  return vec(x, y, shape.zTail + u * (shape.zNose - shape.zTail));
}

function bodyNormal(shape: Shape, u: number, phi: number): V3 {
  const du = 0.004, dp = 0.01;
  const a = bodyPoint(shape, Math.min(1, u + du), phi).sub(bodyPoint(shape, Math.max(0, u - du), phi));
  const b = bodyPoint(shape, u, phi + dp).sub(bodyPoint(shape, u, phi - dp));
  return a.cross(b).normalize();
}

type Palette = { back: string; flank: string; belly: string; finRoot: string; finEdge: string; lips: string; iris: string };
const PALETTES: Record<Kind, Palette> = {
  wakin: { back: "#a8200c", flank: "#ee4512", belly: "#f6d8b2", finRoot: "#ef4a16", finEdge: "#f7a070", lips: "#f7a98a", iris: "#b9781f" },
  ryukin: { back: "#c02a10", flank: "#f2531c", belly: "#fbeadb", finRoot: "#f2622a", finEdge: "#fdd2bc", lips: "#f8b69a", iris: "#c0812a" },
  demekin: { back: "#040406", flank: "#0d0c10", belly: "#2a231e", finRoot: "#0d0c10", finEdge: "#3a3542", lips: "#2e2a2e", iris: "#3e352b" },
};

// The body as a mesh: rings along u (closer together at both ends), each a loop around. Painted with vertex colours:
// dark back, bright flanks, pale belly, the groove at the edge of the gill cover, and for some red fish patches of white.
// `gill` marks the gill covers (they open and close as the fish breathes); the UVs hold the head still for the scales
// (the head of a goldfish has none).
function bodyGeometry(shape: Shape, palette: Palette, next: () => number, patchy: boolean): THREE.BufferGeometry {
  const RINGS = BODY_RINGS, AROUND = BODY_AROUND;
  const positions: number[] = [], colours: number[] = [], uvs: number[] = [], gill: number[] = [], indices: number[] = [];
  const back = new THREE.Color(palette.back), flank = new THREE.Color(palette.flank), belly = new THREE.Color(palette.belly), white = new THREE.Color("#fff6ee");
  const colour = new THREE.Color();
  const [p1, p2, p3] = [next() * 6, next() * 6, next() * 6];
  for (let i = 0; i <= RINGS; i++) {
    const u = 0.5 - 0.5 * Math.cos((Math.PI * i) / RINGS);
    for (let j = 0; j <= AROUND; j++) {
      const phi = (j / AROUND) * Math.PI * 2;
      const point = bodyPoint(shape, u, phi);
      const c = Math.cos(phi), sideness = Math.abs(Math.sin(phi));
      // The gill cover: a plate from its edge forwards, raised a little, with a groove at the edge.
      const fromEdge = u - shape.gill;
      const onSide = THREE.MathUtils.smoothstep(sideness, 0.25, 0.55) * THREE.MathUtils.smoothstep(c, -0.75, -0.45);
      const plate = fromEdge > 0 ? onSide * THREE.MathUtils.smoothstep(fromEdge, 0, 0.012) * (1 - THREE.MathUtils.smoothstep(fromEdge, 0.05, 0.13)) : 0;
      if (plate > 0) point.add(bodyNormal(shape, u, phi).multiplyScalar(0.005 * plate));
      positions.push(point.x, point.y, point.z);
      gill.push(plate);
      // Along the body and around it from the back: the coordinates the baked textures are drawn in.
      uvs.push(u, j / AROUND);

      if (c >= 0) colour.copy(flank).lerp(back, THREE.MathUtils.smoothstep(c, 0.15, 0.95));
      else colour.copy(flank).lerp(belly, THREE.MathUtils.smoothstep(-c, 0.05, 0.75));
      if (patchy) {
        // Red-and-white (sarasa): blotches of white from a smooth pattern over the body, fewer towards the back.
        const n = Math.sin(point.z * 9 + p1) * Math.cos(point.y * 11 + p2) + Math.sin(point.x * 18 + point.z * 6 + p3) * 0.45 + Math.sin(point.z * 23 + p1 * 2) * 0.2;
        const lift = Math.max(0, c) * 0.4;
        colour.lerp(white, THREE.MathUtils.smoothstep(n, 0.42 + lift, 0.62 + lift) * 0.92);
      }
      const groove = onSide * Math.exp(-((fromEdge - 0.004) ** 2) / 0.00004);
      colour.multiplyScalar(1 - groove * 0.35);
      // The snout a little paler, as goldfish have it.
      colour.lerp(new THREE.Color(palette.lips), THREE.MathUtils.smoothstep(u, 0.95, 1) * 0.6);
      colours.push(colour.r, colour.g, colour.b);
    }
  }
  const row = AROUND + 1;
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < AROUND; j++) {
    const a = i * row + j, b = a + 1, c2 = a + row, d = c2 + 1;
    indices.push(a, c2, b, b, c2, d);
  }
  // A cap over the end of the tail stalk (the tail fin covers it).
  const centre = positions.length / 3;
  const end = bodyPoint(shape, 0, 0).add(bodyPoint(shape, 0, Math.PI)).multiplyScalar(0.5);
  positions.push(end.x, end.y, end.z);
  colours.push(flank.r, flank.g, flank.b);
  uvs.push(0, 0);
  gill.push(0);
  for (let j = 0; j < AROUND; j++) indices.push(centre, j, j + 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("gill", new THREE.Float32BufferAttribute(gill, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  smoothSeam(geometry, RINGS, AROUND);
  return geometry;
}

// The loop around each ring starts and ends at the same place (on the back); their normals are averaged so no seam shows.
function smoothSeam(geometry: THREE.BufferGeometry, rings: number, around: number) {
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const row = around + 1;
  for (let i = 0; i <= rings; i++) {
    const a = i * row, b = a + around;
    const n = vec(normal.getX(a) + normal.getX(b), normal.getY(a) + normal.getY(b), normal.getZ(a) + normal.getZ(b)).normalize();
    normal.setXYZ(a, n.x, n.y, n.z);
    normal.setXYZ(b, n.x, n.y, n.z);
  }
}

// ---- Fins ----

type FinKind = "caudal" | "dorsal" | "pectoral" | "pelvic" | "anal";
type FinSpec = {
  kind: FinKind;
  side: number;
  // Where the fin grows from (w from 0 to 1 along its root), which way its rays point there, and how long they are.
  root: (w: number) => V3;
  direction: (w: number) => V3;
  length: (w: number) => number;
  // A wavy edge, and a droop of the rays towards their ends.
  ruffle: number;
  droop: number;
};

// A fin as a grid of its rays (s from root to edge) across its root (w): positions in the fish's units, with the s and w
// of each vertex, and the point on the root it grows from (for rowing the paired fins).
function finGeometry(spec: FinSpec, palette: Palette, segmentsS = 10, segmentsW = 10): THREE.BufferGeometry {
  const positions: number[] = [], uvs: number[] = [], fin: number[] = [], roots: number[] = [], colours: number[] = [], indices: number[] = [];
  const rootColour = new THREE.Color(palette.finRoot), edgeColour = new THREE.Color(palette.finEdge), colour = new THREE.Color();
  for (let i = 0; i <= segmentsS; i++) {
    const s = i / segmentsS;
    for (let j = 0; j <= segmentsW; j++) {
      const w = j / segmentsW;
      const root = spec.root(w), direction = spec.direction(w).normalize();
      const along = spec.root(Math.min(1, w + 0.01)).sub(spec.root(Math.max(0, w - 0.01)));
      const across = along.lengthSq() > 1e-10 ? along.clone().cross(direction).normalize() : vec(1, 0, 0);
      const point = root.clone().addScaledVector(direction, s * spec.length(w));
      point.addScaledVector(across, spec.ruffle * s * s * Math.sin(w * Math.PI * 7 + s * 2));
      point.y -= spec.droop * s * s;
      positions.push(point.x, point.y, point.z);
      roots.push(root.x, root.y, root.z);
      uvs.push(w, s);
      fin.push(s);
      colour.copy(rootColour).lerp(edgeColour, THREE.MathUtils.smoothstep(s, 0.15, 1));
      colours.push(colour.r, colour.g, colour.b);
    }
  }
  const row = segmentsW + 1;
  for (let i = 0; i < segmentsS; i++) for (let j = 0; j < segmentsW; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("fin", new THREE.Float32BufferAttribute(fin, 1));
  geometry.setAttribute("root", new THREE.Float32BufferAttribute(roots, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const lerpV = (a: V3, b: V3, t: number) => a.clone().lerp(b, t);
const turnAboutZ = (v: V3, angle: number) => vec(v.x * Math.cos(angle) - v.y * Math.sin(angle), v.x * Math.sin(angle) + v.y * Math.cos(angle), v.z);

function finSpecs(kind: Kind, shape: Shape): FinSpec[] {
  const top = (u: number, inset = 0.006) => { const p = bodyPoint(shape, u, 0); p.y -= inset; return p; };
  const bottom = (u: number, inset = 0.006) => { const p = bodyPoint(shape, u, Math.PI); p.y += inset; return p; };
  const at = (u: number, phi: number, inset = 0.004) => bodyPoint(shape, u, phi).addScaledVector(bodyNormal(shape, u, phi), -inset);
  const specs: FinSpec[] = [];

  // The dorsal fin, along the back from behind the head; tallest at its front.
  const dorsalFrom = kind === "ryukin" ? 0.6 : 0.62, dorsalTo = kind === "ryukin" ? 0.22 : 0.28;
  specs.push({
    kind: "dorsal", side: 0,
    root: w => top(dorsalFrom + (dorsalTo - dorsalFrom) * w),
    direction: w => vec(0, 1 - 0.45 * w, -0.5 - 0.9 * w),
    length: w => shape.dorsal * (1 - 0.6 * w) * (0.82 + 0.18 * Math.sin(Math.PI * Math.min(1, w * 1.6))),
    ruffle: 0.006, droop: kind === "ryukin" ? 0.03 : 0,
  });

  // The tail: one fan, forked, for a wakin; two fans splayed to both sides (an X seen from behind) for the others.
  const stalk = (w: number) => lerpV(bottom(0.012, 0.012), top(0.012, 0.012), 0.1 + 0.8 * w);
  const fan = (w: number) => { const a = (w - 0.5) * (shape.tail.twin ? 1.9 : 1.75); return vec(0, Math.sin(a), -Math.cos(a)); };
  const forked = (w: number, depth: number) => shape.tail.length * (1 - depth + depth * Math.abs(2 * w - 1) ** 0.65);
  if (!shape.tail.twin) {
    specs.push({ kind: "caudal", side: 0, root: stalk, direction: fan, length: w => forked(w, 0.42), ruffle: 0.008, droop: 0 });
  } else {
    for (const side of [-1, 1]) {
      const tilt = side * 0.62;
      specs.push({
        kind: "caudal", side,
        root: w => stalk(w).add(vec(side * 0.006, 0, 0)),
        direction: w => turnAboutZ(fan(w), tilt),
        length: w => forked(w, 0.35),
        ruffle: 0.022, droop: kind === "ryukin" ? 0.1 : 0.07,
      });
    }
  }

  for (const side of [-1, 1]) {
    // Pectoral fins: low on the sides just behind the gill covers, swept back.
    const pu = shape.gill - 0.04;
    specs.push({
      kind: "pectoral", side,
      root: w => at(pu - 0.05 * w, side * (2.15 + 0.12 * w)),
      direction: w => vec(side * (0.75 - 0.2 * w), -0.35, -0.55 - 0.3 * w),
      length: w => (kind === "ryukin" ? 0.15 : 0.13) * (1 - 0.35 * w) * (0.7 + 0.3 * Math.sin(Math.PI * (0.2 + 0.8 * w))),
      ruffle: 0.004, droop: 0,
    });
    // Pelvic fins: under the belly, half way along.
    specs.push({
      kind: "pelvic", side,
      root: w => at(0.5 - 0.06 * w, side * (2.75 + 0.05 * w)),
      direction: w => vec(side * 0.3, -0.8, -0.5 - 0.3 * w),
      length: w => (kind === "ryukin" ? 0.17 : 0.13) * (1 - 0.4 * w),
      ruffle: 0.005, droop: 0,
    });
  }

  // The anal fin, under the tail stalk: single for a wakin, a pair for the fancy kinds.
  const anal = (side: number): FinSpec => ({
    kind: "anal", side,
    root: w => bottom(0.24 - 0.12 * w).add(vec(side * 0.008, 0, 0)),
    direction: w => vec(side * 0.4, -0.75, -0.6 - 0.4 * w),
    length: w => (kind === "wakin" ? 0.1 : 0.13) * (1 - 0.45 * w),
    ruffle: 0.004, droop: 0,
  });
  if (kind === "wakin") specs.push(anal(0)); else specs.push(anal(-1), anal(1));
  return specs;
}

// ---- Textures (baked by scripts/goldfish/make-textures.mjs) ----

export type FishTextures = { fin: THREE.Texture; kinds: Record<Kind, { shading: THREE.Texture; normal: THREE.Texture; iris: THREE.Texture }> };

// Loads every texture before the first fish is made (so that none shows untextured for a moment).
export async function loadFishTextures(base = "/goldfish/"): Promise<FishTextures> {
  const loader = new THREE.TextureLoader();
  const load = async (name: string, colour: boolean) => {
    const texture = await loader.loadAsync(base + name);
    // The shading, bumps and fins are numbers to multiply by, not colours; the iris is a colour.
    texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 4;
    return texture;
  };
  const kinds = {} as FishTextures["kinds"];
  const [fin] = await Promise.all([
    load("fin.webp", false),
    ...(["wakin", "ryukin", "demekin"] as const).map(async kind => {
      const [shading, normal, iris] = await Promise.all([load(`${kind}-body.webp`, false), load(`${kind}-normal.webp`, false), load(`${kind}-iris.webp`, true)]);
      kinds[kind] = { shading, normal, iris };
    }),
  ]);
  return { fin, kinds };
}

// ---- A fish ----

type FinView = { mesh: THREE.Mesh; base: Float32Array; roots: Float32Array; spec: FinSpec };
export type FishView = {
  fish: Fish; group: THREE.Group; body: THREE.Mesh; bodyBase: Float32Array; gill: Float32Array; fins: FinView[];
  mouth: THREE.Group; zTail: number; yaw: number; pitch: number; bend: number; breath: number; frame: number;
};

export function makeFish(fish: Fish, env: THREE.Texture, textures: FishTextures): FishView {
  const next = random(fish.seed);
  const shape = SHAPES[fish.kind], palette = PALETTES[fish.kind];
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.setScalar(fish.size);
  group.add(holder);

  const patchy = fish.kind !== "demekin" && next() < (fish.kind === "ryukin" ? 0.65 : 0.4);
  const bodyGeo = bodyGeometry(shape, palette, next, patchy);
  // Wet, scaled skin with a little of the rainbow sheen goldfish scales have; a demekin's is velvety. The baked shading
  // keeps 0.85 for "as painted" (so a scale's rim can be brighter): the colour makes up for it.
  const own = textures.kinds[fish.kind];
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(1 / 0.85, 1 / 0.85, 1 / 0.85),
    vertexColors: true, map: own.shading, normalMap: own.normal, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.22, envMap: env, envMapIntensity: 0.5,
    iridescence: fish.kind === "demekin" ? 0.15 : 0.4, iridescenceIOR: 1.35,
    sheen: fish.kind === "demekin" ? 0.8 : 0.15, sheenColor: new THREE.Color(fish.kind === "demekin" ? "#4a4a58" : "#ffd9b0"), sheenRoughness: 0.5,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMaterial);
  // Parts are named so a model made from these (scripts/goldfish/) can tell them apart.
  body.name = "body";
  body.castShadow = body.receiveShadow = true;
  holder.add(body);

  // The mouth: soft lips round a dark opening at the tip of the snout; it opens and closes as the fish breathes.
  const tip = bodyPoint(shape, 1, 0);
  const mouth = new THREE.Group();
  mouth.position.set(0, tip.y - 0.004, tip.z - 0.006);
  const lips = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.009, 10, 24), new THREE.MeshPhysicalMaterial({ color: palette.lips, roughness: 0.4, clearcoat: 0.6, envMap: env, envMapIntensity: 0.4 }));
  const opening = new THREE.Mesh(new THREE.CircleGeometry(0.018, 20), new THREE.MeshStandardMaterial({ color: "#2a0d08", roughness: 0.9 }));
  opening.position.z = 0.002;
  lips.name = "lips";
  opening.name = "mouth";
  mouth.add(lips, opening);
  holder.add(mouth);

  // Nostrils: two small dark dimples above the mouth.
  const nostrilMaterial = new THREE.MeshStandardMaterial({ color: fish.kind === "demekin" ? "#000000" : "#5a1408", roughness: 0.8 });
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), nostrilMaterial);
    nostril.position.copy(bodyPoint(shape, 0.955, side * 0.75));
    nostril.name = "nostril";
    holder.add(nostril);
  }

  // Eyes: a golden iris round a black pupil under a clear, glossy cornea, set into the head (a demekin's on stalks).
  const irisMaterial = new THREE.MeshPhysicalMaterial({ map: own.iris, metalness: 0.25, roughness: 0.4, envMap: env, envMapIntensity: 0.6 });
  const pupilMaterial = new THREE.MeshPhysicalMaterial({ color: "#020203", roughness: 0.15, envMap: env });
  const corneaMaterial = new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.18, roughness: 0, clearcoat: 1, envMap: env, envMapIntensity: 2, depthWrite: false });
  const stalkMaterial = new THREE.MeshPhysicalMaterial({ color: palette.flank, roughness: 0.4, sheen: 0.8, sheenColor: new THREE.Color("#4a4a58"), envMap: env, envMapIntensity: 0.4 });
  const { u: eu, phi: ephi, r } = shape.eye;
  for (const side of [-1, 1]) {
    const surface = bodyPoint(shape, eu, side * ephi);
    const normal = bodyNormal(shape, eu, side * ephi);
    // Looking out sideways and a little forwards.
    const look = normal.clone().add(vec(0, 0, 0.25)).normalize();
    const stalked = fish.kind === "demekin";
    const centre = surface.clone().addScaledVector(normal, stalked ? r * 0.5 : -r * 0.45);
    const eye = new THREE.Group();
    eye.position.copy(centre);
    eye.lookAt(centre.clone().add(look));
    const iris = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), irisMaterial);
    // The pupil large, as a goldfish's is: the iris a golden ring round it.
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.74, 20, 14), pupilMaterial);
    pupil.position.z = r * 0.36;
    const cornea = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 24, 16), corneaMaterial);
    iris.name = "iris"; pupil.name = "pupil"; cornea.name = "cornea";
    eye.add(iris, pupil, cornea);
    holder.add(eye);
    if (stalked) {
      // A short, soft stalk that widens into the head.
      const length = r * 0.7;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 1.15, length, 24, 1, true), stalkMaterial);
      stalk.position.copy(surface.clone().addScaledVector(normal, length / 2 - r * 0.25));
      stalk.quaternion.setFromUnitVectors(vec(0, 1, 0), normal);
      stalk.name = "stalk";
      holder.add(stalk);
    }
  }

  const finMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true, transparent: true, map: textures.fin, roughness: 0.42, side: THREE.DoubleSide, depthWrite: false,
    envMap: env, envMapIntensity: 0.35, sheen: 0.3, sheenColor: new THREE.Color("#ffffff"),
  });
  const fins: FinView[] = finSpecs(fish.kind, shape).map(spec => {
    const geometry = finGeometry(spec, palette);
    const mesh = new THREE.Mesh(geometry, finMaterial);
    mesh.name = `fin_${spec.kind}_${spec.side < 0 ? "r" : spec.side > 0 ? "l" : "c"}`;
    mesh.castShadow = true;
    mesh.renderOrder = 2;
    holder.add(mesh);
    return { mesh, spec, base: Float32Array.from(geometry.getAttribute("position").array as Float32Array), roots: Float32Array.from(geometry.getAttribute("root").array as Float32Array) };
  });

  return {
    fish, group, body, bodyBase: Float32Array.from(bodyGeo.getAttribute("position").array as Float32Array),
    gill: Float32Array.from(bodyGeo.getAttribute("gill").array as Float32Array), fins, mouth, zTail: shape.zTail,
    yaw: Math.atan2(fish.vel.x, fish.vel.z), pitch: 0, bend: 0, breath: next() * 6, frame: fish.id,
  };
}

// Swimming: the body bends in a wave that runs from the head to the tail (more towards the tail, and harder the faster it
// swims), and curves into the turn when it turns; every fin moves with the body where it grows, the tail and the dorsal
// fin ripple from root to edge, the paired fins row. The fish breathes: the mouth and the gill covers open and close.
export function swimFish(view: FishView, dt: number) {
  const { fish } = view;
  const speed = Math.hypot(fish.vel.x, fish.vel.y, fish.vel.z);
  const vigour = 0.5 + Math.min(2.4, speed * 6);
  const wave = (z: number) => {
    const t = THREE.MathUtils.clamp((0.25 - z) / 0.7, 0, 1);
    return (Math.sin(fish.phase - z * 5) * 0.042 * vigour + view.bend) * t * t;
  };
  // Behind the tail stalk the tail is carried straight on, along the slope of the body there.
  const zt = view.zTail, slope = (wave(zt) - wave(zt + 0.04)) / 0.04;
  const sway = (z: number) => (z >= zt ? wave(z) : wave(zt) + slope * (zt - z));

  let rate = 0;
  if (speed > 0.01) {
    const yaw = Math.atan2(fish.vel.x, fish.vel.z);
    let turn = yaw - view.yaw;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    const step = turn * Math.min(1, dt * 6);
    view.yaw += step;
    rate = dt > 0 ? step / dt : 0;
    const pitch = THREE.MathUtils.clamp(-Math.asin(fish.vel.y / speed), -0.6, 0.6);
    view.pitch += ((fish.pecking > 0 ? 0.55 + Math.sin(fish.phase * 1.7) * 0.08 : pitch) - view.pitch) * Math.min(1, dt * 4);
  }
  view.bend += (THREE.MathUtils.clamp(rate * 0.06, -0.14, 0.14) - view.bend) * Math.min(1, dt * 5);
  view.breath += dt * (2.2 + speed * 4);
  const breath = 0.5 + 0.5 * Math.sin(view.breath);

  const position = view.body.geometry.getAttribute("position") as THREE.BufferAttribute;
  const array = position.array as Float32Array;
  for (let i = 0; i < position.count; i++) {
    const x = view.bodyBase[i * 3];
    array[i * 3] = x * (1 + view.gill[i] * 0.06 * breath) + sway(view.bodyBase[i * 3 + 2]);
  }
  position.needsUpdate = true;
  // The shading follows the bending every other frame, the fins' every third (the most costly part, hardly seen).
  view.frame++;
  if (view.frame % 2 === 0) { view.body.geometry.computeVertexNormals(); smoothSeam(view.body.geometry, BODY_RINGS, BODY_AROUND); }
  view.mouth.scale.set(0.85 + breath * 0.3, 0.8 + breath * 0.4, 1);
  view.mouth.position.x = sway(view.mouth.position.z);

  for (const fin of view.fins) {
    const geometry = fin.mesh.geometry;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const s = geometry.getAttribute("fin") as THREE.BufferAttribute;
    const out = pos.array as Float32Array;
    const { kind, side } = fin.spec;
    const row = kind === "pectoral" ? Math.sin(fish.phase * 0.8 + side) * 0.5 : kind === "pelvic" ? Math.sin(fish.phase * 0.6 + 1 + side) * 0.2 : 0;
    const cos = Math.cos(row * side), sin = Math.sin(row * side);
    for (let i = 0; i < pos.count; i++) {
      const k = s.getX(i);
      let x = fin.base[i * 3], y = fin.base[i * 3 + 1], z = fin.base[i * 3 + 2];
      if (row) {
        // Rowing: turned about the upright through the point it grows from.
        const rx = fin.roots[i * 3], rz = fin.roots[i * 3 + 2];
        const dx = x - rx, dz = z - rz;
        x = rx + dx * cos - dz * sin;
        z = rz + dx * sin + dz * cos;
      }
      const amplitude = kind === "caudal" ? 0.16 : kind === "dorsal" ? 0.035 : kind === "anal" ? 0.03 : 0.015;
      const flutter = Math.sin(fish.phase - 1.2 - k * (kind === "caudal" ? 2.6 : 1.6)) * amplitude * vigour * k ** 1.5;
      out[i * 3] = x + sway(z) + flutter;
      out[i * 3 + 1] = y + (kind === "caudal" && side ? Math.sin(fish.phase * 0.5 - k * 2) * 0.02 * k * k : 0);
      out[i * 3 + 2] = z;
    }
    pos.needsUpdate = true;
    if (view.frame % 3 === 0) geometry.computeVertexNormals();
  }

  view.group.position.set(fish.pos.x, fish.pos.y, fish.pos.z);
  // The head swings a little against the tail.
  view.group.rotation.set(view.pitch, view.yaw - Math.sin(fish.phase) * 0.025 * vigour, 0, "YXZ");
}

// A fish's parts on their own, straight and at its own size, for scripts/goldfish/make-textures.mjs (which bakes the
// textures from them, so no textures are needed here).
export function buildFish(kind: Kind, seed: number): THREE.Object3D {
  const blank = new THREE.Texture();
  const textures: FishTextures = { fin: blank, kinds: { wakin: { shading: blank, normal: blank, iris: blank }, ryukin: { shading: blank, normal: blank, iris: blank }, demekin: { shading: blank, normal: blank, iris: blank } } };
  const fish = { id: 1, kind, pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0.15 }, size: 1, target: { x: 0, y: 0, z: 0 }, retarget: 0, fleeing: 0, fleeFrom: { x: 0, y: 0, z: 0 }, hunger: 0, eaten: 0, pace: 1, toFloor: false, pecking: 0, phase: 0, seed };
  return makeFish(fish, blank, textures).group.children[0];
}
