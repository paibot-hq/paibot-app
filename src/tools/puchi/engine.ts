// The rules of the bubble sheet, with no drawing and no sound, so that they can be tested: the sheet, the pops (a golden bubble sets off the ones around
// it, a rainbow one the whole sheet), the combo that rises while pops follow one another, the points and the milestones.

export type Rng = () => number;
export type BubbleKind = "normal" | "gold" | "rainbow";
export type Bubble = { kind: BubbleKind; popped: boolean; popAt: number; born: number };
export type Layout = { cols: number; rows: number; cell: number; ox: number; oy: number };
export type Sheet = { layout: Layout; bubbles: Bubble[]; remaining: number };

// A pop that is going to be seen and heard: at `at` seconds on the scene's clock. `chain` is a pop set off by another one.
export type PopEvent = { index: number; at: number; kind: BubbleKind; chain: boolean };
export type Combo = { count: number; last: number; best: number };

export const COMBO_WINDOW = 0.7; // seconds between pops that keep the combo going
export const MILESTONES = [10, 25, 50, 100, 200, 400];
export const GOLD_SHARE = 0.06;
export const CLEAR_BONUS = 100;
export const REFILL_DELAY = 0.9;

export function layoutFor(width: number, height: number): Layout {
  const cols = Math.max(5, Math.min(14, Math.floor(width / 44)));
  const cell = width / cols;
  const rows = Math.max(4, Math.floor(height / cell));
  return { cols, rows, cell, ox: 0, oy: (height - rows * cell) / 2 };
}

export function centerOf(layout: Layout, index: number): { x: number; y: number } {
  return { x: layout.ox + ((index % layout.cols) + 0.5) * layout.cell, y: layout.oy + (Math.floor(index / layout.cols) + 0.5) * layout.cell };
}

// The bubble under a point, or -1 (the gaps between bubbles belong to the nearest one, so a quick swipe does not miss).
export function indexAt(layout: Layout, x: number, y: number): number {
  const col = Math.floor((x - layout.ox) / layout.cell), row = Math.floor((y - layout.oy) / layout.cell);
  if (col < 0 || col >= layout.cols || row < 0 || row >= layout.rows) return -1;
  return row * layout.cols + col;
}

// A new sheet. Its bubbles are born at `now` plus a delay by distance from the middle, so that they swell outwards like a wave.
export function createSheet(layout: Layout, rng: Rng, now = 0, swell = true): Sheet {
  const count = layout.cols * layout.rows;
  const bubbles: Bubble[] = [];
  const middle = { x: (layout.cols - 1) / 2, y: (layout.rows - 1) / 2 };
  for (let index = 0; index < count; index++) {
    const col = index % layout.cols, row = Math.floor(index / layout.cols);
    const distance = Math.hypot(col - middle.x, row - middle.y);
    bubbles.push({ kind: rng() < GOLD_SHARE ? "gold" : "normal", popped: false, popAt: 0, born: swell ? now + distance * 0.035 : now - 1 });
  }
  // One rainbow bubble on about every second sheet.
  if (rng() < 0.5) bubbles[Math.floor(rng() * count)].kind = "rainbow";
  return { layout, bubbles, remaining: count };
}

const distanceBetween = (layout: Layout, a: number, b: number) =>
  Math.hypot((a % layout.cols) - (b % layout.cols), Math.floor(a / layout.cols) - Math.floor(b / layout.cols));

