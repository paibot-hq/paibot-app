// Goldfish escape: the rules and the water, shared by the page and engine.test.mjs. Plain numbers, no physics library,
// and the random numbers are passed in, so Node can play a whole game the same way every time.
//
// A goldfish at a scooping stall swims in a tank that slides by. Each tap is a stroke of its tail that lifts it; left
// alone it sinks slowly, as a fish does, and rests on the gravel. Paper scoops (poi) come in from the right, dip into the
// water towards where the fish was and lift out again after passing it. A scoop that touches the fish catches it and the
// game is over; but paper does not last in water, and a scoop that stays under too long tears and can catch nothing.
// Food drifts by: each pellet eaten makes the fish a little bigger, so every scoop passed is worth more, and the fish is
// easier to catch.

export const TANK = { width: 400, height: 560, surface: 48, floor: 528 } as const;
export const STEP_MS = 1000 / 60;
// The fish stays at this distance from the left; the tank moves, not the fish.
export const FISH_X = 112;

// Water: a tap sets the fish rising at STROKE; then it slows and sinks by SINK each step, never faster than MAX_SINK.
export const STROKE = -4.2;
export const SINK = 0.13;
export const MAX_SINK = 3.2;
const DRAG = 0.985;

// The scoops: their paper's radius, how fast they go by at first and at most, and the distance between two.
export const POI_RADIUS = 38;
export const START_SPEED = 2.2;
export const MAX_SPEED = 4.4;
const SPEED_UP = 0.04;
const SPACING = 240;
// How long a scoop's paper lasts under water, in steps: a new length for each scoop, from TEAR_MIN to TEAR_MAX.
export const TEAR_MIN = 150;
export const TEAR_MAX = 300;

// Food: one pellet every so many steps; every FOOD_PER_SIZE eaten makes the fish one size bigger, up to MAX_SIZE.
const FOOD_EVERY = 170;
export const FOOD_PER_SIZE = 3;
export const MAX_SIZE = 4;
export const fishRadius = (size: number) => 12 + size * 3;
// A scoop passed is worth 1 point at the smallest size and one more for each size above it.
export const passPoints = (size: number) => 1 + size;

export type Poi = { id: number; x: number; y: number; targetY: number; startX: number; under: number; tearAt: number; torn: boolean; passed: boolean };
export type Food = { id: number; x: number; y: number };
export type EscapeEvent =
  | { type: "stroke" }
  | { type: "eat"; size: number; grew: boolean }
  | { type: "pass"; points: number }
  | { type: "tear" }
  | { type: "caught" };

export type EscapeState = {
  started: boolean;
  over: boolean;
  steps: number;
  fishY: number;
  vy: number;
  size: number;
  eaten: number;
  score: number;
  passed: number;
  strokes: number;
  speed: number;
};

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

// Where a scoop's paper is, as it crosses the tank: above the water when it comes in, deepest as it reaches the fish's
// column, out again once well past it.
export function poiDepth(poi: Pick<Poi, "x" | "startX" | "targetY">): number {
  const top = TANK.surface - POI_RADIUS - 24;
  const p = clamp((poi.startX - poi.x) / (poi.startX - FISH_X), 0, 2);
  return top + (poi.targetY - top) * Math.sin((p * Math.PI) / 2);
}

