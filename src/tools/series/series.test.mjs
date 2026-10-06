import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terms, approximate, target, rmsError, peak, sumTex, KINDS, TAYLOR_KINDS, FOURIER_KINDS, VIEWS, isFourier } from './series.ts';

const close = (a, b, eps) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('the first terms of each Taylor series are the well-known ones', () => {
  assert.deepEqual(terms('sin', 3).map(t => [t.power, +t.coefficient.toFixed(6)]), [[1, 1], [3, -0.166667], [5, 0.008333]]);
  assert.deepEqual(terms('cos', 3).map(t => [t.power, +t.coefficient.toFixed(6)]), [[0, 1], [2, -0.5], [4, 0.041667]]);
  assert.deepEqual(terms('exp', 4).map(t => t.power), [0, 1, 2, 3]);
  close(terms('exp', 4)[3].coefficient, 1 / 6, 1e-12);
  assert.deepEqual(terms('log', 3).map(t => t.coefficient), [1, -1 / 2, 1 / 3]);
  assert.deepEqual(terms('geometric', 4).map(t => [t.power, t.coefficient]), [[0, 1], [1, 1], [2, 1], [3, 1]]);
  assert.deepEqual(terms('atan', 3).map(t => [t.power, +t.coefficient.toFixed(6)]), [[1, 1], [3, -0.333333], [5, 0.2]]);
});

test('the sums of sin, cos and exp approach the function everywhere, faster with more terms', () => {
  for (const kind of ['sin', 'cos', 'exp']) {
    let before = Infinity;
    for (const n of [2, 4, 8, 16]) {
      const e = Math.abs(approximate(kind, n, 2) - target(kind, 2));
      assert.ok(e < before, `${kind} ${n}`);
      before = e;
    }
    assert.ok(before < 1e-7, `${kind} converged: ${before}`);
  }
  close(approximate('sin', 12, 5), Math.sin(5), 1e-6);
});

test('ln(1+x), 1/(1-x) and arctan only converge for |x| < 1: inside they do, outside they blow up', () => {
  close(approximate('log', 200, 0.5), Math.log(1.5), 1e-9);
  close(approximate('geometric', 60, 0.5), 2, 1e-9);
  close(approximate('atan', 200, 0.5), Math.atan(0.5), 1e-9);
  for (const kind of ['log', 'geometric', 'atan']) {
    assert.ok(Math.abs(approximate(kind, 40, 1.5)) > Math.abs(approximate(kind, 10, 1.5)), `${kind} grows outside`);
    assert.ok(Math.abs(approximate(kind, 40, 1.5) - target(kind, 1.5)) > 5, `${kind} is far off outside`);
  }
});

test('the Fourier series reach the waves: values at the flat parts and the jump', () => {
  close(approximate('square', 100, Math.PI / 2), 1, 0.02);
  close(approximate('square', 100, -Math.PI / 2), -1, 0.02);
  assert.equal(approximate('square', 100, 0), 0);
  close(approximate('sawtooth', 300, Math.PI / 2), 0.5, 0.01);
  close(approximate('sawtooth', 300, -Math.PI / 3), -1 / 3, 0.01);
  close(approximate('triangle', 20, Math.PI / 2), 1, 0.02);
  close(approximate('triangle', 20, Math.PI / 6), 1 / 3, 0.02);
  close(approximate('triangle', 20, 0), 0, 1e-12);
});

test('the waves themselves are periodic and have the right shape', () => {
  for (const kind of FOURIER_KINDS) {
    for (const x of [0.4, 1.3, 2.9, -1.1]) close(target(kind, x + 2 * Math.PI), target(kind, x), 1e-9);
  }
  assert.equal(target('square', 1), 1);
  assert.equal(target('square', -1), -1);
  close(target('sawtooth', 1), 1 / Math.PI, 1e-12);
  close(target('triangle', Math.PI / 2), 1, 1e-12);
});

test('the average distance falls as terms are added, for every kind, inside the range of convergence', () => {
  for (const kind of KINDS) {
    const few = rmsError(kind, 2), many = rmsError(kind, kind === 'log' || kind === 'geometric' || kind === 'atan' ? 4 : 30);
    if (kind === 'log' || kind === 'geometric' || kind === 'atan') continue;   // these do not converge over the whole range
    assert.ok(many < few, `${kind}: ${many} !< ${few}`);
  }
  assert.ok(rmsError('sin', 14) < 1e-6);
  assert.ok(rmsError('log', 30) > rmsError('log', 5), 'outside |x| < 1 more terms make ln(1+x) worse over the range');
});

test('Gibbs: a square wave\'s sum overshoots to about 1.179 however many terms there are', () => {
  for (const n of [10, 50, 200]) {
    const top = peak('square', n);
    assert.ok(top > 1.15 && top < 1.19, `${n}: ${top}`);
  }
  assert.ok(peak('triangle', 50) < 1.001, 'a wave without a jump does not overshoot');
  assert.ok(peak('sawtooth', 50) > 1, 'the sawtooth overshoots at its jump too');
});

test('TeX of the sums', () => {
  assert.equal(sumTex('sin', 3), 'x-\\frac{x^{3}}{3!}+\\frac{x^{5}}{5!}');
  assert.equal(sumTex('sin', 6), 'x-\\frac{x^{3}}{3!}+\\frac{x^{5}}{5!}-\\frac{x^{7}}{7!}+\\cdots');
  assert.equal(sumTex('cos', 2), '1-\\frac{x^{2}}{2!}');
  assert.equal(sumTex('exp', 4), '1+x+\\frac{x^{2}}{2!}+\\frac{x^{3}}{3!}');
  assert.equal(sumTex('log', 3), 'x-\\frac{x^{2}}{2}+\\frac{x^{3}}{3}');
  assert.equal(sumTex('geometric', 3), '1+x+x^{2}');
  assert.equal(sumTex('atan', 2), 'x-\\frac{x^{3}}{3}');
  assert.equal(sumTex('square', 3), '\\frac{4}{\\pi}\\left(\\sin x+\\frac{\\sin 3x}{3}+\\frac{\\sin 5x}{5}\\right)');
  assert.equal(sumTex('square', 9), '\\frac{4}{\\pi}\\left(\\sin x+\\frac{\\sin 3x}{3}+\\frac{\\sin 5x}{5}+\\frac{\\sin 7x}{7}+\\cdots\\right)');
  assert.equal(sumTex('sawtooth', 3), '\\frac{2}{\\pi}\\left(\\sin x-\\frac{\\sin 2x}{2}+\\frac{\\sin 3x}{3}\\right)');
  assert.equal(sumTex('triangle', 2), '\\frac{8}{\\pi^{2}}\\left(\\sin x-\\frac{\\sin 3x}{9}\\right)');
});

test('every kind has a view with its curve inside, and the kinds are split into the two families', () => {
  assert.equal(TAYLOR_KINDS.length + FOURIER_KINDS.length, KINDS.length);
  for (const kind of KINDS) {
    const v = VIEWS[kind];
    assert.ok(v.xMin < 0 && v.xMax > 0 && v.yMin < 0 && v.yMax > 0, kind);
    assert.equal(isFourier(kind), FOURIER_KINDS.includes(kind));
  }
  assert.equal(terms('sin', 5).length, 5);
  assert.equal(terms('square', 1)[0].power, 1);
});
