import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from './tax.ts';

test('tax is added to a price without tax, rounded the chosen way', () => {
  assert.deepEqual(calculate(1000, 10, 'floor', 'toIncluded'), { subtotal: 1000, discount: 0, net: 1000, tax: 100, excluded: 1000, included: 1100 });
  assert.equal(calculate(199, 10, 'floor', 'toIncluded').tax, 19);
  assert.equal(calculate(199, 10, 'round', 'toIncluded').tax, 20);
  assert.equal(calculate(191, 10, 'round', 'toIncluded').tax, 19);
  assert.equal(calculate(191, 10, 'ceil', 'toIncluded').tax, 20);
  assert.equal(calculate(100, 8, 'floor', 'toIncluded').included, 108);
});

test('tax is taken out of a price with tax', () => {
  const result = calculate(1100, 10, 'floor', 'toExcluded');
  assert.deepEqual([result.excluded, result.tax, result.included], [1000, 100, 1100]);
  const odd = calculate(1000, 10, 'floor', 'toExcluded');
  assert.equal(odd.excluded, 909);
  assert.equal(odd.tax, 91);
  assert.equal(odd.excluded + odd.tax, odd.included);
  assert.equal(calculate(1000, 10, 'ceil', 'toExcluded').excluded, 910);
  assert.equal(calculate(1080, 8, 'round', 'toExcluded').excluded, 1000);
});

test('a discount is taken off before the tax', () => {
  const result = calculate(2000, 10, 'floor', 'toIncluded', 20);
  assert.deepEqual([result.discount, result.net, result.tax, result.included], [400, 1600, 160, 1760]);
  const yen = calculate(2000, 10, 'floor', 'toIncluded', 0, 300);
  assert.deepEqual([yen.discount, yen.net, yen.included], [300, 1700, 1870]);
  const both = calculate(2000, 10, 'floor', 'toIncluded', 10, 100);
  assert.deepEqual([both.discount, both.net], [300, 1700]);
});

test('a discount never makes the price negative, a percent is kept within 0 to 100, and a big sum has no float error', () => {
  assert.equal(calculate(500, 10, 'floor', 'toIncluded', 0, 9999).included, 0);
  assert.equal(calculate(500, 10, 'floor', 'toIncluded', 150).net, 0);
  assert.equal(calculate(500, 10, 'floor', 'toIncluded', -5).net, 500);
  assert.equal(calculate(123456789, 10, 'floor', 'toIncluded').tax, 12345678);
  assert.equal(calculate(0.1 * 3 * 1000, 10, 'round', 'toIncluded').net, 300);
});

test('the parts always add up', () => {
  for (const amount of [1, 7, 99, 101, 1999, 12345]) for (const rate of [8, 10]) for (const rounding of ['floor', 'round', 'ceil']) for (const direction of ['toIncluded', 'toExcluded']) {
    const r = calculate(amount, rate, rounding, direction, 15, 3);
    assert.equal(r.excluded + r.tax, r.included, `${amount} ${rate} ${rounding} ${direction}`);
    assert.equal(r.subtotal - r.discount, r.net);
  }
});
