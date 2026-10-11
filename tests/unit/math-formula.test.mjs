import assert from 'node:assert/strict';
import katex from 'katex';
import { evalExpression, expressionTex, inequalityTex, formulaChoiceTex, formulaInstruction, formulaQuestionTex, parseExpression, stepRows, solutionTex, statementTex, unknownOf } from '../../src/lib/math-formula.ts';

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
  // A negative operand keeps its sign visible: 2 * -x is not "2-x".
  'exp(1) - 2': 'e - 2',
  '-2/3': '-\\frac{2}{3}',
  '1*r': 'r',
  'int2(x^2 + y, y, 0, 2, x, 0, 3)': '\\int_{0}^{3}\\int_{0}^{2}\\left(x^{2} + y\\right)\\,dy\\,dx',
  '2 * -x + 3*x': '2 \\times \\left(-x\\right) + 3x',
  'x - -y': 'x - \\left(-y\\right)',
  'a + -b': 'a + \\left(-b\\right)',
  '-x * 3': '-x \\times 3',
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
assert.deepEqual(formulaInstruction({ kind: 'number', which: 'remainder', question: '17, 5', given: null }), { key: 'numberRemainder', tex: { a: '17', m: '5' } });
assert.deepEqual(formulaInstruction({ kind: 'remainder', question: 'x^3 + 1', given: null, divisor: 'x - 2', choices: [] }), { key: 'remainder', tex: { divisor: 'x - 2' } });
assert.deepEqual(formulaInstruction({ kind: 'extremum', question: 'x^3 - 3*x', given: null, which: 'max', choices: [] }), { key: 'extremumMax', tex: {} });
for (const tex of [formulaQuestionTex(integral), formulaQuestionTex(area)]) katex.renderToString(tex, { throwOnError: true });
const term = { kind: 'term', progression: 'geometric', question: '3, 6, 12', given: null, choices: ['3*2^(n - 1)'] };
assert.equal(formulaQuestionTex(term), '3,\\ 6,\\ 12,\\ \\ldots');
assert.equal(formulaChoiceTex(term, term.choices[0]), '3 \\cdot 2^{n - 1}');
assert.deepEqual(formulaInstruction(term), { key: 'geometricTerm', tex: { an: 'a_n' } });
assert.deepEqual(formulaInstruction({ ...term, kind: 'series', progression: 'arithmetic', given: 'n = 10' }), { key: 'arithmeticSumAt', tex: { n: '10' } });
assert.deepEqual(formulaInstruction({ ...term, kind: 'series', given: null }), { key: 'geometricSum', tex: { n: 'n', sn: 'S_n' } });
// 数学II・B kinds: each question and choice renders, and the instruction line is keyed by its variant.
const has = (p, key) => assert.equal(formulaInstruction(p).key, key);
const radian = { kind: 'radian', question: '150', given: null, choices: ['5*pi/6'] };
assert.equal(formulaQuestionTex(radian), '150^{\\circ}');
const degree = { kind: 'degree', question: '5*pi/6', given: null, choices: ['150'] };
assert.equal(formulaChoiceTex(degree, '150'), '150^{\\circ}');
const recurrence = { kind: 'recurrence', question: '2; 3*a - 1', given: 'n = 5', choices: [] };
assert.equal(formulaQuestionTex(recurrence), 'a_{1} = 2,\\ a_{n+1} = 3a_{n} - 1');
assert.deepEqual(formulaInstruction(recurrence), { key: 'recurrenceAt', tex: { n: '5' } });
has({ ...recurrence, given: null }, 'recurrence');
const mean = { kind: 'distribution', which: 'mean', question: '1, 2, 3; 1/2, 1/3, 1/6', given: null, choices: [] };
assert.match(formulaQuestionTex(mean), /^\\begin\{array\}\{c\|ccc\} X & 1 & 2 & 3/);
has(mean, 'meanTable');
assert.equal(formulaQuestionTex({ kind: 'distribution', which: 'zscore', question: '76, 60, 8', given: null }), 'X \\sim N\\left(60, 8^{2}\\right),\\ X = 76');
assert.deepEqual(formulaInstruction({ kind: 'distribution', which: 'binomialProb', question: '4, 1/2', given: 'k = 2' }), { key: 'binomialProb', tex: { k: '2' } });
const circle = { kind: 'geometry', which: 'circle-center', question: '2, -3; 5', given: null, choices: [] };
assert.equal(formulaQuestionTex(circle), 'C\\left(2, -3\\right),\\ r = 5');
assert.equal(formulaChoiceTex(circle, '(x - 2)^2 + (y + 3)^2 = 25'), '\\left(x - 2\\right)^{2} + \\left(y + 3\\right)^{2} = 25');
has(circle, 'circleCenter');
assert.equal(formulaChoiceTex({ kind: 'geometry', which: 'line-slope', question: '' }, 'y = 3*x - 1'), 'y = 3x - 1');
assert.equal(formulaQuestionTex({ kind: 'geometry', which: 'distance', question: '3, -4, 5; 2, 1', given: null }), '\\ell: 3x - 4y + 5 = 0,\\ P\\left(2, 1\\right)');
has({ kind: 'geometry', which: 'line-two-points', question: '', given: null }, 'lineTwoPoints');
assert.equal(formulaQuestionTex({ kind: 'identity', question: 'a*(x + 1) + b*(x - 2) = 3*x + 3', given: null }), 'a\\left(x + 1\\right) + b\\left(x - 2\\right) = 3x + 3');
assert.equal(expressionTex('sin(x)^2'), '\\sin^{2} x');
assert.equal(expressionTex('2*cos(x/2)^2'), '2\\cos^{2} \\frac{x}{2}');

