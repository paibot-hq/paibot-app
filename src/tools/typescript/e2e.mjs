// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, base }) {
  await go('typescript');
  const status = main.locator('[data-playground="status"]');
  const output = main.locator('[data-playground="output"]');
  const run = async () => {
    await main.getByRole('button', { name: '▶ Run' }).click();
    await page.waitForFunction(() => /Finished|error|Stopped/.test(document.querySelector('[data-playground="status"]').textContent), null, { timeout: 30000 });
  };
  // The compiler loads first.
  await main.getByRole('button', { name: '▶ Run' }).and(page.locator(':enabled')).waitFor({ timeout: 30000 });
  await run();
  assert.match(await status.textContent(), /Finished/);
  assert.equal(await output.textContent(), 'Aoi (17) writes TypeScript and Python.\n');

  // A type error is listed with its line, and the code still runs.
  await main.getByLabel('Open an example').selectOption({ label: 'See a type error' });
  await run();
  assert.match(await status.textContent(), /Ended with an error/);
  assert.match(await output.textContent(), /^7: TS2345: Argument of type 'string' is not assignable to parameter of type 'number'\.3\n12\n$/);
  assert.equal(await main.locator('[data-error]').textContent(), '7');

  // Narrowing a union: no errors.
  await main.getByLabel('Open an example').selectOption({ label: 'Union types and narrowing' });
  await run();
  assert.match(await output.textContent(), /circle 3\.14\nrect 12\.00\ntriangle 6\.00/);

  // In Japanese the type errors are in Japanese.
  await page.goto(`${base}/ja/typescript`);
  await page.waitForFunction(() => document.documentElement.dataset.theme);
  await main.getByLabel('コード', { exact: true }).fill('const n: number = "x";');
  await main.getByRole('button', { name: '▶ 実行' }).and(page.locator(':enabled')).waitFor({ timeout: 30000 });
  await main.getByRole('button', { name: '▶ 実行' }).click();
  await page.waitForFunction(() => /エラーで終了/.test(document.querySelector('[data-playground="status"]').textContent), null, { timeout: 30000 });
  assert.match(await output.textContent(), /1: TS2322: 型 'string' を型 'number' に割り当てることはできません。/);
  console.log('PASS: typescript: runs, lists a type error by line and still runs, narrows a union, and speaks Japanese');
}
