// The crane game, without drawing: a machine seen from the side, a claw on a rail and soft prizes in a pit, in a world 360 wide and 480 high,
// y downward. A play: hold "move" to slide the claw right (once; releasing stops it for good), then "drop": the claw goes down until it
// meets something, closes, rises, goes back left over the chute and opens. A prize that falls into the chute is won.
//
// Everything touches: the prizes are discs with weight, gravity and friction that roll and stack (position-based dynamics: each small
// step moves them, then pushes apart whatever overlaps, a few times over), and the claw is solid: a hub and two arms, each an upper arm
// and an inward-bent finger, every piece a rounded segment. Coming down, it pushes prizes aside and stops when it can go no further, as a
// real claw's cable goes slack; closing, each arm stops when it presses on something. Whether a prize is carried is not drawn by lot: it
// is carried when the fingers got under it, and as on a real machine the arms loosen a little on the way, so a grip that was barely
// under it lets go. Randomness only places the prizes and varies the arms' strength a little; it comes in as a function for the tests.

export const WIDTH = 360;
export const HEIGHT = 480;
export const RAIL_Y = 56; // the hub's height when the claw is up
export const HOME_X = 52; // above the chute
export const MAX_X = WIDTH - 34;
export const CHUTE_RIGHT = 100; // the chute is x < this; a wall on its right keeps prizes in the pit
export const WALL_TOP = 290; // the top of that wall, above the heap: a prize has to be lifted over it
export const FLOOR_Y = 440; // the pit's floor
export const PLAYS_PER_ROUND = 5;
export const CLAW_TIP = 48; // about how far below the hub the fingers reach
const MOVE_SPEED = 95; // px/s
const DROP_SPEED = 140;
const RISE_SPEED = 90;
const RETURN_SPEED = 100;
const CLOSE_SPEED = 2.2; // of `open` per second
const OPEN_TIME = 0.4;
const GRAVITY = 900;
const SUBSTEPS = 8;
const ITERATIONS = 4;
const FRICTION = 0.5;
const LOOSEST = 0.32;
const SQUEEZE = 9; // the prizes are soft: an arm closes on one until it presses this far in

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

// A prize: where it is now and where it was a step ago (its velocity is the difference), and how far it has turned (it rolls).
export interface Prize { id: number; kind: string; x: number; y: number; px: number; py: number; r: number; angle: number }

export type Event = { type: 'won'; kind: string } | { type: 'slipped'; late: boolean } | { type: 'missed' } | { type: 'grabbed' } | { type: 'roundOver' };

export interface Scene {
  phase: ClawPhase;
  // The hub, and how open each arm is (1 open, 0 closed): an arm that presses on something stops closing.
  claw: { x: number; y: number; open: number; left: number; right: number };
  prizes: Prize[];
  timer: number;
  playsLeft: number;
  won: string[]; // this round's prizes, by kind
  nextId: number;
  // This play: how much the arms loosen per second on the way back, the prize being carried (if any), the prizes' heights when the claw
  // closed, whether anything was lifted, and where the way back started (for "so close").
  loosen: number;
  carried: number | null;
  closedAt: Map<number, number>;
  lifted: boolean;
  startX: number;
  stall: number; // steps in a row that the claw has been pressing on something it cannot push away
  closed: { left: number; right: number }; // how far each arm closed: it loosens from there
}

export const kindOf = (id: string) => PRIZE_KINDS.find(kind => kind.id === id)!;

// ---------------------------------------------------------------- the claw's shape

// A rounded segment: from (ax, ay) to (bx, by), `r` thick.
export interface Segment { ax: number; ay: number; bx: number; by: number; r: number }
// Long arms and fingers bent well inward, so that closing on a prize the fingertips go under it before the arms meet its widest part.
const UPPER = 34, FINGER = 18, OPEN_ANGLE = 48, CLOSED_ANGLE = 4, BEND = 70; // degrees
const rad = (deg: number) => (deg * Math.PI) / 180;

