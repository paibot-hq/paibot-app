// The 3D view of the match (three.js). It only draws what engine.ts simulates: the engine's x and y are the dish's x and z here.
// Loaded on demand by koma.tsx; createScene throws when WebGL is not available, and the page falls back to the flat drawing.
import * as THREE from "three";
import { DISH, TOP_R, type Koma, type Top } from "./engine";

const BOWL = 16;           // how much higher the rim is than the middle of the dish
const SPARKS = 96;
const bowlY = (x: number, z: number) => BOWL * Math.min(Math.hypot(x, z) / DISH, 1.2) ** 2;

export type Scene3D = {
  render(game: Koma): void;
  resize(width: number, height: number): void;
  // Where on the dish (engine units) a point of the page is, or null when it is off the table.
  pick(clientX: number, clientY: number): { x: number; y: number } | null;
  hit(game: Koma, speed: number): void;
  dispose(): void;
};

function capTexture(body: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    context.fillStyle = i % 2 ? "#f3ead8" : body;
    context.beginPath();
    context.moveTo(size / 2, size / 2);
    context.arc(size / 2, size / 2, size, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4);
    context.closePath();
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Piece = { root: THREE.Group; tilt: THREE.Group; spinner: THREE.Group; bodyMaterial: THREE.MeshStandardMaterial; capMaterial: THREE.MeshStandardMaterial; color: string; fell: number };

function makeTop(): Piece {
  const bodyMaterial = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 });
  const capMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5 });
  const wood = new THREE.MeshStandardMaterial({ color: "#c79a62", roughness: 0.7 });
  const steel = new THREE.MeshStandardMaterial({ color: "#c9d1d9", roughness: 0.25, metalness: 0.9 });
  const spinner = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], y: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.castShadow = true;
    spinner.add(mesh);
    return mesh;
  };
  add(new THREE.ConeGeometry(2.2, 5, 16).rotateX(Math.PI), steel, 2.5);
  add(new THREE.CylinderGeometry(TOP_R, 3, 8, 40), bodyMaterial, 9);
  // The cap's top face carries the wedges, so the turning shows from above.
  add(new THREE.CylinderGeometry(TOP_R, TOP_R, 3, 40), [bodyMaterial, capMaterial, bodyMaterial], 14.5);
  add(new THREE.CylinderGeometry(1.7, 1.7, 9, 16), wood, 20.5);
  const tilt = new THREE.Group();
  tilt.add(spinner);
  const root = new THREE.Group();
  root.add(tilt);
  return { root, tilt, spinner, bodyMaterial, capMaterial, color: "", fell: 0 };
}

