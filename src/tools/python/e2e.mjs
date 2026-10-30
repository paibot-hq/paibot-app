// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. Python (Pyodide) is loaded from the preview
// itself; the numpy example, which downloads from Pyodide's CDN, is not run here.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('python');
  const status = main.locator('[data-playground="status"]');
  const output = main.locator('[data-playground="output"]');
  const code = main.getByLabel('Code', { exact: true });
  const ready = () => main.getByRole('button', { name: '▶ Run' }).and(page.locator(':enabled')).waitFor({ timeout: 60000 });
  const run = async () => {
    await main.getByRole('button', { name: '▶ Run' }).click();
    await page.waitForFunction(() => /Finished|error|Stopped/.test(document.querySelector('[data-playground="status"]').textContent), null, { timeout: 30000 });
  };

  assert.match(await status.textContent(), /Getting Python ready/);
  await ready();
  await run();
  assert.match(await status.textContent(), /Finished/);
  assert.match(await output.textContent(), /^Hello, world!\nPython 3\.14\.\d+\n1\. Python \(6 letters\)\n/);

  // Standard input through input().
  await main.getByLabel('Open an example').selectOption({ label: 'Read standard input' });
  await run();
  assert.equal(await output.textContent(), '5 numbers, sum 14, max 5, average 2.8\n');

  // An error: the traceback without Pyodide's own frames, and the line marked.
  await main.getByLabel('Open an example').selectOption({ label: 'How errors look' });
  await run();
  assert.match(await status.textContent(), /Ended with an error/);
  const text = await output.textContent();
  assert.match(text, /^2\.0\nTraceback \(most recent call last\):\n {2}File "main\.py", line 5, in <module>/);
  assert.match(text, /ZeroDivisionError: division by zero$/);
  assert.doesNotMatch(text, /_pyodide/);
  assert.equal(await main.locator('[data-error]').textContent(), '2');

  // Each run starts afresh, and __name__ is "__main__".
  await code.fill('print(globals().get("leftover"))\nleftover = 1\nif __name__ == "__main__":\n    print("main")');
  await run();
  await run();
  assert.equal(await output.textContent(), 'None\nmain\n');

  // Typing: a line ending in ":" indents the next one by four spaces.
  await code.fill('');
  await code.focus();
  await page.keyboard.type('for i in range(3):');
  await page.keyboard.press('Enter');
  await page.keyboard.type('print(i)');
  assert.equal(await code.inputValue(), 'for i in range(3):\n    print(i)');

  // An endless loop is stopped, and Python comes back for the next run.
  await code.fill('while True:\n    pass');
  await main.getByRole('button', { name: '▶ Run' }).click();
  await main.getByRole('button', { name: '■ Stop' }).click();
  await page.waitForFunction(() => document.querySelector('[data-playground="status"]').textContent === 'Stopped');
  await code.fill('print(sum(range(101)))');
  await run();
  assert.equal(await output.textContent(), '5050\n');
  console.log('PASS: python: loads, prints, reads standard input, shows a clean traceback with its line, starts each run afresh, indents, and stops');
}
