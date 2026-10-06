// The physics of the fireworks, with no drawing. A shell rises, bursts into stars that leave in all directions, slow
// down against the air, fall and fade; the burst throws a flash of light and leaves smoke that the wind carries.
// Pure functions of (scene, dt, rng), so they run in a test without a browser.

export type Kind = "peony" | "chrysanthemum" | "willow" | "core" | "heart" | "star" | "ring";
export const KINDS: readonly Kind[] = ["peony", "chrysanthemum", "willow", "core", "heart", "star", "ring"];
// 号: the shell's diameter in sun (about 3 cm each); the bigger the shell, the higher it goes and the wider it opens.
export type Size = 3 | 5 | 8 | 10;
export const SIZES: readonly Size[] = [3, 5, 8, 10];
export type Palette = "auto" | "red" | "orange" | "gold" | "green" | "blue" | "purple" | "white";
export const PALETTES: readonly Palette[] = ["auto", "red", "orange", "gold", "green", "blue", "purple", "white"];
export type Color = { hue: number; sat: number };

export const MAX_SPARKS = 3200;
export const MAX_SMOKE = 90;
export const MAX_FLASHES = 14;
// The longest step the physics takes at once (a tab that was in the background must not jump everything).
export const MAX_DT = 0.05;
// The water line, as a fraction of the height; the town stands on it and its reflection lies below.
export const HORIZON = 0.86;
export const SPEED_OF_SOUND = 340;

// Roughly the diameter each size opens to, in metres, and the radius it gets on an 800px-wide sky.
export const DIAMETER_M: Record<Size, number> = { 3: 120, 5: 170, 8: 240, 10: 300 };
const RADIUS_PX: Record<Size, number> = { 3: 66, 5: 100, 8: 140, 10: 178 };

export type Shell = { x: number; y: number; vx: number; vy: number; targetY: number; kind: Kind; size: Size; color: Color; trail: number[] };
export type Spark = {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; hue: number; sat: number; size: number;
  drag: number; gravity: number; twinkle: boolean; trail: number; history: number[];
};
export type Smoke = { x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number };
export type Flash = { x: number; y: number; r: number; life: number; maxLife: number; hue: number; sat: number; strength: number };
export type Fountain = { x0: number; x1: number; y: number; left: number };
export type Scene = {
  width: number; height: number; time: number; shells: Shell[]; sparks: Spark[]; smoke: Smoke[]; flashes: Flash[]; fountains: Fountain[];
  launched: number; calm: boolean;
  // -1 (a steady wind to the left) to 1 (to the right).
  wind: number;
};
export type BurstEvent = { x: number; y: number; kind: Kind; size: Size; count: number; hue: number };
export type LaunchOptions = { kind?: Kind | "random"; size?: Size; palette?: Palette };

