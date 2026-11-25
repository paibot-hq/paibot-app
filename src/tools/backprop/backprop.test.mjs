import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  INITIAL_WEIGHTS, LEARNING_RATE, NUDGE, TARGET, WEIGHT_IDS, X,
  fmt, forward, gradientOf, gradients, nudgedLoss, updated,
} from './backprop.ts';

test('forward recomputes every displayed number from the constants', () => {
  const { a1, h1, a2, h2, y, loss } = forward(INITIAL_WEIGHTS);
  // Independently, term by term.
  assert.equal(a1, 0.75 * 0.8);
  assert.equal(h1, Math.tanh(0.75 * 0.8));
  assert.equal(a2, -0.5 * 0.8);
  assert.equal(h2, Math.tanh(-0.5 * 0.8));
  assert.equal(y, 1.1 * h1 + -0.9 * h2);
  assert.equal(loss, (y - 0.5) ** 2);
  assert.equal(X, 0.8);
  assert.equal(TARGET, 0.5);
});

test('analytic gradients match central finite differences to 1e-6 relative', () => {
  const grads = gradients(INITIAL_WEIGHTS);
  const step = 1e-5;
  for (const id of WEIGHT_IDS) {
    const plus = forward({ ...INITIAL_WEIGHTS, [id]: INITIAL_WEIGHTS[id] + step }).loss;
    const minus = forward({ ...INITIAL_WEIGHTS, [id]: INITIAL_WEIGHTS[id] - step }).loss;
    const numeric = (plus - minus) / (2 * step);
    const analytic = gradientOf(grads, id);
    assert.ok(Math.abs(analytic - numeric) / Math.abs(numeric) < 1e-6, `${id}: ${analytic} vs ${numeric}`);
  }
});

test('the intermediate chain-rule factors are each one local derivative', () => {
  const { h1, h2, y } = forward(INITIAL_WEIGHTS);
  const g = gradients(INITIAL_WEIGHTS);
  assert.equal(g.dy, 2 * (y - TARGET));
  assert.equal(g.dv1, g.dy * h1);
  assert.equal(g.dv2, g.dy * h2);
  assert.equal(g.dh1, g.dy * INITIAL_WEIGHTS.v1);
  assert.equal(g.dh2, g.dy * INITIAL_WEIGHTS.v2);
  assert.equal(g.da1, g.dh1 * (1 - h1 * h1));
  assert.equal(g.da2, g.dh2 * (1 - h2 * h2));
  assert.equal(g.dw1, g.da1 * X);
  assert.equal(g.dw2, g.da2 * X);
});

test('the strings the page prints with fmt', () => {
  const f = forward(INITIAL_WEIGHTS);
  const g = gradients(INITIAL_WEIGHTS);
  assert.deepEqual(
    [f.a1, f.h1, f.a2, f.h2, f.y, f.loss].map(v => fmt(v)),
    ['0.600', '0.537', '−0.400', '−0.380', '0.933', '0.187'],
  );
  assert.deepEqual(
    [g.dy, g.dv1, g.dv2, g.dh1, g.dh2, g.da1, g.da2, g.dw1, g.dw2].map(v => fmt(v)),
    ['0.865', '0.465', '−0.329', '0.952', '−0.779', '0.677', '−0.666', '0.542', '−0.533'],
  );
  assert.equal(fmt(f.loss, 4), '0.1872');
  assert.equal(fmt(forward(updated(INITIAL_WEIGHTS)).loss, 4), '0.0529');
  // The minus is U+2212, and a rounded zero never keeps a sign.
  assert.equal(fmt(-0.5), '−0.500');
  assert.equal(fmt(-0.00004), '0.000');
});

test('step 3: nudging a weight by 0.01 changes the loss by about gradient × 0.01', () => {
  const base = forward(INITIAL_WEIGHTS).loss;
  const grads = gradients(INITIAL_WEIGHTS);
  for (const id of WEIGHT_IDS) {
    const actual = nudgedLoss(INITIAL_WEIGHTS, id) - base;
    const predicted = gradientOf(grads, id) * NUDGE;
    assert.ok(Math.abs(actual - predicted) < 1e-4, `${id}: ${actual} vs ${predicted}`);
    // And the page's five-decimal strings agree to the last digit ± rounding.
    assert.ok(Math.abs(Number(fmt(actual, 5).replace('−', '-')) - Number(fmt(predicted, 5).replace('−', '-'))) < 1e-4, id);
  }
});

test('step 4: one update with the shown learning rate lowers the loss', () => {
  const before = forward(INITIAL_WEIGHTS).loss;
  const next = updated(INITIAL_WEIGHTS);
  const grads = gradients(INITIAL_WEIGHTS);
  assert.equal(next.w1, INITIAL_WEIGHTS.w1 - LEARNING_RATE * grads.dw1);
  assert.equal(next.v2, INITIAL_WEIGHTS.v2 - LEARNING_RATE * grads.dv2);
  const after = forward(next).loss;
  assert.ok(after < before, `${after} < ${before}`);
  assert.ok(after < before / 2, 'the drop is visible, not marginal');
});
