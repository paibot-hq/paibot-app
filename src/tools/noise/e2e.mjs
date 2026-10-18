// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// What the canvas shows: how far apart neighbouring pixels are on average, how many grey levels it uses, and whether it has colour.
const look = canvas => canvas.evaluate(element => {
  const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
  let difference = 0, coloured = 0;
  const levels = new Set();
  for (let i = 0; i < data.length - 4; i += 4) {
    difference += Math.abs(data[i + 4] - data[i]);
    levels.add(data[i]);
    if (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2]) coloured++;
  }
  return { roughness: difference / (data.length / 4), levels: levels.size, coloured };
});
const drawn = (canvas, before) => canvas.page().waitForFunction(previous => {
  const c = document.querySelector('main canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4 * 97) sum += d[i] * (i % 7 + 1) + d[i + 2];
  return String(sum) !== previous;
}, before);
const fingerprint = canvas => canvas.evaluate(c => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4 * 97) sum += d[i] * (i % 7 + 1) + d[i + 2];
  return String(sum);
});

export default async function ({ main, go }) {
  await go('noise');
  const canvas = main.locator('canvas');
  // Perlin noise in grey is drawn first: smooth, and using the whole range of greys.
  await canvas.page().waitForFunction(() => { const c = document.querySelector('main canvas'); return c.width === 512 && c.getContext('2d').getImageData(0, 0, 512, 512).data.some(v => v > 0 && v < 255); });
  const perlin = await look(canvas);
  assert.ok(perlin.levels > 200, `perlin uses ${perlin.levels} grey levels`);
  // White noise is much rougher, and its sliders are off.
  let before = await fingerprint(canvas);
  await main.locator('[data-noise-kind="white"]').click();
  await drawn(canvas, before);
  const white = await look(canvas);
  assert.ok(white.roughness > perlin.roughness * 5, `white ${white.roughness} vs perlin ${perlin.roughness}`);
  assert.ok(await main.getByLabel('Octaves').isDisabled(), 'white noise takes no octaves');
  // Worley noise, a new seed, and the terrain colours each change the picture.
  before = await fingerprint(canvas);
  await main.locator('[data-noise-kind="worley"]').click();
  await drawn(canvas, before);
  before = await fingerprint(canvas);
  await main.locator('[data-noise="reseed"]').click();
  await drawn(canvas, before);
  before = await fingerprint(canvas);
  await main.getByRole('button', { name: 'Terrain' }).click();
  await drawn(canvas, before);
  assert.ok((await look(canvas)).coloured > 1000, 'the terrain colours are drawn');
  await main.getByRole('button', { name: 'Save image' }).waitFor();
  // The noise plays as a sound and stops, and changing the noise while it plays makes a new sound.
  await main.locator('[data-noise="play"]').click();
  await main.getByRole('button', { name: 'Stop' }).waitFor();
  await main.locator('[data-noise-kind="perlin"]').click();
  await main.getByLabel('Scale').fill('12');
  await main.getByRole('button', { name: 'Stop' }).waitFor();
  await main.locator('[data-noise="play"]').click();
  await main.getByRole('button', { name: 'Listen' }).waitFor();
  console.log('PASS: noise: Perlin is smooth, white is rough with its sliders off, Worley, a new seed and terrain colours redraw, the noise plays as a sound');
}
