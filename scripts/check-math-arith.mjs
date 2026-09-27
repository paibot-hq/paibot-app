import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARITH_SETS } from '../src/lib/math-arith-sets.ts';
import { SIGNED_SETS } from '../src/lib/math-signed-sets.ts';

// Problems are LLM-generated, so the answer key is never trusted: every
// expression is parsed and evaluated here, independently of the app, and the
// only choice equal to the result must be the one marked correct.
// Word problems are additionally reviewed by a second model (see CLAUDE.md);
// this script can only check that their expression, not their prose, is right.

// Grammar: expr = term (('+'|'-') term)*; term = factor (('*'|'/') factor)*;
// factor = integer | '(' expr ')' | '(' '-' integer ')'. Negative literals must be
// parenthesized, matching how they are displayed. Returns the value and stats.
export function evaluate(expression) {
  assert.match(expression, /^[0-9+\-*/() ]+$/, `Unexpected character in ${expression}`);
  const tokens = expression.match(/\d+|[+\-*/()]/g);
  let at = 0;
  const stats = { operators: new Set(), operations: 0, negatives: 0, parentheses: 0, numbers: [], negativeStep: false };
  const peek = () => tokens[at];
  const take = expected => {
    const token = tokens[at++];
    if (expected !== undefined) assert.equal(token, expected, `Expected ${expected} in ${expression}`);
    return token;
  };
  const number = () => {
    const token = take();
    assert.match(token ?? '', /^\d+$/, `Expected a number in ${expression}`);
    assert.ok(token === '0' || !token.startsWith('0'), `Leading zero in ${expression}`);
    return Number(token);
  };
  function factor() {
    if (peek() !== '(') { const value = number(); stats.numbers.push(value); return value; }
    take('(');
    if (peek() === '-') {
      take('-');
      const value = -number();
      take(')');
      stats.negatives++; stats.numbers.push(value);
      return value;
    }
    stats.parentheses++;
    const value = expr();
    take(')');
    return value;
  }
  function term() {
    let value = factor();
    while (peek() === '*' || peek() === '/') {
      const operator = take();
      const right = factor();
      stats.operators.add(operator); stats.operations++;
      if (operator === '*') value *= right;
      else {
        assert.notEqual(right, 0, `Division by zero in ${expression}`);
        // `===`, not assert.equal: -18 % 3 is -0, which assert.equal treats as unequal to 0.
        assert.ok(value % right === 0, `${value} / ${right} is not exact in ${expression}`);
        value /= right;
      }
    }
    return value;
  }
  function expr() {
    let value = term();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = term();
      stats.operators.add(operator); stats.operations++;
      value = operator === '+' ? value + right : value - right;
      if (value < 0) stats.negativeStep = true;
    }
    return value;
  }
  const value = expr();
  assert.equal(at, tokens.length, `Trailing input in ${expression}`);
  assert.ok(Number.isSafeInteger(value), `Non-integer result in ${expression}`);
  return { value: value === 0 ? 0 : value, ...stats };
}

// Set rules use stable catalog IDs, independent of display order.
const onlyOperators = (s, allowed) => [...s.operators].every(operator => allowed.includes(operator));
const SETS = {
  'order-a': (s, word) => !word && s.negatives === 0 && s.numbers.every(n => n >= 1 && n <= 100) && s.operations >= 3 && s.operations <= 4
    && s.operators.size >= 3 && s.parentheses >= 1 && s.value >= 0 && s.value <= 999,
  'four-ops-a': (s, word) => !word && s.negatives >= 1 && s.numbers.every(n => Math.abs(n) <= 50) && s.operations >= 2 && s.operations <= 4
    && Math.abs(s.value) <= 999,
  'word-b': (s, word, position) => (position % 2 === 1) === word && s.negatives === 0 && s.numbers.every(n => n >= 1) && s.operations >= 1 && s.value >= 0,
  'add-sub-a': (s, word) => !word && s.negatives === 0 && !s.negativeStep && s.parentheses === 0 && onlyOperators(s, '+-')
    && s.numbers.every(n => n >= 1 && n <= 100) && s.operations >= 1 && s.operations <= 2 && s.value <= 200,
  'mul-div-a': (s, word) => !word && s.negatives === 0 && s.parentheses === 0 && onlyOperators(s, '*/')
    && s.numbers.every(n => n >= 1 && n <= 81) && s.operations >= 1 && s.operations <= 2 && s.value >= 0 && s.value <= 100,
  'word-a': (s, word) => word && s.negatives === 0 && !s.negativeStep && s.numbers.every(n => n >= 1 && n <= 100)
    && s.operations >= 1 && s.operations <= 2 && s.value >= 0 && s.value <= 500,
};

