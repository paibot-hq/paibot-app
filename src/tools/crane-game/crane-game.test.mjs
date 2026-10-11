import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHUTE_RIGHT, CLAW_TIP, clawSegments, createScene, drop, FLOOR_Y, HOME_X, holdMove, MAX_X, newRound, PLAYS_PER_ROUND, PRIZE_KINDS, RAIL_Y, step, WALL_TOP, WIDTH } from './engine.ts';

// A seeded random, so that every run is the same.
const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
// Runs the machine for `seconds`, the "move" button held as given; returns every event.
const run = (scene, seconds, random, moving = false) => {
  const events = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...step(scene, 1 / 60, random, moving));
  return events;
};
// Slides the claw to x and drops it.
const aim = (scene, x, random) => {
  holdMove(scene, true);
  while (scene.claw.x < x - 0.5 && scene.claw.x < MAX_X) step(scene, 1 / 240, random, true);
  holdMove(scene, false);
  drop(scene, random);
};
// How far a prize is sunk into a piece of the claw.
const sunk = (prize, piece) => {
  const vx = piece.bx - piece.ax, vy = piece.by - piece.ay;
  const t = Math.max(0, Math.min(1, ((prize.x - piece.ax) * vx + (prize.y - piece.ay) * vy) / (vx * vx + vy * vy)));
  return prize.r + piece.r - Math.hypot(prize.x - (piece.ax + vx * t), prize.y - (piece.ay + vy * t));
};
const topPrize = scene => scene.prizes.reduce((a, b) => (a.y < b.y ? a : b));

test('the prizes settle in the pit: all eleven, at rest, none in another, none in the chute or over the wall', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const scene = createScene(seeded(seed));
    const events = run(scene, 2, seeded(seed));
    assert.equal(scene.prizes.length, 11);
    assert.equal(events.filter(event => event.type === 'won').length, 0, 'none falls into the chute by itself');
    for (const prize of scene.prizes) {
      assert.ok(prize.x >= CHUTE_RIGHT && prize.x <= WIDTH - prize.r + 0.5, `x ${prize.x}`);
      assert.ok(prize.y <= FLOOR_Y - prize.r + 0.5 && prize.y - prize.r > WALL_TOP - 60, `y ${prize.y}`);
      assert.ok(Math.hypot(prize.x - prize.px, prize.y - prize.py) < 0.3, 'at rest');
    }
    for (const a of scene.prizes) for (const b of scene.prizes) {
      if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > (a.r + b.r) - 1.5, 'no overlap');
    }
  }
});

test('holding "move" slides the claw right; releasing stops it for good; a play is used up', () => {
  const scene = createScene(seeded(1));
  holdMove(scene, true);
  assert.equal(scene.phase, 'moving');
  assert.equal(scene.playsLeft, PLAYS_PER_ROUND - 1);
  run(scene, 1, seeded(1), true);
  assert.ok(Math.abs(scene.claw.x - (HOME_X + 95)) < 3, `${scene.claw.x}`);
  holdMove(scene, false);
  assert.equal(scene.phase, 'aimed');
  holdMove(scene, true);
  run(scene, 1, seeded(1), true);
  assert.equal(scene.phase, 'aimed', 'a second press does not move it again');
  const far = createScene(seeded(1));
  holdMove(far, true); run(far, 10, seeded(1), true);
  assert.equal(far.claw.x, MAX_X);
});

test('the claw is solid: coming down it stops on the heap (not through it), and closing it never sinks into a prize beyond a soft squeeze', () => {
  const random = seeded(2);
  const scene = createScene(random);
  const target = topPrize(scene);
  aim(scene, target.x, random);
  let deepest = 0;
  for (let t = 0; t < 20 && scene.phase !== 'ready'; t += 1 / 60) {
    step(scene, 1 / 60, random, false);
    if (scene.phase === 'closing') assert.ok(scene.claw.y + CLAW_TIP < FLOOR_Y - 20, 'stopped on the heap, above the floor');
    for (const prize of scene.prizes) for (const piece of clawSegments(scene.claw)) deepest = Math.max(deepest, sunk(prize, piece));
  }
  assert.ok(deepest < 12, `sunk ${deepest.toFixed(1)}`); // the arms squeeze a soft prize up to about 9px, no further
});

test('a drop goes down, closes, rises and comes back over the chute; then the next play is ready', () => {
  const random = seeded(3);
  const scene = createScene(random);
  aim(scene, 200, random);
  const phases = new Set();
  for (let t = 0; t < 25 && scene.phase !== 'ready'; t += 1 / 60) { step(scene, 1 / 60, random, false); phases.add(scene.phase); }
  assert.deepEqual([...phases].filter(phase => phase !== 'ready'), ['dropping', 'closing', 'rising', 'returning', 'opening']);
  assert.deepEqual([scene.claw.x, scene.claw.y, scene.claw.open], [HOME_X, RAIL_Y, 1]);
});

