// The goldfish bowl's life, without any drawing: where each fish swims, the food that floats and sinks, and a tap on the
// glass that makes the fish dart away. The bowl is a sphere of radius 1 around the origin, filled with water up to
// WATER_Y and with gravel up to FLOOR_Y; the fish keep inside that water. Each fish steers (as in "boids"): towards a
// spot it wanders to, towards food when it is hungry, away from a tap, away from fish too close, and back from the glass,
// the surface and the gravel. Pure functions and a random source passed in, so they are tested without a browser.

export type Vec = { x: number; y: number; z: number };
export type Kind = "wakin" | "ryukin" | "demekin";
export const KINDS: readonly Kind[] = ["wakin", "ryukin", "demekin"];

export const BOWL_R = 1;
export const WATER_Y = 0.42;
export const FLOOR_Y = -0.8;
// The radius of the water's surface (the circle where the sphere meets WATER_Y).
export const SURFACE_R = Math.sqrt(BOWL_R ** 2 - WATER_Y ** 2);
export const MAX_FISH = 10;
export const MAX_FOOD = 60;
// How close to the glass, the surface and the gravel a fish's centre may come.
const MARGIN = 0.11;
// Where the pushing back from them starts.
const SOFT = 0.16;

export type Fish = {
  id: number;
  kind: Kind;
  pos: Vec;
  vel: Vec;
  // Length of the fish (the bowl's radius is 1).
  size: number;
  target: Vec;
  retarget: number;
  // Seconds left of darting away from a tap.
  fleeing: number;
  fleeFrom: Vec;
  // 0 full .. 1 hungry: it goes for food above 0.3.
  hunger: number;
  eaten: number;
  // The tail's beat, for drawing.
  phase: number;
  // A number of its own, for drawing its pattern.
  seed: number;
};

export type Food = { id: number; pos: Vec; drift: Vec; floatFor: number; sink: number; landed: number };

export type World = { fish: Fish[]; food: Food[]; time: number; eaten: number; nextId: number };

const v = (x = 0, y = 0, z = 0): Vec => ({ x, y, z });
const add = (a: Vec, b: Vec, k = 1): Vec => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (a: Vec) => Math.hypot(a.x, a.y, a.z);
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const norm = (a: Vec): Vec => { const l = len(a); return l > 1e-9 ? scale(a, 1 / l) : v(); };
const limit = (a: Vec, max: number): Vec => { const l = len(a); return l > max ? scale(a, max / l) : a; };
export const distance = (a: Vec, b: Vec) => len(sub(a, b));

// A small, fast pseudo-random generator (mulberry32): the same seed gives the same bowl, which the tests rely on.
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Whether a point is in the water a fish may be in (`margin` from the glass, the surface and the gravel).
export function inWater(p: Vec, margin = MARGIN): boolean {
  return len(p) <= BOWL_R - margin && p.y <= WATER_Y - margin && p.y >= FLOOR_Y + margin;
}

// The point brought back into the water a fish may be in.
export function clampToWater(p: Vec, margin = MARGIN): Vec {
  let q = { ...p, y: Math.min(WATER_Y - margin, Math.max(FLOOR_Y + margin, p.y)) };
  const r = len(q), max = BOWL_R - margin;
  if (r > max) q = scale(q, max / r);
  return q;
}

function randomPoint(next: () => number, margin = MARGIN + 0.05): Vec {
  for (;;) {
    const p = v((next() * 2 - 1) * BOWL_R, FLOOR_Y + next() * (WATER_Y - FLOOR_Y), (next() * 2 - 1) * BOWL_R);
    if (inWater(p, margin)) return p;
  }
}

export function createWorld(): World {
  return { fish: [], food: [], time: 0, eaten: 0, nextId: 1 };
}

const SIZES: Record<Kind, [number, number]> = { wakin: [0.19, 0.23], ryukin: [0.17, 0.21], demekin: [0.16, 0.2] };
// How fast each kind cruises (bowl radii a second): a ryukin's round body and a demekin's eyes make them slower.
const CRUISE: Record<Kind, number> = { wakin: 0.17, ryukin: 0.13, demekin: 0.12 };

