// The crane game, without drawing: a machine seen from the side, a claw on a rail and soft prizes (circles) in a pit, in a world 360 wide and
// 480 high, y downward. A play: hold "move" to slide the claw right (once; releasing stops it for good), then "drop": the claw goes down,
// closes, rises with whatever it caught, goes back left over the chute and opens. A prize that falls into the chute is won. Whether the
// claw keeps hold is decided when it closes (from how far off-centre it caught the prize, and luck), so the prize may slip on the way up
// or on the way back - "almost" is the fun of it. Randomness comes in as a function, so that tests can fix it.

export const WIDTH = 360;
export const HEIGHT = 480;
export const RAIL_Y = 56; // where the claw hangs from when it is up
export const HOME_X = 52; // above the chute
export const MAX_X = WIDTH - 34;
export const CHUTE_RIGHT = 100; // the chute is x < this; a wall on its right keeps prizes in the pit
export const WALL_TOP = 352; // the top of that wall: a prize has to be lifted over it
export const FLOOR_Y = 440; // the pit's floor
export const CLAW_REACH = 22; // how far either side of the claw's middle it can take hold
export const PLAYS_PER_ROUND = 5;
const MOVE_SPEED = 95; // px/s
const DROP_SPEED = 140;
const RISE_SPEED = 95;
const RETURN_SPEED = 100;
const CLOSE_TIME = 0.45;
const OPEN_TIME = 0.4;
const GRAVITY = 900;

export type ClawPhase = 'ready' | 'moving' | 'aimed' | 'dropping' | 'closing' | 'rising' | 'returning' | 'opening' | 'over';

export interface PrizeKind { id: string; color: string; glyph: string; radius: number; rare?: boolean }
// The prizes: soft toys, a few rare ones. `glyph` is drawn on them.
export const PRIZE_KINDS: readonly PrizeKind[] = [
  { id: 'robot', color: '#5b8fd6', glyph: '🤖', radius: 22 },
  { id: 'pi', color: '#e8a04a', glyph: 'π', radius: 20 },
  { id: 'sigma', color: '#6fbf8e', glyph: 'Σ', radius: 20 },
  { id: 'infinity', color: '#b07fd6', glyph: '∞', radius: 21 },
  { id: 'star', color: '#f2c94c', glyph: '★', radius: 19 },
  { id: 'heart', color: '#ef7d95', glyph: '♥', radius: 19 },
  { id: 'cat', color: '#c9a27e', glyph: '🐱', radius: 23 },
  { id: 'rocket', color: '#7fb6c9', glyph: '🚀', radius: 21 },
  { id: 'gold-robot', color: '#e3b341', glyph: '🤖', radius: 22, rare: true },
  { id: 'rainbow-pi', color: '#ff6fb5', glyph: 'π', radius: 21, rare: true },
];
const RARE_CHANCE = 0.08;

export interface Prize { id: number; kind: string; x: number; y: number; vx: number; vy: number; r: number; held: boolean }

export type Event = { type: 'won'; kind: string } | { type: 'slipped' } | { type: 'missed' } | { type: 'grabbed' } | { type: 'roundOver' };

export interface Scene {
  phase: ClawPhase;
  claw: { x: number; y: number; open: number }; // open: 1 open, 0 closed
  prizes: Prize[];
  held: number | null; // the prize the claw holds
  // When the claw closed: how much of the way back (0 at the bottom, 1 over the chute) it keeps hold; 1 or more, all the way.
  holdUntil: number;
  timer: number;
  playsLeft: number;
  won: string[]; // this round's prizes, by kind
  nextId: number;
  // The lowest the claw goes, for this drop: the top of whatever is under it, or the floor.
  bottom: number;
}

const kindOf = (id: string) => PRIZE_KINDS.find(kind => kind.id === id)!;

function newPrize(scene: Scene, random: () => number, x: number, y: number): Prize {
  const common = PRIZE_KINDS.filter(kind => !kind.rare), rare = PRIZE_KINDS.filter(kind => kind.rare);
  const kind = random() < RARE_CHANCE ? rare[Math.floor(random() * rare.length)] : common[Math.floor(random() * common.length)];
  return { id: scene.nextId++, kind: kind.id, x, y, vx: 0, vy: 0, r: kind.radius, held: false };
}

// The pit filled up to `count` prizes, dropped in from above at random places, then let settle.
export function fill(scene: Scene, random: () => number, count = 11) {
  while (scene.prizes.length < count) {
    scene.prizes.push(newPrize(scene, random, CHUTE_RIGHT + 30 + random() * (WIDTH - CHUTE_RIGHT - 60), 150 + random() * 120));
  }
  for (let i = 0; i < 240; i++) physics(scene, 1 / 60);
}

