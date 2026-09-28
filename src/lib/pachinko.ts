import type MatterJS from "matter-js";

// Board and rules for the pachinko toy, shared by the page and by
// scripts/check-pachinko.mjs. Matter and the random source are passed in so
// Node can replay a seeded game. No money or purchases: balls are only a score.

export const BOARD = { width: 480, height: 720 } as const;
export const STEP_MS = 1000 / 60;
// Two physics updates per frame keep fast balls from passing through the rail.
const SUBSTEPS = 2;

export const START_BALLS = 100;
export const PAYOUT = { chucker: 3, side: 2, attacker: 10 } as const;
export const HIT_CHANCE = 1 / 8;
const SPIN_STEPS = 90;
const MAX_PENDING = 4;
const JACKPOT_BALLS = 10;
const JACKPOT_STEPS = 60 * 15;
// Launch speed range; power 0..1 maps linearly into it, with slight jitter
// so the same power doesn't always land in the same place.
const MIN_SPEED = 16;
const MAX_SPEED = 22;
const BALL_RADIUS = 6;
// A ball resting on a nail for this long is swept out, like a real board's
// balls never stay put for long.
const MAX_BALL_STEPS = 60 * 12;

export type Part = "frame" | "nail" | "chucker" | "side" | "attacker" | "lid" | "ball";
export type Pocket = "chucker" | "side" | "attacker" | "out";
export type GameEvent =
  | { type: "launch" }
  | { type: "pocket"; pocket: Pocket; payout: number }
  | { type: "spin" }
  | { type: "result"; hit: boolean }
  | { type: "jackpotEnd" };

export type Game = ReturnType<typeof createGame>;

type Matter = typeof MatterJS;

