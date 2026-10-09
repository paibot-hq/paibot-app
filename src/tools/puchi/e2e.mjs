// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
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
  await page.mouse.move(box.x + 5, box.y + box.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 5, box.y + box.height * 0.25, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction(() => Number(document.querySelector('[data-puchi="pops"]').textContent.replace(/,/g, '')) >= 8);
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
  console.log('PASS: puchi: a tap pops a bubble, a swipe makes a combo, the keyboard pops, sound toggles, a new sheet');
}
