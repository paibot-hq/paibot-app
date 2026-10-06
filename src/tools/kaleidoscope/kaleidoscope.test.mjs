import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLOR_MODES, autoPoint, copies, hueFor, lightnessFor, saturationFor } from './kaleidoscope.ts';

const centre = { x: 0, y: 0 };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
const key = point => `${Math.round(point.x * 1e6)},${Math.round(point.y * 1e6)}`;

test('four turns of a point are its four quarter turns', () => {
  const result = copies({ x: 1, y: 0 }, centre, 4, false);
  assert.equal(result.length, 4);
  [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([x, y], index) => { close(result[index].x, x); close(result[index].y, y); });
});

test('a mirror doubles the copies, and the set is the same when reflected', () => {
  const point = { x: 3, y: 1 };
  assert.equal(copies(point, centre, 6, false).length, 6);
  const mirrored = copies(point, centre, 6, true);
  assert.equal(mirrored.length, 12);
  const reflected = new Set(mirrored.map(p => key({ x: p.x, y: -p.y })));
  assert.deepEqual(new Set(mirrored.map(key)), reflected);
});

test('every copy is as far from the centre as the point, wherever the centre is', () => {
  const c = { x: 250, y: 180 };
  const point = { x: 310, y: 210 };
  const distance = Math.hypot(point.x - c.x, point.y - c.y);
  for (const mirror of [false, true]) for (const copy of copies(point, c, 9, mirror)) close(Math.hypot(copy.x - c.x, copy.y - c.y), distance);
});

test('one segment is the point itself; the count is kept to at least one; a point at the centre stays there', () => {
  const only = copies({ x: 5, y: 7 }, centre, 1, false);
  assert.deepEqual(only.map(p => [Math.round(p.x), Math.round(p.y)]), [[5, 7]]);
  assert.equal(copies({ x: 5, y: 7 }, centre, 0, false).length, 1);
  for (const copy of copies(centre, centre, 12, true)) { close(copy.x, 0); close(copy.y, 0); }
});

test('the hue drifts with the distance, and each mode keeps to its part of the wheel', () => {
  assert.equal(hueFor('rainbow', 0), 0);
  assert.equal(hueFor('rainbow', 450), 180);
  assert.equal(hueFor('rainbow', 900), 0);
  for (let d = 0; d < 3000; d += 37) {
    const warm = hueFor('warm', d), cool = hueFor('cool', d);
    assert.ok(warm >= 340 || warm <= 40, `warm ${warm}`);
    assert.ok(cool >= 170 && cool <= 270, `cool ${cool}`);
    assert.equal(hueFor('mono', d), 210);
  }
  assert.ok(lightnessFor('mono') > lightnessFor('rainbow') && saturationFor('mono') < saturationFor('rainbow'));
  assert.deepEqual([...COLOR_MODES], ['rainbow', 'warm', 'cool', 'mono']);
});

test('the automatic path stays on the canvas, moves smoothly and does not stand still', () => {
  const size = 600;
  let last = autoPoint(0, size);
  let longest = 0, total = 0;
  for (let t = 0.016; t < 60; t += 0.016) {
    const p = autoPoint(t, size);
    assert.ok(p.x >= 0 && p.x <= size && p.y >= 0 && p.y <= size);
    const step = Math.hypot(p.x - last.x, p.y - last.y);
    longest = Math.max(longest, step); total += step;
    last = p;
  }
  assert.ok(longest < 12, `a step of a frame is short (${longest.toFixed(1)}px)`);
  assert.ok(total > 1500, 'it travels');
});
