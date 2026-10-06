// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The FAQ is the real one (a snapshot of the Ministry's file), so the
// checks are about its shape, not about exact answers.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, base }) {
  await go('faq');
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
  // Others that come close can be opened: each adds its own answer.
  const before = await main.locator('[data-chat="card"]').count();
  await main.getByText('Other candidates').waitFor();
  await main.locator('[data-chat-from="bot"]').last().locator('button').first().click();
  await page.waitForFunction(count => document.querySelectorAll('[data-chat="card"]').length === count + 1, before);
  // An example in the greeting asks it; nonsense gets a "not found" with ways to ask.
  await input.fill('ぬるぽがっ');
  await main.locator('[data-chat="send"]').click();
  await main.getByText('could not find a question that fits').waitFor();
  // Starting over clears the conversation but for the greeting.
  await main.locator('[data-chat="reset"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-chat-from]').length === 1);
  await main.locator('[data-chat-from="bot"] button').first().click();
  await page.waitForFunction(() => document.querySelectorAll('[data-chat="card"]').length === 1);
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
  const credit = await main.locator('[data-faq="credit"]').innerText();
  assert.match(credit, /Ministry of Internal Affairs and Communications/); assert.match(credit, /2026-10-01/);
  assert.equal(await main.locator('[data-faq="credit"] a').getAttribute('href'), 'https://www.soumu.go.jp/main_sosiki/hyouka/soudan_n/kyotsucb_top.html');
  console.log('PASS: faq: the chat (a sentence answered by the nearest FAQ, others to open, nothing found, starting over), the list: examples, search with marks and words of the same meaning, an answer with safe links, the question kept in the address, categories, no results, the source credited');
}
