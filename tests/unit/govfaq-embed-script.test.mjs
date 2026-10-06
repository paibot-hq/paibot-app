import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workersAiEmbedder, readPrevious, buildVectors } from '../../scripts/lib/govfaq-embed.mjs';
import { DIM, MODEL, decodeVectors, textFor, hash, signature, quantize } from '../../src/tools/govfaq/govfaq-vectors.ts';

const items = ['A', 'B', 'C', 'D'].map((id, i) => ({ id, question: `質問 ${id}`, answer: `回答 ${i}` }));
// A fake embedding: a vector that depends on the text, so that different texts have different vectors.
const fake = text => Array.from({ length: DIM }, (_, i) => Math.sin(i * 0.01 * (hash(text).charCodeAt(0) + hash(text).charCodeAt(3))) + (i % 7) * 0.01);
const embedder = log => async texts => { log.push(texts.length); return texts.map(fake); };

test('all the vectors are made in batches, in the order of the FAQ, with the header and the list of fingerprints', async () => {
  const batches = [];
  const result = await buildVectors(items, { embed: embedder(batches), batch: 3 });
  assert.deepEqual(batches, [3, 1]);
  assert.deepEqual([result.embedded, result.reused], [4, 0]);
  const { header, data } = decodeVectors(result.bytes);
  assert.deepEqual(header, { model: MODEL, dim: DIM, count: 4, signature: signature(items) });
  items.forEach((item, i) => assert.deepEqual([...data.subarray(i * DIM, (i + 1) * DIM)], [...quantize(fake(textFor(item)))]));
  assert.deepEqual(result.meta.ids, ['A', 'B', 'C', 'D']);
  assert.deepEqual(result.meta.hashes, items.map(item => hash(textFor(item))));
});

test('an FAQ that has not changed keeps its vector, a changed or new one is sent, and one that is gone is left out', async () => {
  const first = await buildVectors(items, { embed: embedder([]) });
  const previous = readPrevious(first.bytes, first.meta);
  assert.equal(previous.size, 4);
  const changed = [items[0], { ...items[1], answer: '新しい回答' }, items[3], { id: 'E', question: '新しい質問', answer: 'x' }];
  const sent = [];
  const second = await buildVectors(changed, { embed: async texts => { sent.push(...texts); return texts.map(fake); }, previous });
  assert.deepEqual([second.embedded, second.reused], [2, 2]);
  assert.deepEqual(sent, [textFor(changed[1]), textFor(changed[3])], 'only the changed one and the new one go to the AI');
  const { data } = decodeVectors(second.bytes);
  assert.deepEqual([...data.subarray(0, DIM)], [...previous.get('A').vector], 'the unchanged one is the old vector');
  assert.deepEqual([...data.subarray(2 * DIM, 3 * DIM)], [...previous.get('D').vector]);
  assert.equal(decodeVectors(second.bytes).header.count, 4);
  assert.deepEqual(second.meta.ids, ['A', 'B', 'D', 'E']);
});

test('old vectors are not trusted when they were made with another model or do not match their list', async () => {
  const first = await buildVectors(items, { embed: embedder([]) });
  assert.equal(readPrevious(first.bytes, { ...first.meta, model: 'other' }).size, 0);
  assert.equal(readPrevious(first.bytes, { ...first.meta, dim: 512 }).size, 0);
  assert.equal(readPrevious(first.bytes, { ...first.meta, ids: ['A'] }).size, 0);
  assert.equal(readPrevious(first.bytes, { ...first.meta, hashes: [] }).size, 0);
  assert.equal(readPrevious(undefined, first.meta).size, 0);
  assert.equal(readPrevious(first.bytes, undefined).size, 0);
});

test('Workers AI is called with the token, the model and the texts; its rows come back', async () => {
  const calls = [];
  const embed = workersAiEmbedder({ accountId: 'acc123', token: 'tok-secret', fetchImpl: async (url, init) => { calls.push([url, init]); return Response.json({ success: true, result: { shape: [2, DIM], data: [fake('a'), fake('b')] } }); } });
  const rows = await embed(['a', 'b']);
  assert.equal(rows.length, 2);
  assert.equal(calls[0][0], `https://api.cloudflare.com/client/v4/accounts/acc123/ai/run/${MODEL}`);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer tok-secret');
  assert.deepEqual(JSON.parse(calls[0][1].body), { text: ['a', 'b'] });
});

test('a busy or failing Workers AI is tried again a few times; other errors and odd answers stop it, without the token in the message', async () => {
  let n = 0; const waits = [];
  const flaky = workersAiEmbedder({ accountId: 'a', token: 'tok-secret', wait: async ms => { waits.push(ms); }, fetchImpl: async () => (++n < 3 ? new Response('busy', { status: n === 1 ? 429 : 503 }) : Response.json({ result: { data: [fake('a')] } })) });
  assert.equal((await flaky(['a'])).length, 1);
  assert.deepEqual(waits, [1000, 2000]);
  const always = workersAiEmbedder({ accountId: 'a', token: 'tok-secret', retries: 2, wait: async () => {}, fetchImpl: async () => new Response('x', { status: 500 }) });
  await assert.rejects(always(['a']), /answered 500/);
  const denied = workersAiEmbedder({ accountId: 'a', token: 'tok-secret', fetchImpl: async () => new Response('x', { status: 403 }) });
  await assert.rejects(denied(['a']), error => /403/.test(error.message) && /token/.test(error.message) && !error.message.includes('tok-secret'));
  for (const body of [{}, { result: { data: [] } }, { result: { data: [[1, 2]] } }, { result: { data: [fake('a'), fake('b')] } }]) {
    const odd = workersAiEmbedder({ accountId: 'a', token: 't', fetchImpl: async () => Response.json(body) });
    await assert.rejects(odd(['a']), /not 1 vectors/);
  }
});
