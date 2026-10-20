// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// Runs on its own (tests/e2e/tools.mjs): the dish is drawn in 3D the whole time, which keeps the processor busy.
export const alone = true;

export default async function ({ page, main, go }) {
  const message = main.locator('[data-koma="message"]');
  const pad = main.locator('[data-koma="shape-pad"]');
  const toBattle = main.locator('[data-koma="to-battle"]');
  const howTo = 'Drag on the dish to move and press Dash to ram';
  const spin = async () => Number((await main.locator('[data-koma="you-spin"] [data-fill]').evaluate(el => el.style.width)).replace('%', ''));
  const weight = async () => Number(await main.locator('[data-stat="weight"]').getAttribute('data-value'));

  // The page opens on the battle: nothing has to be shaped first. With WebGL the dish is drawn in 3D (a browser without it is covered below).
  await go('koma');
  await message.getByText(howTo, { exact: true }).waitFor();
  assert.equal(await pad.count(), 0, 'no shaping unless asked for');
  const webgl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  if (webgl) await page.waitForFunction(() => document.querySelector('[data-koma="dish"]')?.dataset.mode === '3d');

  // Shaping the top is a side trip: drawing a fat, tall outline on the pad makes a heavier top than the standard one, and a preset puts the standard one back.
  await main.locator('[data-koma="rebuild"]').click();
  await pad.waitFor();
  assert.equal(await main.locator('[data-koma="dish"]').isVisible(), false, 'the dish waits while the top is shaped');
  const standard = await weight();
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  const at = (x, y) => [box.x + box.width * x, box.y + box.height * (1 - y)];
  await page.mouse.move(...at(0.52, 0.02));
  await page.mouse.down();
  for (const [x, y] of [[0.8, 0.3], [0.95, 0.5], [0.95, 0.9], [0.52, 0.95]]) await page.mouse.move(...at(x, y), { steps: 4 });
  await page.mouse.up();
  assert.ok(await weight() > standard + 15, 'a fat outline is a heavy top');
  assert.ok(await page.evaluate(() => !!localStorage.getItem('paibot.koma.shape')), 'the drawing is kept');
  await main.getByRole('button', { name: 'Standard' }).click();
  assert.equal(await weight(), standard);
  await toBattle.click();
  await message.getByText(howTo, { exact: true }).waitFor();
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
  await message.getByText(howTo, { exact: true }).waitFor();
  await page.clock.runFor(100);
  assert.equal(await page.locator('[data-koma="dish"]').getAttribute('data-mode'), null, 'no 3D without WebGL');
  await main.locator('[data-koma="start"]').click();
  await page.keyboard.down('ArrowLeft');
  await page.clock.runFor(300);
  await page.keyboard.up('ArrowLeft');
  await main.getByRole('button', { name: 'Dash' }).waitFor();
  assert.ok(await spin() < 100, 'the player\'s spin goes down');

  // Nobody can spin forever: the match ends by itself and offers another, or a way back to the shape.
  await page.clock.runFor(90_000);
  await main.locator('[data-koma="start"]').waitFor();
  assert.match(await message.innerText(), /You win|You lose|A draw/);
  await main.locator('[data-koma="rebuild"]').click();
  await pad.waitFor();
  assert.equal(await main.locator('[data-koma="dish"]').isVisible(), false, 'back to shaping the top');
  console.log(`PASS: koma opens on the battle, shapes a top on request (${webgl ? '3D' : 'no WebGL here, 3D not checked'}), falls back to the flat dish, drains spin, ends a match and goes to the shape (see engine.test.mjs for the rules)`);
}