export function createScene(random: () => number): Scene {
  const scene: Scene = { phase: 'ready', claw: { x: HOME_X, y: RAIL_Y, open: 1 }, prizes: [], held: null, holdUntil: 0, timer: 0, playsLeft: PLAYS_PER_ROUND, won: [], nextId: 1, bottom: FLOOR_Y };
  fill(scene, random);
  return scene;
}

// A new round: five plays, the pit topped up.
export function newRound(scene: Scene, random: () => number) {
  scene.phase = 'ready';
  scene.playsLeft = PLAYS_PER_ROUND;
  scene.won = [];
  fill(scene, random);
}

// "Move" pressed or released. Moving starts a play; releasing ends the aiming for good, as on a real machine.
export function holdMove(scene: Scene, down: boolean) {
  if (down && scene.phase === 'ready' && scene.playsLeft > 0) { scene.phase = 'moving'; scene.playsLeft--; }
  else if (!down && scene.phase === 'moving') scene.phase = 'aimed';
}

// "Drop": from aiming, or straight from the start (a play where the claw drops above the chute side).
export function drop(scene: Scene) {
  if (scene.phase === 'ready' && scene.playsLeft > 0) { scene.playsLeft--; scene.phase = 'aimed'; }
  if (scene.phase !== 'moving' && scene.phase !== 'aimed') return;
  scene.phase = 'dropping';
  scene.bottom = clawBottom(scene, scene.claw.x);
}

// How far down the claw's tips (CLAW_TIP below its hub) can go at x: onto the highest prize under it, a little into it (soft toys), or the floor.
export const CLAW_TIP = 34;
function clawBottom(scene: Scene, x: number) {
  let top = FLOOR_Y - 4;
  for (const prize of scene.prizes) {
    const dx = Math.abs(prize.x - x);
    if (dx < prize.r + 6) top = Math.min(top, prize.y - Math.sqrt(Math.max(0, (prize.r + 6) ** 2 - dx * dx)) + prize.r * 0.9);
  }
  return Math.min(top, FLOOR_Y - 4) - CLAW_TIP;
}

// Which prize the claw takes when it closes at x, and whether it keeps it: the nearest prize whose middle is within reach of the claw's
// middle and whose top is around the tips. Centred, it holds all the way most of the time; off-centre, it slips sooner and more often.
export function grab(scene: Scene, random: () => number): { prize: Prize | null; holdUntil: number } {
  const tips = scene.claw.y + CLAW_TIP;
  let best: Prize | null = null;
  for (const prize of scene.prizes) {
    const dx = Math.abs(prize.x - scene.claw.x);
    if (dx > CLAW_REACH || prize.y - prize.r > tips + 8 || prize.y + prize.r < tips - 4) continue;
    if (!best || dx < Math.abs(best.x - scene.claw.x)) best = prize;
  }
  if (!best) return { prize: null, holdUntil: 0 };
  const centred = 1 - Math.abs(best.x - scene.claw.x) / CLAW_REACH; // 1 in the middle, 0 at the edge of reach
  const grip = centred * 0.75 + random() * 0.6; // over 1: kept all the way
  return { prize: best, holdUntil: grip >= 1 ? 1.5 : Math.max(0.05, grip) };
}