// Proof, statistics, region and locus kinds.
assert.equal(formulaQuestionTex({ kind: 'induction', which: 'add', question: '3*k - 1; n*(3*n + 1)/2', given: null }), '\\sum_{k=1}^{n} \\left(3k - 1\\right) = \\frac{n\\left(3n + 1\\right)}{2}');
has({ kind: 'induction', which: 'combine', question: 'k; n' }, 'inductionCombine');
assert.equal(formulaQuestionTex({ kind: 'inference', which: 'mean-interval', question: '50, 10, 100', given: 'z = 1.96' }), '\\bar{x} = 50,\\ \\sigma = 10,\\ n = 100');
assert.deepEqual(formulaInstruction({ kind: 'inference', which: 'ratio-interval', question: '0.4, 600', given: 'z = 1.96' }), { key: 'ratioInterval', tex: { z: '1.96' } });
assert.equal(formulaChoiceTex({ kind: 'inference', which: 'mean-interval', question: '' }, '48.04, 51.96'), '\\left[48.04,\\ 51.96\\right]');
assert.equal(formulaQuestionTex({ kind: 'region', which: 'in', question: 'x + 2*y; 4; >=', given: null }), 'x + 2y \\ge 4');
assert.equal(formulaChoiceTex({ kind: 'region', which: 'in', question: '' }, '1, -2'), '\\left(1, -2\\right)');
has({ kind: 'region', which: 'out', question: '' }, 'regionOut');
assert.equal(formulaQuestionTex({ kind: 'geometry', which: 'locus-ratio', question: '1, 0; 4, 0; 1, 2', given: null }), 'A\\left(1, 0\\right),\\ B\\left(4, 0\\right),\\ \\mathrm{PA} : \\mathrm{PB} = 1 : 2');
has({ kind: 'geometry', which: 'locus-equidistant', question: '' }, 'locusEquidistant');
has({ kind: 'inequality', which: 'amgm-min', question: 'x + 4/x' }, 'amgmMin');
assert.equal(formulaQuestionTex({ kind: 'inequality', which: 'product-sum', question: '16', given: null }), 'a b = 16');

