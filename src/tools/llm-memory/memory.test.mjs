import assert from 'node:assert/strict';
import { BITS, SIZES, verdict, weightGB } from './memory.ts';

// Expected values are written out by hand (parameters × bits ÷ 8), not derived from the code under test.
const table = {
  7: [14, 7, 3.5],
  14: [28, 14, 7],
  32: [64, 32, 16],
  70: [140, 70, 35],
};
for (const size of SIZES) BITS.forEach((bits, i) => assert.equal(weightGB(size, bits), table[size][i], `${size}B at ${bits} bit`));
assert.equal(weightGB(1, 8), 1);
assert.equal(weightGB(0, 4), 0);

// The boundaries: 80% and 100% are inclusive on the lower side.
assert.equal(verdict(12.8, 16), 'fit');
assert.equal(verdict(12.9, 16), 'tight');
assert.equal(verdict(16, 16), 'tight');
assert.equal(verdict(16.1, 16), 'over');
assert.equal(verdict(3.5, 16), 'fit');
assert.equal(verdict(35, 16), 'over');
console.log('llm-memory: ok');
