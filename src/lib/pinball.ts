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
  bumper: 100, sling: 10, lane: 50, lanesBonus: 1000, target: 100, targetsBonus: 500, inlane: 50, inlanesBonus: 500, saucer: 500,
} as const;
const BALL_RADIUS = 9;
const LANE = { x: 453, wall: 432 } as const;
const PLUNGER_TOP = 738;
const LAUNCH_SPEED = { min: 7, max: 26 } as const;
const CHARGE_STEPS = 60;
const NEXT_BALL_STEPS = 45;
const BUMPER_KICK = 11;
const SLING_KICK = 9;
// A ball lost this soon after its launch comes back (once per ball).
export const SAVER_STEPS = 60 * 5;
// The kickout hole holds the ball this long before firing it back up.
const SAUCER_HOLD = 60;
// Distance from an inlane guide's center line to the slingshot base above
// it: half the guide (5) plus room for the ball (18) with play for the
// slingshot's rounded corners.
const INLANE_WIDTH = 34;
const SAUCER_KICK = { x: 3, y: -13 } as const;

const FLIPPER = { length: 80, width: 14, rest: 0.5, up: -0.42, upSpeed: 0.2, downSpeed: 0.12 } as const;
const CENTER = LANE.wall / 2 + 5;
// Table features mirror around CENTER: mirror(x) is the right-hand twin of x.
const mirror = (x: number) => 2 * CENTER - x;

export type Side = "left" | "right";
export type Part = "wall" | "arc" | "flipper" | "bumper" | "sling" | "lanePost" | "lane" | "target" | "inlane" | "saucer" | "ball" | "plunger" | "drain";
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
  | { type: "saucer" }
  | { type: "saved" }
  | { type: "drain" }
  | { type: "gameOver" };

type Matter = typeof MatterJS;

