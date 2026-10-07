// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The FAQ is the real one (a snapshot of the Ministry's file), so the
// checks are about its shape, not about exact answers.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIM, MODEL, encodeVectors, quantize, signature, toBase64 } from './govfaq-vectors.ts';

export default async function ({ page, main, go, base }) {
  // The vectors are made up here (each FAQ has its own pair of directions), and the Worker's answer is a stub, so what is checked is the flow.
  const faq = JSON.parse(readFileSync(new URL('../../data/govfaq.json', import.meta.url), 'utf8'));
  const faqItems = faq.items.map(([id, , question, answer]) => ({ id, question, answer }));
  const row = i => { const v = new Array(DIM).fill(0); v[i % DIM] = 1; v[(i * 7 + 1 + 311 * Math.floor(i / DIM)) % DIM] += 0.5; return quantize(v); };
  const file = encodeVectors({ model: MODEL, dim: DIM, count: faqItems.length, signature: signature(faqItems) }, faqItems.map((_, i) => row(i)));
  const target = faqItems.findIndex(item => item.question.includes('落とし物を拾った'));
  assert.ok(target >= 0, 'the FAQ this check is made for is in the data');
  let vectorsOn = false;
  const embedded = [];
  await page.route('**/govfaq-vectors.bin', route => (vectorsOn ? route.fulfill({ body: Buffer.from(file), contentType: 'application/octet-stream' }) : route.fulfill({ status: 404, body: 'none' })));
  await page.route('**/api/govfaq/embed', async route => {
    embedded.push(JSON.parse(route.request().postData()).q);
    await route.fulfill({ json: { model: MODEL, dim: DIM, vector: toBase64(row(target)) } });
  });
  // The answer written by the AI is a stub too: off at first (the nearest FAQ is the answer), then on, naming the first FAQ it was given.
  let answerOn = false;
  const asked = [];
  await page.route('**/api/govfaq/answer', async route => {
    const body = JSON.parse(route.request().postData());
    asked.push(body);
    if (!answerOn) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    // The text comes as lines, one for each piece, the last one saying how it ended (as the Worker sends it).
    const lines = [{ t: 'これは作られた' }, { t: `回答です。[${body.ids[0]}` }, { t: ']' }, { done: true, answer: `これは作られた回答です。[${body.ids[0]}]`, used: body.ids.slice(0, 3) }];
    return route.fulfill({ body: lines.map(line => JSON.stringify(line)).join('\n') + '\n', contentType: 'application/x-ndjson' });
  });
  await go('govfaq');
  // The chat comes first: the bot greets, a question in a plain sentence gets the nearest FAQ as the answer, with others to open.
  const input = main.locator('[data-chat="input"]');
  await page.waitForFunction(() => !document.querySelector('[data-chat="input"]').disabled);
  assert.equal(await main.locator('[data-chat-from="bot"]').count(), 1, 'the greeting');
  await input.fill('マイナンバーカードをなくしてしまったのですが、どうすればいいですか？');
  await main.locator('[data-chat="send"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-chat="card"]').length === 1);
  assert.equal(await main.locator('[data-chat-from="you"]').count(), 1);
  const card = await main.locator('[data-chat="card"]').first().innerText();
  assert.ok(card.includes('マイナンバーカード') && card.includes('紛失'), 'the nearest question is about losing the card');
  assert.match(card, /ID: /);
  assert.equal(await input.inputValue(), '', 'the box is emptied');
  // A long answer is folded so that one reply does not fill the chat; "Read more" opens it, and "Show less" folds it again.
  const answerBox = main.locator('[data-chat="answer"]').first();
  assert.equal(await answerBox.getAttribute('data-clamped'), 'true');
  const folded = (await answerBox.boundingBox()).height;
  await main.locator('[data-chat="more"]').first().click();
  assert.equal(await answerBox.getAttribute('data-clamped'), 'false');
  assert.ok((await answerBox.boundingBox()).height > folded * 1.3, 'opened, it is taller');
  await main.getByRole('button', { name: 'Show less' }).first().click();
  assert.equal(await answerBox.getAttribute('data-clamped'), 'true');
  // Others that come close can be opened: each adds its own answer.
  const before = await main.locator('[data-chat="card"]').count();
  await main.getByText('Other candidates').waitFor();
  await main.locator('[data-chat-from="bot"]').last().locator('button[lang="ja"]').first().click();
  await page.waitForFunction(count => document.querySelectorAll('[data-chat="card"]').length === count + 1, before);
  // Nonsense gets a "not found".
  await input.fill('ぬるぽがっ');
  await main.locator('[data-chat="send"]').click();
  await main.getByText('could not find a question that fits').waitFor();
  // Starting over clears the conversation but for the greeting.
  await main.locator('[data-chat="reset"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-chat-from]').length === 1);
  await input.fill('年金はいつからもらえますか');
  await main.locator('[data-chat="send"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-chat="card"]').length === 1);
  // The cautions and the source are in their own tab, and the conversation is still there when coming back.
  await main.locator('[data-faq="tab-info"]').click();
  assert.match(await main.locator('[data-faq="info"]').innerText(), /not an official one/);
  assert.equal(await main.locator('[data-chat="log"]').isVisible(), false);
  await main.locator('[data-faq="tab-chat"]').click();
  assert.equal(await main.locator('[data-chat="card"]').count(), 1, 'the conversation is kept');
  // The list: another way to look, with the box, the categories and all of the matches.
  await main.locator('[data-faq="tab-list"]').click();
  const box = main.locator('[data-faq="query"]');
  const items = main.locator('[data-faq-id]');
  await box.waitFor();
  // Before asking there are examples; an example fills the box and finds questions, with the matching words marked.
  await main.getByRole('button', { name: 'マイナンバーカードをなくした' }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-faq-id]').length > 0);
  assert.equal(await box.inputValue(), 'マイナンバーカードをなくした');
  assert.match(await main.locator('[data-faq="status"]').innerText(), /\d+ questions found/);
  assert.ok((await items.first().innerText()).includes('マイナンバーカード'), 'the best match is about the card');
  assert.ok(await main.locator('[data-faq-id] mark').count() > 0, 'matching words are marked');
  // "なくした" finds "紛失" (words with the same meaning).
  assert.ok((await items.evaluateAll(list => list.map(li => li.innerText).join('\n'))).includes('紛失'), 'a word with the same meaning is found');
  // A question opens to its answer, with the id and links that open in a new tab and carry no referrer.
  await items.first().locator('button').click();
  const answer = main.locator('[data-faq="answer"]');
  await answer.waitFor();
  assert.match(await answer.innerText(), /ID: /);
  for (const link of await answer.locator('a').all()) {
    assert.match(await link.getAttribute('href'), /^https?:\/\//);
    assert.match(await link.getAttribute('rel'), /noopener/);
    assert.equal(await link.getAttribute('target'), '_blank');
  }
  // The question is kept in the address, so a reload asks it again.
  assert.match(page.url(), /[?&]q=/);
  assert.match(page.url(), /[?&]tab=list/);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('[data-faq-id]').length > 0);
  assert.equal(await box.inputValue(), 'マイナンバーカードをなくした');
  // A category narrows the results to it; without a question it lists the category.
  const select = main.locator('[data-faq="category"]');
  const pension = await select.locator('option').evaluateAll(options => options.map(o => o.textContent).find(text => text.startsWith('年金')));
  await select.selectOption({ label: pension });
  await box.fill('');
  await page.waitForFunction(() => document.querySelectorAll('[data-faq-id]').length > 0);
  assert.ok((await items.first().locator('span').first().innerText()).startsWith('年金'));
  await select.selectOption('');
  // Nothing is found for nonsense, and it says so.
  await box.fill('ぬるぽがっ');
  await main.locator('[data-faq="status"]').filter({ hasText: 'No questions' }).waitFor();
  assert.equal(await items.count(), 0);
  // The source is credited, with a link to the Ministry's page, and the snapshot's date.
  await main.locator('[data-faq="tab-info"]').click();
  const credit = await main.locator('[data-faq="credit"]').innerText();
  assert.match(credit, /Ministry of Internal Affairs and Communications/); assert.match(credit, /2026-10-01/);
  assert.equal(await main.locator('[data-faq="credit"] a').getAttribute('href'), 'https://www.soumu.go.jp/main_sosiki/hyouka/soudan_n/kyotsucb_top.html');
  // With the vectors, a question that shares no words with any FAQ is answered by meaning: the chat asks the Worker and shows the nearest FAQ,
  // and the list merges it in. Nothing is sent when the vectors are not there (above).
  assert.equal(embedded.length, 0, 'no question was sent while there were no vectors');
  assert.equal(await main.locator('[data-faq="semantic"]').count(), 0);
  assert.ok(asked.length > 0 && asked.every(body => body.ids.length >= 1 && body.ids.length <= 4 && typeof body.q === 'string'), 'the ids of the found FAQs were sent, at most four');
  vectorsOn = true;
  answerOn = true;
  await go('govfaq');
  await main.locator('[data-faq="tab-info"]').click();
  await main.locator('[data-faq="semantic"]').waitFor();
  await main.locator('[data-faq="tab-chat"]').click();
  await main.locator('[data-chat="input"]').fill('ぬるぽがっ');
  await main.locator('[data-chat="send"]').click();
  await main.locator('[data-chat="generated"]:not([data-streaming])').waitFor();
  assert.deepEqual(embedded, ['ぬるぽがっ']);
  // The answer written from the FAQs is shown (without the [id] mark), says an AI wrote it, and the FAQ it is based on is under it as a heading
  // only; it opens to the FAQ as it is written.
  assert.equal((await main.locator('[data-chat="generated"]').innerText()).trim(), 'これは作られた回答です。');
  await main.locator('[data-chat="log"]').getByText('written by an AI from the FAQ').waitFor();
  assert.equal(await main.locator('[data-chat="card"]').count(), 0, 'the FAQ is a heading first');
  // Of several FAQs it is based on, two are shown as headings and the rest are behind a button.
  assert.equal(await main.locator('[data-chat="source"]').count(), 2);
  await main.locator('[data-chat="more-sources"]').click();
  assert.ok(await main.locator('[data-chat="source"]').count() >= 3);
  const source = main.locator('[data-chat="source"]').first();
  assert.ok((await source.innerText()).includes(faqItems[target].question), 'the FAQ near in meaning is the one it is based on');
  await source.locator('button').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-chat="card"]').length === 1);
  assert.ok((await source.innerText()).includes('ID: '), 'opened, the FAQ as it is written');
  assert.equal(asked.at(-1).ids[0], faqItems[target].id, 'the nearest FAQ was given first');
  await main.locator('[data-faq="tab-list"]').click();
  await main.locator('[data-faq="query"]').fill('ぬるぽがっ');
  await page.waitForFunction(() => document.querySelectorAll('[data-faq-id]').length > 0);
  assert.equal(await main.locator('[data-faq-id]').first().getAttribute('data-faq-id'), faqItems[target].id);
  // When the Worker cannot answer (no AI, too many questions), the words alone are searched and nothing breaks.
  await page.unroute('**/api/govfaq/embed');
  await page.route('**/api/govfaq/embed', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await main.locator('[data-faq="tab-list"]').click();
  await main.locator('[data-faq="query"]').fill('マイナンバーカードをなくした');
  await page.waitForFunction(() => document.querySelectorAll('[data-faq-id]').length > 0);
  assert.ok((await main.locator('[data-faq-id]').first().innerText()).includes('マイナンバーカード'));
  console.log('PASS: govfaq: the chat (a sentence answered by the nearest FAQ, others to open, nothing found, starting over), the list: examples, search with marks and words of the same meaning, an answer with safe links, the question kept in the address, categories, no results, the source credited, the search by meaning (a sentence with no shared words is answered, in the chat and the list) and the fallback to words');
}
