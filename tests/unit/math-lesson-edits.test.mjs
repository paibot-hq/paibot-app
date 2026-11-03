import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyLessonEdits } from '../../scripts/lib/math-lesson-edits.mjs';

const original = { sections: [{ paragraphs: [{ ja: 'before', en: 'before', zh: 'before' }] }], examples: [{ question: '3*x', steps: ['3*x = 24'] }], mistakes: [], reviewedAt: '2026-11-01' };
test('small fixes preserve untouched languages and can add a box style and figures', () => {
  const updated = applyLessonEdits(original, [
    { op: 'replace', path: '/sections/0/paragraphs/0/ja', value: 'after' },
    { op: 'add', path: '/examples/0/style', value: 'box' },
    { op: 'add', path: '/sections/0/figures', value: [{ shape: 'rect-area', numbers: '3,4' }] },
    { op: 'add', path: '/mistakes/-', value: { wrong: '1 = 2' } },
    { op: 'remove', path: '/mistakes/0' },
  ]);
  assert.equal(updated.sections[0].paragraphs[0].en, 'before');
  assert.equal(updated.sections[0].paragraphs[0].ja, 'after');
  assert.equal(updated.examples[0].style, 'box');
  assert.equal(updated.sections[0].figures.length, 1);
  assert.deepEqual(updated.mistakes, []);
  assert.equal(original.sections[0].paragraphs[0].ja, 'before');
});
test('invalid or metadata edits fail without modifying the original lesson', () => {
  const snapshot = structuredClone(original);
  for (const edit of [
    { op: 'replace', path: '/reviewedAt', value: '2026-11-03' },
    { op: 'add', path: '/sections/0/__proto__/polluted', value: true },
    { op: 'replace', path: '/examples/20/question', value: '1' },
    { op: 'add', path: '/examples/01', value: {} },
    { op: 'remove', path: '/sections/0/missing' },
    { op: 'replace', path: '/examples/0/question' },
  ]) {
    assert.throws(() => applyLessonEdits(original, [{ op: 'replace', path: '/examples/0/question', value: '1' }, edit]));
    assert.deepEqual(original, snapshot);
  }
  assert.equal({}.polluted, undefined);
});
