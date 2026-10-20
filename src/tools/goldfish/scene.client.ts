// The goldfish bowl drawn in 3D with three.js: a glass bowl with a frilled rim, water whose surface ripples, gravel,
// waving weed, bubbles from an air stone and the fish (built in fish-model.client.ts). What the fish do comes from
// swim.ts; this file only draws it and turns taps into food or a startle. Browser only: it is loaded by the page after
// mounting.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BOWL_R, FLOOR_Y, MAX_FOOD, SURFACE_R, WATER_Y, addFish, changeWater, createWorld, dropFood, inWater, random, removeFish, startle, step, type Kind, type World } from "./swim";
import { makeFish, swimFish, type FishTextures, type FishView } from "./fish-model.client";
import { loadFishTextures } from "./fish-model.client";

export type SceneTextures = { fish: FishTextures };

// Every picture the scene needs, loaded before it is first drawn.
export async function loadTextures(base = "/goldfish/"): Promise<SceneTextures> {
  return { fish: await loadFishTextures(base) };
}

export type Stats = { fish: number; food: number; eaten: number; kinds: Kind[]; dirt: number };
export type Aquarium = {
  addFish(kind: Kind): boolean;
  removeFish(): boolean;
  feed(): void;
  setNight(night: boolean): void;
  // Fresh water (it clears over a moment), or the water fouled to a given degree at once (0 to 1).
  changeWater(): void;
  setDirt(dirt: number): void;
  resetView(): void;
  dispose(): void;
};

// Where the glass ends: open above OPEN_Y, with a flat foot at BASE_Y.
const OPEN_Y = 0.72;
const BASE_Y = -0.94;
const STEP = 1 / 120;

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach(m => m.dispose()); else material?.dispose();
  });
}

// ---- The bowl ----

// Glass is drawn as two layers over what is behind it, neither of which clouds it:
// - the light it reflects, added on top (so a clear pane stays clear, and the reflections grow towards its edges, as
//   glass's do), from the room around it;
// - the glass's own thickness, seen where the pane is edge-on: there one looks through much more glass, which is darker
//   and greener.
function glassReflection(env: THREE.Texture, strength = 1, side: THREE.Side = THREE.FrontSide): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: "#000000", roughness: 0.14, metalness: 0, envMap: env, envMapIntensity: 0.25 * strength, specularIntensity: 0.25,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side,
  });
}

