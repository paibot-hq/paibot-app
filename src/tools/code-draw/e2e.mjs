// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// How many pixels are lit (not the dark background or the faint grid).
const ink = canvas => canvas.evaluate(element => {
  const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 300) count++;
  return count;
});

export default async function ({ page, main, go }) {
  await go('code-draw');
  await page.clock.install();
  const status = main.locator('[data-code-draw="status"]');
  const canvas = main.locator('canvas');
  const code = main.getByLabel('Code', { exact: true });
  assert.match(await status.textContent(), /Press "▶ Run"/);
  const blank = await ink(canvas);

  // The starting square is drawn step by step, then finished.
  await main.getByRole('button', { name: '▶ Run' }).click();
  await page.clock.runFor(300);
  assert.match(await status.textContent(), /Running… \(line \d\)/);
  await page.clock.runFor(5000);
  assert.match(await status.textContent(), /Done! The robot made 8 moves/);
  assert.ok(await ink(canvas) > blank + 1000, 'the square is drawn');

  // Moving a number redraws at once: 4 rounds become 5.
  await main.getByLabel('Line 2 repeat').fill('5');
  assert.match(await code.inputValue(), /repeat 5 \[/);
  await page.clock.runFor(100);
  assert.match(await status.textContent(), /made 10 moves/);

  // A mistake says which line.
  await code.fill('forward 50\njump 10');
  await main.getByRole('button', { name: '▶ Run' }).click();
  await page.clock.runFor(2000);
  assert.equal(await status.textContent(), 'Line 2: there is no command "jump".');

  // A challenge is cleared by drawing the faint square; the palette types a command at the cursor.
  await main.getByRole('button', { name: 'Challenges' }).click();
  await main.getByRole('button', { name: 'Instant' }).click();
  await code.fill('');
  await main.getByRole('button', { name: 'repeat', exact: true }).click();
  await page.keyboard.type('forward 100 right 90');
  assert.equal(await code.inputValue(), 'repeat 4 [\n  forward 100 right 90\n]');
  await main.getByRole('button', { name: '▶ Run' }).click();
  await page.clock.runFor(100);
  assert.equal(await status.textContent(), 'Cleared in 3 lines! That is the shortest way!');
  await main.getByRole('button', { name: '✓ 1. Square' }).waitFor();
  await main.getByRole('button', { name: 'Next challenge' }).click();
  assert.match(await main.textContent(), /Challenge 2: Triangle/);

  // The cleared challenge is remembered.
  await page.reload();
  await main.getByRole('button', { name: 'Challenges' }).click();
  await main.getByRole('button', { name: '✓ 1. Square' }).waitFor();
  console.log('PASS: code-draw: the starting square is drawn, a slider redraws it, an error names its line, and a challenge is cleared and remembered');
}