export function addFish(world: World, kind: Kind, next: () => number): Fish | null {
  if (world.fish.length >= MAX_FISH) return null;
  const pos = randomPoint(next);
  const angle = next() * Math.PI * 2;
  const [lo, hi] = SIZES[kind];
  const fish: Fish = {
    id: world.nextId++, kind, pos, vel: v(Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08),
    size: lo + next() * (hi - lo), target: randomPoint(next), retarget: 3 + next() * 5,
    fleeing: 0, fleeFrom: v(), hunger: 0.6, eaten: 0, phase: next() * Math.PI * 2, seed: Math.floor(next() * 1e9),
  };
  world.fish.push(fish);
  return fish;
}

export function removeFish(world: World): Fish | null {
  return world.fish.pop() ?? null;
}

// A pinch of food on the surface at (x, z): `count` pellets close together, which float a moment and then sink. Food
// dropped outside the water's circle is brought inside it. Returns the pellets added.
export function dropFood(world: World, x: number, z: number, count: number, next: () => number): Food[] {
  const added: Food[] = [];
  for (let i = 0; i < count && world.food.length < MAX_FOOD; i++) {
    let px = x + (next() - 0.5) * 0.12, pz = z + (next() - 0.5) * 0.12;
    const r = Math.hypot(px, pz), max = SURFACE_R - 0.06;
    if (r > max) { px *= max / r; pz *= max / r; }
    const food: Food = {
      id: world.nextId++, pos: v(px, WATER_Y, pz), drift: v((next() - 0.5) * 0.02, 0, (next() - 0.5) * 0.02),
      floatFor: 1.2 + next() * 2, sink: 0.05 + next() * 0.03, landed: 0,
    };
    world.food.push(food);
    added.push(food);
  }
  return added;
}

// A tap on the glass at `point`: the fish near it dart away for a moment (the nearer, the longer).
export function startle(world: World, point: Vec): number {
  let scared = 0;
  for (const fish of world.fish) {
    const d = distance(fish.pos, point);
    if (d > 1.4) continue;
    fish.fleeing = Math.max(fish.fleeing, 0.6 + (1.4 - d) * 0.8);
    fish.fleeFrom = point;
    scared++;
  }
  return scared;
}

// How long food lies on the gravel before it is gone (seconds).
const FOOD_LIFE = 60;