function glassThickness(colour: string, strength: number, power = 3, side: THREE.Side = THREE.DoubleSide): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColour: { value: new THREE.Color(colour) }, uStrength: { value: strength }, uPower: { value: power } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      void main() { vec4 world = modelMatrix * vec4(position, 1.0); vNormal = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - world.xyz); gl_Position = projectionMatrix * viewMatrix * world; }`,
    fragmentShader: `uniform vec3 uColour; uniform float uStrength; uniform float uPower; varying vec3 vNormal; varying vec3 vView;
      void main() { float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower); gl_FragColor = vec4(uColour, clamp(f * uStrength, 0.0, 0.85)); }`,
    transparent: true, depthWrite: false, side,
  });
}

// Small ripples on the water, as a normal map that tiles (whole numbers of waves across it): drawn once, then slid over
// the surface two ways at once, so the reflections shimmer rather than slide.
function rippleTexture(): THREE.CanvasTexture {
  const size = 256, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const next = random(23);
  const waves = Array.from({ length: 9 }, () => ({ fx: Math.round(next() * 10 - 5), fy: Math.round(next() * 10 - 5) || 3, phase: next() * 6.3, amp: 0.4 + next() * 0.6 }));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let dx = 0, dy = 0;
    for (const w of waves) {
      const a = ((w.fx * x + w.fy * y) / size) * Math.PI * 2 + w.phase;
      const slope = Math.cos(a) * w.amp;
      dx += slope * w.fx;
      dy += slope * w.fy;
    }
    const n = new THREE.Vector3(-dx * 0.05, -dy * 0.05, 1).normalize();
    const i = (y * size + x) * 4;
    image.data[i] = (n.x * 0.5 + 0.5) * 255;
    image.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
    image.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
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

// A ring spreading on the water from where something touched it, for `life` seconds (a bubble's are small and brief).
type Ripple = { x: number; z: number; born: number; strength: number; life: number };

export function createAquarium(container: HTMLElement, options: { kinds: Kind[]; night: boolean; dirt?: number; textures: SceneTextures; onStats: (stats: Stats) => void; seed?: number }): Aquarium {
  const next = random(options.seed ?? (Math.random() * 2 ** 32) >>> 0);
  const world: World = createWorld(options.dirt ?? 0);
  for (const kind of options.kinds) addFish(world, kind, next);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";

  const scene = new THREE.Scene();
  // The wall behind: drawn in the scene (the glass is see-through, and is only right over a picture drawn with it),
  // light or dark with the site's theme, dark blue at night.
  const wallCanvas = document.createElement("canvas");
  wallCanvas.width = 4; wallCanvas.height = 256;
  const wall = new THREE.CanvasTexture(wallCanvas);
  wall.colorSpace = THREE.SRGBColorSpace;
  scene.background = wall;
  // A room in daylight whatever the site's theme (the bowl is a thing in a room, not part of the page), dimmed at night.
  let night = options.night;
  const paintWall = () => {
    const [top, bottom] = night ? ["#1b2a44", "#0a111d"] : ["#dcd6cc", "#c4bcaf"];
    const ctx = wallCanvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 256);
    wall.needsUpdate = true;
  };
  paintWall();
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

  // The table: a plain, light top (the bowl is about 24 cm across, so this is about 1.1 m by 70 cm and 2.5 cm thick), the
  // bowl towards its front edge; and the bowl's shadow on it.
  const TABLE_W = 9, TABLE_D = 6, TABLE_T = 0.2;
  const tableMaterial = new THREE.MeshPhysicalMaterial({ color: "#d8d3cb", roughness: 0.6, clearcoat: 0.15, clearcoatRoughness: 0.5, envMap: env, envMapIntensity: 0.25 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, TABLE_T, TABLE_D), tableMaterial);
  table.position.set(0, BASE_Y - TABLE_T / 2 - 0.002, -TABLE_D / 2 + 1.7);
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
  // A bubble rises from the stone, wobbling; at the surface it floats a moment, half out of the water and riding its
  // waves, drifting a little, then bursts. It makes a small ring where it comes up and another where it bursts.
  type Bubble = { x: number; y: number; z: number; size: number; wobble: number; speed: number; floating: number; drift: number };
  const bubbles: Bubble[] = Array.from({ length: BUBBLES }, (_, i) => ({
    x: stonePos.x, z: stonePos.z, y: stonePos.y + (i / BUBBLES) * (WATER_Y - stonePos.y),
    size: 0.007 + next() * 0.012, wobble: next() * 6, speed: 0.25 + next() * 0.2, floating: -1, drift: next() * Math.PI * 2,
  }));
  scene.add(bubbleMesh);

  // Food pellets.
  const foodMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: "#b0602e", roughness: 0.8 }), MAX_FOOD);
  foodMesh.count = 0;
  scene.add(foodMesh);

  // The water: a tinted shell inside the glass below the surface, and the surface itself, which ripples.
  const thetaWater = thetaAt(WATER_Y), thetaBase = thetaAt(BASE_Y);
  const waterBack = new THREE.Mesh(
    new THREE.SphereGeometry(BOWL_R * 0.992, 72, 40, 0, Math.PI * 2, thetaWater, thetaBase - thetaWater),
    new THREE.MeshPhysicalMaterial({ color: "#8fd3cd", transparent: true, opacity: 0.2, roughness: 0.1, side: THREE.BackSide, depthWrite: false }),
  );
  waterBack.renderOrder = 1;
  const waterFront = new THREE.Mesh(
    waterBack.geometry,
    new THREE.MeshPhysicalMaterial({ color: "#b6e6e1", transparent: true, opacity: 0.04, roughness: 0, side: THREE.FrontSide, depthWrite: false, envMap: env, envMapIntensity: 0.4 }),
  );
  waterFront.renderOrder = 4;
  scene.add(waterBack, waterFront);

  // Fouled water: specks of muck drifting in it, more the fouler it is.
  const MOTES = 260;
  const moteMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: "#8f8057", roughness: 1, transparent: true, opacity: 0.75, depthWrite: false }), MOTES);
  moteMesh.renderOrder = 2;
  moteMesh.count = 0;
  const waterPoint = () => {
    for (;;) {
      const point = { x: (next() * 2 - 1) * BOWL_R, y: FLOOR_Y + next() * (WATER_Y - FLOOR_Y), z: (next() * 2 - 1) * BOWL_R };
      if (inWater(point, 0.04)) return point;
    }
  };
  const motes = Array.from({ length: MOTES }, () => ({ at: waterPoint(), phase: next() * 6.3, size: 0.0025 + next() * 0.0045 }));
  scene.add(moteMesh);

  const surfaceGeometry = new THREE.RingGeometry(0.0001, SURFACE_R * 0.992, 96, 24);
  surfaceGeometry.rotateX(-Math.PI / 2);
  surfaceGeometry.translate(0, WATER_Y, 0);
  const surfaceBase = Float32Array.from(surfaceGeometry.getAttribute("position").array as Float32Array);
  // The surface: a faint tint, and over it what the water reflects, through two sets of ripples sliding different ways.
  // Water reflects little looked at from above (one sees through it) and much at a slant (it mirrors the room, and from
  // below it is a mirror); the lamp glints on the ripples.
  const surface = new THREE.Mesh(surfaceGeometry, new THREE.MeshBasicMaterial({ color: "#bfe3dd", transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
  surface.renderOrder = 5;
  const ripples1 = rippleTexture();
  const ripples2 = ripples1.clone();
  ripples1.repeat.set(1.6, 1.6);
  ripples2.repeat.set(2.3, 2.3);
  ripples2.rotation = 1.1;
  const shine = (side: THREE.Side, strength: number) => new THREE.MeshPhysicalMaterial({
    // The room it mirrors is a warm grey wall, not the bright white of the light probe: the reflection is tinted so.
    color: "#000000", roughness: 0.08, metalness: 0, envMap: env, envMapIntensity: 0.32 * strength, specularIntensity: 0.25 * strength, ior: 1.33,
    specularColor: new THREE.Color("#b4b0a6"),
    normalMap: ripples1, normalScale: new THREE.Vector2(0.3, 0.3),
    clearcoat: 0.25 * strength, clearcoatRoughness: 0.06, clearcoatNormalMap: ripples2, clearcoatNormalScale: new THREE.Vector2(0.25, 0.25),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side,
  });
  // From below (through the glass under the water line) the surface is a dim mirror.
  const surfaceShine = new THREE.Mesh(surfaceGeometry, shine(THREE.FrontSide, 1));
  const surfaceUnder = new THREE.Mesh(surfaceGeometry, shine(THREE.BackSide, 0.45));
  surfaceShine.renderOrder = surfaceUnder.renderOrder = 5;
  // Where the water meets the glass it climbs a little (the meniscus): a thin bright line round the bowl.
  const meniscus = new THREE.Mesh(new THREE.TorusGeometry(SURFACE_R * 0.995, 0.0025, 6, 160), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.3, depthWrite: false }));
  meniscus.rotation.x = Math.PI / 2;
  meniscus.position.y = WATER_Y + 0.002;
  meniscus.renderOrder = 6;
  scene.add(surface, surfaceShine, surfaceUnder, meniscus);
  const ripples: Ripple[] = [];

  // The glass: a clear shell (its reflections, and its thickness where seen edge-on), a frilled rim of thick glass at
  // the top (a Japanese goldfish bowl's), and a flat foot.
  const glassGeometry = new THREE.SphereGeometry(BOWL_R, 96, 56, 0, Math.PI * 2, thetaAt(OPEN_Y), thetaBase - thetaAt(OPEN_Y));
  const glassEdge = new THREE.Mesh(glassGeometry, glassThickness("#2d6b66", 0.75, 3.5, THREE.FrontSide));
  const glassEdgeBack = new THREE.Mesh(glassGeometry, glassThickness("#2d6b66", 0.22, 4, THREE.BackSide));
  glassEdge.renderOrder = 6;
  glassEdgeBack.renderOrder = 2;
  // The near side reflects the room; the far side (seen from inside) faintly.
  const glassShine = new THREE.Mesh(glassGeometry, glassReflection(env));
  const glassShineBack = new THREE.Mesh(glassGeometry, glassReflection(env, 0.35, THREE.BackSide));
  glassShine.renderOrder = 7;
  glassShineBack.renderOrder = 3;
  scene.add(glassEdge, glassEdgeBack, glassShine, glassShineBack);

  const rimR = Math.sqrt(BOWL_R ** 2 - OPEN_Y ** 2);
  const frill = (theta: number, t: number) => {
    // A wide flare outwards, in nine deep waves.
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
  const rim = new THREE.Mesh(rimGeometry, glassThickness("#5fa8a2", 0.3, 3));
  rim.renderOrder = 8;
  const rimShine = new THREE.Mesh(rimGeometry, glassReflection(env, 0.8, THREE.DoubleSide));
  rimShine.renderOrder = 9;
  // Its edges are rolled glass, thick and a little aqua: round beads along the outer edge and the opening.
  const bead = (t: number, radius: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 320 }, (_, i) => frill((i / 320) * Math.PI * 2, t)), true), 320, radius, 10, true);
  const beadMaterial = new THREE.MeshPhysicalMaterial({ color: "#bfe6e2", roughness: 0.04, transparent: true, opacity: 0.32, envMap: env, envMapIntensity: 1, clearcoat: 1, depthWrite: false });
  const outerBead = new THREE.Mesh(bead(1, 0.012), beadMaterial);
  const innerBead = new THREE.Mesh(bead(0, 0.007), beadMaterial);
  outerBead.renderOrder = innerBead.renderOrder = 10;
  const footGeometry = new THREE.CylinderGeometry(Math.sqrt(BOWL_R ** 2 - BASE_Y ** 2) + 0.01, Math.sqrt(BOWL_R ** 2 - BASE_Y ** 2) + 0.03, 0.03, 64, 1, false);
  const foot = new THREE.Mesh(footGeometry, glassThickness("#2d6b66", 0.9, 1.5));
  foot.position.y = BASE_Y + 0.012;
  const footShine = new THREE.Mesh(footGeometry, glassReflection(env));
  footShine.position.copy(foot.position);
  scene.add(rim, rimShine, outerBead, innerBead, foot, footShine);

  // The fish.
  const textures = options.textures;
  const views = new Map<number, FishView>();
  const sync = () => {
    for (const fish of world.fish) if (!views.has(fish.id)) { const view = makeFish(fish, env, textures.fish); views.set(fish.id, view); scene.add(view.group); }
    for (const [id, view] of views) if (!world.fish.includes(view.fish)) { scene.remove(view.group); disposeObject(view.group); views.delete(id); }
  };
  sync();

  // Night: the room dark, the bowl lit from its own lamp.
  let spotBase = 40;
  const setNight = (value: boolean) => {
    night = value;
    paintWall();
    hemisphere.intensity = night ? 0.14 : 0.8;
    // At night the room's light is the cool blue of the dark (a warm light, dimmed, would turn the table muddy brown).
    hemisphere.color.set(night ? "#7f9edc" : "#fff8ec");
    hemisphere.groundColor.set(night ? "#1a2232" : "#8a7a66");
    // The light probe lights the table too (it is a bright room): dimmed with the room at night.
    tableMaterial.envMapIntensity = night ? 0.03 : 0.25;
    sun.intensity = night ? 0.05 : 1.0;
    lamp.intensity = night ? 1.5 : 0;
    spotBase = night ? 30 : 40;
    spot.color.set(night ? "#cfe6ff" : "#fff3e2");
    renderer.toneMappingExposure = night ? 1.2 : 0.85;
  };
  setNight(options.night);

  // Clear water and foul water: the tint of the water (which, in front of the fish, hazes them), of its surface, and the
  // light that gets through it.
  const clearBack = new THREE.Color("#8fd3cd"), foulBack = new THREE.Color("#5c6838");
  const clearFront = new THREE.Color("#b6e6e1"), foulFront = new THREE.Color("#7a8350");
  const clearTop = new THREE.Color("#bfe3dd"), foulTop = new THREE.Color("#8b8d59");
  const backMaterial = waterBack.material as THREE.MeshPhysicalMaterial, frontMaterial = waterFront.material as THREE.MeshPhysicalMaterial, topMaterial = surface.material as THREE.MeshBasicMaterial;
  const showDirt = (d: number) => {
    backMaterial.color.copy(clearBack).lerp(foulBack, d);
    backMaterial.opacity = 0.2 + 0.5 * d;
    frontMaterial.color.copy(clearFront).lerp(foulFront, d);
    frontMaterial.opacity = 0.04 + 0.62 * d ** 0.8;
    topMaterial.color.copy(clearTop).lerp(foulTop, d);
    topMaterial.opacity = 0.07 + 0.45 * d;
    spot.intensity = spotBase * (1 - 0.65 * d);
  };
  let shownDirt = world.dirt;
  showDirt(shownDirt);

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
  const addRipple = (x: number, z: number, strength = 1, life = 4) => { ripples.push({ x, z, born: world.time, strength, life }); if (ripples.length > 32) ripples.shift(); };
  // The height of the water at (x, z) now: gentle waves and the rings spreading on it. The surface's mesh is moved by it,
  // and what floats (bubbles, food) rides it.
  const surfaceHeight = (x: number, z: number, time: number) => {
    let h = Math.sin(x * 7 + time * 1.3) * 0.0035 + Math.sin(z * 9 - time * 1.1) * 0.003;
    for (const ripple of ripples) {
      const age = time - ripple.born, d = Math.hypot(x - ripple.x, z - ripple.z), front = age * 0.45;
      if (d < front + 0.05) h += Math.sin((d - front) * 45) * 0.012 * ripple.strength * Math.exp(-age * (4.8 / ripple.life)) * Math.exp(-Math.abs(d - front) * 8);
    }
    return WATER_Y + h;
  };
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
      const top = surfaceHeight(bubble.x, bubble.z, time);
      if (bubble.floating < 0) {
        bubble.y += bubble.speed * dt;
        const rise = (bubble.y - stonePos.y) / (WATER_Y - stonePos.y);
        bubble.x = stonePos.x + Math.sin(time * 3 + bubble.wobble) * 0.012 * (1 + rise * 2);
        bubble.z = stonePos.z + Math.cos(time * 2.6 + bubble.wobble) * 0.012 * (1 + rise * 2);
        if (bubble.y >= top - bubble.size * 0.4) { bubble.floating = 0.6 + next() * 1.8; addRipple(bubble.x, bubble.z, 0.12, 1.2); }
        p.set(bubble.x, bubble.y, bubble.z);
        s.setScalar(bubble.size * (0.7 + rise * 0.6));
      } else {
        bubble.floating -= dt;
        bubble.x += Math.cos(bubble.drift) * 0.015 * dt;
        bubble.z += Math.sin(bubble.drift) * 0.015 * dt;
        if (bubble.floating <= 0) {
          addRipple(bubble.x, bubble.z, 0.25, 1.5);
          Object.assign(bubble, { x: stonePos.x, z: stonePos.z, y: stonePos.y + 0.02, floating: -1, drift: next() * Math.PI * 2 });
        }
        // Half out of the water, a little flattened, riding the waves.
        p.set(bubble.x, top - bubble.size * 0.25, bubble.z);
        s.set(bubble.size * 1.3, bubble.size * 0.95, bubble.size * 1.3);
      }
      bubbleMesh.setMatrixAt(i, bubbleMatrix.compose(p, q.identity(), s));
    });
    bubbleMesh.instanceMatrix.needsUpdate = true;

    foodMesh.count = world.food.length;
    world.food.forEach((food, i) => {
      // Floating food rides the waves; sinking food is in the water.
      p.set(food.pos.x, food.floatFor > 0 ? surfaceHeight(food.pos.x, food.pos.z, time) - 0.004 : food.pos.y, food.pos.z);
      s.setScalar(0.013);
      foodMesh.setMatrixAt(i, foodMatrix.compose(p, q.identity(), s));
    });
    foodMesh.instanceMatrix.needsUpdate = true;

    // How fouled the water looks follows how fouled it is, over a moment (so changed water clears, not blinks).
    shownDirt += (world.dirt - shownDirt) * Math.min(1, dt * 1.5);
    showDirt(shownDirt);
    const shownMotes = Math.round(MOTES * Math.min(1, shownDirt * 1.4));
    moteMesh.count = shownMotes;
    for (let i = 0; i < shownMotes; i++) {
      const mote = motes[i];
      mote.at.x += Math.sin(time * 0.31 + mote.phase) * 0.006 * dt;
      mote.at.z += Math.cos(time * 0.27 + mote.phase * 1.3) * 0.006 * dt;
      mote.at.y += (Math.sin(time * 0.2 + mote.phase) * 0.004 - 0.003) * dt;
      if (!inWater(mote.at, 0.03)) mote.at = waterPoint();
      p.set(mote.at.x, mote.at.y, mote.at.z);
      s.setScalar(mote.size);
      moteMesh.setMatrixAt(i, foodMatrix.compose(p, q.identity(), s));
    }
    moteMesh.instanceMatrix.needsUpdate = true;

    // The surface: gentle waves, and rings spreading from where food fell or the glass was tapped.
    const position = surfaceGeometry.getAttribute("position") as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    for (let k = ripples.length - 1; k >= 0; k--) if (time - ripples[k].born > ripples[k].life) ripples.splice(k, 1);
    for (let i = 0; i < position.count; i++) array[i * 3 + 1] = surfaceHeight(surfaceBase[i * 3], surfaceBase[i * 3 + 2], time);
    position.needsUpdate = true;
    surfaceGeometry.computeVertexNormals();
    if (++causticFrame % 2 === 0) { drawCaustics(causticCtx, causticImage, time); caustics.needsUpdate = true; }
    ripples1.offset.set(time * 0.018, time * 0.011);
    ripples2.offset.set(-time * 0.014, time * 0.017);

    controls.update();
    renderer.render(scene, camera);

    if (now - statsAt > 250) {
      statsAt = now;
      options.onStats({ fish: world.fish.length, food: world.food.length, eaten: world.eaten, kinds: world.fish.map(fish => fish.kind), dirt: world.dirt });
    }
  };
  frame = requestAnimationFrame(loop);

  return {
    addFish(kind) { const added = !!addFish(world, kind, next); sync(); return added; },
    removeFish() { const removed = !!removeFish(world); sync(); return removed; },
    feed() { const angle = next() * Math.PI * 2, r = Math.sqrt(next()) * SURFACE_R * 0.6; feedAt(Math.cos(angle) * r, Math.sin(angle) * r); },
    setNight,
    changeWater() { changeWater(world); },
    setDirt(dirt) { world.dirt = Math.min(1, Math.max(0, dirt)); },
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
      ripples1.dispose();
      ripples2.dispose();
      wall.dispose();
      textures.fish.fin.dispose();
      Object.values(textures.fish.kinds).forEach(own => Object.values(own).forEach(texture => texture.dispose()));
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
