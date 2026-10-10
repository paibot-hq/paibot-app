import assert from 'node:assert/strict';
import { pickTest, TEST_SIZE } from '../../src/lib/math-test.ts';

// A seeded random, so the draws are the same on every run.
const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const problems = (items, perItem, tierOf) => Array.from({ length: items }, (_, i) => Array.from({ length: perItem }, (_, k) => ({ id: `p${i}-${k}`, unit: 'u', item: `i${i}`, tier: tierOf(i, k) }))).flat();
const tiers = test => test.map(problem => problem.tier);

// Enough items and every tier: ten problems from ten items, 4 basic, 4 standard, 2 advanced, easiest first.
const rich = problems(20, 5, (i, k) => (k % 3) + 1);
for (let seed = 1; seed < 20; seed++) {
  const test = pickTest(rich, seeded(seed));
  assert.equal(test.length, TEST_SIZE);
  assert.equal(new Set(test.map(problem => problem.item)).size, TEST_SIZE, 'a different item for each problem');
  assert.deepEqual(tiers(test), [1, 1, 1, 1, 2, 2, 2, 2, 3, 3]);
}
// A year without advanced problems makes them up from the others.
const noAdvanced = problems(20, 5, (i, k) => (k % 2) + 1);
assert.deepEqual(tiers(pickTest(noAdvanced, seeded(3))).filter(tier => tier === 3), []);
assert.equal(pickTest(noAdvanced, seeded(3)).length, TEST_SIZE);
// A year with fewer items than problems repeats items, never problems.
const few = pickTest(problems(5, 5, () => 2), seeded(7));
assert.equal(few.length, TEST_SIZE);
assert.equal(new Set(few.map(problem => problem.id)).size, TEST_SIZE);
assert.equal(new Set(few.map(problem => problem.item)).size, 5);
// Different draws differ.
assert.notDeepEqual(pickTest(rich, seeded(1)).map(problem => problem.id), pickTest(rich, seeded(2)).map(problem => problem.id));
console.log('PASS: a year\'s test draws ten problems from different items, by tier, easiest first');
