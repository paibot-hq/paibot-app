import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRAPH_LIMIT, STEP_LIMIT, nextPoint, pointAt, stopReason } from './gradient-descent.ts';

test('the quadratic gives a slope of 2x and updates in the opposite direction', () => {
  const start = pointAt(3);
  assert.deepEqual(start, { x: 3, value: 9, slope: 6 });
  assert.deepEqual(nextPoint(start, 0.25), { x: 1.5, value: 2.25, slope: 3 });
  assert.equal(nextPoint(pointAt(-3), 0.25).x, -1.5);
});

test('learning rates produce different behavior at the same starting point', () => {
  const start = pointAt(3);
  assert.ok(nextPoint(start, 0.05).x > nextPoint(start, 0.25).x);
  assert.equal(nextPoint(start, 0.5).x, 0);
  assert.equal(nextPoint(start, 0.75).x, -1.5);
  assert.equal(nextPoint(nextPoint(start, 0.75), 0.75).x, 0.75);
  assert.equal(nextPoint(nextPoint(start, 1), 1).x, 3);
  assert.ok(nextPoint(start, 1.1).value > start.value);
  assert.equal(nextPoint(pointAt(0), 1.1).x, 0);
});

test('completion distinguishes an exact minimum, a nearby point, an escape and the step limit', () => {
  assert.equal(stopReason(pointAt(0), 0), 'minimum');
  assert.equal(stopReason(pointAt(0.0005), 10), 'near');
  assert.equal(stopReason(pointAt(GRAPH_LIMIT), 12), null);
  assert.equal(stopReason(pointAt(-GRAPH_LIMIT - 0.1), 12), 'outside');
  assert.equal(stopReason(pointAt(3), STEP_LIMIT), 'limit');
});
