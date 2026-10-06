import { test } from 'node:test';
import assert from 'node:assert/strict';
import { split, weighted } from './split.ts';

test('everyone pays the same, rounded up, and a little too much is collected', () => {
  assert.deepEqual(split(10000, 3, 1, 'roundUp'), { each: 3334, organizer: 3334, collected: 10002, difference: 2 });
  assert.deepEqual(split(10000, 3, 100, 'roundUp'), { each: 3400, organizer: 3400, collected: 10200, difference: 200 });
  assert.deepEqual(split(9000, 3, 100, 'roundUp'), { each: 3000, organizer: 3000, collected: 9000, difference: 0 });
});

test('the organizer pays the rest when the others round down', () => {
  assert.deepEqual(split(10000, 3, 100, 'organizer'), { each: 3300, organizer: 3400, collected: 10000, difference: 0 });
  assert.deepEqual(split(10000, 4, 1, 'organizer'), { each: 2500, organizer: 2500, collected: 10000, difference: 0 });
  const odd = split(10001, 3, 1, 'organizer');
  assert.equal(odd.each * 2 + odd.organizer, 10001);
});

test('odd inputs are made sensible: one person, no negative money', () => {
  assert.equal(split(1234, 1, 1, 'roundUp').each, 1234);
  assert.equal(split(1234, 0, 1, 'roundUp').each, 1234);
  assert.equal(split(-5, 2, 1, 'roundUp').collected, 0);
  assert.equal(split(1000.4, 2, 1, 'roundUp').each, 500);
});

test('shares can be unequal', () => {
  const result = weighted(10000, [1, 1, 2], 100);
  assert.deepEqual(result.amounts, [2500, 2500, 5000]);
  assert.equal(result.difference, 0);
  const rounded = weighted(10000, [1, 1, 1], 100);
  assert.deepEqual(rounded.amounts, [3400, 3400, 3400]);
  assert.equal(rounded.difference, 200);
  assert.equal(weighted(1000, [0, 0], 1).difference, -1000);
  assert.equal(weighted(1000, [-1, 3], 1).amounts[0], 0);
});

test('the parts always add up', () => {
  for (const total of [1, 999, 10000, 12345]) for (const people of [1, 2, 3, 7]) for (const unit of [1, 10, 100]) {
    const roundUp = split(total, people, unit, 'roundUp');
    assert.equal(roundUp.collected - total, roundUp.difference);
    assert.ok(roundUp.difference >= 0 && roundUp.difference < unit * people);
    const organizer = split(total, people, unit, 'organizer');
    assert.equal(organizer.each * (people - 1) + organizer.organizer, total);
    assert.ok(organizer.organizer >= organizer.each);
  }
});
