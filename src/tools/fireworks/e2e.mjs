// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('fireworks');
  const launched = main.locator('[data-fireworks="launched"]');
  assert.equal(await launched.textContent(), '0');
  // A tap on the sky sends one up; so does the button.
  const sky = main.locator('canvas');
  await sky.click({ position: { x: 200, y: 80 } });
  await page.waitForFunction(() => document.querySelector('[data-fireworks="launched"]')?.textContent === '1');
  await main.getByRole('button', { name: 'Launch', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-fireworks="launched"]')?.textContent === '2');
  // The show launches by itself.
  const show = main.getByRole('button', { name: 'Show: off' });
  await show.click();
  await main.getByRole('button', { name: 'Show: on' }).waitFor();
  await page.waitForFunction(() => Number(document.querySelector('[data-fireworks="launched"]')?.textContent) >= 4, undefined, { timeout: 8000 });
  await main.getByRole('button', { name: 'Show: on' }).click();
  // The sparks are drawn: some pixel of the sky is lit once a firework has burst.
  await page.waitForTimeout(1500);
  const lit = await sky.evaluate(canvas => {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < data.length; i += 4) if (data[i] > 40) return true;
    return false;
  });
  assert.ok(lit, 'the sky has lit pixels');
  await main.getByLabel('Kind').selectOption('ring');
  console.log('PASS: fireworks launch by tap and button, the show runs, the sky is drawn');
}
