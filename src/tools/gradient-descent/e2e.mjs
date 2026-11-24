// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, base }) {
  await page.clock.install();
  await go('gradient-descent');
  const simulator = main.getByRole('region', { name: 'Gradient Descent Simulator' });
  const step = simulator.getByRole('button', { name: 'One step', exact: true });
  const rate = simulator.getByRole('slider', { name: 'Learning rate η' });
  const readout = label => simulator.locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
  const checkReadout = (label, value) => readout(label).and(page.getByText(value, { exact: true })).waitFor();
  await checkReadout('Current x', '3');
  await step.press('Enter');
  await checkReadout('Current x', '1.5');
  await checkReadout('Value f(x)', '2.25');
  await checkReadout('Last change Δx', '-1.5');

  await simulator.getByRole('button', { name: /0\.75.*crosses the valley/i }).click();
  await checkReadout('Iteration', '0');
  await step.click();
  await checkReadout('Current x', '-1.5');
  await simulator.getByRole('button', { name: 'Play' }).click();
  await page.clock.runFor(450);
  await simulator.getByRole('button', { name: 'Pause' }).click();
  const paused = Number(await readout('Iteration').textContent());
  assert.ok(paused >= 2);
  await page.clock.runFor(1000);
  assert.equal(await readout('Iteration').textContent(), String(paused));
  await simulator.getByRole('button', { name: 'Play' }).click();
  await page.clock.runFor(450);
  assert.ok(Number(await readout('Iteration').textContent()) > paused);

  await rate.fill('0.5');
  await step.click();
  await checkReadout('Current x', '0');
  assert.equal(await simulator.getByRole('status').getAttribute('data-state'), 'minimum');
  assert.ok(await step.isDisabled());
  await simulator.getByRole('button', { name: 'Reset' }).click();
  await checkReadout('Current x', '3');
  await simulator.getByRole('slider', { name: 'Starting point x₀' }).fill('5');
  await rate.fill('1.25');
  await step.click();
  await checkReadout('Current x', '-7.5');
  assert.equal(await simulator.getByRole('status').getAttribute('data-state'), 'outside');

  await page.setViewportSize({ width: 320, height: 740 });
  for (const locale of ['ja', 'en', 'zh']) {
    const path = `/${locale}/gradient-descent`;
    assert.equal((await page.goto(`${base}${path}`)).status(), 200);
    await main.getByRole('heading', { level: 1 }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}: fits 320px`);
    assert.equal(await main.locator('#gradient-descent a[href$="/math/derivative/tangent"]').getAttribute('href'), `/${locale}/math/derivative/tangent`);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname, path);
  }
  console.log('PASS: gradient descent: step, presets, exact minimum, escape, pause/resume, reset, and localised direct links at 320px');
}
