// The reviewed problem banks in src/data/ satisfy their set rules. Importing a
// validator checks its bank; the same validators gate math:generate and the
// D1 imports. Answer keys are re-derived by `npm run test:sympy`.
import '../../scripts/validate-quiz.mjs';
import '../../scripts/validate-math-arith.mjs';
import '../../scripts/validate-math-factorization.mjs';
import '../../scripts/validate-math-pythagoras.mjs';
import '../../scripts/validate-math-formula.mjs';

// Every learning item has a school year in Japan's curriculum table.
import assert from 'node:assert/strict';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { JP_GRADES, jpGrade } from '../../src/lib/math-curriculum-jp.ts';
const ungraded = MATH_CATALOG.flatMap(unit => unit.items.filter(item => !JP_GRADES.includes(jpGrade(unit.id, item.id))).map(item => `${unit.id}/${item.id}`));
assert.deepEqual(ungraded, [], 'learning items without a grade in math-curriculum-jp.ts');
console.log(`PASS: all ${MATH_CATALOG.flatMap(unit => unit.items).length} learning items have a Japanese school year`);
