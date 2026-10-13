// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('strings');
  const neck = main.locator('svg[data-instrument]');
  const note = () => main.locator('[data-strings="note"]').getAttribute('data-note');
  // The page's coordinates of a string's height and of a place on the neck (a fret line, or between two of them).
  const stringY = async course => { const box = await main.locator(`[data-string="${course}"] line`).first().boundingBox(); return box.y + box.height / 2; };
  const fretX = async n => { const box = await main.locator(`[data-fret="${n}"]`).boundingBox(); return box.x + box.width / 2; };
  const between = async (a, b) => ((await fretX(a)) + (await fretX(b))) / 2;
  const behindNut = async () => { const box = await neck.boundingBox(); return box.x + box.width * 0.05; };
  const choose = async id => { await main.locator(`[data-strings="pick-${id}"]`).click(); assert.equal(await neck.getAttribute('data-instrument'), id); await neck.scrollIntoViewIfNeeded(); };
  const touch = async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); const name = await note(); await page.mouse.up(); return name; };
  await neck.scrollIntoViewIfNeeded();

  // Mandolin: a touch between the 4th and 5th frets of the top string (E5) sounds the 5th fret, A5; the open string is behind the nut.
  assert.equal(await neck.getAttribute('data-instrument'), 'mandolin');
  assert.equal(await touch(await between(4, 5), await stringY(0)), 'A5');
  await page.mouse.move(await behindNut(), await stringY(1));
  await page.mouse.down();
  assert.equal(await note(), 'A4', 'behind the nut is the open string');
  // Dragging across to the string below strums it, at the same place on the neck.
  await page.mouse.move(await behindNut(), await stringY(2), { steps: 6 });
  assert.equal(await note(), 'D4');
  await page.mouse.up();
  // The open strings are buttons too, named by their notes.
  await main.getByRole('button', { name: 'Play the G3 string' }).click();
  assert.equal(await note(), 'G3');

  // A guitar has six strings, and the lowest, E2, at the 5th fret is A2.
  await choose('guitar');
  assert.equal(await main.locator('[data-string]').count(), 6);
  assert.equal(await touch(await between(4, 5), await stringY(5)), 'A2');
  assert.equal(await touch(await behindNut(), await stringY(0)), 'E4');

  // A ukulele is re-entrant: its 4th string, G4, is higher than the C above it.
  await choose('ukulele');
  await main.getByRole('button', { name: 'Play the G4 string' }).click();
  assert.equal(await note(), 'G4');
  assert.equal(await touch(await behindNut(), await stringY(2)), 'C4');

  // A banjo's 5th string is a short drone starting at the 5th fret: open it is G4, and the 7th fret is two semitones up.
  await choose('banjo');
  assert.equal(await main.locator('[data-string]').count(), 5);
  assert.equal(await touch(await behindNut(), await stringY(4)), 'G4');
  assert.equal(await touch(await between(6, 7), await stringY(4)), 'A4');

  // A violin has no frets, but the notes are marks on the neck: the 7th mark of the A string is E5, and moving up a string gives B5.
  await choose('violin');
  await page.mouse.move(await fretX(7), await stringY(1));
  await page.mouse.down();
  assert.equal(await note(), 'E5');
  await page.mouse.move(await fretX(7), await stringY(0), { steps: 6 });
  assert.equal(await note(), 'B5');
  await page.mouse.up();

  // A cello is bowed too, and can be plucked instead (pizzicato); its A string is A3.
  await choose('cello');
  await main.getByRole('button', { name: 'Play the A3 string' }).click();
  assert.equal(await note(), 'A3');
  await main.getByLabel('Pizzicato').check();
  assert.equal(await main.getByLabel('Vibrato').count(), 0, 'no vibrato on a plucked note');
  assert.equal(await touch(await fretX(5), await stringY(1)), 'G3');

  // The instrument is kept: the page opens on the cello next time.
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('paibot.strings')).instrument), 'cello');
  console.log('PASS: strings: mandolin, guitar, ukulele, banjo, violin and cello - frets, open strings, strums, a re-entrant tuning, a drone string, bowing and pizzicato');
}
