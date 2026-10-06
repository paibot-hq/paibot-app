import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TARGETS, TARGET_IDS, taylorTerms, taylorEval, fourierBest, fourierEval, createNet, netEval, gradient, train, lesson, mulberry32, hiddenFor, netSize, rms, winner } from './approx.ts';

const close = (a, b, eps) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('the Taylor terms are the well-known ones, and a function without a Taylor series has none', () => {
  assert.deepEqual(taylorTerms(TARGETS.sin, 3).map(t => [t.power, +t.coefficient.toFixed(6)]), [[1, 1], [3, -0.166667], [5, 0.008333]]);
  assert.deepEqual(taylorTerms(TARGETS.runge, 4).map(t => [t.power, t.coefficient]), [[0, 1], [2, -1], [4, 1], [6, -1]]);
  assert.deepEqual(taylorTerms(TARGETS.gauss, 3).map(t => [t.power, t.coefficient]), [[0, 1], [2, -1], [4, 0.5]]);
  assert.deepEqual(taylorTerms(TARGETS.line, 5).map(t => [t.power, t.coefficient]), [[1, 1]], 'a line has just the one term');
  assert.equal(taylorTerms(TARGETS.abs, 5), null);
  assert.equal(taylorTerms(TARGETS.step, 5), null);
  assert.equal(taylorTerms(TARGETS.sin, 6).length, 6);
});

test('Taylor: sin is near perfect close to 0 and far from right far away; the series of 1/(1+x²) only works within 1', () => {
  const t = taylorTerms(TARGETS.sin, 8);
  close(taylorEval(t, 1), Math.sin(1), 1e-9);
  assert.ok(Math.abs(taylorEval(taylorTerms(TARGETS.sin, 3), 6) - Math.sin(6)) > 5);
  const r = taylorTerms(TARGETS.runge, 12);
  close(taylorEval(r, 0.5), 1 / 1.25, 1e-3);
  assert.ok(Math.abs(taylorEval(r, 2) - 0.2) > 10, 'beyond the radius of convergence it blows up');
  assert.ok(Math.abs(taylorEval(taylorTerms(TARGETS.exp, 12), 3) - Math.exp(3)) < 0.01);
  const w = taylorTerms(TARGETS.wiggle, 30);
  close(taylorEval(w, 0.8), TARGETS.wiggle.f(0.8), 1e-6);
});

// The harmonics are those of the whole range, whose period is 2 half: over 4 pi (half = 2 pi) sin x is the second harmonic.
test('Fourier coefficients: a single sine for sin, three for the wiggle, the odd harmonics 4/(pi k) for a square wave', () => {
  const sine = fourierBest(TARGETS.sin.f, TARGETS.sin.half, 5);
  assert.equal(sine.length, 1);
  assert.deepEqual([sine[0].kind, sine[0].k], ['b', 2]);
  close(sine[0].value, 1, 1e-9);
  const wiggle = fourierBest(TARGETS.wiggle.f, TARGETS.wiggle.half, 6);
  assert.deepEqual(wiggle.map(c => [c.kind, c.k, +c.value.toFixed(6)]), [['b', 2, 1], ['b', 6, 0.5], ['b', 14, 0.25]]);
  const square = fourierBest(TARGETS.step.f, TARGETS.step.half, 3);
  assert.deepEqual(square.map(c => [c.kind, c.k]), [['b', 1], ['b', 3], ['b', 5]]);
  close(square[0].value, 4 / Math.PI, 1e-3); close(square[1].value, 4 / (3 * Math.PI), 1e-3);
});

test('Fourier: the more coefficients, the closer; the constant and cosines of an even function; the period follows the range', () => {
  const f = x => x * x;
  const few = fourierBest(f, 2, 3), many = fourierBest(f, 2, 40);
  assert.ok(rms(f, x => fourierEval(many, 2, x), 2) < rms(f, x => fourierEval(few, 2, x), 2));
  const top = fourierBest(f, 2, 3);
  assert.ok(top.every(c => c.kind === 'a'), 'an even function has only the constant and cosines');
  assert.deepEqual([top[0].k, top[1].k], [1, 0], 'the first cosine (16 / pi^2 in size) is bigger than the mean (4/3)');
  close(top[0].value, -16 / (Math.PI * Math.PI), 1e-3); close(top[1].value, 4 / 3, 1e-3);
  const x = fourierBest(t => t, 3, 60);
  close(fourierEval(x, 3, 1), 1, 0.05);
  close(fourierEval(x, 3, 1 + 6), fourierEval(x, 3, 1), 1e-9);
  assert.ok(fourierBest(f, 2, 200).length <= 200);
  assert.deepEqual(fourierBest(() => 0, 2, 5), [], 'a function that is zero has no coefficients');
});

