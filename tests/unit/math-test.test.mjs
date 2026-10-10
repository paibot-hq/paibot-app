import assert from 'node:assert/strict';
import { drawTest, pickTest } from '../../src/lib/math-test-draw.ts';

// A seeded random, so the draws are the same on every run.
const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const problems = (items, perItem, tierOf, unit = 'u') => Array.from({ length: items }, (_, i) => Array.from({ length: perItem }, (_, k) => ({ id: `${unit}${i}-${k}`, unit, item: `i${i}`, tier: tierOf(i, k) }))).flat();
const tiers = test => test.map(problem => problem.tier);

// Enough items and every tier: ten problems from ten items, 4 basic, 4 standard, 2 advanced, easiest first.
const rich = problems(30, 5, (i, k) => (k % 3) + 1);
for (let seed = 1; seed < 20; seed++) {
  const test = pickTest(rich, 10, seeded(seed));
  assert.equal(test.length, 10);
  assert.equal(new Set(test.map(problem => problem.item)).size, 10, 'a different item for each problem');
  assert.deepEqual(tiers(test), [1, 1, 1, 1, 2, 2, 2, 2, 3, 3]);
}
// Twenty problems keep the proportions.
assert.deepEqual(tiers(pickTest(rich, 20, seeded(4))).filter(tier => tier === 3).length, 4);
// A year without advanced problems makes them up from the others.
const noAdvanced = problems(20, 5, (i, k) => (k % 2) + 1);
assert.deepEqual(tiers(pickTest(noAdvanced, 10, seeded(3))).filter(tier => tier === 3), []);
assert.equal(pickTest(noAdvanced, 10, seeded(3)).length, 10);
// A year with fewer items than problems repeats items, never problems.
const few = pickTest(problems(5, 5, () => 2), 10, seeded(7));
assert.equal(few.length, 10);
assert.equal(new Set(few.map(problem => problem.id)).size, 10);
assert.equal(new Set(few.map(problem => problem.item)).size, 5);
// Different draws differ.
assert.notDeepEqual(pickTest(rich, 10, seeded(1)).map(problem => problem.id), pickTest(rich, 10, seeded(2)).map(problem => problem.id));
// A test of parts (a Suken level: 7 from its own years, 3 from those below) draws each part from its own problems.
const own = problems(20, 5, (i, k) => (k % 3) + 1, 'own'), below = problems(20, 5, (i, k) => (k % 3) + 1, 'below');
const level = drawTest({ parts: [{ grades: ['own'], size: 7 }, { grades: ['below'], size: 3 }] }, part => part.grades[0] === 'own' ? own : below, seeded(5));
assert.equal(level.filter(problem => problem.unit === 'own').length, 7);
assert.equal(level.filter(problem => problem.unit === 'below').length, 3);
assert.deepEqual(tiers(level), [...tiers(level)].sort());
console.log('PASS: a test draws its problems from different items, by tier, easiest first, and each part from its own years');
