// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The photos are made here (fixture.mjs) with the metadata a phone's photo has.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { phonePhoto, phonePng, TINY_JPEG, docx, xlsx } from './fixture.mjs';
import { readImage as readMetadata } from './image.ts';
import { readZip, content, text as zipText } from './zip.ts';

export default async function ({ page, main, go }) {
  await go('metadata');
  assert.match(await main.locator('[data-meta="privacy"]').innerText(), /never uploaded/);
  // No request carries the photo anywhere: nothing but the page's own files is asked for after a photo is chosen.
  const requests = [];
  // (Clerk's own start-up call, which has nothing to do with the photo, is not counted.)
  page.on('request', request => { if (request.method() !== 'GET' && !/clerk/i.test(request.url())) requests.push(`${request.method()} ${request.url()}`); });

  // A phone's photo: what can say where, when and who is listed, the position has a map link, and the extras are named.
  await main.locator('[data-meta="file"]').setInputFiles({ name: 'holiday.jpg', mimeType: 'image/jpeg', buffer: phonePhoto({ orientation: 6 }) });
  await main.locator('[data-meta="result"]').waitFor();
  const verdict = await main.locator('[data-meta="verdict"]').innerText();
  for (const expected of ['A place (GPS coordinates)', 'Times (when it was taken, made or changed)', 'Numbers that identify the camera', 'Names and comments']) assert.ok(verdict.includes(expected), expected);
  assert.match(await main.locator('[data-meta="place"]').innerText(), /Latitude 35\.689500, longitude 139\.691667/);
  const map = await main.locator('[data-meta="place"] a').getAttribute('href');
  assert.match(map, /^https:\/\/www\.openstreetmap\.org\/\?mlat=35\.689500&mlon=139\.691667/);
  assert.equal(await main.locator('[data-meta="place"] a').getAttribute('target'), '_blank');
  assert.match(await main.locator('[data-meta="place"] a').getAttribute('rel'), /noopener/);
  const text = await main.locator('[data-meta="result"]').innerText();
  for (const expected of ['holiday.jpg', 'TestCam', 'TC-100', 'SN12345', 'Taro Yamada', '1/250', 'f/1.8', '2026-10-05 14:03:20', '6（Rotated 90° right）', 'XMP', 'Extra data stuck on the end of the file']) assert.ok(text.includes(expected), expected);
  assert.equal(await main.locator('[data-meta-group]').count() >= 4, true);

  // Removing the metadata saves the same photo without it (and keeps only its orientation); what is left is counted from the saved file.
  const download = page.waitForEvent('download');
  await main.locator('[data-meta="clean"]').click();
  const file = await download;
  assert.equal(file.suggestedFilename(), 'holiday-clean.jpg');
  const saved = new Uint8Array(await readFile(await file.path()));
  const after = readMetadata(saved);
  assert.deepEqual(after.tags.map(tag => tag.key), ['Orientation']);
  assert.equal(after.gps, null);
  assert.ok(!Buffer.from(saved).toString('latin1').includes('TestCam'));
  assert.ok(Buffer.from(saved).includes(TINY_JPEG.subarray(TINY_JPEG.indexOf(Buffer.from([0xff, 0xdb])))), 'the picture is untouched');
  await main.locator('[data-meta="cleaned"]').waitFor();
  assert.match(await main.locator('[data-meta="cleaned"]').innerText(), /Items left in the saved file: 0/);

  // A PNG: its text (what a picture maker wrote) is listed, and the copy has none of it.
  await main.locator('[data-meta="file"]').setInputFiles({ name: 'art.png', mimeType: 'image/png', buffer: phonePng() });
  await page.waitForFunction(() => document.querySelector('[data-meta="name"]')?.textContent === 'art.png');
  assert.ok((await main.locator('[data-meta="result"]').innerText()).includes('a red fox, seed 42'));
  const pngDownload = page.waitForEvent('download');
  await main.locator('[data-meta="clean"]').click();
  const pngFile = await pngDownload;
  assert.equal(pngFile.suggestedFilename(), 'art-clean.png');
  assert.ok(!Buffer.from(await readFile(await pngFile.path())).toString('latin1').includes('red fox'));

  // A photo with nothing in it says so; a file that is not a picture is refused.
  await main.locator('[data-meta="file"]').setInputFiles({ name: 'plain.jpg', mimeType: 'image/jpeg', buffer: TINY_JPEG });
  await page.waitForFunction(() => document.querySelector('[data-meta="name"]')?.textContent === 'plain.jpg');
  assert.match(await main.locator('[data-meta="verdict"]').innerText(), /No author, place or time information was found/);
  await main.locator('[data-meta="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a picture') });
  await main.getByRole('alert').waitFor();
  assert.deepEqual(requests, [], 'nothing was sent anywhere');
  // A Word file: who made it and saved it, the company, the software, a custom property, the names on comments and changes, the small picture and the photo
  // inside are listed; the copy keeps the text, has empty properties, and (when asked) "Author" for every name.
  await main.locator('[data-meta="file"]').setInputFiles({ name: 'plan.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docx() });
  await page.waitForFunction(() => document.querySelector('[data-meta="name"]')?.textContent === 'plan.docx');
  const officeVerdict = await main.locator('[data-meta="verdict"]').innerText();
  for (const expected of ['Times (when it was taken, made or changed)', 'Names and comments', 'A place (GPS coordinates)']) assert.ok(officeVerdict.includes(expected), expected);
  const word = await main.locator('[data-meta="result"]').innerText();
  for (const expected of ['DOCX', 'Taro Yamada', 'Hanako Sato', 'Example & Co', 'Microsoft Office Word', 'ProjectCode', 'X-42', '2026-10-05 14:03:21 UTC', 'Secret plan', 'Tracked changes', 'Photos inside the file carry shooting information']) assert.ok(word.includes(expected), expected);
  assert.equal(await main.locator('[data-meta="anonymize"]').count(), 1);
  await main.locator('[data-meta="anonymize"]').check();
  const wordDownload = page.waitForEvent('download');
  await main.locator('[data-meta="clean"]').click();
  const wordFile = await wordDownload;
  assert.equal(wordFile.suggestedFilename(), 'plan-clean.docx');
  const parts = Object.fromEntries(await Promise.all(readZip(new Uint8Array(await readFile(await wordFile.path()))).map(async entry => [entry.name, zipText(await content(entry))])));
  assert.ok(parts['word/document.xml'].includes('Hello, 世界') && parts['word/document.xml'].includes('w:author="Author"') && !parts['word/document.xml'].includes('Taro'));
  assert.ok(!parts['docProps/core.xml'].includes('Taro') && !parts['docProps/app.xml'].includes('Example') && !parts['docProps/custom.xml'].includes('X-42'));
  assert.ok(!('docProps/thumbnail.jpeg' in parts) && !parts['_rels/.rels'].includes('thumbnail'));
  await main.locator('[data-meta="cleaned"]').waitFor();
  assert.match(await main.locator('[data-meta="cleaned"]').innerText(), /Items left in the saved file: 1/, 'only the one name that is left (Author)');

  // An Excel file is told by its parts, not by its name.
  await main.locator('[data-meta="file"]').setInputFiles({ name: 'budget.xlsx', mimeType: 'application/octet-stream', buffer: xlsx() });
  await page.waitForFunction(() => document.querySelector('[data-meta="name"]')?.textContent === 'budget.xlsx');
  assert.ok((await main.locator('[data-meta="result"]').innerText()).includes('XLSX'));
  console.log("PASS: metadata: a photo's position, time, camera and owner with a map link and a copy without them, PNG text, a Word file's author, company, software, comment names, small picture and inner photo listed and removed (names replaced when asked), an Excel file told by its parts, an empty photo and a non-picture, nothing uploaded");
}