// Pops the bubble `index` at time `now` and returns the pops that follow from it, in order of time. A golden bubble sets off every bubble within two
// cells (and a golden one among them does the same in turn); a rainbow one sets off the whole sheet, in a wave from where it was. Bubbles are marked as
// popped at once, so `remaining` is right straight away; `popAt` is when they are drawn as popped.
export function popBubble(sheet: Sheet, index: number, now: number): PopEvent[] {
  const first = sheet.bubbles[index];
  if (!first || first.popped || now < first.born) return [];
  const events: PopEvent[] = [];
  const set = (target: number, at: number, chain: boolean) => {
    const bubble = sheet.bubbles[target];
    bubble.popped = true; bubble.popAt = at;
    sheet.remaining--;
    events.push({ index: target, at, kind: bubble.kind, chain });
  };
  set(index, now, false);
  const queue = [index];
  while (queue.length) {
    const from = queue.shift()!;
    const origin = sheet.bubbles[from];
    if (origin.kind === "normal") continue;
    const base = origin.popAt;
    const reach = origin.kind === "rainbow" ? Infinity : 2;
    const pace = origin.kind === "rainbow" ? 0.03 : 0.05;
    for (let other = 0; other < sheet.bubbles.length; other++) {
      if (sheet.bubbles[other].popped) continue;
      const distance = distanceBetween(sheet.layout, from, other);
      if (distance > reach) continue;
      set(other, base + distance * pace, true);
      if (sheet.bubbles[other].kind !== "normal") queue.push(other);
    }
  }
  return events.sort((a, b) => a.at - b.at);
}

export const newCombo = (best = 0): Combo => ({ count: 0, last: -Infinity, best });

// A pop at time `at`: the combo goes on if the last one was within the window, and starts again from one if not. Returns the count after.
export function bump(combo: Combo, at: number): number {
  combo.count = at - combo.last <= COMBO_WINDOW ? combo.count + 1 : 1;
  combo.last = at;
  if (combo.count > combo.best) combo.best = combo.count;
  return combo.count;
}

// Whether the combo has run out by `now` (so the display can go away).
export const lapsed = (combo: Combo, now: number) => combo.count > 0 && now - combo.last > COMBO_WINDOW;

// Ten points a pop, and one more tenfold step for every ten in a row.
export const pointsFor = (count: number) => 10 * (1 + Math.floor(count / 10));

// The highest milestone that a combo went over when it rose from `before` to `after`, or null.
export function milestoneCrossed(before: number, after: number): number | null {
  let found: number | null = null;
  for (const milestone of MILESTONES) if (before < milestone && after >= milestone) found = milestone;
  return found;
}

// The pop climbs a pentatonic scale as the combo grows, for two octaves and then stays at the top, so a long combo does not turn shrill.
const PENTATONIC = [0, 2, 4, 7, 9];
export function semitones(count: number): number {
  const step = Math.min(Math.max(count, 1) - 1, PENTATONIC.length * 2);
  return PENTATONIC[step % PENTATONIC.length] + 12 * Math.floor(step / PENTATONIC.length);
}
export const frequency = (count: number) => 392 * 2 ** (semitones(count) / 12);

// ---- the scene: the sheet with what is going on around it ----

export type Particle = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; hue: number };
export type Ring = { x: number; y: number; age: number; life: number; size: number; hue: number };
export type Scene = {
  width: number; height: number; time: number; calm: boolean;
  sheet: Sheet; queue: PopEvent[]; particles: Particle[]; rings: Ring[];
  combo: Combo; score: number; pops: number; sheets: number;
  shake: number; flash: number; refillAt: number | null; hue: number; milestone: { at: number; value: number } | null; cleared: number;
};
// What a step asks the outside to do: play these sounds, vibrate.
export type Sound = { type: "pop"; combo: number; chain: boolean; kind: BubbleKind } | { type: "milestone"; value: number } | { type: "clear" };

export function createScene(width: number, height: number, rng: Rng, best = 0): Scene {
  return {
    width, height, time: 0, calm: false, sheet: createSheet(layoutFor(width, height), rng, 0), queue: [], particles: [], rings: [],
    combo: newCombo(best), score: 0, pops: 0, sheets: 1, shake: 0, flash: 0, refillAt: null, hue: 200, milestone: null, cleared: 0,
  };
}

// A new size (the window changed): the sheet is made again to fit.
export function resize(scene: Scene, width: number, height: number, rng: Rng) {
  scene.width = width; scene.height = height;
  scene.sheet = createSheet(layoutFor(width, height), rng, scene.time);
  scene.queue = []; scene.refillAt = null;
}

