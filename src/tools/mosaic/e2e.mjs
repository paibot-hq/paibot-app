// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The photos are made here: stripes (so that a mosaic is easy to tell from the
// original) on green.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export default async function ({ page, main, go }) {
  await go('mosaic');
  assert.match(await main.locator('[data-mosaic="privacy"]').innerText(), /never uploaded/);
  const requests = [];
  // (Clerk's own start-up call, which has nothing to do with the photo, is not counted.)
  page.on('request', request => { if (request.method() !== 'GET' && !/clerk/i.test(request.url())) requests.push(`${request.method()} ${request.url()}`); });

  // A picture of stripes 4 px wide (black, white) in a block of the picture, on green, as a PNG.
  const make = (width, height, block) => page.evaluate(async ([w, h, b]) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const context = canvas.getContext('2d');
    context.fillStyle = '#00a000'; context.fillRect(0, 0, w, h);
    for (let x = b.x; x < b.x + b.w; x += 4) { context.fillStyle = ((x - b.x) / 4) % 2 === 0 ? '#000' : '#fff'; context.fillRect(x, b.y, 4, b.h); }
    return (await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))).arrayBuffer().then(buffer => Array.from(new Uint8Array(buffer)));
  }, [width, height, block]).then(bytes => Buffer.from(bytes));
  const pixel = (x, y) => page.evaluate(([px, py]) => Array.from(document.querySelector('[data-mosaic="canvas"]').getContext('2d').getImageData(px, py, 1, 1).data.slice(0, 3)), [x, y]);
  const canvas = main.locator('[data-mosaic="canvas"]');
  const drag = async (from, to) => {
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + from[0], box.y + from[1]);
    await page.mouse.down();
    await page.mouse.move(box.x + (from[0] + to[0]) / 2, box.y + (from[1] + to[1]) / 2, { steps: 4 });
    await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 4 });
    await page.mouse.up();
  };

  await main.locator('[data-mosaic="file"]').setInputFiles({ name: 'stripes.png', mimeType: 'image/png', buffer: await make(400, 300, { x: 0, y: 0, w: 400, h: 300 }) });
  await canvas.waitFor();
  assert.deepEqual(await pixel(100, 100), [255, 255, 255], 'the stripes are shown as they are (4 px each, black first)');
  assert.deepEqual(await pixel(104, 100), [0, 0, 0]);

  // A rectangle becomes a mosaic: the same colour all over a cell (30 px here), the stripes gone, and nothing outside it touched.
  await drag([100, 100], [300, 250]);
  await page.waitForFunction(() => document.querySelector('[data-mosaic="count"]').textContent.includes('1'));
  const a = await pixel(105, 105), b = await pixel(125, 112);
  assert.deepEqual(a, b, 'one cell is one colour');
  assert.ok(a[0] > 40 && a[0] < 215, 'the stripes are averaged, not kept');
  assert.deepEqual(await pixel(50, 50), [0, 0, 0], 'outside the region the picture is as it was');
  assert.deepEqual(await pixel(104, 90), [0, 0, 0]);

  // Undo and redo; a click without a drag adds nothing.
  await main.locator('[data-mosaic="undo"]').click();
  assert.deepEqual(await pixel(105, 105), [0, 0, 0]);
  await main.locator('[data-mosaic="redo"]').click();
  assert.deepEqual(await pixel(105, 105), a);
  await drag([20, 20], [21, 21]);
  assert.match(await main.locator('[data-mosaic="count"]').innerText(), /Hidden areas: 1/);

  // An ellipse leaves the corners of its box alone; black is black; the pen paints along the stroke.
  await main.locator('[data-mosaic="shape-ellipse"]').click();
  await main.locator('[data-mosaic="effect-black"]').click();
  await drag([310, 20], [390, 90]);
  assert.deepEqual(await pixel(350, 55), [0, 0, 0]);
  assert.deepEqual(await pixel(314, 24), [0, 0, 0], 'a black stripe pixel stays a stripe pixel at the corner of the box');
  assert.deepEqual(await pixel(316, 24), [255, 255, 255], 'and a white one stays white: the corner is not covered');
  await main.locator('[data-mosaic="shape-pen"]').click();
  await main.locator('[data-mosaic="effect-blur"]').click();
  await main.locator('[data-mosaic="pen"]').fill('30');
  await drag([20, 200], [120, 200]);
  const blurred = await pixel(70, 200);
  assert.ok(blurred[0] > 30 && blurred[0] < 225, 'the stroke is blurred');
  assert.deepEqual(await pixel(70, 260), [255, 255, 255], 'away from the stroke it is as it was');
  assert.match(await main.locator('[data-mosaic="count"]').innerText(), /Hidden areas: 3/);

  // Saving makes a file from the picture: its name, its size, and the regions on it.
  const download = page.waitForEvent('download');
  await main.locator('[data-mosaic="save"]').click();
  const file = await download;
  assert.equal(file.suggestedFilename(), 'stripes-hidden.png');
  const saved = await readFile(await file.path());
  const inside = await page.evaluate(async bytes => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const at = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3));
    return { width: bitmap.width, height: bitmap.height, cell: [at(105, 105), at(125, 112)], black: at(350, 55), outside: at(50, 50) };
  }, Array.from(saved));
  assert.deepEqual([inside.width, inside.height], [400, 300]);
  assert.deepEqual(inside.cell[0], inside.cell[1]);
  assert.deepEqual(inside.black, [0, 0, 0]);
  assert.deepEqual(inside.outside, [0, 0, 0]);
  await main.locator('[data-mosaic="saved"]').waitFor();

  // A large photo is shown smaller but saved at its own size, with the mosaic made on the full-size picture.
  await main.locator('[data-mosaic="file"]').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: await make(3000, 2000, { x: 0, y: 0, w: 3000, h: 2000 }) });
  await page.waitForFunction(() => document.querySelector('[data-mosaic="count"]').textContent.includes(': 0') && document.querySelector('[data-mosaic="canvas"]').height !== 300);
  assert.ok(await canvas.evaluate(element => element.width) < 3000, 'a large photo is shown smaller');
  await main.locator('[data-mosaic="shape-rect"]').click();
  await main.locator('[data-mosaic="effect-mosaic"]').click();
  const shown = await canvas.evaluate(element => element.width);
  await drag([Math.round(shown * 0.2), 40], [Math.round(shown * 0.6), 160]);
  const bigDownload = page.waitForEvent('download');
  await main.locator('[data-mosaic="save"]').click();
  const big = await bigDownload;
  const result = await page.evaluate(async bytes => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    // Find the changed block: the first pixel of the region where two pixels 3 px apart (a black and a white stripe in the original) are now equal.
    const row = context.getImageData(0, 300, bitmap.width, 1).data;
    let first = -1, last = -1;
    for (let x = 0; x + 4 < bitmap.width; x++) if (row[x * 4] === row[(x + 4) * 4] && row[x * 4] !== 0 && row[x * 4] !== 255) { if (first < 0) first = x; last = x; }
    return { width: bitmap.width, height: bitmap.height, first, last };
  }, Array.from(await readFile(await big.path())));
  assert.deepEqual([result.width, result.height], [3000, 2000], 'saved at the photo\'s own size');
  assert.ok(result.first >= 0 && result.last - result.first > 300, 'the region is a mosaic on the full-size picture');

  // Not a picture: refused.
  await main.locator('[data-mosaic="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a picture') });
  await main.getByRole('alert').waitFor();
  assert.deepEqual(requests, [], 'nothing was sent anywhere');
  console.log('PASS: mosaic: a rectangle becomes a mosaic of whole cells and leaves the rest alone, undo and redo, ellipse, black and pen, saved as a file at the photo\'s own size with the regions on it, a non-picture is refused, nothing is uploaded');
}