// The claw's pieces where it is now: the hub, and for each side an upper arm (swinging out as it opens) and a finger bent inward.
export function clawSegments(claw: Scene['claw']): Segment[] {
  const pieces: Segment[] = [{ ax: claw.x - 12, ay: claw.y + 4, bx: claw.x + 12, by: claw.y + 4, r: 6 }];
  for (const [side, open] of [[-1, claw.left], [1, claw.right]] as const) {
    const angle = rad(CLOSED_ANGLE + (OPEN_ANGLE - CLOSED_ANGLE) * open);
    const sx = claw.x + side * 9, sy = claw.y + 8;
    const ex = sx + side * UPPER * Math.sin(angle), ey = sy + UPPER * Math.cos(angle);
    const finger = angle - rad(BEND);
    const tx = ex + side * FINGER * Math.sin(finger), ty = ey + FINGER * Math.cos(finger);
    pieces.push({ ax: sx, ay: sy, bx: ex, by: ey, r: 3 }, { ax: ex, ay: ey, bx: tx, by: ty, r: 3 });
  }
  return pieces;
}

// ---------------------------------------------------------------- a round and a play

function newPrize(scene: Scene, random: () => number, x: number, y: number): Prize {
  const common = PRIZE_KINDS.filter(kind => !kind.rare), rare = PRIZE_KINDS.filter(kind => kind.rare);
  const kind = random() < RARE_CHANCE ? rare[Math.floor(random() * rare.length)] : common[Math.floor(random() * common.length)];
  return { id: scene.nextId++, kind: kind.id, x, y, px: x, py: y, r: kind.radius, angle: random() * 0.6 - 0.3 };
}

// The pit filled up to `count` prizes, dropped in from above at random places where they do not overlap (overlapping ones would be thrown
// apart, some over the wall into the chute), then let settle. One that still ends up in the chute is taken out and put back in.
export function fill(scene: Scene, random: () => number, count = 11) {
  for (let attempt = 0; attempt < 4 && scene.prizes.length < count; attempt++) {
    while (scene.prizes.length < count) {
      const prize = newPrize(scene, random, 0, 0);
      let placed = false;
      for (let tries = 0; tries < 40 && !placed; tries++) {
        prize.x = prize.px = CHUTE_RIGHT + prize.r + 10 + random() * (WIDTH - CHUTE_RIGHT - 2 * prize.r - 12);
        prize.y = prize.py = 110 + random() * 170;
        placed = scene.prizes.every(other => Math.hypot(other.x - prize.x, other.y - prize.y) > other.r + prize.r + 2);
      }
      if (!placed) break;
      scene.prizes.push(prize);
    }
    for (let i = 0; i < 300; i++) physics(scene, 1 / 60, null);
    scene.prizes = scene.prizes.filter(prize => prize.x >= CHUTE_RIGHT && prize.y < FLOOR_Y);
  }
  for (const prize of scene.prizes) { prize.px = prize.x; prize.py = prize.y; }
}

export function createScene(random: () => number): Scene {
  const scene: Scene = {
    phase: 'ready', claw: { x: HOME_X, y: RAIL_Y, open: 1, left: 1, right: 1 }, prizes: [], timer: 0, playsLeft: PLAYS_PER_ROUND, won: [], nextId: 1,
    loosen: 0.05, carried: null, closedAt: new Map(), lifted: false, startX: HOME_X, stall: 0, closed: { left: 0, right: 0 },
  };
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

// "Drop": from aiming, or straight from the start. `random` sets how much this claw's arms loosen on the way (a little either way).
export function drop(scene: Scene, random: () => number = Math.random) {
  if (scene.phase === 'ready' && scene.playsLeft > 0) { scene.playsLeft--; scene.phase = 'aimed'; }
  if (scene.phase !== 'moving' && scene.phase !== 'aimed') return;
  scene.phase = 'dropping';
  scene.stall = 0;
  scene.loosen = 0.05 + random() * 0.05;
  scene.carried = null;
  scene.lifted = false;
}

// ---------------------------------------------------------------- one frame

export function step(scene: Scene, dt: number, random: () => number, moving: boolean): Event[] {
  const events: Event[] = [];
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    const before = { x: scene.claw.x, y: scene.claw.y };
    clawStep(scene, h, moving, events);
    physics(scene, h, { dx: scene.claw.x - before.x, dy: scene.claw.y - before.y });
    afterStep(scene, events);
  }
  // A prize that is in the chute is won (dropped there, or pushed in by others).
  for (const prize of [...scene.prizes]) {
    if (prize.x < CHUTE_RIGHT && prize.y > FLOOR_Y + prize.r) {
      scene.prizes = scene.prizes.filter(other => other !== prize);
      scene.won.push(prize.kind);
      if (scene.carried === prize.id) scene.carried = null;
      events.push({ type: 'won', kind: prize.kind });
    }
  }
  void random;
  return events;
}

