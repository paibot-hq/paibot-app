// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// A fingerprint of the picture: how many pixels are not the dark background, and a sum over them.
const fingerprint = canvas => canvas.evaluate(element => {
  const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
  let count = 0, sum = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] > 50 || data[i + 1] > 50 || data[i + 2] > 80) { count++; sum += data[i] + data[i + 1] * 3 + data[i + 2] * 7 + (i % 9973); }
  return `${count}:${sum}`;
});

export default async function ({ page, main, go }) {
  await go('fourier');
  const canvas = main.locator('canvas');
  const stats = main.locator('[data-fourier="stats"]');
  assert.match(await stats.textContent(), /30 of 256 circles.*Heart/);
  await page.waitForTimeout(600);
  assert.ok(Number((await fingerprint(canvas)).split(':')[0]) > 800, 'the circles and the curve are drawn');
  // Fewer circles, another example.
  await main.getByLabel('Circles', { exact: true }).fill('5');
  await page.waitForFunction(() => /^5 of 256 circles/.test(document.querySelector('[data-fourier="stats"]').textContent));
  await main.getByRole('button', { name: 'Star', exact: true }).click();
  await page.waitForFunction(() => /Star/.test(document.querySelector('[data-fourier="stats"]').textContent));
  // A stroke drawn with the mouse becomes the picture that the circles redraw.
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    await page.mouse.move(box.x + box.width * (0.5 - 0.2 * Math.cos(a)), box.y + box.height * (0.5 - 0.2 * Math.sin(a)));
  }
  await page.mouse.up();
  await page.waitForFunction(() => /Your drawing/.test(document.querySelector('[data-fourier="stats"]').textContent));
  await main.getByRole('button', { name: 'Circles and arms' }).click();
  await main.getByRole('button', { name: 'Original picture' }).click();
  await page.waitForTimeout(300);
  assert.ok(Number((await fingerprint(canvas)).split(':')[0]) > 300, 'the drawn picture is redrawn');
  console.log('PASS: fourier: circles redraw an example, the circle count and examples change, and a stroke drawn by hand is redrawn');
}
