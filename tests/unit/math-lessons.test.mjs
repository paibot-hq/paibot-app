import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import katex from 'katex';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { expressionTex, stepRows } from '../../src/lib/math-formula.ts';

// Lessons (src/data/item-lessons.json) belong to learning items in the catalog and are written in all three
// languages; their prose's $...$ and display formulas render, and their examples and mistakes are in the formula
// grammar (scripts/verify_lessons.py checks the math).
const lessons = JSON.parse(readFileSync(new URL('../../src/data/item-lessons.json', import.meta.url), 'utf8'));
const items = new Set(MATH_CATALOG.flatMap(unit => unit.items.map(item => `${unit.id}/${item.id}`)));
const render = tex => katex.renderToString(tex, { throwOnError: true });
const prose = (key, text) => {
  for (const locale of ['ja', 'en', 'zh']) {
    const value = text?.[locale];
    assert.ok(value?.trim(), `${key}: missing ${locale} text`);
    assert.equal((value.match(/\$/g) ?? []).length % 2, 0, `${key}: unpaired $ in "${value}"`);
    for (const [, tex] of value.matchAll(/\$([^$]+)\$/g)) render(tex);
    assert.ok(!/[\^_\\]/.test(value.replace(/\$[^$]+\$/g, '')), `${key}: math must be inside $...$ ("${value}")`);
  }
};
for (const [key, lesson] of Object.entries(lessons)) {
  assert.ok(items.has(key), `${key} is not a learning item`);
  assert.ok(lesson.sections.length >= 1 && lesson.examples.length >= 1, `${key}: a lesson has sections and examples`);
  for (const section of lesson.sections) {
    prose(key, section.heading);
    for (const paragraph of [...section.paragraphs, ...(section.after ?? [])]) prose(key, paragraph);
    for (const formula of section.formulas ?? []) render(formula);
  }
  for (const example of lesson.examples) {
    render(expressionTex(example.question));
    for (const line of example.steps) for (const row of stepRows(line)) for (const piece of row) render(`{}${piece}`);
    prose(key, example.note);
  }
  for (const mistake of lesson.mistakes) {
    for (const line of [mistake.wrong, mistake.right]) render(stepRows(line).flat().join(' '));
    prose(key, mistake.note);
  }
}
console.log(`PASS: ${Object.keys(lessons).length} lessons are written in ja, en and zh and their math renders`);
