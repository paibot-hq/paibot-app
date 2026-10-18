// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: the claw's trips are fast-forwarded instead of waited for.
  await page.clock.install();
  // A prize won before, in this browser: the collection shows it.
  await page.addInitScript(() => { if (!localStorage.getItem('crane-game:v1')) localStorage.setItem('crane-game:v1', JSON.stringify({ collection: { pi: 2 }, sound: false })); });
  await go('crane-game');
  const text = name => main.locator(`[data-crane="${name}"]`).innerText();
  const move = main.locator('[data-crane="move"]'), drop = main.locator('[data-crane="drop"]');
  // A play is over when the claw is back and the drop button can be pressed again (or the round's result shows): the clock goes on in steps
  // until then, up to 15 seconds, rather than always 15 seconds (every frame of the 3D scene is drawn on the way).
  const finishPlay = async () => {
    for (let ms = 0; ms < 15000; ms += 500) {
      await page.clock.runFor(500);
      if (!(await drop.isDisabled()) || await main.locator('[data-crane="result"]').count()) return;
    }
    throw new Error('the claw did not come back within 15 seconds');
  };
  assert.equal(await main.locator('[data-crane="plays"]').getAttribute('data-left'), '5');
  assert.equal(await text('owned'), '1 / 10');
  assert.match(await main.locator('li[data-owned]').innerText(), /Pi plush\s*×2/);

  // Hold "move": the claw goes right while it is held; let go and it cannot move again, only drop. (Opening the page scrolls the machine
  // into view first.)
  await page.clock.runFor(100);
  await move.scrollIntoViewIfNeeded();
  const box = await move.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(1500);
  await page.mouse.up();
  await page.clock.runFor(100);
  assert.equal(await move.isDisabled(), true, 'one move a play');
  assert.equal(await drop.isDisabled(), false);
  await drop.click();
  await page.clock.runFor(100);
  assert.equal(await drop.isDisabled(), true, 'no buttons while the claw is on its way');
  await finishPlay();
  assert.match(await text('message'), /^(You won .+!|So close! It slipped…|Lifted it, but it slipped out…|Nothing caught… aim at the middle of a prize)$/);
  assert.equal(await main.locator('[data-crane="plays"]').getAttribute('data-left'), '4');

  // The keyboard: → held moves, ↓ drops.
  await main.locator('[data-crane="canvas"]').focus();
  await page.keyboard.down('ArrowRight');
  await page.clock.runFor(800);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await finishPlay();
  assert.equal(await main.locator('[data-crane="plays"]').getAttribute('data-left'), '3');

  // The rest of the round, then the result: how many were won, a new round, and sharing.
  for (let play = 0; play < 3; play++) {
    await drop.click();
    await finishPlay();
  }
  const result = main.locator('[data-crane="result"]');
  await result.waitFor();
  assert.match(await result.innerText(), /\d+ prizes in 5 plays/);
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), /claw machine/);
  assert.match(x.searchParams.get('url'), /\/en\/crane-game$/);
  await main.locator('[data-crane="again"]').click();
  await page.clock.runFor(100);
  assert.equal(await main.locator('[data-crane="plays"]').getAttribute('data-left'), '5');
  console.log('PASS: crane-game: hold to move once, drop, the result of a play, the keyboard, five plays a round, the result shared, a new round, the collection kept');
}
