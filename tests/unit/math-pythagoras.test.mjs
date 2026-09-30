import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import katex from 'katex';
import { bank, validateBank } from '../../scripts/validate-math-pythagoras.mjs';
import { additions, blindProblem, compareReviews, context, formatBank } from '../../scripts/math-pipeline.mjs';
import { explanationTex, lengthTex } from '../../src/lib/math-pythagoras.ts';

const reject = mutate => { const copy = structuredClone(bank); mutate(copy.problems, copy); assert.throws(() => validateBank(copy)); };
reject(p => p[0].figure.points.A[0] = 0.5);
reject(p => p[0].figure.points.B = p[0].figure.points.A);
reject(p => p[0].figure.rightAngle = 'B');
reject(p => p[0].figure.given = ['AB', 'BA']);
reject(p => p[0].figure.given = ['AB', 'AA']);
reject(p => { p[2].figure.given = ['AB', 'BC']; p[2].figure.unknown = 'AC'; });
reject(p => p[0].choices[0] = [1, 4]);
reject(p => p[0].choices[0] = [-1, 1]);
reject(p => p[0].answerIndex = 4);
reject(p => p[1].id = p[0].id);
reject(p => p[1].position = p[0].position);
reject(p => p[0].published = 1);
reject(p => p[0].reviewedAt = '2026-02-30');
reject(p => p[0].figure.points.B[0] = 30);
reject((p, b) => b.problems = p.filter(p => !p.figure.unknown.includes(p.figure.rightAngle)));
reject((p, b) => b.problems = p.filter(p => p.choices[p.answerIndex][1] === 1));
reject(p => { const duplicate = structuredClone(p[0]); duplicate.id = 'pythagoras-099'; duplicate.position = 99;
  for (const point of Object.values(duplicate.figure.points)) { point[0] += 7; point[1] -= 2; }
  p.push(duplicate);
});
assert.throws(() => validateBank(bank, [{ item: 'sides', id: '1', rule: 'unknown' }]));
assert.equal(context('pythagoras', 'sides', '1').set.rule, 'sides-a');
const added = additions('pythagoras', 'sides', '1', bank, { problems: [bank.problems[0]] }, 1, '2026-09-27');
assert.equal(added[0].id, 'pythagoras-006');
assert.equal(added[0].position, 6);
assert.deepEqual(added[0].figure, bank.problems[0].figure);
assert.equal(added[0].published, false);
for (const p of bank.problems) {
  const blind = blindProblem('pythagoras', p);
  assert.deepEqual(Object.keys(blind).sort(), ['choices', 'figure', 'id', 'type']);
  assert.deepEqual(Object.keys(blind.figure).sort(), ['given', 'rightAngle', 'unknown']);
  assert.ok(blind.figure.given.every(g => Number.isInteger(g.length)));
  const review = { id: p.id, answer: blind.choices[p.answerIndex], choiceIndex: p.answerIndex, wordExpression: null, issues: [] };
  assert.equal(compareReviews('pythagoras', [p], { reviews: [review] })[0].matches, true);
  assert.equal(compareReviews('pythagoras', [p], { reviews: [{ ...review, answer: 'wrong' }] })[0].matches, false);
  katex.renderToString(explanationTex(p.figure), { throwOnError: true });
  for (const c of p.choices) katex.renderToString(lengthTex(c), { throwOnError: true });
}
assert.equal(lengthTex([2, 13]), '2\\sqrt{13}\\,\\mathrm{cm}');
assert.match(explanationTex(bank.problems[1].figure), /13\^2 - 12\^2 = 25/);
const temp = mkdtempSync(join(tmpdir(), 'pythagoras-check-'));
try {
  const path = join(temp, 'bank.json');
  writeFileSync(path, formatBank(bank));
  const result = spawnSync(process.execPath, ['scripts/validate-math-pythagoras.mjs'], { env: { ...process.env, MATH_BANK_PYTHAGORAS: path }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  writeFileSync(path, JSON.stringify({ version: 0, problems: [] }));
  assert.notEqual(spawnSync(process.execPath, ['scripts/validate-math-pythagoras.mjs'], { env: { ...process.env, MATH_BANK_PYTHAGORAS: path } }).status, 0);
} finally { rmSync(temp, { recursive: true, force: true }); }
console.log('PASS: Pythagoras invalid geometry/metadata/choices/coverage, duplicates, blind review, numbering, TeX and dry-run bank override');