export function createScene(canvas: HTMLCanvasElement): Scene3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 10, 1200);
  const pitch = (52 * Math.PI) / 180, distance = 370;
  const home = new THREE.Vector3(0, distance * Math.sin(pitch), distance * Math.cos(pitch));
  const target = new THREE.Vector3(0, 0, 10);
  camera.position.copy(home);
  camera.lookAt(target);

  scene.add(new THREE.HemisphereLight("#ffffff", "#8a7a66", 1.5));
  const sun = new THREE.DirectionalLight("#ffffff", 2.4);
  sun.position.set(-110, 260, 130);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 50, far: 600 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // The dish: a shallow bowl (the same slope the engine pulls the tops down) with a thick rim, and rings to read distances by.
  const profile: THREE.Vector2[] = [];
  for (let r = 0; r <= DISH; r += 4) profile.push(new THREE.Vector2(r, bowlY(r, 0)));
  profile.push(new THREE.Vector2(DISH + 8, BOWL + 4), new THREE.Vector2(DISH + 8, -4), new THREE.Vector2(0, -4));
  const dishMaterial = new THREE.MeshStandardMaterial({ color: "#d9b98a", roughness: 0.8, side: THREE.DoubleSide });
  const dish = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), dishMaterial);
  dish.receiveShadow = true;
  scene.add(dish);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(DISH + 3, 4, 16, 96), new THREE.MeshStandardMaterial({ color: "#8a5a33", roughness: 0.6 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = BOWL + 1;
  rim.castShadow = true;
  scene.add(rim);
  for (const fraction of [0.33, 0.66]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(DISH * fraction, 0.5, 6, 96), new THREE.MeshStandardMaterial({ color: "#a97c4f" }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = bowlY(DISH * fraction, 0) + 0.3;
    scene.add(ring);
  }
  // Only the shadow of the dish is drawn on the table, so the page's own background stays the table.
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ opacity: 0.25 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -4.2;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const pieces = [makeTop(), makeTop()];
  for (const piece of pieces) scene.add(piece.root);

  const sparkPositions = new Float32Array(SPARKS * 3).fill(-1000);
  const sparkVelocity = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
  const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({ color: "#ffd27a", size: 3.5, transparent: true, depthWrite: false }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let nextSpark = 0;

  let shake = 0;
  let last = performance.now();
  let frames = 0;
  const raycaster = new THREE.Raycaster();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOWL * 0.3);

  const refreshColors = () => {
    const css = getComputedStyle(canvas);
    [css.getPropertyValue("--accent").trim(), css.getPropertyValue("--error").trim()].forEach((color, index) => {
      const piece = pieces[index]!;
      if (!color || piece.color === color) return;
      piece.color = color;
      piece.bodyMaterial.color.set(color);
      piece.capMaterial.map?.dispose();
      piece.capMaterial.map = capTexture(color);
      piece.capMaterial.needsUpdate = true;
    });
  };

  const place = (piece: Piece, top: Top, now: number) => {
    let { x, y } = top;
    let lift = 0;
    if (top.out) {
      // Over the rim: it drifts out and drops off the table.
      piece.fell += now;
      x *= 1 + piece.fell * 0.5;
      y *= 1 + piece.fell * 0.5;
      lift = -piece.fell * piece.fell * 260;
    } else piece.fell = 0;
    piece.root.visible = lift > -400;
    piece.root.position.set(x, bowlY(x, y) + lift, y);
    // A fast top stands straight; as the spin runs out it wobbles wider and wider until it lies down.
    const slow = Math.max(0, 1 - top.spin / 35);
    const lean = 0.03 + slow ** 1.5 * 1.2 + (top.out ? piece.fell * 2 : 0);
    const phase = top.angle * 0.35;
    piece.tilt.rotation.set(lean * Math.sin(phase), 0, lean * Math.cos(phase));
    piece.spinner.rotation.y = -top.angle;
  };

  const render = (game: Koma) => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (frames++ % 30 === 0) refreshColors();
    pieces.forEach((piece, index) => place(piece, game.tops[index]!, dt));

    shake *= Math.exp(-dt * 8);
    camera.position.set(home.x + (Math.random() - 0.5) * shake, home.y + (Math.random() - 0.5) * shake, home.z);
    camera.lookAt(target);

    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i]! <= 0) { sparkPositions[i * 3 + 1] = -1000; continue; }
      sparkLife[i]! -= dt;
      sparkVelocity[i * 3 + 1]! -= 220 * dt;
      for (let axis = 0; axis < 3; axis++) sparkPositions[i * 3 + axis]! += sparkVelocity[i * 3 + axis]! * dt;
    }
    sparkGeometry.attributes["position"]!.needsUpdate = true;
    renderer.render(scene, camera);
  };

  return {
    render,
    resize(width, height) {
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const point = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
      return point ? { x: point.x, y: point.z } : null;
    },
    hit(game, speed) {
      const [a, b] = game.tops;
      const x = (a.x + b.x) / 2, z = (a.y + b.y) / 2;
      shake = Math.min(shake + speed * 0.05, 7);
      const count = Math.min(Math.round(speed / 8), 24);
      for (let n = 0; n < count; n++) {
        const i = nextSpark++ % SPARKS;
        const angle = Math.random() * Math.PI * 2, power = 30 + Math.random() * 70;
        sparkPositions.set([x, bowlY(x, z) + 8, z], i * 3);
        sparkVelocity.set([Math.cos(angle) * power, 40 + Math.random() * 90, Math.sin(angle) * power], i * 3);
        sparkLife[i] = 0.35 + Math.random() * 0.3;
      }
    },
    dispose() {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
