// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('backprop');
  const lab = main.getByRole('region', { name: 'Backpropagation Visualizer' });
  // The play animations run on timers, so drive them on the page's clock.
  await page.clock.install();

  // A range input is set the way React sees it (the native value setter plus an input event).
  const setRange = (locator, value) => locator.evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);

  // Step 1, try it yourself: the goal, the gap meter and the forward values.
  await lab.getByText('Goal: bring the red gap (loss) bar to 0').waitFor();
  await lab.getByText("network's answer y = 0.93", { exact: true }).waitFor();
  await lab.getByText('wanted answer t = 0.50', { exact: true }).waitFor();
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor();

  // Play hides the graph and lights it up again in computation order.
  await lab.getByRole('button', { name: 'Play' }).click();
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor({ state: 'hidden' });
  await page.clock.runFor(3000);
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor();

  // Moving a weight slider recomputes the loss at once; reset restores it.
  await setRange(lab.getByLabel('w₁', { exact: true }), '1.5');
  await lab.getByText('w₁ = 1.50', { exact: true }).first().waitFor();
  await lab.getByText('0.576', { exact: true }).waitFor(); // the meter's loss
  await lab.getByRole('button', { name: 'Back to the initial values' }).click();
  await lab.getByText('0.187', { exact: true }).waitFor();

  // Step 2, ask backpropagation: the chain rule walks in from the loss.
  await lab.getByRole('button', { name: '2 Ask backpropagation' }).click();
  await lab.getByText('∂L/∂y = 0.865', { exact: true }).waitFor();
  // Play walks the three stages by itself.
  await lab.getByRole('button', { name: 'Play' }).click();
  await page.clock.runFor(2000);
  await lab.getByText('∂L/∂w₁ = 0.542', { exact: true }).waitFor();
  await lab.getByRole('button', { name: '② Hidden' }).click();
  await lab.getByText('∂L/∂v₁ = 0.465', { exact: true }).waitFor();
  await lab.getByText('∂L/∂h₂ = −0.779', { exact: true }).waitFor();
  await lab.getByRole('button', { name: '③ Input side' }).click();
  await lab.getByText('∂L/∂w₂ = −0.533', { exact: true }).waitFor();
  // The full stage draws the plain-words conclusion: which weight to turn which way.
  await lab.getByText("Backpropagation's answer: turn which weight, which way?").waitFor();
  await lab.getByText('increasing it widens the gap → decrease it').first().waitFor();
  await lab.getByText('increasing it shrinks the gap → increase it').first().waitFor();

  // The numeric check: nudging a weight by 0.01 changes the loss by about gradient × 0.01.
  await lab.getByText('Check it in numbers: move a weight by +0.01?').click();
  await lab.getByRole('cell', { name: '0.00542', exact: true }).waitFor(); // w₁ predicted
  await lab.getByRole('cell', { name: '0.00543', exact: true }).waitFor(); // w₁ actual, recomputed
  await lab.getByRole('button', { name: 'v₂', exact: true }).click();
  await lab.getByRole('cell', { name: '−0.00329', exact: true }).waitFor();
  await lab.getByRole('cell', { name: '−0.00327', exact: true }).waitFor();

  // Step 3, fix it as told: each press lowers the loss until the gap closes.
  await lab.getByRole('button', { name: '3 Fix it as told' }).click();
  assert.match(await lab.getByRole('status').textContent(), /0\.1872 → 0\.0529/);
  const fix = lab.getByRole('button', { name: 'Take 1 step against the gradient' });
  await fix.click();
  await lab.getByText('Steps taken: 1', { exact: true }).waitFor();
  assert.match(await lab.getByRole('status').textContent(), /0\.0529 → 0\.0176/);
  for (let i = 0; i < 5; i++) await fix.click();
  await lab.getByText('Steps taken: 6', { exact: true }).waitFor();
  assert.match(await lab.getByRole('status').textContent(), /that's learning/);

  // The link back to the gradient descent lab.
  assert.equal(
    new URL(await lab.getByRole('link', { name: /gradient descent/i }).getAttribute('href'), 'https://x.test').pathname,
    '/en/gradient-descent',
  );

  console.log('PASS: backprop: the try/ask/fix story, played animations, the nudge check, and six steps closing the gap');
}
