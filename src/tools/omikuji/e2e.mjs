// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('omikuji');
  // The page's clock is the test's, so that the box's shaking is fast-forwarded.
  const box = main.locator('[data-omikuji="box"]');
  await box.waitFor();
  assert.equal(await main.locator('[data-omikuji="paper"]').count(), 0, 'nothing is drawn yet');
  await box.click();
  assert.equal(await main.locator('[data-omikuji="stage"]').getAttribute('data-stage'), 'shaking');
  assert.equal(await box.isDisabled(), true, 'the box cannot be pulled again while it is being shaken');
  // The shaking, the stick and the opening of the paper take about two seconds.
  const paper = main.locator('[data-omikuji="paper"]');
  await paper.waitFor({ timeout: 5000 });
  assert.ok((await main.locator('[data-omikuji="luck"]').innerText()).trim().length > 0, 'a luck');
  assert.equal(await paper.locator('dl > div').count(), 4, 'a line for each of four things');
  assert.match(await paper.innerText(), /\d/, 'a stick number and a lucky number');
  assert.doesNotMatch(await paper.innerText(), /omikuji\.|lines\./, 'the words are shown, not their keys');
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('url'), /\/en\/omikuji$/, 'shared with a link to the page');
  // Again: the box is back, and a new draw gives a paper again.
  await main.locator('[data-omikuji="again"]').click();
  await box.waitFor();
  assert.equal(await paper.count(), 0);
  await box.click();
  await paper.waitFor({ timeout: 5000 });
  console.log('PASS: omikuji: the box is shaken, a stick comes out, the paper opens with the luck and four lines, again');
}
