// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview (with the local D1 database migrated).
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: the ten minutes are fast-forwarded.
  await page.clock.install();
  await go('iq-test');
  const test = main.locator('[data-iq="test"]');

  // Sixteen puzzles, one after another (by mouse, and by the number keys), each with eight choices and a clock.
  await main.locator('[data-iq="start"]').click();
  for (let n = 1; n <= 16; n++) {
    assert.equal(await test.getAttribute('data-question'), String(n));
    assert.equal(await test.locator('[data-iq-choice]').count(), 8);
    assert.match(await main.locator('[data-iq="left"]').innerText(), /^\d+:\d\d left$/);
    if (n % 2) await test.locator('[data-iq-choice="0"]').click();
    else await page.keyboard.press(String(1 + (n % 8)));
  }

  // The result: the score and each puzzle right or wrong, an IQ and a rank among everyone's, the chart, and sharing.
  const result = main.locator('[data-iq="result"]');
  await result.waitFor();
  const score = Number((await main.locator('[data-iq="score"]').innerText()).match(/^(\d+) of 16 right$/)[1]);
  assert.equal(await result.locator('ol li').count(), 16);
  assert.equal(await result.locator('ol li[data-right]').count(), score);
  await main.locator('[data-iq="iq"]').waitFor();
  const iq = Number((await main.locator('[data-iq="iq"]').innerText()).replace(/\D/g, ''));
  assert.ok(iq >= 40 && iq <= 160, `IQ ${iq}`);
  const [, top, total] = (await main.locator('[data-iq="rank"]').innerText()).match(/^Top (\d+)% of (\d+) tests$/).map(Number);
  assert.ok(total >= 1 && top >= 1 && top <= 99, `top ${top}% of ${total}`);
  await main.locator('[data-iq="chart"]').waitFor();
  assert.match(await main.locator('[data-iq="chart"]').innerText(), new RegExp(`You ${score}`));
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), new RegExp(`IQ ${iq} \\(top ${top}%\\), ${score} of 16 right`));
  assert.match(x.searchParams.get('url'), /\/en\/iq-test$/);

  // Again: a new test, and when the ten minutes run out it ends by itself (puzzles not reached count as wrong).
  await main.locator('[data-iq="again"]').click();
  assert.equal(await test.getAttribute('data-question'), '1');
  await test.locator('[data-iq-choice="3"]').click();
  await page.clock.runFor(10 * 60 * 1000 + 1000);
  await result.waitFor();
  assert.match(await main.locator('[data-iq="score"]').innerText(), /^[01] of 16 right$/);
  console.log('PASS: iq-test: sixteen puzzles by mouse and keys, the score, an IQ and rank among everyone, the chart, shared, again, the time limit');
}
