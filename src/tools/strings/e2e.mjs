// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('strings');
  const note = () => main.locator('[data-strings="note"]').getAttribute('data-note');
  // The page's coordinates of a string's height and of a place on the neck (a fret line, or between two of them).
  const stringY = async course => { const box = await main.locator(`[data-string="${course}"] line`).first().boundingBox(); return box.y + box.height / 2; };
  const fretX = async n => { const box = await main.locator(`[data-fret="${n}"]`).boundingBox(); return box.x + box.width / 2; };
  const between = async (a, b) => ((await fretX(a)) + (await fretX(b))) / 2;
  await main.locator('svg[data-instrument]').scrollIntoViewIfNeeded();

  // Mandolin: a touch between the 4th and 5th frets of the top string (E5) sounds the 5th fret, A5; the open string is behind the nut.
  assert.equal(await main.locator('svg[data-instrument]').getAttribute('data-instrument'), 'mandolin');
  await page.mouse.move(await between(4, 5), await stringY(0));
  await page.mouse.down();
  assert.equal(await note(), 'A5');
  await page.mouse.up();
  const box = await main.locator('svg[data-instrument]').boundingBox();
  await page.mouse.move(box.x + box.width * 0.05, await stringY(1));
  await page.mouse.down();
  assert.equal(await note(), 'A4', 'behind the nut is the open string');
  // Dragging across to the string below strums it, at the same place on the neck.
  await page.mouse.move(box.x + box.width * 0.05, await stringY(2), { steps: 6 });
  assert.equal(await note(), 'D4');
  await page.mouse.up();
  // The open strings are buttons too.
  await main.getByRole('button', { name: 'Play the G string' }).click();
  assert.equal(await note(), 'G3');

  // Violin: no frets, but the notes are marks on the neck; a touch on the 7th mark of the A string is E5, and moving up a string gives B5.
  await main.locator('[data-strings="pick-violin"]').click();
  assert.equal(await main.locator('svg[data-instrument]').getAttribute('data-instrument'), 'violin');
  await page.mouse.move(await fretX(7), await stringY(1));
  await page.mouse.down();
  assert.equal(await note(), 'E5');
  await page.mouse.move(await fretX(7), await stringY(0), { steps: 6 });
  assert.equal(await note(), 'B5');
  await page.mouse.up();
  // The settings are kept: the page opens on the violin next time.
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('paibot.strings')).instrument), 'violin');
  console.log('PASS: strings: mandolin frets and open string, a strum across strings, the open-string buttons, the violin notes and the change of string');
}
