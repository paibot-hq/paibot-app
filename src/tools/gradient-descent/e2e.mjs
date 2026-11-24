// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';
import { configureAccess } from '../../../scripts/lib/access.mjs';

export default async function ({ page, main, go, base }) {
  await page.addInitScript(() => {
    window.__gaEvents = [];
    window.gtag = (command, name, params) => {
      if (command === 'event') window.__gaEvents.push({ name, params });
    };
  });
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

  await simulator.locator('a[href$="/math/derivative/tangent"]').click();
  await page.waitForURL(`${base}/en/math/derivative/tangent`);
  assert.deepEqual(await page.evaluate(() => window.__gaEvents), [
    { name: 'lab_view', params: { lab_id: 'gradient-descent' } },
    { name: 'lab_first_interact', params: { lab_id: 'gradient-descent', action: 'step' } },
    { name: 'lab_retry', params: { lab_id: 'gradient-descent', action: 'step', changed: 'preset' } },
    { name: 'lab_lesson_click', params: { lab_id: 'gradient-descent', target: 'math' } },
  ]);

  const narrowViewport = { width: 320, height: 740 };
  await page.setViewportSize(narrowViewport);
  for (const locale of ['ja', 'en', 'zh']) {
    const path = `/${locale}/gradient-descent`;
    assert.equal((await page.goto(`${base}${path}`)).status(), 200);
    await main.getByRole('heading', { level: 1 }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}: fits 320px`);
    assert.equal(await main.locator('#gradient-descent a[href$="/math/derivative/tangent"]').getAttribute('href'), `/${locale}/math/derivative/tangent`);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname, path);
  }

  // The server-rendered equation must fit even before MathTex can run its font fitting.
  const ssr = await page.context().browser().newPage({ viewport: narrowViewport, javaScriptEnabled: false });
  try {
    await configureAccess(ssr, base);
    assert.equal((await ssr.goto(`${base}/en/gradient-descent`)).status(), 200);
    const bounds = await ssr.locator('#gradient-descent .katex-html > :first-child').evaluate(async formula => {
      await document.fonts.ready;
      const { left, right } = formula.getBoundingClientRect();
      return { left, right, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth };
    });
    assert.ok(bounds.documentWidth <= bounds.viewport, `SSR document overflows: ${JSON.stringify(bounds)}`);
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport, `SSR equation overflows: ${JSON.stringify(bounds)}`);
  } finally {
    await ssr.close();
  }
  console.log('PASS: gradient descent: step, presets, exact minimum, escape, pause/resume, reset, and 320px layout before and after hydration');
}
