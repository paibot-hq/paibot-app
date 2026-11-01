// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. Python (Pyodide) is loaded from the preview
// itself; the numpy example, which downloads from Pyodide's CDN, is not run here.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, base }) {
  await go('code-runner');
  const status = main.locator('[data-playground="status"]');
  const output = main.locator('[data-playground="output"]');
  const code = main.getByLabel('Code', { exact: true });
  const example = label => main.getByLabel('Open an example').selectOption({ label });
  const ready = () => main.getByRole('button', { name: '▶ Run' }).and(page.locator(':enabled')).waitFor({ timeout: 60000 });
  const run = async () => {
    await ready();
    await main.getByRole('button', { name: '▶ Run' }).click();
    await page.waitForFunction(() => /Finished|error|Stopped/.test(document.querySelector('[data-playground="status"]').textContent), null, { timeout: 30000 });
  };
  const stopLoop = async loop => {
    await code.fill(loop);
    await main.getByRole('button', { name: '▶ Run' }).click();
    await main.getByRole('button', { name: '■ Stop' }).click();
    await page.waitForFunction(() => document.querySelector('[data-playground="status"]').textContent === 'Stopped');
  };

  // Python is the first tab, and loads when the page opens.
  assert.equal(await main.getByRole('button', { name: 'Python', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.match(await status.textContent(), /Getting Python ready/);
  await run();
  assert.match(await status.textContent(), /Finished/);
  assert.match(await output.textContent(), /^Hello, world!\nPython 3\.14\.\d+\n1\. Python \(6 letters\)\n/);
  await example('Read standard input');
  await run();
  assert.equal(await output.textContent(), '5 numbers, sum 14, max 5, average 2.8\n');
  // An error: the traceback without Pyodide's own frames, and the line marked.
  await example('How errors look');
  await run();
  assert.match(await status.textContent(), /Ended with an error/);
  assert.match(await output.textContent(), /^2\.0\nTraceback \(most recent call last\):\n {2}File "main\.py", line 5, in <module>[\s\S]*ZeroDivisionError: division by zero$/);
  assert.doesNotMatch(await output.textContent(), /_pyodide/);
  assert.equal(await main.locator('[data-error]').textContent(), '2');
  // Each run starts afresh, and __name__ is "__main__".
  await code.fill('print(globals().get("leftover"))\nleftover = 1\nif __name__ == "__main__":\n    print("main")');
  await run();
  await run();
  assert.equal(await output.textContent(), 'None\nmain\n');
  // A line ending in ":" indents the next one by four spaces.
  await code.fill('');
  await code.focus();
  await page.keyboard.type('for i in range(3):');
  await page.keyboard.press('Enter');
  await page.keyboard.type('print(i)');
  assert.equal(await code.inputValue(), 'for i in range(3):\n    print(i)');
  // An endless loop is stopped, and Python comes back for the next run.
  await stopLoop('while True:\n    pass');
  await code.fill('print(sum(range(101)))');
  await run();
  assert.equal(await output.textContent(), '5050\n');

  // JavaScript keeps its own code; console.log prints objects as Node does.
  await main.getByRole('button', { name: 'JavaScript', exact: true }).click();
  assert.match(await code.inputValue(), /^console\.log\("Hello, world!"\);/);
  await run();
  assert.match(await output.textContent(), /Hello, world!\n1\. JavaScript \(10 letters\)/);
  assert.match(await output.textContent(), /\{ site: 'PAIBOT\.app', year: 2026, tags: \[ 'free', 'browser' \] \}/);
  await example('Read standard input');
  assert.equal(await main.getByLabel('Standard input', { exact: true }).inputValue(), '5\n3 1 4 1 5\n');
  await run();
  assert.match(await output.textContent(), /5 numbers, sum 14, average 2\.8/);
  await code.fill('const list = [1, 2];\nconsole.log(list.length);\nlist.nope();');
  await run();
  assert.match(await output.textContent(), /2\nTypeError: list\.nope is not a function \(line 3\)/);
  assert.equal(await main.locator('[data-error]').textContent(), '3');
  // Timers finish before the run does; an endless loop is stopped.
  await code.fill('setTimeout(() => console.log("later"), 200);\nconsole.log("now");');
  await run();
  assert.equal(await output.textContent(), 'now\nlater\n');
  await stopLoop('while (true) {}');
  // Enter keeps the indentation, one step more after "{".
  await code.fill('');
  await code.focus();
  await page.keyboard.type('if (true) {');
  await page.keyboard.press('Enter');
  await page.keyboard.type('console.log(1);');
  assert.equal(await code.inputValue(), 'if (true) {\n  console.log(1);');

  // Back on Python, its code is still there, and Python is still loaded.
  await main.getByRole('button', { name: 'Python', exact: true }).click();
  assert.equal(await code.inputValue(), 'print(sum(range(101)))');
  assert.equal(await status.textContent(), '');

  // TypeScript: a type error is listed with its line, and the code still runs.
  await main.getByRole('button', { name: 'TypeScript', exact: true }).click();
  await example('See a type error');
  await run();
  assert.match(await status.textContent(), /Ended with an error/);
  assert.match(await output.textContent(), /^7: TS2345: Argument of type 'string' is not assignable to parameter of type 'number'\.3\n12\n$/);
  assert.equal(await main.locator('[data-error]').textContent(), '7');
  await example('Union types and narrowing');
  await run();
  assert.match(await output.textContent(), /circle 3\.14\nrect 12\.00\ntriangle 6\.00/);

  // A link holds the language and the code; opening it brings both back.
  await main.getByRole('button', { name: 'JavaScript', exact: true }).click();
  await main.getByRole('button', { name: 'Copy link' }).click();
  await main.getByRole('button', { name: 'Copied' }).waitFor();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(link, /\/en\/code-runner#lang=javascript&code=[\w-]+$/);
  await page.evaluate(() => localStorage.clear());
  await page.goto(link);
  await page.waitForFunction(() => document.querySelector('main textarea').value === 'if (true) {\n  console.log(1);');
  assert.equal(await main.getByRole('button', { name: 'JavaScript', exact: true }).getAttribute('aria-pressed'), 'true');

  // In Japanese the type errors are in Japanese.
  await page.goto(`${base}/ja/code-runner#lang=typescript`);
  await page.waitForFunction(() => document.documentElement.dataset.theme);
  await main.getByLabel('コード', { exact: true }).fill('const n: number = "x";');
  await main.getByRole('button', { name: '▶ 実行' }).and(page.locator(':enabled')).waitFor({ timeout: 30000 });
  await main.getByRole('button', { name: '▶ 実行' }).click();
  await page.waitForFunction(() => /エラーで終了/.test(document.querySelector('[data-playground="status"]').textContent), null, { timeout: 30000 });
  assert.match(await output.textContent(), /1: TS2322: 型 'string' を型 'number' に割り当てることはできません。/);
  console.log('PASS: code-runner: Python, JavaScript and TypeScript in tabs, each with its own code; output, standard input, error lines, stop, indent, a shared link with its language, Japanese type errors');
}
