// The rules of the bubble sheet, with no drawing and no sound, so that they can be tested: the sheet, the pops (a golden bubble sets off the ones around
// it, a rainbow one the whole sheet), the combo that rises while pops follow one another, the points and the milestones.

export type Rng = () => number;
// gold: sets off its neighbours and starts a fever; rainbow: the whole sheet; ice: takes two taps; time: adds seconds in the timed modes.
export type BubbleKind = "normal" | "gold" | "rainbow" | "ice" | "time";
export type Bubble = { kind: BubbleKind; popped: boolean; popAt: number; born: number; cracked: boolean };
export type Layout = { cols: number; rows: number; cell: number; ox: number; oy: number };
export type Sheet = { layout: Layout; bubbles: Bubble[]; remaining: number };

// A pop that is going to be seen and heard: at `at` seconds on the scene's clock. `chain` is a pop set off by another one.
export type PopEvent = { index: number; at: number; kind: BubbleKind; chain: boolean; crack?: boolean };
export type Combo = { count: number; last: number; best: number };

export const COMBO_WINDOW = 0.7; // seconds between pops that keep the combo going
export const MILESTONES = [10, 25, 50, 100, 200, 400];
export const GOLD_SHARE = 0.06;
export const ICE_SHARE = 0.05;
export const TIME_SHARE = 0.03; // only on the sheets of the timed modes
export const TIME_LIMIT = 30; // seconds of a run
export const TIME_BONUS = 2; // a time bubble
export const CLEAR_TIME = 3; // a cleared sheet, in the timed modes
export const FEVER_GOLD = { seconds: 5, mult: 2 };
export const FEVER_RAINBOW = { seconds: 8, mult: 3 };
export const COUNTDOWN = 3;
// What a run of 30 seconds is worth, from steady tapping (C) to swiping without a break and keeping the fever on (S).
export const RANKS: { rank: "S" | "A" | "B" | "C"; from: number }[] = [{ rank: "S", from: 16000 }, { rank: "A", from: 8000 }, { rank: "B", from: 3000 }, { rank: "C", from: 0 }];
export const rankFor = (score: number) => (RANKS.find(entry => score >= entry.from) ?? RANKS[RANKS.length - 1]).rank;
export const CLEAR_BONUS = 100;
export const REFILL_DELAY = 0.9;

