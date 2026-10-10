// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: the 30 seconds of a run are fast-forwarded instead of waited for.
  await page.clock.install();
  await go('puchi');
  const canvas = main.locator('canvas');
  const read = async name => Number((await main.locator(`[data-puchi="${name}"]`).innerText()).replace(/,/g, ''));
  // The bubbles swell in when the sheet is made; after that a tap pops one.
  await page.waitForTimeout(900);
  const remaining = await read('remaining');
  assert.ok(remaining >= 20, 'a sheet of bubbles');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForFunction(() => Number(document.querySelector('[data-puchi="pops"]').textContent.replace(/,/g, '')) >= 1);
  assert.ok(await read('remaining') < remaining, 'a bubble was popped');
  // A swipe across the sheet pops many at once, and a run of pops is a combo that raises the best.
  for (const at of [0.25, 0.4]) {
    await page.mouse.move(box.x + 5, box.y + box.height * at);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 5, box.y + box.height * at, { steps: 12 });
    await page.mouse.up();
  }
  await page.waitForFunction(() => Number(document.querySelector('[data-puchi="pops"]').textContent.replace(/,/g, '')) >= 12);
  assert.ok(await read('best') >= 5, 'a combo');
  assert.ok(await read('score') >= 100, 'points');
  // The keyboard pops one bubble at a time.
  const before = await read('pops');
  await canvas.focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(count => Number(document.querySelector('[data-puchi="pops"]').textContent.replace(/,/g, '')) > count, before);
  // The sound can be turned off, and a new sheet fills the sheet again.
  const sound = main.locator('[data-puchi="sound"]');
  const was = await sound.getAttribute('aria-pressed');
  await sound.click();
  assert.notEqual(await sound.getAttribute('aria-pressed'), was);
  await main.locator('[data-puchi="new"]').click();
  await page.waitForTimeout(900);
  assert.ok(await read('remaining') >= 20, 'a new sheet');

  // The time attack: it waits for the start, counts down, runs 30 seconds and ends with the rank, the best score and a way to play again.
  await main.locator('[data-puchi-mode="timed"]').click();
  await main.locator('[data-puchi="ready"]').waitFor();
  assert.equal(await main.locator('[data-puchi="time"]').innerText(), '30.0');
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await main.locator('[data-puchi="start"]').click();
  await main.locator('[data-puchi="countdown"]').waitFor();
  await page.clock.runFor(3500);
  await main.locator('[data-puchi="countdown"]').waitFor({ state: 'detached' });
  await page.clock.runFor(100);
  for (let r = 0; r < 4; r++) {
    const y = box.y + box.height * (0.15 + r * 0.1);
    await page.mouse.move(box.x + 5, y); await page.mouse.down();
    await page.mouse.move(box.x + box.width - 5, y, { steps: 12 });
    await page.mouse.up();
    await page.clock.runFor(50);
  }
  assert.ok(await read('score') >= 100, 'points in the run');
  const timeNow = async () => Number(await main.locator('[data-puchi="time"]').innerText());
  const t1 = await timeNow();
  await page.clock.runFor(1000);
  assert.ok(t1 - await timeNow() > 0.5, 'the time runs');
  await page.clock.runFor(32000);
  const result = main.locator('[data-puchi="result"]');
  await result.waitFor();
  assert.match(await result.innerText(), /[SABC]/);
  assert.ok(await read('best') > 0, 'the best score is kept');
  await main.locator('[data-puchi="share"]').waitFor();
  // Again: a new run goes straight to the countdown.
  await main.locator('[data-puchi="retry"]').click();
  await main.locator('[data-puchi="countdown"]').waitFor();
  assert.equal(await read('score'), 0, 'a new run starts from nothing');
  // The daily sheet is its own mode, and the free one is back with the mode buttons.
  await main.locator('[data-puchi-mode="daily"]').click();
  await main.locator('[data-puchi="ready"]').waitFor();
  assert.match(await main.locator('[data-puchi="ready"]').innerText(), /\d{4}-\d{2}-\d{2}/);
  await main.locator('[data-puchi-mode="free"]').click();
  await main.locator('[data-puchi="ready"]').waitFor({ state: 'detached' });
  console.log('PASS: puchi: a tap pops a bubble, a swipe makes a combo, the keyboard pops, sound toggles, a new sheet; the time attack (start, countdown, run, result, again) and the daily sheet');
}
