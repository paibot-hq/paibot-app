import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIAMETER_M, HORIZON, KINDS, MAX_SMOKE, MAX_SPARKS, SHOW_LENGTH, SIZES, createScene, finale, fountain, launch, pickColor, showSchedule, soundDelay, starmine, step } from './engine.ts';

// A small seeded generator, so the tests are repeatable.
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// Runs a scene until the first burst; returns the events of that step.
function untilBurst(scene, rng) {
  for (let i = 0; i < 400; i++) { const events = step(scene, 0.05, rng); if (events.length) return events; }
  throw new Error('no burst');
}

test('a shell rises to where it was aimed, bursts once, and everything dies out', () => {
  const rng = seeded(1);
  const scene = createScene(800, 500);
  launch(scene, rng, 400, 160, { kind: 'peony', size: 5 });
  assert.equal(scene.shells.length, 1);
  assert.equal(scene.launched, 1);
  const events = untilBurst(scene, rng);
  assert.equal(events.length, 1);
  assert.equal(scene.shells.length, 0);
  assert.ok(Math.abs(events[0].y - 160) < 30, 'bursts near the aimed height');
  assert.ok(scene.sparks.length >= 100, 'dozens of stars');
  assert.ok(scene.flashes.length === 1 && scene.smoke.length >= 1, 'a flash and smoke');
  for (let i = 0; i < 400; i++) step(scene, 0.05, rng);
  assert.equal(scene.sparks.length + scene.smoke.length + scene.flashes.length, 0);
});

test('every kind of burst makes stars at every size, and none of the numbers go wrong', () => {
  for (const kind of KINDS) for (const size of SIZES) {
    const rng = seeded(7);
    const scene = createScene(600, 400);
    launch(scene, rng, 300, 140, { kind, size });
    untilBurst(scene, rng);
    for (let i = 0; i < 14; i++) step(scene, 0.05, rng);
    assert.ok(scene.sparks.length > 0, `${kind} ${size}`);
    for (const spark of scene.sparks) for (const value of [spark.x, spark.y, spark.vx, spark.vy, spark.life, ...spark.history]) assert.ok(Number.isFinite(value), `${kind} ${size}: finite`);
  }
});

test('a bigger shell opens wider, and rises for longer', () => {
  const reach = size => {
    const rng = seeded(3);
    const scene = createScene(800, 600);
    const shell = launch(scene, rng, 400, 280, { kind: 'peony', size });
    const rise = (shell.y - shell.targetY) / -shell.vy;
    untilBurst(scene, rng);
    for (let i = 0; i < 30; i++) step(scene, 0.05, rng);
    const cx = scene.sparks.reduce((sum, spark) => sum + spark.x, 0) / scene.sparks.length;
    return { rise, width: Math.max(...scene.sparks.map(spark => Math.abs(spark.x - cx))) };
  };
  const small = reach(3), big = reach(10);
  assert.ok(big.width > small.width * 1.5, `a 10-go burst is wider (${small.width.toFixed(0)} vs ${big.width.toFixed(0)})`);
  assert.ok(big.rise > small.rise, 'and takes longer to rise');
  assert.ok(DIAMETER_M[10] > DIAMETER_M[3]);
});

test('a willow is gold by default and keeps a long trail; a chosen colour is kept', () => {
  const rng = seeded(3);
  const willow = createScene(800, 500);
  launch(willow, rng, 400, 170, { kind: 'willow', size: 5 });
  untilBurst(willow, rng);
  for (let i = 0; i < 20; i++) step(willow, 0.05, rng);
  const stars = willow.sparks.filter(spark => spark.maxLife > 2);
  assert.ok(stars.length > 40 && stars.every(spark => Math.abs(spark.hue - 44) < 12));
  assert.ok(stars.every(spark => spark.trail >= 10 && spark.history.length > 0));
  const blue = createScene(800, 500);
  launch(blue, rng, 400, 170, { kind: 'willow', size: 5, palette: 'blue' });
  untilBurst(blue, rng);
  assert.ok(blue.sparks.filter(spark => spark.maxLife > 2).every(spark => Math.abs(spark.hue - 212) < 12));
  assert.deepEqual(pickColor(seeded(1), 'white'), { hue: 210, sat: 0 });
});

test('shapes keep their shape: a heart is symmetric, a star has five points, a ring keeps one speed', () => {
  const stars = kind => {
    const rng = seeded(5);
    const scene = createScene(800, 500);
    launch(scene, rng, 400, 190, { kind, size: 8 });
    untilBurst(scene, rng);
    return scene.sparks.filter(spark => spark.maxLife > 1.5);
  };
  const heart = stars('heart');
  assert.ok(Math.abs(heart.reduce((sum, spark) => sum + spark.vx, 0)) < heart.length * 3, 'a heart is symmetric left and right');
  assert.ok(heart.reduce((sum, spark) => sum + spark.vy, 0) !== 0);
  const star = stars('star');
  const angles = star.map(spark => Math.atan2(spark.vy, spark.vx));
  const outer = star.filter(spark => Math.hypot(spark.vx, spark.vy) > 0.85 * Math.max(...star.map(s => Math.hypot(s.vx, s.vy))));
  assert.ok(outer.length >= 5 && angles.length === star.length, 'a star has points that go farthest');
  const ring = stars('ring');
  const speeds = ring.map(spark => Math.hypot(spark.vx, spark.vy));
  assert.ok(Math.max(...speeds) / Math.min(...speeds) < 1.15, 'a ring keeps one speed all round');
});

