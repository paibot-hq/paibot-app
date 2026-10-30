// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('javascript');
  const status = main.locator('[data-playground="status"]');
  const output = main.locator('[data-playground="output"]');
  const code = main.getByLabel('Code', { exact: true });
  const run = async () => {
    await main.getByRole('button', { name: '▶ Run' }).click();
    await page.waitForFunction(() => /Finished|error|Stopped/.test(document.querySelector('[data-playground="status"]').textContent));
  };

  // The first example: console.log of text and of an object, Node-style.
  await run();
  assert.match(await status.textContent(), /Finished \(\d+ ms\)/);
  assert.match(await output.textContent(), /Hello, world!\n1\. JavaScript \(10 letters\)/);
  assert.match(await output.textContent(), /\{ site: 'PAIBOT\.app', year: 2026, tags: \[ 'free', 'browser' \] \}/);

  // Standard input, read by input().
  await main.getByLabel('Open an example').selectOption({ label: 'Read standard input' });
  assert.equal(await main.getByLabel('Standard input', { exact: true }).inputValue(), '5\n3 1 4 1 5\n');
  await run();
  assert.match(await output.textContent(), /5 numbers, sum 14, average 2\.8/);

  // A run-time error names its line, which is marked in the editor.
  await code.fill('const list = [1, 2];\nconsole.log(list.length);\nlist.nope();');
  await run();
  assert.match(await status.textContent(), /Ended with an error/);
  assert.match(await output.textContent(), /2\nTypeError: list\.nope is not a function \(line 3\)/);
  assert.equal(await main.locator('[data-error]').textContent(), '3');

  // Timers finish before the run does; an endless loop is stopped.
  await code.fill('setTimeout(() => console.log("later"), 200);\nconsole.log("now");');
  await run();
  assert.equal(await output.textContent(), 'now\nlater\n');
  await code.fill('while (true) {}');
  await main.getByRole('button', { name: '▶ Run' }).click();
  await main.getByRole('button', { name: '■ Stop' }).click();
  await page.waitForFunction(() => document.querySelector('[data-playground="status"]').textContent === 'Stopped');

  // Typing: Enter keeps the indentation, one step more after "{".
  await code.fill('');
  await code.focus();
  await page.keyboard.type('if (true) {');
  await page.keyboard.press('Enter');
  await page.keyboard.type('console.log(1);');
  assert.equal(await code.inputValue(), 'if (true) {\n  console.log(1);');

  // A link holds the code; opening it brings the code back.
  await main.getByRole('button', { name: 'Copy link' }).click();
  await main.getByRole('button', { name: 'Copied' }).waitFor();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(link, /\/en\/javascript#code=[\w-]+$/);
  await page.evaluate(() => localStorage.clear());
  await page.goto(link);
  await page.waitForFunction(() => document.querySelector('main textarea').value === 'if (true) {\n  console.log(1);');
  console.log('PASS: javascript: console output, standard input, an error line, timers, stop, auto-indent and a shared link');
}
