// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('fireworks');
  const launched = main.locator('[data-fireworks="launched"]');
  const count = () => page.evaluate(() => Number(document.querySelector('[data-fireworks="launched"]')?.textContent));
  assert.equal(await launched.textContent(), '0');
  // A tap on the sky sends one up; so does the button.
  const sky = main.locator('canvas');
  await sky.click({ position: { x: 200, y: 80 } });
  await page.waitForFunction(() => document.querySelector('[data-fireworks="launched"]')?.textContent === '1');
  await main.getByRole('button', { name: 'Launch', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-fireworks="launched"]')?.textContent === '2');
  // The settings: size, colour and kind change what is launched; the note follows the size.
  await main.getByRole('radio', { name: 'No. 10' }).click();
  await main.getByText('Opens to about 300 m across').waitFor();
  await main.getByRole('radio', { name: 'Blue' }).click();
  await main.getByLabel('Kind', { exact: true }).selectOption('heart');
  await sky.click({ position: { x: 300, y: 100 } });
  await page.waitForFunction(() => Number(document.querySelector('[data-fireworks="launched"]')?.textContent) === 3);
  // The sound's delay follows the viewing distance (340 m a second).
  await main.getByText('Sound arrives about 1.8 s later').waitFor();
  await main.getByLabel('Viewing distance').fill('1000');
  await main.getByText('Sound arrives about 2.9 s later').waitFor();
  // With the sound on, a launch and its burst make no error (the sound itself can only be heard by a person).
  await main.getByRole('button', { name: 'Sound: off' }).click();
  await main.getByRole('button', { name: 'Sound: on' }).waitFor();
  await main.getByRole('button', { name: 'Launch', exact: true }).click();
  await page.waitForTimeout(1200);
  await main.getByRole('button', { name: 'Sound: on' }).click();
  // A starmine, a Niagara and the festival launch by themselves.
  const before = await count();
  await main.getByRole('button', { name: 'Starmine', exact: true }).click();
  await page.waitForFunction(start => Number(document.querySelector('[data-fireworks="launched"]')?.textContent) >= start + 4, before, { timeout: 8000 });
  await main.getByRole('button', { name: 'Niagara', exact: true }).click();
  await main.getByRole('button', { name: 'Start the festival' }).click();
  await main.getByRole('button', { name: 'Stop the festival' }).waitFor();
  await main.getByRole('button', { name: 'Stop the festival' }).click();
  // The sky is drawn: some pixel is lit once the fireworks have burst.
  await page.waitForTimeout(1500);
  const lit = await sky.evaluate(canvas => {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 420) bright++;
    return bright;
  });
  assert.ok(lit > 30, 'the sky has bright stars');
  await main.getByRole('button', { name: 'Save image' }).waitFor();
  console.log('PASS: fireworks: tap and button, size, colour and kind, sound delay, starmine, Niagara and festival, the sky is drawn');
}
