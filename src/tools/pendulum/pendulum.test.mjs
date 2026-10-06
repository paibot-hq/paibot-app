import { test } from 'node:test';
import assert from 'node:assert/strict';
import { step, run, energy, bobs, family, DEFAULTS } from './pendulum.ts';

const rest = { a1: 0, a2: 0, w1: 0, w2: 0 };
const dist = (a, b) => { const p = bobs(a), q = bobs(b); return Math.hypot(p.x2 - q.x2, p.y2 - q.y2); };

test('hanging straight down at rest, it stays there', () => {
  const s = run(rest, 10);
  assert.ok(Math.abs(s.a1) < 1e-12 && Math.abs(s.a2) < 1e-12);
});

test('energy is kept, even in the wild swinging of a large start', () => {
  for (const start of [{ a1: 2.0, a2: 2.5, w1: 0, w2: 0 }, { a1: 3.0, a2: -1, w1: 1, w2: 0 }, { a1: 0.3, a2: 0.1, w1: 0, w2: 0 }]) {
    const before = energy(start);
    const s = run(start, 20);
    assert.ok(Math.abs(energy(s) - before) / Math.max(1, Math.abs(before)) < 1e-6, `drift ${energy(s) - before}`);
  }
});

test('the slow normal mode: with a2 = sqrt(2) a1 it swings in a period of 2π / sqrt((2 - sqrt 2) g / l)', () => {
  const period = (2 * Math.PI) / Math.sqrt((2 - Math.SQRT2) * DEFAULTS.g);
  const start = { a1: 0.001, a2: 0.001 * Math.SQRT2, w1: 0, w2: 0 };
  const after = run(start, period);
  assert.ok(Math.abs(after.a1 - start.a1) < 0.02 * 0.001 && Math.abs(after.a2 - start.a2) < 0.02 * 0.0015, `${after.a1} ${after.a2}`);
  const half = run(start, period / 2);
  assert.ok(half.a1 < -0.0009, 'half a period later it is on the other side');
});

test('the fast normal mode, with a2 = -sqrt(2) a1, has the period 2π / sqrt((2 + sqrt 2) g / l)', () => {
  const period = (2 * Math.PI) / Math.sqrt((2 + Math.SQRT2) * DEFAULTS.g);
  const start = { a1: 0.001, a2: -0.001 * Math.SQRT2, w1: 0, w2: 0 };
  const after = run(start, period);
  assert.ok(Math.abs(after.a1 - start.a1) < 0.02 * 0.001, `${after.a1}`);
});

test('chaos: two starts 1e-6 apart are far apart after half a minute, but together after one second', () => {
  const a = { a1: 2.0, a2: 2.0, w1: 0, w2: 0 };
  const b = { ...a, a1: a.a1 + 1e-6 };
  assert.ok(dist(run(a, 1), run(b, 1)) < 1e-4);
  assert.ok(dist(run(a, 30), run(b, 30)) > 0.5, `${dist(run(a, 30), run(b, 30))}`);
});

test('a small swing hardly separates: the same 1e-6 near the bottom stays tiny', () => {
  const a = { a1: 0.05, a2: 0.05, w1: 0, w2: 0 };
  const b = { ...a, a1: a.a1 + 1e-6 };
  assert.ok(dist(run(a, 30), run(b, 30)) < 1e-3);
});

test('a smaller step gives the same answer: the integration has converged', () => {
  const start = { a1: 1.5, a2: 1, w1: 0, w2: 0 };
  const coarse = run(start, 3, 0.004), fine = run(start, 3, 0.001);
  assert.ok(Math.abs(coarse.a1 - fine.a1) < 1e-6 && Math.abs(coarse.a2 - fine.a2) < 1e-6);
});

test('bobs: down at rest, the arms keep their lengths, up is y > 0', () => {
  const p = bobs(rest);
  assert.ok(Math.abs(p.x1) < 1e-12 && Math.abs(p.y1 + 1) < 1e-12 && Math.abs(p.y2 + 2) < 1e-12);
  const q = bobs({ a1: 1, a2: 2.5, w1: 0, w2: 0 });
  assert.ok(Math.abs(Math.hypot(q.x1, q.y1) - 1) < 1e-12 && Math.abs(Math.hypot(q.x2 - q.x1, q.y2 - q.y1) - 1) < 1e-12);
  assert.ok(bobs({ a1: Math.PI, a2: Math.PI, w1: 0, w2: 0 }).y2 > 1.9);
});

test('a family starts almost alike, the first exactly at the angles', () => {
  const f = family(5, 2, 1, 0.01);
  assert.equal(f.length, 5);
  assert.equal(f[0].a1, 2);
  assert.ok(Math.abs(f[4].a1 - 2.01) < 1e-12);
  assert.equal(family(1, 2, 1, 0.5)[0].a1, 2);
  assert.ok(f.every(s => s.a2 === 1 && s.w1 === 0));
});

test('one step does what many tiny steps do', () => {
  const s = { a1: 1, a2: 0.5, w1: 0.2, w2: -0.1 };
  const one = step(s, 0.01);
  let many = s; for (let i = 0; i < 10; i++) many = step(many, 0.001);
  assert.ok(Math.abs(one.a1 - many.a1) < 1e-9);
});
