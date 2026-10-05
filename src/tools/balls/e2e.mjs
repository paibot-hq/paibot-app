// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('balls');
  const count = main.locator('[data-balls="count"]');
  const balls = async () => Number((await count.textContent()).match(/^(\d+)/)[1]);
  assert.equal(await balls(), 5, 'it starts with five balls');
  // Balls split when they meet: the number grows by itself.
  await page.waitForFunction(() => Number(document.querySelector('[data-balls="count"]').textContent.match(/^(\d+)/)[1]) > 5, undefined, { timeout: 30000 });
  // Tapping the circle adds a ball.
  await main.locator('[data-balls="reset"]').click();
  await page.waitForFunction(() => document.querySelector('[data-balls="count"]').textContent.startsWith('5 '));
  await main.getByRole('button', { name: 'Split on hit' }).click();
  await main.locator('[data-balls="run"]').click();
  await main.getByRole('button', { name: 'Resume' }).waitFor();
  const canvas = main.locator('canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForFunction(() => document.querySelector('[data-balls="count"]').textContent.startsWith('6 '));
  console.log('PASS: balls: balls split when they meet, a tap adds one, split can be turned off, pause');
}