test('dropped in the middle of the top prize, the fingers get under it: it is lifted, carried over the wall and won', () => {
  let wins = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const random = seeded(seed);
    const scene = createScene(random);
    const target = topPrize(scene);
    aim(scene, target.x, random);
    const events = run(scene, 25, random);
    if (events.some(event => event.type === 'grabbed') && events.some(event => event.type === 'won')) wins++;
  }
  assert.ok(wins >= 4, `${wins} of 6`);
});

test('dropped on the edge of a prize, a finger lands on top of it: nothing is lifted', () => {
  let lifted = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const random = seeded(seed);
    const scene = createScene(random);
    const target = topPrize(scene);
    aim(scene, target.x + target.r + 4, random); // the left arm comes down on its right side
    if (run(scene, 25, random).some(event => event.type === 'won')) lifted++;
  }
  assert.ok(lifted <= 2, `${lifted} of 6 won`);
});

test('"slipped" is only said when the prize the claw held really fell out of it; a bumped neighbour is not taken for it', () => {
  let slips = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const random = seeded(seed);
    const scene = createScene(random);
    for (let play = 0; play < 5 && scene.phase !== 'over'; play++) {
      const top = [...scene.prizes].sort((a, b) => a.y - b.y).slice(0, 6);
      const target = top[Math.floor(random() * top.length)];
      aim(scene, target.x + (random() * 2 - 1) * 12, random);
      for (let t = 0; t < 25 && scene.phase !== 'ready' && scene.phase !== 'over'; t += 1 / 60) {
        const held = scene.carried;
        const events = step(scene, 1 / 60, random, false);
        const slip = events.find(event => event.type === 'slipped');
        if (!slip || held === null) continue;
        slips++;
        // Half a second later the prize it held is below the fingertips (or gone into the chute), not in the claw.
        run(scene, 0.5, random);
        const prize = scene.prizes.find(candidate => candidate.id === held);
        assert.ok(!prize || prize.y > scene.claw.y + CLAW_TIP, `seed ${seed}: the prize is still in the claw`);
      }
    }
  }
  assert.ok(slips > 0, 'some plays slip, so the check was made');
});

test('over the chute there is nothing to catch: the claw comes up empty', () => {
  const random = seeded(5);
  const scene = createScene(random);
  drop(scene, random); // straight down at the start, above the chute
  const events = run(scene, 15, random);
  assert.ok(events.some(event => event.type === 'missed'));
  assert.ok(!events.some(event => event.type === 'won'));
});

test('five plays a round, then the round is over; a new round tops the pit up', () => {
  const random = seeded(7);
  const scene = createScene(random);
  let over = false;
  for (let play = 0; play < PLAYS_PER_ROUND; play++) {
    assert.equal(scene.phase, 'ready');
    drop(scene, random);
    over = run(scene, 15, random).some(event => event.type === 'roundOver');
  }
  assert.ok(over);
  assert.equal(scene.phase, 'over');
  holdMove(scene, true);
  assert.equal(scene.phase, 'over', 'no play without a new round');
  scene.prizes.splice(0, 5);
  newRound(scene, seeded(8));
  assert.equal(scene.phase, 'ready');
  assert.equal(scene.playsLeft, PLAYS_PER_ROUND);
  assert.equal(scene.prizes.length, 11);
});

test('every prize has its words in the three languages; two are rare', () => {
  assert.equal(PRIZE_KINDS.filter(kind => kind.rare).length, 2);
  for (const locale of ['ja', 'en', 'zh']) {
    const messages = JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')).App.craneGame;
    for (const kind of PRIZE_KINDS) assert.ok(messages.prizes[kind.id]?.trim(), `${locale} ${kind.id}`);
    for (const key of ['title', 'description', 'about', 'keywords', 'intro', 'move', 'drop', 'playsLeft', 'playsCount', 'thisRound', 'newRound', 'won', 'slipped', 'dropped', 'missed', 'roundOver', 'collection', 'shareText', 'canvasLabel']) assert.ok(messages[key]?.trim(), `${locale} ${key}`);
  }
});

test('the balance: aimed well (within 8px of a prize on top), about half the plays or more win; "so close" is the exception', () => {
  const random = seeded(11);
  let plays = 0, won = 0, late = 0;
  for (let round = 0; round < 12; round++) {
    const scene = createScene(random);
    for (let play = 0; play < 5; play++) {
      const top = [...scene.prizes].sort((a, b) => a.y - b.y).slice(0, 6);
      const target = top[Math.floor(random() * top.length)];
      aim(scene, target.x + (random() * 2 - 1) * 8, random);
      const events = run(scene, 25, random);
      plays++;
      if (events.some(event => event.type === 'won')) won++;
      else if (events.some(event => event.type === 'slipped' && event.late)) late++;
    }
  }
  assert.ok(won / plays > 0.4, `won ${won}/${plays}`);
  assert.ok(late / plays < 0.25, `so close ${late}/${plays}`);
});
