// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The bowl is drawn with WebGL (headless
// Chromium draws it in software); the page writes what the bowl holds on the stage (data-fish, data-food, data-eaten).
// Feeding is waited for in real time: the fish swim to the food (a few seconds).
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('goldfish');
  const stage = main.locator('[data-goldfish="stage"]');
  const read = async name => Number(await stage.getAttribute(`data-${name}`));
  await page.waitForFunction(() => document.querySelector('[data-goldfish="stage"]')?.dataset.status !== 'loading', undefined, { timeout: 20000 });
  assert.equal(await stage.getAttribute('data-status'), 'ready', 'the 3D bowl is drawn');
  assert.ok(await main.locator('[data-goldfish="stage"] canvas').count() === 1);

  // Three fish to begin with (a wakin, a ryukin and a demekin); one more can be put in, and one scooped out.
  await page.waitForFunction(() => document.querySelector('[data-goldfish="stage"]').dataset.fish === '3');
  await main.locator('[data-goldfish-add="ryukin"]').click();
  await page.waitForFunction(() => document.querySelector('[data-goldfish="stage"]').dataset.fish === '4');
  assert.match(await main.locator('[data-goldfish="count"]').innerText(), /^4 goldfish$/);

  // Food: it appears on the water, and the hungry fish eat it.
  await main.locator('[data-goldfish="feed"]').click();
  await main.locator('[data-goldfish="feed"]').click();
  await page.waitForFunction(() => Number(document.querySelector('[data-goldfish="stage"]').dataset.food) > 0);
  await page.waitForFunction(() => Number(document.querySelector('[data-goldfish="stage"]').dataset.eaten) > 0, undefined, { timeout: 40000 });
  assert.ok(await read('eaten') > 0);

  await main.locator('[data-goldfish="remove"]').click();
  await page.waitForFunction(() => document.querySelector('[data-goldfish="stage"]').dataset.fish === '3');

  // The night light, and the bowl as it was left after a reload (the fish and the light are kept on this device).
  await main.locator('[data-goldfish="night"]').click();
  assert.equal(await main.locator('[data-goldfish="night"]').getAttribute('aria-pressed'), 'true');
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-goldfish="stage"]')?.dataset.status === 'ready', undefined, { timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('[data-goldfish="stage"]').dataset.fish === '3');
  assert.equal(await main.locator('[data-goldfish="night"]').getAttribute('aria-pressed'), 'true');

  // A tap on the glass (the side of the bowl) rings and startles the fish; nothing breaks.
  const box = await main.locator('[data-goldfish="stage"] canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5 + box.height * 0.27, box.y + box.height * 0.55);
  await page.waitForTimeout(300);
  console.log('PASS: goldfish: the 3D bowl drawn with three fish, one put in, fed and the food eaten, one scooped out, the night light, kept after a reload, the glass tapped');
}
