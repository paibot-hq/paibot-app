import * as THREE from 'three';
import { kindOf } from './engine';
import { CEILING, CHUTE, CHUTE_WALLS, CLAW_TIP, D, W, WALL_H, type Scene3 } from './engine3d';

// The 3D machine drawn with three.js, in the engine's units. The engine's z runs from the front (0) to the back; three's z comes toward the
// viewer, so z is flipped (Z(z) = D - z) and the camera stands in front, looking in: "right" is right on the screen. While the claw goes
// back, the camera swings round to the side so that the depth can be judged; a ring on the floor marks where the claw is above.
const Z = (z: number) => D - z;

export interface View3 { draw(scene: Scene3, sideways: number): void; resize(width: number, height: number): void; dispose(): void }

export function createView3(canvas: HTMLCanvasElement, dark: boolean): View3 {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const world = new THREE.Scene();
  world.background = new THREE.Color(dark ? '#1b2238' : '#eaf1fb');

  world.add(new THREE.HemisphereLight(dark ? '#9fb3ff' : '#ffffff', dark ? '#30264a' : '#c9b6e4', dark ? 1.4 : 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(W / 2, CEILING + 200, D / 2 + 60);
  sun.target.position.set(W / 2, 0, D / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -W, right: W, top: W, bottom: -W, near: 10, far: CEILING + 400 });
  world.add(sun, sun.target);

  // The pit's floor (all but the chute's corner), the walls of the machine, the chute's hole and its low wall.
  const floorMaterial = new THREE.MeshStandardMaterial({ color: dark ? '#4a3a6a' : '#d6c6ee' });
  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, shadow = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.receiveShadow = shadow; mesh.castShadow = false;
    world.add(mesh);
    return mesh;
  };
  addBox(W - CHUTE, 6, D, CHUTE + (W - CHUTE) / 2, -3, Z(D / 2), floorMaterial);
  addBox(CHUTE, 6, D - CHUTE, CHUTE / 2, -3, Z(CHUTE + (D - CHUTE) / 2), floorMaterial);
  addBox(CHUTE, 4, CHUTE, CHUTE / 2, -60, Z(CHUTE / 2), new THREE.MeshStandardMaterial({ color: '#141a2a' }), false);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: dark ? '#2a3456' : '#f6f9ff' });
  addBox(W, CEILING, 4, W / 2, CEILING / 2, Z(D) - 2, wallMaterial);
  // The sides are glass, so that the camera can look in from the side.
  const glass = new THREE.MeshStandardMaterial({ color: '#bcd6ff', transparent: true, opacity: 0.12, depthWrite: false });
  addBox(4, CEILING, D, -2, CEILING / 2, Z(D / 2), glass, false);
  addBox(4, CEILING, D, W + 2, CEILING / 2, Z(D / 2), glass, false);
  const chuteWall = new THREE.MeshStandardMaterial({ color: '#7fa8e8', transparent: true, opacity: 0.55 });
  for (const [x0, x1, z0, z1] of CHUTE_WALLS) addBox(x1 - x0, WALL_H, z1 - z0, (x0 + x1) / 2, WALL_H / 2, Z((z0 + z1) / 2), chuteWall);
  // The frame in front: four bars, so that the glass is felt.
  const frame = new THREE.MeshStandardMaterial({ color: '#e05a8a' });
  addBox(W + 16, 10, 10, W / 2, CEILING, Z(0) + 4, frame, false);
  addBox(10, CEILING, 10, -6, CEILING / 2, Z(0) + 4, frame, false);
  addBox(10, CEILING, 10, W + 6, CEILING / 2, Z(0) + 4, frame, false);
  // The rails: one across, and the carriage's bar front to back.
  const metal = new THREE.MeshStandardMaterial({ color: dark ? '#c9d2ea' : '#6b7896', metalness: 0.5, roughness: 0.4 });
  const railX = addBox(W, 6, 6, W / 2, CEILING - 20, Z(0), metal, false);
  const railZ = addBox(8, 6, D, 0, CEILING - 14, Z(D / 2), metal, false);

  // The claw: a cable, a hub and three arms that swing in as it closes.
  const claw = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b04a', metalness: 0.6, roughness: 0.35 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 14, 20), gold);
  hub.castShadow = true;
  claw.add(hub);
  const arms: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 3) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.position.set(10, -6, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(4, CLAW_TIP * 0.7, 4), gold);
    upper.position.set(0, -CLAW_TIP * 0.35, 0); upper.castShadow = true;
    const hook = new THREE.Mesh(new THREE.BoxGeometry(4, 12, 4), gold);
    hook.position.set(-4, -CLAW_TIP * 0.7 - 4, 0); hook.rotation.z = -0.7; hook.castShadow = true;
    arm.add(upper, hook);
    pivot.add(arm);
    claw.add(pivot);
    arms.push(arm);
  }
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1, 8), metal);
  world.add(claw, cable);
  // Where the claw would land: a ring on the floor under it.
  const marker = new THREE.Mesh(new THREE.RingGeometry(16, 20, 32), new THREE.MeshBasicMaterial({ color: '#ff4f8b', transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  marker.rotation.x = -Math.PI / 2;
  world.add(marker);

  // The prizes: a sphere each, its mark painted on the side that faces the front.
  const meshes = new Map<number, THREE.Mesh>();
  const geometries = new Map<number, THREE.SphereGeometry>();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const materialFor = (kindId: string) => {
    let material = materials.get(kindId);
    if (!material) {
      const kind = kindOf(kindId);
      const paint = document.createElement('canvas');
      paint.width = 256; paint.height = 128;
      const c = paint.getContext('2d')!;
      c.fillStyle = kind.color; c.fillRect(0, 0, 256, 128);
      c.fillStyle = '#fff'; c.font = '700 54px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(kind.glyph, 64, 66); // a sphere's u = 0.25 faces +z, toward the viewer
      const texture = new THREE.CanvasTexture(paint);
      texture.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, emissive: kind.rare ? new THREE.Color('#5a4300') : new THREE.Color('#000') });
      materials.set(kindId, material);
    }
    return material;
  };

  const camera = new THREE.PerspectiveCamera(42, 3 / 4, 10, 3000);
  // In front, a little above, far enough back for the whole machine, rail to floor; to the side, as far.
  const front = new THREE.Vector3(W / 2, CEILING * 1.05, Z(0) + 560);
  const side = new THREE.Vector3(W + 470, CEILING * 0.95, Z(D / 2) + 60);
  const look = new THREE.Vector3(W / 2, 115, Z(D / 2));

  return {
    draw(scene, sideways) {
      const c = scene.claw;
      claw.position.set(c.x, c.y, Z(c.z));
      for (const arm of arms) arm.rotation.z = 0.15 + 0.55 * c.open;
      cable.position.set(c.x, (c.y + CEILING - 14) / 2, Z(c.z));
      cable.scale.y = Math.max(1, CEILING - 14 - c.y);
      railZ.position.x = c.x;
      railX.position.z = Z(c.z);
      const aiming = scene.phase === 'ready' || scene.phase === 'movingX' || scene.phase === 'aimedX' || scene.phase === 'movingZ';
      marker.visible = aiming;
      marker.position.set(c.x, 0.6, Z(c.z));
      const alive = new Set<number>();
      for (const ball of scene.prizes) {
        alive.add(ball.id);
        let mesh = meshes.get(ball.id);
        if (!mesh) {
          const geometry = new THREE.SphereGeometry(ball.r, 28, 20);
          mesh = new THREE.Mesh(geometry, materialFor(ball.kind));
          mesh.castShadow = true; mesh.receiveShadow = true;
          meshes.set(ball.id, mesh); geometries.set(ball.id, geometry);
          world.add(mesh);
        }
        mesh.position.set(ball.x, ball.y, Z(ball.z));
      }
      for (const [id, mesh] of meshes) {
        if (alive.has(id)) continue;
        world.remove(mesh); geometries.get(id)?.dispose(); meshes.delete(id); geometries.delete(id);
      }
      camera.position.lerpVectors(front, side, sideways);
      camera.lookAt(look);
      renderer.render(world, camera);
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose() {
      for (const geometry of geometries.values()) geometry.dispose();
      for (const material of materials.values()) { material.map?.dispose(); material.dispose(); }
      renderer.dispose();
    },
  };
}
