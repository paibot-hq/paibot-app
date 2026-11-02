// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('sql');
  const status = main.locator('[data-playground="status"]');
  const output = main.locator('[data-playground="output"]');
  const code = main.getByLabel('Code', { exact: true });
  const run = async () => {
    await main.getByRole('button', { name: '▶ Run' }).and(page.locator(':enabled')).waitFor({ timeout: 60000 });
    await main.getByRole('button', { name: '▶ Run' }).click();
    await page.waitForFunction(() => /Finished|error|Stopped/.test(document.querySelector('[data-playground="status"]').textContent));
  };

  await run();
  const table = output.locator('table');
  assert.deepEqual(await table.locator('th').allTextContents(), ['id', 'name', 'category', 'price']);
  assert.equal(await table.locator('tbody tr').count(), 10);
  assert.match(await output.textContent(), /10 rows$/);
  // The sample tables show every row, one table at a time, with what each column means.
  const tables = main.locator('[data-sql="tables"]');
  assert.equal(await tables.locator('tbody tr').count(), 10);
  assert.match(await tables.locator('tbody tr').first().textContent(), /^1AppleFruit150$/);
  await tables.getByRole('button', { name: /^orders/ }).click();
  assert.equal(await tables.locator('tbody tr').count(), 20);
  assert.match(await tables.locator('thead').textContent(), /customer_idcustomer who bought/);

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

  // Each engine keeps its editor, loads only when selected, and runs real PostgreSQL.
  const sqliteCode = await code.inputValue();
  await main.getByRole('button', { name: 'PostgreSQL', exact: true }).click();
  assert.match(await code.inputValue(), /SELECT \* FROM products/);
  await run();
  assert.equal(await output.locator('tbody tr').count(), 10);
  await code.fill("SELECT current_setting('server_version') AS version, '[1,2,3]'::jsonb->>1 AS element;");
  await run();
  assert.match(await output.locator('td').first().textContent(), /^\d+\./);
  assert.equal(await output.locator('td').nth(1).textContent(), '2');
  await code.fill('DELETE FROM orders WHERE quantity > 2; UPDATE products SET price = price + 1 WHERE id = 1; SELECT COUNT(*) AS left_over FROM orders;');
  await run();
  assert.match(await output.textContent(), /^8 rows changed.1 row changed./);
  assert.equal(await output.locator('td').textContent(), '12');
  await code.fill('SELECT COUNT(*) AS n FROM orders;');
  await run();
  assert.equal(await output.locator('td').textContent(), '20');
  await main.getByLabel('Open an example').selectOption({ label: 'Monthly sales and running total (window functions)' });
  assert.match(await code.inputValue(), /to_char/);
  await run();
  assert.deepEqual(await output.locator('tbody tr td:first-child').allTextContents(), ['2026-01', '2026-02', '2026-03', '2026-04']);
  await code.fill('SELECT 1;\n\nSELEC name FROM products;');
  await run();
  assert.match(await output.textContent(), /syntax error.*line 3/);
  assert.equal(await main.locator('[data-error]').textContent(), '3');
  await code.fill('SELECT value FROM generate_series(1, 600) AS value;');
  await run();
  assert.equal(await output.locator('tbody tr').count(), 500);
  assert.match(await output.textContent(), /600/);
  const postgresCode = await code.inputValue();
  await main.getByRole('button', { name: 'SQLite', exact: true }).click();
  assert.equal(await code.inputValue(), sqliteCode);
  await main.getByRole('button', { name: 'PostgreSQL', exact: true }).click();
  assert.equal(await code.inputValue(), postgresCode);
  // A long query is cancellable; switching engines cannot leave stale status/output.
  await code.fill('SELECT pg_sleep(60);');
  await main.getByRole('button', { name: '▶ Run' }).click();
  await main.getByRole('button', { name: '■ Stop' }).waitFor();
  await main.getByRole('button', { name: 'SQLite', exact: true }).click();
  await code.fill('SELECT 42 AS answer;');
  await run();
  assert.equal(await output.locator('td').textContent(), '42');
  await main.getByRole('button', { name: 'PostgreSQL', exact: true }).click();
  await code.fill('SELECT 43 AS answer;');
  await run();
  assert.equal(await output.locator('td').textContent(), '43');
  // Old SQLite links without lang keep their dialect even after PostgreSQL was selected.
  const { encodeCode } = await import('../../lib/code-runner.ts');
  const shared = await encodeCode("SELECT sqlite_version() AS version;");
  await page.goto(`${new URL(page.url()).origin}/en/sql#code=${shared}`);
  await page.reload();
  await run();
  assert.equal(await main.getByRole('button', { name: 'SQLite', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.match(await output.locator('td').textContent(), /^3\./);
  console.log('PASS: PostgreSQL switching, types, samples, fresh databases, errors, limits, cancellation and old SQLite links');

  console.log('PASS: sql: the sample tables and their rows, a LEFT JOIN, counted changes on a fresh database each run, and an error line');
}