// The claw's own motion for a small step.
function clawStep(scene: Scene, h: number, moving: boolean, events: Event[]) {
  const claw = scene.claw;
  switch (scene.phase) {
    case 'moving':
      if (moving) claw.x = Math.min(MAX_X, claw.x + MOVE_SPEED * h);
      break;
    case 'dropping':
      // Down until it is held up by what is under it (the cable goes slack) or the fingers reach the floor.
      if (scene.stall >= 3 || claw.y + CLAW_TIP >= FLOOR_Y - 2) {
        scene.phase = 'closing';
        scene.timer = 0;
        scene.closedAt = new Map(scene.prizes.map(prize => [prize.id, prize.y]));
      } else claw.y += DROP_SPEED * h;
      break;
    case 'closing': {
      // Each arm closes until it presses on something (or is shut).
      const blocked = blockedArms(scene);
      if (!blocked.left) claw.left = Math.max(0, claw.left - CLOSE_SPEED * h);
      if (!blocked.right) claw.right = Math.max(0, claw.right - CLOSE_SPEED * h);
      scene.timer += h;
      if ((claw.left <= 0 || blocked.left) && (claw.right <= 0 || blocked.right) || scene.timer > 0.8) {
        scene.timer = 0;
        scene.phase = 'rising';
        scene.startX = claw.x;
        scene.closed = { left: claw.left, right: claw.right };
      }
      break;
    }
    case 'rising':
      claw.y = Math.max(RAIL_Y, claw.y - RISE_SPEED * h);
      loosen(scene, h);
      if (claw.y <= RAIL_Y) {
        scene.phase = 'returning';
        if (!scene.lifted) events.push({ type: 'missed' });
      }
      break;
    case 'returning':
      claw.x = Math.max(HOME_X, claw.x - RETURN_SPEED * h);
      loosen(scene, h);
      if (claw.x <= HOME_X) { scene.phase = 'opening'; scene.timer = 0; }
      break;
    case 'opening':
      scene.timer += h;
      claw.left = claw.right = Math.min(1, Math.max(claw.left, claw.right, scene.timer / OPEN_TIME));
      if (scene.timer >= OPEN_TIME + 1.3) { // time for a dropped prize to fall into the chute
        // Carried all the way back but not in the chute: it fell off at the last moment, onto the wall or back into the pit.
        if (scene.carried !== null) events.push({ type: 'slipped', late: true });
        scene.carried = null;
        scene.phase = scene.playsLeft > 0 ? 'ready' : 'over';
        if (scene.phase === 'over') events.push({ type: 'roundOver' });
      }
      break;
  }
  claw.open = (claw.left + claw.right) / 2;
}

// On the way back the arms give a little (a real machine's weak grip), up to LOOSEST further open.
function loosen(scene: Scene, h: number) {
  scene.claw.left = Math.min(1, scene.closed.left + LOOSEST, scene.claw.left + scene.loosen * h);
  scene.claw.right = Math.min(1, scene.closed.right + LOOSEST, scene.claw.right + scene.loosen * h);
}

