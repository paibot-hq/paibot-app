// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview (with the local D1 database migrated).
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: the random waits before "Now!" are fast-forwarded.
  await page.clock.install();
  await go('reaction');
  const box = main.locator('[data-reaction="box"]');
  const phase = () => box.getAttribute('data-phase');
  assert.match(await box.innerText(), /^Click to start\s+3 tries$/);
  assert.equal(await main.locator('[data-reaction="progress"] li').count(), 3);

  // Pressing during the wait is too early, and that reaction is simply taken again.
  await box.click();
  assert.equal(await phase(), 'waiting');
  await box.click();
  assert.equal(await phase(), 'too-early');

  // Three reactions: each wait ends within four seconds, the press counts the moment it goes down (the mouse is held,
  // not released), and a keyboard press counts too.
  for (let n = 1; n <= 3; n++) {
    await box.click();
    const waitingFace = await box.evaluate(el => getComputedStyle(el).getPropertyValue('--face'));
    // On to "Now!" (each wait is one to four seconds), stopping as soon as it shows so the timing is the test's own.
    for (let waited = 0; await phase() !== 'go'; waited += 100) {
      assert.ok(waited <= 4100, 'no "Now!" within four seconds');
      await page.clock.runFor(100);
    }
    // The button changes colour for "Now!" (a stylesheet that let one colour win everywhere once hid the signal).
    assert.notEqual(await box.evaluate(el => getComputedStyle(el).getPropertyValue('--face')), waitingFace, '"Now!" looks like the wait');
    await page.clock.runFor(100 + n * 40);
    if (n === 2) {
      await box.focus();
      await page.keyboard.press('Space');
    } else {
      const b = await box.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      if (n < 3) assert.equal(await phase(), 'between', 'counted on the way down');
      await page.mouse.up();
    }
    if (n < 3) {
      // The button says which try is next, and the progress shows the times so far and marks the next try.
      assert.match(await box.innerText(), new RegExp(`^\\d+ms\\s+Click for try ${n + 1}$`));
      const progress = main.locator('[data-reaction="progress"] li');
      assert.deepEqual(await progress.evaluateAll(items => items.map(item => item.dataset.state)), ['done', 'done', 'done'].map((s, i) => (i < n ? 'done' : i === n ? 'now' : 'later')));
      assert.match(await progress.nth(n - 1).innerText(), /\d+ms/);
    }
  }

  // The result: the average, kept and placed among everyone's (rank and chart), and shared.
  const average = main.locator('[data-reaction="average"]');
  await average.waitFor();
  const ms = Number((await average.innerText()).match(/Average: (\d+)ms/)[1]);
  assert.ok(ms >= 100 && ms <= 1000, `${ms}ms`);
  const [, top, total] = (await main.locator('[data-reaction="rank"]').innerText()).match(/^Top (\d+)% of (\d+) results$/).map(Number);
  assert.ok(total >= 1 && top >= 1 && top <= 100, `top ${top}% of ${total}`);
  const chart = main.locator('[data-reaction="chart"]');
  await chart.waitFor();
  assert.match(await chart.locator('svg').getAttribute('aria-label'), /\d+ results/);
  assert.match(await chart.innerText(), new RegExp(`You ${ms}ms`));
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), new RegExp(`${ms}ms \\(top \\d+%\\)`));
  assert.match(x.searchParams.get('url'), /\/en\/reaction$/);

  // Another round starts straight away; the chart now shows everyone's results without a marker.
  await main.locator('[data-reaction="again"]').click();
  assert.equal(await phase(), 'waiting');
  assert.doesNotMatch(await main.locator('[data-reaction="chart"]').innerText(), /You \d+ms/);
  console.log('PASS: reaction: too early is retaken, three presses counted on the way down (and by keyboard), the average kept and ranked on the chart, shared, again');
}