// Graph problems: the question is the hidden drawing, the choices are what is shown.
assert.equal(formulaQuestionTex({ kind: 'graph', which: 'parabola', question: 'x^2 - 2*x - 3' }), '');
has({ kind: 'graph', which: 'parabola', question: '' }, 'graphParabola');
assert.equal(formulaChoiceTex({ kind: 'graph', which: 'line', question: '' }, 'y = 2*x - 1'), 'y = 2x - 1');
assert.equal(formulaChoiceTex({ kind: 'graph', which: 'vertex', question: '' }, '1, -4'), '\\left(1, -4\\right)');
assert.equal(formulaChoiceTex({ kind: 'graph', which: 'region', question: '' }, 'y; x^2 - 1; >='), 'y \\ge x^{2} - 1');
assert.equal(inequalityTex('x^2 + y^2; 9; <'), 'x^{2} + y^{2} < 9');
assert.equal(evalExpression('x^2 - 2*x - 3', { x: 4 }), 5);
assert.ok(Math.abs(evalExpression('2*sin(x)', { x: Math.PI / 2 }) - 2) < 1e-12);
assert.ok(Number.isNaN(evalExpression('sqrt(x)', { x: -1 })) && Number.isNaN(evalExpression('x + z', { x: 1 })));


// Grade 6 keeps the × sign (style times): 4 × x + 7, not 4x + 7.
assert.equal(formulaQuestionTex({ kind: 'calc', question: '4*x + 7', given: 'x = 3', style: 'times' }), '4 \\times x + 7');
assert.equal(formulaQuestionTex({ kind: 'calc', question: '4*x + 7', given: 'x = 3' }), '4x + 7');
assert.deepEqual(stepRows('4*3 + 7 = 19', 'times').flat(), ['4 \\times 3', '+ 7', '= 19']);
// □ for x, ratios, and mixed numbers.
assert.equal(formulaQuestionTex({ kind: 'solve', question: 'x + 5 = 12', given: null, style: 'box' }), '\\square + 5 = 12');
assert.equal(formulaQuestionTex({ kind: 'solve', question: 'x : 4 = 6 : 8', given: null, style: 'ratio' }), 'x : 4 = 6 : 8');
assert.equal(formulaQuestionTex({ kind: 'transform', question: '2 + 3/5', given: null, style: 'mixed' }), '2\\frac{3}{5}');
assert.equal(formulaQuestionTex({ kind: 'transform', question: '2 + 3/5', given: null }), '2 + \\frac{3}{5}');

// Worked-solution lines: rows of pieces, a chain "a = b = c" continuing on its own row.
assert.deepEqual(stepRows('2/3 + 1/4 = 8/12 + 3/12 = 11/12'), [['\\frac{2}{3}', '+ \\frac{1}{4}', '= \\frac{8}{12}', '+ \\frac{3}{12}'], ['= \\frac{11}{12}']]);
assert.deepEqual(stepRows('x = 2, x = -2'), [['x', '= 2'], ['x', '= -2']]);
assert.deepEqual(stepRows('x^2 + 5*x - 6'), [['x^{2}', '+ 5x', '- 6']]);
for (const row of stepRows('(a + b)^5 = a^5 + 5*a^4*b - b^5 = 1')) for (const piece of row) katex.renderToString(piece, { throwOnError: true });
for (const bad of ['sin(1, 2)', 'sum(k, 2, 1, 3)', 'log(8)', '2i']) assert.throws(() => parseExpression(bad), bad);
for (const bad of ['2x', '__import__(1)', '1 +', '2 ** 3', 'π']) assert.throws(() => parseExpression(bad), bad);
console.log('PASS: formula grammar renders school-style TeX and rejects anything else');

// A vertex is found from the equation: the question is the equation (the graph would give the answer away), the other graph problems
// are read from the graph.
{
  const vertex = { kind: 'graph', which: 'vertex', question: 'x^2 - 4*x + 1', choices: ['2, -3'] };
  assert.equal(formulaQuestionTex(vertex), 'y = x^{2} - 4x + 1');
  assert.equal(formulaInstruction(vertex).key, 'vertexOfQuadratic');
  assert.equal(formulaQuestionTex({ kind: 'graph', which: 'parabola', question: 'x^2 - 4*x + 1' }), '');
  assert.equal(formulaInstruction({ kind: 'graph', which: 'parabola', question: 'x^2' }).key, 'graphParabola');
}
