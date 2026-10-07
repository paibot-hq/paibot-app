// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The photos are made here (fixture.mjs) with the metadata a phone's photo has.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { phonePhoto, phonePng, TINY_JPEG } from './fixture.mjs';
import { readMetadata } from './exif.ts';

export default async function ({ page, main, go }) {
  await go('exif');
  assert.match(await main.locator('[data-exif="privacy"]').innerText(), /never uploaded/);
  // No request carries the photo anywhere: nothing but the page's own files is asked for after a photo is chosen.
  const requests = [];
  // (Clerk's own start-up call, which has nothing to do with the photo, is not counted.)
  page.on('request', request => { if (request.method() !== 'GET' && !/clerk/i.test(request.url())) requests.push(`${request.method()} ${request.url()}`); });

  // A phone's photo: what can say where, when and who is listed, the position has a map link, and the extras are named.
  await main.locator('[data-exif="file"]').setInputFiles({ name: 'holiday.jpg', mimeType: 'image/jpeg', buffer: phonePhoto({ orientation: 6 }) });
  await main.locator('[data-exif="result"]').waitFor();
  const verdict = await main.locator('[data-exif="verdict"]').innerText();
  for (const expected of ['Where it was taken (GPS coordinates)', 'When it was taken', 'Numbers that identify the camera', "The photographer's name"]) assert.ok(verdict.includes(expected), expected);
  assert.match(await main.locator('[data-exif="place"]').innerText(), /Latitude 35\.689500, longitude 139\.691667/);
  const map = await main.locator('[data-exif="place"] a').getAttribute('href');
  assert.match(map, /^https:\/\/www\.openstreetmap\.org\/\?mlat=35\.689500&mlon=139\.691667/);
  assert.equal(await main.locator('[data-exif="place"] a').getAttribute('target'), '_blank');
  assert.match(await main.locator('[data-exif="place"] a').getAttribute('rel'), /noopener/);
  const text = await main.locator('[data-exif="result"]').innerText();
  for (const expected of ['holiday.jpg', 'TestCam', 'TC-100', 'SN12345', 'Taro Yamada', '1/250', 'f/1.8', '2026-10-05 14:03:20', '6（Rotated 90° right）', 'XMP', 'Extra data stuck on the end of the file']) assert.ok(text.includes(expected), expected);
  assert.equal(await main.locator('[data-exif-group]').count() >= 4, true);

  // Removing the metadata saves the same photo without it (and keeps only its orientation); what is left is counted from the saved file.
  const download = page.waitForEvent('download');
  await main.locator('[data-exif="clean"]').click();
  const file = await download;
  assert.equal(file.suggestedFilename(), 'holiday-clean.jpg');
  const saved = new Uint8Array(await readFile(await file.path()));
  const after = readMetadata(saved);
  assert.deepEqual(after.tags.map(tag => tag.key), ['Orientation']);
  assert.equal(after.gps, null);
  assert.ok(!Buffer.from(saved).toString('latin1').includes('TestCam'));
  assert.ok(Buffer.from(saved).includes(TINY_JPEG.subarray(TINY_JPEG.indexOf(Buffer.from([0xff, 0xdb])))), 'the picture is untouched');
  await main.locator('[data-exif="cleaned"]').waitFor();
  assert.match(await main.locator('[data-exif="cleaned"]').innerText(), /Items left in the saved photo: 0/);

  // A PNG: its text (what a picture maker wrote) is listed, and the copy has none of it.
  await main.locator('[data-exif="file"]').setInputFiles({ name: 'art.png', mimeType: 'image/png', buffer: phonePng() });
  await page.waitForFunction(() => document.querySelector('[data-exif="name"]')?.textContent === 'art.png');
  assert.ok((await main.locator('[data-exif="result"]').innerText()).includes('a red fox, seed 42'));
  const pngDownload = page.waitForEvent('download');
  await main.locator('[data-exif="clean"]').click();
  const pngFile = await pngDownload;
  assert.equal(pngFile.suggestedFilename(), 'art-clean.png');
  assert.ok(!Buffer.from(await readFile(await pngFile.path())).toString('latin1').includes('red fox'));

  // A photo with nothing in it says so; a file that is not a picture is refused.
  await main.locator('[data-exif="file"]').setInputFiles({ name: 'plain.jpg', mimeType: 'image/jpeg', buffer: TINY_JPEG });
  await page.waitForFunction(() => document.querySelector('[data-exif="name"]')?.textContent === 'plain.jpg');
  assert.match(await main.locator('[data-exif="verdict"]').innerText(), /No place, time or owner information was found/);
  await main.locator('[data-exif="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a picture') });
  await main.getByRole('alert').waitFor();
  assert.deepEqual(requests, [], 'nothing was sent anywhere');
  console.log('PASS: exif: a photo\'s position, time, camera and owner are listed with a map link, the copy without them keeps the picture and its orientation, PNG text is shown and removed, an empty photo and a non-picture are told, nothing is uploaded');
}
