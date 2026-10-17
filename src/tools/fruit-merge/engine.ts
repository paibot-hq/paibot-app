import type MatterJS from "matter-js";

// Fruit merge rules and physics, shared by the page and engine.test.mjs.
// Matter is passed in so Node can play the same box headlessly.
//
// Fruits are dropped from above the box; two of a kind that touch become one
// of the next kind, at their midpoint. Two watermelons, the last kind, simply
// vanish. A fruit that stays above the line too long ends the game.

// The inside of the box; `line` is the height a fruit must stay below.
export const BOX = { width: 400, height: 560, line: 96 } as const;
export const STEP_MS = 1000 / 60;
const SUBSTEPS = 2;
// Where the fruit in hand waits before it is dropped.
export const DROP_Y = 44;

export const FRUITS = [
  { key: "cherry", radius: 13, color: "#e0243b" },
  { key: "strawberry", radius: 17, color: "#f2545b" },
  { key: "grape", radius: 23, color: "#8e5cd9" },
  { key: "dekopon", radius: 27, color: "#ffa62b" },
  { key: "persimmon", radius: 34, color: "#f26b1d" },
  { key: "apple", radius: 42, color: "#e63946" },
  { key: "pear", radius: 49, color: "#e9d66b" },
  { key: "peach", radius: 57, color: "#ffb0a0" },
  { key: "pineapple", radius: 66, color: "#f6c83d" },
  { key: "melon", radius: 76, color: "#9bd770" },
  { key: "watermelon", radius: 92, color: "#2f9e44" },
] as const;
export type FruitKey = (typeof FRUITS)[number]["key"];
export const LAST = FRUITS.length - 1;
// Only the five smallest are ever handed out.
export const DROPPABLE = 5;
// Points for making a fruit of each kind: 1, 3, 6, ... 55 for a watermelon,
// and 66 when two watermelons vanish.
export const points = (kind: number) => (kind * (kind + 1)) / 2;
export const VANISH_POINTS = points(FRUITS.length);

// Steps between drops, so the next fruit can't be fired straight after.
export const COOLDOWN = 30;
// A dropped fruit is not checked against the line while it falls in.
const GRACE = 60;
// How long a fruit may stay above the line before the game ends.
export const OVER_STEPS = 120;
// A merged fruit grows from this share of its size, so it doesn't fling
// its neighbours away.
const GROW_FROM = 0.6;
const GROW_STEP = 0.08;

export type Fruit = { body: MatterJS.Body; kind: number; born: number; scale: number; overSteps: number };
export type FruitEvent =
  | { type: "drop"; kind: number }
  | { type: "merge"; kind: number; x: number; y: number }
  | { type: "vanish"; x: number; y: number }
  | { type: "gameOver" };

type Matter = typeof MatterJS;

