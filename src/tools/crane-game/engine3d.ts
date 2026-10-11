// The crane game in three dimensions, without drawing: a pit 360 wide (x), 240 deep (z, 0 at the front) and the claw hanging from the
// ceiling (y up, the floor at 0), with soft prizes as spheres. The chute is the front-left corner (x and z under CHUTE), a hole in the floor
// behind a low wall. A play, as on a real machine: hold "right" (x, once), then hold "back" (z, once); letting go of "back" drops the claw,
// which closes, rises, goes back above the chute and opens. Whether it keeps hold is decided as in the side view (lib: engine.ts's grip).
import { gripFor, kindOf, PLAYS_PER_ROUND, PRIZE_KINDS, type Event } from './engine.ts';

export const W = 360, D = 240, CEILING = 300;
export const CHUTE = 100; // the chute: x < CHUTE and z < CHUTE
export const WALL_H = 80; // the wall around the chute
export const HOME = { x: 50, z: 50 }; // above the chute
export const TOP_Y = 250; // the claw's hub when it is up
export const CLAW_TIP = 36; // the tips below the hub
export const REACH = 24; // how far (across) from the claw's middle it takes hold
const SPEED = 95, DROP = 140, RISE = 95, BACK = 110, CLOSE_TIME = 0.45, OPEN_TIME = 0.4, GRAVITY = 900;

export type Phase3 = 'ready' | 'movingX' | 'aimedX' | 'movingZ' | 'dropping' | 'closing' | 'rising' | 'returning' | 'opening' | 'over';
export interface Ball { id: number; kind: string; x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; held: boolean }
export interface Scene3 {
  phase: Phase3;
  claw: { x: number; y: number; z: number; open: number };
  prizes: Ball[];
  held: number | null;
  holdUntil: number;
  timer: number;
  playsLeft: number;
  won: string[];
  nextId: number;
  bottom: number;
  from: { x: number; z: number }; // where the claw closed, for measuring the way back
}

const RARE_CHANCE = 0.08;
function newBall(scene: Scene3, random: () => number): Ball {
  const common = PRIZE_KINDS.filter(kind => !kind.rare), rare = PRIZE_KINDS.filter(kind => kind.rare);
  const kind = random() < RARE_CHANCE ? rare[Math.floor(random() * rare.length)] : common[Math.floor(random() * common.length)];
  // Anywhere in the pit but the chute's corner, dropped from above.
  let x = 0, z = 0;
  do { x = 30 + random() * (W - 60); z = 30 + random() * (D - 60); } while (x < CHUTE + 30 && z < CHUTE + 30);
  return { id: scene.nextId++, kind: kind.id, x, y: 120 + random() * 120, z, vx: 0, vy: 0, vz: 0, r: kindOf(kind.id).radius, held: false };
}

export function fill3(scene: Scene3, random: () => number, count = 18) {
  while (scene.prizes.length < count) scene.prizes.push(newBall(scene, random));
  for (let i = 0; i < 300; i++) physics3(scene, 1 / 60);
}

export function createScene3(random: () => number): Scene3 {
  const scene: Scene3 = { phase: 'ready', claw: { x: HOME.x, y: TOP_Y, z: HOME.z, open: 1 }, prizes: [], held: null, holdUntil: 0, timer: 0, playsLeft: PLAYS_PER_ROUND, won: [], nextId: 1, bottom: 0, from: { ...HOME } };
  fill3(scene, random);
  return scene;
}

export function newRound3(scene: Scene3, random: () => number) {
  scene.phase = 'ready'; scene.playsLeft = PLAYS_PER_ROUND; scene.won = [];
  fill3(scene, random);
}

// "Right" held: starts a play and slides the claw right; released, it stops for good.
export function holdRight(scene: Scene3, down: boolean) {
  if (down && scene.phase === 'ready' && scene.playsLeft > 0) { scene.phase = 'movingX'; scene.playsLeft--; }
  else if (!down && scene.phase === 'movingX') scene.phase = 'aimedX';
}
// "Back" held: slides the claw back (after "right", or straight from the start); released, the claw drops.
export function holdBack(scene: Scene3, down: boolean) {
  if (down && scene.phase === 'ready' && scene.playsLeft > 0) { scene.playsLeft--; scene.phase = 'movingZ'; }
  else if (down && scene.phase === 'aimedX') scene.phase = 'movingZ';
  else if (!down && scene.phase === 'movingZ') { scene.phase = 'dropping'; scene.bottom = bottomAt(scene, scene.claw.x, scene.claw.z); }
}

