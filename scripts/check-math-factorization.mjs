import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FACTORIZATION_SETS } from '../src/lib/math-factorization-sets.ts';

// Problems are LLM-generated, so the answer key is never trusted: every choice
// is expanded here and compared with the problem's own x^2 + ax + b.
const expand = ([p, q]) => `${p + q},${p * q}`;
const isRoot = n => Number.isInteger(n) && n !== 0;
const RULES = {
  'trinomial-a': ([p, q]) => [p, q].every(n => Math.abs(n) <= 9) && p !== -q,
  'trinomial-b': ([p, q]) => [p, q].every(n => Math.abs(n) <= 20) && Math.max(Math.abs(p), Math.abs(q)) >= 10 && p !== -q,
  'squares-a': ([p, q]) => q === -p && p >= 2 && p <= 12,
};

export function validateBank(bank, catalog = FACTORIZATION_SETS) {
  assert.equal(bank.version, 1);
  assert.ok(Array.isArray(bank.problems));
  for (const set of catalog) assert.ok(Object.hasOwn(RULES, set.rule), `Unknown rule: ${set.rule}`);
  const ids = new Set();
  const positions = new Set();
  const trinomials = new Set();
  for (const problem of bank.problems) {
    const { id, setId, position, p, q, choices, answerIndex } = problem;
    assert.match(id, /^[a-z0-9-]{1,80}$/);
    assert.ok(!ids.has(id), `Duplicate ID: ${id}`); ids.add(id);
    const set = catalog.find(set => set.id === setId);
    assert.ok(set, `${id}: unknown set`);
    assert.ok(Number.isInteger(position) && position >= 1, `${id}: position`);
    assert.ok(!positions.has(`${setId}:${position}`), `${id}: duplicate position`); positions.add(`${setId}:${position}`);
    assert.equal(typeof problem.published, 'boolean');
    assert.match(problem.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(problem.reviewedAt).toISOString().slice(0, 10), problem.reviewedAt);
    assert.ok(isRoot(p) && isRoot(q), `${id}: p and q must be nonzero integers`);
    assert.ok(RULES[set.rule]([p, q]), `${id}: (${p}, ${q}) is outside set ${setId}`);
    const trinomial = expand([p, q]);
    assert.ok(!trinomials.has(`${setId}:${trinomial}`), `${id}: duplicate trinomial in set`); trinomials.add(`${setId}:${trinomial}`);
    assert.ok(Array.isArray(choices) && choices.length === 4, `${id}: four choices`);
    for (const choice of choices) assert.ok(Array.isArray(choice) && choice.length === 2 && choice.every(isRoot), `${id}: choice ${JSON.stringify(choice)}`);
    // Distinct as factorizations: (x+2)(x+3) and (x+3)(x+2) are the same choice.
    assert.equal(new Set(choices.map(expand)).size, 4, `${id}: two choices expand to the same trinomial`);
    const correct = choices.map((choice, index) => expand(choice) === trinomial ? index : -1).filter(index => index >= 0);
    assert.deepEqual(correct, [answerIndex], `${id}: answerIndex ${answerIndex}, but choices expanding to x^2 + ${p + q}x + ${p * q} are ${JSON.stringify(correct)}`);
  }
  return bank;
}
export const bank = validateBank(JSON.parse(readFileSync(process.env.MATH_BANK_FACTORIZATION || new URL('../src/data/math-factorization.json', import.meta.url), 'utf8')));
const published = bank.problems.filter(problem => problem.published).length;
console.log(`PASS: ${bank.problems.length} factoring problems (${published} published): set ranges, distinct choices, answers re-derived by expansion`);
