// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// How many pixels of the canvas are not the dark background.
const painted = canvas => canvas.evaluate(element => {
  const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] > 40 || data[i + 1] > 40 || data[i + 2] > 70) count++;
  return count;
});

export default async function ({ page, main, go }) {
  await go('kaleidoscope');
  const canvas = main.locator('canvas');
  assert.equal(await painted(canvas), 0, 'the canvas starts empty');
  // A stroke with the mouse is drawn, copied round the centre.
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
  const few = await painted(canvas);
  assert.ok(few > 500, 'the stroke is drawn');
  // More segments spread the same stroke into more copies, so more is painted.
  await main.getByLabel('Segments').fill('20');
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.65, { steps: 8 });
  await page.mouse.up();
  assert.ok((await painted(canvas)) > few, 'more is painted with more segments');
  // Clear empties it; the automatic mode draws by itself.
  await main.locator('[data-kaleidoscope="clear"]').click();
  assert.equal(await painted(canvas), 0, 'clear empties the canvas');
  await main.locator('[data-kaleidoscope="auto"]').click();
  await main.getByRole('button', { name: 'Drawing by itself' }).waitFor();
  await page.waitForFunction(() => { const c = document.querySelector('main canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 40 || d[i + 1] > 40 || d[i + 2] > 70) n++; return n > 800; }, undefined, { timeout: 8000 });
  await main.locator('[data-kaleidoscope="auto"]').click();
  await main.getByRole('button', { name: 'Save image' }).waitFor();
  console.log('PASS: kaleidoscope: a stroke is copied round the centre, more segments paint more, clear, automatic drawing');
}