export function createScene(width: number, height: number, calm = false): Scene {
  return { width, height, time: 0, shells: [], sparks: [], smoke: [], flashes: [], fountains: [], launched: 0, calm, wind: 0 };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function pickKind(rng: () => number): Kind {
  return KINDS[Math.floor(rng() * KINDS.length)];
}

// The colour of a shell: the picked one, or one of the six vivid ones (a random hue would often be a muddy yellow-green).
const VIVID = [2, 24, 44, 130, 212, 285];
const HUES: Record<Exclude<Palette, "auto" | "white">, number> = { red: 2, orange: 24, gold: 44, green: 130, blue: 212, purple: 285 };
export function pickColor(rng: () => number, palette: Palette = "auto"): Color {
  if (palette === "white") return { hue: 210, sat: 0 };
  if (palette === "auto") return { hue: VIVID[Math.floor(rng() * VIVID.length)], sat: 100 };
  return { hue: HUES[palette], sat: 100 };
}

// The seconds a sound takes to travel `metres`.
export function soundDelay(metres: number): number {
  return metres / SPEED_OF_SOUND;
}

// A shell leaves the ground near the target's x and rises in a straight line to its height; a bigger shell is slower.
export function launch(scene: Scene, rng: () => number, targetX: number, targetY: number, options: LaunchOptions = {}): Shell {
  const kind = !options.kind || options.kind === "random" ? pickKind(rng) : options.kind;
  const size = options.size ?? 5;
  const scale = scene.width / 800;
  const ground = scene.height * HORIZON - 4;
  const radius = RADIUS_PX[size] * scale;
  const endY = clamp(targetY, radius + 14, ground - 60);
  const startX = clamp(targetX + (rng() - 0.5) * scene.width * 0.16, 0, scene.width);
  const endX = clamp(targetX, 0, scene.width);
  const duration = (0.8 + size * 0.12) * (0.55 + 0.6 * ((ground - endY) / scene.height));
  // A willow is gold unless a colour was asked for.
  const color = kind === "willow" && (options.palette ?? "auto") === "auto" ? { hue: 44, sat: 90 } : pickColor(rng, options.palette);
  const shell: Shell = { x: startX, y: ground, vx: (endX - startX) / duration, vy: (endY - ground) / duration, targetY: endY, kind, size, color, trail: [] };
  scene.shells.push(shell);
  scene.launched += 1;
  return shell;
}

type Look = { count: (size: Size) => number; life: number; drag: number; gravity: number; trail: number; twinkle: boolean };
const LOOKS: Record<Exclude<Kind, "core">, Look> = {
  peony: { count: s => 60 + s * 10, life: 2.0, drag: 0.22, gravity: 50, trail: 0, twinkle: false },
  chrysanthemum: { count: s => 80 + s * 13, life: 2.7, drag: 0.25, gravity: 55, trail: 10, twinkle: false },
  willow: { count: s => 70 + s * 10, life: 4.4, drag: 0.1, gravity: 60, trail: 18, twinkle: true },
  heart: { count: s => 54 + s * 6, life: 2.1, drag: 0.2, gravity: 22, trail: 2, twinkle: false },
  star: { count: s => 50 + s * 6, life: 2.1, drag: 0.2, gravity: 22, trail: 2, twinkle: false },
  ring: { count: s => 40 + s * 5, life: 1.9, drag: 0.22, gravity: 45, trail: 3, twinkle: false },
};
// The outer layer of a core burst is a chrysanthemum; its core is a smaller, quicker peony of another colour.
const CORE_OUTER: Look = { count: s => 70 + s * 9, life: 2.5, drag: 0.25, gravity: 55, trail: 5, twinkle: false };
const CORE_INNER: Look = { count: s => 34 + s * 4, life: 2.1, drag: 0.22, gravity: 50, trail: 0, twinkle: false };

// The point on a heart's outline (the classic parametric heart, scaled to fit within the unit circle), and on a five-pointed star's.
function heart(t: number): [number, number] {
  return [(16 * Math.sin(t) ** 3) / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17];
}
function star(u: number): [number, number] {
  // u in [0, 1) goes round the outline; ten vertices, outer and inner alternately, a point up.
  const vertices: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 1 : 0.42;
    vertices.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  const edge = Math.floor(u * 10) % 10;
  const f = u * 10 - Math.floor(u * 10);
  const [ax, ay] = vertices[edge];
  const [bx, by] = vertices[(edge + 1) % 10];
  return [ax + (bx - ax) * f, ay + (by - ay) * f];
}

// A speed that carries a star (slowing against the air as drag^t) about `radius` pixels by the end of its life.
function launchSpeed(radius: number, drag: number, life: number): number {
  return (radius * -Math.log(drag)) / (1 - Math.pow(drag, life));
}

function addSpark(scene: Scene, rng: () => number, x: number, y: number, vx: number, vy: number, look: Look, color: Color, scale: number): void {
  const life = look.life * (0.8 + rng() * 0.4) * (scene.calm ? 0.75 : 1);
  scene.sparks.push({
    x, y, vx, vy, life, maxLife: life, hue: (color.hue + (rng() - 0.5) * 14 + 360) % 360, sat: color.sat,
    size: (1.3 + rng() * 1.1) * Math.max(scale, 0.65), drag: look.drag, gravity: look.gravity * scale, twinkle: look.twinkle,
    trail: scene.calm ? Math.min(look.trail, 5) : look.trail, history: [],
  });
}

function burst(scene: Scene, rng: () => number, shell: Shell): BurstEvent {
  const scale = scene.width / 800;
  const radius = RADIUS_PX[shell.size] * scale;
  const calm = scene.calm ? 0.5 : 1;
  const room = () => MAX_SPARKS - scene.sparks.length;
  let made = 0;
  const layer = (look: Look, color: Color, reach: number, shape?: (i: number, n: number) => [number, number]) => {
    const n = Math.max(0, Math.min(Math.round(look.count(shell.size) * calm), room()));
    const speed = launchSpeed(radius * reach, look.drag, look.life);
    for (let i = 0; i < n; i++) {
      let dx: number, dy: number;
      if (shape) {
        [dx, dy] = shape(i, n);
      } else {
        // A round burst fills a ball seen from the side: the speeds are spread, with more near the rim.
        const angle = rng() * Math.PI * 2;
        const rim = 0.45 + 0.55 * Math.sqrt(rng());
        dx = Math.cos(angle) * rim;
        dy = Math.sin(angle) * rim;
      }
      addSpark(scene, rng, shell.x, shell.y, dx * speed, dy * speed, look, color, scale);
    }
    made += n;
  };
  const ringShape = (offset: number) => (i: number, n: number): [number, number] => [Math.cos(offset + (i / n) * Math.PI * 2), Math.sin(offset + (i / n) * Math.PI * 2)];
  const color = shell.color;
  switch (shell.kind) {
    case "core": {
      layer(CORE_OUTER, color, 1);
      layer(CORE_INNER, { hue: color.sat > 0 && color.hue > 20 && color.hue < 70 ? 2 : 44, sat: 95 }, 0.52);
      break;
    }
    case "willow": layer(LOOKS.willow, color, 1); break;
    case "ring": layer(LOOKS.ring, color, 1, ringShape(rng() * Math.PI * 2)); break;
    case "heart": layer(LOOKS.heart, color, 1, (i, n) => heart((i / n) * Math.PI * 2)); break;
    case "star": layer(LOOKS.star, color, 1, (i, n) => star(i / n)); break;
    default: layer(LOOKS[shell.kind], color, 1);
  }
  // Light, and smoke the wind will carry.
  if (scene.flashes.length < MAX_FLASHES) scene.flashes.push({ x: shell.x, y: shell.y, r: radius * 1.6, life: 0.5, maxLife: 0.5, hue: color.hue, sat: color.sat, strength: 0.3 + shell.size * 0.035 });
  if (!scene.calm) {
    const puffs = 2 + Math.floor(shell.size / 2);
    for (let i = 0; i < puffs && scene.smoke.length < MAX_SMOKE; i++) {
      const life = 8 + rng() * 6;
      scene.smoke.push({ x: shell.x + (rng() - 0.5) * radius * 0.9, y: shell.y + (rng() - 0.5) * radius * 0.7, vx: 0, vy: -2 * scale, r: (16 + rng() * 22) * scale, life, maxLife: life });
    }
  }
  return { x: shell.x, y: shell.y, kind: shell.kind, size: shell.size, count: made, hue: color.hue };
}

// A waterfall of slow golden sparks along a line (ナイアガラ), for `seconds`.
export function fountain(scene: Scene, x0: number, x1: number, y: number, seconds: number): void {
  scene.fountains.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y, left: seconds });
}

