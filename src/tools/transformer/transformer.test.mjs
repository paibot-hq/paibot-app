import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EMBEDDINGS, FFN_W1, FFN_W2, LOGIT_SCALE, POSITIONS, PRESETS, VOCAB,
  W_K, W_Q, W_V, WORD_TEXT, runTransformer, softmax,
} from './transformer.ts';

// Independent re-computation: local helpers, so a bug in the module's algebra
// cannot hide by being used on both sides of the assertion.
const matVec = (m, v) => [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const close = (a, b, where) => assert.ok(Math.abs(a - b) < 1e-12, `${where}: ${a} vs ${b}`);
// The page's formatting: toFixed with the minus sign −.
const number = value => value.toFixed(2).replace('-', '−');
const percent = value => `${(value * 100).toFixed(1)}%`;

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

test('the ReLU pairs of the FFN implement exactly the linear map 1.1·R(−125°) − I', () => {
  // I + A = 1.1·R(−125°) rounded to two decimals: [−0.63, 0.9, −0.9, −0.63].
  const A = [-1.63, 0.9, -0.9, -1.63];
  for (const z of [[0.3, 1.1], [-0.7, 0.5], [0.4, -0.9], [-1.2, -0.4], [0, 0], [1.45, 0]]) {
    const hidden = FFN_W1.map(row => Math.max(0, dot(row, z)));
    const out = [
      FFN_W2[0].reduce((sum, w, j) => sum + w * hidden[j], 0),
      FFN_W2[1].reduce((sum, w, j) => sum + w * hidden[j], 0),
    ];
    const expected = matVec(A, z);
    close(out[0], expected[0], `x of ${z}`);
    close(out[1], expected[1], `y of ${z}`);
  }
});

test('runTransformer recomputes every stage from the baked-in constants', () => {
  for (const preset of PRESETS) {
    const r = runTransformer(preset.words);
    // Step 1: x_i = e_i + p_i.
    preset.words.forEach((word, i) => {
      close(r.xs[i][0], EMBEDDINGS[word][0] + POSITIONS[i][0], `${preset.id} x${i}`);
      close(r.xs[i][1], EMBEDDINGS[word][1] + POSITIONS[i][1], `${preset.id} y${i}`);
    });
    // Step 2: q, k, v, scores, softmax, weighted average.
    const xs = preset.words.map((word, i) => [EMBEDDINGS[word][0] + POSITIONS[i][0], EMBEDDINGS[word][1] + POSITIONS[i][1]]);
    const q = matVec(W_Q, xs[3]);
    assert.deepEqual(r.q, q, preset.id);
    const scores = xs.map(x => dot(q, matVec(W_K, x)));
    scores.forEach((s, j) => close(r.scores[j], s, `${preset.id} score ${j}`));
    const weights = softmax(scores);
    weights.forEach((w, j) => close(r.weights[j], w, `${preset.id} weight ${j}`));
    const z = xs.reduce((sum, x, j) => {
      const v = matVec(W_V, x);
      return [sum[0] + weights[j] * v[0], sum[1] + weights[j] * v[1]];
    }, [0, 0]);
    close(r.attended[0], z[0], `${preset.id} z`);
    close(r.attended[1], z[1], `${preset.id} z`);
    // Step 3: u = z + W2·ReLU(W1·z).
    const hidden = FFN_W1.map(row => Math.max(0, dot(row, z)));
    const u = [
      z[0] + FFN_W2[0].reduce((sum, w, j) => sum + w * hidden[j], 0),
      z[1] + FFN_W2[1].reduce((sum, w, j) => sum + w * hidden[j], 0),
    ];
    close(r.output[0], u[0], `${preset.id} u`);
    close(r.output[1], u[1], `${preset.id} u`);
    // Step 4: logits over the vocabulary and their softmax.
    const logits = VOCAB.map(word => LOGIT_SCALE * dot(EMBEDDINGS[word], u));
    logits.forEach((l, j) => close(r.logits[j], l, `${preset.id} logit ${j}`));
    const probs = softmax(logits);
    probs.forEach((p, j) => close(r.probs[j], p, `${preset.id} prob ${j}`));
    assert.ok(Math.abs(probs.reduce((a, b) => a + b) - 1) < 1e-12, preset.id);
  }
});

test('in every preset the intended verb has the largest probability, with a margin', () => {
  for (const preset of PRESETS) {
    const r = runTransformer(preset.words);
    assert.equal(r.predicted, preset.next, preset.id);
    const sorted = [...r.probs].sort((a, b) => b - a);
    assert.ok(sorted[0] >= 0.45, `${preset.id}: top ${sorted[0]}`);
    assert.ok(sorted[0] - sorted[1] >= 0.2, `${preset.id}: margin ${sorted[0] - sorted[1]}`);
  }
});

test('attention gathers on the object (slot 2), not on the particles', () => {
  for (const preset of PRESETS) {
    const { weights } = runTransformer(preset.words);
    assert.equal(weights.indexOf(Math.max(...weights)), 2, preset.id);
    assert.ok(weights[2] >= 0.55, `${preset.id}: object ${weights[2]}`);
    assert.ok(weights[1] < 0.15 && weights[3] < 0.15, `${preset.id}: particles`);
  }
});

test('the strings the page prints match the computation (toFixed formatting, − for minus)', () => {
  // ねこ が さかな を: the default preset the page opens with.
  const r = runTransformer(PRESETS[0].words);
  assert.deepEqual(r.weights.map(percent), ['8.0%', '6.0%', '81.5%', '4.5%']);
  assert.equal(`(${number(r.output[0])}, ${number(r.output[1])})`, '(1.02, −0.66)');
  const top = Math.max(...r.probs);
  assert.equal(percent(top), '68.9%');
  assert.equal(WORD_TEXT[r.predicted], 'たべた');
  // The other presets' headline numbers, as the e2e flow checks them.
  assert.equal(percent(Math.max(...runTransformer(PRESETS[1].words).probs)), '67.5%');
  assert.equal(percent(Math.max(...runTransformer(PRESETS[2].words).probs)), '55.7%');
  assert.equal(WORD_TEXT[runTransformer(PRESETS[3].words).predicted], 'おいかけた');
});

test('every vector drawn fits the plane (|x|, |q|, |z|, |u| within 1.5 units)', () => {
  for (const preset of PRESETS) {
    const r = runTransformer(preset.words);
    for (const v of [...r.xs, r.q, r.attended, r.output]) {
      assert.ok(Math.hypot(v[0], v[1]) <= 1.5, `${preset.id}: (${v})`);
    }
    preset.words.forEach(word => assert.ok(WORD_TEXT[word].length > 0));
  }
});
