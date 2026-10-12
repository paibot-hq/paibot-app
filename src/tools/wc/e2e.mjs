// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, result }) {
  await go('wc');
  const text = main.locator('textarea');
  await text.fill('Aあ😀');
  await result('3');
  console.log('PASS: character count');

  // An emoji and a flag that look like one character each count as one (the code points, UTF-16 units and UTF-8 bytes are under the details).
  await text.fill('👨‍👩‍👧🇯🇵');
  await result('2');
  assert.equal(await main.locator('[data-wc="code-points"]').textContent(), '7');
  assert.equal(await main.locator('[data-wc="utf16"]').textContent(), '12');
  assert.equal(await main.locator('[data-wc="utf8"]').textContent(), '26');
  console.log('PASS: characters as seen');

  // The count without spaces and line breaks (a space, the ideographic space and a line break are left out).
  await text.fill('a b　c\nd');
  await result('7');
  await result('4');
  console.log('PASS: count without spaces');

  // A limit: how many are left, that it is reached, and how many are over (counting the characters, then the ones without spaces).
  const limit = main.locator('input[inputmode="numeric"]');
  const status = main.locator('[data-wc="limit"]');
  await limit.fill('10');
  await page.waitForFunction(() => document.querySelector('[data-wc="limit"]')?.getAttribute('data-state') === 'left');
  assert.match(await status.textContent(), /3/);
  await limit.fill('7');
  await page.waitForFunction(() => document.querySelector('[data-wc="limit"]')?.getAttribute('data-state') === 'reached');
  await limit.fill('5');
  await page.waitForFunction(() => document.querySelector('[data-wc="limit"]')?.getAttribute('data-state') === 'over');
  assert.match(await status.textContent(), /2/);
  await main.locator('select').selectOption('withoutSpaces');
  await page.waitForFunction(() => document.querySelector('[data-wc="limit"]')?.getAttribute('data-state') === 'left');
  assert.match(await status.textContent(), /1/, '4 characters without spaces against a limit of 5');
  await limit.fill('abc');
  await page.waitForFunction(() => document.querySelector('[data-wc="limit"]')?.getAttribute('data-state') === 'none');
  console.log('PASS: limit');
}
