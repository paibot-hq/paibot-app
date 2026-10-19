// The goldfish bowl drawn in 3D with three.js: a glass bowl with a frilled rim, water whose surface ripples, gravel,
// waving weed, bubbles from an air stone and the fish, each made of a body, eyes and fins that wave as it swims. What the
// fish do comes from swim.ts; this file only draws it and turns taps into food or a startle. Browser only: it is loaded
// by the page after mounting.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BOWL_R, FLOOR_Y, MAX_FOOD, SURFACE_R, WATER_Y, addFish, createWorld, dropFood, random, removeFish, startle, step, type Fish, type Kind, type World } from "./swim";

export type Stats = { fish: number; food: number; eaten: number; kinds: Kind[] };
export type Aquarium = {
  addFish(kind: Kind): boolean;
  removeFish(): boolean;
  feed(): void;
  setNight(night: boolean): void;
  resetView(): void;
  dispose(): void;
};

// Where the glass ends: open above OPEN_Y, with a flat foot at BASE_Y.
const OPEN_Y = 0.72;
const BASE_Y = -0.94;
const STEP = 1 / 120;

// ---- The fish ----

// A body of revolution along +z (nose forward), from a profile of [radius, z] from tail to nose, made narrower than it is
// tall (goldfish are flat from side to side).
function bodyGeometry(profile: [number, number][], width: number, height: number): THREE.BufferGeometry {
  const points = profile.map(([r, z]) => new THREE.Vector2(r, z));
  const geometry = new THREE.LatheGeometry(points, 28);
  geometry.rotateX(Math.PI / 2);
  geometry.scale(width, height, 1);
  geometry.computeVertexNormals();
  return geometry;
}