test('a core burst has two colours', () => {
  const rng = seeded(9);
  const scene = createScene(800, 500);
  launch(scene, rng, 400, 190, { kind: 'core', size: 8, palette: 'blue' });
  untilBurst(scene, rng);
  const hues = new Set(scene.sparks.filter(spark => spark.maxLife > 1.5).map(spark => Math.round(spark.hue / 60)));
  assert.ok(hues.size >= 2);
});

test('the wind carries the stars and the smoke', () => {
  const drift = wind => {
    const rng = seeded(4);
    const scene = createScene(800, 500);
    scene.wind = wind;
    launch(scene, rng, 400, 170, { kind: 'peony', size: 5 });
    untilBurst(scene, rng);
    for (let i = 0; i < 25; i++) step(scene, 0.05, rng);
    return { smoke: scene.smoke.reduce((sum, puff) => sum + puff.vx, 0) / Math.max(1, scene.smoke.length), spark: scene.sparks.reduce((sum, spark) => sum + spark.vx, 0) };
  };
  const calm = drift(0), right = drift(1), left = drift(-1);
  assert.ok(right.smoke > calm.smoke && left.smoke < calm.smoke);
  assert.ok(right.spark > left.spark);
});

test('the numbers of stars and smoke are capped, and a calm scene throws less', () => {
  const rng = seeded(11);
  const busy = createScene(800, 500);
  for (let i = 0; i < 80; i++) launch(busy, rng, 100 + (i % 10) * 60, 190, { kind: 'chrysanthemum', size: 10 });
  for (let i = 0; i < 60; i++) step(busy, 0.05, rng);
  assert.ok(busy.sparks.length <= MAX_SPARKS && busy.smoke.length <= MAX_SMOKE);
  const normal = createScene(800, 500), calm = createScene(800, 500, true);
  launch(normal, seeded(5), 400, 170, { kind: 'peony' });
  launch(calm, seeded(5), 400, 170, { kind: 'peony' });
  untilBurst(normal, seeded(9)); untilBurst(calm, seeded(9));
  assert.ok(calm.sparks.length < normal.sparks.length && calm.smoke.length === 0);
});

test('a Niagara falls for its time and then stops', () => {
  const rng = seeded(2);
  const scene = createScene(800, 500);
  fountain(scene, 600, 200, 200, 2);
  for (let i = 0; i < 20; i++) step(scene, 0.05, rng);
  assert.equal(scene.fountains.length, 1);
  assert.ok(scene.sparks.length > 150);
  assert.ok(scene.sparks.every(spark => spark.x >= 190 && spark.x <= 610));
  for (let i = 0; i < 30; i++) step(scene, 0.05, rng);
  assert.equal(scene.fountains.length, 0);
  for (let i = 0; i < 100; i++) step(scene, 0.05, rng);
  assert.equal(scene.sparks.length, 0);
});

test('a long pause does not throw the stars across the sky', () => {
  const rng = seeded(2);
  const scene = createScene(800, 500);
  launch(scene, rng, 400, 170, { kind: 'peony' });
  untilBurst(scene, rng);
  for (let i = 0; i < 6; i++) step(scene, 0.05, rng);
  const before = new Map(scene.sparks.map(spark => [spark, spark.x]));
  step(scene, 30, rng);
  const moved = scene.sparks.filter(spark => before.has(spark)).map(spark => Math.abs(spark.x - before.get(spark)));
  assert.ok(moved.length > 20 && Math.max(...moved) < 25, 'one step is at most a twentieth of a second');
});

test('stars that fall below the water line are gone', () => {
  const rng = seeded(6);
  const scene = createScene(800, 500);
  launch(scene, rng, 400, 300, { kind: 'willow', size: 10 });
  untilBurst(scene, rng);
  for (let i = 0; i < 120; i++) { step(scene, 0.05, rng); assert.ok(scene.sparks.every(spark => spark.y <= scene.height * HORIZON + 6)); }
});

test('sound takes time to arrive: 340 m a second', () => {
  assert.ok(Math.abs(soundDelay(340) - 1) < 1e-9);
  assert.ok(soundDelay(1020) > soundDelay(340));
});

test('the festival is in time order, builds up, has a Niagara and a finale, and is the same for the same seed', () => {
  const show = showSchedule(seeded(4), 800, 500);
  assert.ok(show.every((item, index) => index === 0 || item.at >= show[index - 1].at));
  assert.ok(show.at(-1).at <= SHOW_LENGTH);
  assert.equal(show.filter(item => item.type === 'fountain').length, 1);
  for (const item of show) if (item.type === 'shell') assert.ok(item.x >= 0 && item.x <= 800 && item.y >= 0 && item.y <= 500 && KINDS.includes(item.kind) && SIZES.includes(item.size));
  const shells = show.filter(item => item.type === 'shell');
  const rate = (from, to) => shells.filter(item => item.at >= from && item.at < to).length / (to - from);
  assert.ok(rate(46, 54) > rate(0, 12) * 4, 'the finale is far denser than the opening');
  assert.ok(shells.some(item => item.size === 10), 'there are big shells');
  assert.deepEqual(showSchedule(seeded(4), 800, 500), show);
});

test('a starmine is rapid fire of small shells; a finale ends with big ones', () => {
  const mine = starmine(seeded(2), 800, 500, 5, 6);
  assert.ok(mine.length > 18 && mine.every(item => item.type === 'shell' && item.size === 3 && item.at >= 5 && item.at < 11.2));
  const last = finale(seeded(2), 800, 500, 0).filter(item => item.size === 10);
  assert.equal(last.length, 3);
});
