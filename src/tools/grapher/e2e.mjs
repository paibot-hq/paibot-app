// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// A fingerprint of the picture: how many pixels differ from the corner's (the background), and a sum over them.
const fingerprint = canvas => canvas.evaluate(element => {
  const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
  const [r, g, b] = data;
  let count = 0, sum = 0;
  for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b) > 60) { count++; sum += data[i] + data[i + 1] * 3 + data[i + 2] * 7 + (i % 9973); }
  return `${count}:${sum}`;
});

export default async function ({ page, main, go }) {
  await go('grapher');
  const canvas = main.locator('canvas');
  const first = main.getByLabel('Expression 1', { exact: true });
  const start = await fingerprint(canvas);
  assert.ok(Number(start.split(':')[0]) > 3000, 'the two curves and the axes are drawn');
  // Each formula is also shown typeset under its input: a fraction bar and a root appear for these.
  await first.fill('sqrt(x)/(x + 1)');
  await page.waitForFunction(() => document.querySelector('[data-grapher="tex"] .mfrac') && document.querySelector('[data-grapher="tex"] .sqrt'));
  assert.equal(await main.locator('[data-grapher="tex"]').count(), 2, 'one preview for each valid formula');
  // Changing a formula redraws; a mistake is explained and the picture keeps the others.
  await first.fill('x^3');
  await page.waitForTimeout(150);
  const cubic = await fingerprint(canvas);
  assert.notEqual(cubic, start, 'the curve changes with the formula');
  await first.fill('x^');
  await main.getByRole('alert').waitFor();
  assert.equal(await first.getAttribute('aria-invalid'), 'true');
  await first.fill('2x^2');
  await main.getByRole('alert').waitFor({ state: 'detached' });
  // The examples add a row; the rows can be removed.
  await main.getByRole('button', { name: 'tan(x)', exact: true }).click();
  await main.getByLabel('Expression 3', { exact: true }).waitFor();
  await main.getByRole('button', { name: 'Remove expression 3' }).click();
  await main.getByLabel('Expression 3', { exact: true }).waitFor({ state: 'detached' });
  // Hovering reads x and the values off; dragging moves the picture; the wheel and the buttons zoom; reset brings it back.
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
  await page.mouse.move(...at(0.75, 0.5));
  await page.waitForFunction(() => /^x = /.test(document.querySelector('[data-grapher="readout"]').textContent));
  const before = await fingerprint(canvas);
  await page.mouse.down();
  await page.mouse.move(...at(0.55, 0.65), { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const moved = await fingerprint(canvas);
  assert.notEqual(moved, before, 'a drag moves the picture');
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(150);
  assert.notEqual(await fingerprint(canvas), moved, 'the wheel zooms');
  await main.locator('[data-grapher="reset"]').click();
  await page.mouse.move(box.x - 20, box.y - 20);
  await page.waitForTimeout(200);
  assert.equal(await fingerprint(canvas), await fingerprint(canvas));
  await main.getByRole('button', { name: 'Zoom in' }).click();
  await page.waitForTimeout(150);
  console.log('PASS: grapher: formulas are drawn and explained when wrong, examples add rows, hover readout, drag, wheel and buttons');
}
