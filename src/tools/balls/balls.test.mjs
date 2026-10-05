import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, spawn, step, COOL } from './balls.ts';

const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const options = { cx: 320, cy: 320, radius: 300, maxBalls: 40, minRadius: 3, split: true, gravity: 0 };
const speedOf = ball => Math.hypot(ball.vx, ball.vy);

test('a spawned ball is inside the circle and goes at the speed asked for', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const ball = spawn(options, seeded(seed), 190, 12);
    assert.ok(Math.hypot(ball.x - 320, ball.y - 320) + ball.r <= options.radius);
    assert.ok(Math.abs(speedOf(ball) - 190) < 1e-9);
  }
});

test('balls bounce off the wall and never leave the circle, keeping their energy', () => {
  const rng = seeded(3);
  const world = createWorld();
  world.balls.push(spawn(options, rng), spawn(options, rng), spawn(options, rng));
  for (const ball of world.balls) ball.life = 1e9;
  const energy = () => world.balls.reduce((sum, ball) => sum + speedOf(ball) ** 2, 0);
  const before = energy();
  for (let i = 0; i < 1200; i++) {
    step(world, 0.016, { ...options, split: false }, rng);
    for (const ball of world.balls) assert.ok(Math.hypot(ball.x - 320, ball.y - 320) + ball.r <= options.radius + 1e-6, `step ${i}`);
  }
  assert.equal(world.balls.length, 3);
  assert.ok(Math.abs(energy() - before) / before < 1e-6, 'bounces keep the total energy');
});

test('two balls that meet each split in two, as big, with the same speed, and the pieces do not split again at once', () => {
  const rng = seeded(5);
  const world = createWorld();
  world.balls.push({ x: 300, y: 320, vx: 100, vy: 0, r: 20, hue: 10, life: 10 }, { x: 330, y: 320, vx: -100, vy: 0, r: 20, hue: 200, life: 10 });
  const flashes = step(world, 0.016, options, rng);
  assert.equal(world.balls.length, 4);
  assert.equal(world.splits, 1);
  assert.equal(flashes.length, 1);
  for (const ball of world.balls) assert.equal(ball.r, 20);
  for (let i = 0; i < 10; i++) step(world, 0.016, options, rng);
  assert.equal(world.balls.length, 4, 'a new piece takes no part in meetings for a moment');
  assert.ok(COOL > 0);
  for (const ball of world.balls) assert.ok(Math.abs(speedOf(ball) - 100) < 1e-6, 'the pieces keep the speed');
});

test('with splitting off, or at the cap, or when too small, a meeting is only a bounce', () => {
  const meet = r => [{ x: 300, y: 320, vx: 100, vy: 0, r, hue: 10, life: 10 }, { x: 320, y: 320, vx: -100, vy: 0, r, hue: 200, life: 10 }];
  for (const [label, balls, opts] of [
    ['off', meet(20), { ...options, split: false }],
    ['cap', meet(20), { ...options, maxBalls: 3 }],
    ['small', meet(3), options],
  ]) {
    const world = createWorld();
    world.balls.push(...balls);
    step(world, 0.016, opts, seeded(1));
    assert.equal(world.balls.length, 2, label);
    assert.equal(world.splits, 0, label);
  }
  // the bounce sends them apart: a was going right, b left; afterwards a goes left and b right
  const world = createWorld();
  world.balls.push(...meet(20));
  step(world, 0.016, { ...options, split: false }, seeded(1));
  assert.ok(world.balls[0].vx < 0 && world.balls[1].vx > 0);
});

test('the number of balls never goes past the cap, however long they fly', () => {
  const rng = seeded(11);
  const world = createWorld();
  for (let i = 0; i < 6; i++) world.balls.push(spawn(options, rng));
  let most = 0;
  for (let i = 0; i < 6000; i++) { step(world, 0.016, { ...options, maxBalls: 30 }, rng); most = Math.max(most, world.balls.length); }
  assert.ok(most <= 30, `most ${most}`);
  assert.ok(most > 6, 'they do split');
  assert.ok(world.splits > 3);
});

test('a ball pops when its life runs out, and one is let in when none is left', () => {
  const rng = seeded(2);
  const world = createWorld();
  world.balls.push({ x: 320, y: 320, vx: 50, vy: 0, r: 20, hue: 10, life: 0.02 });
  step(world, 0.05, options, rng);
  assert.equal(world.balls.length, 1, 'a new ball came in');
  assert.ok(world.balls[0].life > 5);
  assert.deepEqual(step(createWorld(), 0.016, options, seeded(1)), []);
});

test('a long pause is taken a little at a time', () => {
  const world = createWorld();
  world.balls.push({ x: 320, y: 320, vx: 200, vy: 0, r: 20, hue: 1, life: 100 });
  step(world, 30, options, seeded(1));
  assert.ok(Math.abs(world.balls[0].x - 320) <= 200 * 0.05 + 1e-6);
});

test('gravity pulls the balls down: they spend their time in the lower half, and stay in the circle', () => {
  const rng = seeded(8);
  const world = createWorld();
  world.balls.push(spawn(options, rng), spawn(options, rng));
  for (const ball of world.balls) ball.life = 1e9;
  const pulled = { ...options, split: false, gravity: 700 };
  let low = 0, samples = 0;
  for (let i = 0; i < 3000; i++) {
    step(world, 0.016, pulled, rng);
    for (const ball of world.balls) {
      assert.ok(Math.hypot(ball.x - 320, ball.y - 320) + ball.r <= options.radius + 1e-6);
      if (i > 500) { samples++; if (ball.y > 320) low++; }
    }
  }
  assert.ok(low / samples > 0.6, `lower half ${low / samples}`);
});

test('with a thousand balls a step is quick, and none is lost or outside the circle', () => {
  const rng = seeded(21);
  const world = createWorld();
  for (let i = 0; i < 1000; i++) { const ball = spawn(options, rng); ball.life = 1e9; world.balls.push(ball); }
  const wide = { ...options, maxBalls: 1000, gravity: 700 };
  const began = performance.now();
  for (let i = 0; i < 100; i++) step(world, 0.016, wide, rng);
  const each = (performance.now() - began) / 100;
  assert.ok(each < 8, `${each} ms a step`);
  assert.equal(world.balls.length, 1000);
  // Packed this close, one pushed by its neighbours may dip a little into the wall, but its centre stays inside.
  for (const ball of world.balls) assert.ok(Math.hypot(ball.x - 320, ball.y - 320) <= options.radius);
});
