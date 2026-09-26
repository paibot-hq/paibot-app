import assert from 'node:assert/strict';
import { createRandom, randomInt, shuffle } from '../src/lib/seeded-random.ts';
import { FACTORIZATION_SETS, factoredTex, generateFactorizationSet, trinomialTex } from '../src/lib/math-factorization.ts';

// --- seeded-random.ts ---

const r1 = createRandom('same-seed');
const r2 = createRandom('same-seed');
const seq1 = Array.from({ length: 20 }, () => r1());
const seq2 = Array.from({ length: 20 }, () => r2());
assert.deepEqual(seq1, seq2, 'the same seed produces the same sequence');
assert.notDeepEqual(seq1, Array.from({ length: 20 }, createRandom('different-seed')), 'a different seed diverges');
assert.ok(seq1.every(v => v >= 0 && v < 1), 'values stay in [0, 1)');

const r3 = createRandom('int-range');
for (let i = 0; i < 200; i++) {
  const value = randomInt(r3, -5, 5);
  assert.ok(value >= -5 && value <= 5 && Number.isInteger(value), `randomInt in range: ${value}`);
}

const original = [1, 2, 3, 4, 5];
const shuffled = shuffle(createRandom('shuffle-seed'), original);
assert.deepEqual(original, [1, 2, 3, 4, 5], 'shuffle does not mutate its input');
assert.deepEqual([...shuffled].sort(), original, 'shuffle is a permutation of the input');
assert.deepEqual(shuffle(createRandom('shuffle-seed'), original), shuffled, 'shuffle is deterministic for a given seed');
console.log('PASS: seeded-random determinism, range and non-mutation');

// --- math-factorization.ts: trinomialTex / factoredTex ---

assert.equal(trinomialTex(5, 6), 'x^2 + 5x + 6');
assert.equal(trinomialTex(-5, 6), 'x^2 - 5x + 6');
assert.equal(trinomialTex(5, -6), 'x^2 + 5x - 6');
assert.equal(trinomialTex(0, -9), 'x^2 - 9', 'a === 0 omits the x term entirely, not "+ 0x"');
assert.equal(trinomialTex(-6, 9), 'x^2 - 6x + 9');
assert.equal(factoredTex({ p: 2, q: 3 }), '(x + 2)(x + 3)');
assert.equal(factoredTex({ p: -3, q: 3 }), '(x - 3)(x + 3)');
assert.equal(factoredTex({ p: -2, q: -3 }), '(x - 2)(x - 3)');
console.log('PASS: trinomialTex and factoredTex sign handling');

// --- generateFactorizationSet: the reproducibility requirement ---

const setA1 = generateFactorizationSet(1);
const setA2 = generateFactorizationSet(1);
assert.deepEqual(setA1, setA2, 'the same set id always produces the identical question set');

const setB = generateFactorizationSet(2);
assert.notDeepEqual(setA1, setB, 'a different set id produces a different set (in practice, for this generator)');
console.log('PASS: generateFactorizationSet(setId) is reproducible for a given id');

// --- structural correctness, checked across many set ids ---

for (let setId = 1; setId <= 500; setId++) {
  const questions = generateFactorizationSet(setId);
  assert.equal(questions.length, 5, `set ${setId} has 5 questions`);

  const problemKeys = new Set(questions.map(q => `${q.a},${q.b}`));
  assert.equal(problemKeys.size, 5, `set ${setId}: no two questions share the same trinomial`);

  for (const question of questions) {
    assert.equal(question.a, question.p + question.q, `set ${setId}/${question.id}: a = p + q`);
    assert.equal(question.b, question.p * question.q, `set ${setId}/${question.id}: b = p * q`);
    assert.equal(question.choices.length, 4, `set ${setId}/${question.id}: four choices`);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);

    const correctChoice = question.choices[question.correctIndex];
    const correctKey = [correctChoice.p, correctChoice.q].sort((x, y) => x - y).join(',');
    assert.equal(correctKey, [question.p, question.q].sort((x, y) => x - y).join(','),
      `set ${setId}/${question.id}: correctIndex actually points at {p, q}`);

    const choiceKeys = question.choices.map(c => [c.p, c.q].sort((x, y) => x - y).join(','));
    assert.equal(new Set(choiceKeys).size, 4, `set ${setId}/${question.id}: no duplicate choices`);

    for (const { p, q } of question.choices) {
      // The sum/product-confusion distractor intentionally can use larger
      // numbers (the trinomial's own a, b) - only nonzero is guaranteed here.
      assert.ok(Number.isInteger(p) && Number.isInteger(q) && p !== 0 && q !== 0,
        `set ${setId}/${question.id}: every choice uses nonzero integers`);
    }
  }
}
console.log('PASS: 500 sets are structurally valid (distinct problems, correct answers, distinct choices)');

// --- pattern-specific behavior for the published sets ---

assert.deepEqual(FACTORIZATION_SETS.map(s => s.id), [1, 2, 3], 'three sets are currently published');

const standard = generateFactorizationSet(1);
assert.ok(standard.every(q => Math.abs(q.p) <= 9 && Math.abs(q.q) <= 9), 'set 1 (standard) stays within the small range');

const wide = generateFactorizationSet(2);
assert.ok(wide.some(q => Math.abs(q.p) > 9 || Math.abs(q.q) > 9), 'set 2 (wide) actually reaches beyond the standard range');

const differenceOfSquares = generateFactorizationSet(3);
for (const q of differenceOfSquares) {
  assert.equal(q.a, 0, `set 3/${q.id}: every question is a true difference of squares (a === 0)`);
  assert.equal(q.p, -q.q, `set 3/${q.id}: p and q are exact opposites`);
}
console.log('PASS: set 2 is wider than set 1, and every set 3 question is a genuine difference of squares');