// The lowest the hub goes: the tips onto the highest prize under the claw (a little into it), or onto the floor.
function bottomAt(scene: Scene3, x: number, z: number) {
  let top = 4;
  for (const ball of scene.prizes) {
    const d = Math.hypot(ball.x - x, ball.z - z), reach = ball.r + 6;
    if (d < reach) top = Math.max(top, ball.y + Math.sqrt(reach * reach - d * d) - ball.r * 0.9);
  }
  return top + CLAW_TIP;
}

// The prize the claw takes on closing: the nearest (across) within reach whose top is around the tips; the grip as in the side view.
export function grab3(scene: Scene3, random: () => number): { prize: Ball | null; holdUntil: number } {
  const tips = scene.claw.y - CLAW_TIP;
  let best: Ball | null = null, bestD = Infinity;
  for (const ball of scene.prizes) {
    const d = Math.hypot(ball.x - scene.claw.x, ball.z - scene.claw.z);
    if (d > REACH || ball.y + ball.r < tips - 8 || ball.y - ball.r > tips + 4) continue;
    if (d < bestD) { best = ball; bestD = d; }
  }
  if (!best) return { prize: null, holdUntil: 0 };
  return { prize: best, holdUntil: gripFor(1 - bestD / REACH, random) };
}

export function step3(scene: Scene3, dt: number, random: () => number, held: { right: boolean; back: boolean }): Event[] {
  const events: Event[] = [];
  const claw = scene.claw;
  const release = (progress: number) => {
    if (scene.held !== null && progress >= scene.holdUntil) { letGo(scene); events.push({ type: 'slipped' }); }
  };
  switch (scene.phase) {
    case 'movingX': if (held.right) claw.x = Math.min(W - 30, claw.x + SPEED * dt); break;
    case 'movingZ': if (held.back) claw.z = Math.min(D - 30, claw.z + SPEED * dt); break;
    case 'dropping':
      claw.y = Math.max(scene.bottom, claw.y - DROP * dt);
      if (claw.y <= scene.bottom) { scene.phase = 'closing'; scene.timer = 0; }
      break;
    case 'closing':
      scene.timer += dt;
      claw.open = Math.max(0, 1 - scene.timer / CLOSE_TIME);
      if (scene.timer >= CLOSE_TIME) {
        const { prize, holdUntil } = grab3(scene, random);
        if (prize) { prize.held = true; scene.held = prize.id; scene.holdUntil = holdUntil; events.push({ type: 'grabbed' }); }
        else events.push({ type: 'missed' });
        scene.from = { x: claw.x, z: claw.z };
        scene.phase = 'rising';
      }
      break;
    case 'rising':
      claw.y = Math.min(TOP_Y, claw.y + RISE * dt);
      release(0.5 * (1 - (TOP_Y - claw.y) / Math.max(1, TOP_Y - scene.bottom)));
      if (claw.y >= TOP_Y) scene.phase = 'returning';
      break;
    case 'returning': {
      const dx = HOME.x - claw.x, dz = HOME.z - claw.z, left = Math.hypot(dx, dz);
      const move = Math.min(left, BACK * dt);
      if (left > 0) { claw.x += (dx / left) * move; claw.z += (dz / left) * move; }
      const total = Math.max(1, Math.hypot(HOME.x - scene.from.x, HOME.z - scene.from.z));
      release(0.5 + 0.5 * (1 - Math.max(0, left - move) / total));
      if (left - move <= 0.01) { claw.x = HOME.x; claw.z = HOME.z; scene.phase = 'opening'; scene.timer = 0; }
      break;
    }
    case 'opening':
      scene.timer += dt;
      claw.open = Math.min(1, scene.timer / OPEN_TIME);
      if (scene.held !== null) letGo(scene);
      if (scene.timer >= OPEN_TIME + 0.7) {
        scene.phase = scene.playsLeft > 0 ? 'ready' : 'over';
        if (scene.phase === 'over') events.push({ type: 'roundOver' });
      }
      break;
  }
  const ball = scene.prizes.find(prize => prize.id === scene.held);
  if (ball) { ball.x = claw.x; ball.z = claw.z; ball.y = claw.y - CLAW_TIP - ball.r * 0.35; ball.vx = ball.vy = ball.vz = 0; }
  physics3(scene, dt);
  for (const prize of [...scene.prizes]) {
    if (!prize.held && prize.x < CHUTE && prize.z < CHUTE && prize.y < -prize.r) {
      scene.prizes = scene.prizes.filter(other => other !== prize);
      scene.won.push(prize.kind);
      events.push({ type: 'won', kind: prize.kind });
    }
  }
  return events;
}

