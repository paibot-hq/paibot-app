// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: the 30 seconds of a run are fast-forwarded instead of waited for.
  await page.clock.install();
  await go('puchi');
  const canvas = main.locator('canvas');
  const read = async name => Number((await main.locator(`[data-puchi="${name}"]`).innerText()).replace(/,/g, ''));
  const box = await canvas.boundingBox();
  const swipe = async (at, steps = 12) => {
    await page.mouse.move(box.x + 5, box.y + box.height * at);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 5, box.y + box.height * at, { steps });
    await page.mouse.up();
  };

  // A run waits for the start; nothing is popped before it, and the countdown is shown.
  await main.locator('[data-puchi="ready"]').waitFor();
  assert.equal(await main.locator('[data-puchi="time"]').innerText(), '30.0');
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  assert.equal(await read('score'), 0, 'no popping before the start');
  await main.locator('[data-puchi="start"]').click();
  await main.locator('[data-puchi="countdown"]').waitFor();
  await page.clock.runFor(3500);
  await main.locator('[data-puchi="countdown"]').waitFor({ state: 'detached' });
  await page.clock.runFor(1200); // the bubbles swell in

  // A tap pops a bubble; swipes across the sheet pop many, and a run of pops is a combo that raises the score.
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.clock.runFor(50);
  assert.ok(await read('score') >= 10, 'a tap scores');
  for (const at of [0.1, 0.2, 0.3, 0.4]) { await swipe(at); await page.clock.runFor(50); }
  assert.ok(await read('score') >= 300, 'a combo builds the score');
  const left = async () => Number(await main.locator('[data-puchi="time"]').innerText());
  const t1 = await left();
  await page.clock.runFor(1000);
  assert.ok(t1 - await left() > 0.5, 'the time runs');

  // The keyboard pops one bubble at a time.
  const before = await read('score');
  await canvas.focus();
  await page.keyboard.press('Space');
  await page.clock.runFor(50);
  assert.ok(await read('score') > before, 'the keyboard pops');

  // The end: the rank, the score kept as the best, and a way to share and to play again.
  await page.clock.runFor(31000);
  const result = main.locator('[data-puchi="result"]');
  await result.waitFor();
  assert.match(await result.innerText(), /[SABC]/);
  assert.ok(await read('best') > 0, 'the best score is kept');
  // Shared under the board: X with the score and a link to the game.
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), /\d/);
  assert.match(x.searchParams.get('url'), /\/en\/puchi$/);
  await main.locator('[data-puchi="retry"]').click();
  await main.locator('[data-puchi="countdown"]').waitFor();
  assert.equal(await read('score'), 0, 'a new run starts from nothing');

  // The sound can be turned off.
  const sound = main.locator('[data-puchi="sound"]');
  const was = await sound.getAttribute('aria-pressed');
  await sound.click();
  assert.notEqual(await sound.getAttribute('aria-pressed'), was);
  console.log('PASS: puchi: the start and countdown, a tap, swipes and a combo, the keyboard, the result with the best score, again, sound toggles');
}
