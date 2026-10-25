import { test } from 'node:test';
import assert from 'node:assert/strict';
import { banks, reviewPassed, validateAll, validateBank } from '../../../scripts/validate-english.mjs';

test('every English problem bank passes its checks', () => {
  assert.ok(validateAll() > 0);
});

const problem = (changes = {}) => ({
  id: 'grammar-001', item: 'be-verb', setId: '1', position: 1, tier: 1, published: false, reviewedAt: '',
  stem: 'I ___ a student.', choices: ['am', 'is', 'are', 'be'], answerIndex: 0,
  explanation: { ja: '主語が I なので am。' }, point: { ja: 'I には am' }, ...changes,
});
const check = changes => () => validateBank('grammar', { problems: [problem(changes)] });

test('the checks catch malformed problems', () => {
  assert.doesNotThrow(check({}));
  assert.throws(check({ stem: 'I am a student.' }), /exactly one blank/);
  assert.throws(check({ stem: 'I ___ a ___.' }), /exactly one blank/);
  assert.throws(check({ choices: ['am', 'AM', 'are', 'be'] }), /choices differ/);
  assert.throws(check({ choices: ['am', 'is', 'are'] }), /four choices/);
  assert.throws(check({ answerIndex: 4 }), /answerIndex/);
  assert.throws(check({ item: 'present-perfect-x' }), /no item/);
  assert.throws(check({ setId: '9' }), /no set/);
  assert.throws(check({ id: 'vocab-001' }), /id/);
});

test('a problem is published only when both reviewers passed it', () => {
  const ok = { ok: true, issues: [] };
  assert.throws(check({ published: true }), /both reviews/);
  assert.throws(check({ published: true, review: { codex: ok } }), /both reviews/);
  assert.throws(check({ published: true, review: { codex: ok, agy: { ok: false, issues: ['x'] } } }), /both reviews/);
  assert.throws(check({ published: true, review: { codex: ok, agy: ok } }), /without a recording/);
  assert.ok(reviewPassed(problem({ review: { codex: ok, agy: ok } })));
});

test('the answers of a set are spread over the choices', () => {
  const set = [1, 2, 3, 4, 5].map(position => problem({ id: `grammar-00${position}`, position }));
  assert.throws(() => validateBank('grammar', { problems: set }), /spread/);
  assert.ok(banks.grammar.problems.length && banks.vocab.problems.length);
});

test('a recording must be of the sentence as it is now', () => {
  assert.throws(check({ audio: '000000000000' }), /another sentence or voice/);
});
