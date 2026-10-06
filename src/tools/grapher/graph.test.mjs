import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toScreen, fromScreen, zoomAt, niceStep, formatTick, ticks, polylines } from './graph.ts';
import { compile } from './expression.ts';

const W = 960, H = 640;
const view = { cx: 0, cy: 0, scale: 60 };
const f = text => { const c = compile(text); assert.ok(c.ok); return x => c.evaluate(x); };
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('screen and plane coordinates convert both ways, and the origin is in the middle', () => {
  const o = toScreen(view, W, H, 0, 0);
  assert.deepEqual([o.x, o.y], [W / 2, H / 2]);
  assert.ok(toScreen(view, W, H, 0, 1).y < H / 2, 'up is up');
  const there = { cx: 3.5, cy: -2, scale: 17 };
  const s = toScreen(there, W, H, 1.25, 4);
  const back = fromScreen(there, W, H, s.x, s.y);
  close(back.x, 1.25); close(back.y, 4);
});

test('zooming keeps the point under the pointer where it is, and the scale is limited', () => {
  const there = { cx: 1, cy: 2, scale: 40 };
  const before = fromScreen(there, W, H, 700, 150);
  const zoomed = zoomAt(there, W, H, 700, 150, 2.5);
  close(zoomed.scale, 100);
  const after = fromScreen(zoomed, W, H, 700, 150);
  close(after.x, before.x); close(after.y, before.y);
  assert.ok(zoomAt(there, W, H, 0, 0, 1e-12).scale >= 1e-3);
  assert.ok(zoomAt(there, W, H, 0, 0, 1e12).scale <= 1e6);
});

test('tick steps are 1, 2 or 5 times a power of ten, giving about eight ticks', () => {
  for (const span of [0.013, 0.7, 1, 5, 16, 100, 12345, 3e7]) {
    const step = niceStep(span);
    const mantissa = step / Math.pow(10, Math.floor(Math.log10(step)));
    assert.ok([1, 2, 5].some(m => Math.abs(m - mantissa) < 1e-9) || Math.abs(mantissa - 10) < 1e-9, `${span} -> ${step}`);
    const count = span / step;
    assert.ok(count >= 4 && count <= 12, `${span}: ${count} ticks`);
  }
  assert.equal(niceStep(16), 2);
});

test('tick labels have the decimals the step needs, and no minus zero', () => {
  assert.equal(formatTick(2, 1), '2');
  assert.equal(formatTick(0.5, 0.5), '0.5');
  assert.equal(formatTick(0.25, 0.05), '0.25');
  assert.equal(formatTick(-0, 1), '0');
  assert.equal(formatTick(0.30000000000000004, 0.1), '0.3');
  assert.equal(formatTick(-3, 1), '-3');
  assert.equal(formatTick(2e9, 5e8), '2e9');
});

test('ticks cover the range and include zero', () => {
  const list = ticks(-8, 8, 2);
  assert.deepEqual(list.map(v => v + 0), [-8, -6, -4, -2, 0, 2, 4, 6, 8]);
  assert.ok(ticks(0.3, 0.9, 0.2).length >= 3);
});

test('a smooth curve is one line across the screen', () => {
  const lines = polylines(f('x^2'), view, W, H);
  assert.equal(lines.length, 1);
  assert.ok(lines[0].length > W * 0.2);
  const line = polylines(f('2x'), view, W, H)[0];
  close(line[0].x, 0);
  assert.ok(line.at(-1).x >= W);
});

test('1/x is broken at zero, tan(x) at each asymptote, sqrt(x) has no left half', () => {
  assert.equal(polylines(f('1/x'), view, W, H).length, 2);
  const tan = polylines(f('tan(x)'), view, W, H);
  // x runs over -8..8: six asymptotes (±pi/2, ±3pi/2, ±5pi/2) make seven branches
  assert.equal(tan.length, 7);
  const root = polylines(f('sqrt(x)'), view, W, H);
  assert.equal(root.length, 1);
  assert.ok(root[0][0].x >= W / 2 - 1);
  assert.deepEqual(polylines(f('ln(x)'), { cx: -20, cy: 0, scale: 60 }, W, H), []);
});

test('a constant and a steep line stay on one line each; far off the screen is left out', () => {
  assert.equal(polylines(f('3'), view, W, H).length, 1);
  assert.equal(polylines(f('1000000 x'), view, W, H).length, 0, 'jumps by more than a screen are broken, so no line is left');
  assert.deepEqual(polylines(f('1e9'), view, W, H), []);
});

test('a bigger stride draws fewer points', () => {
  assert.ok(polylines(f('sin(x)'), view, W, H, 4)[0].length < polylines(f('sin(x)'), view, W, H, 1)[0].length / 3);
});
