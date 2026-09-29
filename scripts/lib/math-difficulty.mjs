import { parseExpression } from '../../src/lib/math-formula.ts';

// A first difficulty estimate (1-5) for one problem, from the problem itself:
// the unit's level, the practice set (2 and later are the harder
// practice) and signs of extra work in the problem. Stored on import
// (math_problems.difficulty) for assembling tests; once there are enough
// attempts it can be recalibrated from how often each problem is answered right.
const BASE = { elementary: 1, middle: 2, high: 3, university: 4 };

function formulaParts(text) {
  const parts = { ops: 0, sqrts: 0, fractions: 0 };
  const walk = node => {
    if (node.type === 'bin') { parts.ops++; if (node.op === '/') parts.fractions++; walk(node.left); walk(node.right); }
    else if (node.type === 'sqrt') { parts.sqrts++; walk(node.arg); }
    else if (node.type === 'pow') { parts.ops++; walk(node.base); walk(node.exp); }
    else if (node.arg) walk(node.arg);
  };
  for (const side of text.split(/[;=]/)) walk(parseExpression(side));
  return parts;
}

// Whether the problem asks for more than its set's usual step.
function extraWork(kind, problem) {
  switch (kind) {
    case 'expression': {
      // Operators between numbers; a parenthesized negative literal "(-3)" is not one.
      const operations = (problem.expression.replace(/\(-\d+\)/g, 'n').match(/[-+*/]/g) ?? []).length;
      const largest = Math.max(...(problem.expression.match(/\d+/g) ?? ['0']).map(Number));
      return operations >= 3 || largest >= 1000;
    }
    case 'factorization':
      return Math.max(Math.abs(problem.p), Math.abs(problem.q)) >= 7;
    case 'pythagoras':
      return problem.choices[problem.answerIndex][1] !== 1; // a radical answer
    case 'formula': {
      const parts = formulaParts(problem.question);
      const answer = problem.choices[problem.answerIndex];
      return parts.ops >= 4 || parts.sqrts >= 2 || parts.fractions >= 3
        || problem.question.includes(';') || (problem.kind === 'solve' && answer.includes('sqrt'));
    }
    default:
      return false;
  }
}

export function estimateDifficulty(unit, problem) {
  const level = BASE[unit.stage] + (problem.setId === '1' ? 0 : 1) + (extraWork(unit.kind, problem) ? 1 : 0);
  return Math.min(5, Math.max(1, level));
}
