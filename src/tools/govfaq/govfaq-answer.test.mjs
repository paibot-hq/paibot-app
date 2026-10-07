import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex } from './govfaq-search.ts';
import { askAnswer, candidates, withoutMarks } from './govfaq-answer.ts';

const items = ['a', 'b', 'b2', 'c', 'd', 'e'].map((id, i) => ({ id, category: 0, question: id === 'b2' ? '質問 b' : `質問 ${id}`, answer: `回答 ${i}` }));
const index = buildIndex(items, ['x']);

test('the first four FAQs are given, each question once', () => {
  assert.deepEqual(candidates(index, [0, 1, 2, 3, 4, 5].map(doc => ({ doc }))).map(i => i.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(candidates(index, [{ doc: 1 }, { doc: 2 }]).map(i => i.id), ['b']);
  assert.deepEqual(candidates(index, []), []);
});

test('ids go to the Worker, as q and ids, and nothing else', async () => {
  let sent;
  const ok = async (url, init) => { sent = [url, JSON.parse(init.body)]; return Response.json({ answer: '停止します。[a]', used: ['a'] }); };
  assert.deepEqual(await askAnswer('なくした', ['a', 'b'], ok), { answer: '停止します。[a]', used: ['a'] });
  assert.deepEqual(sent, ['/api/govfaq/answer', { q: 'なくした', ids: ['a', 'b'] }]);
});

test('no answer is null: nothing given, an error, a null answer, ids that were not given, a broken reply, no network', async () => {
  assert.equal(await askAnswer('q', [], async () => { throw new Error('not called'); }), null);
  assert.equal(await askAnswer('q', ['a'], async () => new Response('', { status: 503 })), null);
  assert.equal(await askAnswer('q', ['a'], async () => Response.json({ answer: null, used: [] })), null);
  assert.equal(await askAnswer('q', ['a'], async () => Response.json({ answer: 'x', used: ['z'] })), null, 'it names none that was given');
  assert.equal(await askAnswer('q', ['a'], async () => Response.json({ answer: '  ', used: ['a'] })), null);
  assert.equal(await askAnswer('q', ['a'], async () => new Response('not json')), null);
  assert.equal(await askAnswer('q', ['a'], async () => { throw new Error('offline'); }), null);
  assert.deepEqual(await askAnswer('q', ['a', 'b'], async () => Response.json({ answer: 'x', used: ['a', 'z', 5] })), { answer: 'x', used: ['a'] });
});

test('the [id] marks are taken out of the text shown', () => {
  assert.equal(withoutMarks('電話します。[A-b-63] 次に届けます。 [B-1][B-2]'), '電話します。 次に届けます。');
  assert.equal(withoutMarks('配列 [1, 2] はそのまま'), '配列 [1, 2] はそのまま');
  assert.equal(withoutMarks('一行目 [A-1]\n二行目 [B-2]'), '一行目\n二行目');
});
