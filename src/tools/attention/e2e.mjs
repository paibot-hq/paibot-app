// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('attention');
  const lab = main.getByRole('region', { name: 'Attention Visualizer' });

  // Default: the cat sentence with たべた selected; step 1 shows the dot-product scores.
  const scores = lab.getByRole('table');
  await scores.getByRole('cell', { name: '1.48', exact: true }).waitFor(); // たべた → さかな
  await scores.getByRole('cell', { name: '−0.54', exact: true }).waitFor(); // たべた → が

  // Selecting another word recomputes the scores for its own q.
  await lab.getByRole('group', { name: /word/i }).getByRole('button', { name: 'ねこ', exact: true }).click();
  await scores.getByRole('cell', { name: '−1.46', exact: true }).waitFor(); // ねこ → たべた

  // The glasses sentence: かける is selected by itself, scores match the hand computation.
  await lab.getByRole('button', { name: '眼鏡をかける' }).click();
  await scores.getByRole('cell', { name: '1.49', exact: true }).waitFor();
  await scores.getByRole('cell', { name: '−0.44', exact: true }).waitFor();

  // Step 2: softmax turns the same scores into percentages, with the example note.
  await lab.getByRole('button', { name: /softmax/i }).click();
  await lab.getByText('67.2%', { exact: true }).waitFor();
  await lab.getByText('9.7%', { exact: true }).waitFor();
  await lab.getByText('23.0%', { exact: true }).waitFor();
  await lab.getByText(/example/i).first().waitFor();

  // Step 3: the weighted average of v moves the arrow and fixes the meaning.
  await lab.getByRole('button', { name: /meaning/i }).click();
  await lab.getByText('(0.67, 0.01)').waitFor();
  assert.match(await lab.getByRole('status').textContent(), /put on/i);

  // 電話/橋 resolve the same かける to the other senses.
  await lab.getByRole('button', { name: '電話をかける' }).click();
  await lab.getByRole('button', { name: /meaning/i }).click();
  assert.match(await lab.getByRole('status').textContent(), /call/i);
  await lab.getByRole('button', { name: '橋をかける' }).click();
  await lab.getByRole('button', { name: /meaning/i }).click();
  assert.match(await lab.getByRole('status').textContent(), /build/i);

  console.log('PASS: attention: scores, word selection, softmax percentages, and the three senses of かける');
}
