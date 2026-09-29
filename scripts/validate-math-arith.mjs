import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARITH_SETS } from '../src/lib/math-arith-sets.ts';
import { SIGNED_SETS } from '../src/lib/math-signed-sets.ts';
import { EXPRESSION_UNITS, expressionUnitSets } from '../src/lib/math-expression-units.ts';

// Set rules only: the expression is parsed here for its shape (operators,
// negatives, exact division) and value range. The answer key is checked by
// scripts/verify_math.py (SymPy), like every other unit's.
// Word problems are additionally reviewed by a second model (see CLAUDE.md).

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

// One operation on non-negative literals, no parentheses: the elementary
// addition/multiplication/division drills. `ok` gets the operator and both numbers.
const single = ops => ok => (s, word) => !word && s.operations === 1 && s.parentheses === 0 && s.negatives === 0
  && ops.includes([...s.operators][0]) && ok([...s.operators][0], ...s.numbers, s.value);
const within = (n, low, high) => Number.isInteger(n) && n >= low && n <= high;

// Rules can be shared by multiple practice sets.
export const RULES = {
  // Carrying (8 + 7) or borrowing (15 - 8) across ten with one-digit numbers.
  'carry-a': single('+-')((op, a, b, value) => op === '+'
    ? within(a, 1, 9) && within(b, 1, 9) && value >= 10
    : within(a, 11, 18) && within(b, 2, 9) && a % 10 < b),
  'two-digit-a': single('+-')((op, a, b, value) => within(a, 1, 99) && within(b, 1, 99) && Math.max(a, b) >= 10 && value >= 0),
  'column-a': single('+-')((op, a, b, value) => within(a, 100, 9999) && within(b, 100, 9999) && value >= 0),
  'times-table-a': single('*')((op, a, b) => within(a, 1, 9) && within(b, 1, 9)),
  'mul-by-one-digit-a': single('*')((op, a, b) => (within(a, 10, 999) && within(b, 2, 9)) || (within(a, 2, 9) && within(b, 10, 999))),
  'mul-by-two-digit-a': single('*')((op, a, b) => (within(a, 10, 999) && within(b, 10, 99)) || (within(a, 10, 99) && within(b, 100, 999))),
  // Exact division is already required by evaluate(); the quotient is the value.
  'div-basic-a': single('/')((op, a, b, value) => within(b, 2, 9) && within(value, 1, 9)),
  'div-by-two-digit-a': single('/')((op, a, b, value) => within(b, 10, 99) && within(value, 2, 99)),
  // Calculation rules: products and sums a clever order makes easy (25 * 7 * 4, 37 * 8 + 63 * 8).
  'rules-a': (s, word) => !word && s.negatives === 0 && !s.operators.has('/') && s.operators.has('*')
    && s.numbers.every(n => n >= 1 && n <= 999) && s.operations >= 2 && s.operations <= 4 && s.value >= 0 && s.value <= 99999,
  'order-a': (s, word) => !word && s.negatives === 0 && s.numbers.every(n => n >= 1 && n <= 100) && s.operations >= 3 && s.operations <= 4
    && s.operators.size >= 3 && s.parentheses >= 1 && s.value >= 0 && s.value <= 999,
  'four-ops-a': (s, word) => !word && s.negatives >= 1 && s.numbers.every(n => Math.abs(n) <= 50) && s.operations >= 2 && s.operations <= 4
    && Math.abs(s.value) <= 999,
  'word-b': (s, word) => word && s.negatives === 0 && !s.negativeStep && s.numbers.every(n => n >= 1) && s.operations >= 2 && s.operations <= 3 && s.value >= 0,
  'word-a': (s, word) => word && s.negatives === 0 && !s.negativeStep && s.numbers.every(n => n >= 1 && n <= 100)
    && s.operations >= 1 && s.operations <= 2 && s.value >= 0 && s.value <= 500,
};

