// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('approx');
  const table = main.locator('[data-approx="table"]');
  const errorOf = method => main.locator(`[data-error="${method}"]`).innerText();
  const number = async method => Number((await errorOf(method)).replace('−', '-'));
  // The network trains by itself: its step count goes up, and all three methods have an error.
  await page.waitForFunction(() => Number(document.querySelector('[data-approx="steps"]').textContent.match(/\d+/)[0]) > 100);
  await page.waitForFunction(() => document.querySelector('[data-error="network"]').textContent !== '—');
  assert.ok(Number.isFinite(await number('taylor')) && Number.isFinite(await number('fourier')) && Number.isFinite(await number('network')));
  // 1/(1+x²) is the Taylor series' weak spot (it fails beyond 1): it loses to the other two at this budget.
  assert.notEqual(await table.getAttribute('data-winner'), 'taylor');
  // A wiggle of three waves is exactly three Fourier coefficients: Fourier wins by far.
  await main.getByRole('button', { name: 'Three waves' }).click();
  // (the table updates five times a second, so wait for the number itself, not only for who is winning)
  await page.waitForFunction(() => Number(document.querySelector('[data-error="fourier"]').textContent.replace('−', '-')) < 1e-6);
  assert.equal(await table.getAttribute('data-winner'), 'fourier');
  assert.ok((await number('taylor')) > 0.5);
  // A line is one Taylor term: Taylor wins (with an error of nothing at all).
  await main.getByRole('button', { name: 'The line x' }).click();
  await page.waitForFunction(() => document.querySelector('[data-approx="table"]').dataset.winner === 'taylor' && Number(document.querySelector('[data-error="taylor"]').textContent) === 0);
  // A corner has no Taylor series: it takes no part, and says so.
  await main.getByRole('button', { name: '|x| (a corner)' }).click();
  await page.waitForFunction(() => document.querySelector('[data-error="taylor"]').textContent === 'No Taylor series');
  assert.notEqual(await table.getAttribute('data-winner'), 'taylor');
  // The budget changes the numbers each may use: the network's units follow (3 h + 1).
  await main.getByLabel('Budget (how many numbers)', { exact: true }).fill('40');
  await page.waitForFunction(() => /13 hidden units \(40 numbers\)/.test(document.body.innerText));
  // Pausing stops the training; training again from scratch sets the count back.
  await main.locator('[data-approx="train"]').click();
  await main.getByRole('button', { name: 'Paused' }).waitFor();
  await page.waitForTimeout(450);   // the count on the screen catches up with the last steps once
  const frozen = await main.locator('[data-approx="steps"]').innerText();
  await page.waitForTimeout(500);
  assert.equal(await main.locator('[data-approx="steps"]').innerText(), frozen);
  await main.locator('[data-approx="restart"]').click();
  await page.waitForFunction(() => document.querySelector('[data-approx="steps"]').textContent.startsWith('0 steps'));
  // A curve can be switched off.
  const painted = () => main.locator('canvas').evaluate(canvas => { const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height); let n = 0; for (let i = 0; i < data.length; i += 4) if (data[i + 1] > 150 && data[i] < 100 && data[i + 2] < 140) n++; return n; });
  await main.locator('[data-approx="train"]').click();
  await page.waitForTimeout(600);
  const green = await painted();
  await main.getByRole('button', { name: 'Neural network', exact: true }).first().click();
  await page.waitForTimeout(300);
  assert.ok(green > 50 && (await painted()) < green / 4, 'the green curve goes when the network is switched off');
  console.log('PASS: approx: the network trains by itself, Fourier wins on waves, Taylor on a line and not at all on a corner, the budget sets the numbers, pause and restart, curves toggled');

  await main.locator('#gradient-descent').click();
  await page.waitForURL('**/en/gradient-descent');
  await main.getByRole('heading', { level: 1, name: 'Gradient Descent Simulator' }).waitFor();
}
