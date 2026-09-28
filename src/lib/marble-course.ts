import type MatterJS from "matter-js";

// The marble machine's course, shared by the page and by
// scripts/check-marble-course.mjs, which runs the same world in Node to make
// sure the chain still reaches the bell. Matter is passed in so this module
// stays free of DOM and bundling concerns.

export const WORLD = { width: 800, height: 600 } as const;
// Fixed step: the same course plays out identically every run.
export const STEP_MS = 1000 / 60;

export type Part = "wall" | "ramp" | "spring" | "domino" | "ball" | "cup" | "bell";
export type CourseEvent = "start" | "spring" | "domino" | "ballB" | "goal";

type Matter = typeof MatterJS;

export type Course = {
  engine: MatterJS.Engine;
  start: () => void;
  step: () => void;
  // Events in the order they first happened, for the status line and the check.
  events: CourseEvent[];
  onEvent: (listener: (event: CourseEvent) => void) => void;
  partOf: (body: MatterJS.Body) => Part;
};

export function buildCourse(M: Matter): Course {
  const { Bodies, Body, Composite, Engine, Events } = M;
  const engine = Engine.create({ gravity: { x: 0, y: 1.6, scale: 0.001 } });
  const parts = new Map<number, Part>();
  const add = <T extends MatterJS.Body>(body: T, part: Part) => {
    parts.set(body.id, part);
    Composite.add(engine.world, body);
    return body;
  };
  const wall = (x: number, y: number, w: number, h: number, angle = 0, part: Part = "wall") =>
    add(Bodies.rectangle(x, y, w, h, { isStatic: true, angle, friction: 0.02, restitution: 0.2 }), part);
  // A ramp from (x1, y1) to (x2, y2).
  const ramp = (x1: number, y1: number, x2: number, y2: number, friction = 0.02) => {
    const body = wall((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1), 10, Math.atan2(y2 - y1, x2 - x1), "ramp");
    body.friction = friction;
    return body;
  };

  // Frame.
  wall(WORLD.width / 2, WORLD.height + 20, WORLD.width + 80, 40);
  wall(-20, WORLD.height / 2, 40, WORLD.height);
  wall(WORLD.width + 20, WORLD.height / 2, 40, WORLD.height);

  // 1. Ball A rolls right down the first ramp, hits the backstop and drops.
  const ballA = add(Bodies.circle(60, 70, 14, { restitution: 0.5, friction: 0.01, frictionAir: 0.001, density: 0.004 }), "ball");
  // Held until start; made static after creation so Matter keeps its mass.
  Body.setStatic(ballA, true);
  ramp(40, 100, 420, 200);
  wall(470, 170, 12, 200);
  // 2. The spring bounces it ("pon") left, down onto the second ramp.
  const spring = wall(445, 300, 70, 12, -0.45, "spring");
  spring.restitution = 0.7;
  ramp(390, 360, 120, 415);
  // 3. It drops onto the shelf and rolls right into the dominoes.
  wall(70, 400, 12, 150);
  // Matter uses the smaller friction of a pair: a grippy shelf holds the
  // dominoes' feet while the balls (friction 0.01) still roll freely.
  ramp(80, 480, 440, 505, 1);
  const shelfTop = (x: number) => 480 + (x - 80) * 25 / 360 - 5;
  const dominoes = [240, 280, 320, 360, 400].map(x =>
    add(Bodies.rectangle(x, shelfTop(x) - 32, 10, 64, { friction: 0.5, density: 0.002 }), "domino"));
  // 4. The last domino pushes ball B off its flat ledge.
  // B sits 10px from the edge, so the last domino only has to nudge it.
  wall(467, 505, 45, 10);
  const ballB = add(Bodies.circle(480, 486, 14, { restitution: 0.4, friction: 0.01, frictionAir: 0.001, density: 0.004 }), "ball");
  // 5. Ball B rolls down into the cup and rings the bell.
  ramp(500, 535, 680, 565);
  wall(740, 592, 88, 8, 0, "cup");
  wall(700, 586, 8, 20, 0, "cup");
  wall(780, 578, 8, 36, 0, "cup");
  // Invisible trigger just above the cup's floor.
  const cup = add(Bodies.rectangle(740, 581, 64, 10, { isStatic: true, isSensor: true }), "cup");
  add(Bodies.circle(740, 520, 12, { isStatic: true, isSensor: true }), "bell");

  const events: CourseEvent[] = [];
  const listeners: ((event: CourseEvent) => void)[] = [];
  const emit = (event: CourseEvent) => {
    if (events.includes(event)) return;
    events.push(event);
    for (const listener of listeners) listener(event);
  };
  Events.on(engine, "collisionStart", ({ pairs }) => {
    for (const { bodyA, bodyB } of pairs) {
      const pair = [bodyA, bodyB];
      if (pair.includes(ballA) && pair.includes(spring)) emit("spring");
      if (pair.includes(ballB) && pair.includes(cup)) emit("goal");
    }
  });
  const ballBStart = { ...ballB.position };

  return {
    engine,
    events,
    onEvent: listener => { listeners.push(listener); },
    partOf: body => parts.get(body.id) ?? "wall",
    start: () => {
      Body.setStatic(ballA, false);
      emit("start");
    },
    step: () => {
      Engine.update(engine, STEP_MS);
      if (dominoes.some(domino => Math.abs(domino.angle) > 0.6)) emit("domino");
      if (Math.hypot(ballB.position.x - ballBStart.x, ballB.position.y - ballBStart.y) > 20) emit("ballB");
    },
  };
}
