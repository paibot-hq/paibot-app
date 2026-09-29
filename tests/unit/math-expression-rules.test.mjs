import assert from 'node:assert/strict';
import { evaluate, RULES } from '../../scripts/validate-math-arith.mjs';

// Each drill rule accepts the kind of problem its set is named for and
// rejects near misses (no carry, wrong size, two operations, remainders).
const fits = (rule, expression) => RULES[rule](evaluate(expression), false);
const cases = {
  'carry-a': [['8 + 7', '15 - 8'], ['3 + 4', '17 - 5', '12 + 3', '8 + 7 - 1']],
  'two-digit-a': [['38 + 45', '72 - 49', '9 + 56'], ['5 + 3', '120 + 5', '20 - 45']],
  'column-a': [['1003 - 478', '356 + 789'], ['99 + 356', '12000 - 500', '478 - 1003']],
  'times-table-a': [['7 * 8', '9 * 6'], ['12 * 3', '7 + 8']],
  'mul-by-one-digit-a': [['243 * 6', '7 * 58'], ['7 * 8', '24 * 16']],
  'mul-by-two-digit-a': [['24 * 16', '312 * 45'], ['243 * 6', '312 * 450']],
  'div-basic-a': [['56 / 8', '42 / 6'], ['60 / 5', '56 / 14']],
  'div-by-two-digit-a': [['672 / 24', '96 / 12'], ['56 / 8', '1200 / 12']],
  'rules-a': [['25 * 7 * 4', '37 * 8 + 63 * 8'], ['25 * 4', '100 / 4 * 2', '37 + 63 + 8']],
};
for (const [rule, [accepted, rejected]] of Object.entries(cases)) {
  for (const expression of accepted) assert.ok(fits(rule, expression), `${rule} should accept ${expression}`);
  for (const expression of rejected) assert.ok(!fits(rule, expression), `${rule} should reject ${expression}`);
}
assert.throws(() => evaluate('7 / 2'), /not exact/);
console.log(`PASS: ${Object.keys(cases).length} drill rules accept their problems and reject near misses`);
