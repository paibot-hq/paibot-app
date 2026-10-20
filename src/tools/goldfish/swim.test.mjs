import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRT_PER_FISH_SECOND, FLOOR_Y, GASPING_DIRT, KINDS, LEFTOVER_DIRT, MAX_FISH, MAX_FOOD, SURFACE_R, WATER_Y, addFish, changeWater, clampToWater, createWorld, distance, dropFood, fouling, inWater, random, removeFish, startle, step } from './swim.ts';

const DT = 1 / 60;
const run = (world, seconds, next) => { for (let i = 0; i < seconds / DT; i++) step(world, DT, next); };
const bowl = (count, seed = 1) => {
  const next = random(seed);
  const world = createWorld();
  for (let i = 0; i < count; i++) addFish(world, KINDS[i % KINDS.length], next);
  return { world, next };
};

test('the fish never leave the water: not through the glass, above the surface or into the gravel', () => {
  for (const seed of [1, 2, 3]) {
    const { world, next } = bowl(MAX_FISH, seed);
    for (let i = 0; i < 60 * 120; i++) {
      // Now and then a tap, a pinch of food, or a hard push outwards, to try to break them out.
      if (i % 400 === 0) startle(world, { x: next() - 0.5, y: 0, z: next() - 0.5 });
      if (i % 700 === 0) dropFood(world, next() - 0.5, next() - 0.5, 5, next);
      if (i % 900 === 0) for (const fish of world.fish) fish.vel = { x: (next() - 0.5) * 4, y: (next() - 0.5) * 4, z: (next() - 0.5) * 4 };
      step(world, DT, next);
      for (const fish of world.fish) assert.ok(inWater(fish.pos, 0.1), `seed ${seed}, step ${i}: ${JSON.stringify(fish.pos)}`);
    }
  }
});

test('hungry fish find the food and eat it', () => {
  const { world, next } = bowl(3, 4);
  dropFood(world, 0.1, -0.1, 4, next);
  assert.equal(world.food.length, 4);
  run(world, 40, next);
  assert.ok(world.eaten >= 3, `eaten ${world.eaten}`);
  assert.equal(world.eaten, world.fish.reduce((sum, fish) => sum + fish.eaten, 0));
});

test('a full fish leaves the food, which sinks to the gravel and is gone after a while', () => {
  const { world, next } = bowl(1, 5);
  world.fish[0].hunger = 0;
  dropFood(world, 0, 0, 1, next);
  run(world, 1, next);
  assert.ok(Math.abs(world.food[0].pos.y - WATER_Y) < 1e-9, 'it floats a moment');
  run(world, 25, next);
  assert.equal(world.eaten, 0);
  assert.ok(Math.abs(world.food[0].pos.y - (FLOOR_Y + 0.015)) < 1e-9, 'on the gravel');
  run(world, 61, next);
  // By now hungry again (hunger grows), it may have eaten it; either way the pellet is gone.
  assert.equal(world.food.length, 0);
});

test('food is dropped inside the water circle, a few pellets at a time, up to a limit', () => {
  const { world, next } = bowl(0, 6);
  const added = dropFood(world, 5, 5, 3, next);
  assert.equal(added.length, 3);
  for (const food of added) {
    assert.ok(Math.hypot(food.pos.x, food.pos.z) < SURFACE_R, 'inside the circle');
    assert.equal(food.pos.y, WATER_Y);
  }
  for (let i = 0; i < 40; i++) dropFood(world, 0, 0, 3, next);
  assert.equal(world.food.length, MAX_FOOD);
});

test('a tap on the glass sends the nearby fish away from it, fast', () => {
  const { world, next } = bowl(4, 7);
  run(world, 3, next);
  const tap = { x: 0.9, y: -0.1, z: 0 };
  const before = world.fish.map(fish => distance(fish.pos, tap));
  assert.ok(startle(world, tap) > 0);
  run(world, 0.6, next);
  const after = world.fish.map(fish => distance(fish.pos, tap));
  const away = after.filter((d, i) => d > before[i] - 0.02).length;
  assert.ok(away >= 3, `${away} of 4 moved away (${before.map(d => d.toFixed(2))} -> ${after.map(d => d.toFixed(2))})`);
  assert.ok(world.fish.some(fish => Math.hypot(fish.vel.x, fish.vel.y, fish.vel.z) > 0.4), 'darting');
  run(world, 4, next);
  assert.ok(world.fish.every(fish => fish.fleeing <= 0), 'and calm again');
});

test('the fish keep some room from each other', () => {
  const { world, next } = bowl(MAX_FISH, 8);
  let close = 0, pairs = 0;
  for (let i = 0; i < 60 * 30; i++) {
    step(world, DT, next);
    if (i % 30) continue;
    for (let a = 0; a < world.fish.length; a++) for (let b = a + 1; b < world.fish.length; b++) {
      pairs++;
      if (distance(world.fish[a].pos, world.fish[b].pos) < (world.fish[a].size + world.fish[b].size) * 0.3) close++;
    }
  }
  assert.ok(close / pairs < 0.01, `${close} of ${pairs} pairs overlapping`);
});