export function validateBank(bank, catalog = ARITH_SETS) {
  assert.equal(bank.version, 1);
  assert.ok(Array.isArray(bank.problems));
  const ids = new Set();
  const positions = new Set();
  const expressions = new Set();
  let negativeAnswers = 0;
  for (const problem of bank.problems) {
    const { id, setId, position, expression, word, choices, answerIndex } = problem;
    assert.match(id, /^[a-z0-9-]{1,80}$/);
    assert.ok(!ids.has(id), `Duplicate ID: ${id}`); ids.add(id);
    assert.ok(catalog.some(set => set.id === setId) && Object.hasOwn(SETS, setId), `${id}: unknown set`);
    assert.ok(Number.isInteger(position) && position >= 1, `${id}: position`);
    assert.ok(!positions.has(`${setId}:${position}`), `${id}: duplicate position`); positions.add(`${setId}:${position}`);
    assert.equal(typeof problem.published, 'boolean');
    assert.match(problem.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(problem.reviewedAt).toISOString().slice(0, 10), problem.reviewedAt);
    assert.equal(typeof expression, 'string');
    assert.ok(!expressions.has(expression.replaceAll(' ', '')), `${id}: duplicate expression`); expressions.add(expression.replaceAll(' ', ''));
    const result = evaluate(expression);
    if (setId === 'four-ops-a' && result.value < 0) negativeAnswers++;
    if (word !== null) {
      for (const locale of ['ja', 'en', 'zh']) {
        const t = word[locale];
        for (const value of [t?.prompt, t?.unit]) assert.ok(typeof value === 'string' && value.trim() && value.length <= 1000, `${id}: word.${locale}`);
      }
    }
    assert.ok(SETS[setId](result, word !== null, position), `${id}: "${expression}" does not fit set ${setId}`);
    assert.ok(Array.isArray(choices) && choices.length === 4 && choices.every(Number.isSafeInteger), `${id}: four integer choices`);
    assert.equal(new Set(choices).size, 4, `${id}: duplicate choices`);
    const correct = choices.map((choice, index) => choice === result.value ? index : -1).filter(index => index >= 0);
    assert.deepEqual(correct, [answerIndex], `${id}: answerIndex ${answerIndex}, but "${expression}" = ${result.value}`);
  }
  if (bank.problems.some(problem => problem.setId === 'four-ops-a')) assert.ok(negativeAnswers >= 2, 'Set four-ops-a needs at least two negative answers');
  return bank;
}
export const bank = validateBank(JSON.parse(readFileSync(new URL('../src/data/math-arith.json', import.meta.url), 'utf8')));
const published = bank.problems.filter(problem => problem.published).length;
console.log(`PASS: ${bank.problems.length} arithmetic problems (${published} published): set rules, exact integer division, answers re-derived by evaluation`);

export const signedBank = validateBank(JSON.parse(readFileSync(new URL('../src/data/math-signed.json', import.meta.url), 'utf8')), SIGNED_SETS);
console.log(`PASS: ${signedBank.problems.length} signed problems (${signedBank.problems.filter(problem => problem.published).length} published): set rules, exact integer division, answers re-derived by evaluation`);