function letGo(scene: Scene3) {
  const ball = scene.prizes.find(prize => prize.id === scene.held);
  if (ball) ball.held = false;
  scene.held = null;
}

// The two low walls around the chute, as boxes [x0, x1] x [0, WALL_H] x [z0, z1].
export const CHUTE_WALLS: readonly [number, number, number, number][] = [[CHUTE - 4, CHUTE + 4, 0, CHUTE + 4], [0, CHUTE + 4, CHUTE - 4, CHUTE + 4]];
const inChute = (x: number, z: number) => x < CHUTE - 4 && z < CHUTE - 4;

function physics3(scene: Scene3, dt: number) {
  const steps = 3, h = dt / steps;
  for (let s = 0; s < steps; s++) {
    for (const b of scene.prizes) {
      if (b.held) continue;
      b.vy -= GRAVITY * h;
      b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
      if (b.x < b.r) { b.x = b.r; b.vx *= -0.3; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx *= -0.3; }
      if (b.z < b.r) { b.z = b.r; b.vz *= -0.3; }
      if (b.z > D - b.r) { b.z = D - b.r; b.vz *= -0.3; }
      // The floor, except over the chute's hole.
      if (!inChute(b.x, b.z) && b.y < b.r) { b.y = b.r; b.vy *= -0.2; b.vx *= 0.8; b.vz *= 0.8; }
      for (const [x0, x1, z0, z1] of CHUTE_WALLS) {
        const cx = Math.max(x0, Math.min(x1, b.x)), cy = Math.max(-40, Math.min(WALL_H, b.y)), cz = Math.max(z0, Math.min(z1, b.z));
        const dx = b.x - cx, dy = b.y - cy, dz = b.z - cz, gap = Math.hypot(dx, dy, dz);
        if (gap >= b.r) continue;
        if (gap < 0.01) { b.y = WALL_H + b.r; continue; } // inside: lift it onto the wall
        const nx = dx / gap, ny = dy / gap, nz = dz / gap;
        b.x += nx * (b.r - gap); b.y += ny * (b.r - gap); b.z += nz * (b.r - gap);
        const into = b.vx * nx + b.vy * ny + b.vz * nz;
        if (into < 0) { b.vx -= 1.3 * into * nx; b.vy -= 1.3 * into * ny; b.vz -= 1.3 * into * nz; }
      }
    }
    for (let i = 0; i < scene.prizes.length; i++) {
      for (let j = i + 1; j < scene.prizes.length; j++) {
        const a = scene.prizes[i], b = scene.prizes[j];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 0.01, overlap = a.r + b.r - d;
        if (overlap <= 0) continue;
        const nx = dx / d, ny = dy / d, nz = dz / d, share = a.held ? 0 : b.held ? 1 : 0.5;
        a.x -= nx * overlap * share; a.y -= ny * overlap * share; a.z -= nz * overlap * share;
        b.x += nx * overlap * (1 - share); b.y += ny * overlap * (1 - share); b.z += nz * overlap * (1 - share);
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
        if (relative < 0) {
          const impulse = -relative * 0.6;
          if (!a.held) { a.vx -= nx * impulse * share * 2; a.vy -= ny * impulse * share * 2; a.vz -= nz * impulse * share * 2; }
          if (!b.held) { b.vx += nx * impulse * (1 - share) * 2; b.vy += ny * impulse * (1 - share) * 2; b.vz += nz * impulse * (1 - share) * 2; }
        }
      }
    }
    for (const b of scene.prizes) { b.vx *= 0.995; b.vz *= 0.995; }
  }
}
