// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// A fingerprint of what is drawn: how many pixels are not the dark background, and their sum.
const fingerprint = canvas => canvas.evaluate(element => {
  const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
  let count = 0, sum = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] > 40 || data[i + 1] > 40 || data[i + 2] > 70) { count++; sum += data[i] + data[i + 1] * 3 + data[i + 2] * 7; }
  return { count, sum };
});

export default async function ({ page, main, go }) {
  await go('polyhedra');
  const canvas = main.locator('canvas');
  const stats = main.locator('[data-polyhedra="stats"]');
  assert.match(await stats.textContent(), /20 vertices.*30 edges.*12 faces/, 'it starts with the dodecahedron');
  // Each solid has its numbers, and V - E + F is 2 for all of them.
  for (const [name, text] of [['Tetrahedron', /4 vertices.*6 edges.*4 faces/], ['Cube', /8 vertices.*12 edges.*6 faces/], ['Octahedron', /6 vertices.*12 edges.*8 faces/], ['Icosahedron', /12 vertices.*30 edges.*20 faces/]]) {
    await main.getByRole('button', { name, exact: true }).click();
    await page.waitForFunction(([expected]) => new RegExp(expected).test(document.querySelector('[data-polyhedra="stats"]').textContent), [text.source]);
  }
  assert.ok((await fingerprint(canvas)).count > 3000, 'the solid is drawn');
  // A prism's faces grow with its corners; a geodesic polyhedron's with how finely it is cut.
  const see = text => page.waitForFunction(expected => new RegExp(expected).test(document.querySelector('[data-polyhedra="stats"]').textContent), text.source);
  await main.getByRole('button', { name: 'Prism', exact: true }).click();
  await see(/5-gonal prism: 10 vertices.*15 edges.*7 faces/);
  await main.getByLabel('Corners', { exact: true }).fill('8');
  await see(/8-gonal prism: 16 vertices.*24 edges.*10 faces/);
  await main.getByRole('button', { name: 'Pyramid', exact: true }).click();
  await see(/5-gonal pyramid: 6 vertices.*10 edges.*6 faces/);
  await main.getByRole('button', { name: 'Geodesic sphere', exact: true }).click();
  await see(/frequency 2\): 42 vertices.*120 edges.*80 faces/);
  await main.getByLabel('Frequency', { exact: true }).fill('4');
  await see(/frequency 4\): 162 vertices.*480 edges.*320 faces/);
  assert.ok((await fingerprint(canvas)).count > 3000, 'the geodesic polyhedron is drawn');
  // Switching off the spin, a drag turns it.
  await main.locator('[data-polyhedra="auto"]').click();
  await main.getByRole('button', { name: 'Spin by itself' }).waitFor();
  await page.waitForTimeout(1500);
  const before = await fingerprint(canvas);
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  assert.notDeepEqual(await fingerprint(canvas), before, 'a drag turns the solid');
  // Wireframe draws less than the solid.
  const solid = (await fingerprint(canvas)).count;
  await main.getByRole('button', { name: 'Wireframe' }).click();
  await page.waitForTimeout(300);
  const wire = (await fingerprint(canvas)).count;
  assert.ok(wire > 200 && wire < solid, 'the wireframe is drawn');
  console.log('PASS: polyhedra: the five solids with their V, E, F, a drag turns the solid, wireframe');
}