export function createGame(M: Matter, random: () => number = Math.random, { hitChance = HIT_CHANCE } = {}) {
  const { Bodies, Composite, Engine, Events } = M;
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 }, positionIterations: 8, velocityIterations: 6 });
  const parts = new Map<number, Part>();
  const pockets = new Map<number, Pocket>();
  const add = <T extends MatterJS.Body>(body: T, part: Part) => {
    parts.set(body.id, part);
    Composite.add(engine.world, body);
    return body;
  };
  const solid = (x: number, y: number, w: number, h: number, angle = 0) =>
    add(Bodies.rectangle(x, y, w, h, { isStatic: true, angle, friction: 0, restitution: 0.3 }), "frame");
  const sensor = (x: number, y: number, w: number, h: number, pocket: Pocket, part: Part) => {
    const body = add(Bodies.rectangle(x, y, w, h, { isStatic: true, isSensor: true }), part);
    pockets.set(body.id, pocket);
    return body;
  };
  const nail = (x: number, y: number) =>
    add(Bodies.circle(x, y, 3, { isStatic: true, restitution: 0.5, friction: 0 }), "nail");

  // Frame: side walls and the top arc the ball rides after launch.
  const cx = BOARD.width / 2, cy = 250, radius = 228;
  solid(6, (cy + BOARD.height) / 2, 12, BOARD.height - cy);
  solid(BOARD.width - 6, (cy + BOARD.height) / 2, 12, BOARD.height - cy);
  const segments = 36;
  for (let i = 0; i < segments; i++) {
    const a = Math.PI + (i + 0.5) * Math.PI / segments;
    const length = 2 * (radius + 7) * Math.sin(Math.PI / segments / 2) + 2;
    solid(cx + (radius + 7) * Math.cos(a), cy + (radius + 7) * Math.sin(a), length, 14, a + Math.PI / 2);
  }
  // Launch lane on the left, separated from the field by a guide rail.
  solid(46, 520, 6, 360);

  // Nails: staggered rows, thinned to leave open lanes toward the pockets.
  for (let row = 0; row < 13; row++) {
    const y = 170 + row * 32;
    for (let x = 70 + (row % 2) * 16; x <= 440; x += 32) {
      const inside = Math.hypot(x - cx, y - cy) < radius - 16 || y > cy;
      const lane = (row % 3 === 2) && Math.abs(x - cx) < 40;
      if (inside && !lane) nail(x, y);
    }
  }

  // Center chucker: a narrow mouth between two nails.
  nail(228, 570);
  nail(252, 570);
  sensor(240, 584, 14, 8, "chucker", "chucker");
  // Side pockets.
  for (const x of [110, 370]) {
    solid(x - 13, 548, 4, 22);
    solid(x + 13, 548, 4, 22);
    sensor(x, 554, 20, 8, "side", "side");
  }
  // Bottom rails slope in toward the attacker. When it is closed, balls drop
  // through the gaps between the rails and its lid; a jackpot removes the lid
  // and bridges the gaps, so nearly every ball reaching the bottom goes in.
  // The left rail starts right of the launch lane's guide rail (x = 46).
  solid(92, 611, 89, 6, 0.343);
  solid(404, 611, 120, 6, 2.889);
  solid(160, 673, 4, 54);
  solid(320, 673, 4, 54);
  sensor(240, 676, 150, 10, "attacker", "attacker");
  // Two thick halves peaked in the middle: balls roll off to the gaps
  // instead of resting on it and being pushed through by falling balls.
  const lid = [200, 280].map(x => Bodies.rectangle(x, 648, 82, 12, { isStatic: true, angle: x < 240 ? -0.12 : 0.12, restitution: 0.3 }));
  const bridges = [146, 334].map(x => Bodies.rectangle(x, 634, 30, 6, { isStatic: true, angle: x < 240 ? 0.34 : -0.34, restitution: 0.3 }));
  for (const body of [...lid, ...bridges]) parts.set(body.id, "lid");
  Composite.add(engine.world, lid);
  // Everything else falls out at the bottom (including weak shots back down the lane).
  sensor(BOARD.width / 2, BOARD.height + 10, BOARD.width, 20, "out", "frame");

  const state = {
    balls: START_BALLS,
    inFlight: 0,
    pending: 0,
    reels: [3, 5, 8] as [number, number, number],
    spinning: 0,
    spinHit: false,
    jackpotBalls: 0,
    jackpotSteps: 0,
    open: false,
    steps: 0,
  };
  const listeners: ((event: GameEvent) => void)[] = [];
  const emit = (event: GameEvent) => { for (const listener of listeners) listener(event); };
  const removed = new Set<number>();
  const born = new Map<number, number>();

  const retire = (ball: MatterJS.Body) => {
    removed.add(ball.id);
    born.delete(ball.id);
    Composite.remove(engine.world, ball);
    state.inFlight--;
  };

  const setLid = (open: boolean) => {
    for (const body of open ? lid : bridges) Composite.remove(engine.world, body);
    Composite.add(engine.world, open ? bridges : lid);
  };

  const startSpin = () => {
    state.pending--;
    state.spinning = SPIN_STEPS;
    state.spinHit = random() < hitChance;
    emit({ type: "spin" });
  };

  Events.on(engine, "collisionStart", ({ pairs }) => {
    for (const { bodyA, bodyB } of pairs) {
      const [ball, target] = parts.get(bodyA.id) === "ball" ? [bodyA, bodyB] : [bodyB, bodyA];
      const pocket = pockets.get(target.id);
      if (parts.get(ball.id) !== "ball" || !pocket || removed.has(ball.id)) continue;
      retire(ball);
      const payout = pocket === "out" ? 0 : PAYOUT[pocket];
      state.balls += payout;
      if (pocket === "chucker" && state.pending < MAX_PENDING) state.pending++;
      if (pocket === "attacker" && state.jackpotBalls > 0) state.jackpotBalls--;
      emit({ type: "pocket", pocket, payout });
    }
  });

  return {
    engine,
    state,
    partOf: (body: MatterJS.Body) => parts.get(body.id) ?? "frame",
    onEvent: (listener: (event: GameEvent) => void) => { listeners.push(listener); },
    over: () => state.balls === 0 && state.inFlight === 0 && state.spinning === 0 && !state.open && state.pending === 0,
    // power: 0..1. Returns false when there are no balls left.
    launch(power: number) {
      if (state.balls <= 0) return false;
      state.balls--;
      state.inFlight++;
      const speed = (MIN_SPEED + Math.min(1, Math.max(0, power)) * (MAX_SPEED - MIN_SPEED)) * (1 + (random() - 0.5) * 0.03);
      const ball = add(Bodies.circle(26, 690, BALL_RADIUS, { restitution: 0.45, friction: 0, frictionAir: 0.002, density: 0.002 }), "ball");
      born.set(ball.id, state.steps);
      M.Body.setVelocity(ball, { x: 0, y: -speed });
      emit({ type: "launch" });
      return true;
    },
    step() {
      for (let i = 0; i < SUBSTEPS; i++) Engine.update(engine, STEP_MS / SUBSTEPS);
      state.steps++;
      for (const [id, since] of born) {
        if (state.steps - since < MAX_BALL_STEPS) continue;
        const ball = Composite.get(engine.world, id, "body") as MatterJS.Body | null;
        if (ball) { retire(ball); emit({ type: "pocket", pocket: "out", payout: 0 }); }
      }
      if (state.spinning > 0) {
        state.spinning--;
        if (state.spinning > 0) {
          // Reels stop left to right; a miss never shows three of a kind.
          if (state.spinning % 3 === 0) state.reels = state.reels.map((digit, i) => state.spinning > 30 - i * 15 ? Math.floor(random() * 10) : digit) as [number, number, number];
        } else {
          const digit = Math.floor(random() * 10);
          state.reels = state.spinHit ? [digit, digit, digit] : [digit, (digit + 1 + Math.floor(random() * 9)) % 10, digit];
          emit({ type: "result", hit: state.spinHit });
          if (state.spinHit) {
            state.jackpotBalls = JACKPOT_BALLS;
            state.jackpotSteps = JACKPOT_STEPS;
            state.open = true;
            setLid(true);
          }
        }
      } else if (state.open) {
        // Closes after its ball count or its time, whichever comes first
        // (the count drops in the collision handler).
        state.jackpotSteps--;
        if (state.jackpotBalls <= 0 || state.jackpotSteps <= 0) {
          state.open = false;
          state.jackpotBalls = 0;
          setLid(false);
          emit({ type: "jackpotEnd" });
        }
      } else if (state.pending > 0) {
        startSpin();
      }
    },
  };
}
