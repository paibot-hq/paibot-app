// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('series');
  const stats = main.locator('[data-series="stats"]');
  const distance = async () => Number((await stats.textContent()).match(/distance ([\d.e]+)/)[1]);
  // The sum of three terms of sin x is typeset, and more terms bring it closer.
  await page.waitForFunction(() => document.querySelector('[data-series="tex"] .katex'));
  assert.match(await stats.textContent(), /^3 terms/);
  const few = await distance();
  await main.getByLabel('Terms', { exact: true }).fill('10');
  await page.waitForFunction(() => /^10 terms/.test(document.querySelector('[data-series="stats"]').textContent));
  assert.ok(await distance() < few / 100, 'ten terms are far closer than three');
  // ln(1+x) does not converge for |x| > 1: more terms are no closer over the whole range.
  await main.getByRole('button', { name: 'ln(1+x)', exact: true }).click();
  await page.waitForFunction(() => /^10 terms/.test(document.querySelector('[data-series="stats"]').textContent));
  await main.getByLabel('Terms', { exact: true }).fill('30');
  await page.waitForFunction(() => /^30 terms/.test(document.querySelector('[data-series="stats"]').textContent));
  assert.ok((await distance()) > 1, 'it is far off outside |x| < 1');
  // The square wave overshoots to about 1.179 however many terms (Gibbs).
  await main.getByRole('button', { name: 'Square wave', exact: true }).click();
  await main.getByLabel('Terms', { exact: true }).fill('60');
  await page.waitForFunction(() => /^60 terms/.test(document.querySelector('[data-series="stats"]').textContent));
  const peak = Number((await stats.textContent()).match(/highest value ([\d.]+)/)[1]);
  assert.ok(peak > 1.15 && peak < 1.19, `peak ${peak}`);
  // Adding terms by itself.
  await main.getByLabel('Terms', { exact: true }).fill('2');
  await main.locator('[data-series="play"]').click();
  await main.getByRole('button', { name: 'Adding terms' }).waitFor();
  await page.waitForFunction(() => Number(document.querySelector('[data-series="stats"]').textContent.match(/^(\d+)/)[1]) > 6);
  console.log('PASS: series: terms typeset, more terms are closer, ln(1+x) fails outside |x| < 1, the square wave overshoots (Gibbs), terms added by themselves');
}
