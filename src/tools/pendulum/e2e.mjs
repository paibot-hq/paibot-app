// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

const stats = main => main.locator('[data-pendulum="stats"]');

export default async function ({ page, main, go }) {
  await go('pendulum');
  const numbers = async () => { const [seconds, distance] = (await stats(main).textContent()).match(/\d+\.\d+/g).map(Number); return { seconds, distance }; };
  // It runs by itself: the time goes on.
  await page.waitForFunction(() => Number(document.querySelector('[data-pendulum="stats"]').textContent.match(/\d+\.\d+/)[0]) > 0.5);
  // Paused, the time stands still; starting again sets it back to zero.
  await main.locator('[data-pendulum="run"]').click();
  await main.getByRole('button', { name: 'Paused' }).waitFor();
  const first = await numbers();
  await page.waitForTimeout(400);
  assert.equal((await numbers()).seconds, first.seconds, 'paused');
  await main.locator('[data-pendulum="restart"]').click();
  await page.waitForFunction(() => /^Time 0\.0 /.test(document.querySelector('[data-pendulum="stats"]').textContent));
  // The start can be changed: with a wide spread and four times the speed the first and last pendulums fly far apart (chaos).
  await main.getByRole('button', { name: '1°', exact: true }).click();
  await main.getByRole('button', { name: '×4', exact: true }).click();
  await main.locator('[data-pendulum="run"]').click();
  await main.getByRole('button', { name: 'Running' }).waitFor();
  await page.waitForFunction(() => {
    const [, distance] = document.querySelector('[data-pendulum="stats"]').textContent.match(/\d+\.\d+/g).map(Number);
    return distance > 1;
  }, undefined, { timeout: 45000 });
  // One pendulum is shown on its own when the count is set to one.
  await main.getByLabel('Pendulums', { exact: true }).fill('1');
  await page.waitForFunction(() => /pendulum 0\.00$/.test(document.querySelector('[data-pendulum="stats"]').textContent));
  console.log('PASS: pendulum: it runs, pauses and restarts; a start a hair apart ends far apart; the count can be changed');
}