// A fin as a grid (so it can bend smoothly): `s` runs along it from its root (0) to its edge (1) in the direction
// `along`, `w` across it from `from` to `to` (as functions of s). The `s` of each vertex is kept for bending it.
function finGeometry(segmentsS: number, segmentsW: number, shape: (s: number, w: number) => [number, number, number]): THREE.BufferGeometry {
  const positions: number[] = [], sValues: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segmentsS; i++) {
    for (let j = 0; j <= segmentsW; j++) {
      const s = i / segmentsS, w = j / segmentsW;
      positions.push(...shape(s, w));
      sValues.push(s);
      uvs.push(w, s);
    }
  }
  const row = segmentsW + 1;
  for (let i = 0; i < segmentsS; i++) for (let j = 0; j < segmentsW; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("fin", new THREE.Float32BufferAttribute(sValues, 1));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// A tail fin in the plane x = 0, behind the body: `length` long, `spread` high at its edge, with a notch in the middle
// of the edge (`notch`, as a share of the length).
function tailGeometry(length: number, spread: number, notch: number): THREE.BufferGeometry {
  return finGeometry(10, 8, (s, w) => {
    const across = w * 2 - 1;
    const tip = length * (1 - notch * (1 - Math.abs(across)) ** 1.6);
    const half = 0.035 + (spread - 0.035) * Math.sin((s * Math.PI) / 2);
    return [0, across * half, -s * tip];
  });
}

type Part = { mesh: THREE.Mesh; base: Float32Array; amplitude: number; lag: number; kind: "tail" | "dorsal" | "pectoral"; rootX: number; rootYaw: number };
type FishView = { fish: Fish; group: THREE.Group; body: THREE.Mesh; bodyBase: Float32Array; parts: Part[]; yaw: number; pitch: number; bend: number };
export type FishTextures = { scales: THREE.Texture; fin: THREE.Texture };

// Scales: rows of overlapping rounded scales, as a bump map, so the body catches the light the way a goldfish does.
function scaleTexture(): THREE.CanvasTexture {
  const size = 128, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  const rows = 8, cols = 8, w = size / cols, h = size / rows;
  for (let r = -1; r <= rows; r++) for (let c = -1; c <= cols; c++) {
    const x = c * w + (r % 2 ? w / 2 : 0), y = r * h;
    const gradient = ctx.createRadialGradient(x + w / 2, y + h * 0.15, 1, x + w / 2, y + h * 0.15, w * 0.75);
    gradient.addColorStop(0, "#d8d8d8");
    gradient.addColorStop(0.8, "#8a8a8a");
    gradient.addColorStop(1, "#4a4a4a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.15, w * 0.62, h * 0.95, 0, 0, Math.PI);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 7);
  return texture;
}

// A fin's see-through: thin rays from the root to the edge, the skin between them clearer, and the whole clearer towards
// the edge (u across the fin, v from root to edge).
function finTexture(): THREE.CanvasTexture {
  const size = 128, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const ray = Math.max(0, Math.cos(u * Math.PI * 2 * 9)) ** 6;
    const alpha = (0.62 - v * 0.38) + ray * (0.35 - v * 0.15);
    const i = (y * size + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

const COLOURS: Record<Kind, { body: string; belly: string; fin: string }> = {
  wakin: { body: "#e8340a", belly: "#fff1e2", fin: "#ef4a18" },
  ryukin: { body: "#ec4512", belly: "#fff4ea", fin: "#f2622a" },
  demekin: { body: "#0b0b0e", belly: "#1c1b20", fin: "#121116" },
};

function makeFish(fish: Fish, env: THREE.Texture, textures: FishTextures): FishView {
  const next = random(fish.seed);
  const colours = COLOURS[fish.kind];
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.setScalar(fish.size);
  group.add(holder);

  // The body: slender for a wakin, round with a high back for a ryukin and a demekin.
  const profile: [number, number][] = fish.kind === "wakin"
    ? [[0, -0.5], [0.06, -0.44], [0.12, -0.32], [0.17, -0.14], [0.19, 0.04], [0.17, 0.22], [0.12, 0.36], [0.06, 0.46], [0, 0.5]]
    : [[0, -0.42], [0.08, -0.36], [0.17, -0.22], [0.23, -0.04], [0.24, 0.1], [0.2, 0.24], [0.13, 0.35], [0.06, 0.42], [0, 0.45]];
  const body = bodyGeometry(profile, 0.72, fish.kind === "ryukin" ? 1.35 : 1.12);
  // Colours painted on the body: white belly, and for the red kinds patches of white of its own.
  const position = body.getAttribute("position");
  const colour = new THREE.Color(), bodyColour = new THREE.Color(colours.body), belly = new THREE.Color(colours.belly);
  const colours3: number[] = [];
  const [p1, p2, p3] = [next() * 6, next() * 6, next() * 6];
  const patchy = fish.kind !== "demekin" && next() < 0.7;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    let white = THREE.MathUtils.smoothstep(-y, 0.02, 0.16) * 0.85;
    if (patchy) {
      const n = Math.sin(z * 9 + p1) * Math.sin(y * 11 + p2) + Math.sin(x * 13 + z * 5 + p3) * 0.6;
      white = Math.max(white, THREE.MathUtils.smoothstep(n, 0.45, 0.75));
    }
    colour.copy(bodyColour).lerp(belly, white);
    colours3.push(colour.r, colour.g, colour.b);
  }
  body.setAttribute("color", new THREE.Float32BufferAttribute(colours3, 3));
  // Wet, scaled skin with a little of the rainbow sheen goldfish scales have; a demekin's is velvety.
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, envMap: env, envMapIntensity: 0.45,
    bumpMap: textures.scales, bumpScale: 1.2,
    iridescence: fish.kind === "demekin" ? 0.15 : 0.35, iridescenceIOR: 1.35,
    sheen: fish.kind === "demekin" ? 0.8 : 0, sheenColor: new THREE.Color("#4a4a58"), sheenRoughness: 0.6,
  });
  const bodyMesh = new THREE.Mesh(body, bodyMaterial);
  bodyMesh.castShadow = bodyMesh.receiveShadow = true;
  holder.add(bodyMesh);

  // Eyes: big and on the sides of the head for a demekin.
  const eyeMaterial = new THREE.MeshPhysicalMaterial({ color: "#050506", roughness: 0.08, clearcoat: 1, envMap: env });
  const ringMaterial = new THREE.MeshStandardMaterial({ color: fish.kind === "demekin" ? "#3b3532" : "#e9c16a", roughness: 0.4 });
  const big = fish.kind === "demekin";
  for (const side of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.085 : 0.05, 16, 12), ringMaterial);
    ring.position.set(side * (big ? 0.15 : 0.1), 0.06, big ? 0.27 : 0.32);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.06 : 0.034, 16, 12), eyeMaterial);
    eye.position.set(side * (big ? 0.045 : 0.025), 0.005, 0.02);
    ring.add(eye);
    holder.add(ring);
  }

  const finMaterial = new THREE.MeshPhysicalMaterial({ color: colours.fin, transparent: true, alphaMap: textures.fin, opacity: fish.kind === "demekin" ? 1 : 0.95, roughness: 0.45, side: THREE.DoubleSide, depthWrite: false, envMap: env, envMapIntensity: 0.4, transmission: 0 });
  const parts: Part[] = [];
  const addPart = (geometry: THREE.BufferGeometry, kind: Part["kind"], amplitude: number, lag: number, placed: (mesh: THREE.Mesh) => void) => {
    const mesh = new THREE.Mesh(geometry, finMaterial);
    mesh.renderOrder = 2;
    placed(mesh);
    mesh.castShadow = true;
    holder.add(mesh);
    parts.push({ mesh, base: Float32Array.from(geometry.getAttribute("position").array as Float32Array), amplitude, lag, kind, rootX: mesh.position.x, rootYaw: mesh.rotation.y });
  };

  // The tail: a single forked one for a wakin, a long double fan spread to both sides for a ryukin and a demekin.
  if (fish.kind === "wakin") {
    addPart(tailGeometry(0.42, 0.24, 0.45), "tail", 0.16, 2.2, mesh => mesh.position.set(0, 0.01, -0.44));
  } else {
    const long = fish.kind === "ryukin" ? 0.8 : 0.62;
    for (const side of [-1, 1]) {
      addPart(tailGeometry(long, 0.3, 0.35), "tail", 0.2, 2.6, mesh => { mesh.position.set(side * 0.015, 0.02, -0.38); mesh.rotation.z = side * 0.55; mesh.rotation.y = side * 0.12; });
    }
  }
  // The dorsal fin along the back (a ryukin's is tall), and the two pectoral fins that row.
  const dorsalHeight = fish.kind === "ryukin" ? 0.3 : 0.2;
  const backY = fish.kind === "ryukin" ? 0.3 : 0.2;
  addPart(finGeometry(6, 8, (s, w) => [0, s * dorsalHeight * (1 - (w * 2 - 1) ** 2 * 0.6), 0.12 - w * 0.42 - s * 0.12]), "dorsal", 0.05, 1.5, mesh => mesh.position.set(0, backY, 0));
  for (const side of [-1, 1]) {
    addPart(finGeometry(5, 4, (s, w) => [side * s * 0.16, -s * 0.06, -w * 0.12 - s * 0.05]), "pectoral", 0.5, 0, mesh => mesh.position.set(side * 0.11, -0.1, 0.16));
  }

  return { fish, group, body: bodyMesh, bodyBase: Float32Array.from(body.getAttribute("position").array as Float32Array), parts, yaw: Math.atan2(fish.vel.x, fish.vel.z), pitch: 0, bend: 0 };
}

