import assert from 'node:assert/strict';
import katex from 'katex';
import { expressionTex, parseExpression, solutionTex, statementTex, unknownOf } from '../../src/lib/math-formula.ts';

// Formulas render the way school math writes them, and every rendering is valid TeX.
const cases = {
  '2/3 + 1/4': '\\frac{2}{3} + \\frac{1}{4}',
  '2.4 : 0.6': '2.4 \\div 0.6',
  '2*x + 3*y': '2x + 3y',
  '3*sqrt(2)': '3\\sqrt{2}',
  '2*(x + 3)': '2\\left(x + 3\\right)',
  '(x + 1)/2': '\\frac{x + 1}{2}',
  '(-3)^2': '\\left(-3\\right)^{2}',
  '-3*x': '-3x',
  '4*5': '4 \\times 5',
  '6 / sqrt(3)': '\\frac{6}{\\sqrt{3}}',
};
for (const [text, tex] of Object.entries(cases)) {
  assert.equal(expressionTex(text), tex, text);
  katex.renderToString(tex, { throwOnError: true });
}
assert.equal(statementTex('x + y = 5; x - y = 1'), '\\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases}');
assert.equal(solutionTex('-2, 5', 'x'), 'x = -2,\\ x = 5');
assert.equal(solutionTex('x = 1, y = 2', 'x'), 'x = 1,\\ y = 2');
assert.equal(unknownOf('3*(t - 2) = t + sqrt(4)'), 't');
for (const bad of ['2x', '__import__(1)', '1 +', '2 ** 3', 'π']) assert.throws(() => parseExpression(bad), bad);
console.log('PASS: formula grammar renders school-style TeX and rejects anything else');
