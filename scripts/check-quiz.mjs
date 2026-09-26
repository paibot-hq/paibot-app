import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Structural checks only. Factual correctness and translation meaning need source review.
export function validateBank(bank) {
  assert.equal(bank.version, 2);
  assert.ok(Array.isArray(bank.questions));
  assert.ok(bank.questions.filter(q => q.published).length >= 5, 'At least five published questions');
  const ids = new Set();
  const prompts = { ja: new Set(), en: new Set(), zh: new Set() };
  for (const q of bank.questions) {
    assert.match(q.id, /^[a-z0-9-]{1,80}$/);
    assert.ok(!ids.has(q.id), `Duplicate ID: ${q.id}`); ids.add(q.id);
    assert.ok(['animals', 'nature', 'geography', 'everyday'].includes(q.category));
    assert.equal(typeof q.published, 'boolean');
    assert.match(q.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(q.reviewedAt).toISOString().slice(0, 10), q.reviewedAt);
    const url = new URL(q.source);
    assert.equal(url.protocol, 'https:');
    assert.ok(!url.username && !url.password);
    assert.ok(Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4);
    for (const locale of ['ja', 'en', 'zh']) {
      const t = q.translations[locale];
      for (const value of [t.prompt, t.explanation, ...t.choices]) {
        assert.equal(typeof value, 'string'); assert.ok(value.trim().length > 0 && value.length <= 1000);
      }
      assert.equal(t.choices.length, 4);
      assert.equal(new Set(t.choices.map(c => c.normalize('NFKC').trim().toLowerCase())).size, 4, `${q.id}: duplicate choices`);
      assert.ok(!prompts[locale].has(t.prompt), `${q.id}: duplicate prompt`); prompts[locale].add(t.prompt);
    }
  }
  return bank;
}
export const bank = validateBank(JSON.parse(readFileSync(new URL('../src/data/quiz.json', import.meta.url), 'utf8')));
console.log(`PASS: ${bank.questions.length} questions: IDs, four distinct choices, answer indexes, three locales and source metadata`);
