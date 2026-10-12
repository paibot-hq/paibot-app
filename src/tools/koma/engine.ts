// Spinning-top battle: two tops in a dish. Pure simulation (no DOM), stepped at a fixed rate,
// so the rules can be tested headlessly. Units: the dish has radius DISH, a top has radius TOP_R.
export const DISH = 100;
export const TOP_R = 12;
export const STEP = 1 / 60;
export const START_SPIN = 100;

const PULL = 1.6;        // the dish slopes toward its center: acceleration per unit of distance
const STEER = 230;       // acceleration from steering
const DRAG = 1.5;        // velocity lost per second
const DECAY = 1.6;       // spin lost per second just by spinning
const HIT_LOSS = 0.05;   // spin lost per unit of approach speed above HIT_FREE in a collision
const HIT_FREE = 30;     // leaning on each other costs nothing; only a real hit does
const DASH_SPEED = 140;
const DASH_COST = 4;
const DASH_COOLDOWN = 1.1;

export type Level = "easy" | "normal" | "hard";
export type Side = 0 | 1; // 0 = player, 1 = computer
export type Reason = "stopped" | "fell";

export type Top = {
  x: number; y: number; vx: number; vy: number;
  spin: number; angle: number; dashCooldown: number;
  steerX: number; steerY: number; // wanted direction, length 0..1
  out: boolean;
};

export type Result = { winner: Side | "draw"; reason: Reason };
export type KomaEvent = { type: "hit"; speed: number } | { type: "dash"; side: Side } | { type: "end"; result: Result };

export type Koma = {
  tops: [Top, Top];
  time: number;
  result: Result | null;
  step(): KomaEvent[];
  steer(x: number, y: number): void;
  dash(side?: Side): boolean;
};

const SKILL: Record<Level, { steer: number; dash: number; aim: number }> = {
  easy: { steer: 0.55, dash: 0.4, aim: 0.5 },
  normal: { steer: 0.8, dash: 1.0, aim: 0.8 },
  hard: { steer: 1.0, dash: 1.0, aim: 1.0 },
};

const mass = (top: Top) => 0.5 + Math.max(top.spin, 0) / START_SPIN;

function newTop(x: number, y: number): Top {
  return { x, y, vx: 0, vy: 0, spin: START_SPIN, angle: 0, dashCooldown: 0, steerX: 0, steerY: 0, out: false };
}

