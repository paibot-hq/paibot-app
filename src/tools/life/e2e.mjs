// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('life');
  const stats = main.locator('[data-life="stats"]');
  const read = async () => { const [g, p] = (await stats.textContent()).match(/\d+/g).map(Number); return { generation: g, population: p }; };
  // It starts running by itself, from an R-pentomino.
  await page.waitForFunction(() => Number(document.querySelector('[data-life="stats"]').textContent.match(/\d+/)[0]) > 3);
  // Paused and cleared, a blinker is put in the middle: three cells, and each step keeps three and turns it.
  await main.locator('[data-life="run"]').click();
  await main.getByRole('button', { name: 'Paused' }).waitFor();
  await main.locator('[data-life="clear"]').click();
  await page.waitForFunction(() => /^Generation 0 · 0 /.test(document.querySelector('[data-life="stats"]').textContent));
  await main.getByRole('button', { name: 'Blinker', exact: true }).click();
  const canvas = main.locator('canvas');
  // The page scrolls as buttons are pressed, so the canvas is measured again before each click.
  const click = async (fx, fy) => { await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); };
  await click(0.5, 0.5);
  await page.waitForFunction(() => /· 3 /.test(document.querySelector('[data-life="stats"]').textContent));
  await main.locator('[data-life="step"]').click();
  await page.waitForFunction(() => /^Generation 1 · 3 /.test(document.querySelector('[data-life="stats"]').textContent));
  // A glider moves; the pen adds and erases single cells.
  await main.locator('[data-life="clear"]').click();
  await main.getByRole('button', { name: 'Pen', exact: true }).click();
  await click(0.3, 0.3);
  await page.waitForFunction(() => /· 1 /.test(document.querySelector('[data-life="stats"]').textContent));
  await click(0.3, 0.3);
  await page.waitForFunction(() => /· 0 /.test(document.querySelector('[data-life="stats"]').textContent));
  await main.locator('[data-life="random"]').click();
  await page.waitForFunction(() => Number(document.querySelector('[data-life="stats"]').textContent.match(/· (\d+)/)[1]) > 800);
  assert.ok((await read()).population > 800, 'random fills about a quarter');
  console.log('PASS: life: it runs by itself, patterns and the pen, step, clear and random');
}
