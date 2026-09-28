import type MatterJS from "matter-js";

// Pinball table and rules, shared by the page and scripts/check-pinball.mjs.
// Matter is passed in so Node can play the same table headlessly.
//
// Flippers are static bodies turned about their pivot each substep with
// Body.rotate(..., updateVelocity = true): Matter's resolver takes every
// body's velocity from position/angle minus the previous ones, static or not,
// so a swinging flipper hits the ball with its real surface speed.

export const TABLE = { width: 480, height: 760 } as const;
export const STEP_MS = 1000 / 60;
const SUBSTEPS = 3;

export const BALLS_PER_GAME = 3;
export const POINTS = { bumper: 100, sling: 10, lane: 50, lanesBonus: 1000 } as const;
const BALL_RADIUS = 9;
const LANE = { x: 453, wall: 432 } as const;
const PLUNGER_TOP = 738;
const LAUNCH_SPEED = { min: 7, max: 26 } as const;
const CHARGE_STEPS = 60;
const NEXT_BALL_STEPS = 45;
const BUMPER_KICK = 11;
const SLING_KICK = 9;

const FLIPPER = { length: 80, width: 14, rest: 0.5, up: -0.42, upSpeed: 0.2, downSpeed: 0.12 } as const;

export type Side = "left" | "right";
export type Part = "wall" | "flipper" | "bumper" | "sling" | "lanePost" | "lane" | "ball" | "plunger" | "drain";
export type PinballEvent =
  | { type: "launch" }
  | { type: "bumper"; index: number; id: number }
  | { type: "sling"; id: number }
  | { type: "lane"; index: number }
  | { type: "lanesBonus" }
  | { type: "drain" }
  | { type: "gameOver" };

type Matter = typeof MatterJS;

