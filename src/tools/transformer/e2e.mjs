// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('transformer');
  const lab = main.getByRole('region', { name: 'Inside a Transformer' });

  // Step 1 (default): the cat sentence's embeddings and position vectors.
  const table = lab.getByRole('table');
  await table.getByRole('cell', { name: '(0.00, 1.00)', exact: true }).waitFor(); // さかな's embedding
  await table.getByRole('cell', { name: '(0.10, 0.45)', exact: true }).waitFor(); // slot 2's position

  // Step 2: softmax attention weights of を, gathered on the object さかな.
  await lab.getByRole('button', { name: /self-attention/i }).click();
  await lab.getByText('81.5%', { exact: true }).waitFor();
  await lab.getByText('8.0%', { exact: true }).waitFor();

  // Step 3: the FFN + residual moves the vector; the printed coordinates match.
  await lab.getByRole('button', { name: /FFN/ }).click();
  await lab.getByText('(1.02, −0.66)').waitFor();

  // Step 4: softmax over the vocabulary; たべた is the prediction at 68.9%.
  await lab.getByRole('button', { name: /next word/i }).click();
  await lab.getByText('68.9%', { exact: true }).waitFor();
  assert.match(await lab.getByRole('status').textContent(), /たべた/);

  // Changing the object changes the prediction: ねこ が ボール を → おいかけた.
  await lab.getByRole('button', { name: 'ねこがボールを…' }).click();
  await lab.getByRole('button', { name: /next word/i }).click();
  await lab.getByText('67.5%', { exact: true }).waitFor();
  assert.match(await lab.getByRole('status').textContent(), /おいかけた/);

  // とり が そら を → とんだ.
  await lab.getByRole('button', { name: 'とりがそらを…' }).click();
  await lab.getByRole('button', { name: /next word/i }).click();
  await lab.getByText('55.7%', { exact: true }).waitFor();
  assert.match(await lab.getByRole('status').textContent(), /とんだ/);

  console.log('PASS: transformer: embeddings, attention weights, the FFN move, and three different predictions');
}