test('the fish keep swimming: they go round the bowl rather than stopping', () => {
  const { world, next } = bowl(3, 9);
  const start = world.fish.map(fish => ({ ...fish.pos }));
  let travelled = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const before = world.fish.map(fish => ({ ...fish.pos }));
    step(world, DT, next);
    world.fish.forEach((fish, k) => { travelled += distance(fish.pos, before[k]); });
  }
  assert.ok(travelled / 3 > 1.5, `${(travelled / 3).toFixed(2)} radii each in 20 s`);
  assert.ok(world.fish.some((fish, k) => distance(fish.pos, start[k]) > 0.2));
});

test('at most MAX_FISH fish; removing takes the last one added', () => {
  const { world, next } = bowl(MAX_FISH, 10);
  assert.equal(addFish(world, 'wakin', next), null);
  const last = world.fish[world.fish.length - 1];
  assert.equal(removeFish(world), last);
  assert.equal(world.fish.length, MAX_FISH - 1);
  const empty = createWorld();
  assert.equal(removeFish(empty), null);
});

test('clamping brings any point into the water', () => {
  const next = random(11);
  for (let i = 0; i < 2000; i++) {
    const p = { x: (next() - 0.5) * 6, y: (next() - 0.5) * 6, z: (next() - 0.5) * 6 };
    assert.ok(inWater(clampToWater(p), 0.1 - 1e-9), JSON.stringify(p));
  }
});

test('the same seed gives the same bowl', () => {
  const play = seed => { const { world, next } = bowl(4, seed); dropFood(world, 0, 0, 4, next); run(world, 10, next); return JSON.stringify(world.fish.map(f => [f.pos, f.eaten])); };
  assert.equal(play(12), play(12));
  assert.notEqual(play(12), play(13));
});

test('now and then a fish goes down to peck at the gravel, and drifts slowly at other times', () => {
  const { world, next } = bowl(4, 14);
  let pecked = 0, slow = 0, samples = 0;
  for (let i = 0; i < 60 * 180; i++) {
    step(world, DT, next);
    if (i % 30) continue;
    for (const fish of world.fish) {
      samples++;
      if (fish.pecking > 0) { pecked++; assert.ok(fish.pos.y < FLOOR_Y + 0.25, `pecking near the gravel: ${fish.pos.y}`); }
      if (Math.hypot(fish.vel.x, fish.vel.y, fish.vel.z) < 0.06) slow++;
    }
  }
  assert.ok(pecked / samples > 0.02 && pecked / samples < 0.4, `pecking ${pecked}/${samples}`);
  assert.ok(slow / samples > 0.05, `slow ${slow}/${samples}`);
});

test('the water fouls with time, faster with more fish, and with food left to rot; changing it makes it fresh', () => {
  const one = bowl(1, 20), three = bowl(3, 20);
  for (const b of [one, three]) for (const fish of b.world.fish) fish.hunger = 0;
  run(one.world, 60, one.next);
  run(three.world, 60, three.next);
  assert.ok(Math.abs(one.world.dirt - 60 * DIRT_PER_FISH_SECOND) < 1e-6, `${one.world.dirt}`);
  assert.ok(Math.abs(three.world.dirt - 3 * one.world.dirt) < 1e-6, 'three times as fast with three fish');
  // A pellet nobody eats lies on the gravel, rots and fouls the water.
  const { world, next } = bowl(0, 21);
  dropFood(world, 0, 0, 1, next);
  run(world, 100, next);
  assert.equal(world.food.length, 0);
  assert.ok(Math.abs(world.dirt - LEFTOVER_DIRT) < 1e-9, `${world.dirt}`);
  changeWater(world);
  assert.equal(world.dirt, 0);
  assert.equal(fouling(3, 3600), 3600 * 3 * DIRT_PER_FISH_SECOND);
  assert.equal(fouling(3, -5), 0);
  assert.equal(createWorld(5).dirt, 1, 'never above fully fouled');
});

test('in foul water the fish come up to gulp at the surface', () => {
  const nearSurface = dirt => {
    const next = random(22);
    const world = createWorld(dirt);
    for (let i = 0; i < 4; i++) addFish(world, KINDS[i % 3], next);
    for (const fish of world.fish) fish.hunger = 0;
    let near = 0, samples = 0;
    for (let i = 0; i < 60 * 120; i++) {
      step(world, DT, next);
      world.dirt = dirt;
      if (i % 30) continue;
      for (const fish of world.fish) { samples++; if (fish.pos.y > WATER_Y - 0.25) near++; }
    }
    return near / samples;
  };
  const clean = nearSurface(0), foul = nearSurface(GASPING_DIRT + 0.2);
  assert.ok(foul > clean * 2 && foul > 0.5, `near the surface: ${clean.toFixed(2)} clean, ${foul.toFixed(2)} foul`);
});
