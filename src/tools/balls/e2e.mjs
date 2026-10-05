// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('balls');
  const count = main.locator('[data-balls="count"]');
  const balls = async () => Number((await count.textContent()).match(/^(\d+)/)[1]);
  // With splitting off, starting over gives exactly eight balls, and a tap on the circle adds one.
  await main.getByRole('button', { name: 'Split on hit' }).click();
  await main.locator('[data-balls="reset"]').click();
  await main.locator('[data-balls="run"]').click();
  await main.getByRole('button', { name: 'Resume' }).waitFor();
  await page.waitForFunction(() => document.querySelector('[data-balls="count"]').textContent.startsWith('8 '));
  const box = await main.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForFunction(() => document.querySelector('[data-balls="count"]').textContent.startsWith('9 '));
  // With splitting on, balls that meet split in two, so there are more of them.
  await main.getByRole('button', { name: 'Split on hit' }).click();
  await main.locator('[data-balls="run"]').click();
  await page.waitForFunction(() => Number(document.querySelector('[data-balls="count"]').textContent.match(/^(\d+)/)[1]) > 12, undefined, { timeout: 60000 });
  assert.ok(await balls() > 12);
  console.log('PASS: balls: a tap adds a ball, balls split when they meet, split can be turned off, pause');
}