// After a step: is the claw pressing on something it cannot move (it stops going down), is a prize being carried, has it been lost?
function afterStep(scene: Scene, events: Event[]) {
  const pieces = clawSegments(scene.claw);
  if (scene.phase === 'dropping') {
    const pressing = scene.prizes.some(prize => pieces.some(piece => depth(prize, piece) > 1.2)) || pieces.some(piece => Math.max(piece.ay, piece.by) + piece.r > FLOOR_Y);
    scene.stall = pressing ? scene.stall + 1 : 0;
  }
  if (scene.phase === 'rising' || scene.phase === 'returning') {
    const tips = scene.claw.y + CLAW_TIP;
    if (scene.carried === null) {
      // Lifted: well above where it was when the claw closed, and up among the claw's fingers.
      const lifted = scene.prizes.find(prize => (scene.closedAt.get(prize.id) ?? prize.y) - prize.y > 14 && Math.abs(prize.x - scene.claw.x) < 40 && Math.abs(prize.y - tips) < prize.r + 24);
      if (lifted) { scene.carried = lifted.id; scene.lifted = true; events.push({ type: 'grabbed' }); }
    } else {
      const prize = scene.prizes.find(candidate => candidate.id === scene.carried);
      if (prize && (prize.y - tips > prize.r + 30 || Math.abs(prize.x - scene.claw.x) > 60)) {
        // It fell away from the claw. "So close" if that was near the chute, on the way back.
        const way = scene.phase === 'returning' ? (scene.startX - scene.claw.x) / Math.max(1, scene.startX - HOME_X) : 0;
        events.push({ type: 'slipped', late: way >= 0.6 });
        scene.carried = null;
      }
    }
  }
}

// Which arms stop closing: an arm that presses hard (SQUEEZE) on a prize on its inner side (between the arms, where closing pushes), and an
// arm that touches a prize the other arm already presses hard on (closing on would only squeeze it through the other arm). A prize
// touching an arm from outside does not hold it back - closing moves the arm away from it.
function blockedArms(scene: Scene) {
  const pieces = clawSegments(scene.claw);
  // How deep each arm presses on a prize from inside: negative when it is that far off, -Infinity when the prize is outside the arm. (The
  // arm last pushed out of a prize reads as just touching, so touching is taken within TOUCH.)
  const inner = (prize: Prize, index: number, side: -1 | 1) => Math.max(...[pieces[index], pieces[index + 1]].map(piece => {
    const point = nearest(prize, piece);
    return (prize.x - point.x) * -side > 0 ? prize.r + piece.r - Math.hypot(prize.x - point.x, prize.y - point.y) : -Infinity;
  }));
  const TOUCH = -1.5;
  let left = false, right = false;
  for (const prize of scene.prizes) {
    const l = inner(prize, 1, -1), r = inner(prize, 3, 1);
    if (l > SQUEEZE || (r > SQUEEZE && l > TOUCH) || (l > TOUCH && r > TOUCH && l + r > SQUEEZE)) left = true;
    if (r > SQUEEZE || (l > SQUEEZE && r > TOUCH) || (l > TOUCH && r > TOUCH && l + r > SQUEEZE)) right = true;
  }
  return { left, right };
}

// ---------------------------------------------------------------- the physics

// How far a prize overlaps a piece (0 if it does not), with the nearest point on the piece.
function nearest(prize: Prize, piece: Segment) {
  const vx = piece.bx - piece.ax, vy = piece.by - piece.ay, length = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((prize.x - piece.ax) * vx + (prize.y - piece.ay) * vy) / length));
  return { x: piece.ax + vx * t, y: piece.ay + vy * t };
}
function depth(prize: Prize, piece: Segment) {
  const point = nearest(prize, piece);
  return Math.max(0, prize.r + piece.r - Math.hypot(prize.x - point.x, prize.y - point.y));
}

// The fixed pieces: the pit's floor, flat and only right of the chute (the wall covers the corner), and the wall between the pit and the
// chute (rounded on top).
function floor(prize: Prize) {
  if (prize.x < CHUTE_RIGHT || prize.y <= FLOOR_Y - prize.r) return;
  const overlap = prize.y - (FLOOR_Y - prize.r);
  prize.y = FLOOR_Y - prize.r;
  const along = prize.x - prize.px;
  prize.x -= Math.min(Math.abs(along), overlap * FRICTION + 0.02) * Math.sign(along);
}
const DIVIDER: Segment = { ax: CHUTE_RIGHT, ay: WALL_TOP, bx: CHUTE_RIGHT, by: FLOOR_Y + 80, r: 4 };

