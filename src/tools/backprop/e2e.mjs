// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('backprop');
  const lab = main.getByRole('region', { name: 'Backpropagation Visualizer' });
  // The play animations run on timers, so drive them on the page's clock.
  await page.clock.install();

  // Step 1, the forward pass: the hand-placed numbers settle into y and L,
  // and the gap meter shows the answer against the target.
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor();
  await lab.getByText(/y = 0\.933\. The squared gap .* L = 0\.187\./).waitFor();
  await lab.getByText("network's answer y = 0.93", { exact: true }).waitFor();
  await lab.getByText('wanted answer t = 0.50', { exact: true }).waitFor();

  // Play hides the graph and lights it up again in computation order.
  await lab.getByRole('button', { name: 'Play' }).click();
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor({ state: 'hidden' });
  await page.clock.runFor(3000);
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor();

  // Step 2, backpropagation: the chain rule walks in from the loss.
  await lab.getByRole('button', { name: '2 Backpropagation' }).click();
  await lab.getByText('∂L/∂y = 0.865', { exact: true }).waitFor();
  // Play walks the three stages by itself.
  await lab.getByRole('button', { name: 'Play' }).click();
  await page.clock.runFor(2000);
  await lab.getByText('∂L/∂w₁ = 0.542', { exact: true }).waitFor();
  await lab.getByRole('button', { name: '② Hidden' }).click();
  await lab.getByText('∂L/∂v₁ = 0.465', { exact: true }).waitFor();
  await lab.getByText('∂L/∂h₂ = −0.779', { exact: true }).waitFor();
  await lab.getByRole('button', { name: '③ Input side' }).click();
  await lab.getByText('∂L/∂w₁ = 0.542', { exact: true }).waitFor();
  await lab.getByText('∂L/∂w₂ = −0.533', { exact: true }).waitFor();
  // The full stage draws the plain-words conclusion: which weight to turn which way.
  await lab.getByText('Which weight to turn, and which way?').waitFor();
  await lab.getByText('increasing it widens the gap → decrease it').first().waitFor();
  await lab.getByText('increasing it shrinks the gap → increase it').first().waitFor();

  // Step 3: nudging a weight by 0.01 changes the loss by about gradient × 0.01.
  await lab.getByRole('button', { name: 'What gradients mean' }).click();
  await lab.getByRole('cell', { name: '0.00542', exact: true }).waitFor(); // w₁ predicted
  await lab.getByRole('cell', { name: '0.00543', exact: true }).waitFor(); // w₁ actual, recomputed
  await lab.getByRole('button', { name: 'v₂', exact: true }).click();
  await lab.getByRole('cell', { name: '−0.00329', exact: true }).waitFor();
  await lab.getByRole('cell', { name: '−0.00327', exact: true }).waitFor();

  // Step 4: one gradient-descent update lowers the loss, with the link to that lab.
  await lab.getByRole('button', { name: 'One update' }).click();
  await lab.getByRole('cell', { name: '0.642', exact: true }).waitFor(); // w₁ after
  await lab.getByRole('cell', { name: '−0.834', exact: true }).waitFor(); // v₂ after
  assert.match(await lab.getByRole('status').textContent(), /0\.1872 → 0\.0529/);
  assert.equal(
    new URL(await lab.getByRole('link', { name: /gradient descent/i }).getAttribute('href'), 'https://x.test').pathname,
    '/en/gradient-descent',
  );

  // Parameters: a range input is set the way React sees it (the native value setter plus an input event).
  const setRange = (locator, value) => locator.evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await lab.getByText('Change the parameters').click();
  await setRange(lab.getByLabel('Learning rate η'), '1');
  await lab.getByRole('cell', { name: '0.208', exact: true }).waitFor(); // w₁ after, at η = 1

  // Applying the update really moves the weights; the next table starts from them.
  await lab.getByRole('button', { name: 'Apply this update' }).click();
  await lab.getByText('Updates applied: 1').waitFor();
  await lab.getByRole('cell', { name: '0.21', exact: true }).waitFor(); // w₁ before, now 0.208

  // Reset returns to the hand-placed constants.
  await lab.getByRole('button', { name: 'Back to the initial values' }).click();
  await lab.getByText('Updates applied: 0').waitFor();
  await lab.getByRole('cell', { name: '0.642', exact: true }).waitFor(); // w₁ after, η = 0.2 again

  // From the initial weights, the largest learning rate overshoots and the page says so.
  await setRange(lab.getByLabel('Learning rate η'), '1.5');
  await lab.getByText('The loss went up', { exact: false }).waitFor();
  await lab.getByRole('button', { name: 'Back to the initial values' }).click();
  await lab.getByText('The loss went down', { exact: false }).waitFor();

  console.log('PASS: backprop: forward values, staged chain rule, played animations, nudge check, parameters and updates');
}
