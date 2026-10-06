// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('split');
  await page.waitForFunction(() => /2,400/.test(document.querySelector('[data-split="each"]')?.textContent ?? ''));
  // 12,000 yen among 7 is 1,714.3 each: rounded up to 100 yen it is 1,800, which collects 600 more than the bill.
  await main.getByLabel('People').fill('7');
  await page.waitForFunction(() => /1,800/.test(document.querySelector('[data-split="each"]')?.textContent ?? ''));
  assert.match(await main.locator('[data-split="over"]').textContent(), /600/);
  // The organizer covers the odd yen: the others pay rounded down.
  await main.getByLabel('Odd yen').selectOption('organizer');
  await page.waitForFunction(() => /1,700/.test(document.querySelector('[data-split="each"]')?.textContent ?? ''));
  assert.match(await main.locator('[data-split="organizer"]').textContent(), /1,800/);
  // Unequal shares.
  await main.getByRole('button', { name: 'Different shares' }).click();
  await main.getByLabel('Shares').fill('1 1 2');
  await main.getByText('Person 3').waitFor();
  console.log('PASS: split: equal and unequal shares, rounding, the organizer covering the odd yen');
}
