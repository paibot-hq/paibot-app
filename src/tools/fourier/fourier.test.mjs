import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resample, dft, chain, evaluate, trace, error, fit, PRESETS, PRESET_NAMES } from './fourier.ts';

const circle = n => Array.from({ length: n }, (_, i) => ({ x: Math.cos((2 * Math.PI * i) / n), y: Math.sin((2 * Math.PI * i) / n) }));
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('a circle is one circle: frequency 1, radius 1, and nothing else', () => {
  const terms = dft(circle(64));
  assert.equal(terms[0].freq, 1);
  close(terms[0].amplitude, 1);
  close(terms[1].amplitude, 0);
  assert.equal(terms.length, 64);
});

test('a circle going the other way is frequency -1; a double-speed circle is 2; a shifted one adds frequency 0', () => {
  const back = circle(32).map(p => ({ x: p.x, y: -p.y }));
  assert.equal(dft(back)[0].freq, -1);
  const fast = Array.from({ length: 32 }, (_, i) => ({ x: Math.cos((4 * Math.PI * i) / 32), y: Math.sin((4 * Math.PI * i) / 32) }));
  assert.equal(dft(fast)[0].freq, 2);
  const shifted = circle(32).map(p => ({ x: p.x + 5, y: p.y - 3 }));
  const terms = dft(shifted);
  const centre = terms.find(t => t.freq === 0);
  close(centre.re, 5); close(centre.im, -3);
  assert.equal(terms[0].freq, 0, 'the offset is the biggest circle here');
});

test('all the circles together give back every point exactly', () => {
  const points = fit(PRESETS.heart(), 640, 260);
  const cut = resample(points, 128);
  const terms = dft(cut);
  cut.forEach((p, j) => { const q = evaluate(terms, j / cut.length, terms.length); close(q.x, p.x, 1e-7); close(q.y, p.y, 1e-7); });
  assert.ok(error(cut, terms, terms.length) < 1e-7);
});

test('the more circles, the closer: the error only falls as circles are added', () => {
  const cut = resample(fit(PRESETS.star(), 640, 260), 128);
  const terms = dft(cut);
  let previous = Infinity;
  for (const count of [1, 2, 5, 10, 30, 128]) {
    const e = error(cut, terms, count);
    assert.ok(e <= previous + 1e-9, `${count}: ${e} > ${previous}`);
    previous = e;
  }
  assert.ok(error(cut, terms, 1) > 20 && error(cut, terms, 128) < 1e-6);
});

test('the chain of circles starts at the origin and ends at the curve; each arm has its circle\'s radius', () => {
  const terms = dft(resample(fit(PRESETS.trefoil(), 640, 260), 64));
  const links = chain(terms, 0.3, 10);
  assert.equal(links.length, 11);
  assert.deepEqual(links[0], { x: 0, y: 0 });
  for (let k = 0; k < 10; k++) close(Math.hypot(links[k + 1].x - links[k].x, links[k + 1].y - links[k].y), terms[k].amplitude, 1e-9);
  assert.deepEqual(links[10], evaluate(terms, 0.3, 10));
  assert.equal(chain(terms, 0, 1000).length, terms.length + 1, 'no more circles than there are');
  assert.equal(trace(terms, 20, 50).length, 50);
});

test('resample: equal steps along the curve, the number asked for, and nothing breaks on a single point', () => {
  const square = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
  const out = resample(square, 16);
  assert.equal(out.length, 16);
  assert.deepEqual(out[0], { x: 0, y: 0 });
  close(out[1].x, 1); close(out[4].x, 4); close(out[4].y, 0); close(out[8].y, 4); close(out[12].x, 0);
  const steps = out.map((p, i) => Math.hypot(out[(i + 1) % 16].x - p.x, out[(i + 1) % 16].y - p.y));
  for (const s of steps) close(s, 1);
  const one = resample([{ x: 3, y: 4 }], 8);
  assert.ok(one.every(p => p.x === 3 && p.y === 4));
  assert.equal(resample([], 4).length, 4);
  assert.ok(resample([{ x: 1, y: 1 }, { x: 1, y: 1 }], 5).every(p => Number.isFinite(p.x)));
});

test('fit puts the middle in the middle and the farthest point at the radius', () => {
  const out = fit(PRESETS.infinity(), 640, 250);
  const mean = out.reduce((m, p) => ({ x: m.x + p.x / out.length, y: m.y + p.y / out.length }), { x: 0, y: 0 });
  close(mean.x, 320, 1e-6); close(mean.y, 320, 1e-6);
  close(Math.max(...out.map(p => Math.hypot(p.x - mean.x, p.y - mean.y))), 250, 1e-6);
});

test('every preset is a closed curve of finite points', () => {
  for (const name of PRESET_NAMES) {
    const points = PRESETS[name]();
    assert.ok(points.length >= 5, name);
    assert.ok(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), name);
    const spread = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
    assert.ok(spread > 0.5, name);
  }
});
