// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: each fruit's fall is fast-forwarded.
  await page.clock.install();
  await go('fruit-merge');
  await main.getByText('Move along the top of the box and release or tap to drop a fruit.', { exact: false }).waitFor();
  const box = main.locator('[data-fruit="box"]');
  const drops = async () => Number(await box.getAttribute('data-drops'));
  await page.clock.runFor(500);
  assert.equal(await drops(), 0);

  // Space drops; a second press straight after is refused until the next fruit is ready.
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.clock.runFor(200);
  assert.equal(await drops(), 1, 'one fruit per press, then a short wait');
  await page.clock.runFor(800);

  // The arrow keys move the fruit, then it drops; a tap on the box drops one where it was tapped.
  await page.keyboard.down('ArrowLeft');
  await page.clock.runFor(500);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await page.clock.runFor(1000);
  await box.scrollIntoViewIfNeeded();
  const rect = await box.boundingBox();
  await page.mouse.click(rect.x + rect.width * 0.8, rect.y + 20);
  await page.clock.runFor(1000);
  assert.equal(await drops(), 3);
  assert.match(await main.locator('[data-fruit="score"]').innerText(), /^\d[\d,]*$/);
  assert.match(await main.locator('[data-fruit="next"]').getAttribute('aria-label'), /^(Cherry|Strawberry|Grape|Dekopon|Persimmon)$/);
  console.log('PASS: fruit-merge drops with Space, ↓ and a tap, waits between drops, and shows the next fruit (see engine.test.mjs)');
}
