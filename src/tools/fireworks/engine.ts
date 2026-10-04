// The physics of the fireworks, with no drawing: rockets rise to where the visitor tapped, burst into sparks, and the
// sparks slow down, fall and fade. Pure functions of (scene, dt, rng), so they can be tested without a browser.

export type Burst = "peony" | "chrysanthemum" | "willow" | "ring";
export const BURSTS: readonly Burst[] = ["peony", "chrysanthemum", "willow", "ring"];
export const MAX_SPARKS = 2400;
// The longest step the physics takes at once (a tab that was in the background must not jump the sparks).
export const MAX_DT = 0.05;

export type Rocket = { x: number; y: number; vx: number; vy: number; targetY: number; hue: number; burst: Burst };
export type Spark = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; hue: number; size: number; drag: number; gravity: number; twinkle: boolean };
export type Scene = { width: number; height: number; rockets: Rocket[]; sparks: Spark[]; launched: number; calm: boolean };
export type BurstEvent = { x: number; y: number; burst: Burst; hue: number; count: number };

export function createScene(width: number, height: number, calm = false): Scene {
  return { width, height, rockets: [], sparks: [], launched: 0, calm };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function pickBurst(rng: () => number): Burst {
  return BURSTS[Math.floor(rng() * BURSTS.length)];
}

// A rocket leaves the ground near the target's x and rises in a straight line to its height.
export function launch(scene: Scene, rng: () => number, targetX: number, targetY: number, burst: Burst = pickBurst(rng)): void {
  const y = scene.height - 6;
  const endY = clamp(targetY, 28, scene.height - 70);
  const startX = clamp(targetX + (rng() - 0.5) * scene.width * 0.2, 0, scene.width);
  const endX = clamp(targetX, 0, scene.width);
  const duration = 0.5 + ((y - endY) / scene.height) * 0.7;
  scene.rockets.push({ x: startX, y, vx: (endX - startX) / duration, vy: (endY - y) / duration, targetY: endY, hue: Math.floor(rng() * 360), burst });
  scene.launched += 1;
}

// What each kind of burst looks like: how many sparks, how fast they leave, how long they last, how quickly they slow
// (the fraction of speed left after one second) and how hard they fall (pixels per second squared, at 800px wide).
const LOOKS: Record<Burst, { count: number; speed: number; life: number; drag: number; gravity: number; twinkle: boolean; spread: number }> = {
  peony: { count: 90, speed: 150, life: 1.7, drag: 0.4, gravity: 90, twinkle: false, spread: 40 },
  chrysanthemum: { count: 130, speed: 170, life: 2.3, drag: 0.5, gravity: 70, twinkle: true, spread: 30 },
  willow: { count: 100, speed: 125, life: 3.4, drag: 0.55, gravity: 55, twinkle: true, spread: 8 },
  ring: { count: 56, speed: 150, life: 1.6, drag: 0.4, gravity: 80, twinkle: false, spread: 14 },
};

function explode(scene: Scene, rng: () => number, rocket: Rocket): BurstEvent {
  const look = LOOKS[rocket.burst];
  const scale = scene.width / 800;
  const wanted = Math.round(look.count * (scene.calm ? 0.5 : 1));
  const count = Math.max(0, Math.min(wanted, MAX_SPARKS - scene.sparks.length));
  // A willow is gold whatever colour the rocket had.
  const base = rocket.burst === "willow" ? 42 : rocket.hue;
  const jitter = rng() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const ring = rocket.burst === "ring";
    const angle = ring ? jitter + (i / count) * Math.PI * 2 : rng() * Math.PI * 2;
    const speed = (ring ? look.speed : look.speed * (0.35 + 0.65 * Math.sqrt(rng()))) * scale;
    const life = look.life * (0.75 + rng() * 0.5) * (scene.calm ? 0.7 : 1);
    scene.sparks.push({
      x: rocket.x, y: rocket.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life, maxLife: life, hue: (base + (rng() - 0.5) * look.spread + 360) % 360, size: (1.4 + rng() * 1.2) * Math.max(scale, 0.6),
      drag: look.drag, gravity: look.gravity * scale, twinkle: look.twinkle,
    });
  }
  return { x: rocket.x, y: rocket.y, burst: rocket.burst, hue: rocket.hue, count };
}

// Moves everything on by dt seconds; returns the bursts that happened (so the page can play a sound).
export function step(scene: Scene, dt: number, rng: () => number): BurstEvent[] {
  const events: BurstEvent[] = [];
  const t = clamp(dt, 0, MAX_DT);
  const flying: Rocket[] = [];
  for (const rocket of scene.rockets) {
    rocket.x += rocket.vx * t;
    rocket.y += rocket.vy * t;
    if (rocket.y <= rocket.targetY) events.push(explode(scene, rng, rocket));
    else flying.push(rocket);
  }
  scene.rockets = flying;
  const alive: Spark[] = [];
  for (const spark of scene.sparks) {
    spark.life -= t;
    if (spark.life <= 0) continue;
    const slow = Math.pow(spark.drag, t);
    spark.vx *= slow;
    spark.vy = spark.vy * slow + spark.gravity * t;
    spark.x += spark.vx * t;
    spark.y += spark.vy * t;
    if (spark.y > scene.height + 20) continue;
    alive.push(spark);
  }
  scene.sparks = alive;
  return events;
}

export type ShowShot = { at: number; x: number; y: number; burst: Burst };
// The seconds from the first shot to the end of the finale.
export const SHOW_LENGTH = 38;

// A show: single shots, then pairs, then a finale of a dozen shots across the sky.
export function showSchedule(rng: () => number, width: number, height: number): ShowShot[] {
  const shots: ShowShot[] = [];
  const spot = (): { x: number; y: number } => ({ x: width * (0.12 + 0.76 * rng()), y: height * (0.16 + 0.34 * rng()) });
  for (let at = 0.5; at < 14; at += 1.1 + rng() * 0.5) shots.push({ at, ...spot(), burst: pickBurst(rng) });
  for (let at = 14; at < 32; at += 0.8 + rng() * 0.4) {
    const left = width * (0.12 + 0.3 * rng());
    shots.push({ at, x: left, y: height * (0.16 + 0.34 * rng()), burst: pickBurst(rng) });
    shots.push({ at: at + 0.12, x: left + width * (0.3 + 0.25 * rng()), y: height * (0.16 + 0.34 * rng()), burst: pickBurst(rng) });
  }
  for (let i = 0; i < 14; i++) {
    shots.push({ at: 34 + i * 0.22 + rng() * 0.08, x: width * (0.08 + 0.84 * (i / 13)), y: height * (0.14 + 0.3 * rng()), burst: i % 4 === 3 ? "ring" : pickBurst(rng) });
  }
  return shots.sort((a, b) => a.at - b.at);
}
