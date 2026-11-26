import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EMBEDDINGS, MEANINGS, PRESETS, W_K, W_Q, W_V, WORD_TEXT,
  attend, dot, matVec, resolvedMeaning, softmax,
} from './attention.ts';

test('matVec and dot follow the row-major convention', () => {
  assert.deepEqual(matVec([1, 2, 3, 4], [1, 0]), [1, 3]);
  assert.deepEqual(matVec([1, 2, 3, 4], [0, 1]), [2, 4]);
  assert.deepEqual(matVec([1, 2, 3, 4], [5, 7]), [19, 43]);
  assert.equal(dot([1, 2], [3, 4]), 11);
});

test('softmax: positive weights summing to one, shift-invariant, known ratios', () => {
  const weights = softmax([1.2, -0.7, 0.3]);
  assert.ok(Math.abs(weights.reduce((a, b) => a + b) - 1) < 1e-12);
  assert.ok(weights.every(w => w > 0));
  const shifted = softmax([1.2 + 100, -0.7 + 100, 0.3 + 100]);
  weights.forEach((w, i) => assert.ok(Math.abs(w - shifted[i]) < 1e-12));
  assert.deepEqual(softmax([0, 0]), [0.5, 0.5]);
  const [a, b] = softmax([Math.log(2), 0]);
  assert.ok(Math.abs(a - 2 / 3) < 1e-12 && Math.abs(b - 1 / 3) < 1e-12);
});

test('attend recomputes the displayed numbers from the hand-placed constants', () => {
  const { words } = PRESETS[1]; // 眼鏡 を かける
  const { q, keys, scores, weights, output } = attend(words, 2);
  // Independently: q = W_Q x, score_j = q · (W_K x_j), weights = softmax, output = Σ w_j W_V x_j.
  assert.deepEqual(q, matVec(W_Q, EMBEDDINGS.kakeru));
  words.forEach((word, j) => {
    assert.deepEqual(keys[j], matVec(W_K, EMBEDDINGS[word]));
    assert.equal(scores[j], dot(q, matVec(W_K, EMBEDDINGS[word])));
  });
  assert.deepEqual(weights, softmax(scores));
  const expected = words.reduce((sum, word, j) => {
    const v = matVec(W_V, EMBEDDINGS[word]);
    return [sum[0] + weights[j] * v[0], sum[1] + weights[j] * v[1]];
  }, [0, 0]);
  assert.deepEqual(output, expected);
  // The values the page prints with toFixed(2) / toFixed(1):
  assert.deepEqual(scores.map(s => s.toFixed(2)), ['1.49', '-0.44', '0.42']);
  assert.deepEqual(weights.map(w => (w * 100).toFixed(1)), ['67.2', '9.7', '23.0']);
});

test('in each かける sentence the context noun gets the largest weight and fixes the meaning', () => {
  const expected = { glasses: 'wear', phone: 'call', bridge: 'span' };
  for (const preset of PRESETS.filter(p => p.ambiguous)) {
    const { weights } = attend(preset.words, preset.focus);
    const top = weights.indexOf(Math.max(...weights));
    assert.ok(MEANINGS[preset.words[top]], `${preset.id}: the top-weighted word is the context noun`);
    assert.equal(resolvedMeaning(preset, preset.focus, weights), expected[preset.id], preset.id);
    // Selecting another word resolves no meaning.
    assert.equal(resolvedMeaning(preset, 1, attend(preset.words, 1).weights), null);
  }
});

test('in ねこがさかなをたべた, たべた attends to the nouns, not the particles', () => {
  const preset = PRESETS[0];
  const { weights } = attend(preset.words, preset.focus);
  const by = Object.fromEntries(preset.words.map((word, i) => [word, weights[i]]));
  assert.ok(by.sakana > by.neko, 'the object さかな first');
  assert.ok(by.neko > by.ga && by.neko > by.wo, 'content words above particles');
  assert.ok(by.ga < 0.1 && by.wo < 0.1, 'particles stay below 10%');
});

test('every vector drawn fits the plane (|q| and outputs within 1.55 units)', () => {
  // The hand-placed embeddings are unit length to two decimals, so |q| ≤ 1.5·|x| can reach just over 1.5.
  for (const preset of PRESETS) {
    preset.words.forEach((word, index) => {
      const { q, output } = attend(preset.words, index);
      assert.ok(Math.hypot(...q) <= 1.55, `${preset.id}/${word}: q`);
      assert.ok(Math.hypot(...output) <= 1.55, `${preset.id}/${word}: output`);
      assert.ok(WORD_TEXT[word].length > 0);
    });
  }
});
