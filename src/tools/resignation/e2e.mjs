// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('resignation');
  await main.getByLabel('Department', { exact: true }).fill('営業部');
  await main.getByLabel('Name', { exact: true }).fill('佐藤 花子');
  await main.getByLabel('Last day of work').fill('2026-11-30');
  await page.waitForFunction(() => document.querySelector('main [role=img]')?.textContent?.includes('佐藤 花子'));
  const sheet = await main.locator('[role=img]').textContent();
  assert.ok(sheet.includes('令和八年十一月三十日をもって') && sheet.includes('退職いたします。'), 'the body names the last day in kanji');
  await main.getByRole('radio', { name: '退職願' }).click();
  await page.waitForFunction(() => document.querySelector('main [role=img]')?.textContent?.includes('ここにお願い申し上げます。'));
  // The printed copy is a page of its own, the only thing shown when printing.
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('body > :not([data-print-root]):visible').count(), 0, 'only the letter is shown when printing');
  assert.ok((await page.locator('[data-print-root]').textContent()).includes('佐藤 花子'));
  await page.emulateMedia({ media: 'screen' });
  await page.reload();
  await main.getByLabel('Name', { exact: true }).and(page.locator('[value="佐藤 花子"]')).waitFor();
  console.log('PASS: resignation letter previews typed details in kanji dates, switches kind, prints only the letter and keeps the input after reload (see letter.test.mjs for the dates)');
}
