// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ main, go }) {
  await go('backprop');
  const lab = main.getByRole('region', { name: 'Backpropagation Visualizer' });

  // Step 1, the forward pass: the hand-placed numbers settle into y and L.
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor();
  await lab.getByText(/y = 0\.933\. The squared difference .* L = 0\.187\./).waitFor();

  // Step 2, backpropagation: the chain rule walks in from the loss.
  await lab.getByRole('button', { name: '2 Backpropagation' }).click();
  await lab.getByText('∂L/∂y = 0.865', { exact: true }).waitFor();
  await lab.getByRole('button', { name: '② Hidden' }).click();
  await lab.getByText('∂L/∂v₁ = 0.465', { exact: true }).waitFor();
  await lab.getByText('∂L/∂h₂ = −0.779', { exact: true }).waitFor();
  await lab.getByRole('button', { name: '③ Input side' }).click();
  await lab.getByText('∂L/∂w₁ = 0.542', { exact: true }).waitFor();
  await lab.getByText('∂L/∂w₂ = −0.533', { exact: true }).waitFor();

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

  console.log('PASS: backprop: forward values, staged chain rule, nudge check, and the update lowering the loss');
}
