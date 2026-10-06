import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, compose } from './govfaq-search.ts';
import { rank, loadVectors, embedQuestion, SEM_MIN, SEM_SURE } from './govfaq-semantic.ts';
import { DIM, MODEL, encodeVectors, quantize, signature, toBase64 } from './govfaq-vectors.ts';

const items = [
  { id: 'a', category: 0, question: 'マイナンバーカードを紛失した場合の手続きを教えてください', answer: '警察と市区町村に届け出ます。' },
  { id: 'b', category: 1, question: '年金はいつから受け取れますか', answer: '原則65歳からです。' },
  { id: 'c', category: 0, question: '財布を落としたときはどこに届けますか', answer: '警察署か交番に届けます。' },
  { id: 'd', category: 1, question: '児童手当の申請方法', answer: '市区町村に申請します。' },
];
const index = buildIndex(items, ['届出', '年金']);
// Axis vectors: each FAQ is its own direction; a query is a mix of directions.
const axis = (...weights) => { const v = new Array(DIM).fill(0); weights.forEach(([i, w]) => { v[i] = w; }); return v; };
const rows = [0, 1, 2, 3].map(i => quantize(axis([i, 1])));
const vectors = { data: Int8Array.from(rows.flatMap(r => [...r])), dim: DIM };

test('without a vector, it is the search by words alone', () => {
  const ranked = rank(index, '年金はいつから');
  assert.equal(ranked[0].doc, 1);
  assert.ok(ranked.every(r => r.from === 'lexical'));
  assert.deepEqual(rank(index, '財布を落とした', { vectors, vector: null }).map(r => r.from).filter(f => f !== 'lexical'), []);
});

test('a question near in meaning is found though it shares no words, and is sure when near enough', () => {
  const near = quantize(axis([2, 1]));
  const ranked = rank(index, 'ああああ', { vectors, vector: near });
  assert.equal(ranked[0].doc, 2);
  assert.equal(ranked[0].from, 'semantic');
  assert.equal(ranked[0].sure, true, 'cosine 1 is above SEM_SURE');
  const middling = quantize(axis([2, SEM_MIN + 0.05], [9, Math.sqrt(1 - (SEM_MIN + 0.05) ** 2)]));
  const r = rank(index, 'ああああ', { vectors, vector: middling });
  assert.equal(r[0].doc, 2); assert.equal(r[0].sure, false);
  assert.ok(SEM_SURE > SEM_MIN);
});

test('what is far in meaning is left out, and what both find comes first', () => {
  const far = quantize(axis([3, 0.3], [0, 0.95]));
  assert.ok(!rank(index, 'ああああ', { vectors, vector: far }).some(r => r.doc === 3), 'cosine 0.3 is below SEM_MIN');
  const both = rank(index, '年金はいつから受け取れますか', { vectors, vector: quantize(axis([1, 1])) });
  assert.equal(both[0].doc, 1); assert.equal(both[0].from, 'both');
});

test('the category narrows the meaning too', () => {
  const ranked = rank(index, 'ああああ', { vectors, vector: quantize(axis([2, 1])), category: 1 });
  assert.ok(ranked.every(r => items[r.doc].category === 1));
});

test('compose gives the first as the answer and the others without repeating a question', () => {
  const dup = [...items, { ...items[1], id: 'e' }];
  const idx = buildIndex(dup, ['届出', '年金']);
  const r = compose(idx, [{ doc: 1, sure: false }, { doc: 4, sure: true }, { doc: 2, sure: true }]);
  assert.equal(r.kind, 'answer'); assert.equal(r.confidence, 'unsure');
  assert.deepEqual(r.others.map(o => o.id), ['c']);
  assert.deepEqual(compose(idx, []), { kind: 'none' });
});

const file = (header, rowsIn) => encodeVectors(header, rowsIn);
test('the vectors are used only when they are from this FAQ and this model', async () => {
  const good = file({ model: MODEL, dim: DIM, count: 4, signature: signature(items) }, rows);
  const ok = async () => new Response(good);
  assert.equal((await loadVectors(items, ok)).dim, DIM);
  assert.equal(await loadVectors(items.slice(0, 3), ok), null, 'another FAQ');
  assert.equal(await loadVectors(items, async () => new Response(file({ model: 'x', dim: DIM, count: 4, signature: signature(items) }, rows))), null);
  assert.equal(await loadVectors(items, async () => new Response('<html>', { status: 200 })), null, 'a page instead of the file');
  assert.equal(await loadVectors(items, async () => new Response('', { status: 404 })), null);
  assert.equal(await loadVectors(items, async () => { throw new Error('offline'); }), null);
});

test('a question is turned into a vector by the Worker, or null', async () => {
  const v = quantize(axis([5, 1]));
  let sent;
  const ok = async (url, init) => { sent = [url, JSON.parse(init.body)]; return Response.json({ model: MODEL, dim: DIM, vector: toBase64(v) }); };
  assert.deepEqual([...(await embedQuestion('質問', ok))], [...v]);
  assert.deepEqual(sent, ['/api/govfaq/embed', { question: '質問' }]);
  assert.equal(await embedQuestion('q', async () => new Response('', { status: 503 })), null);
  assert.equal(await embedQuestion('q', async () => Response.json({ model: 'x', dim: DIM, vector: toBase64(v) })), null);
  assert.equal(await embedQuestion('q', async () => Response.json({ model: MODEL, dim: DIM, vector: 'AAAA' })), null);
  assert.equal(await embedQuestion('q', async () => { throw new Error('offline'); }), null);
});