export function createPinball(M: Matter) {
  const { Bodies, Body, Composite, Engine, Events, Vector, Vertices } = M;
  // @types/matter-js lags Matter 0.20, whose rotate also takes a pivot and updateVelocity.
  const rotate = Body.rotate as (body: MatterJS.Body, rotation: number, point?: MatterJS.Vector, updateVelocity?: boolean) => void;
  const engine = Engine.create({ gravity: { x: 0, y: 0.75, scale: 0.001 }, positionIterations: 10, velocityIterations: 8 });
  const parts = new Map<number, Part>();
  const index = new Map<number, number>();
  // Slingshots kick only from their slanted face: outward normal and a point on it.
  const slingFaces = new Map<number, { nx: number; ny: number; px: number; py: number }>();
  const add = <T extends MatterJS.Body>(body: T, part: Part, i?: number) => {
    parts.set(body.id, part);
    if (i !== undefined) index.set(body.id, i);
    Composite.add(engine.world, body);
    return body;
  };
  const wall = (x: number, y: number, w: number, h: number, angle = 0, part: Part = "wall") =>
    add(Bodies.rectangle(x, y, w, h, { isStatic: true, angle, friction: 0, restitution: 0.4 }), part);
  // Straight walls are also kept as lines, drawn with round ends so joints
  // look continuous; each body is lengthened by its thickness to match.
  const outlines: { x1: number; y1: number; x2: number; y2: number; width: number }[] = [];
  const segment = (x1: number, y1: number, x2: number, y2: number, thickness = 10, part: Part = "wall") => {
    outlines.push({ x1, y1, x2, y2, width: thickness });
    return wall((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) + thickness, thickness, Math.atan2(y2 - y1, x2 - x1), part);
  };
  const sensor = (x: number, y: number, w: number, h: number, part: Part, i?: number) =>
    add(Bodies.rectangle(x, y, w, h, { isStatic: true, isSensor: true }), part, i);

  // Cabinet: side walls and a rounded top the launched ball rides over.
  segment(5, 240, 5, TABLE.height + 20);
  segment(TABLE.width - 5, 240, TABLE.width - 5, TABLE.height + 20);
  // The arc is many short bodies for physics but one stroke on screen.
  const arc = { x: 240, y: 240, r: 238, width: 16 };
  for (let i = 0, n = 40; i < n; i++) {
    const a = Math.PI + (i + 0.5) * Math.PI / n;
    wall(arc.x + arc.r * Math.cos(a), arc.y + arc.r * Math.sin(a), 2 * arc.r * Math.sin(Math.PI / n / 2) + 2, arc.width, a + Math.PI / 2, "arc");
  }
  // Plunger lane on the right.
  segment(LANE.wall, 200, LANE.wall, TABLE.height + 20, 8);
  const plunger = add(Bodies.rectangle(LANE.x, PLUNGER_TOP + 7, 30, 14, { isStatic: true, chamfer: { radius: 5 } }), "plunger");

  // Pop bumpers: the main three, plus one in the upper-left corner where a
  // ball riding the top edge would otherwise circle round to the left wall.
  const bumpers = [[130, 285], [322, 285], [226, 365], [74, 126]].map(([x, y], i) =>
    add(Bodies.circle(x, y, i === 3 ? 18 : 22, { isStatic: true, restitution: 0.8 }), "bumper", i));

  // Three rollover lanes at the top; light all three for a bonus.
  for (const x of [160, 200, 240, 280]) segment(x, 155, x, 185, 6, "lanePost");
  [180, 220, 260].forEach((x, i) => sensor(x, 172, 16, 20, "lane", i));

  // Three standup targets on the left wall; all three pay a bonus.
  [330, 375, 420].forEach((y, i) => add(Bodies.rectangle(17, y, 10, 30, { isStatic: true, restitution: 0.5, chamfer: { radius: 4 } }), "target", i));

  // Lower playfield. Each side has an inlane: a channel between a guide
  // running from the wall into the flipper pivot and the slingshot above
  // it. There are no outlanes: in simulated play they took most drains
  // (balls slide down the side walls into them), so a ball can only be lost
  // between the flippers.
  const pivotY = 668;
  const guides = {
    left: { x1: mirror(LANE.wall - 4), y1: 612, x2: CENTER - 78, y2: pivotY },
    right: { x1: LANE.wall - 4, y1: 612, x2: CENTER + 78, y2: pivotY },
  };
  for (const side of ["left", "right"] as Side[]) {
    const g = guides[side];
    segment(g.x1, g.y1, g.x2, g.y2);
    const x = (v: number) => (side === "left" ? v : mirror(v));
    // The inlane is an even channel between the guide and the slingshot's
    // base, which runs parallel to the guide, offset toward the playfield.
    const length = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
    const along = { x: (g.x2 - g.x1) / length, y: (g.y2 - g.y1) / length };
    // Perpendicular to the guide, pointing up into the playfield.
    const inward = { x: side === "left" ? along.y : -along.y, y: -Math.abs(along.x) };
    const onBase = (t: number): [number, number] =>
      [g.x1 + along.x * t + inward.x * INLANE_WIDTH, g.y1 + along.y * t + inward.y * INLANE_WIDTH];
    // Start the base so the sling's outer edge stands about 55px in from the wall.
    const [bx, by] = onBase(46);
    const points = [[bx, 480], [bx, by], onBase(length - 12)];
    // Rounded corners, like rubber stretched around three posts.
    // chamfer() rounds inward only for clockwise points, and the two mirrored
    // sides list theirs in opposite orders, so sort first.
    const corners = Vertices.clockwiseSort(points.map(([px, py]) => ({ x: px, y: py })));
    const outline = Vertices.chamfer(corners, [10], -1, 2, 14) as unknown as MatterJS.Vector[];
    const sling = Bodies.fromVertices(0, 0, [outline], { isStatic: true, restitution: 0.6 });
    Body.setPosition(sling, { x: points.reduce((sum, [px]) => sum + px, 0) / 3, y: points.reduce((sum, [, py]) => sum + py, 0) / 3 });
    add(sling, "sling");
    // The slanted face runs from the top point to the base's lower end.
    const [[ax, ay], , [cx, cy]] = points;
    const faceLength = Math.hypot(cx - ax, cy - ay);
    const nx = (side === "left" ? 1 : -1) * (cy - ay) / faceLength, ny = -Math.abs(cx - ax) / faceLength;
    slingFaces.set(sling.id, { nx, ny, px: ax, py: ay });
    sensor(x(56), 560, 14, 12, "inlane", side === "left" ? 0 : 1);
  }
  // Kickout hole in the middle of the table.
  const saucer = { x: CENTER, y: 470 };
  sensor(saucer.x, saucer.y, 14, 14, "saucer");

  // Flippers.
  const flippers = (["left", "right"] as Side[]).map(side => {
    const dir = side === "left" ? 1 : -1;
    const pivot = { x: CENTER - dir * 78, y: pivotY };
    const body = add(Bodies.rectangle(pivot.x + dir * (FLIPPER.length / 2 - FLIPPER.width / 2), pivot.y, FLIPPER.length, FLIPPER.width,
      { isStatic: true, chamfer: { radius: FLIPPER.width / 2 }, restitution: 0.25, friction: 0 }), "flipper");
    const rest = dir * FLIPPER.rest, up = dir * FLIPPER.up;
    rotate(body, rest, pivot);
    return { side, body, pivot, rest, up, pressed: false };
  });

  sensor(TABLE.width / 2, TABLE.height + 30, TABLE.width, 20, "drain");

  const state = {
    score: 0,
    ballsLeft: BALLS_PER_GAME,
    lanes: [false, false, false],
    targets: [false, false, false],
    inlanes: [false, false],
    saucerHold: 0,
    saucerCooldown: 0,
    saucerKicks: 0,
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
        // The vertical back edge (facing the inlane) is plain rubber: kicking
        // from it would pin a ball between the sling and the wall forever.
        const face = slingFaces.get(other.id);
        if (!face || (ball.position.x - face.px) * face.nx + (ball.position.y - face.py) * face.ny < 0) continue;
        Body.setVelocity(ball, { x: face.nx * SLING_KICK, y: face.ny * SLING_KICK });
        state.score += POINTS.sling;
        emit({ type: "sling", id: other.id });
      } else if (part === "lane") {
        state.score += POINTS.lane;
        emit({ type: "lane", index: i });
        if (light(state.lanes, i, POINTS.lanesBonus)) emit({ type: "lanesBonus" });
      } else if (part === "target") {
        state.score += POINTS.target;
        emit({ type: "target", index: i });
        if (light(state.targets, i, POINTS.targetsBonus)) emit({ type: "targetsBonus" });
      } else if (part === "inlane") {
        state.score += POINTS.inlane;
        emit({ type: "inlane", side: i === 0 ? "left" : "right" });
        if (light(state.inlanes, i, POINTS.inlanesBonus)) emit({ type: "inlanesBonus" });
      } else if (part === "saucer" && state.saucerHold === 0 && state.saucerCooldown === 0) {
        // Captured: park the ball in the hole, then kick it out in step().
        state.saucerHold = SAUCER_HOLD;
        state.score += POINTS.saucer;
        Body.setStatic(ball, true);
        Body.setPosition(ball, other.position);
        emit({ type: "saucer" });
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
    outlines,
    arc,
    saucer,
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
      if (state.saucerCooldown > 0) state.saucerCooldown--;
      if (state.saucerHold > 0 && --state.saucerHold === 0 && ball) {
        // Alternate left and right so repeated captures don't repeat one path.
        const dir = state.saucerKicks++ % 2 === 0 ? -1 : 1;
        Body.setStatic(ball, false);
        Body.setVelocity(ball, { x: dir * SAUCER_KICK.x, y: SAUCER_KICK.y });
        state.saucerCooldown = 30;
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
