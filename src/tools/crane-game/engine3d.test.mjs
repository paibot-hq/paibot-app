import test from 'node:test';
import assert from 'node:assert/strict';
import { CHUTE, createScene3, D, grab3, HOME, holdBack, holdRight, newRound3, step3, TOP_Y, W } from './engine3d.ts';
import { PLAYS_PER_ROUND } from './engine.ts';

const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const idle = { right: false, back: false };
const run = (scene, seconds, random, held = idle) => {
  const events = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...step3(scene, 1 / 60, random, held));
  return events;
};
// Aims the claw above (x, z): right, then back, which drops it.
const aim = (scene, x, z, random) => {
  holdRight(scene, true);
  while (scene.claw.x < x && scene.phase === 'movingX' && scene.claw.x < W - 31) step3(scene, 1 / 240, random, { right: true, back: false });
  holdRight(scene, false);
  holdBack(scene, true);
  while (scene.claw.z < z && scene.phase === 'movingZ' && scene.claw.z < D - 31) step3(scene, 1 / 240, random, { right: false, back: true });
  holdBack(scene, false);
};

test('3D: the prizes settle in the pit, out of the chute and inside the walls', () => {
  for (let seed = 1; seed <= 4; seed++) {
    const scene = createScene3(seeded(seed));
    run(scene, 2, seeded(seed));
    assert.ok(scene.prizes.length >= 15);
    for (const b of scene.prizes) {
      assert.ok(b.x >= b.r - 0.5 && b.x <= W - b.r + 0.5 && b.z >= b.r - 0.5 && b.z <= D - b.r + 0.5, 'inside');
      assert.ok(b.y >= b.r - 0.5, 'on the floor or on others');
      assert.ok(!(b.x < CHUTE && b.z < CHUTE && b.y < 80), 'not in the chute');
    }
  }
});

test('3D: right then back, each once; letting go of back drops the claw, which comes home', () => {
  const scene = createScene3(seeded(2));
  holdRight(scene, true);
  assert.equal(scene.phase, 'movingX');
  assert.equal(scene.playsLeft, PLAYS_PER_ROUND - 1);
  run(scene, 1, seeded(2), { right: true, back: false });
  holdRight(scene, false);
  const x = scene.claw.x;
  assert.ok(x > HOME.x + 80);
  holdRight(scene, true); run(scene, 0.5, seeded(2), { right: true, back: false });
  assert.equal(scene.claw.x, x, 'right only once');
  holdBack(scene, true);
  run(scene, 1, seeded(2), { right: false, back: true });
  assert.ok(scene.claw.z > HOME.z + 80);
  holdBack(scene, false);
  assert.equal(scene.phase, 'dropping');
  const phases = new Set();
  for (let t = 0; t < 20 && scene.phase !== 'ready'; t += 1 / 60) { step3(scene, 1 / 60, seeded(2), idle); phases.add(scene.phase); }
  assert.deepEqual([...phases].filter(p => p !== 'ready'), ['dropping', 'closing', 'rising', 'returning', 'opening']);
  assert.deepEqual([scene.claw.x, scene.claw.y, scene.claw.z], [HOME.x, TOP_Y, HOME.z]);
});

test('3D: a prize caught in the middle with a good grip is carried over the wall into the chute', () => {
  const scene = createScene3(seeded(3));
  const target = scene.prizes.reduce((a, b) => (a.y > b.y ? a : b)); // the top of the heap
  aim(scene, target.x, target.z, seeded(3));
  scene.claw.x = target.x; scene.claw.z = target.z; // exactly above it
  const events = run(scene, 20, () => 0.99);
  assert.ok(events.some(e => e.type === 'grabbed'));
  assert.deepEqual(events.filter(e => e.type === 'won').map(e => e.kind), [target.kind]);
  assert.ok(!scene.prizes.includes(target));
});

test('3D: off-centre with a weak grip, it slips back into the pit; nothing under the claw, nothing caught', () => {
  const scene = createScene3(seeded(4));
  const target = scene.prizes.reduce((a, b) => (a.y > b.y ? a : b));
  aim(scene, target.x, target.z, seeded(4));
  scene.claw.x = target.x + 15;
  const events = run(scene, 20, () => 0.01);
  assert.equal(events.filter(e => e.type === 'won').length, 0);
  assert.ok(events.some(e => e.type === 'slipped' || e.type === 'missed'));
  const empty = createScene3(seeded(5));
  holdBack(empty, true); holdBack(empty, false); // straight down above the chute
  assert.ok(run(empty, 12, seeded(5)).some(e => e.type === 'missed'));
  assert.ok(grab3(empty, () => 0.5).prize === null);
});

test('3D: five plays a round, then over; a new round tops the pit up', () => {
  const scene = createScene3(seeded(6));
  for (let play = 0; play < PLAYS_PER_ROUND; play++) {
    assert.equal(scene.phase, 'ready');
    holdBack(scene, true); holdBack(scene, false);
    run(scene, 15, seeded(6));
  }
  assert.equal(scene.phase, 'over');
  holdRight(scene, true);
  assert.equal(scene.phase, 'over');
  scene.prizes.splice(0, 6);
  newRound3(scene, seeded(7));
  assert.equal(scene.phase, 'ready');
  assert.ok(scene.prizes.length >= 15);
});