// Pushes a prize out of a piece, and lets friction hold it to the piece: `moved` is how far the piece moved this step (the claw's motion).
function collide(prize: Prize, piece: Segment, moved: { dx: number; dy: number }) {
  const point = nearest(prize, piece);
  let nx = prize.x - point.x, ny = prize.y - point.y;
  const distance = Math.hypot(nx, ny);
  const overlap = prize.r + piece.r - distance;
  if (overlap <= 0) return;
  if (distance < 1e-6) { nx = 0; ny = -1; } else { nx /= distance; ny /= distance; }
  prize.x += nx * overlap; prize.y += ny * overlap;
  // Friction: of how the prize moved this step, relative to the piece, the part along the surface is held back.
  const rx = prize.x - prize.px - moved.dx, ry = prize.y - prize.py - moved.dy;
  const along = rx * -ny + ry * nx;
  const hold = Math.min(Math.abs(along), overlap * FRICTION + 0.02) * Math.sign(along);
  prize.x -= -ny * hold; prize.y -= nx * hold;
}

function physics(scene: Scene, h: number, clawMoved: { dx: number; dy: number } | null) {
  const still = { dx: 0, dy: 0 };
  const pieces = clawMoved ? clawSegments(scene.claw) : [];
  for (const prize of scene.prizes) {
    const vx = (prize.x - prize.px) * 0.998, vy = (prize.y - prize.py) * 0.998;
    prize.px = prize.x; prize.py = prize.y;
    prize.x += vx; prize.y += vy + GRAVITY * h * h;
  }
  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    for (const prize of scene.prizes) {
      if (prize.x < prize.r) prize.x = prize.r;
      if (prize.x > WIDTH - prize.r) prize.x = WIDTH - prize.r;
      floor(prize);
      collide(prize, DIVIDER, still);
      for (const piece of pieces) collide(prize, piece, clawMoved!);
    }
    for (let i = 0; i < scene.prizes.length; i++) {
      for (let j = i + 1; j < scene.prizes.length; j++) {
        const a = scene.prizes[i], b = scene.prizes[j];
        const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 0.01, overlap = a.r + b.r - distance;
        if (overlap <= 0) continue;
        const nx = dx / distance, ny = dy / distance;
        const ma = a.r * a.r, mb = b.r * b.r, wa = mb / (ma + mb), wb = ma / (ma + mb);
        a.x -= nx * overlap * wa; a.y -= ny * overlap * wa;
        b.x += nx * overlap * wb; b.y += ny * overlap * wb;
        // Friction between two prizes.
        const rx = (b.x - b.px) - (a.x - a.px), ry = (b.y - b.py) - (a.y - a.py);
        const along = rx * -ny + ry * nx, hold = Math.min(Math.abs(along), overlap * FRICTION) * Math.sign(along);
        a.x -= ny * hold * wa; a.y += nx * hold * wa;
        b.x += ny * hold * wb; b.y -= nx * hold * wb;
      }
    }
  }
  // Rolling: a prize turns as it moves along (only for the drawing).
  for (const prize of scene.prizes) prize.angle += (prize.x - prize.px) / prize.r;
}

// ---------------------------------------------------------------- the 3D machine's grip

// How much of the way back the 3D claw keeps hold of a prize caught `centred` (1 in the middle of the claw, 0 at the edge of its reach): the
// way back runs from 0 at the bottom to 1 over the chute; 1.5 is all the way, and 0 means it cannot lift it. The side view no longer uses
// this (its claw touches the prizes); the 3D machine still does.
export function gripFor(centred: number, random: () => number) {
  const grip = centred * 1.1 + random() * 0.5;
  if (grip >= 1) return 1.5;
  if (grip < 0.6) return 0;
  return 0.1 + ((grip - 0.6) / 0.4) * 0.9;
}