// Swimming: the body bends in a wave that runs from the head to the tail (more towards the tail, and harder the faster it
// swims), and curves into the turn when it turns; the tail and the dorsal fin follow the body and ripple from root to edge;
// the pectoral fins row. Positions are in the fish's own units (nose at z = 0.5, tail root at about z = -0.45).
function swimFish(view: FishView, dt: number) {
  const { fish } = view;
  const speed = Math.hypot(fish.vel.x, fish.vel.y, fish.vel.z);
  const vigour = 0.5 + Math.min(2.4, speed * 6);
  const sway = (z: number) => {
    const t = THREE.MathUtils.clamp((0.25 - z) / 0.75, 0, 1);
    return (Math.sin(fish.phase - z * 5) * 0.045 * vigour + view.bend) * t * t;
  };

  // Facing where it swims, turning smoothly, and bending into the turn.
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

  const bodyPosition = view.body.geometry.getAttribute("position") as THREE.BufferAttribute;
  const bodyArray = bodyPosition.array as Float32Array;
  for (let i = 0; i < bodyPosition.count; i++) bodyArray[i * 3] = view.bodyBase[i * 3] + sway(view.bodyBase[i * 3 + 2]);
  bodyPosition.needsUpdate = true;
  view.body.geometry.computeVertexNormals();

  for (const part of view.parts) {
    const geometry = part.mesh.geometry;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const fin = geometry.getAttribute("fin") as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    if (part.kind === "tail") {
      // Carried by the end of the body: moved with it and turned to its slope there.
      const z = part.mesh.position.z;
      part.mesh.position.x = part.rootX + sway(z);
      part.mesh.rotation.y = part.rootYaw + (sway(z) - sway(z + 0.05)) / 0.05;
    }
    for (let i = 0; i < position.count; i++) {
      const s = fin.getX(i);
      const wave = Math.sin(fish.phase - 1.2 - s * part.lag) * part.amplitude * vigour;
      if (part.kind === "pectoral") {
        array[i * 3] = part.base[i * 3] * (0.55 + 0.45 * Math.sin(fish.phase * 0.7));
        array[i * 3 + 1] = part.base[i * 3 + 1] + s * wave * 0.05;
        array[i * 3 + 2] = part.base[i * 3 + 2];
      } else if (part.kind === "dorsal") {
        array[i * 3] = part.base[i * 3] + sway(part.base[i * 3 + 2]) + wave * s ** 1.5;
        array[i * 3 + 1] = part.base[i * 3 + 1];
        array[i * 3 + 2] = part.base[i * 3 + 2];
      } else {
        array[i * 3] = part.base[i * 3] + wave * s ** 1.5;
        array[i * 3 + 1] = part.base[i * 3 + 1] - s * s * 0.06;
        array[i * 3 + 2] = part.base[i * 3 + 2];
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  view.group.position.set(fish.pos.x, fish.pos.y, fish.pos.z);
  // The head swings a little against the tail.
  view.group.rotation.set(view.pitch, view.yaw - Math.sin(fish.phase) * 0.025 * vigour, 0, "YXZ");
}

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach(m => m.dispose()); else material?.dispose();
  });
}