// The sheet is 8 x 8 on every screen, so that a run is the same game (and a daily sheet the same sheet) on a phone and on a desktop.
export const COLS = 8;
export function layoutFor(width: number, height: number): Layout {
  const cell = width / COLS;
  return { cols: COLS, rows: COLS, cell, ox: 0, oy: (height - COLS * cell) / 2 };
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
export function createSheet(layout: Layout, rng: Rng, now = 0, swell = true, options: { timed?: boolean } = {}): Sheet {
  const count = layout.cols * layout.rows;
  const bubbles: Bubble[] = [];
  const middle = { x: (layout.cols - 1) / 2, y: (layout.rows - 1) / 2 };
  for (let index = 0; index < count; index++) {
    const col = index % layout.cols, row = Math.floor(index / layout.cols);
    const distance = Math.hypot(col - middle.x, row - middle.y);
    const roll = rng();
    const kind: BubbleKind = roll < GOLD_SHARE ? "gold" : roll < GOLD_SHARE + ICE_SHARE ? "ice" : options.timed && roll < GOLD_SHARE + ICE_SHARE + TIME_SHARE ? "time" : "normal";
    bubbles.push({ kind, popped: false, popAt: 0, born: swell ? now + distance * 0.035 : now - 1, cracked: false });
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
  // Ice takes two taps: the first one only cracks it.
  if (first.kind === "ice" && !first.cracked) { first.cracked = true; return [{ index, at: now, kind: "ice", chain: false, crack: true }]; }
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
    if (origin.kind !== "gold" && origin.kind !== "rainbow") continue;
    const base = origin.popAt;
    const reach = origin.kind === "rainbow" ? Infinity : 2;
    const pace = origin.kind === "rainbow" ? 0.03 : 0.05;
    for (let other = 0; other < sheet.bubbles.length; other++) {
      if (sheet.bubbles[other].popped) continue;
      const distance = distanceBetween(sheet.layout, from, other);
      if (distance > reach) continue;
      set(other, base + distance * pace, true);
      if (sheet.bubbles[other].kind === "gold" || sheet.bubbles[other].kind === "rainbow") queue.push(other);
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

export type Mode = "free" | "timed" | "daily";
// ready: a timed mode waits for the start; countdown: 3, 2, 1; playing; over: the result is shown.
export type Phase = "ready" | "countdown" | "playing" | "over";
export type Particle = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; hue: number };
export type Ring = { x: number; y: number; age: number; life: number; size: number; hue: number };
export type Floater = { x: number; y: number; text: string; age: number; life: number };
export type Fever = { until: number; mult: number };
export type Scene = {
  width: number; height: number; time: number; calm: boolean;
  mode: Mode; phase: Phase; seed: string | null; timeLeft: number; countdown: number;
  sheet: Sheet; queue: PopEvent[]; particles: Particle[]; rings: Ring[]; floaters: Floater[];
  combo: Combo; runBest: number; score: number; pops: number; sheets: number; fever: Fever | null;
  shake: number; flash: number; refillAt: number | null; milestone: { at: number; value: number } | null; cleared: number;
};
// What a step asks the outside to do: play these sounds, vibrate.
export type Sound =
  | { type: "pop"; combo: number; chain: boolean; kind: BubbleKind }
  | { type: "crack" } | { type: "time" } | { type: "fever" } | { type: "milestone"; value: number } | { type: "clear" }
  | { type: "tick"; n: number } | { type: "go" } | { type: "end" };

export function createScene(width: number, height: number, rng: Rng, best = 0): Scene {
  return {
    width, height, time: 0, calm: false, mode: "free", phase: "playing", seed: null, timeLeft: 0, countdown: 0,
    sheet: createSheet(layoutFor(width, height), rng, 0), queue: [], particles: [], rings: [], floaters: [],
    combo: newCombo(best), runBest: 0, score: 0, pops: 0, sheets: 1, fever: null, shake: 0, flash: 0, refillAt: null, milestone: null, cleared: 0,
  };
}

// A small seeded generator, so that a daily sheet is the same for everyone: the sheet number n of a day is made from "<day>:<n>".
export function seededRng(text: string): Rng {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  let state = h >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
// The day in Japan (the sheet changes at midnight there, whatever the viewer's clock says).
export const dailySeed = (now: Date) => new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10);

function sheetFor(scene: Scene, rng: Rng): Sheet {
  const source = scene.seed ? seededRng(`${scene.seed}:${scene.sheets}`) : rng;
  return createSheet(scene.sheet.layout, source, scene.time, true, { timed: scene.mode !== "free" });
}

// Sets up a run in `mode` with a fresh sheet. The timed modes wait in "ready" for begin(); the free one just plays.
export function prepare(scene: Scene, mode: Mode, rng: Rng, seed: string | null = null) {
  scene.mode = mode; scene.seed = mode === "daily" ? seed : null;
  scene.score = 0; scene.pops = 0; scene.sheets = 1; scene.cleared = 0; scene.runBest = 0; scene.fever = null;
  scene.combo.count = 0; scene.combo.last = -Infinity;
  scene.queue = []; scene.particles = []; scene.rings = []; scene.floaters = [];
  scene.refillAt = null; scene.milestone = null; scene.shake = 0; scene.flash = 0;
  scene.timeLeft = mode === "free" ? 0 : TIME_LIMIT; scene.countdown = COUNTDOWN;
  scene.phase = mode === "free" ? "playing" : "ready";
  scene.sheet = sheetFor(scene, rng);
}
export function begin(scene: Scene) { if (scene.phase === "ready") { scene.phase = "countdown"; scene.countdown = COUNTDOWN; } }

// A new size (the window changed): the sheet is made again to fit, and a run that was on is given up.
export function resize(scene: Scene, width: number, height: number, rng: Rng) {
  scene.width = width; scene.height = height;
  scene.sheet = createSheet(layoutFor(width, height), rng, scene.time, true, { timed: scene.mode !== "free" });
  if (scene.seed) scene.sheet = createSheet(layoutFor(width, height), seededRng(`${scene.seed}:${scene.sheets}`), scene.time, true, { timed: true });
  scene.queue = []; scene.refillAt = null;
}

export function press(scene: Scene, index: number): boolean {
  if (scene.phase !== "playing") return false;
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

const floater = (scene: Scene, x: number, y: number, text: string) => scene.floaters.push({ x, y, text, age: 0, life: 0.9 });
export const feverMult = (scene: Scene) => (scene.fever && scene.time < scene.fever.until ? scene.fever.mult : 1);

// Moves the scene on by `dt` seconds: the countdown and the clock, pops that have come due (combo, fever, points, sparks), the bits that fly, and a
// cleared sheet made again.
export function step(scene: Scene, dt: number, rng: Rng): Sound[] {
  const sounds: Sound[] = [];
  scene.time += dt;
  const timed = scene.mode !== "free";
  if (scene.phase === "countdown") {
    const before = Math.ceil(scene.countdown);
    scene.countdown -= dt;
    const after = Math.ceil(scene.countdown);
    if (scene.countdown <= 0) { scene.phase = "playing"; sounds.push({ type: "go" }); }
    else if (after !== before) sounds.push({ type: "tick", n: after });
  } else if (scene.phase === "playing" && timed) {
    scene.timeLeft -= dt;
    if (scene.timeLeft <= 0) {
      scene.timeLeft = 0; scene.phase = "over"; scene.queue = []; scene.combo.count = 0; scene.fever = null;
      scene.flash = Math.max(scene.flash, 0.5);
      sounds.push({ type: "end" });
    }
  }
  const { layout } = scene.sheet;
  if (scene.phase === "playing") {
    scene.queue.sort((a, b) => a.at - b.at);
    while (scene.queue.length && scene.queue[0].at <= scene.time) {
      const event = scene.queue.shift()!;
      const before = scene.combo.count;
      const count = bump(scene.combo, event.at);
      if (count > scene.runBest) scene.runBest = count;
      const { x, y } = centerOf(layout, event.index);
      if (event.crack) {
        // The first tap on ice: it cracks, and keeps the streak going; no points yet.
        burst(scene, x, y, 5, 190, 110, rng);
        sounds.push({ type: "crack" });
        continue;
      }
      scene.pops++;
      scene.score += pointsFor(count) * feverMult(scene);
      const hue = event.kind === "gold" ? 45 : event.kind === "rainbow" ? (scene.time * 200) % 360 : event.kind === "time" ? 140 : 195 + Math.min(count, 60) * 1.5;
      burst(scene, x, y, event.kind === "normal" ? 7 : 16, hue, event.kind === "normal" ? 150 : 260, rng);
      sounds.push({ type: "pop", combo: count, chain: event.chain, kind: event.kind });
      if (event.kind === "gold" || event.kind === "rainbow") {
        scene.shake = Math.max(scene.shake, 0.5);
        const fever = event.kind === "gold" ? FEVER_GOLD : FEVER_RAINBOW;
        const active = scene.fever !== null && scene.time < scene.fever.until;
        scene.fever = { until: Math.max(active ? scene.fever!.until : 0, scene.time + fever.seconds), mult: Math.max(active ? scene.fever!.mult : 1, fever.mult) };
        if (!active) sounds.push({ type: "fever" });
      }
      if (event.kind === "time" && timed) {
        scene.timeLeft += TIME_BONUS;
        floater(scene, x, y, `+${TIME_BONUS}s`);
        sounds.push({ type: "time" });
      }
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
      scene.score += CLEAR_BONUS * feverMult(scene); scene.cleared++;
      if (timed) { scene.timeLeft += CLEAR_TIME; floater(scene, scene.width / 2, scene.height / 2, `+${CLEAR_TIME}s`); }
      scene.flash = Math.max(scene.flash, 0.6);
      sounds.push({ type: "clear" });
      for (let i = 0; i < 6; i++) burst(scene, rng() * scene.width, rng() * scene.height * 0.8, 16, rng() * 360, 340, rng);
    }
  }
  if (scene.refillAt !== null && scene.time >= scene.refillAt) {
    scene.sheets++;
    scene.sheet = sheetFor(scene, rng);
    scene.refillAt = null;
  }
  if (scene.fever && scene.time >= scene.fever.until) scene.fever = null;
  for (const p of scene.particles) { p.age += dt; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  scene.particles = scene.particles.filter(p => p.age < p.life);
  for (const ring of scene.rings) ring.age += dt;
  scene.rings = scene.rings.filter(ring => ring.age < ring.life);
  for (const f of scene.floaters) { f.age += dt; f.y -= 40 * dt; }
  scene.floaters = scene.floaters.filter(f => f.age < f.life);
  scene.shake = scene.calm ? 0 : Math.max(0, scene.shake - dt * 2.5);
  scene.flash = scene.calm ? 0 : Math.max(0, scene.flash - dt * 2.2);
  if (scene.phase === "playing" && lapsed(scene.combo, scene.time)) scene.combo.count = 0;
  return sounds;
}
