import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conditionTex, parseExpression, splitTop } from '../src/lib/math-formula.ts';
import { unitSets, unitsOfKind } from '../src/lib/math-catalog.ts';

// Set rules only, for the formula units: every question, `given` and choice
// must parse in the grammar the page renders (src/lib/math-formula.ts), and the
// question must have the shape its set asks for. The answer key is checked by
// scripts/verify_math.py (SymPy).

// What a question is made of, collected from its parse trees.
export function stats(question) {
  const s = { ops: new Set(), letters: new Set(), numbers: [], decimals: 0, places: 0, groups: 0, sqrts: 0, powers: [], fractions: [], equations: 0, calls: new Set(), consts: new Set(), fractionalPowers: 0, lists: 0 };
  const walk = node => {
    switch (node.type) {
      case 'num': s.numbers.push(Number(node.value)); if (node.value.includes('.')) { s.decimals++; s.places = Math.max(s.places, node.value.split('.')[1].length); } break;
      case 'var': s.letters.add(node.name); break;
      case 'neg': walk(node.arg); break;
      case 'group': s.groups++; walk(node.arg); break;
      case 'const': s.consts.add(node.name); break;
      case 'list': s.lists++; node.items.forEach(walk); break;
      case 'call': s.calls.add(node.name); if (node.name === 'sqrt') s.sqrts++; node.args.forEach(walk); break;
      case 'pow': {
        s.ops.add('^');
        const exp = node.exp.type === 'group' ? node.exp.arg : node.exp;
        if (exp.type === 'num') s.powers.push(Number(exp.value));
        else if (exp.type === 'neg' || (exp.type === 'bin' && exp.op === '/')) s.fractionalPowers++;
        walk(node.base); walk(node.exp); break;
      }
      case 'bin':
        s.ops.add(node.op);
        if (node.op === '/') s.fractions.push({ top: node.left, bottom: node.right });
        walk(node.left); walk(node.right); break;
    }
  };
  for (const equation of question.split(';')) {
    const sides = equation.split('=');
    if (sides.length === 2) s.equations++;
    sides.forEach(side => walk(parseExpression(side)));
  }
  return s;
}

const only = (s, allowed) => [...s.ops].every(op => allowed.includes(op));
const isNumber = node => node.type === 'num';
const gcd = (a, b) => b ? gcd(b, a % b) : a;