export function createPinball(M: Matter) {
  const { Bodies, Body, Composite, Engine, Events, Vector } = M;
  // @types/matter-js lags Matter 0.20, whose rotate also takes a pivot and updateVelocity.
  const rotate = Body.rotate as (body: MatterJS.Body, rotation: number, point?: MatterJS.Vector, updateVelocity?: boolean) => void;
  const engine = Engine.create({ gravity: { x: 0, y: 0.75, scale: 0.001 }, positionIterations: 10, velocityIterations: 8 });
  const parts = new Map<number, Part>();
  const index = new Map<number, number>();
  const add = <T extends MatterJS.Body>(body: T, part: Part, i?: number) => {
    parts.set(body.id, part);
    if (i !== undefined) index.set(body.id, i);
    Composite.add(engine.world, body);
    return body;
  };
  const wall = (x: number, y: number, w: number, h: number, angle = 0, part: Part = "wall") =>
    add(Bodies.rectangle(x, y, w, h, { isStatic: true, angle, friction: 0, restitution: 0.4 }), part);
  const segment = (x1: number, y1: number, x2: number, y2: number, thickness = 10) =>
    wall((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1), thickness, Math.atan2(y2 - y1, x2 - x1));

  // Cabinet: side walls and the top arc that turns a launched ball into the table.
  wall(5, TABLE.height / 2, 10, TABLE.height);
  wall(TABLE.width - 5, TABLE.height / 2, 10, TABLE.height);
  // Right quarter: a curve carrying the launched ball over the top. Left
  // half: a 45° wall that turns a ball moving left straight down into the
  // lanes and bumpers, instead of letting it ride around to the left wall.
  const arc = { x: 240, y: 240, r: 230 };
  for (let i = 0, n = 20; i < n; i++) {
    const a = 1.5 * Math.PI + (i + 0.5) * (Math.PI / 2) / n;
    const r = arc.r + 8;
    wall(arc.x + r * Math.cos(a), arc.y + r * Math.sin(a), 2 * r * Math.sin(Math.PI / 4 / n) + 2, 16, a + Math.PI / 2);
  }
  wall(TABLE.width / 2, 2, 60, 16);
  segment(10, 240, 214, 10, 16);
  // Plunger lane on the right.
  wall(LANE.wall, 480, 8, 560);
  const plunger = wall(LANE.x, PLUNGER_TOP + 7, 30, 14, 0, "plunger");

  // Inlane guides lead the ball down to the flippers.
  segment(10, 560, 128, 660);
  segment(LANE.wall - 4, 560, 310, 660);

  // Slingshots above the guides kick the ball back up.
  const sling = (points: [number, number][]) => {
    const body = Bodies.fromVertices(0, 0, [points.map(([x, y]) => ({ x, y }))], { isStatic: true, restitution: 0.6 });
    const center = points.reduce((c, [x, y]) => ({ x: c.x + x / points.length, y: c.y + y / points.length }), { x: 0, y: 0 });
    Body.setPosition(body, center);
    return add(body, "sling");
  };
  sling([[52, 470], [52, 548], [104, 582]]);
  sling([[LANE.wall - 12, 470], [LANE.wall - 12, 548], [LANE.wall - 64, 582]]);

  // Pop bumpers.
  const bumpers = [[130, 285], [322, 285], [226, 365]].map(([x, y], i) =>
    add(Bodies.circle(x, y, 22, { isStatic: true, restitution: 0.8 }), "bumper", i));

  // Three rollover lanes at the top; light all three for a bonus.
  for (const x of [160, 200, 240, 280]) wall(x, 170, 6, 36, 0, "lanePost");
  const lanes = [180, 220, 260].map((x, i) => add(Bodies.rectangle(x, 172, 16, 20, { isStatic: true, isSensor: true }), "lane", i));

  // Flippers.
  const center = (TABLE.width - (TABLE.width - LANE.wall)) / 2 + 5;
  const flippers = (["left", "right"] as Side[]).map(side => {
    const dir = side === "left" ? 1 : -1;
    const pivot = { x: center - dir * 78, y: 668 };
    const body = add(Bodies.rectangle(pivot.x + dir * (FLIPPER.length / 2 - FLIPPER.width / 2), pivot.y, FLIPPER.length, FLIPPER.width,
      { isStatic: true, chamfer: { radius: FLIPPER.width / 2 }, restitution: 0.25, friction: 0 }), "flipper");
    const rest = dir * FLIPPER.rest, up = dir * FLIPPER.up;
    rotate(body, rest, pivot);
    return { side, body, pivot, rest, up, pressed: false };
  });

  add(Bodies.rectangle(TABLE.width / 2, TABLE.height + 30, TABLE.width, 20, { isStatic: true, isSensor: true }), "drain");

  const state = {
    score: 0,
    ballsLeft: BALLS_PER_GAME,
    lanes: [false, false, false],
    charge: 0,
    charging: false,
    over: false,
    nextBallIn: 0,
    steps: 0,
  };
  let ball: MatterJS.Body | null = null;
  const listeners: ((event: PinballEvent) => void)[] = [];
  const emit = (event: PinballEvent) => { for (const listener of listeners) listener(event); };

  const serve = () => {
    ball = add(Bodies.circle(LANE.x, PLUNGER_TOP - BALL_RADIUS - 1, BALL_RADIUS,
      { restitution: 0.3, friction: 0.005, frictionAir: 0.0005, density: 0.004 }), "ball");
  };
  serve();

  const kick = (target: MatterJS.Body, speed: number) => {
    if (!ball) return;
    const away = Vector.normalise(Vector.sub(ball.position, target.position));
    Body.setVelocity(ball, Vector.mult(away, speed));
  };

  Events.on(engine, "collisionStart", ({ pairs }) => {
    for (const { bodyA, bodyB } of pairs) {
      const other = bodyA === ball ? bodyB : bodyB === ball ? bodyA : null;
      if (!other || !ball) continue;
      const part = parts.get(other.id);
      if (part === "bumper") {
        kick(other, BUMPER_KICK);
        state.score += POINTS.bumper;
        emit({ type: "bumper", index: index.get(other.id) ?? 0, id: other.id });
      } else if (part === "sling") {
        kick(other, SLING_KICK);
        state.score += POINTS.sling;
        emit({ type: "sling", id: other.id });
      } else if (part === "lane") {
        const i = index.get(other.id) ?? 0;
        state.score += POINTS.lane;
        state.lanes[i] = true;
        emit({ type: "lane", index: i });
        if (state.lanes.every(Boolean)) {
          state.score += POINTS.lanesBonus;
          state.lanes = [false, false, false];
          emit({ type: "lanesBonus" });
        }
      } else if (part === "drain") {
        Composite.remove(engine.world, ball);
        ball = null;
        state.ballsLeft--;
        emit({ type: "drain" });
        if (state.ballsLeft > 0) state.nextBallIn = NEXT_BALL_STEPS;
        else {
          state.over = true;
          emit({ type: "gameOver" });
        }
      }
    }
  });

  const moveFlippers = () => {
    for (const flipper of flippers) {
      const target = flipper.pressed ? flipper.up : flipper.rest;
      const speed = (flipper.pressed ? FLIPPER.upSpeed : FLIPPER.downSpeed) / SUBSTEPS;
      const delta = Math.max(-speed, Math.min(speed, target - flipper.body.angle));
      // Also called with delta 0, which clears the swing velocity once it stops.
      rotate(flipper.body, delta, flipper.pivot, true);
    }
  };

  // The ball is ready to launch when it rests on the plunger.
  const onPlunger = () => !!ball && ball.position.x > LANE.wall && ball.position.y > PLUNGER_TOP - BALL_RADIUS - 4 && ball.speed < 0.5;

  return {
    engine,
    state,
    plunger,
    flippers,
    get ball() { return ball; },
    partOf: (body: MatterJS.Body) => parts.get(body.id) ?? "wall",
    onEvent: (listener: (event: PinballEvent) => void) => { listeners.push(listener); },
    onPlunger,
    setFlipper(side: Side, pressed: boolean) {
      for (const flipper of flippers) if (flipper.side === side) flipper.pressed = pressed;
    },
    // Hold to charge, release to launch (only while the ball sits on the plunger).
    setPlunger(pulling: boolean) {
      if (pulling) {
        state.charging = true;
        return;
      }
      if (state.charging && ball && onPlunger()) {
        Body.setVelocity(ball, { x: 0, y: -(LAUNCH_SPEED.min + state.charge * (LAUNCH_SPEED.max - LAUNCH_SPEED.min)) });
        emit({ type: "launch" });
      }
      state.charging = false;
      state.charge = 0;
    },
    step() {
      if (state.over) return;
      state.steps++;
      if (state.charging) state.charge = Math.min(1, state.charge + 1 / CHARGE_STEPS);
      if (state.nextBallIn > 0 && --state.nextBallIn === 0) serve();
      for (let i = 0; i < SUBSTEPS; i++) {
        moveFlippers();
        Engine.update(engine, STEP_MS / SUBSTEPS);
      }
    },
  };
}

export type Pinball = ReturnType<typeof createPinball>;
