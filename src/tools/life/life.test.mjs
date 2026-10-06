import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, step, count, place, fill, index, PATTERNS, PATTERN_NAMES, patternSize, toggle } from './life.ts';

const shape = life => { const out = []; for (let y = 0; y < life.height; y++) for (let x = 0; x < life.width; x++) if (life.cells[index(life, x, y)] > 0) out.push(`${x},${y}`); return out.sort().join(' '); };
const run = (life, n) => { for (let i = 0; i < n; i++) life = step(life); return life; };

test('a lone cell dies, a block stays, a blinker turns every generation', () => {
  assert.equal(count(step(place(create(10, 10), ['O'], 4, 4))), 0);
  const block = place(create(10, 10), ['OO', 'OO'], 3, 3);
  assert.equal(shape(step(block)), shape(block));
  const blinker = place(create(10, 10), PATTERNS.blinker, 3, 4);
  assert.notEqual(shape(step(blinker)), shape(blinker));
  assert.equal(shape(run(blinker, 2)), shape(blinker));
  assert.equal(count(step(blinker)), 3);
});

test('births need exactly three neighbours; four or more kill', () => {
  const l = place(create(9, 9), ['OOO'], 3, 3);
  assert.ok(step(l).cells[index(l, 4, 2)] > 0 && step(l).cells[index(l, 4, 4)] > 0, 'born above and below the middle');
  const plus = place(create(9, 9), ['.O.', 'OOO', '.O.'], 3, 3);
  assert.equal(step(plus).cells[index(plus, 4, 4)], 0, 'the middle has four neighbours and dies');
});

test('every pattern does what it is known for', () => {
  const size = 40;
  const glider = place(create(size, size), PATTERNS.glider, 5, 5);
  const moved = place(create(size, size), PATTERNS.glider, 6, 6);
  assert.equal(shape(run(glider, 4)), shape(moved), 'a glider moves one cell down and right every 4 generations');
  for (const [name, period] of [['blinker', 2], ['toad', 2], ['beacon', 2], ['pulsar', 3], ['lwss', 4]]) {
    const start = place(create(size, size), PATTERNS[name], 10, 10);
    if (name === 'lwss') assert.equal(shape(run(start, 4)), shape(place(create(size, size), PATTERNS[name], 8, 10)), 'lwss moves two cells left in 4');
    else { assert.equal(shape(run(start, period)), shape(start), `${name} has period ${period}`); assert.notEqual(shape(step(start)), shape(start), name); }
  }
  const gun = place(create(80, 80), PATTERNS.gun, 2, 20);
  assert.ok(count(run(gun, 150)) > count(gun) + 10, 'the gun keeps shooting gliders');
});

test('the edges wrap round: a glider goes on for ever on a small grid, a cell at the corner has neighbours on the far side', () => {
  const glider = place(create(12, 12), PATTERNS.glider, 0, 0);
  assert.equal(count(run(glider, 200)), 5);
  const corner = place(create(8, 8), ['OOO'], 7, 0);
  assert.equal(count(step(corner)), 3);
  assert.equal(shape(run(place(create(8, 8), PATTERNS.blinker, 6, 3), 2)), shape(place(create(8, 8), PATTERNS.blinker, 6, 3)));
});

test('cells grow older while they live', () => {
  const block = place(create(10, 10), ['OO', 'OO'], 3, 3);
  assert.equal(block.cells[index(block, 3, 3)], 1);
  assert.equal(run(block, 5).cells[index(block, 3, 3)], 6);
  let old = block; old.cells.fill(0); old.cells[index(old, 3, 3)] = 0;
  const still = place(create(10, 10), ['OO', 'OO'], 3, 3); still.cells[index(still, 3, 3)] = 255;
  assert.equal(step(still).cells[index(still, 3, 3)], 255, 'the age stops at 255');
});

test('fill makes about the density asked for, and toggle sets one cell', () => {
  let seed = 7; const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const l = fill(create(100, 100), 0.3, rng);
  assert.ok(Math.abs(count(l) / 10000 - 0.3) < 0.03);
  const t = toggle(create(5, 5), 2, 3, true);
  assert.equal(count(t), 1);
  assert.equal(count(toggle(t, 2, 3, false)), 0);
});

test('every pattern is a clean rectangle of O and dots and has some life', () => {
  for (const name of PATTERN_NAMES) {
    const rows = PATTERNS[name];
    const { width } = patternSize(rows);
    for (const row of rows) { assert.equal(row.length, width, name); assert.match(row, /^[O.]+$/, name); }
    assert.ok(rows.join('').includes('O'));
  }
});
