import assert from 'node:assert/strict';
import katex from 'katex';
import { expressionTex, formulaChoiceTex, formulaInstruction, formulaQuestionTex, parseExpression, solutionTex, statementTex, unknownOf } from '../../src/lib/math-formula.ts';

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
  // 数学II・B: functions, constants, fractional exponents, fraction coefficients.
  'sin(pi/6)': '\\sin \\frac{\\pi }{6}',
  '2*cos(x + pi/3)': '2\\cos\\left(x + \\frac{\\pi }{3}\\right)',
  'log(8, 2)': '\\log_{2} 8',
  '8^(2/3)': '8^{\\frac{2}{3}}',
  '(3 + 2*i)*(1 - i)': '\\left(3 + 2i\\right)\\left(1 - i\\right)',
  'C(5, 2)': '{}_{5}\\mathrm{C}_{2}',
  'sum(2*k - 1, k, 1, n)': '\\sum_{k=1}^{n}\\left(2k - 1\\right)',
  'sum(2^k, k, 1, 6)': '\\sum_{k=1}^{6} 2^{k}',
  '(1/3)*x^3 - (1/2)*x^2': '\\frac{1}{3}x^{3} - \\frac{1}{2}x^{2}',
  'sin(x - 3*pi/4)': '\\sin\\left(x - \\frac{3\\pi }{4}\\right)',
  '2*x/3': '\\frac{2x}{3}',
  '1/2 * 3/4': '\\frac{1}{2} \\times \\frac{3}{4}',
  'abs(x - 1)': '\\left|x - 1\\right|',
};
for (const [text, tex] of Object.entries(cases)) {
  assert.equal(expressionTex(text), tex, text);
  katex.renderToString(tex, { throwOnError: true });
}
assert.equal(statementTex('x + y = 5; x - y = 1'), '\\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases}');
assert.equal(solutionTex('-2, 5', 'x'), 'x = -2,\\ x = 5');
assert.equal(solutionTex('x = 1, y = 2', 'x'), 'x = 1,\\ y = 2');
assert.equal(unknownOf('3*(t - 2) = t + sqrt(4)'), 't');
// Each kind's question, choices and instruction line.
const integral = { kind: 'integral', question: '3*x^2 - 2', given: null, bounds: '0, 2', choices: [] };
assert.equal(formulaQuestionTex(integral), '\\int_{0}^{2} \\left(3x^{2} - 2\\right)\\,dx');
assert.equal(formulaQuestionTex({ ...integral, question: '(x - 1)*(x + 2)', bounds: undefined }), '\\int \\left(x - 1\\right)\\left(x + 2\\right)\\,dx');
assert.deepEqual(formulaInstruction(integral), { key: 'definite', tex: {} });
assert.deepEqual(formulaInstruction({ ...integral, bounds: undefined }), { key: 'indefinite', tex: {} });
const area = { kind: 'area', question: 'x^2; x + 2', given: null, bounds: '-1, 2', choices: [] };
assert.equal(formulaQuestionTex(area), 'y = x^{2},\\ y = x + 2');
assert.deepEqual(formulaInstruction(area), { key: 'areaCurves', tex: { a: 'x = -1', b: 'x = 2' } });
const tangent = { kind: 'tangent', question: 'x^2', given: 'x = 1', choices: ['y = 2*x - 1'] };
assert.equal(formulaQuestionTex(tangent), 'y = x^{2}');
assert.equal(formulaChoiceTex(tangent, tangent.choices[0]), 'y = 2x - 1');
assert.deepEqual(formulaInstruction(tangent), { key: 'tangent', tex: { given: 'x = 1' } });
assert.deepEqual(formulaInstruction({ kind: 'remainder', question: 'x^3 + 1', given: null, divisor: 'x - 2', choices: [] }), { key: 'remainder', tex: { divisor: 'x - 2' } });
assert.deepEqual(formulaInstruction({ kind: 'extremum', question: 'x^3 - 3*x', given: null, which: 'max', choices: [] }), { key: 'extremumMax', tex: {} });
for (const tex of [formulaQuestionTex(integral), formulaQuestionTex(area)]) katex.renderToString(tex, { throwOnError: true });
const term = { kind: 'term', progression: 'geometric', question: '3, 6, 12', given: null, choices: ['3*2^(n - 1)'] };
assert.equal(formulaQuestionTex(term), '3,\\ 6,\\ 12,\\ \\ldots');
assert.equal(formulaChoiceTex(term, term.choices[0]), '3 \\cdot 2^{n - 1}');
assert.deepEqual(formulaInstruction(term), { key: 'geometricTerm', tex: { an: 'a_n' } });
assert.deepEqual(formulaInstruction({ ...term, kind: 'series', progression: 'arithmetic', given: 'n = 10' }), { key: 'arithmeticSumAt', tex: { n: '10' } });
assert.deepEqual(formulaInstruction({ ...term, kind: 'series', given: null }), { key: 'geometricSum', tex: { n: 'n', sn: 'S_n' } });
for (const bad of ['sin(1, 2)', 'sum(k, 2, 1, 3)', 'log(8)', '2i']) assert.throws(() => parseExpression(bad), bad);
for (const bad of ['2x', '__import__(1)', '1 +', '2 ** 3', 'π']) assert.throws(() => parseExpression(bad), bad);
console.log('PASS: formula grammar renders school-style TeX and rejects anything else');