test('the gradient of the network matches finite differences', () => {
  const net = createNet(5, mulberry32(3));
  const xs = Array.from({ length: 20 }, (_, i) => -1 + (2 * i) / 19), ts = xs.map(x => Math.sin(3 * x));
  const { loss, grad } = gradient(net, xs, ts);
  assert.ok(loss > 0);
  for (let i = 0; i < net.p.length; i++) {
    const h = 1e-6, original = net.p[i];
    net.p[i] = original + h; const up = gradient(net, xs, ts).loss;
    net.p[i] = original - h; const down = gradient(net, xs, ts).loss;
    net.p[i] = original;
    close(grad[i], (up - down) / (2 * h), 1e-5 * Math.max(1, Math.abs(grad[i])));
  }
});

test('training lowers the loss and fits a smooth function; the same seed gives the same network', () => {
  const l = lesson(TARGETS.sin);
  const net = createNet(8, mulberry32(7));
  const first = train(net, l.xs, l.ts);
  let last = first;
  for (let i = 0; i < 3000; i++) last = train(net, l.xs, l.ts);
  assert.ok(last < first / 20, `${first} -> ${last}`);
  const error = rms(TARGETS.sin.f, x => netEval(net, x / TARGETS.sin.half) * l.scale, TARGETS.sin.half);
  assert.ok(error < 0.1, `rms ${error}`);
  const a = createNet(4, mulberry32(11)), b = createNet(4, mulberry32(11)), c = createNet(4, mulberry32(12));
  assert.deepEqual([...a.p], [...b.p]); assert.notDeepEqual([...a.p], [...c.p]);
  assert.equal(net.steps, 3001);
});

test('the lesson scales x to -1..1 and the target to -1..1, and the sizes of the network follow the budget', () => {
  const l = lesson(TARGETS.exp);
  assert.ok(Math.min(...l.xs) > -1 && Math.max(...l.xs) < 1);
  close(Math.max(...l.ts), 1, 1e-9);
  close(l.scale, Math.exp(TARGETS.exp.half), 0.5);
  assert.equal(netSize(5), 16); assert.equal(hiddenFor(16), 5); assert.equal(hiddenFor(4), 1); assert.equal(hiddenFor(3), 1); assert.equal(hiddenFor(61), 20);
  for (const budget of [4, 10, 16, 40, 61]) assert.ok(netSize(hiddenFor(budget)) <= Math.max(budget, 4), `budget ${budget}`);
  for (const id of TARGET_IDS) { const t = TARGETS[id]; assert.ok(t.half > 0 && t.view.yMax > t.view.yMin); assert.ok(Number.isFinite(t.f(0.3))); }
});

test('the winner is the smallest error; a method without a number sits out; nothing at all gives no winner', () => {
  assert.equal(winner({ taylor: 0.5, fourier: 0.1, network: 0.3 }), 'fourier');
  assert.equal(winner({ taylor: null, fourier: 0.4, network: 0.3 }), 'network');
  assert.equal(winner({ taylor: Infinity, fourier: NaN, network: 2 }), 'network');
  assert.equal(winner({ taylor: null, fourier: null, network: null }), null);
  assert.equal(winner({ taylor: 0, fourier: 0.1, network: 0.3 }), 'taylor');
});

test('the contrasts that make the showdown: Fourier exact on a wiggle, Taylor exact on a line, neither Taylor series for a corner or a jump', () => {
  const half = TARGETS.wiggle.half;
  const fourier = fourierBest(TARGETS.wiggle.f, half, 12);
  assert.ok(rms(TARGETS.wiggle.f, x => fourierEval(fourier, half, x), half) < 1e-6);
  const taylor = taylorTerms(TARGETS.wiggle, 12);
  assert.ok(rms(TARGETS.wiggle.f, x => taylorEval(taylor, x), half) > 1);
  const line = taylorTerms(TARGETS.line, 12);
  assert.equal(rms(TARGETS.line.f, x => taylorEval(line, x), TARGETS.line.half), 0);
  const lineFourier = fourierBest(TARGETS.line.f, TARGETS.line.half, 12);
  assert.ok(rms(TARGETS.line.f, x => fourierEval(lineFourier, TARGETS.line.half, x), TARGETS.line.half) > 0.1, 'Fourier struggles with a line (the jump where the period repeats)');
  assert.equal(taylorTerms(TARGETS.abs, 12), null);
});
