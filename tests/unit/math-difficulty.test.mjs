import assert from 'node:assert/strict';
import { estimateDifficulty } from '../../scripts/lib/math-difficulty.mjs';

const elementary = { stage: 'elementary', kind: 'expression' };
const middle = { stage: 'middle', kind: 'formula' };
assert.equal(estimateDifficulty(elementary, { setId: '1', expression: '7 + 5' }), 1);
assert.equal(estimateDifficulty(elementary, { setId: '2', expression: '7 + 5' }), 2, 'practice 2 is harder');
assert.equal(estimateDifficulty(elementary, { setId: '1', expression: '(12 + 8) * 3 - 20 / 4' }), 2, 'many operations');
assert.equal(estimateDifficulty(elementary, { setId: '1', expression: '(-6) * 4' }), 1, 'a negative literal is not an operation');
assert.equal(estimateDifficulty(middle, { setId: '1', kind: 'solve', question: '2*x + 3 = 7', choices: ['2', '1', '3', '4'], answerIndex: 0 }), 2);
assert.equal(estimateDifficulty(middle, { setId: '1', kind: 'solve', question: 'x + y = 5; x - y = 1', choices: ['x = 3, y = 2', '', '', ''], answerIndex: 0 }), 3, 'a system');
assert.equal(estimateDifficulty({ stage: 'university', kind: 'formula' }, { setId: '3', kind: 'calc', question: 'sqrt(2) + sqrt(8) + sqrt(18)', choices: ['6*sqrt(2)'], answerIndex: 0 }), 5, 'capped at 5');
assert.equal(estimateDifficulty({ stage: 'middle', kind: 'pythagoras' }, { setId: '1', choices: [[2, 13]], answerIndex: 0 }), 3, 'a radical answer');
console.log('PASS: difficulty estimates from level, practice set and extra work, within 1-5');
