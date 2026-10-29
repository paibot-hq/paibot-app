import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, waits, mean, deviation, distribution, quantile, chanceWithin, emptyCollection, draw, drawMany, trial, mulberry32, MAX_KINDS } from './collector.ts';

const close = (a, b, eps) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('anything typed becomes a problem that can be solved', () => {
  assert.deepEqual(normalize({ n: 6, have: 0, goal: 6 }), { n: 6, have: 0, goal: 6 });
  assert.deepEqual(normalize({ n: 0, have: -3, goal: 9 }), { n: 1, have: 0, goal: 1 });
  assert.deepEqual(normalize({ n: 5000, have: 2.4, goal: NaN }), { n: MAX_KINDS, have: 0, goal: 1 });
  assert.deepEqual(normalize({ n: 10, have: 10, goal: 10 }), { n: 10, have: 9, goal: 10 }, 'the goal stays above what is in hand');
  assert.deepEqual(normalize({ n: 10, have: 3, goal: 20 }), { n: 10, have: 3, goal: 10 });
});

test('the mean is n times the harmonic number: 14.7 for a die, about 225 for 50 kinds', () => {
  close(mean({ n: 6, have: 0, goal: 6 }), 14.7, 1e-12);
  close(mean({ n: 50, have: 0, goal: 50 }), 224.96, 0.01);
  close(mean({ n: 1, have: 0, goal: 1 }), 1, 1e-12);
  // Half the kinds come quickly; the last one alone takes n draws on average.
  close(mean({ n: 6, have: 5, goal: 6 }), 6, 1e-12);
  close(mean({ n: 6, have: 0, goal: 3 }), 1 + 6 / 5 + 6 / 4, 1e-12);
  assert.deepEqual(waits({ n: 4, have: 1, goal: 3 }).map(w => [w.kinds, w.chance, w.mean]), [[1, 0.75, 4 / 3], [2, 0.5, 2]]);
});

test('the spread is the root of the summed geometric variances (about 6.24 for a die)', () => {
  close(deviation({ n: 6, have: 0, goal: 6 }), Math.sqrt(38.99), 1e-9);
  assert.equal(deviation({ n: 1, have: 0, goal: 1 }), 0);
});

test('the exact distribution: a die cannot finish before 6 draws, its chance after 6 is 6!/6^6, and its mean matches', () => {
  const cdf = distribution({ n: 6, have: 0, goal: 6 });
  for (let t = 0; t < 6; t++) assert.equal(cdf[t], 0);
  close(cdf[6], 720 / 46656, 1e-15);
  assert.ok(cdf.at(-1) >= 1 - 1e-5);
  for (let t = 1; t < cdf.length; t++) assert.ok(cdf[t] >= cdf[t - 1] - 1e-15, 'it never goes down');
  // Σ P(T > t) is the mean (up to the cut tail).
  close(cdf.reduce((s, c) => s + (1 - c), 0), 14.7, 1e-3);
  // Two kinds: P(done by t) = 1 - 2 / 2^t.
  const two = distribution({ n: 2, have: 0, goal: 2 });
  for (let t = 1; t < 10; t++) close(two[t], 1 - 2 / 2 ** t, 1e-15);
  // Already holding some: from 5 of 6 it is a plain geometric wait.
  const last = distribution({ n: 6, have: 5, goal: 6 });
  close(last[1], 1 / 6, 1e-15); close(last[3], 1 - (5 / 6) ** 3, 1e-15);
});

test('median and percentiles, and the chance of being done after a given number of draws', () => {
  const cdf = distribution({ n: 6, have: 0, goal: 6 });
  assert.equal(quantile(cdf, 0.5), 13);
  assert.ok(cdf[12] < 0.5 && cdf[13] >= 0.5);
  assert.ok(quantile(cdf, 0.9) > quantile(cdf, 0.5));
  assert.equal(chanceWithin(cdf, 5), 0);
  close(chanceWithin(cdf, 6), 720 / 46656, 1e-15);
  assert.equal(chanceWithin(cdf, 100000), 1);
  assert.equal(chanceWithin(cdf, -1), 0);
});

test('a large problem is solved quickly', () => {
  const started = performance.now();
  const cdf = distribution({ n: MAX_KINDS, have: 0, goal: MAX_KINDS });
  assert.ok(performance.now() - started < 3000);
  close(cdf.reduce((s, c) => s + (1 - c), 0), mean({ n: MAX_KINDS, have: 0, goal: MAX_KINDS }), 1);
});

test('drawing by hand: counts, new kinds and the draw each was first seen', () => {
  const values = [0.1, 0.1, 0.5, 0.9];
  let i = 0;
  let c = emptyCollection(3);
  for (let k = 0; k < 4; k++) c = draw(c, () => values[i++]);
  assert.deepEqual(c.counts, [2, 1, 1]);
  assert.deepEqual([c.draws, c.kinds, c.last], [4, 3, 2]);
  assert.deepEqual(c.firstAt, [1, 3, 4]);
  const full = drawMany(emptyCollection(10), 100000, mulberry32(3), 10);
  assert.equal(full.kinds, 10);
  assert.equal(full.counts.reduce((a, b) => a + b, 0), full.draws, 'it stops on the draw that completes the set');
  assert.equal(full.firstAt[full.last], full.draws);
  assert.equal(drawMany(emptyCollection(10), 5, mulberry32(3)).draws, 5);
  const started = emptyCollection(4, 2);
  assert.deepEqual([started.counts, started.kinds, started.firstAt], [[1, 1, 0, 0], 2, [0, 0, -1, -1]]);
});

test('many trials average out to the exact mean', () => {
  const random = mulberry32(7);
  const problem = { n: 20, have: 0, goal: 20 };
  let total = 0;
  for (let k = 0; k < 4000; k++) total += trial(problem, random);
  close(total / 4000, mean(problem), 1.5);
  assert.equal(trial({ n: 5, have: 4, goal: 4 }, random), 0);
});