const FOUNTAIN_RATE = 460;

// Moves everything on by dt seconds; returns the bursts that happened (so the page can play their sounds).
export function step(scene: Scene, dt: number, rng: () => number): BurstEvent[] {
  const events: BurstEvent[] = [];
  const t = clamp(dt, 0, MAX_DT);
  const scale = scene.width / 800;
  scene.time += t;
  const windPush = scene.wind * 34 * scale;

  const flying: Shell[] = [];
  for (const shell of scene.shells) {
    shell.x += shell.vx * t;
    shell.y += shell.vy * t;
    shell.trail.push(shell.x, shell.y);
    if (shell.trail.length > 16) shell.trail.splice(0, 2);
    // Sparks fall from the rising shell.
    for (let i = 0; i < 2 && scene.sparks.length < MAX_SPARKS; i++) {
      if (rng() < 0.7) scene.sparks.push({ x: shell.x, y: shell.y, vx: (rng() - 0.5) * 22 * scale, vy: (rng() * 16 + 4) * scale, life: 0.45, maxLife: 0.45, hue: 40, sat: 90, size: 1.1 * Math.max(scale, 0.65), drag: 0.2, gravity: 90 * scale, twinkle: false, trail: 0, history: [] });
    }
    if (shell.y <= shell.targetY) events.push(burst(scene, rng, shell));
    else flying.push(shell);
  }
  scene.shells = flying;

  const alive: Fountain[] = [];
  for (const source of scene.fountains) {
    source.left -= t;
    const emit = Math.floor(FOUNTAIN_RATE * t + rng());
    for (let i = 0; i < emit && scene.sparks.length < MAX_SPARKS; i++) {
      const life = 1.6 + rng() * 0.9;
      scene.sparks.push({ x: source.x0 + rng() * (source.x1 - source.x0), y: source.y, vx: (rng() - 0.5) * 10 * scale, vy: (22 + rng() * 26) * scale, life, maxLife: life, hue: 42, sat: 85, size: (1.1 + rng() * 0.7) * Math.max(scale, 0.65), drag: 0.55, gravity: 70 * scale, twinkle: true, trail: 9, history: [] });
    }
    if (source.left > 0) alive.push(source);
  }
  scene.fountains = alive;

  const sparks: Spark[] = [];
  for (const spark of scene.sparks) {
    spark.life -= t;
    if (spark.life <= 0) continue;
    if (spark.trail > 0) {
      spark.history.push(spark.x, spark.y);
      if (spark.history.length > spark.trail * 2) spark.history.splice(0, 2);
    }
    const slow = Math.pow(spark.drag, t);
    spark.vx = spark.vx * slow + windPush * t;
    spark.vy = spark.vy * slow + spark.gravity * t;
    spark.x += spark.vx * t;
    spark.y += spark.vy * t;
    if (spark.y > scene.height * HORIZON + 6) continue;
    sparks.push(spark);
  }
  scene.sparks = sparks;

  scene.flashes = scene.flashes.filter(flash => (flash.life -= t) > 0);
  const smoke: Smoke[] = [];
  for (const puff of scene.smoke) {
    puff.life -= t;
    if (puff.life <= 0) continue;
    puff.vx += (scene.wind * 9 * scale - puff.vx) * Math.min(1, t * 0.6);
    puff.x += puff.vx * t;
    puff.y += puff.vy * t;
    puff.r += 5 * scale * t;
    smoke.push(puff);
  }
  scene.smoke = smoke;
  return events;
}

