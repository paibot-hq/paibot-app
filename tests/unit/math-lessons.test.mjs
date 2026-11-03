import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { lessonProblems } from '../../scripts/lib/math-lesson-check.mjs';
import { stepRows } from '../../src/lib/math-formula.ts';

// Lessons (src/data/item-lessons.json) belong to learning items in the catalog and are written in all three
// languages; their prose's $...$ and display formulas render, and their examples and mistakes are in the formula
// grammar (scripts/verify_lessons.py checks the math).
const lessons = JSON.parse(readFileSync(new URL('../../src/data/item-lessons.json', import.meta.url), 'utf8'));
const items = new Set(MATH_CATALOG.flatMap(unit => unit.items.map(item => `${unit.id}/${item.id}`)));
for (const [key, lesson] of Object.entries(lessons)) {
  assert.ok(items.has(key), `${key} is not a learning item`);
  assert.deepEqual(lessonProblems(key, lesson), []);
  if (lesson.reviewedAt !== undefined) assert.match(lesson.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${key}: reviewedAt is a date`);
}
// The check itself catches what a model gets wrong most often.
const sample = Object.values(lessons)[0];
const broken = structuredClone(sample);
broken.sections[0].paragraphs[0].en = 'Expand x^2 first.';
broken.examples[0].kind = 'simplify';
delete broken.mistakes[0]?.note.zh;
const found = lessonProblems('sample', broken).join('\n');
for (const expected of ['math must be inside $...$', 'kind must be one of', 'missing text']) assert.ok(found.includes(expected), `expected "${expected}" in:\n${found}`);
// A box stays x in the checked arithmetic, but its visible form is □. Word and
// geometry examples carry the conditions before the formula in all languages.
const boxed = structuredClone(sample);
boxed.examples[0] = {
  kind: 'solve', style: 'box', question: 'x + 6 = 24', steps: ['x = 24 - 6', 'x = 18'],
  prompt: { ja: '$\\square + 6 = 24$ の□を求めます。', en: 'Find the box in $\\square + 6 = 24$.', zh: '求 $\\square + 6 = 24$ 中的□。' },
  note: { ja: '24から6を引きます。', en: 'Subtract 6 from 24.', zh: '用24减去6。' },
};
assert.deepEqual(lessonProblems('boxed', boxed), []);
assert.deepEqual(stepRows('3*x = 24', 'box'), [['3 \\times \\square', '= 24']]);
assert.deepEqual(stepRows('1*x = 8', 'box'), [['1 \\times \\square', '= 8']]);
delete boxed.examples[0].prompt.zh;
assert.ok(lessonProblems('boxed', boxed).some(problem => problem.includes('prompt.zh')));
boxed.examples[0].style = 'unsupported';
assert.ok(lessonProblems('boxed', boxed).some(problem => problem.includes('unknown formula style')));
console.log(`PASS: ${Object.keys(lessons).length} lessons are written in ja, en and zh and their math renders`);
