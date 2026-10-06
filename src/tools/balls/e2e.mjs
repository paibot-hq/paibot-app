// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('balls');
  const countText = () => main.locator('[data-balls="count"]').textContent();
  const count = async () => Number((await countText()).match(/^(\d+)/)[1]);
  const startsWith = n => page.waitForFunction(n => document.querySelector('[data-balls="count"]').textContent.startsWith(`${n} `), n);
  // With splitting off, starting over gives exactly two balls, and a tap on the circle adds one.
  await main.getByRole('button', { name: 'Split on hit' }).click();
  await main.locator('[data-balls="reset"]').click();
  await main.locator('[data-balls="run"]').click();
  await main.getByRole('button', { name: 'Resume' }).waitFor();
  await startsWith(2);
  // The page scrolls as buttons are pressed, so the canvas is measured again before each tap.
  const tap = async (x, y) => { const canvas = main.locator('canvas'); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); await page.mouse.click(box.x + box.width * x, box.y + box.height * y); };
  await tap(0.3, 0.3);
  await startsWith(3);
  // Gravity can be switched on.
  await main.locator('[data-balls="gravity"]').click();
  assert.equal(await main.locator('[data-balls="gravity"]').getAttribute('aria-pressed'), 'true');
  // With splitting on, two balls tapped on the same place meet at once and split in two: more balls.
  await main.getByRole('button', { name: 'Split on hit' }).click();
  await tap(0.7, 0.5);
  await tap(0.7, 0.5);
  await main.locator('[data-balls="run"]').click();
  await page.waitForFunction(() => Number(document.querySelector('[data-balls="count"]').textContent.match(/^(\d+)/)[1]) > 5, undefined, { timeout: 20000 });
  assert.ok(await count() > 5);
  console.log('PASS: balls: a tap adds a ball, gravity, balls split when they meet, split can be turned off, pause');
}
