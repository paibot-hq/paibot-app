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
export const POINTS = {
  bumper: 100, sling: 10, lane: 50, lanesBonus: 1000, target: 100, targetsBonus: 500, inlane: 50, inlanesBonus: 500,
} as const;
const BALL_RADIUS = 9;
const LANE = { x: 453, wall: 432 } as const;
const PLUNGER_TOP = 738;
const LAUNCH_SPEED = { min: 7, max: 26 } as const;
const CHARGE_STEPS = 60;
const NEXT_BALL_STEPS = 45;
const BUMPER_KICK = 11;
const SLING_KICK = 9;
const KICKBACK_SPEED = 20;
// A ball lost this soon after its launch comes back (once per ball).
export const SAVER_STEPS = 60 * 5;
// Lighting both inlanes raises the center post between the flippers for this long.
export const POST_STEPS = 60 * 20;

const FLIPPER = { length: 80, width: 14, rest: 0.5, up: -0.42, upSpeed: 0.2, downSpeed: 0.12 } as const;
const CENTER = LANE.wall / 2 + 5;
// Table features mirror around CENTER: mirror(x) is the right-hand twin of x.
const mirror = (x: number) => 2 * CENTER - x;

export type Side = "left" | "right";
export type Part = "wall" | "flipper" | "bumper" | "sling" | "lanePost" | "lane" | "target" | "inlane" | "outlane" | "kickback" | "centerPost" | "ball" | "plunger" | "drain";
export type PinballEvent =
  | { type: "launch" }
  | { type: "bumper"; index: number; id: number }
  | { type: "sling"; id: number }
  | { type: "lane"; index: number }
  | { type: "lanesBonus" }
  | { type: "target"; index: number }
  | { type: "targetsBonus" }
  | { type: "inlane"; side: Side }
  | { type: "inlanesBonus" }
  | { type: "postUp" }
  | { type: "postDown" }
  | { type: "kickback" }
  | { type: "saved" }
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
  const segment = (x1: number, y1: number, x2: number, y2: number, thickness = 10, part: Part = "wall") =>
    wall((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1), thickness, Math.atan2(y2 - y1, x2 - x1), part);
  const sensor = (x: number, y: number, w: number, h: number, part: Part, i?: number) =>
    add(Bodies.rectangle(x, y, w, h, { isStatic: true, isSensor: true }), part, i);

  // Cabinet: side walls and a rounded top the launched ball rides over.
  wall(5, TABLE.height / 2, 10, TABLE.height);
  wall(TABLE.width - 5, TABLE.height / 2, 10, TABLE.height);
  const arc = { x: 240, y: 240, r: 230 };
  for (let i = 0, n = 40; i < n; i++) {
    const a = Math.PI + (i + 0.5) * Math.PI / n;
    const r = arc.r + 8;
    wall(arc.x + r * Math.cos(a), arc.y + r * Math.sin(a), 2 * r * Math.sin(Math.PI / n / 2) + 2, 16, a + Math.PI / 2);
  }
  // Plunger lane on the right.
  wall(LANE.wall, 480, 8, 560);
  const plunger = wall(LANE.x, PLUNGER_TOP + 7, 30, 14, 0, "plunger");

  // Pop bumpers: the main three, plus one in the upper-left corner where a
  // ball riding the top edge would otherwise circle round to the left wall.
  const bumpers = [[130, 285], [322, 285], [226, 365], [74, 126]].map(([x, y], i) =>
    add(Bodies.circle(x, y, i === 3 ? 18 : 22, { isStatic: true, restitution: 0.8 }), "bumper", i));

  // Three rollover lanes at the top; light all three for a bonus.
  for (const x of [160, 200, 240, 280]) wall(x, 170, 6, 36, 0, "lanePost");
  [180, 220, 260].forEach((x, i) => sensor(x, 172, 16, 20, "lane", i));

  // Three standup targets on the left wall; all three relight the kickback.
  [330, 375, 420].forEach((y, i) => add(Bodies.rectangle(17, y, 8, 30, { isStatic: true, restitution: 0.5 }), "target", i));

  // Lower playfield, mirrored left/right. Both sides have an inlane feeding
  // the flipper. Only the left has an outlane (drains unless the kickback
  // saves it): on the right, balls sliding down the plunger-lane wall fell
  // into one far too often, so the right inlane guide starts at that wall.
  segment(38, 510, 38, 620, 6);                          // left outlane / inlane divider
  segment(38, 620, 132, 662);
  sensor(23, 640, 18, 12, "outlane", 0);
  segment(LANE.wall - 4, 612, mirror(132), 662);
  for (const side of ["left", "right"] as Side[]) {
    const x = (v: number) => (side === "left" ? v : mirror(v));
    sensor(x(52), 560, 14, 12, "inlane", side === "left" ? 0 : 1);
    const sling = Bodies.fromVertices(0, 0, [[[68, 468], [68, 548], [116, 586]].map(([px, py]) => ({ x: x(px), y: py }))], { isStatic: true, restitution: 0.6 });
    Body.setPosition(sling, { x: x((68 + 68 + 116) / 3), y: (468 + 548 + 586) / 3 });
    add(sling, "sling");
  }
  // The kickback fires a ball back up the left outlane.
  sensor(23, 700, 18, 12, "kickback");

  // Flippers.
  const flippers = (["left", "right"] as Side[]).map(side => {
    const dir = side === "left" ? 1 : -1;
    const pivot = { x: CENTER - dir * 78, y: 668 };
    const body = add(Bodies.rectangle(pivot.x + dir * (FLIPPER.length / 2 - FLIPPER.width / 2), pivot.y, FLIPPER.length, FLIPPER.width,
      { isStatic: true, chamfer: { radius: FLIPPER.width / 2 }, restitution: 0.25, friction: 0 }), "flipper");
    const rest = dir * FLIPPER.rest, up = dir * FLIPPER.up;
    rotate(body, rest, pivot);
    return { side, body, pivot, rest, up, pressed: false };
  });

  // Center post: out of the world until raised, then it closes the gap
  // between the flipper tips so the ball rests on it instead of draining.
  const centerPost = Bodies.circle(CENTER, 722, 8, { isStatic: true, restitution: 0.3 });
  parts.set(centerPost.id, "centerPost");

  sensor(TABLE.width / 2, TABLE.height + 30, TABLE.width, 20, "drain");

  const state = {
    score: 0,
    ballsLeft: BALLS_PER_GAME,
    lanes: [false, false, false],
    targets: [false, false, false],
    inlanes: [false, false],
    kickback: true,
    post: 0,
    // Steps left on this ball's saver; it starts counting at the launch.
    saver: 0,
    saverUsed: false,
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
    state.saver = 0;
  };
  serve();

  const kick = (target: MatterJS.Body, speed: number) => {
    if (!ball) return;
    const away = Vector.normalise(Vector.sub(ball.position, target.position));
    Body.setVelocity(ball, Vector.mult(away, speed));
  };
  // Lights one of a bank; when the whole bank is lit, pays the bonus and resets.
  const light = (bank: boolean[], i: number, bonus: number) => {
    bank[i] = true;
    if (!bank.every(Boolean)) return false;
    bank.fill(false);
    state.score += bonus;
    return true;
  };

  Events.on(engine, "collisionStart", ({ pairs }) => {
    for (const { bodyA, bodyB } of pairs) {
      const other = bodyA === ball ? bodyB : bodyB === ball ? bodyA : null;
      if (!other || !ball) continue;
      const part = parts.get(other.id);
      const i = index.get(other.id) ?? 0;
      if (part === "bumper") {
        kick(other, BUMPER_KICK);
        state.score += POINTS.bumper;
        emit({ type: "bumper", index: i, id: other.id });
      } else if (part === "sling") {
        kick(other, SLING_KICK);
        state.score += POINTS.sling;
        emit({ type: "sling", id: other.id });
      } else if (part === "lane") {
        state.score += POINTS.lane;
        emit({ type: "lane", index: i });
        if (light(state.lanes, i, POINTS.lanesBonus)) emit({ type: "lanesBonus" });
      } else if (part === "target") {
        state.score += POINTS.target;
        emit({ type: "target", index: i });
        if (light(state.targets, i, POINTS.targetsBonus)) {
          state.kickback = true;
          emit({ type: "targetsBonus" });
        }
      } else if (part === "inlane") {
        state.score += POINTS.inlane;
        emit({ type: "inlane", side: i === 0 ? "left" : "right" });
        if (light(state.inlanes, i, POINTS.inlanesBonus)) {
          emit({ type: "inlanesBonus" });
          if (state.post === 0) {
            Composite.add(engine.world, centerPost);
            emit({ type: "postUp" });
          }
          state.post = POST_STEPS;
        }
      } else if (part === "kickback" && state.kickback) {
        state.kickback = false;
        Body.setVelocity(ball, { x: 0, y: -KICKBACK_SPEED });
        emit({ type: "kickback" });
      } else if (part === "drain") {
        Composite.remove(engine.world, ball);
        ball = null;
        if (state.saver > 0 && !state.saverUsed) {
          // Ball saver: the same ball comes back to the plunger.
          emit({ type: "saved" });
          state.nextBallIn = NEXT_BALL_STEPS;
          state.saverUsed = true;
          continue;
        }
        state.ballsLeft--;
        state.saverUsed = false;
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
    bumpers,
    centerPost,
    get ball() { return ball; },
    partOf: (body: MatterJS.Body) => parts.get(body.id) ?? "wall",
    indexOf: (body: MatterJS.Body) => index.get(body.id) ?? 0,
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
        // The saver runs from the first launch of each ball, not from re-launches of a weak shot.
        if (!state.saverUsed && state.saver === 0) state.saver = SAVER_STEPS;
        emit({ type: "launch" });
      }
      state.charging = false;
      state.charge = 0;
    },
    step() {
      if (state.over) return;
      state.steps++;
      if (state.charging) state.charge = Math.min(1, state.charge + 1 / CHARGE_STEPS);
      if (state.saver > 0 && ball && ball.position.x < LANE.wall) state.saver--;
      if (state.post > 0 && --state.post === 0) {
        Composite.remove(engine.world, centerPost);
        emit({ type: "postDown" });
      }
      if (state.nextBallIn > 0 && --state.nextBallIn === 0) serve();
      for (let i = 0; i < SUBSTEPS; i++) {
        moveFlippers();
        Engine.update(engine, STEP_MS / SUBSTEPS);
      }
    },
  };
}

export type Pinball = ReturnType<typeof createPinball>;
