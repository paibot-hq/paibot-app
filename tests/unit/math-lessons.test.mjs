import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { lessonProblems } from '../../scripts/lib/math-lesson-check.mjs';

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
console.log(`PASS: ${Object.keys(lessons).length} lessons are written in ja, en and zh and their math renders`);
