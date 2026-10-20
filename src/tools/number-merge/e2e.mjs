// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('number-merge');
  const tiles = () => main.locator('[data-tile]');
  const sum = async () => (await tiles().evaluateAll(items => items.map(item => Number(item.dataset.tile)))).reduce((a, b) => a + b, 0);
  // Two tiles to begin with (a 2 or a 4 each), no score.
  await tiles().first().waitFor();
  assert.equal(await tiles().count(), 2);
  assert.equal(await main.locator('[data-merge="score"]').innerText(), '0');
  assert.ok(await sum() >= 4 && await sum() <= 8);

  // Every move that changes the board adds one new tile of 2 or 4 to what was there (merging keeps the sum).
  let moves = 0;
  const keys = ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'];
  for (let i = 0; i < 40 && moves < 12; i++) {
    const before = await sum();
    await page.keyboard.press(keys[i % 4]);
    await page.waitForTimeout(220);
    const after = await sum();
    if (after !== before) { assert.ok([2, 4].includes(after - before), `${before} -> ${after}`); moves++; }
  }
  assert.ok(moves >= 6, `${moves} moves changed the board`);
  assert.notEqual(await main.locator('[data-merge="score"]').innerText(), '0', 'merging scores');

  // Undo takes back the last move (the score and the board), once.
  const [scoreNow, sumNow] = [await main.locator('[data-merge="score"]').innerText(), await sum()];
  let moved = false;
  for (const key of keys) { await page.keyboard.press(key); await page.waitForTimeout(220); if (await sum() !== sumNow) { moved = true; break; } }
  assert.ok(moved);
  await main.locator('[data-merge="undo"]').click();
  assert.equal(await main.locator('[data-merge="score"]').innerText(), scoreNow);
  assert.equal(await sum(), sumNow);
  assert.ok(await main.locator('[data-merge="undo"]').isDisabled(), 'one step back only');

  // A swipe on the board moves the tiles too, and a new game starts again from two tiles.
  const box = await main.locator('[data-merge="board"]').boundingBox();
  const before = await sum();
  for (const [dx, dy] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dx * 90, box.y + box.height / 2 + dy * 90, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(220);
    if (await sum() !== before) break;
  }
  assert.ok(await sum() > before, 'a swipe moved the tiles');
  await main.locator('[data-merge="restart"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-tile]').length === 2);
  assert.equal(await main.locator('[data-merge="score"]').innerText(), '0');
  assert.ok(Number(await main.locator('[data-merge="best"]').innerText()) > 0, 'the best score is kept');
  console.log('PASS: number-merge: two tiles to start, each move adds a 2 or 4 and merging keeps the sum, scoring, undo once, a swipe, new game, the best kept');
}
