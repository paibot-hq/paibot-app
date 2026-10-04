import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BURSTS, MAX_SPARKS, SHOW_LENGTH, createScene, launch, pickBurst, showSchedule, step } from './engine.ts';

// A small seeded generator, so the tests are repeatable.
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

test('a rocket rises to where it was aimed, bursts once, and the sparks all die out', () => {
  const rng = seeded(1);
  const scene = createScene(800, 500);
  launch(scene, rng, 400, 150, 'peony');
  assert.equal(scene.rockets.length, 1);
  assert.equal(scene.launched, 1);
  const events = [];
  let sparks = 0;
  for (let i = 0; i < 40; i++) { events.push(...step(scene, 0.05, rng)); sparks = Math.max(sparks, scene.sparks.length); }
  assert.equal(events.length, 1);
  assert.equal(scene.rockets.length, 0);
  assert.ok(Math.abs(events[0].y - 150) < 20, 'bursts near the aimed height');
  assert.ok(sparks >= 80, 'a peony throws dozens of sparks');
  for (let i = 0; i < 100; i++) step(scene, 0.05, rng);
  assert.equal(scene.sparks.length, 0);
});

test('every kind of burst makes sparks, and none of the numbers go wrong', () => {
  for (const burst of BURSTS) {
    const rng = seeded(7);
    const scene = createScene(600, 400);
    launch(scene, rng, 300, 120, burst);
    for (let i = 0; i < 25; i++) step(scene, 0.05, rng);
    assert.ok(scene.sparks.length > 0, burst);
    for (const spark of scene.sparks) for (const value of [spark.x, spark.y, spark.vx, spark.vy, spark.life]) assert.ok(Number.isFinite(value), `${burst}: finite`);
  }
});

test('a willow is gold and sinks, a ring is evenly spread', () => {
  const rng = seeded(3);
  const willow = createScene(800, 500);
  launch(willow, rng, 400, 140, 'willow');
  for (let i = 0; i < 20; i++) step(willow, 0.05, rng);
  assert.ok(willow.sparks.every(spark => Math.abs(spark.hue - 42) <= 8));
  const ring = createScene(800, 500);
  launch(ring, rng, 400, 140, 'ring');
  // Right after the burst, before gravity has bent the ring.
  while (!step(ring, 0.05, rng).length);
  const speeds = ring.sparks.map(spark => Math.hypot(spark.vx, spark.vy));
  assert.ok(Math.max(...speeds) / Math.min(...speeds) < 1.3, 'a ring keeps one speed all round');
});

test('the number of sparks is capped, and a calm scene throws fewer', () => {
  const rng = seeded(11);
  const busy = createScene(800, 500);
  for (let i = 0; i < 60; i++) launch(busy, rng, 100 + (i % 10) * 60, 150, 'chrysanthemum');
  for (let i = 0; i < 30; i++) step(busy, 0.05, rng);
  assert.ok(busy.sparks.length <= MAX_SPARKS);
  const normal = createScene(800, 500);
  const calm = createScene(800, 500, true);
  launch(normal, seeded(5), 400, 150, 'peony');
  launch(calm, seeded(5), 400, 150, 'peony');
  for (let i = 0; i < 20; i++) { step(normal, 0.05, seeded(9)); step(calm, 0.05, seeded(9)); }
  assert.ok(calm.sparks.length < normal.sparks.length);
});

test('a long pause does not throw the sparks across the sky', () => {
  const rng = seeded(2);
  const scene = createScene(800, 500);
  launch(scene, rng, 400, 150, 'peony');
  for (let i = 0; i < 12; i++) step(scene, 0.05, rng);
  const before = scene.sparks.map(spark => spark.x);
  step(scene, 30, rng);
  const moved = scene.sparks.map((spark, index) => Math.abs(spark.x - before[index])).filter(Number.isFinite);
  assert.ok(Math.max(0, ...moved) < 20, 'one step is at most a twentieth of a second');
});

test('the show is in time order, gathers speed, ends with a finale, and is the same for the same seed', () => {
  const show = showSchedule(seeded(4), 800, 500);
  assert.ok(show.every((shot, index) => index === 0 || shot.at >= show[index - 1].at));
  assert.ok(show.every(shot => shot.x >= 0 && shot.x <= 800 && shot.y >= 0 && shot.y <= 500));
  assert.ok(show.at(-1).at <= SHOW_LENGTH);
  const early = show.filter(shot => shot.at < 14).length;
  const finale = show.filter(shot => shot.at >= 34).length;
  assert.ok(finale >= 12 && finale / 4 > early / 14, 'the finale is denser than the start');
  assert.deepEqual(showSchedule(seeded(4), 800, 500), show);
  assert.ok(BURSTS.includes(pickBurst(seeded(8))));
});