// ---- The bowl ----

// A sheen on the glass that is strongest where it is seen edge-on (as real glass looks), over a nearly clear shell.
function fresnelMaterial(colour: string, strength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColour: { value: new THREE.Color(colour) }, uStrength: { value: strength } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      void main() { vec4 world = modelMatrix * vec4(position, 1.0); vNormal = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - world.xyz); gl_Position = projectionMatrix * viewMatrix * world; }`,
    fragmentShader: `uniform vec3 uColour; uniform float uStrength; varying vec3 vNormal; varying vec3 vView;
      void main() { float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.5); gl_FragColor = vec4(uColour, clamp(f * uStrength, 0.0, 0.9)); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

const thetaAt = (y: number) => Math.acos(THREE.MathUtils.clamp(y / BOWL_R, -1, 1));

// A soft round shadow under the bowl.
function shadowTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,0.45)");
  gradient.addColorStop(0.55, "rgba(0,0,0,0.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Light through a moving water surface (caustics): a net of bright wavy lines that shifts with time, drawn small and
// projected by the lamp above the bowl onto everything under it, fish included.
const CAUSTIC_SIZE = 128;
function drawCaustics(ctx: CanvasRenderingContext2D, image: ImageData, time: number) {
  const k = (Math.PI * 2 * 15) / CAUSTIC_SIZE;
  for (let y = 0; y < CAUSTIC_SIZE; y++) for (let x = 0; x < CAUSTIC_SIZE; x++) {
    const u = x * k, v = y * k;
    const n = Math.sin(u + Math.sin(v * 0.8 + time * 0.7) * 1.6 + time * 0.4)
      + Math.sin(v * 1.1 + Math.sin(u * 0.9 - time * 0.6) * 1.4 - time * 0.3)
      + Math.sin((u - v) * 0.7 + time * 0.8) * 0.8;
    const bright = Math.max(0, 1 - Math.abs(n) * 1.5) ** 2;
    const value = Math.min(255, Math.round((0.55 + bright * 0.9) * 170));
    const i = (y * CAUSTIC_SIZE + x) * 4;
    image.data[i] = value;
    image.data[i + 1] = Math.min(255, value + 4);
    image.data[i + 2] = Math.min(255, value + 8);
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

type Ripple = { x: number; z: number; born: number; strength: number };

export function createAquarium(container: HTMLElement, options: { kinds: Kind[]; night: boolean; onStats: (stats: Stats) => void; seed?: number }): Aquarium {
  const next = random(options.seed ?? (Math.random() * 2 ** 32) >>> 0);
  const world: World = createWorld();
  for (const kind of options.kinds) addFish(world, kind, next);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  room.dispose?.();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
  const HOME = new THREE.Vector3(0, 1.25, 3.6);
  const TARGET = new THREE.Vector3(0, -0.12, 0);
  camera.position.copy(HOME);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.0;
  controls.maxDistance = 6;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = 1.72;
  controls.rotateSpeed = 0.7;
  controls.update();

  // Light: a soft sky light, a lamp above, and in the night a blue glow from below the rim.
  const hemisphere = new THREE.HemisphereLight("#fff8ec", "#8a7a66", 1.1);
  const sun = new THREE.DirectionalLight("#fff4e0", 1.3);
  sun.position.set(1.5, 4, 2);
  const lamp = new THREE.PointLight("#bfe6ff", 0, 3, 1.5);
  lamp.position.set(0, OPEN_Y + 0.2, 0);
  scene.add(hemisphere, sun, lamp);
  // The lamp over the bowl: its light comes through the rippling surface as moving caustics, and it casts the shadows.
  const causticCanvas = document.createElement("canvas");
  causticCanvas.width = causticCanvas.height = CAUSTIC_SIZE;
  const causticCtx = causticCanvas.getContext("2d")!;
  const causticImage = causticCtx.createImageData(CAUSTIC_SIZE, CAUSTIC_SIZE);
  drawCaustics(causticCtx, causticImage, 0);
  const caustics = new THREE.CanvasTexture(causticCanvas);
  caustics.colorSpace = THREE.SRGBColorSpace;
  const spot = new THREE.SpotLight("#fff3e2", 40, 0, 0.25, 0.45, 2);
  spot.position.set(0.5, 4.3, 0.7);
  spot.target.position.set(0, -0.6, 0);
  spot.map = caustics;
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.01;
  spot.shadow.camera.near = 2;
  spot.shadow.camera.far = 7;
  scene.add(spot, spot.target);

  // The table and the bowl's shadow on it.
  const table = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.MeshStandardMaterial({ color: "#c79b6d", roughness: 0.7 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = BASE_Y - 0.002;
  table.receiveShadow = true;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = BASE_Y + 0.001;
  scene.add(table, shadow);

  // Gravel: small stones in the bottom of the bowl, most of them in the top layer.
  const stones = 900;
  // Pebbles: a rounded shape made a little lumpy (the same bump for the same point, so the faces stay joined).
  const pebble = new THREE.IcosahedronGeometry(1, 2);
  const pebblePosition = pebble.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pebblePosition.count; i++) {
    const x = pebblePosition.getX(i), y = pebblePosition.getY(i), z = pebblePosition.getZ(i);
    const k = 1 + 0.12 * Math.sin(x * 4.1 + y * 2.3) * Math.cos(z * 3.7 - x) + 0.06 * Math.sin(y * 7 + z * 5);
    pebblePosition.setXYZ(i, x * k, y * k * 0.8, z * k);
  }
  pebble.computeVertexNormals();
  const gravel = new THREE.InstancedMesh(pebble, new THREE.MeshStandardMaterial({ roughness: 0.6 }), stones);
  gravel.receiveShadow = true;
  const palette = ["#d9cdb8", "#bfae94", "#8f7d68", "#e9e2d4", "#6f6559", "#c9b28c", "#a4c4d8", "#e7b9a6"];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < stones; i++) {
    const top = i < stones * 0.65;
    const y = top ? FLOOR_Y - 0.01 - next() * 0.025 : BASE_Y + 0.02 + next() * (FLOOR_Y - BASE_Y - 0.03);
    const maxR = Math.sqrt(Math.max(0, (BOWL_R - 0.035) ** 2 - y * y));
    const angle = next() * Math.PI * 2, r = Math.sqrt(next()) * maxR;
    p.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    e.set(next() * 6, next() * 6, next() * 6);
    q.setFromEuler(e);
    const size = 0.018 + next() * 0.022;
    s.set(size * (0.8 + next() * 0.5), size * (0.6 + next() * 0.3), size * (0.8 + next() * 0.5));
    gravel.setMatrixAt(i, m.compose(p, q, s));
    gravel.setColorAt(i, new THREE.Color(palette[Math.floor(next() * (next() < 0.9 ? 6 : palette.length))]));
  }
  scene.add(gravel);
  // Weed: a few clumps of blades that sway.
  type Blade = { mesh: THREE.Mesh; base: Float32Array; phase: number; height: number };
  const blades: Blade[] = [];
  const weedMaterial = new THREE.MeshStandardMaterial({ color: "#3f8f4a", roughness: 0.6, side: THREE.DoubleSide });
  const weedDark = new THREE.MeshStandardMaterial({ color: "#2d6e3b", roughness: 0.6, side: THREE.DoubleSide });
  for (const [cx, cz] of [[-0.38, -0.22], [0.3, -0.36], [-0.12, 0.42]] as const) {
    for (let k = 0; k < 6; k++) {
      const height = 0.4 + next() * 0.45;
      const geometry = new THREE.PlaneGeometry(0.04, height, 1, 12);
      geometry.translate(0, height / 2, 0);
      // Narrowing to a point at the top, and leaning a little.
      const bladePosition = geometry.getAttribute("position") as THREE.BufferAttribute;
      const lean = (next() - 0.5) * 0.12;
      for (let i = 0; i < bladePosition.count; i++) {
        const h = bladePosition.getY(i) / height;
        bladePosition.setX(i, bladePosition.getX(i) * (1 - h * 0.85) + lean * h * h);
      }
      const blade = new THREE.Mesh(geometry, next() < 0.5 ? weedMaterial : weedDark);
      blade.castShadow = blade.receiveShadow = true;
      blade.position.set(cx + (next() - 0.5) * 0.12, FLOOR_Y - 0.01, cz + (next() - 0.5) * 0.12);
      blade.rotation.y = next() * Math.PI;
      scene.add(blade);
      blades.push({ mesh: blade, base: Float32Array.from(geometry.getAttribute("position").array as Float32Array), phase: next() * 6, height });
    }
  }

  // The air stone and its bubbles.
  const stonePos = new THREE.Vector3(0.36, FLOOR_Y + 0.02, 0.18);
  const airStone = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.04, 20), new THREE.MeshStandardMaterial({ color: "#7d8a92", roughness: 0.95 }));
  airStone.position.copy(stonePos);
  airStone.receiveShadow = true;
  scene.add(airStone);
  const BUBBLES = 36;
  const bubbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, roughness: 0, envMap: env, envMapIntensity: 1.5, depthWrite: false }), BUBBLES);
  bubbleMesh.renderOrder = 3;
  const bubbles = Array.from({ length: BUBBLES }, (_, i) => ({ y: stonePos.y + (i / BUBBLES) * (WATER_Y - stonePos.y), size: 0.007 + next() * 0.012, wobble: next() * 6, speed: 0.25 + next() * 0.2 }));
  scene.add(bubbleMesh);

  // Food pellets.
  const foodMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: "#b0602e", roughness: 0.8 }), MAX_FOOD);
  foodMesh.count = 0;
  scene.add(foodMesh);

  // The water: a tinted shell inside the glass below the surface, and the surface itself, which ripples.
  const thetaWater = thetaAt(WATER_Y), thetaBase = thetaAt(BASE_Y);
  const waterBack = new THREE.Mesh(
    new THREE.SphereGeometry(BOWL_R * 0.992, 72, 40, 0, Math.PI * 2, thetaWater, thetaBase - thetaWater),
    new THREE.MeshPhysicalMaterial({ color: "#6fbfba", transparent: true, opacity: 0.32, roughness: 0.1, side: THREE.BackSide, depthWrite: false }),
  );
  waterBack.renderOrder = 1;
  const waterFront = new THREE.Mesh(
    waterBack.geometry,
    new THREE.MeshPhysicalMaterial({ color: "#a9dcd8", transparent: true, opacity: 0.05, roughness: 0, side: THREE.FrontSide, depthWrite: false, envMap: env, envMapIntensity: 0.4 }),
  );
  waterFront.renderOrder = 4;
  scene.add(waterBack, waterFront);

  const surfaceGeometry = new THREE.RingGeometry(0.0001, SURFACE_R * 0.992, 96, 24);
  surfaceGeometry.rotateX(-Math.PI / 2);
  surfaceGeometry.translate(0, WATER_Y, 0);
  const surfaceBase = Float32Array.from(surfaceGeometry.getAttribute("position").array as Float32Array);
  const surface = new THREE.Mesh(surfaceGeometry, new THREE.MeshPhysicalMaterial({ color: "#bfe8e4", transparent: true, opacity: 0.38, roughness: 0.04, metalness: 0, envMap: env, envMapIntensity: 1.2, side: THREE.DoubleSide, depthWrite: false }));
  surface.renderOrder = 5;
  scene.add(surface);
  const ripples: Ripple[] = [];

  // The glass: a clear shell with a sheen at its edges, a frilled rim at the top edged in blue (a Japanese goldfish
  // bowl's), and a flat foot.
  const glassGeometry = new THREE.SphereGeometry(BOWL_R, 96, 56, 0, Math.PI * 2, thetaAt(OPEN_Y), thetaBase - thetaAt(OPEN_Y));
  const glassClear = new THREE.Mesh(glassGeometry, new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.05, roughness: 0.02, metalness: 0, envMap: env, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 }));
  glassClear.renderOrder = 6;
  const glassSheen = new THREE.Mesh(glassGeometry, fresnelMaterial("#eaf6ff", 0.75));
  glassSheen.renderOrder = 7;
  scene.add(glassClear, glassSheen);

  const rimR = Math.sqrt(BOWL_R ** 2 - OPEN_Y ** 2);
  const frill = (theta: number, t: number) => {
    const r = rimR + t * 0.13;
    const y = OPEN_Y + t ** 1.4 * 0.06 + t * Math.sin(theta * 9) * 0.035;
    return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
  };
  const rimPositions: number[] = [], rimIndex: number[] = [];
  const AROUND = 180, OUT = 6;
  for (let i = 0; i <= AROUND; i++) for (let j = 0; j <= OUT; j++) { const point = frill((i / AROUND) * Math.PI * 2, j / OUT); rimPositions.push(point.x, point.y, point.z); }
  for (let i = 0; i < AROUND; i++) for (let j = 0; j < OUT; j++) { const a = i * (OUT + 1) + j, b = a + 1, c = a + OUT + 1, d = c + 1; rimIndex.push(a, c, b, b, c, d); }
  const rimGeometry = new THREE.BufferGeometry();
  rimGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rimPositions, 3));
  rimGeometry.setIndex(rimIndex);
  rimGeometry.computeVertexNormals();
  const rim = new THREE.Mesh(rimGeometry, new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.16, roughness: 0.02, envMap: env, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }));
  rim.renderOrder = 8;
  const rimSheen = new THREE.Mesh(rimGeometry, fresnelMaterial("#eaf6ff", 0.6));
  rimSheen.renderOrder = 8;
  const edge = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 360 }, (_, i) => frill((i / 360) * Math.PI * 2, 1)), true), 360, 0.011, 8, true),
    new THREE.MeshPhysicalMaterial({ color: "#5aa9d6", roughness: 0.15, transparent: true, opacity: 0.85, envMap: env, clearcoat: 1 }),
  );
  edge.renderOrder = 9;
  const foot = new THREE.Mesh(new THREE.CircleGeometry(Math.sqrt(BOWL_R ** 2 - BASE_Y ** 2), 64), new THREE.MeshPhysicalMaterial({ color: "#dff2f2", transparent: true, opacity: 0.35, roughness: 0.05, envMap: env, depthWrite: false }));
  foot.rotation.x = -Math.PI / 2;
  foot.position.y = BASE_Y;
  scene.add(rim, rimSheen, edge, foot);

  // The fish.
  const textures: FishTextures = { scales: scaleTexture(), fin: finTexture() };
  const views = new Map<number, FishView>();
  const sync = () => {
    for (const fish of world.fish) if (!views.has(fish.id)) { const view = makeFish(fish, env, textures); views.set(fish.id, view); scene.add(view.group); }
    for (const [id, view] of views) if (!world.fish.includes(view.fish)) { scene.remove(view.group); disposeObject(view.group); views.delete(id); }
  };
  sync();

  // Night: the room dark, the bowl lit from its own lamp.
  const setNight = (night: boolean) => {
    hemisphere.intensity = night ? 0.1 : 1.0;
    sun.intensity = night ? 0.05 : 1.3;
    lamp.intensity = night ? 1.5 : 0;
    spot.intensity = night ? 30 : 40;
    spot.color.set(night ? "#cfe6ff" : "#fff3e2");
    renderer.toneMappingExposure = night ? 1.2 : 1.05;
  };
  setNight(options.night);

  // Sizing to the container.
  const resize = () => {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Further away on a narrow screen, so the whole bowl shows.
    camera.fov = width / height < 0.85 ? 48 : 35;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizer = new ResizeObserver(resize);
  resizer.observe(container);

  // Taps: on the water's surface, food; on the glass, a tap that startles the fish (with a small "tink"). A drag turns
  // the bowl instead.
  let audio: AudioContext | null = null;
  const tink = () => {
    try {
      audio ??= new AudioContext();
      const now = audio.currentTime;
      for (const [frequency, gain] of [[2350, 0.18], [3520, 0.07], [5100, 0.03]] as const) {
        const osc = audio.createOscillator(), amp = audio.createGain();
        osc.frequency.value = frequency;
        amp.gain.setValueAtTime(gain, now);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.connect(amp).connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch { /* no sound */ }
  };
  const addRipple = (x: number, z: number, strength = 1) => { ripples.push({ x, z, born: world.time, strength }); if (ripples.length > 14) ripples.shift(); };
  const feedAt = (x: number, z: number) => { dropFood(world, x, z, 3 + Math.floor(next() * 3), next); addRipple(x, z, 1); };

  let down: { x: number; y: number } | null = null;
  const onDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY }; };
  const onUp = (event: PointerEvent) => {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const { origin, direction } = ray.ray;
    // The water's surface, seen from above.
    if (origin.y > WATER_Y && direction.y < 0) {
      const t = (WATER_Y - origin.y) / direction.y;
      const x = origin.x + direction.x * t, z = origin.z + direction.z * t;
      if (Math.hypot(x, z) < SURFACE_R * 0.97) { feedAt(x, z); return; }
    }
    // The glass: where the ray first meets the sphere, if below the rim.
    const b = origin.dot(direction), c = origin.lengthSq() - BOWL_R ** 2, disc = b * b - c;
    if (disc > 0) {
      const t = -b - Math.sqrt(disc);
      const hit = origin.clone().addScaledVector(direction, t);
      if (t > 0 && hit.y < OPEN_Y && hit.y > BASE_Y) {
        startle(world, { x: hit.x, y: Math.min(WATER_Y, hit.y), z: hit.z });
        tink();
        addRipple(hit.x * 0.9, hit.z * 0.9, 0.5);
      }
    }
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);

  // The loop: the fish's life in small steps, then the drawing. Paused while the bowl is off screen.
  let visible = true;
  const watcher = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); });
  watcher.observe(container);
  let last = performance.now(), carry = 0, statsAt = 0, frame = 0, causticFrame = 0;
  const bubbleMatrix = new THREE.Matrix4(), foodMatrix = new THREE.Matrix4();
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!visible) return;
    carry += dt;
    while (carry >= STEP) { step(world, STEP, next); carry -= STEP; }
    const time = world.time;

    for (const view of views.values()) swimFish(view, dt);

    for (const blade of blades) {
      const position = blade.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      const array = position.array as Float32Array;
      for (let i = 0; i < position.count; i++) {
        const h = blade.base[i * 3 + 1] / blade.height;
        array[i * 3] = blade.base[i * 3] + Math.sin(time * 0.9 + blade.phase + h * 2) * 0.06 * h * h;
        array[i * 3 + 2] = blade.base[i * 3 + 2] + Math.cos(time * 0.7 + blade.phase) * 0.03 * h * h;
      }
      position.needsUpdate = true;
    }

    bubbles.forEach((bubble, i) => {
      bubble.y += bubble.speed * dt;
      if (bubble.y > WATER_Y - 0.01) { bubble.y = stonePos.y + 0.02; if (next() < 0.25) addRipple(stonePos.x, stonePos.z, 0.15); }
      const rise = (bubble.y - stonePos.y) / (WATER_Y - stonePos.y);
      p.set(stonePos.x + Math.sin(time * 3 + bubble.wobble) * 0.012 * (1 + rise * 2), bubble.y, stonePos.z + Math.cos(time * 2.6 + bubble.wobble) * 0.012 * (1 + rise * 2));
      s.setScalar(bubble.size * (0.7 + rise * 0.6));
      bubbleMesh.setMatrixAt(i, bubbleMatrix.compose(p, q.identity(), s));
    });
    bubbleMesh.instanceMatrix.needsUpdate = true;

    foodMesh.count = world.food.length;
    world.food.forEach((food, i) => {
      const bob = food.floatFor > 0 ? Math.sin(time * 4 + food.id) * 0.004 : 0;
      p.set(food.pos.x, food.pos.y + bob, food.pos.z);
      s.setScalar(0.013);
      foodMesh.setMatrixAt(i, foodMatrix.compose(p, q.identity(), s));
    });
    foodMesh.instanceMatrix.needsUpdate = true;

    // The surface: gentle waves, and rings spreading from where food fell or the glass was tapped.
    const position = surfaceGeometry.getAttribute("position") as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    while (ripples.length && time - ripples[0].born > 4) ripples.shift();
    for (let i = 0; i < position.count; i++) {
      const x = surfaceBase[i * 3], z = surfaceBase[i * 3 + 2];
      let h = Math.sin(x * 7 + time * 1.3) * 0.0035 + Math.sin(z * 9 - time * 1.1) * 0.003;
      for (const ripple of ripples) {
        const age = time - ripple.born, d = Math.hypot(x - ripple.x, z - ripple.z), front = age * 0.45;
        if (d < front + 0.05) h += Math.sin((d - front) * 45) * 0.012 * ripple.strength * Math.exp(-age * 1.2) * Math.exp(-Math.abs(d - front) * 8);
      }
      array[i * 3 + 1] = WATER_Y + h;
    }
    position.needsUpdate = true;
    surfaceGeometry.computeVertexNormals();
    if (++causticFrame % 2 === 0) { drawCaustics(causticCtx, causticImage, time); caustics.needsUpdate = true; }

    controls.update();
    renderer.render(scene, camera);

    if (now - statsAt > 250) {
      statsAt = now;
      options.onStats({ fish: world.fish.length, food: world.food.length, eaten: world.eaten, kinds: world.fish.map(fish => fish.kind) });
    }
  };
  frame = requestAnimationFrame(loop);

  return {
    addFish(kind) { const added = !!addFish(world, kind, next); sync(); return added; },
    removeFish() { const removed = !!removeFish(world); sync(); return removed; },
    feed() { const angle = next() * Math.PI * 2, r = Math.sqrt(next()) * SURFACE_R * 0.6; feedAt(Math.cos(angle) * r, Math.sin(angle) * r); },
    setNight,
    resetView() { camera.position.copy(HOME); controls.target.copy(TARGET); controls.update(); },
    dispose() {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      disposeObject(scene);
      env.dispose();
      pmrem.dispose();
      caustics.dispose();
      textures.scales.dispose();
      textures.fin.dispose();
      void audio?.close();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch { return false; }
}