export function createFruitMerge(M: Matter, random: () => number = Math.random) {
  const { Bodies, Body, Composite, Engine, Events } = M;
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0016 }, positionIterations: 8, velocityIterations: 6 });
  // Walls reach far above the box, so a fruit flung up still lands inside.
  const thick = 60;
  const wall = (x: number, y: number, w: number, h: number) => Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.2, restitution: 0.1 });
  Composite.add(engine.world, [
    wall(-thick / 2, 0, thick, BOX.height * 2),
    wall(BOX.width + thick / 2, 0, thick, BOX.height * 2),
    wall(BOX.width / 2, BOX.height + thick / 2, BOX.width + thick * 2, thick),
  ]);

  const fruits = new Map<number, Fruit>();
  const listeners: ((event: FruitEvent) => void)[] = [];
  const emit = (event: FruitEvent) => listeners.forEach(listener => listener(event));
  const pick = () => Math.min(DROPPABLE - 1, Math.floor(random() * DROPPABLE));
  const state = {
    score: 0, drops: 0, steps: 0, over: false, danger: false, cooldown: 0, maxKind: 0,
    current: pick(), next: pick(), aim: BOX.width / 2,
  };

  const radiusOf = (fruit: Fruit) => FRUITS[fruit.kind].radius * fruit.scale;
  const clampAim = (x: number, kind = state.current) => {
    const r = FRUITS[kind].radius;
    return Math.min(BOX.width - r, Math.max(r, x));
  };

  const spawn = (kind: number, x: number, y: number, scale = 1, born = state.steps) => {
    const body = Bodies.circle(x, y, FRUITS[kind].radius * scale, { friction: 0.05, frictionStatic: 0.2, restitution: 0.15, density: 0.001 });
    const fruit: Fruit = { body, kind, born, scale, overSteps: 0 };
    fruits.set(body.id, fruit);
    Composite.add(engine.world, body);
    state.maxKind = Math.max(state.maxKind, kind);
    return fruit;
  };
  const remove = (fruit: Fruit) => {
    fruits.delete(fruit.body.id);
    Composite.remove(engine.world, fruit.body);
  };

  // Same-kind contacts seen during an update, merged after it.
  let touching: [Fruit, Fruit][] = [];
  const collect = (event: MatterJS.IEventCollision<MatterJS.Engine>) => {
    for (const pair of event.pairs) {
      const a = fruits.get(pair.bodyA.id), b = fruits.get(pair.bodyB.id);
      if (a && b && a.kind === b.kind) touching.push([a, b]);
    }
  };
  Events.on(engine, "collisionStart", collect);
  Events.on(engine, "collisionActive", collect);

  const merge = () => {
    const pairs = touching;
    touching = [];
    for (const [a, b] of pairs) {
      // Each fruit merges at most once; the first pair it was found in wins.
      if (!fruits.has(a.body.id) || !fruits.has(b.body.id)) continue;
      const x = (a.body.position.x + b.body.position.x) / 2;
      const y = (a.body.position.y + b.body.position.y) / 2;
      remove(a);
      remove(b);
      if (a.kind === LAST) {
        state.score += VANISH_POINTS;
        emit({ type: "vanish", x, y });
        continue;
      }
      const kind = a.kind + 1;
      // Counted against the line at once: it didn't fall in from above.
      const fruit = spawn(kind, x, y, GROW_FROM, state.steps - GRACE);
      Body.setVelocity(fruit.body, { x: (a.body.velocity.x + b.body.velocity.x) / 2, y: (a.body.velocity.y + b.body.velocity.y) / 2 });
      state.score += points(kind);
      emit({ type: "merge", kind, x, y });
    }
  };

  const grow = () => {
    for (const fruit of fruits.values()) {
      if (fruit.scale >= 1) continue;
      const scale = Math.min(1, fruit.scale + GROW_STEP);
      Body.scale(fruit.body, scale / fruit.scale, scale / fruit.scale);
      fruit.scale = scale;
    }
  };

  const checkLine = () => {
    let danger = false;
    for (const fruit of fruits.values()) {
      const above = state.steps - fruit.born > GRACE && fruit.body.position.y - radiusOf(fruit) < BOX.line;
      fruit.overSteps = above ? fruit.overSteps + 1 : 0;
      if (above) danger = true;
      if (fruit.overSteps >= OVER_STEPS && !state.over) {
        state.over = true;
        emit({ type: "gameOver" });
      }
    }
    state.danger = danger && !state.over;
  };

  return {
    engine,
    state,
    FRUITS,
    radiusOf,
    fruits: () => [...fruits.values()],
    // For tests: put a fruit straight into the box.
    spawn,
    onEvent(listener: (event: FruitEvent) => void) { listeners.push(listener); },
    setAim(x: number) { state.aim = clampAim(x); },
    // Whether a fruit can be dropped now.
    ready: () => !state.over && state.cooldown === 0,
    drop() {
      if (state.over || state.cooldown > 0) return false;
      const kind = state.current;
      spawn(kind, clampAim(state.aim, kind), DROP_Y);
      state.current = state.next;
      state.next = pick();
      state.aim = clampAim(state.aim);
      state.cooldown = COOLDOWN;
      state.drops += 1;
      emit({ type: "drop", kind });
      return true;
    },
    step() {
      for (let i = 0; i < SUBSTEPS; i++) {
        Engine.update(engine, STEP_MS / SUBSTEPS);
        merge();
      }
      grow();
      state.steps += 1;
      if (state.cooldown > 0) state.cooldown -= 1;
      if (!state.over) checkLine();
    },
  };
}

export type FruitMerge = ReturnType<typeof createFruitMerge>;