// One frame: the claw's state machine, then the prizes. Returns what happened, for the page (sounds, messages, the collection).
export function step(scene: Scene, dt: number, random: () => number, moving: boolean): Event[] {
  const events: Event[] = [];
  const claw = scene.claw;
  switch (scene.phase) {
    case 'moving':
      if (moving) claw.x = Math.min(MAX_X, claw.x + MOVE_SPEED * dt);
      break;
    case 'dropping':
      claw.y = Math.min(scene.bottom, claw.y + DROP_SPEED * dt);
      if (claw.y >= scene.bottom) { scene.phase = 'closing'; scene.timer = 0; }
      break;
    case 'closing':
      scene.timer += dt;
      claw.open = Math.max(0, 1 - scene.timer / CLOSE_TIME);
      if (scene.timer >= CLOSE_TIME) {
        const { prize, holdUntil } = grab(scene, random);
        if (prize) { prize.held = true; scene.held = prize.id; scene.holdUntil = holdUntil; events.push({ type: 'grabbed' }); }
        else events.push({ type: 'missed' });
        scene.phase = 'rising';
      }
      break;
    case 'rising': {
      claw.y = Math.max(RAIL_Y, claw.y - RISE_SPEED * dt);
      // The way back, 0 at the bottom to 1 over the chute: rising is its first half, going back left the second.
      const progress = 0.5 * (1 - (claw.y - RAIL_Y) / Math.max(1, scene.bottom - RAIL_Y));
      release(scene, progress, events);
      if (claw.y <= RAIL_Y) scene.phase = 'returning';
      break;
    }
    case 'returning': {
      claw.x = Math.max(HOME_X, claw.x - RETURN_SPEED * dt);
      release(scene, 0.5 + 0.5 * (1 - (claw.x - HOME_X) / Math.max(1, MAX_X - HOME_X)), events);
      if (claw.x <= HOME_X) { scene.phase = 'opening'; scene.timer = 0; }
      break;
    }
    case 'opening':
      scene.timer += dt;
      claw.open = Math.min(1, scene.timer / OPEN_TIME);
      if (scene.held !== null) letGo(scene);
      if (scene.timer >= OPEN_TIME + 0.6) { // a moment for a dropped prize to fall into the chute
        scene.phase = scene.playsLeft > 0 ? 'ready' : 'over';
        if (scene.phase === 'over') events.push({ type: 'roundOver' });
      }
      break;
  }
  // The held prize hangs between the claw's tips.
  const held = scene.prizes.find(prize => prize.id === scene.held);
  if (held) { held.x = claw.x; held.y = claw.y + CLAW_TIP + held.r * 0.35; held.vx = 0; held.vy = 0; }
  physics(scene, dt);
  // A prize that is in the chute is won (dropped there, or pushed in by others).
  for (const prize of [...scene.prizes]) {
    if (!prize.held && prize.x < CHUTE_RIGHT && prize.y > FLOOR_Y + prize.r) {
      scene.prizes = scene.prizes.filter(other => other !== prize);
      scene.won.push(prize.kind);
      events.push({ type: 'won', kind: prize.kind });
    }
  }
  return events;
}

function release(scene: Scene, progress: number, events: Event[]) {
  if (scene.held !== null && progress >= scene.holdUntil) { letGo(scene); events.push({ type: 'slipped' }); }
}
function letGo(scene: Scene) {
  const prize = scene.prizes.find(candidate => candidate.id === scene.held);
  if (prize) prize.held = false;
  scene.held = null;
}

// Gravity, the walls, the floor (none under the chute), and the prizes pushing each other apart; soft, so they settle in a heap.
function physics(scene: Scene, dt: number) {
  const steps = 3, h = dt / steps;
  for (let s = 0; s < steps; s++) {
    for (const prize of scene.prizes) {
      if (prize.held) continue;
      prize.vy += GRAVITY * h;
      prize.x += prize.vx * h;
      prize.y += prize.vy * h;
      // The side walls of the machine.
      if (prize.x < prize.r) { prize.x = prize.r; prize.vx *= -0.3; }
      if (prize.x > WIDTH - prize.r) { prize.x = WIDTH - prize.r; prize.vx *= -0.3; }
      // The pit's floor (right of the chute) and the wall between the pit and the chute.
      if (prize.x >= CHUTE_RIGHT && prize.y > FLOOR_Y - prize.r) { prize.y = FLOOR_Y - prize.r; prize.vy *= -0.2; prize.vx *= 0.8; }
      // The wall between the pit and the chute: a segment from its top to the floor, 4 wide, rounded at the top so that a prize on it rolls off.
      const nearestY = Math.min(FLOOR_Y + 40, Math.max(WALL_TOP, prize.y));
      const wx = prize.x - CHUTE_RIGHT, wy = prize.y - nearestY, gap = Math.hypot(wx, wy) || 0.01, reach = prize.r + 4;
      if (gap < reach) {
        const nx = wx / gap, ny = wy / gap;
        prize.x += nx * (reach - gap); prize.y += ny * (reach - gap);
        const into = prize.vx * nx + prize.vy * ny;
        if (into < 0) { prize.vx -= 1.3 * into * nx; prize.vy -= 1.3 * into * ny; }
      }
    }
    for (let i = 0; i < scene.prizes.length; i++) {
      for (let j = i + 1; j < scene.prizes.length; j++) {
        const a = scene.prizes[i], b = scene.prizes[j];
        const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 0.01, overlap = a.r + b.r - distance;
        if (overlap <= 0) continue;
        const nx = dx / distance, ny = dy / distance;
        const share = a.held ? 0 : b.held ? 1 : 0.5;
        a.x -= nx * overlap * share; a.y -= ny * overlap * share;
        b.x += nx * overlap * (1 - share); b.y += ny * overlap * (1 - share);
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative < 0) {
          const impulse = -relative * 0.6;
          if (!a.held) { a.vx -= nx * impulse * share * 2; a.vy -= ny * impulse * share * 2; }
          if (!b.held) { b.vx += nx * impulse * (1 - share) * 2; b.vy += ny * impulse * (1 - share) * 2; }
        }
      }
    }
    for (const prize of scene.prizes) { prize.vx *= 0.995; }
  }
}

export { kindOf };