export function createKoma(level: Level = "normal", random: () => number = Math.random): Koma {
  const skill = SKILL[level];
  const tops: [Top, Top] = [newTop(0, 52), newTop(0, -52)];
  let time = 0;
  let result: Result | null = null;

  const dash = (side: Side = 0) => {
    const top = tops[side];
    if (result || top.out || top.dashCooldown > 0 || top.spin <= DASH_COST) return false;
    const length = Math.hypot(top.steerX, top.steerY);
    // Without a wanted direction a dash goes where the top already moves.
    let dx = top.steerX, dy = top.steerY;
    if (length < 0.1) { dx = top.vx; dy = top.vy; }
    const norm = Math.hypot(dx, dy);
    if (norm < 1e-6) return false;
    top.vx = (dx / norm) * DASH_SPEED;
    top.vy = (dy / norm) * DASH_SPEED;
    top.spin -= DASH_COST;
    top.dashCooldown = DASH_COOLDOWN;
    return true;
  };

  // The computer goes for the point just inside the player's top, so a hit pushes it toward the rim.
  const think = () => {
    const me = tops[1], you = tops[0];
    if (me.out) return;
    const away = Math.hypot(you.x, you.y) || 1;
    const aimX = you.x - (you.x / away) * TOP_R * 0.6 * skill.aim + (random() - 0.5) * 10 * (1 - skill.aim);
    const aimY = you.y - (you.y / away) * TOP_R * 0.6 * skill.aim + (random() - 0.5) * 10 * (1 - skill.aim);
    let dx = aimX - me.x, dy = aimY - me.y;
    const gap = Math.hypot(dx, dy) || 1;
    dx /= gap; dy /= gap;
    // Near the rim, come back toward the center instead of chasing.
    const rim = Math.hypot(me.x, me.y);
    if (rim > DISH - TOP_R * 1.5) { dx = -me.x / rim; dy = -me.y / rim; }
    me.steerX = dx * skill.steer;
    me.steerY = dy * skill.steer;
    if (gap < 60 && gap > TOP_R * 2.2 && rim < DISH - TOP_R * 2.5 && me.spin > 30 && random() < 0.08 * skill.dash) dash(1);
  };

  const events: KomaEvent[] = [];

  const collide = () => {
    const [a, b] = tops;
    if (a.out || b.out) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const gap = Math.hypot(dx, dy);
    if (gap >= TOP_R * 2 || gap === 0) return;
    const nx = dx / gap, ny = dy / gap;
    const overlap = TOP_R * 2 - gap;
    const ma = mass(a), mb = mass(b);
    a.x -= nx * overlap * (mb / (ma + mb)); a.y -= ny * overlap * (mb / (ma + mb));
    b.x += nx * overlap * (ma / (ma + mb)); b.y += ny * overlap * (ma / (ma + mb));
    const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (approach <= 0) return;
    // Whoever was moving less takes the hit; so does the one with less spin.
    const speedA = Math.hypot(a.vx, a.vy), speedB = Math.hypot(b.vx, b.vy);
    const speeds = Math.max(speedA + speedB, 1), spins = Math.max(a.spin + b.spin, 1);
    const force = Math.max(approach - HIT_FREE, 0);
    const lossA = HIT_LOSS * force * (0.5 * (speedB / speeds) + 0.5 * (b.spin / spins)) * 2;
    const lossB = HIT_LOSS * force * (0.5 * (speedA / speeds) + 0.5 * (a.spin / spins)) * 2;
    const impulse = (1.9 * approach) / (1 / ma + 1 / mb);
    a.vx -= (impulse / ma) * nx; a.vy -= (impulse / ma) * ny;
    b.vx += (impulse / mb) * nx; b.vy += (impulse / mb) * ny;
    a.spin -= lossA;
    b.spin -= lossB;
    events.push({ type: "hit", speed: approach });
  };

  const step = (): KomaEvent[] => {
    events.length = 0;
    if (result) return [];
    time += STEP;
    think();
    for (const top of tops) {
      if (top.out) continue;
      const length = Math.hypot(top.steerX, top.steerY);
      const scale = length > 1 ? 1 / length : 1;
      top.vx += (top.steerX * scale * STEER - top.x * PULL - top.vx * DRAG) * STEP;
      top.vy += (top.steerY * scale * STEER - top.y * PULL - top.vy * DRAG) * STEP;
      top.x += top.vx * STEP;
      top.y += top.vy * STEP;
      top.spin -= DECAY * STEP;
      top.dashCooldown = Math.max(0, top.dashCooldown - STEP);
      top.angle += (4 + top.spin * 0.22) * STEP;
    }
    collide();
    for (const top of tops) if (!top.out && Math.hypot(top.x, top.y) > DISH) top.out = true;

    const gone = tops.map(top => top.out || top.spin <= 0);
    if (gone[0] || gone[1]) {
      for (const top of tops) top.spin = Math.max(top.spin, 0);
      let winner: Side | "draw";
      if (gone[0] && gone[1]) winner = "draw";
      else winner = gone[0] ? 1 : 0;
      const loser = winner === 0 ? tops[1] : tops[0];
      result = { winner, reason: winner !== "draw" && loser.out ? "fell" : "stopped" };
      events.push({ type: "end", result });
    }
    return [...events];
  };

  return {
    tops,
    get time() { return time; },
    get result() { return result; },
    step,
    steer(x, y) { tops[0].steerX = x; tops[0].steerY = y; },
    dash,
  };
}
