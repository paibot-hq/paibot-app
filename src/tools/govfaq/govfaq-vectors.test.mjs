import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL, DIM, textFor, hash, signature, quantize, toBase64, fromBase64, encodeVectors, decodeVectors, nearest, fuse } from './govfaq-vectors.ts';

const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 - 0.5; };
const randomVector = (rng, dim = DIM) => Array.from({ length: dim }, rng);
const cosine = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] ** 2; y += b[i] ** 2; } return d / Math.sqrt(x * y); };

test('the text made into a vector is the question and the start of the answer, without link markup', () => {
  const text = textFor({ question: 'カードを紛失した場合は？', answer: 'すぐ連絡を。<コールセンター,https://example.go.jp/call>\n※これから先は、外部のサイトに移動します。\n以上です。' });
  assert.equal(text, 'カードを紛失した場合は？\nすぐ連絡を。コールセンター 以上です。');
  assert.equal([...textFor({ question: 'Q', answer: 'あ'.repeat(1000) }).split('\n')[1]].length, 300);
  assert.equal(MODEL, '@cf/baai/bge-m3'); assert.equal(DIM, 1024);
});

test('a fingerprint changes with the text; the signature changes with an id, a text or the order', () => {
  assert.equal(hash('abc').length, 8);
  assert.equal(hash('abc'), hash('abc')); assert.notEqual(hash('abc'), hash('abd'));
  const a = { id: 'A', question: 'q1', answer: 'a1' }, b = { id: 'B', question: 'q2', answer: 'a2' };
  const base = signature([a, b]);
  assert.equal(base, signature([a, b]));
  assert.notEqual(base, signature([b, a]), 'the order matters');
  assert.notEqual(base, signature([a, { ...b, id: 'C' }])); assert.notEqual(base, signature([a, { ...b, answer: 'a3' }]));
  assert.equal(signature([a, { ...b, answer: 'a2 ' }]), base, 'a space at the end does not matter (the text is tidied)');
});

test('quantizing makes a vector of length 1 into bytes, and the dot product of two stays close to their cosine', () => {
  const rng = seeded(5);
  const x = randomVector(rng), y = x.map((v, i) => v * 0.8 + randomVector(seeded(i + 9), 1)[0] * 0.3), z = randomVector(seeded(77));
  const qx = quantize(x), qy = quantize(y), qz = quantize(z);
  assert.equal(qx.length, DIM);
  assert.ok(qx.every(v => v >= -127 && v <= 127));
  const dot = (p, q) => p.reduce((s, v, i) => s + v * q[i], 0) / (127 * 127);
  assert.ok(Math.abs(dot(qx, qx) - 1) < 0.02, 'a vector with itself is about 1');
  assert.ok(Math.abs(dot(qx, qy) - cosine(x, y)) < 0.02);
  assert.ok(Math.abs(dot(qx, qz) - cosine(x, z)) < 0.02);
  assert.deepEqual([...quantize([0, 0, 0])], [0, 0, 0], 'a zero vector stays zero');
});

test('numbers from -127 to 127 go through base64 and back, as they are', () => {
  const bytes = Int8Array.from({ length: 1024 }, (_, i) => ((i * 7) % 255) - 127);
  assert.deepEqual([...fromBase64(toBase64(bytes))], [...bytes]);
  assert.deepEqual([...fromBase64(toBase64(Int8Array.of(-127, -1, 0, 1, 127)))], [-127, -1, 0, 1, 127]);
  assert.equal(toBase64(Int8Array.of(-1)), '/w==', 'minus one is the byte 255');
  assert.equal(toBase64(new Int8Array(0)), '');
  const big = Int8Array.from({ length: 50000 }, (_, i) => (i % 251) - 125);
  assert.deepEqual([...fromBase64(toBase64(big))], [...big], 'a long array too');
});