export function createGoldfishEscape(random: () => number = Math.random) {
  const state: EscapeState = {
    started: false, over: false, steps: 0, fishY: (TANK.surface + TANK.floor) / 2, vy: 0,
    size: 0, eaten: 0, score: 0, passed: 0, strokes: 0, speed: START_SPEED,
  };
  const pois: Poi[] = [];
  const foods: Food[] = [];
  const listeners: ((event: EscapeEvent) => void)[] = [];
  const emit = (event: EscapeEvent) => listeners.forEach(listener => listener(event));
  let nextId = 1;
  // The first scoop comes a little after the start, then one every SPACING of tank.
  let untilPoi = 90;
  let untilFood = 60;

  function addPoi() {
    // Aimed near where the fish is now, so staying still is not safe; anywhere from just under the surface to the gravel.
    const r = fishRadius(state.size);
    const targetY = clamp(state.fishY + (random() - 0.5) * 140, TANK.surface + POI_RADIUS * 0.6, TANK.floor - r);
    const startX = TANK.width + POI_RADIUS + 10;
    pois.push({ id: nextId++, x: startX, y: 0, targetY, startX, under: 0, tearAt: TEAR_MIN + Math.floor(random() * (TEAR_MAX - TEAR_MIN)), torn: false, passed: false });
    pois[pois.length - 1].y = poiDepth(pois[pois.length - 1]);
  }

  function addFood() {
    foods.push({ id: nextId++, x: TANK.width + 10, y: TANK.surface + 40 + random() * (TANK.floor - TANK.surface - 120) });
  }

  // A tail stroke: starts the game, or lifts the fish. Nothing once it is caught.
  function stroke(): boolean {
    if (state.over) return false;
    state.started = true;
    state.vy = STROKE;
    state.strokes++;
    emit({ type: "stroke" });
    return true;
  }

  function step() {
    if (state.over) return;
    state.steps++;
    // Before the first stroke the fish only hovers where it is.
    if (!state.started) return;

    const r = fishRadius(state.size);
    state.vy = Math.min(MAX_SINK, state.vy * DRAG + SINK);
    state.fishY += state.vy;
    // It cannot leave the water, and it rests on the gravel.
    if (state.fishY < TANK.surface + r) { state.fishY = TANK.surface + r; state.vy = Math.max(0, state.vy); }
    if (state.fishY > TANK.floor - r) { state.fishY = TANK.floor - r; state.vy = 0; }

    if (--untilPoi <= 0) { addPoi(); untilPoi = Math.round(SPACING / state.speed); }
    if (--untilFood <= 0) { addFood(); untilFood = FOOD_EVERY; }

    for (const poi of pois) {
      poi.x -= state.speed;
      poi.y = poiDepth(poi);
      if (!poi.torn && poi.y > TANK.surface) {
        poi.under++;
        if (poi.under >= poi.tearAt) { poi.torn = true; emit({ type: "tear" }); }
      }
      if (!poi.passed && poi.x + POI_RADIUS < FISH_X - r) {
        poi.passed = true;
        state.passed++;
        const points = passPoints(state.size);
        state.score += points;
        state.speed = Math.min(MAX_SPEED, state.speed + SPEED_UP);
        emit({ type: "pass", points });
      }
      // Caught: the paper, in the water, reaches the fish (its outline counts a little inside, for fairness).
      if (!poi.torn && poi.y > TANK.surface - POI_RADIUS * 0.3 && Math.hypot(poi.x - FISH_X, poi.y - state.fishY) < POI_RADIUS + r * 0.75) {
        state.over = true;
        emit({ type: "caught" });
        return;
      }
    }
    while (pois.length && pois[0].x < -POI_RADIUS * 2) pois.shift();

    for (let i = foods.length - 1; i >= 0; i--) {
      const food = foods[i];
      food.x -= state.speed * 0.85;
      food.y = Math.min(TANK.floor - 4, food.y + 0.25);
      if (Math.hypot(food.x - FISH_X, food.y - state.fishY) < r + 6) {
        foods.splice(i, 1);
        state.eaten++;
        const size = Math.min(MAX_SIZE, Math.floor(state.eaten / FOOD_PER_SIZE));
        const grew = size > state.size;
        state.size = size;
        state.score += 1;
        emit({ type: "eat", size, grew });
      } else if (food.x < -10) foods.splice(i, 1);
    }
  }

  return {
    state,
    pois: () => pois as readonly Poi[],
    foods: () => foods as readonly Food[],
    stroke,
    step,
    onEvent: (listener: (event: EscapeEvent) => void) => { listeners.push(listener); },
  };
}

export type GoldfishEscape = ReturnType<typeof createGoldfishEscape>;
