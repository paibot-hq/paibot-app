// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

const fingerprint = () => {
  const c = document.querySelector('main canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4 * 101) sum += d[i] * (i % 7 + 1) + d[i + 2];
  return sum;
};

export default async function ({ page, main, go }) {
  await page.clock.install();
  await go('glitch');
  const canvas = main.locator('canvas');
  await page.waitForFunction(() => document.querySelector('main canvas')?.dataset.mode);
  // It moves by itself: the picture keeps changing.
  const first = await page.evaluate(fingerprint);
  await page.clock.runFor(500);
  assert.notEqual(await page.evaluate(fingerprint), first, 'the picture moves');
  // Picking a scene shows only that scene.
  await main.locator('[data-glitch-mode="moire"]').click();
  for (let i = 0; i < 6; i++) {
    await page.clock.runFor(400);
    assert.equal(await canvas.getAttribute('data-mode'), 'moire');
  }
  // The wild intensity warns about flashing; stopping freezes the picture.
  assert.equal(await main.getByRole('note').count(), 0);
  await main.locator('[data-glitch-intensity="wild"]').click();
  await main.getByRole('note').waitFor();
  await main.locator('[data-glitch="sound"]').click();
  await main.getByRole('button', { name: 'Sound off' }).waitFor();
  await main.locator('[data-glitch="run"]').click();
  await main.getByRole('button', { name: 'Sound on' }).waitFor();
  const frozen = await page.evaluate(fingerprint);
  await page.clock.runFor(600);
  assert.equal(await page.evaluate(fingerprint), frozen, 'stopped, the picture stays');
  console.log('PASS: glitch: moves by itself, a chosen scene stays, wild warns, sound on, stopping freezes it');
}
