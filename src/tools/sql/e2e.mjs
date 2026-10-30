// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('sql');
  const status = main.locator('[data-playground="status"]');
  const output = main.locator('[data-playground="output"]');
  const code = main.getByLabel('Code', { exact: true });
  const run = async () => {
    await main.getByRole('button', { name: '▶ Run' }).and(page.locator(':enabled')).waitFor({ timeout: 20000 });
    await main.getByRole('button', { name: '▶ Run' }).click();
    await page.waitForFunction(() => /Finished|error|Stopped/.test(document.querySelector('[data-playground="status"]').textContent));
  };

  await run();
  const table = output.locator('table');
  assert.deepEqual(await table.locator('th').allTextContents(), ['id', 'name', 'category', 'price']);
  assert.equal(await table.locator('tbody tr').count(), 10);
  assert.match(await output.textContent(), /10 rows$/);
  assert.match(await main.textContent(), /Sample tables/);

  // A join of the three tables.
  await main.getByLabel('Open an example').selectOption({ label: 'Customers without orders too (LEFT JOIN)' });
  await run();
  const rows = await output.locator('tbody tr').allTextContents();
  assert.equal(rows.length, 6);
  assert.equal(rows[5], 'GarciaNew York00');

  // Changes are counted, and the next run starts from the sample again.
  await code.fill('DELETE FROM orders WHERE quantity > 2;\nSELECT COUNT(*) AS left_over FROM orders;');
  await run();
  assert.equal(await output.textContent(), '8 rows changed.left_over121 row');
  await code.fill('SELECT COUNT(*) AS n FROM orders;');
  await run();
  assert.equal(await output.locator('td').textContent(), '20');

  // A mistake names its statement's line.
  await code.fill('SELECT 1;\n\nSELEC name FROM products;');
  await run();
  assert.match(await status.textContent(), /Ended with an error/);
  assert.match(await output.textContent(), /near "SELEC": syntax error \(line 3\)/);
  assert.equal(await main.locator('[data-error]').textContent(), '3');
  console.log('PASS: sql: the sample tables, a LEFT JOIN, counted changes on a fresh database each run, and an error line');
}