// kind, then a predicate on the question's stats (and the problem).
const RULES = {
  'decimal-add-sub-a': ['calc', s => only(s, '+-') && s.decimals >= 1 && s.places <= 2 && !s.letters.size],
  'decimal-mul-div-a': ['calc', s => only(s, '*:') && s.ops.size >= 1 && s.decimals >= 1 && s.places <= 2 && !s.letters.size],
  // Decimals in the tenths place (0.4 + 0.7); whole-number multipliers and divisors (0.6 * 4, 1.2 : 3).
  'decimal-tenths-a': ['calc', s => only(s, '+-') && s.decimals >= 2 && s.places === 1 && !s.letters.size && s.numbers.every(n => n < 100)],
  'decimal-whole-a': ['calc', s => only(s, '*:') && s.ops.size === 1 && s.decimals === 1 && s.numbers.length === 2 && s.places <= 2 && !s.letters.size],
  // Fractions with the same denominator (3/7 + 2/7), the fraction and decimal forms of one number.
  'fraction-like-a': ['calc', s => s.fractions.length >= 2 && (s.ops.has('+') || s.ops.has('-')) && only(s, '+-/') && s.fractions.every(f => isNumber(f.bottom) && Number(f.bottom.value) <= 12 && Number(f.bottom.value) === Number(s.fractions[0].bottom.value)) && !s.letters.size],
  'fraction-decimal-a': ['transform', (s, p) => !s.letters.size && (/^\d+\s*\/\s*\d+$/.test(p.question) || /^\d+\.\d+$/.test(p.question))],
  // Averages: the sum of the values divided by how many there are ((12 + 15 + 18)/3).
  'average-a': ['calc', s => s.ops.has('/') && s.ops.has('+') && only(s, '+/') && s.numbers.length >= 4 && s.numbers.length <= 9 && !s.letters.size],
  'letters-value-a': ['calc', (s, p) => s.letters.size >= 1 && s.letters.size <= 2 && typeof p.given === 'string' && !s.ops.has('^') && !s.ops.has('/') && !s.calls.size],
  'polynomials-a': ['expand', s => s.letters.size >= 1 && s.groups >= 1 && s.powers.every(n => n <= 2)],
  'double-radical-a': ['calc', s => s.sqrts >= 2 && !s.letters.size],
  'expansion-three-a': ['expand', s => s.groups >= 1 && s.letters.size >= 1 && s.letters.size <= 3],
  'ac-method-a': ['factor', (s, p) => s.letters.size === 1 && s.powers.includes(2) && /(^|[-+]\s*)[2-9]\d*\*[a-z]\^2/.test(p.question) && !s.groups],
  'two-variables-a': ['factor', s => s.letters.size === 2 && !s.groups],
  'substitution-a': ['factor', s => s.letters.size === 1 && (s.powers.includes(4) || (s.groups >= 1 && s.powers.includes(2)))],
  'fraction-simplify-a': ['calc', (s, p) => /^\d+ \/ \d+$/.test(p.question) && s.numbers[1] <= 100],
  'fraction-add-sub-a': ['calc', s => s.ops.has('/') && (s.ops.has('+') || s.ops.has('-')) && only(s, '+-/') && s.fractions.every(f => isNumber(f.bottom) && Number(f.bottom.value) <= 24) && !s.letters.size],
  'fraction-mul-div-a': ['calc', s => s.ops.has('/') && (s.ops.has('*') || s.ops.has(':')) && only(s, '*:/') && !s.letters.size],
  'powers-a': ['calc', s => s.ops.has('^') && s.powers.every(n => n >= 2 && n <= 4) && !s.letters.size],
  'expression-value-a': ['calc', (s, p) => s.letters.size >= 1 && typeof p.given === 'string' && !s.ops.has('^')],
  'like-terms-a': ['expand', s => s.letters.size >= 1 && !s.groups && !s.ops.has('^') && only(s, '+-*')],
  'distribute-a': ['expand', s => s.letters.size >= 1 && s.groups >= 1 && !s.ops.has('^')],
  'linear-basic-a': ['solve', s => s.equations === 1 && s.letters.size === 1 && !s.groups && !s.ops.has('/') && !s.ops.has('^')],
  'linear-parentheses-a': ['solve', s => s.equations === 1 && s.letters.size === 1 && s.groups >= 1 && !s.ops.has('^')],
  'linear-fraction-a': ['solve', s => s.equations === 1 && s.letters.size === 1 && (s.ops.has('/') || s.decimals >= 1) && !s.ops.has('^')],
  'simultaneous-elimination-a': ['solve', s => s.equations === 2 && s.letters.size === 2 && !s.ops.has('^')],
  'simultaneous-substitution-a': ['solve', s => s.equations === 2 && s.letters.size === 2 && !s.ops.has('^')],
  'expansion-formulas-a': ['expand', s => s.groups >= 2 && s.letters.size >= 1],
  'expansion-square-a': ['expand', s => s.ops.has('^') && s.powers.every(n => n === 2) && s.groups >= 1],
  'expansion-sum-difference-a': ['expand', s => s.groups >= 2 && s.letters.size >= 1],
  'sqrt-simplify-a': ['calc', s => s.sqrts >= 1 && !s.letters.size && only(s, '*/:')],
  'sqrt-add-sub-a': ['calc', s => s.sqrts >= 2 && (s.ops.has('+') || s.ops.has('-')) && !s.letters.size],
  'sqrt-rationalize-a': ['calc', s => s.sqrts >= 1 && s.fractions.some(f => JSON.stringify(f.bottom).includes('"sqrt"')) && !s.letters.size],
  'quadratic-factoring-a': ['solve', s => s.equations === 1 && s.letters.size === 1 && s.powers.includes(2)],
  'quadratic-formula-a': ['solve', s => s.equations === 1 && s.letters.size === 1 && s.powers.includes(2)],
  // 数学II・B
  'binomial-a': ['expand', s => s.groups >= 1 && s.powers.some(n => n >= 4 && n <= 7)],
  'remainder-a': ['remainder', (s, p) => s.letters.size === 1 && Math.max(...s.powers) >= 3 && /^[a-z] [-+] \d+$/.test(p.divisor ?? '')],
  'higher-degree-a': ['solve', s => s.equations === 1 && s.letters.size === 1 && s.powers.some(n => n >= 3 && n <= 4)],
  // (x + 2)^3, or a product that expands to a cubic such as (x + 3)(x^2 - 3x + 9).
  'expansion-cubic-a': ['expand', s => s.groups >= 1 && (s.powers.includes(3) || (s.groups >= 2 && s.powers.includes(2)))],
  'factoring-cubes-a': ['factor', s => s.letters.size >= 1 && s.powers.includes(3) && !s.groups],
  'complex-arithmetic-a': ['calc', s => s.consts.has('i') && !s.letters.size],
  'complex-roots-a': ['solve', (s, p) => s.equations === 1 && s.powers.includes(2) && p.choices.every(c => /(?<![a-z])i(?![a-z])/.test(c))],
  'trig-values-a': ['calc', s => ['sin', 'cos', 'tan'].some(f => s.calls.has(f)) && !s.letters.size],
  'trig-addition-a': ['calc', s => ['sin', 'cos', 'tan'].some(f => s.calls.has(f)) && !s.letters.size],
  'trig-synthesis-a': ['transform', s => s.calls.has('sin') && s.calls.has('cos') && s.letters.size === 1],
  'exponent-a': ['calc', s => s.ops.has('^') && s.fractionalPowers >= 1 && !s.letters.size],
  'log-a': ['calc', s => s.calls.has('log') && !s.letters.size],
  'derivative-polynomial-a': ['derivative', (s, p) => s.letters.size === 1 && !s.calls.size && !p.given],
  'tangent-a': ['tangent', (s, p) => s.letters.size === 1 && !s.calls.size && /^\s*x\s*=/.test(p.given ?? '')],
  'extrema-a': ['extremum', (s, p) => s.letters.size === 1 && !s.calls.size && ['max', 'min'].includes(p.which)],
  'indefinite-a': ['integral', (s, p) => s.letters.size === 1 && !s.calls.size && !p.bounds],
  'definite-a': ['integral', (s, p) => s.letters.size === 1 && !s.calls.size && !!p.bounds],
  'area-a': ['area', (s, p) => s.letters.size === 1 && !s.calls.size && !!p.bounds],
  'sigma-a': ['calc', s => s.calls.has('sum')],
  'arithmetic-a': [['term', 'series'], (s, p) => p.progression === 'arithmetic' && !s.letters.size && !s.calls.size],
  'identity-a': ['identity', s => s.equations === 1 && s.letters.has('x') && s.letters.size >= 3 && s.letters.size <= 4],
  'radian-a': [['radian', 'degree'], s => !s.letters.size],
  'double-angle-a': [['transform', 'calc'], s => ['sin', 'cos', 'tan'].some(name => s.calls.has(name))],
  'common-log-a': ['calc', (s, p) => s.calls.has('log') && p.question.match(/log\(/g).length === (p.question.match(/,\s*10\)/g) ?? []).length],
  'recurrence-a': ['recurrence', s => s.letters.has('a')],
  'random-variables-a': ['distribution', (s, p) => ['mean', 'variance'].includes(p.which)],
  'binomial-dist-a': ['distribution', (s, p) => ['binomialMean', 'binomialVariance', 'binomialProb'].includes(p.which)],
  'normal-a': ['distribution', (s, p) => p.which === 'zscore'],
  'line-a': ['geometry', (s, p) => /^(line-|distance$)/.test(p.which)],
  'circle-a': ['geometry', (s, p) => /^circle-/.test(p.which)],
  'amgm-a': ['inequality', (s, p) => ['amgm-min', 'amgm-equal', 'product-sum'].includes(p.which)],
  'induction-a': ['induction', (s, p) => s.letters.has('k') && s.letters.has('n') && ['base', 'add', 'target', 'combine'].includes(p.which)],
  'estimation-a': ['inference', (s, p) => ['mean-interval', 'ratio-interval'].includes(p.which)],
  'testing-a': ['inference', (s, p) => p.which === 'test-z'],
  'locus-a': ['geometry', (s, p) => /^locus-/.test(p.which)],
  'region-a': ['region', (s, p) => ['in', 'out'].includes(p.which) && s.letters.has('x') && s.letters.has('y')],
  'graph-line-a': ['graph', (s, p) => p.which === 'line' && s.letters.size === 1],
  'graph-parabola-a': ['graph', (s, p) => p.which === 'parabola' && s.letters.size === 1],
  'graph-vertex-a': ['graph', (s, p) => p.which === 'vertex' && s.letters.size === 1],
  'graph-circle-a': ['graph', (s, p) => p.which === 'circle'],
  'graph-region-a': ['graph', (s, p) => p.which === 'region' && /^\s*(y|x\^2 \+ y\^2)\s*;/.test(p.question)],
  'graph-trig-a': ['graph', (s, p) => p.which === 'trig' && s.letters.size === 1 && ['sin', 'cos'].some(name => s.calls.has(name))],
  // B items (中学・小学・数学I/A の続き)
  'divisor-a': ['number', (s, p) => ['divisor-count', 'nth-multiple'].includes(p.which)],
  'gcd-lcm-a': ['number', (s, p) => ['gcd', 'lcm'].includes(p.which)],
  'prime-factor-a': ['number', (s, p) => p.which === 'prime-factorization'],
  'round-a': ['number', (s, p) => /^round-/.test(p.which)],
  'estimate-a': ['number', (s, p) => p.which === 'estimate'],
  'scientific-a': ['number', (s, p) => p.which === 'scientific'],
  'mixed-a': ['number', (s, p) => ['to-improper', 'to-mixed'].includes(p.which) && p.style === 'mixed'],
  'median-range-a': ['stat', (s, p) => ['median', 'range', 'mode'].includes(p.which)],
  'proportion-ratio-a': ['solve', (s, p) => s.equations === 1 && s.letters.size === 1 && s.ops.has(':') && p.style === 'ratio'],
  'box-a': ['solve', (s, p) => s.equations === 1 && s.letters.has('x') && s.letters.size === 1 && !s.ops.has('^') && p.style === 'box'],
  'proportional-a': ['function', (s, p) => ['proportion', 'inverse'].includes(p.which)],
  'rearrange-a': ['rearrange', s => s.equations === 1 && s.letters.size >= 2 && s.letters.size <= 4 && !s.ops.has('^')],
  'slope-a': ['function', (s, p) => ['slope', 'intercept', 'xintercept'].includes(p.which)],
  'two-points-a': ['geometry', (s, p) => p.which === 'line-two-points'],
  'lines-a': ['function', (s, p) => ['intersect-lines', 'rewrite'].includes(p.which)],
  'rate-a': ['function', (s, p) => p.which === 'rate'],
  'parabola-line-a': ['function', (s, p) => p.which === 'intersect-parabola'],
  // 数学I・A の続き
  'ineq-linear-a': ['inequality', (s, p) => p.which === 'solve' && !s.powers.length && !s.calls.has('abs') && s.letters.size === 1],
  'ineq-quadratic-a': ['inequality', (s, p) => p.which === 'solve' && s.powers.includes(2) && s.letters.size === 1],
  'ineq-absolute-a': ['inequality', (s, p) => p.which === 'solve' && s.calls.has('abs')],
  'discriminant-a': ['quadratic', (s, p) => ['discriminant', 'root-count', 'krange'].includes(p.which)],
  'quad-max-min-a': ['quadratic', (s, p) => ['max', 'min', 'max-all', 'min-all'].includes(p.which)],
  'triangle-ratio-a': ['triangle', (s, p) => ['sin', 'cos', 'tan'].includes(p.which)],
  'sine-law-a': ['triangle', (s, p) => p.which === 'sine-law'],
  'cosine-law-a': ['triangle', (s, p) => ['cosine-side', 'cosine-cos'].includes(p.which)],
  'triangle-area-a': ['triangle', (s, p) => p.which === 'triangle-area'],
  'variance-a': ['stat', (s, p) => ['variance', 'std'].includes(p.which)],
  'correlation-a': ['stat', (s, p) => p.which === 'correlation'],
  'euclid-a': ['number', (s, p) => p.which === 'euclid' && Math.min(...s.numbers) >= 100],
  'diophantine-a': ['number', (s, p) => p.which === 'diophantine'],
  'base-n-a': ['number', (s, p) => ['to-base', 'from-base'].includes(p.which)],
  'congruence-a': ['number', (s, p) => ['remainder', 'power-mod'].includes(p.which)],
  'permutation-a': ['calc', s => s.calls.has('P') && !s.letters.size],
  'combination-a': ['calc', s => s.calls.has('C') && !s.letters.size],
  'expectation-a': ['distribution', (s, p) => ['mean', 'variance'].includes(p.which)],
  // Matrices, vectors, complex numbers, limits and calculus beyond the school functions (grammar: lists, det, inv, ...).
  'complex-plane-a': ['calc', s => ['arg', 'abs', 'conj'].some(name => s.calls.has(name)) || (s.consts.has('i') && s.ops.has('^'))],
  'matrix-ops-a': ['calc', s => s.lists >= 2 && !s.calls.size],
  'det2-a': ['calc', (s, p) => s.calls.has('det') && /^det\(\[\[[^\[\]]*\],\s*\[[^\[\]]*\]\]\)$/.test(p.question)],
  'det3-a': ['calc', (s, p) => s.calls.has('det') && [3, 4].includes((p.question.match(/\]\s*,\s*\[/g) ?? []).length + 1)],
  'inverse-a': ['calc', s => s.calls.has('inv')],
  'rref-a': ['calc', s => s.calls.has('rref')],
  'nullity-a': ['calc', s => s.calls.has('nullity')],
  'independence-a': ['calc', s => s.calls.has('rank')],
  'basis-a': ['calc', s => s.calls.has('rank')],
  'rank-a': ['calc', s => s.calls.has('rank') || s.calls.has('nullity')],
  'eigvals-a': ['calc', s => s.calls.has('eigvals')],
  'eigenvector-a': ['eigenvector', s => s.lists >= 1],
  'diagonalize-a': ['calc', s => s.lists >= 2 && s.calls.has('inv')],
  'matrix-rep-a': ['calc', s => s.calls.has('jac')],
  'kernel-image-a': ['calc', s => s.calls.has('nullity') || s.calls.has('rank')],
  'orthogonal-a': ['calc', s => s.calls.has('dot') || s.calls.has('norm')],
  'gram-schmidt-a': ['calc', s => s.calls.has('orth')],
  'vec-components-a': ['calc', s => s.lists >= 1 && !s.calls.has('dot') && !s.calls.has('cross')],
  'vec-dot-a': ['calc', s => s.calls.has('dot') && !s.calls.has('norm')],
  'vec-angle-a': ['calc', s => s.calls.has('dot') && s.calls.has('norm')],
  'vec-space-a': ['calc', (s, p) => s.lists >= 1 && /\[[^\[\]]*,[^\[\]]*,[^\[\]]*\]/.test(p.question)],
  'lim-seq-a': ['calc', (s, p) => s.calls.has('lim') && /,\s*n\s*,\s*oo\)$/.test(p.question)],
  'lim-fn-a': ['calc', (s, p) => s.calls.has('lim') && !/,\s*n\s*,\s*oo\)$/.test(p.question)],
  'transcendental-a': ['derivative', s => ['exp', 'ln', 'sin', 'cos', 'tan'].some(name => s.calls.has(name)) && s.letters.size === 1],
  'chain-rule-a': ['derivative', s => s.letters.size === 1 && (s.groups >= 1 || s.calls.size >= 1)],
  'parametric-a': ['calc', s => s.calls.has('d') && s.ops.has('/')],
  'motion-a': ['calc', (s, p) => s.calls.has('d') && typeof p.given === 'string'],
  'substitution-int-a': ['integral', s => s.letters.size === 1],
  'parts-a': ['integral', s => s.letters.size === 1],
  'improper-a': ['integral', (s, p) => typeof p.bounds === 'string' && /oo/.test(p.bounds)],
  'volume-a': ['calc', s => s.calls.has('vol') || s.calls.has('arc')],
  'series-sum-a': ['calc', (s, p) => s.calls.has('sum') && s.consts.has('oo')],
  'taylor-a': ['calc', s => s.calls.has('taylor')],
  'partial-a': ['calc', (s, p) => s.calls.has('d') && s.letters.size >= 2 && typeof p.given === 'string'],
  'double-a': ['calc', s => s.calls.has('int2')],
  'polar-double-a': ['calc', s => s.calls.has('int2') && s.letters.has('r')],
  'ode-separable-a': ['ode', (s, p) => p.which === 'separable'],
  'ode-linear-a': ['ode', (s, p) => p.which === 'linear'],
  'ode-second-a': ['ode', (s, p) => p.which === 'second'],
  'conic-parabola-a': ['conic', (s, p) => p.which.startsWith('parabola')],
  'conic-ellipse-a': ['conic', (s, p) => /^(ellipse|hyperbola)/.test(p.which)],
  'conic-polar-a': ['conic', (s, p) => /-to-/.test(p.which)],
  'divmod-a': ['divmod', (s, p) => { const [a, b] = p.question.split(',').map(Number); return a >= 10 && b >= 2 && b <= 9 && a <= 99; }],
  'common-factor-a': ['factor', s => s.letters.size >= 1 && s.powers.every(n => n <= 3) && !s.calls.size],
  // Word problems: prose in ja/en/zh and a hidden solving expression (kind calc).
  'pv-100-a': ['calc', (s, p) => !!p.word],
  'pv-10000-a': ['calc', (s, p) => !!p.word],
  'pv-man-a': ['calc', (s, p) => !!p.word],
  'pv-large-a': ['calc', (s, p) => !!p.word],
  'measure-length-a': ['calc', (s, p) => !!p.word],
  'measure-weight-a': ['calc', (s, p) => !!p.word],
  'measure-area-a': ['calc', (s, p) => !!p.word],
  'elapsed-a': ['calc', (s, p) => !!p.word],
  'speed-a': ['calc', (s, p) => !!p.word],
  'per-unit-a': ['calc', (s, p) => !!p.word],
  'simple-proportion-a': ['calc', (s, p) => !!p.word],
  'proportion-a': ['calc', (s, p) => !!p.word],
  'simple-ratio-a': ['calc', (s, p) => !!p.word],
  'percent-a': ['calc', (s, p) => !!p.word],
  'ratio-word-a': ['calc', (s, p) => !!p.word],
  'ratio-simplify-a': ['calc', (s, p) => !!p.word],
  'arrangements-a': ['calc', (s, p) => !!p.word],
  'combinations-a': ['calc', (s, p) => !!p.word],
  'linear-word-a': ['calc', (s, p) => !!p.word],
  'simul-word-a': ['calc', (s, p) => !!p.word],
  'relfreq-a': ['calc', (s, p) => !!p.word],
  'prob-basic-a': ['calc', (s, p) => !!p.word],
  'comb-prob-a': ['calc', (s, p) => !!p.word],
  'independent-a': ['calc', (s, p) => !!p.word],
  'conditional-a': ['calc', (s, p) => !!p.word],
  'population-a': ['calc', (s, p) => !!p.word],
  'sample-estimate-a': ['calc', (s, p) => !!p.word],
  'hypothesis-a': ['calc', (s, p) => !!p.word],
  'venn-a': ['calc', (s, p) => !!p.word],
  'classify-irrational-a': ['classify', (s, p) => ['irrational', 'rational'].includes(p.which)],
  'classify-rational-a': ['classify', (s, p) => p.which === 'rational'],
  'mvt-a': [['mvt', 'calc'], (s, p) => p.kind === 'mvt' || s.calls.has('lim')],
  'sets-a': ['sets', () => true],
  'logic-negation-a': ['logic', (s, p) => ['contrapositive', 'negation'].includes(p.which)],
  'logic-conditions-a': ['logic', (s, p) => p.which === 'necessary'],
  'logic-truth-a': ['logic', (s, p) => p.which === 'truth'],
  'mapping-a': ['mapping', (s, p) => p.which === 'type'],
  'fig-clock': ['figure', (s, p) => ['clock-read'].includes(p.which)],
  'fig-fraction-unit': ['figure', (s, p) => ['fraction-shaded'].includes(p.which)],
  'fig-fraction': ['figure', (s, p) => ['fraction-shaded'].includes(p.which)],
  'fig-rect-area': ['figure', (s, p) => ['rect-area'].includes(p.which)],
  'fig-area': ['figure', (s, p) => ['tri-area', 'para-area', 'trap-area'].includes(p.which)],
  'fig-volume': ['figure', (s, p) => ['cuboid-volume'].includes(p.which)],
  'fig-circumference': ['figure', (s, p) => ['circle-circumference'].includes(p.which)],
  'fig-circle-area': ['figure', (s, p) => ['circle-area'].includes(p.which)],
  'fig-prism-volume': ['figure', (s, p) => ['prism-volume', 'cylinder-volume'].includes(p.which)],
  'fig-angle-sum': ['figure', (s, p) => ['angle-triangle', 'angle-quad'].includes(p.which)],
  'fig-parallel': ['figure', (s, p) => ['parallel-vertical', 'parallel-corresponding', 'parallel-alternate', 'parallel-cointerior'].includes(p.which)],
  'fig-polygon': ['figure', (s, p) => ['polygon-interior-sum', 'polygon-exterior', 'polygon-each-interior'].includes(p.which)],
  'fig-sector': ['figure', (s, p) => ['sector-arc', 'sector-area'].includes(p.which)],
  'fig-solid': ['figure', (s, p) => ['cone-volume', 'sphere-volume', 'sphere-surface'].includes(p.which)],
  'fig-similar': ['figure', (s, p) => ['similar-side', 'similar-area'].includes(p.which)],
  'fig-inscribed': ['figure', (s, p) => ['inscribed-angle', 'inscribed-same-arc', 'inscribed-diameter'].includes(p.which)],
  'fig-power': ['figure', (s, p) => ['power-chord'].includes(p.which)],
  'fig-centroid': ['figure', (s, p) => ['centroid'].includes(p.which)],
  'equivalence-a': ['mapping', (s, p) => p.which === 'relation'],
  'geometric-a': [['term', 'series'], (s, p) => p.progression === 'geometric' && !s.letters.size && !s.calls.size],
};

