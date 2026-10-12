// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  const message = main.locator('[data-koma="message"]');
  const spin = async () => Number((await main.locator('[data-koma="you-spin"] [data-fill]').evaluate(el => el.style.width)).replace('%', ''));

  // With WebGL the dish is drawn in 3D (a browser without it is covered below).
  await go('koma');
  await message.getByText('Drag on the dish to move and press Dash to ram', { exact: true }).waitFor();
  const webgl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  if (webgl) await page.waitForFunction(() => document.querySelector('main canvas')?.dataset.mode === '3d');
  await main.locator('[data-koma="start"]').click();
  await main.getByRole('button', { name: 'Dash' }).waitFor();
  await page.waitForFunction(() => Number(document.querySelector('[data-koma="you-spin"] [data-fill]').style.width.replace('%', '')) < 100);

  // Without WebGL the flat drawing takes over, and a whole match is fast-forwarded on the page's clock instead of waited for.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : getContext.call(this, type, ...rest); };
  });
  await page.clock.install();
  await go('koma');
  await message.getByText('Drag on the dish to move and press Dash to ram', { exact: true }).waitFor();
  await page.clock.runFor(100);
  assert.equal(await page.locator('main canvas').getAttribute('data-mode'), null, 'no 3D without WebGL');
  await main.locator('[data-koma="start"]').click();
  await page.keyboard.down('ArrowLeft');
  await page.clock.runFor(300);
  await page.keyboard.up('ArrowLeft');
  await main.getByRole('button', { name: 'Dash' }).waitFor();
  assert.ok(await spin() < 100, 'the player\'s spin goes down');

  // Nobody can spin forever: the match ends by itself and offers another.
  await page.clock.runFor(90_000);
  await main.locator('[data-koma="start"]').waitFor();
  assert.match(await message.innerText(), /You win|You lose|A draw/);
  await main.locator('[data-koma="start"]').click();
  await main.getByRole('button', { name: 'Dash' }).waitFor();
  console.log(`PASS: koma starts (${webgl ? '3D' : 'no WebGL here, 3D not checked'}), falls back to the flat dish, drains spin, ends a match and starts the next (see engine.test.mjs for the rules)`);
}