export function validateBank(bank, catalog = ARITH_SETS) {
  assert.equal(bank.version, 1);
  assert.ok(Array.isArray(bank.problems));
  // Sets without a rule are coming soon and may not hold problems yet.
  for (const set of catalog) assert.ok(set.rule === undefined || Object.hasOwn(RULES, set.rule), `Unknown rule: ${set.rule}`);
  const ids = new Set();
  const positions = new Set();
  const expressions = new Set();
  const negativeAnswers = new Map();
  for (const problem of bank.problems) {
    const { id, setId, position, expression, word, choices, answerIndex } = problem;
    assert.match(id, /^[a-z0-9-]{1,80}$/);
    assert.ok(!ids.has(id), `Duplicate ID: ${id}`); ids.add(id);
    const set = catalog.find(set => set.id === setId);
    assert.ok(set, `${id}: unknown set`);
    assert.ok(set.rule, `${id}: set ${setId} is coming soon (no rule yet)`);
    assert.ok(Number.isInteger(position) && position >= 1, `${id}: position`);
    assert.ok(!positions.has(`${setId}:${position}`), `${id}: duplicate position`); positions.add(`${setId}:${position}`);
    assert.equal(typeof problem.published, 'boolean');
    assert.match(problem.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(problem.reviewedAt).toISOString().slice(0, 10), problem.reviewedAt);
    assert.equal(typeof expression, 'string');
    assert.ok(!expressions.has(expression.replaceAll(' ', '')), `${id}: duplicate expression`); expressions.add(expression.replaceAll(' ', ''));
    const result = evaluate(expression);
    if (set.rule === 'four-ops-a' && result.value < 0) negativeAnswers.set(setId, (negativeAnswers.get(setId) ?? 0) + 1);
    if (word !== null) {
      for (const locale of ['ja', 'en', 'zh']) {
        const t = word[locale];
        for (const value of [t?.prompt, t?.unit]) assert.ok(typeof value === 'string' && value.trim() && value.length <= 1000, `${id}: word.${locale}`);
      }
    }
    assert.ok(RULES[set.rule](result, word !== null, position), `${id}: "${expression}" does not fit set ${setId}`);
    assert.ok(Array.isArray(choices) && choices.length === 4 && choices.every(Number.isSafeInteger), `${id}: four integer choices`);
    assert.ok(Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < 4, `${id}: answerIndex`);
  }
  for (const set of catalog.filter(set => set.rule === 'four-ops-a')) {
    if (bank.problems.some(problem => problem.setId === set.id)) assert.ok((negativeAnswers.get(set.id) ?? 0) >= 2, `Set ${set.id} needs at least two negative answers`);
  }
  return bank;
}
export const bank = validateBank(JSON.parse(readFileSync(process.env.MATH_BANK_ARITH || new URL('../src/data/math-arith.json', import.meta.url), 'utf8')));
const published = bank.problems.filter(problem => problem.published).length;
console.log(`PASS: ${bank.problems.length} arithmetic problems (${published} published): set rules, exact integer division`);

export const signedBank = validateBank(JSON.parse(readFileSync(process.env.MATH_BANK_SIGNED || new URL('../src/data/math-signed.json', import.meta.url), 'utf8')), SIGNED_SETS);
console.log(`PASS: ${signedBank.problems.length} signed problems (${signedBank.problems.filter(problem => problem.published).length} published): set rules, exact integer division`);

// Expression units keep one bank per unit (src/data/math-<unit>.json).
export const expressionBanks = Object.fromEntries(EXPRESSION_UNITS.map(unit => {
  const file = process.env[`MATH_BANK_${unit.toUpperCase()}`] || new URL(`../src/data/math-${unit}.json`, import.meta.url);
  const unitBank = validateBank(JSON.parse(readFileSync(file, 'utf8')), expressionUnitSets(unit));
  console.log(`PASS: ${unitBank.problems.length} ${unit} problems (${unitBank.problems.filter(problem => problem.published).length} published): set rules, exact integer division`);
  return [unit, unitBank];
}));
