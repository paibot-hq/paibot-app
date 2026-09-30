// The reviewed problem banks in src/data/ satisfy their set rules. Importing a
// validator checks its bank; the same validators gate math:generate and the
// D1 imports. Answer keys are re-derived by `npm run test:sympy`.
import '../../scripts/validate-quiz.mjs';
import '../../scripts/validate-math-arith.mjs';
import '../../scripts/validate-math-factorization.mjs';
import '../../scripts/validate-math-pythagoras.mjs';
import '../../scripts/validate-math-formula.mjs';

// No practice set has more problems than an attempt can save (MAX_SET_PROBLEMS).
import { readFileSync, readdirSync } from 'node:fs';
import { MAX_SET_PROBLEMS } from '../../src/lib/math-attempts.ts';
for (const file of readdirSync(new URL('../../src/data/', import.meta.url)).filter(name => /^math-.*\.json$/.test(name))) {
  const sets = {};
  for (const problem of JSON.parse(readFileSync(new URL(`../../src/data/${file}`, import.meta.url), 'utf8')).problems) { const key = `${problem.item}/${problem.setId}`; sets[key] = (sets[key] ?? 0) + 1; }
  for (const [key, count] of Object.entries(sets)) assert.ok(count <= MAX_SET_PROBLEMS, `${file}: ${key} has ${count} problems (at most ${MAX_SET_PROBLEMS})`);
}

// Every learning item has a school year in Japan's curriculum table.
import assert from 'node:assert/strict';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { JP_GRADES, jpGrade } from '../../src/lib/math-curriculum-jp.ts';
const ungraded = MATH_CATALOG.flatMap(unit => unit.items.filter(item => !JP_GRADES.includes(jpGrade(unit.id, item.id))).map(item => `${unit.id}/${item.id}`));
assert.deepEqual(ungraded, [], 'learning items without a grade in math-curriculum-jp.ts');
console.log(`PASS: all ${MATH_CATALOG.flatMap(unit => unit.items).length} learning items have a Japanese school year`);
