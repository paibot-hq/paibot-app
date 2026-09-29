import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseExpression, splitTop } from '../src/lib/math-formula.ts';
import { unitSets, unitsOfKind } from '../src/lib/math-catalog.ts';

// Set rules only, for the formula units: every question, `given` and choice
// must parse in the grammar the page renders (src/lib/math-formula.ts), and the
// question must have the shape its set asks for. The answer key is checked by
// scripts/verify_math.py (SymPy).

// What a question is made of, collected from its parse trees.
export function stats(question) {
  const s = { ops: new Set(), letters: new Set(), numbers: [], decimals: 0, places: 0, groups: 0, sqrts: 0, powers: [], fractions: [], equations: 0, calls: new Set(), consts: new Set(), fractionalPowers: 0 };
  const walk = node => {
    switch (node.type) {
      case 'num': s.numbers.push(Number(node.value)); if (node.value.includes('.')) { s.decimals++; s.places = Math.max(s.places, node.value.split('.')[1].length); } break;
      case 'var': s.letters.add(node.name); break;
      case 'neg': walk(node.arg); break;
      case 'group': s.groups++; walk(node.arg); break;
      case 'const': s.consts.add(node.name); break;
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
  'geometric-a': [['term', 'series'], (s, p) => p.progression === 'geometric' && !s.letters.size && !s.calls.size],
};

// A choice parses in the kind's format: an expression; for solve the values
// of the one unknown ("-2, 5") or assignments ("x = 1, y = 2"); for tangent "y = ...".
function checkChoice(kind, choice, id) {
  assert.ok(typeof choice === 'string' && choice.trim() && choice.length <= 200, `${id}: choice`);
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
    const key = `${question.replaceAll(' ', '')}|${given ?? ''}`;
    assert.ok(!questions.has(key), `${id}: duplicate question`); questions.add(key);
    assert.ok(given === null || (['calc', 'derivative', 'tangent', 'term', 'series'].includes(kind) && typeof given === 'string'), `${id}: given`);
    if (given) for (const pair of splitTop(given, ',')) { assert.match(pair, /^\s*[a-z]\s*=/, `${id}: given`); parseExpression(pair.split('=')[1]); }
    // Fields only some kinds have.
    assert.ok((kind === 'remainder') === (problem.divisor !== undefined), `${id}: divisor is for remainder`);
    if (problem.divisor !== undefined) parseExpression(problem.divisor);
    assert.ok(problem.bounds === undefined || ['integral', 'area'].includes(kind), `${id}: bounds are for integral and area`);
    if (kind === 'area') assert.ok(problem.bounds, `${id}: area needs bounds`);
    if (problem.bounds !== undefined) { const parts = splitTop(problem.bounds, ','); assert.equal(parts.length, 2, `${id}: bounds "a, b"`); parts.forEach(part => parseExpression(part)); }
    assert.ok((kind === 'extremum') === (problem.which !== undefined), `${id}: which is for extremum`);
    const sequence = ['term', 'series'].includes(kind);
    assert.ok(sequence === (problem.progression !== undefined), `${id}: progression is for term and series`);
    if (sequence) { assert.ok(splitTop(question, ',').length >= 3, `${id}: at least three first terms`); if (given) assert.match(given, /^\s*n\s*=\s*\d+\s*$/, `${id}: given "n = 10"`); }
    const s = stats(kind === 'area' ? question.replace(';', '+') : sequence ? splitTop(question, ',').join(' + ') : question);
    assert.ok(kind === 'solve' ? s.equations >= 1 : s.equations === 0, `${id}: equations`);
    assert.ok(fits(s, problem), `${id}: "${question}" does not fit set ${setId}`);
    assert.ok(Array.isArray(choices) && choices.length === 4, `${id}: four choices`);
    for (const choice of choices) checkChoice(kind, choice, id);
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
