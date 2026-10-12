// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: a whole match is fast-forwarded instead of waited for.
  await page.clock.install();
  await go('koma');
  const message = main.locator('[data-koma="message"]');
  await message.getByText('Drag on the dish to move and press Dash to ram', { exact: true }).waitFor();
  await page.clock.runFor(100);

  await main.locator('[data-koma="start"]').click();
  await page.keyboard.down('ArrowLeft');
  await page.clock.runFor(300);
  await page.keyboard.up('ArrowLeft');
  await main.getByRole('button', { name: 'Dash' }).waitFor();
  // Spin drains while a match runs.
  const spin = async () => Number((await main.locator('[data-koma="you-spin"] [data-fill]').evaluate(el => el.style.width)).replace('%', ''));
  assert.ok(await spin() < 100, 'the player\'s spin goes down');

  // Nobody can spin forever: the match ends by itself and offers another.
  await page.clock.runFor(90_000);
  await main.locator('[data-koma="start"]').waitFor();
  assert.match(await message.innerText(), /You win|You lose|A draw/);
  await main.locator('[data-koma="start"]').click();
  await main.getByRole('button', { name: 'Dash' }).waitFor();
  console.log('PASS: koma starts, drains spin, ends a match and starts the next (see engine.test.mjs for the rules)');
}