export function press(scene: Scene, index: number): boolean {
  const events = popBubble(scene.sheet, index, scene.time);
  scene.queue.push(...events);
  return events.length > 0;
}

// Pops the next bubble in reading order: the way to play with the keyboard.
export function pressNext(scene: Scene): boolean {
  const next = scene.sheet.bubbles.findIndex(bubble => !bubble.popped && scene.time >= bubble.born);
  return next >= 0 && press(scene, next);
}

export function burst(scene: Scene, x: number, y: number, count: number, hue: number, speed: number, rng: Rng) {
  const n = scene.calm ? Math.ceil(count / 3) : count;
  for (let i = 0; i < n; i++) {
    const angle = rng() * Math.PI * 2, v = speed * (0.4 + rng() * 0.8);
    scene.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - speed * 0.3, age: 0, life: 0.45 + rng() * 0.5, size: 2 + rng() * 3.5, hue: hue + (rng() - 0.5) * 40 });
  }
  scene.rings.push({ x, y, age: 0, life: 0.35, size: scene.sheet.layout.cell * 0.9, hue });
  if (scene.particles.length > 600) scene.particles.splice(0, scene.particles.length - 600);
}

// Moves the scene on by `dt` seconds: pops that have come due happen (combo, points, sparks), the bits fly, and a cleared sheet is made again.
export function step(scene: Scene, dt: number, rng: Rng): Sound[] {
  const sounds: Sound[] = [];
  scene.time += dt;
  const { layout } = scene.sheet;
  scene.queue.sort((a, b) => a.at - b.at);
  while (scene.queue.length && scene.queue[0].at <= scene.time) {
    const event = scene.queue.shift()!;
    const before = scene.combo.count;
    const count = bump(scene.combo, event.at);
    scene.pops++;
    scene.score += pointsFor(count);
    const { x, y } = centerOf(layout, event.index);
    const hue = event.kind === "gold" ? 45 : event.kind === "rainbow" ? (scene.time * 200) % 360 : 195 + Math.min(count, 60) * 1.5;
    burst(scene, x, y, event.kind === "normal" ? 7 : 16, hue, event.kind === "normal" ? 150 : 260, rng);
    sounds.push({ type: "pop", combo: count, chain: event.chain, kind: event.kind });
    if (event.kind !== "normal") scene.shake = Math.max(scene.shake, 0.5);
    const milestone = milestoneCrossed(before, count);
    if (milestone !== null) {
      sounds.push({ type: "milestone", value: milestone });
      scene.milestone = { at: scene.time, value: milestone };
      scene.flash = 1; scene.shake = 1;
      for (let i = 0; i < 4; i++) burst(scene, rng() * scene.width, rng() * scene.height * 0.8, 14, rng() * 360, 320, rng);
    }
  }
  if (scene.sheet.remaining === 0 && scene.queue.length === 0 && scene.refillAt === null) {
    scene.refillAt = scene.time + REFILL_DELAY;
    scene.score += CLEAR_BONUS; scene.cleared++;
    scene.flash = Math.max(scene.flash, 0.6);
    sounds.push({ type: "clear" });
    for (let i = 0; i < 6; i++) burst(scene, rng() * scene.width, rng() * scene.height * 0.8, 16, rng() * 360, 340, rng);
  }
  if (scene.refillAt !== null && scene.time >= scene.refillAt) {
    scene.sheet = createSheet(layout, rng, scene.time);
    scene.sheets++; scene.refillAt = null;
  }
  for (const p of scene.particles) { p.age += dt; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  scene.particles = scene.particles.filter(p => p.age < p.life);
  for (const ring of scene.rings) ring.age += dt;
  scene.rings = scene.rings.filter(ring => ring.age < ring.life);
  scene.shake = scene.calm ? 0 : Math.max(0, scene.shake - dt * 2.5);
  scene.flash = scene.calm ? 0 : Math.max(0, scene.flash - dt * 2.2);
  if (lapsed(scene.combo, scene.time)) scene.combo.count = 0;
  return sounds;
}