export type ShowItem =
  | { type: "shell"; at: number; x: number; y: number; kind: Kind; size: Size }
  | { type: "fountain"; at: number; x0: number; x1: number; y: number; seconds: number };
// The seconds from the start of the festival to the end of the finale.
export const SHOW_LENGTH = 56;

const KINDS_FOR_STARMINE: readonly Kind[] = ["peony", "chrysanthemum", "ring", "core"];

// Small shells in quick succession from a few places (スターマイン), from `start` for `seconds`.
export function starmine(rng: () => number, width: number, height: number, start: number, seconds: number): ShowItem[] {
  const items: ShowItem[] = [];
  const places = [0.2 + 0.1 * rng(), 0.45 + 0.1 * rng(), 0.7 + 0.1 * rng()];
  for (let at = start; at < start + seconds; at += 0.16 + rng() * 0.12) {
    const place = places[Math.floor(rng() * places.length)];
    items.push({ type: "shell", at, x: width * (place + (rng() - 0.5) * 0.22), y: height * (0.2 + 0.28 * rng()), kind: KINDS_FOR_STARMINE[Math.floor(rng() * KINDS_FOR_STARMINE.length)], size: 3 });
  }
  return items;
}

// A dense volley across the whole sky (フィナーレ): small and middle shells, and a few big ones at the end.
export function finale(rng: () => number, width: number, height: number, start: number): ShowItem[] {
  const items: ShowItem[] = [];
  const total = 44;
  for (let i = 0; i < total; i++) {
    const at = start + (i / total) * 7 + rng() * 0.1;
    items.push({ type: "shell", at, x: width * (0.06 + 0.88 * rng()), y: height * (0.13 + 0.34 * rng()), kind: i % 6 === 5 ? "willow" : i % 5 === 4 ? "ring" : pickKind(rng), size: i % 3 === 0 ? 5 : 3 });
  }
  for (let i = 0; i < 3; i++) items.push({ type: "shell", at: start + 7.6 + i * 0.5, x: width * (0.25 + 0.25 * i), y: height * (0.2 + 0.1 * rng()), kind: i === 1 ? "chrysanthemum" : "willow", size: 10 });
  return items;
}

// A whole festival: single shells, a starmine, a Niagara with shaped shells, big shells, then the finale.
export function showSchedule(rng: () => number, width: number, height: number): ShowItem[] {
  const items: ShowItem[] = [];
  const spot = (): { x: number; y: number } => ({ x: width * (0.14 + 0.72 * rng()), y: height * (0.18 + 0.3 * rng()) });
  for (let at = 0.5; at < 12; at += 1.5 + rng() * 0.6) items.push({ type: "shell", at, ...spot(), kind: pickKind(rng), size: 5 });
  items.push(...starmine(rng, width, height, 13, 11));
  items.push({ type: "fountain", at: 26, x0: width * 0.2, x1: width * 0.8, y: height * 0.5, seconds: 12 });
  const shaped: Kind[] = ["heart", "star", "core", "ring", "heart", "star"];
  shaped.forEach((kind, i) => items.push({ type: "shell", at: 27 + i * 2, ...spot(), kind, size: 8 }));
  for (let i = 0; i < 3; i++) items.push({ type: "shell", at: 40 + i * 1.8, ...spot(), kind: i === 1 ? "core" : "chrysanthemum", size: 10 });
  items.push(...finale(rng, width, height, 46));
  return items.sort((a, b) => a.at - b.at);
}
