import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleEmbed, MAX_QUESTION } from '../../src/lib/govfaq-embed.server.ts';
import { MODEL, DIM, fromBase64 } from '../../src/tools/govfaq/govfaq-vectors.ts';

const post = (body, headers = {}) => new Request('https://paibot.app/api/govfaq/embed', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers });
const vectorOf = seed => Array.from({ length: DIM }, (_, i) => Math.sin(i * seed));
const deps = (over = {}) => ({ within: async () => true, ai: { run: async () => ({ shape: [1, DIM], data: [vectorOf(0.1)] }) }, ...over });

test('a question comes back as its vector in base64 bytes, made with the FAQ\'s model', async () => {
  const calls = [];
  const response = await handleEmbed(post({ q: '  財布を落とした  ' }, { 'cf-connecting-ip': '203.0.113.9' }), deps({ ai: { run: async (model, input) => { calls.push([model, input]); return { data: [vectorOf(0.1)] }; } } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const json = await response.json();
  assert.deepEqual([json.model, json.dim], [MODEL, DIM]);
  const bytes = fromBase64(json.vector);
  assert.equal(bytes.length, DIM);
  assert.ok(bytes.some(v => v < 0) && bytes.some(v => v > 0), 'the numbers keep their signs');
  assert.deepEqual(calls, [[MODEL, { text: ['財布を落とした'] }]], 'the model is asked once, with the trimmed question and nothing else');
  assert.ok([...bytes].every(v => v >= -127 && v <= 127));
});

test('only POST with a question of 1 to 200 characters is accepted', async () => {
  assert.equal((await handleEmbed(new Request('https://paibot.app/api/govfaq/embed'), deps())).status, 405);
  assert.equal((await handleEmbed(new Request('https://paibot.app/api/govfaq/embed', { method: 'GET' }), deps())).headers.get('allow'), 'POST');
  assert.equal((await handleEmbed(post('not json'), deps())).status, 400);
  assert.equal((await handleEmbed(post({}), deps())).status, 400);
  assert.equal((await handleEmbed(post({ q: 5 }), deps())).status, 400);
  assert.equal((await handleEmbed(post({ q: '   ' }), deps())).status, 400);
  assert.equal((await handleEmbed(post({ q: 'あ'.repeat(MAX_QUESTION + 1) }), deps())).status, 400);
  assert.equal((await handleEmbed(post({ q: 'あ'.repeat(MAX_QUESTION) }), deps())).status, 200);
  assert.equal((await handleEmbed(post(JSON.stringify(['q'])), deps())).status, 400);
});

test('the limit is for each client address, and a client over it is told to wait', async () => {
  const keys = [];
  const limited = deps({ within: async key => { keys.push(key); return key !== 'govfaq:198.51.100.1'; } });
  const refused = await handleEmbed(post({ q: 'はい' }, { 'cf-connecting-ip': '198.51.100.1' }), limited);
  assert.equal(refused.status, 429);
  assert.equal(refused.headers.get('retry-after'), '30');
  assert.equal((await handleEmbed(post({ q: 'はい' }, { 'cf-connecting-ip': '198.51.100.2' }), limited)).status, 200);
  assert.deepEqual(keys, ['govfaq:198.51.100.1', 'govfaq:198.51.100.2']);
  await handleEmbed(post({ q: 'はい' }), limited);
  assert.equal(keys.at(-1), 'govfaq:unknown');
});

test('when the AI is missing, fails, or answers with something that is not a vector, the answer is "unavailable"', async () => {
  assert.equal((await handleEmbed(post({ q: 'はい' }), deps({ ai: undefined }))).status, 503);
  assert.equal((await handleEmbed(post({ q: 'はい' }), deps({ ai: { run: async () => { throw new Error('boom'); } } }))).status, 503);
  for (const bad of [null, {}, { data: [] }, { data: [[1, 2, 3]] }, { data: [Array(DIM).fill('x')] }, { data: [Array(DIM).fill(NaN)] }, { data: 'x' }]) {
    assert.equal((await handleEmbed(post({ q: 'はい' }), deps({ ai: { run: async () => bad } }))).status, 503, JSON.stringify(bad)?.slice(0, 30));
  }
  const text = await (await handleEmbed(post({ q: 'はい' }), deps({ ai: { run: async () => { throw new Error('secret detail'); } } }))).text();
  assert.ok(!text.includes('secret'), 'the error of the AI is not passed on');
});