// A choice parses in the kind's format: an expression; for solve the values
// of the one unknown ("-2, 5") or assignments ("x = 1, y = 2"); for tangent "y = ...".
function checkChoice(kind, choice, id, which) {
  assert.ok(typeof choice === 'string' && choice.trim() && choice.length <= 200, `${id}: choice`);
  if (kind === 'geometry' && /^line-/.test(which)) { assert.match(choice, /^\s*y\s*=/, `${id}: line choices are "y = ..."`); parseExpression(choice.split('=')[1]); return; }
  if ((kind === 'inequality' && which === 'solve') || (kind === 'quadratic' && which === 'krange')) { for (const chain of splitTop(choice, ',')) { const parts = chain.split(/(<=|>=|<|>)/).map(part => part.trim()); assert.ok(parts.length >= 3 && parts.length % 2 === 1, `${id}: "${chain}" is a chain of relations`); parts.filter((part, index) => index % 2 === 0).forEach(part => parseExpression(part)); } return; }
  if (kind === 'number' && which === 'diophantine') { const parts = splitTop(choice, ','); assert.equal(parts.length, 2, `${id}: diophantine choices are "x, y"`); parts.forEach(part => parseExpression(part)); return; }
  if (kind === 'number' && which === 'to-base') { assert.match(choice.trim(), /^\d+$/, `${id}: a numeral in the new base`); return; }
  if (kind === 'function' && ['proportion', 'inverse', 'rewrite'].includes(which)) { assert.match(choice, /^\s*y\s*=/, `${id}: function choices are "y = ..."`); parseExpression(choice.split('=')[1]); return; }
  if (kind === 'function' && ['intersect-lines', 'intersect-parabola'].includes(which)) { const parts = splitTop(choice, ','); assert.ok(parts.length === 2, `${id}: choices are two numbers "a, b"`); parts.forEach(part => parseExpression(part)); return; }
  if (kind === 'sets') { const parts = splitTop(choice, ','); parts.forEach(part => assert.match(part.trim(), /^-?\d+$/, `${id}: a set holds whole numbers`)); return; }
  if (kind === 'logic' && (which === 'contrapositive' || which === 'negation')) { conditionTex(choice); return; }
  if (kind === 'logic' && which === 'necessary') { assert.ok(['sufficient', 'necessary', 'both', 'neither'].includes(choice), `${id}: a label`); return; }
  if (kind === 'logic' && which === 'truth') { assert.match(choice, /^[TF]\s*,\s*[TF]\s*,\s*[TF]\s*,\s*[TF]$/, `${id}: four T/F values`); return; }
  if (kind === 'mapping') { assert.ok(['injective', 'surjective', 'bijective', 'neither', 'reflexive', 'symmetric', 'transitive', 'equivalence'].includes(choice), `${id}: a label`); return; }
  if (kind === 'figure') { if (which === 'clock-read' || which === 'centroid') { const parts = splitTop(choice, ','); assert.equal(parts.length, 2, `${id}: choices are "a, b"`); parts.forEach(part => parseExpression(part)); return; } parseExpression(choice); return; }
  if (kind === 'divmod') { const parts = splitTop(choice, ','); assert.equal(parts.length, 2, `${id}: divmod choices are "q, r"`); parts.forEach(part => assert.match(part.trim(), /^\d+$/, `${id}: whole numbers`)); return; }
  if (kind === 'conic') {
    if (['parabola-focus', 'polar-to-xy', 'xy-to-polar'].includes(which)) { const parts = splitTop(choice, ','); assert.equal(parts.length, 2, `${id}: choices are points "a, b"`); parts.forEach(part => parseExpression(part)); return; }
    if (['parabola-directrix', 'parabola-equation'].includes(which)) { const sides = choice.split('='); assert.equal(sides.length, 2, `${id}: choices are equations`); sides.forEach(side => parseExpression(side)); return; }
  }
  if (kind === 'graph') {
    if (which === 'vertex') { const parts = splitTop(choice, ','); assert.equal(parts.length, 2, `${id}: vertex choices are points "h, k"`); parts.forEach(part => parseExpression(part)); return; }
    if (which === 'circle') { const sides = choice.split('='); assert.equal(sides.length, 2, `${id}: circle choices are equations`); sides.forEach(side => parseExpression(side)); return; }
    if (which === 'region') { const parts = splitTop(choice, ';'); assert.equal(parts.length, 3, `${id}: region choices are "lhs; rhs; op"`); assert.ok(['<', '>', '<=', '>='].includes(parts[2].trim()), `${id}: op`); parts.slice(0, 2).forEach(part => parseExpression(part)); return; }
    assert.match(choice, /^\s*y\s*=/, `${id}: graph choices are "y = ..."`); parseExpression(choice.split('=')[1]); return;
  }
  if (kind === 'region') { const parts = splitTop(choice, ','); assert.equal(parts.length, 2, `${id}: region choices are points "x, y"`); parts.forEach(part => parseExpression(part)); return; }
  if (kind === 'inference' && /interval$/.test(which)) { const parts = splitTop(choice, ','); assert.equal(parts.length, 2, `${id}: interval choices are "lo, hi"`); parts.forEach(part => parseExpression(part)); return; }
  if (kind === 'geometry' && /^(circle|locus)-/.test(which)) { const sides = choice.split('='); assert.equal(sides.length, 2, `${id}: circle choices are equations`); sides.forEach(side => parseExpression(side)); return; }
  if (kind === 'identity') { for (const item of splitTop(choice, ',')) { assert.match(item, /^\s*[a-z]\s*=/, `${id}: identity choices are "a = 1, b = 2"`); parseExpression(item.split('=')[1]); } return; }
  if (kind === 'tangent') { assert.match(choice, /^\s*y\s*=/, `${id}: tangent choices are "y = ..."`); parseExpression(choice.split('=')[1]); return; }
  const items = kind === 'solve' ? splitTop(choice, ',') : [choice];
  for (const item of items) parseExpression(item.includes('=') ? item.split('=')[1] : item);
}

