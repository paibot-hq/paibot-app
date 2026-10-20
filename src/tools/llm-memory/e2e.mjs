// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, errors }) {
  await go('llm-memory');
  const weights = () => page.locator('[data-llm="weights"]').textContent();
  const verdict = () => page.locator('[data-llm="verdict"]').textContent();
  const pick = name => main.getByRole('button', { name, exact: true }).click();

  await page.waitForFunction(() => document.querySelector('[data-llm="weights"]')?.textContent?.includes('3.5 GB'));   // 7B at 4 bit
  await pick('70B');
  await page.waitForFunction(() => document.querySelector('[data-llm="weights"]')?.textContent?.includes('35.0 GB'));
  assert.match(await verdict(), /219%/);                     // 35 GB of the default 16 GB
  await pick('64 GB');
  assert.match(await verdict(), /55%/);
  await pick('16bit');
  assert.match(await weights(), /140\.0 GB/);
  assert.equal(await page.locator('[role="status"]').getAttribute('data-level'), 'over');
  await main.getByRole('slider').fill('14');
  assert.match(await weights(), /28\.0 GB/);
  assert.equal(await page.locator('[role="status"]').getAttribute('data-level'), 'fit');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1100, height: 900 });
  assert.deepEqual(errors, []);
  console.log('PASS: LLM memory estimator: size and precision and memory choices, weights size, verdict levels, slider, mobile width');
}
