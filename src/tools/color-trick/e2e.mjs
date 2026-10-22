import assert from 'node:assert/strict';
export default async function ({ page, main, go }) {
  await go('color-trick');
  await page.clock.install();
  await main.getByRole('button', { name: 'Start 30-second challenge' }).click();
  const labels = { pink: 'Pink', blue: 'Blue', green: 'Green', orange: 'Orange' };
  for (let i = 0; i < 6; i++) {
    const ink = await main.locator('[data-ink]').getAttribute('data-ink');
    await main.getByRole('button', { name: labels[ink], exact: true }).click();
  }
  assert.equal(await main.locator('[data-score]').textContent(), '070');
  const ink = await main.locator('[data-ink]').getAttribute('data-ink');
  await main.getByRole('button', { name: labels[Object.keys(labels).find(color => color !== ink)], exact: true }).click();
  assert.match(await main.textContent(), /Oops!/);
  await page.clock.runFor(30100);
  await main.getByRole('button', { name: 'Play again', exact: true }).waitFor();
  assert.match(await main.textContent(), /6 correct out of 7/);
  await main.getByRole('button', { name: 'Play again', exact: true }).click();
  assert.equal(await main.locator('[data-score]').textContent(), '000');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('main [class*="best"]')?.textContent.includes('70'));
  assert.match(await main.locator('[class*="best"]').textContent(), /70/);
}
