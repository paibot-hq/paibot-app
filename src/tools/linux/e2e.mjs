import assert from 'node:assert/strict';

// Boots the actual Linux kernel, not a mocked shell. The two upstream boot images
// are fetched with SHA-256 integrity; the emulator/wasm come from our own build.
export const alone = true;
export default async function ({ page, main, go }) {
  await go('linux');
  const status = main.locator('[data-linux-status]');
  const ready = () => main.locator('[data-linux-status="ready"]').waitFor({ timeout: 90000 });
  const screen = main.locator('.xterm-accessibility-tree');
  const run = async code => {
    await main.getByLabel('Command', { exact: true }).fill(code);
    await main.getByRole('button', { name: 'Send', exact: true }).click();
  };
  const contains = async text => {
    // xterm pauses its DOM renderer while offscreen (selecting an example scrolls down).
    await main.locator('.xterm').scrollIntoViewIfNeeded();
    await page.waitForFunction(value => document.querySelector('.xterm-accessibility-tree')?.textContent.includes(value), text, { timeout: 15000 });
  };
  assert.equal(await status.getAttribute('data-linux-status'), 'idle');
  await main.getByRole('button', { name: 'Start Linux', exact: true }).click();
  await ready();
  await run('uname -s');
  await contains('Linux');
  await run('pwd');
  await contains('/root/practice');
  await main.getByRole('button', { name: /cat hello.txt/ }).click();
  assert.equal(await main.getByLabel('Command', { exact: true }).inputValue(), 'cat hello.txt');
  await main.getByRole('button', { name: 'Send', exact: true }).click();
  await contains('Hello from Linux!');
  await run('grep ERROR app.log');
  await contains('ERROR file missing');
  await run("printf 'one\\ntwo\\n' | wc -l");
  await contains('2');
  await run("printf 'persist%s\\n' ed > session.txt");
  await run('cat session.txt');
  await contains('persisted');
  await main.getByRole('button', { name: 'Reset', exact: true }).click();
  await main.getByRole('button', { name: 'Cancel', exact: true }).click();
  await run('cat session.txt');
  await contains('persisted');
  await main.getByRole('button', { name: 'Reset', exact: true }).click();
  await main.getByRole('button', { name: 'Reset and restart', exact: true }).click();
  await ready();
  await run("test -e session.txt || printf 'fresh-%s\\n' session");
  await contains('fresh-session');
  assert.ok(!(await screen.textContent()).includes('Hello from Linux!'));
  // A busy guest must remain stoppable, and starting again must make a fresh VM.
  await run('while true; do :; done');
  await main.getByRole('button', { name: 'Ctrl+C', exact: true }).click();
  await run("printf 'interrup%s\\n' ted");
  await contains('interrupted');
  await run('while true; do :; done');
  await main.getByRole('button', { name: 'Stop', exact: true }).click();
  assert.equal(await status.getAttribute('data-linux-status'), 'stopped');
  await page.route('https://i.copy.sh/**', route => route.abort());
  await main.getByRole('button', { name: 'Start Linux', exact: true }).click();
  await main.locator('[data-linux-status="error"]').waitFor({ timeout: 15000 });
  await main.getByRole('alert').waitFor();
  await page.unroute('https://i.copy.sh/**');
  await main.getByRole('button', { name: 'Start Linux', exact: true }).click();
  await ready();
  await run("printf 'recover%s\\n' ed");
  await contains('recovered');
  // Leaving the tool tears down the VM worker.
  await page.goto(new URL('/en/apps', page.url()).href);
}
