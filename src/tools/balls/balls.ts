// Balls flying inside a circle. They bounce off its wall, and when two meet, each splits in two, each piece a little smaller than the
// ball it came from (so the area is not kept: they multiply, and the smallest stop splitting). A cap on their number and a long life
// span keep them from filling the circle for good: a ball pops when its life runs out, and a new one is let in when none is left. Pure functions of (state, dt, rng), tested without
// a browser.

export type Ball = { x: number; y: number; vx: number; vy: number; r: number; hue: number; life: number };
export type World = { balls: Ball[]; splits: number; time: number };
export type Options = {
  // The circle: its centre and radius.
  cx: number; cy: number; radius: number;
  // At most this many balls; a ball smaller than minRadius no longer splits.
  maxBalls: number; minRadius: number;
  // Whether a meeting splits the balls (off: they only bounce).
  split: boolean;
};

export const MAX_DT = 0.05;
export const LIFE = [40, 70] as const;
export const SHRINK = 0.88;

export function createWorld(): World {
  return { balls: [], splits: 0, time: 0 };
}

// A ball at a random place inside the circle, going in a random direction at a speed of `speed` pixels a second.
export function spawn(options: Options, rng: () => number, speed = 190, r = 12): Ball {
  const angle = rng() * Math.PI * 2;
  const away = Math.sqrt(rng()) * (options.radius - r - 4);
  const heading = rng() * Math.PI * 2;
  return {
    x: options.cx + Math.cos(angle) * away, y: options.cy + Math.sin(angle) * away,
    vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed, r,
    hue: Math.floor(rng() * 360), life: LIFE[0] + rng() * (LIFE[1] - LIFE[0]),
  };
}

// A ball in two: the pieces fly off to either side of the way it was going, with its speed, each a little smaller.
function halves(ball: Ball, rng: () => number): Ball[] {
  const speed = Math.hypot(ball.vx, ball.vy);
  const heading = Math.atan2(ball.vy, ball.vx);
  const spread = 0.5 + rng() * 0.5;
  const r = ball.r * SHRINK;
  return [-1, 1].map(side => ({
    x: ball.x + Math.cos(heading + side * Math.PI / 2) * r * 0.6, y: ball.y + Math.sin(heading + side * Math.PI / 2) * r * 0.6,
    vx: Math.cos(heading + side * spread) * speed, vy: Math.sin(heading + side * spread) * speed, r,
    hue: (ball.hue + side * 24 + 360) % 360, life: LIFE[0] + rng() * (LIFE[1] - LIFE[0]),
  }));
}

// Moves the world on by dt seconds; returns the places where balls split (for a flash).
export function step(world: World, dt: number, options: Options, rng: () => number): { x: number; y: number; hue: number }[] {
  const t = Math.min(Math.max(dt, 0), MAX_DT);
  world.time += t;
  const flashes: { x: number; y: number; hue: number }[] = [];
  for (const ball of world.balls) {
    ball.x += ball.vx * t;
    ball.y += ball.vy * t;
    ball.life -= t;
    // The wall: past it, a ball is put back and its velocity mirrored in the wall.
    const dx = ball.x - options.cx;
    const dy = ball.y - options.cy;
    const distance = Math.hypot(dx, dy);
    const limit = options.radius - ball.r;
    if (distance > limit && distance > 0) {
      const nx = dx / distance, ny = dy / distance;
      const along = ball.vx * nx + ball.vy * ny;
      if (along > 0) { ball.vx -= 2 * along * nx; ball.vy -= 2 * along * ny; }
      ball.x = options.cx + nx * limit;
      ball.y = options.cy + ny * limit;
    }
  }
  // Meetings: each ball meets at most one other in a step.
  const done = new Set<Ball>();
  const added: Ball[] = [];
  const removed = new Set<Ball>();
  const balls = world.balls;
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      if (done.has(a) || done.has(b)) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= a.r + b.r) continue;
      done.add(a); done.add(b);
      const room = balls.length - removed.size + added.length + 2 <= options.maxBalls;
      if (options.split && room && a.r > options.minRadius && b.r > options.minRadius) {
        removed.add(a); removed.add(b);
        added.push(...halves(a, rng), ...halves(b, rng));
        world.splits++;
        flashes.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, hue: a.hue });
      } else if (distance > 0) {
        // An ordinary bounce between two balls (the same mass, so they swap the speed along the line between them).
        const nx = dx / distance, ny = dy / distance;
        const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
        a.vx += (vb - va) * nx; a.vy += (vb - va) * ny;
        b.vx += (va - vb) * nx; b.vy += (va - vb) * ny;
        const push = (a.r + b.r - distance) / 2;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      }
    }
  }
  world.balls = [...balls.filter(ball => !removed.has(ball) && ball.life > 0), ...added];
  // None left: let one in, so it goes on.
  if (world.balls.length === 0) world.balls.push(spawn(options, rng));
  return flashes;
}
