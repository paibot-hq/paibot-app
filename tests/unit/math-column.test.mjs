import assert from 'node:assert/strict';
import { columnCalculation, parseOperation, worthDrawing } from '../../src/lib/math-column.ts';

// The column layouts (筆算) are worked out digit by digit; check them against the
// arithmetic itself for many numbers, and a few by hand.
const joined = cells => Number(cells.join('') || 0);
const at = (expression) => columnCalculation(expression);

// Addition: the result digits are the sum; a carry is marked above the next column.
let add = at('468 + 275');
assert.deepEqual([add.carries, add.result], [['1', '1', ''], ['7', '4', '3']]);
// Subtraction with borrowing through a zero: 1004 - 368 = 636.
const sub = at('1004 - 368');
assert.deepEqual(sub.adjusted, ['0', '9', '9', '14']);
assert.equal(joined(sub.result), 636);
// Multiplication by one digit (carry above the tens) and by two digits (partial products).
assert.deepEqual(at('24 * 3').carries, ['1', '']);
const times = at('124 * 32');
assert.deepEqual(times.partials.map(joined), [248, 372]);
assert.equal(joined(times.result), 3968);
// Long division: quotient digits above their columns, the rows under the dividend.
const division = at('756 / 28');
assert.deepEqual(division.quotient, ['', '2', '7']);
assert.deepEqual(division.rows.map(row => row.text), ['56', '196', '196', '0']);
assert.deepEqual(at('920 / 23').quotient, ['', '4', '0']);

for (let a = 0; a <= 1300; a += 7) for (const b of [1, 3, 8, 12, 27, 45, 99, 130]) {
  assert.equal(joined(at(`${a} + ${b}`).result), a + b);
  if (a >= b) assert.equal(joined(at(`${a} - ${b}`).result), a - b);
  assert.equal(joined(at(`${a} * ${b}`).result), a * b);
  const q = at(`${a} / ${b}`);
  assert.equal(joined(q.quotient), Math.floor(a / b));
  assert.equal(q.remainder, a % b);
}
assert.equal(at('9 - 4').kind, 'subtract');
assert.equal(at('3 - 8'), null, 'no negative results in a column subtraction');
assert.equal(at('1 / 0'), null);
assert.equal(parseOperation('(3 + 2) * 4'), null);
assert.ok(worthDrawing('468 + 275') && worthDrawing('7 + 5') && !worthDrawing('7 * 8') && !worthDrawing('3 + 4') && worthDrawing('24 / 4') && !worthDrawing('(3 + 2) * 4'));
console.log('PASS: column arithmetic (筆算) layouts agree with the arithmetic');