// One step of `dt` seconds (keep it small: the page takes several steps a frame).
export function step(world: World, dt: number, next: () => number): void {
  world.time += dt;

  for (const food of world.food) {
    if (food.floatFor > 0) {
      food.floatFor -= dt;
      food.pos = add(food.pos, food.drift, dt);
    } else if (food.landed === 0) {
      food.pos = add(food.pos, v(food.drift.x * 0.3, -food.sink, food.drift.z * 0.3), dt);
      if (food.pos.y <= FLOOR_Y + 0.015) { food.pos.y = FLOOR_Y + 0.015; food.landed = dt; }
    } else food.landed += dt;
    // Kept inside the glass (the bowl narrows below the surface).
    const r = Math.hypot(food.pos.x, food.pos.z), max = Math.sqrt(Math.max(0, (BOWL_R - 0.04) ** 2 - food.pos.y ** 2));
    if (r > max) { food.pos.x *= max / r; food.pos.z *= max / r; }
  }
  world.food = world.food.filter(food => food.landed < FOOD_LIFE);

  for (const fish of world.fish) {
    fish.hunger = Math.min(1, fish.hunger + dt * 0.012);
    let accel = v();
    let cruise = CRUISE[fish.kind], maxSpeed = cruise * 1.8, maxAccel = 0.35;

    // Darting away from a tap comes first; then food, if hungry; otherwise wandering.
    let mode: "flee" | "food" | "wander" = "wander";
    let goal: Vec = fish.target;
    if (fish.fleeing > 0) {
      fish.fleeing -= dt;
      mode = "flee";
    } else if (fish.hunger > 0.3 && world.food.length) {
      let best: Food | null = null, bestD = Infinity;
      for (const food of world.food) { const d = distance(fish.pos, food.pos); if (d < bestD) { bestD = d; best = food; } }
      if (best) { mode = "food"; goal = clampToWater(best.pos, 0.02); }
    }

    if (mode === "flee") {
      cruise = 0.85; maxSpeed = 1.0; maxAccel = 3;
      const away = norm(sub(fish.pos, fish.fleeFrom));
      accel = add(accel, scale(sub(scale(away, cruise), fish.vel), 4));
    } else {
      if (mode === "wander") {
        fish.retarget -= dt;
        if (fish.retarget <= 0 || distance(fish.pos, fish.target) < 0.12) { fish.target = randomPoint(next); fish.retarget = 4 + next() * 6; }
      } else { cruise *= 1.9; maxSpeed = cruise * 1.3; maxAccel = 0.9; }
      const toGoal = sub(goal, fish.pos);
      const d = len(toGoal);
      // Slowing on arrival: food is nibbled, not rammed.
      const desired = scale(norm(toGoal), cruise * Math.min(1, mode === "food" ? 0.4 + d * 3 : 1));
      accel = add(accel, scale(sub(desired, fish.vel), 1.6));
    }

    // Room from the other fish.
    for (const other of world.fish) {
      if (other === fish) continue;
      const apart = sub(fish.pos, other.pos);
      const d = len(apart), room = (fish.size + other.size) * 0.9;
      if (d > 1e-6 && d < room) accel = add(accel, scale(norm(apart), ((room - d) / room) * 1.2));
    }

    // Back from the glass, the surface and the gravel, harder the nearer.
    const r = len(fish.pos), wall = BOWL_R - MARGIN;
    if (r > wall - SOFT) accel = add(accel, scale(norm(fish.pos), -2.5 * Math.min(1.5, (r - (wall - SOFT)) / SOFT)));
    if (fish.pos.y > WATER_Y - MARGIN - SOFT) accel.y -= 2.5 * Math.min(1.5, (fish.pos.y - (WATER_Y - MARGIN - SOFT)) / SOFT);
    if (fish.pos.y < FLOOR_Y + MARGIN + SOFT) accel.y += 2.5 * Math.min(1.5, (FLOOR_Y + MARGIN + SOFT - fish.pos.y) / SOFT);

    fish.vel = limit(add(fish.vel, limit(accel, maxAccel + 2.5), dt), maxSpeed);
    // Goldfish keep mostly level when they wander.
    if (mode === "wander") fish.vel.y = Math.max(-0.07, Math.min(0.07, fish.vel.y));
    fish.pos = add(fish.pos, fish.vel, dt);
    if (!inWater(fish.pos)) {
      // Never through the glass: back inside, and the speed outwards taken away.
      const inside = clampToWater(fish.pos);
      const outward = norm(sub(fish.pos, inside));
      const along = fish.vel.x * outward.x + fish.vel.y * outward.y + fish.vel.z * outward.z;
      if (along > 0) fish.vel = sub(fish.vel, scale(outward, along));
      fish.pos = inside;
    }
    fish.phase += dt * (3 + len(fish.vel) * 22);

    // Eating: the food at its mouth.
    if (mode === "food" || fish.hunger > 0.3) {
      const mouth = add(fish.pos, norm(fish.vel), fish.size * 0.45);
      const reach = fish.size * 0.35 + 0.03;
      const i = world.food.findIndex(food => distance(food.pos, mouth) < reach || distance(food.pos, fish.pos) < reach);
      if (i >= 0) {
        world.food.splice(i, 1);
        fish.eaten++;
        world.eaten++;
        fish.hunger = Math.max(0, fish.hunger - 0.22);
      }
    }
  }
}
