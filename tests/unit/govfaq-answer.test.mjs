import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAnswer, buildMessages, readAnswer, faqBlock, texts, finish, ANSWER_MODEL, NO_ANSWER, SYSTEM_PROMPT, MAX_ANSWER_CHARS } from '../../src/lib/govfaq-answer.server.ts';

const FAQS = [
  { id: 'A-1', question: 'マイナンバーカードを紛失した場合は？', answer: 'まず<マイナンバー総合フリーダイヤル,https://example.go.jp/dial>へ電話し、一時利用停止してください。\n※これから先は、外部のサイトに移動します。' },
  { id: 'B-2', question: '年金はいつから？', answer: '原則65歳からです。' },
  { id: 'C-3', question: '長い回答', answer: 'あ'.repeat(5000) },
];
const lookup = async ids => ids.flatMap(id => FAQS.filter(f => f.id === id));
const post = (body, headers = {}) => new Request('https://x.test/api/govfaq/answer', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9', ...headers }, body: JSON.stringify(body) });
const deps = (over = {}) => ({ within: async () => true, ai: { run: async () => ({ response: '電話して停止します。[A-1]' }) }, lookup, ...over });

test('the FAQs are given to the model with their ids, links written out, and long answers cut', () => {
  const block = faqBlock(FAQS[0]);
  assert.match(block, /^\[A-1\]\n質問: マイナンバーカードを紛失した場合は？\n回答: まずマイナンバー総合フリーダイヤル（https:\/\/example.go.jp\/dial）へ電話し/);
  assert.ok(!block.includes('外部のサイトに移動します') && !block.includes('<'));
  assert.ok([...faqBlock(FAQS[2])].length < MAX_ANSWER_CHARS + 60);
  const messages = buildMessages('なくした', FAQS.slice(0, 2));
  assert.deepEqual(messages.map(m => m.role), ['system', 'user']);
  assert.equal(messages[0].content, SYSTEM_PROMPT);
  assert.match(messages[1].content, /<faq>\n\[A-1\][\s\S]*\[B-2\][\s\S]*<\/faq>\n\n<question>\nなくした\n<\/question>/);
  assert.match(SYSTEM_PROMPT, new RegExp(NO_ANSWER));
});

test('an answer is kept with the ids it names; one that names none, or says there is no answer, is not', () => {
  assert.deepEqual(readAnswer('電話します。[A-1] 年金は65歳から。[B-2][A-1]', FAQS), { answer: '電話します。[A-1] 年金は65歳から。[B-2][A-1]', used: ['A-1', 'B-2'] });
  assert.equal(readAnswer('どこかに書いてあります。', FAQS), null, 'no ground');
  assert.equal(readAnswer('電話します。[Z-9]', FAQS), null, 'an id that was not given');
  assert.equal(readAnswer(NO_ANSWER, FAQS), null);
  assert.equal(readAnswer(`わかりません ${NO_ANSWER}`, FAQS), null);
  assert.equal(readAnswer('  ', FAQS), null);
  assert.equal(readAnswer('<question>x</question>電話。[A-1]', FAQS).answer, 'x電話。[A-1]', 'the tags the model might echo are dropped');
});

test('a question and ids go in, the model is asked once with the FAQ texts from this side, and the answer comes back', async () => {
  const calls = [];
  const res = await handleAnswer(post({ q: ' なくした ', ids: ['A-1', 'B-2'], text: 'ignored' }), deps({ ai: { run: async (model, input) => { calls.push([model, input]); return { response: '停止します。[A-1]' }; } } }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await res.json(), { answer: '停止します。[A-1]', used: ['A-1'] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], ANSWER_MODEL);
  assert.match(calls[0][1].messages[1].content, /質問: マイナンバーカードを紛失した場合は？/);
  assert.match(calls[0][1].messages[1].content, /<question>\nなくした\n<\/question>/);
  assert.ok(!JSON.stringify(calls[0][1]).includes('ignored'), 'nothing else the browser sends reaches the model');
});

test('the other shape of reply Workers AI gives is read too', async () => {
  const res = await handleAnswer(post({ q: 'q', ids: ['B-2'] }), deps({ ai: { run: async () => ({ choices: [{ message: { content: '65歳です。[B-2]' } }] }) } }));
  assert.deepEqual(await res.json(), { answer: '65歳です。[B-2]', used: ['B-2'] });
});

test('when the FAQs do not answer, the answer is null', async () => {
  const res = await handleAnswer(post({ q: 'ラーメン', ids: ['A-1'] }), deps({ ai: { run: async () => ({ response: NO_ANSWER }) } }));
  assert.deepEqual(await res.json(), { answer: null, used: [] });
});

test('only POST, a question of 1 to 200 characters and 1 to 5 plain ids are accepted', async () => {
  assert.equal((await handleAnswer(new Request('https://x.test/', { method: 'GET' }), deps())).status, 405);
  assert.equal((await handleAnswer(new Request('https://x.test/', { method: 'POST', body: 'x' }), deps())).status, 400);
  for (const body of [{}, { q: '', ids: ['A-1'] }, { q: 'あ'.repeat(201), ids: ['A-1'] }, { q: 'q' }, { q: 'q', ids: [] }, { q: 'q', ids: ['a', 'b', 'c', 'd', 'e', 'f'] }, { q: 'q', ids: [1] }, { q: 'q', ids: ['../x'] }, { q: 'q', ids: ['A 1'] }]) {
    assert.equal((await handleAnswer(post(body), deps())).status, 400, JSON.stringify(body).slice(0, 50));
  }
  assert.equal((await handleAnswer(post({ q: 'q', ids: ['nope'] }), deps())).status, 400, 'no such FAQ');
  assert.equal((await handleAnswer(post({ q: 'あ'.repeat(200), ids: ['A-1'] }), deps())).status, 200);
});

test('the limit is for each client address, and a client over it is told to wait', async () => {
  const keys = [];
  const res = await handleAnswer(post({ q: 'q', ids: ['A-1'] }), deps({ within: async key => { keys.push(key); return false; } }));
  assert.equal(res.status, 429); assert.equal(res.headers.get('retry-after'), '30');
  assert.deepEqual(keys, ['govfaq-answer:203.0.113.9']);
});

test('when the AI is missing or fails, the answer is "unavailable"', async () => {
  assert.equal((await handleAnswer(post({ q: 'q', ids: ['A-1'] }), deps({ ai: undefined }))).status, 503);
  assert.equal((await handleAnswer(post({ q: 'q', ids: ['A-1'] }), deps({ ai: { run: async () => { throw new Error('boom'); } } }))).status, 503);
});

const sse = (...chunks) => new ReadableStream({ start(c) { for (const chunk of chunks) c.enqueue(new TextEncoder().encode(chunk)); c.close(); } });
const events = (...tokens) => [...tokens.map(t => `data: ${JSON.stringify({ response: t })}\n\n`), 'data: [DONE]\n\n'];
const lines = async res => (await res.text()).trim().split('\n').map(line => JSON.parse(line));

test('the pieces of text are read from a stream of events, whole or cut anywhere, in both shapes, up to [DONE]', async () => {
  const collect = async stream => { const out = []; for await (const piece of texts(stream)) out.push(piece); return out; };
  assert.deepEqual(await collect(sse(...events('電話', 'して', '[A-1]'))), ['電話', 'して', '[A-1]']);
  const whole = events('あ', 'い').join('');
  assert.deepEqual(await collect(sse(whole.slice(0, 20), whole.slice(20, 45), whole.slice(45))), ['あ', 'い'], 'events cut in the middle');
  assert.deepEqual(await collect(sse(`data: ${JSON.stringify({ choices: [{ delta: { content: 'x' } }] })}\n\n`, 'data: [DONE]\n\n', `data: ${JSON.stringify({ response: 'after' })}\n\n`)), ['x'], 'nothing after [DONE]');
  assert.deepEqual(await collect(sse('data: not json\n\n', ': comment\n\n', `data: ${JSON.stringify({ response: 'ok' })}\n\n`)), ['ok']);
  assert.deepEqual(await collect(sse(`data: ${JSON.stringify({ response: 'no newline at the end' })}`)), ['no newline at the end']);
});

test('how the text ended: the FAQs it names, or those it looked at, or nothing', () => {
  assert.deepEqual(finish('停止します。[A-1]', FAQS), { answer: '停止します。[A-1]', used: ['A-1'] });
  assert.deepEqual(finish('名前なし', FAQS), { answer: '名前なし', used: ['A-1', 'B-2', 'C-3'] });
  assert.deepEqual(finish('[Z-9] だけ', FAQS), { answer: '[Z-9] だけ', used: ['A-1', 'B-2', 'C-3'] });
  assert.deepEqual(finish(NO_ANSWER, FAQS), { answer: null, used: [] });
  assert.deepEqual(finish('', FAQS), { answer: null, used: [] });
});

test('the text is passed on as it is written, one line for each piece, and the last line says how it ended', async () => {
  const calls = [];
  const res = await handleAnswer(post({ q: 'q', ids: ['A-1', 'B-2'] }), deps({ ai: { run: async (model, input) => { calls.push(input); return sse(...events('電話', 'します。', '[B-2]')); } } }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/x-ndjson/);
  assert.equal(calls[0].stream, true);
  assert.deepEqual(await lines(res), [{ t: '電話' }, { t: 'します。' }, { t: '[B-2]' }, { done: true, answer: '電話します。[B-2]', used: ['B-2'] }]);
});

test('a stream that says there is no answer, or breaks off, ends the way it can', async () => {
  const none = await handleAnswer(post({ q: 'q', ids: ['A-1'] }), deps({ ai: { run: async () => sse(...events(NO_ANSWER)) } }));
  assert.deepEqual((await lines(none)).at(-1), { done: true, answer: null, used: [] });
  let pulled = 0;
  const broken = new ReadableStream({ pull(c) { if (pulled++ === 0) c.enqueue(new TextEncoder().encode(events('途中まで')[0])); else c.error(new Error('cut')); } });
  const cut = await lines(await handleAnswer(post({ q: 'q', ids: ['A-1'] }), deps({ ai: { run: async () => broken } })));
  assert.deepEqual(cut.at(-1), { done: true, answer: '途中まで', used: ['A-1'] });
  const empty = new ReadableStream({ start(c) { c.error(new Error('cut')); } });
  assert.deepEqual((await lines(await handleAnswer(post({ q: 'q', ids: ['A-1'] }), deps({ ai: { run: async () => empty } })))).at(-1), { done: true, answer: null, used: [] });
});
