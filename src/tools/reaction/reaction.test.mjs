import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BINS, MAX_MS, MIN_MS, average, binOf, distributionFrom, isKeptResult, topPercent } from './reaction.ts';

test('a round is the rounded average of its reactions', () => {
  assert.equal(average([200, 210, 220, 230, 241]), 220);
  assert.equal(average([250]), 250);
});

test('only plausible averages are kept', () => {
  assert.ok(isKeptResult(MIN_MS) && isKeptResult(MAX_MS) && isKeptResult(250));
  for (const ms of [99, 1001, 250.5, NaN, Infinity, '250', null]) assert.ok(!isKeptResult(ms), String(ms));
});

test('results fall into 10 ms bins from 100 ms, the last holding 600 ms and over', () => {
  assert.equal(BINS, 51);
  assert.equal(binOf(100), 0);
  assert.equal(binOf(109), 0);
  assert.equal(binOf(110), 1);
  assert.equal(binOf(599), 49);
  assert.equal(binOf(600), 50);
  assert.equal(binOf(1000), 50);
});

test('the histogram has every bin, and its total is the sum', () => {
  const d = distributionFrom([{ bin: 12, count: 3 }, { bin: 50, count: 2 }, { bin: 80, count: 1 }]);
  assert.equal(d.counts.length, BINS);
  assert.equal(d.counts[12], 3);
  assert.equal(d.counts[50], 3, 'anything past the last bin is in it');
  assert.equal(d.total, 6);
  assert.deepEqual(distributionFrom([]), { counts: Array(BINS).fill(0), total: 0 });
  // A bin that comes back as a fraction (a division done in reals) still lands in a bin and is counted.
  assert.equal(distributionFrom([{ bin: 7.3, count: 2 }]).counts[7], 2);
  assert.equal(distributionFrom([{ bin: 7.3, count: 2 }]).total, 2);
});

test('the top percentage counts this result among the faster ones, and is never 0%', () => {
  assert.equal(topPercent(0, 1), 100, 'alone, you are the whole of it');
  assert.equal(topPercent(0, 200), 1, 'the fastest of 200');
  assert.equal(topPercent(49, 100), 50);
  assert.equal(topPercent(99, 100), 100, 'the slowest');
  assert.equal(topPercent(2, 0), 100, 'never over 100%');
});
