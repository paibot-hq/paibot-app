// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The FAQ is the real one (a snapshot of the Ministry's file), so the
// checks are about its shape, not about exact answers.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, base }) {
  await go('faq');
  const box = main.locator('[data-faq="query"]');
  const items = main.locator('[data-faq-id]');
  await page.waitForFunction(() => !document.querySelector('[data-faq="query"]').disabled);
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
  console.log('PASS: faq: examples, search with marks and words of the same meaning, an answer with safe links, the question kept in the address, categories, no results, the source credited');
}
