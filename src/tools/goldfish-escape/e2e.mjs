// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: the fish sinking and the scoops coming are fast-forwarded.
  await page.clock.install();
  await go('goldfish-escape');
  const tank = main.locator('[data-escape="tank"]');
  await tank.waitFor();
  await page.clock.runFor(500);
  assert.equal(await tank.getAttribute('data-state'), 'ready');

  // A kind can be chosen before playing, and is kept.
  await main.locator('[data-escape-kind="demekin"]').click();
  assert.equal(await main.locator('[data-escape-kind="demekin"]').getAttribute('aria-checked'), 'true');

  // Space is a stroke and starts the game; a tap on the tank is another.
  await tank.scrollIntoViewIfNeeded();
  await page.keyboard.press('Space');
  await page.clock.runFor(200);
  assert.equal(await tank.getAttribute('data-state'), 'playing');
  await tank.click();
  await page.clock.runFor(200);
  assert.equal(await tank.getAttribute('data-strokes'), '2');

  // Left alone, the fish sinks to the gravel and a scoop aimed at it catches it.
  await page.clock.runFor(60_000);
  assert.equal(await tank.getAttribute('data-state'), 'over');
  assert.match(await main.locator('[data-escape="score"]').innerText(), /^\d[\d,]*$/);
  await main.locator('[data-escape="again"]').click();
  await page.clock.runFor(200);
  assert.equal(await tank.getAttribute('data-state'), 'ready');
  console.log('PASS: goldfish-escape: a kind is chosen, Space and a tap are strokes, a still fish is caught, and it plays again (see engine.test.mjs)');
}