test('the file keeps the header and every row, and refuses anything that is not what it says', () => {
  const rng = seeded(3);
  const rows = Array.from({ length: 5 }, () => quantize(randomVector(rng, 16)));
  const header = { model: MODEL, dim: 16, count: 5, signature: 'abcd1234' };
  const bytes = encodeVectors(header, rows);
  assert.equal(bytes.length, 8 + JSON.stringify(header).length + 80);
  const back = decodeVectors(bytes);
  assert.deepEqual(back.header, header);
  rows.forEach((row, i) => assert.deepEqual([...back.data.subarray(i * 16, (i + 1) * 16)], [...row]));
  assert.throws(() => decodeVectors(new Uint8Array(20)), /not a FAQ vector file/);
  assert.throws(() => decodeVectors(bytes.subarray(0, bytes.length - 3)), /not the size/);
  assert.throws(() => decodeVectors(bytes.subarray(0, 12)), /cut short/);
  assert.throws(() => encodeVectors({ ...header, count: 4 }, rows), /do not match/);
  assert.throws(() => encodeVectors(header, rows.map(r => r.subarray(1))), /do not match/);
  const odd = new Uint8Array(bytes.length + 7); odd.set(bytes, 7);
  assert.deepEqual(decodeVectors(odd.subarray(7)).header, header, 'a file that starts at an odd offset of its buffer is read right');
});

test('the nearest vectors are the ones with the most alike direction, best first, optionally only among some', () => {
  const rng = seeded(11);
  const rows = Array.from({ length: 200 }, () => randomVector(rng, 64));
  const data = new Int8Array(200 * 64);
  rows.forEach((r, i) => data.set(quantize(r), i * 64));
  const query = rows[42].map((v, i) => v + 0.05 * randomVector(seeded(i), 1)[0]);
  const found = nearest(data, 64, quantize(query), 5);
  assert.equal(found[0].doc, 42);
  assert.ok(found[0].score > 0.97);
  assert.ok(found.every((f, i) => i === 0 || found[i - 1].score >= f.score));
  const exact = rows.map((r, doc) => ({ doc, score: cosine(r, query) })).sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.doc);
  assert.deepEqual(found.map(f => f.doc), exact, 'the same five as with the exact cosine');
  assert.ok(nearest(data, 64, quantize(query), 5, doc => doc % 2 === 1).every(f => f.doc % 2 === 1));
  assert.equal(nearest(data, 64, quantize(query), 500).length, 200);
  assert.throws(() => nearest(data, 64, new Int8Array(10), 3), /wrong size/);
});

test('merging by rank: what both lists have comes first, and a list that is empty leaves the other as it is', () => {
  const fused = fuse([5, 2, 9], [2, 7, 5]);
  assert.deepEqual(fused.map(f => f.doc), [2, 5, 7, 9].sort((a, b) => fused.findIndex(f => f.doc === a) - fused.findIndex(f => f.doc === b)));
  assert.deepEqual(fused.slice(0, 2).map(f => f.doc).sort(), [2, 5], 'the two that both have come first');
  assert.deepEqual(fused.slice(0, 2).map(f => f.from), ['both', 'both']);
  assert.equal(fused.find(f => f.doc === 7).from, 'semantic'); assert.equal(fused.find(f => f.doc === 9).from, 'lexical');
  assert.deepEqual(fuse([3, 1, 2], []).map(f => f.doc), [3, 1, 2]);
  assert.deepEqual(fuse([], [4, 6]).map(f => [f.doc, f.from]), [[4, 'semantic'], [6, 'semantic']]);
  assert.deepEqual(fuse([], []), []);
  assert.equal(fuse([1, 2, 3, 4], [], 2).length, 2);
  assert.equal(fuse([1, 1, 1], []).length, 1, 'a doc counted once per list');
  const first = fuse([1], [2]);
  assert.equal(first[0].score, first[1].score); assert.equal(first[0].doc, 1, 'a tie goes to the lower number');
});
