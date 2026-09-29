import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unitSets } from '../src/lib/math-catalog.ts';

// Set rules only; the answer key and distinct choices are checked by
// scripts/verify_math.py (SymPy). A trinomial's (a, b) detects duplicates.
const trinomialKey = ([p, q]) => `${p + q},${p * q}`;
const isRoot = n => Number.isInteger(n) && n !== 0;
const RULES = {
  'trinomial-a': ([p, q]) => [p, q].every(n => Math.abs(n) <= 9) && p !== -q,
  'squares-a': ([p, q]) => q === -p && p >= 2 && p <= 12,
  'perfect-square-a': ([p, q]) => p === q && Math.abs(p) >= 1 && Math.abs(p) <= 12,
};

export function validateBank(bank, catalog = unitSets('factorization')) {
  assert.equal(bank.version, 1);
  assert.ok(Array.isArray(bank.problems));
  // Sets without a rule are coming soon and may not hold problems yet.
  for (const set of catalog) assert.ok(set.rule === undefined || Object.hasOwn(RULES, set.rule), `Unknown rule: ${set.rule}`);
  const ids = new Set();
  const positions = new Set();
  const trinomials = new Set();
  for (const problem of bank.problems) {
    const { id, item, setId, position, p, q, choices, answerIndex } = problem;
    assert.match(id, /^[a-z0-9-]{1,80}$/);
    assert.ok(!ids.has(id), `Duplicate ID: ${id}`); ids.add(id);
    const set = catalog.find(set => set.item === item && set.id === setId);
    assert.ok(set, `${id}: unknown set`);
    assert.ok(set.rule, `${id}: set ${setId} is coming soon (no rule yet)`);
    assert.ok(Number.isInteger(position) && position >= 1, `${id}: position`);
    assert.ok(!positions.has(`${item}/${setId}:${position}`), `${id}: duplicate position`); positions.add(`${item}/${setId}:${position}`);
    assert.equal(typeof problem.published, 'boolean');
    assert.ok([1, 2, 3].includes(problem.tier), `${id}: tier 1-3 (basic, standard, advanced)`);
    assert.match(problem.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(problem.reviewedAt).toISOString().slice(0, 10), problem.reviewedAt);
    assert.ok(isRoot(p) && isRoot(q), `${id}: p and q must be nonzero integers`);
    assert.ok(RULES[set.rule]([p, q]), `${id}: (${p}, ${q}) is outside set ${setId}`);
    const trinomial = trinomialKey([p, q]);
    assert.ok(!trinomials.has(`${item}/${setId}:${trinomial}`), `${id}: duplicate trinomial in set`); trinomials.add(`${item}/${setId}:${trinomial}`);
    assert.ok(Array.isArray(choices) && choices.length === 4, `${id}: four choices`);
    for (const choice of choices) assert.ok(Array.isArray(choice) && choice.length === 2 && choice.every(isRoot), `${id}: choice ${JSON.stringify(choice)}`);
    assert.ok(Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < 4, `${id}: answerIndex`);
  }
  return bank;
}
export const bank = validateBank(JSON.parse(readFileSync(process.env.MATH_BANK_FACTORIZATION || new URL('../src/data/math-factorization.json', import.meta.url), 'utf8')));
const published = bank.problems.filter(problem => problem.published).length;
console.log(`PASS: ${bank.problems.length} factoring problems (${published} published): set ranges, no duplicate trinomials`);