// A fraction shown as a choice must be in lowest terms (4/6 would give away nothing but reads as wrong).
function reduced(choice) {
  const match = choice.trim().match(/^-?(\d+) \/ (\d+)$/);
  return !match || gcd(Number(match[1]), Number(match[2])) === 1;
}

export function validateBank(bank, catalog) {
  assert.equal(bank.version, 1);
  assert.ok(Array.isArray(bank.problems));
  for (const set of catalog) assert.ok(set.rule === undefined || Object.hasOwn(RULES, set.rule), `Unknown rule: ${set.rule}`);
  const ids = new Set(), positions = new Set(), questions = new Set();
  for (const problem of bank.problems) {
    const { id, item, setId, position, kind, question, given, choices, answerIndex } = problem;
    assert.match(id, /^[a-z0-9-]{1,80}$/);
    assert.ok(!ids.has(id), `Duplicate ID: ${id}`); ids.add(id);
    const set = catalog.find(set => set.item === item && set.id === setId);
    assert.ok(set, `${id}: unknown set`);
    assert.ok(set.rule, `${id}: set ${setId} is coming soon (no rule yet)`);
    assert.ok(Number.isInteger(position) && position >= 1, `${id}: position`);
    assert.ok(!positions.has(`${item}/${setId}:${position}`), `${id}: duplicate position`); positions.add(`${item}/${setId}:${position}`);
    assert.equal(typeof problem.published, 'boolean');
    assert.ok([1, 2, 3].includes(problem.tier), `${id}: tier 1-3 (basic, standard, advanced)`);
    assert.match(problem.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(problem.reviewedAt).toISOString().slice(0, 10), problem.reviewedAt);
    const [ruleKind, fits] = RULES[set.rule];
    assert.ok([ruleKind].flat().includes(kind), `${id}: kind`);
    assert.ok(typeof question === 'string' && question.length <= 200, `${id}: question`);
    const key = `${kind === 'figure' ? `${problem.which}:` : ''}${question.replaceAll(' ', '')}|${given ?? ''}`;
    assert.ok(!questions.has(key), `${id}: duplicate question`); questions.add(key);
    assert.ok(given === null || (['calc', 'derivative', 'tangent', 'term', 'series', 'recurrence', 'distribution', 'inference', 'sets'].includes(kind) && typeof given === 'string'), `${id}: given`);
    if (given && kind !== 'sets') for (const pair of splitTop(given, ',')) { assert.match(pair, /^\s*[a-z]\s*=/, `${id}: given`); parseExpression(pair.split('=')[1]); }
    // Fields only some kinds have.
    assert.ok((kind === 'remainder') === (problem.divisor !== undefined), `${id}: divisor is for remainder`);
    if (problem.divisor !== undefined) parseExpression(problem.divisor);
    assert.ok(problem.bounds === undefined || ['integral', 'area'].includes(kind), `${id}: bounds are for integral and area`);
    if (kind === 'area') assert.ok(problem.bounds, `${id}: area needs bounds`);
    if (problem.bounds !== undefined) { const parts = splitTop(problem.bounds, ','); assert.equal(parts.length, 2, `${id}: bounds "a, b"`); parts.forEach(part => parseExpression(part)); }
    const variants = { extremum: ['max', 'min'], distribution: ['mean', 'variance', 'binomialMean', 'binomialVariance', 'binomialProb', 'zscore'], geometry: ['line-two-points', 'line-slope', 'line-parallel', 'line-perpendicular', 'circle-center', 'circle-diameter', 'distance', 'locus-equidistant', 'locus-ratio'], inequality: ['amgm-min', 'amgm-equal', 'product-sum', 'solve'], induction: ['base', 'add', 'target', 'combine'], inference: ['mean-interval', 'ratio-interval', 'test-z'], region: ['in', 'out'], classify: ['irrational', 'rational'], sets: ['union', 'intersection', 'difference', 'complement', 'complement-union', 'complement-intersection'], logic: ['contrapositive', 'negation', 'necessary', 'truth'], mapping: ['type', 'relation'], ode: ['separable', 'linear', 'second'], conic: ['parabola-focus', 'parabola-directrix', 'parabola-equation', 'ellipse-c', 'ellipse-major', 'hyperbola-c', 'hyperbola-asymptote', 'polar-to-xy', 'xy-to-polar'], graph: ['line', 'parabola', 'vertex', 'circle', 'region', 'trig'],
      number: ['gcd', 'lcm', 'euclid', 'diophantine', 'to-base', 'from-base', 'remainder', 'power-mod', 'divisor-count', 'nth-multiple', 'prime-factorization', 'round-ones', 'round-ten', 'round-hundred', 'round-thousand', 'round-tenth', 'round-hundredth', 'estimate', 'scientific', 'to-improper', 'to-mixed'],
      figure: ['angle-quad', 'angle-triangle', 'centroid', 'circle-area', 'circle-circumference', 'clock-read', 'cone-volume', 'cuboid-volume', 'cylinder-volume', 'distance', 'fraction-shaded', 'inscribed-angle', 'inscribed-diameter', 'inscribed-same-arc', 'para-area', 'parallel-alternate', 'parallel-cointerior', 'parallel-corresponding', 'parallel-vertical', 'polygon-each-interior', 'polygon-exterior', 'polygon-interior-sum', 'power-chord', 'prism-volume', 'rect-area', 'sector-arc', 'sector-area', 'similar-area', 'similar-side', 'sphere-surface', 'sphere-volume', 'trap-area', 'tri-area'],
      stat: ['median', 'range', 'mode', 'variance', 'std', 'correlation'],
      function: ['proportion', 'inverse', 'slope', 'intercept', 'xintercept', 'rate', 'intersect-lines', 'intersect-parabola', 'rewrite'],
      quadratic: ['discriminant', 'root-count', 'krange', 'max', 'min', 'max-all', 'min-all'],
      triangle: ['sin', 'cos', 'tan', 'sine-law', 'cosine-side', 'cosine-cos', 'triangle-area'] };
    if (kind === 'rearrange') assert.match(problem.which ?? '', /^[a-hj-z]$/, `${id}: which is the letter to solve for`);
    else assert.ok((problem.which !== undefined) === Object.hasOwn(variants, kind), `${id}: which is for the kinds with variants`);
    if (problem.which !== undefined && kind !== 'rearrange') assert.ok(variants[kind].includes(problem.which), `${id}: which`);
    if (kind === 'distribution') assert.ok((problem.which === 'binomialProb') === (given !== null), `${id}: given k is for binomialProb only`);
    if (kind === 'inference') assert.ok((problem.which !== 'test-z') === (given !== null), `${id}: given z is for intervals only`);
    if (kind === 'inference' && given) assert.match(given, /^\s*z\s*=\s*\d+(\.\d+)?\s*$/, `${id}: given "z = 1.96"`);
    if (kind === 'region' || (kind === 'graph' && problem.which === 'region') || (kind === 'inequality' && problem.which === 'solve')) assert.ok(['<', '>', '<=', '>='].includes(splitTop(question, ';')[2]?.trim()), `${id}: region ends with < > <= >=`);
    if (kind === 'recurrence' && given) assert.match(given, /^\s*n\s*=\s*\d+\s*$/, `${id}: given "n = 5"`);
    const sequence = ['term', 'series'].includes(kind);
    assert.ok(sequence === (problem.progression !== undefined), `${id}: progression is for term and series`);
    if (sequence) { assert.ok(splitTop(question, ',').length >= 3, `${id}: at least three first terms`); if (given) assert.match(given, /^\s*n\s*=\s*\d+\s*$/, `${id}: given "n = 10"`); }
    assert.ok(problem.style === undefined || ['times', 'box', 'ratio', 'mixed'].includes(problem.style), `${id}: style`);
    if (set.rule === 'letters-value-a') assert.equal(problem.style, 'times', `${id}: this set keeps the × sign (style "times")`);
    const which = problem.which;
    const listed = ['distribution', 'geometry', 'recurrence', 'inequality', 'induction', 'inference', 'region', 'graph', 'number', 'stat', 'function', 'quadratic', 'triangle', 'eigenvector', 'ode', 'conic', 'divmod', 'classify', 'mvt', 'sets'].includes(kind);
    const own = ['logic', 'mapping', 'figure'].includes(kind);
    if (kind === 'figure') { const numbers = splitTop(question, ','); assert.ok(numbers.length >= 1 && numbers.length <= 6, `${id}: a few numbers`); numbers.forEach(part => parseExpression(part)); }
    if (kind === 'logic') { for (const part of (problem.which === 'necessary' ? splitTop(question, ';') : [question])) conditionTex(part); }
    if (kind === 'sets') { const parts = splitTop(question, ';'); assert.equal(parts.length, 2, `${id}: sets are "A; B"`); assert.equal(given !== null, /complement/.test(problem.which), `${id}: given is the universe, for complements only`); }
    const s = stats(own ? '0' : kind === 'area' ? question.replace(';', '+') : sequence ? splitTop(question, ',').join(' + ') : listed ? splitTop(question, ';').slice(0, kind === 'region' || (kind === 'graph' && which === 'region') || (kind === 'inequality' && which === 'solve') ? 2 : undefined).flatMap(part => splitTop(part, ',')).join(' + ') : question);
    const expectedEquations = kind === 'solve' ? s.equations >= 1 : kind === 'identity' || kind === 'rearrange' || (kind === 'function' && problem.which === 'rewrite') ? s.equations === 1 : kind === 'conic' && ['parabola-focus', 'parabola-directrix', 'ellipse-c', 'ellipse-major', 'hyperbola-c', 'hyperbola-asymptote'].includes(problem.which) ? s.equations === 1 : s.equations === 0;
    assert.ok(expectedEquations, `${id}: equations`);
    assert.ok(fits(s, problem), `${id}: "${question}" does not fit set ${setId}`);
    assert.ok(Array.isArray(choices) && choices.length === 4, `${id}: four choices`);
    // A word problem: prose in every language and the unit of the answer; its `question` is the hidden solving expression.
    if (problem.word !== undefined) {
      assert.equal(kind, 'calc', `${id}: only calc problems can be word problems`);
      for (const locale of ['ja', 'en', 'zh']) {
        const word = problem.word[locale];
        assert.ok(word && typeof word.prompt === 'string' && word.prompt.length >= 8 && word.prompt.length <= 400 && typeof word.unit === 'string' && word.unit.length <= 16, `${id}: a ${locale} prompt and unit`);
      }
    }
    // The worked solution, required (SymPy checks its mathematics, verify_math.py).
    {
      assert.ok(Array.isArray(problem.steps) && problem.steps.length >= (['ode', 'sets', 'logic', 'mapping', 'figure'].includes(kind) ? 0 : 1) && problem.steps.length <= 6, `${id}: 1 to 6 steps`);
      for (const line of problem.steps) { assert.equal(typeof line, 'string', `${id}: step`); for (const item of splitTop(line, ',')) item.split('=').forEach(side => parseExpression(side)); }
    }
    for (const choice of choices) checkChoice(kind, choice, id, problem.which);
    if (set.rule.startsWith('fraction-')) assert.ok(choices.every(reduced), `${id}: fractions in lowest terms`);
    assert.ok(Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < 4, `${id}: answerIndex`);
  }
  return bank;
}

export const formulaBanks = Object.fromEntries(unitsOfKind('formula').map(unit => {
  const file = process.env[`MATH_BANK_${unit.toUpperCase().replaceAll('-', '_')}`] || new URL(`../src/data/math-${unit}.json`, import.meta.url);
  const unitBank = validateBank(JSON.parse(readFileSync(file, 'utf8')), unitSets(unit));
  console.log(`PASS: ${unitBank.problems.length} ${unit} problems (${unitBank.problems.filter(problem => problem.published).length} published): formula grammar and set rules`);
  return [unit, unitBank];
}));
