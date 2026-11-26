// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('backprop');
  const lab = main.getByRole('region', { name: 'Backpropagation Visualizer' });
  const narration = lab.getByRole('status');
  // The film runs on timers, so drive it on the page's clock.
  await page.clock.install();

  // Idle: the whole graph, the meter and the invitation to play.
  await lab.getByText('What to watch: the red gap (loss) bar shrinking to 0').waitFor();
  await lab.getByText("network's answer y = 0.93", { exact: true }).waitFor();
  await lab.getByText('wanted answer t = 0.50', { exact: true }).waitFor();
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor();
  assert.match(await narration.textContent(), /Press ▶ Play/);

  // Frame by frame through round 1: the forward flow reveals the graph in
  // computation order, the blame frames print the gradients on the edges.
  const step = lab.getByRole('button', { name: '1 frame' });
  await step.click(); // frame 0: input side only
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor({ state: 'hidden' });
  await step.click(); // frame 1: hidden units
  await lab.getByText('h₁ = tanh(a₁) = 0.537', { exact: true }).waitFor();
  await step.click(); // frame 2: the answer and the loss
  await step.click(); // frame 3: measuring the gap
  assert.match(await narration.textContent(), /Measure the gap/);
  await step.click(); // frame 4: blame on the output side
  await lab.getByText('∂L/∂y = 0.865', { exact: true }).waitFor();
  await lab.getByText('∂L/∂v₁ = 0.465', { exact: true }).waitFor();
  await step.click(); // frame 5: blame reaches the input side
  await lab.getByText('∂L/∂w₁ = 0.542', { exact: true }).waitFor();
  await lab.getByText('∂L/∂w₂ = −0.533', { exact: true }).waitFor();
  assert.match(await narration.textContent(), /thicker the line/);
  await step.click(); // frame 6: the update nudges the weights
  await lab.getByText('w₁ = 0.64', { exact: true }).waitFor();
  assert.match(await narration.textContent(), /Nudge each weight/);

  // Play the rest of the film: five more rounds close the gap.
  await lab.getByRole('button', { name: 'Play' }).click();
  await page.clock.runFor(45000);
  assert.match(await narration.textContent(), /Six rounds/);
  await lab.getByText('0.000', { exact: true }).waitFor(); // the meter's loss
  await lab.getByText('Round 6 / 6', { exact: true }).waitFor();

  // Restart returns to the idle opening.
  await lab.getByRole('button', { name: 'Restart' }).click();
  await lab.getByText('0.187', { exact: true }).waitFor();
  assert.match(await narration.textContent(), /Press ▶ Play/);

  // The numeric check under the film: nudging a weight by 0.01 changes the
  // loss by about gradient × 0.01, at the initial weights.
  await main.getByText('Check it in numbers: move a weight by +0.01?', { exact: false }).click();
  await main.getByRole('cell', { name: '0.00542', exact: true }).waitFor(); // w₁ predicted
  await main.getByRole('cell', { name: '0.00543', exact: true }).waitFor(); // w₁ actual, recomputed
  await main.getByRole('button', { name: 'v₂', exact: true }).click();
  await main.getByRole('cell', { name: '−0.00329', exact: true }).waitFor();
  await main.getByRole('cell', { name: '−0.00327', exact: true }).waitFor();

  // The link back to the gradient descent lab.
  assert.equal(
    new URL(await lab.getByRole('link', { name: /gradient descent/i }).getAttribute('href'), 'https://x.test').pathname,
    '/en/gradient-descent',
  );

  console.log('PASS: backprop: the film frame by frame, six rounds closing the gap, the nudge check');
}
