import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHUTE_RIGHT, createScene, drop, FLOOR_Y, grab, HOME_X, holdMove, MAX_X, newRound, PLAYS_PER_ROUND, PRIZE_KINDS, RAIL_Y, step, WIDTH } from './engine.ts';

// A seeded random, so that every run is the same.
const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
// Runs the machine for `seconds`, the "move" button held as given; returns every event.
const run = (scene, seconds, random, moving = false) => {
  const events = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...step(scene, 1 / 60, random, moving));
  return events;
};

test('the prizes settle in the pit: none overlaps another much, none is outside it or in the chute', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const scene = createScene(seeded(seed));
    run(scene, 2, seeded(seed));
    assert.ok(scene.prizes.length >= 9);
    for (const prize of scene.prizes) {
      assert.ok(prize.x >= CHUTE_RIGHT && prize.x <= WIDTH - prize.r + 0.5, `x ${prize.x}`);
      assert.ok(prize.y <= FLOOR_Y - prize.r + 0.5 && prize.y > 100, `y ${prize.y}`);
      assert.ok(Math.abs(prize.vx) < 20 && Math.abs(prize.vy) < 40, 'at rest');
    }
    for (const a of scene.prizes) for (const b of scene.prizes) {
      if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > (a.r + b.r) * 0.85, 'no deep overlap');
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
  holdMove(scene, true); // a second press does not move it again
  run(scene, 1, seeded(1), true);
  assert.equal(scene.phase, 'aimed');
  assert.ok(Math.abs(scene.claw.x - (HOME_X + 95)) < 3);
  // It never goes past the right end.
  const far = createScene(seeded(1));
  holdMove(far, true); run(far, 10, seeded(1), true);
  assert.equal(far.claw.x, MAX_X);
});

test('a drop goes down, closes, rises and comes back over the chute; then the next play is ready', () => {
  const scene = createScene(seeded(2));
  holdMove(scene, true); run(scene, 1.5, seeded(2), true); holdMove(scene, false);
  drop(scene);
  assert.equal(scene.phase, 'dropping');
  const phases = new Set();
  for (let t = 0; t < 20 && scene.phase !== 'ready'; t += 1 / 60) { step(scene, 1 / 60, seeded(2), false); phases.add(scene.phase); }
  assert.deepEqual([...phases].filter(phase => phase !== 'ready'), ['dropping', 'closing', 'rising', 'returning', 'opening']);
  assert.equal(scene.phase, 'ready');
  assert.equal(scene.claw.x, HOME_X);
  assert.equal(scene.claw.y, RAIL_Y);
  assert.equal(scene.claw.open, 1);
});

test('a prize caught in the middle with a good grip is carried over the wall into the chute and won', () => {
  const scene = createScene(seeded(3));
  const target = scene.prizes.reduce((a, b) => (a.y < b.y ? a : b)); // the top of the heap
  holdMove(scene, true);
  while (scene.claw.x < target.x - 0.5) step(scene, 1 / 120, seeded(3), true);
  holdMove(scene, false);
  scene.claw.x = target.x; // exactly above it
  drop(scene);
  const events = run(scene, 20, () => 0.99); // the best grip
  assert.ok(events.some(event => event.type === 'grabbed'), 'caught');
  assert.ok(!events.some(event => event.type === 'slipped'), 'kept');
  const won = events.filter(event => event.type === 'won');
  assert.equal(won.length, 1);
  assert.equal(won[0].kind, target.kind);
  assert.deepEqual(scene.won, [target.kind]);
  assert.ok(!scene.prizes.includes(target), 'gone from the pit');
});

test('a weak grip lets the prize slip on the way, and it falls back into the pit', () => {
  const scene = createScene(seeded(4));
  const target = scene.prizes.reduce((a, b) => (a.y < b.y ? a : b));
  holdMove(scene, true);
  while (scene.claw.x < target.x - 0.5) step(scene, 1 / 120, seeded(4), true);
  holdMove(scene, false);
  scene.claw.x = target.x + 12; // off-centre
  drop(scene);
  const events = run(scene, 20, () => 0.01); // the worst grip
  assert.ok(events.some(event => event.type === 'slipped') || events.some(event => event.type === 'missed'));
  assert.equal(events.filter(event => event.type === 'won').length, 0);
  assert.ok(target.x >= CHUTE_RIGHT, 'back in the pit');
});

test('nothing in reach: the claw comes up empty', () => {
  const scene = createScene(seeded(5));
  scene.claw.x = HOME_X;
  drop(scene); // straight down on the chute side
  const events = run(scene, 10, seeded(5));
  assert.ok(events.some(event => event.type === 'missed'));
  assert.equal(scene.held, null);
});

test('the grip: centred and lucky holds all the way; at the edge of reach and unlucky slips early', () => {
  const scene = createScene(seeded(6));
  const prize = scene.prizes[0];
  scene.prizes = [prize]; // only this one in reach
  scene.claw.x = prize.x; scene.claw.y = prize.y - prize.r - 34 + 4;
  assert.equal(grab(scene, () => 0.9).holdUntil, 1.5);
  scene.claw.x = prize.x + 20;
  assert.ok(grab(scene, () => 0).holdUntil < 0.2);
});

test('five plays a round, then the round is over; a new round tops the pit up', () => {
  const scene = createScene(seeded(7));
  let over = false;
  for (let play = 0; play < PLAYS_PER_ROUND; play++) {
    assert.equal(scene.phase, 'ready');
    drop(scene);
    over = run(scene, 15, seeded(7)).some(event => event.type === 'roundOver');
  }
  assert.ok(over);
  assert.equal(scene.phase, 'over');
  holdMove(scene, true);
  assert.equal(scene.phase, 'over', 'no play without a new round');
  scene.prizes.splice(0, 5);
  newRound(scene, seeded(8));
  assert.equal(scene.phase, 'ready');
  assert.equal(scene.playsLeft, PLAYS_PER_ROUND);
  assert.ok(scene.prizes.length >= 9);
});

test('every prize has its words in the three languages; two are rare', () => {
  assert.equal(PRIZE_KINDS.filter(kind => kind.rare).length, 2);
  for (const locale of ['ja', 'en', 'zh']) {
    const messages = JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')).App.craneGame;
    for (const kind of PRIZE_KINDS) assert.ok(messages.prizes[kind.id]?.trim(), `${locale} ${kind.id}`);
    for (const key of ['title', 'description', 'about', 'keywords', 'intro', 'move', 'drop', 'playsLeft', 'thisRound', 'newRound', 'won', 'slipped', 'missed', 'roundOver', 'collection', 'shareText', 'canvasLabel', 'back', 'mode2d', 'mode3d', 'modeLabel', 'loading3d', 'intro3d', 'hint3d', 'canvasLabel3d', 'noWebgl']) assert.ok(messages[key]?.trim(), `${locale} ${key}`);
  }
});
