// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('metronome');
  const bpm = () => main.locator('[data-metronome="bpm"]').innerText();
  assert.equal(await bpm(), '120');

  // The nudge buttons and the arrow keys change the tempo, and the name follows it.
  await main.getByRole('button', { name: '+10 BPM' }).click();
  assert.equal(await bpm(), '130');
  await main.getByRole('button', { name: '−1 BPM' }).click();
  assert.equal(await bpm(), '129');
  await main.getByText('Allegro').first().waitFor();
  await page.keyboard.press('ArrowDown');
  assert.equal(await bpm(), '128');

  // Four evenly spaced taps set the tempo (about 0.5 s apart: 120).
  const tapButton = main.locator('[data-metronome="tap"]');
  for (let i = 0; i < 4; i++) { await tapButton.click(); await page.waitForTimeout(500); }
  const tapped = Number(await bpm());
  assert.ok(tapped >= 100 && tapped <= 140, `tapping about twice a second gives about 120 (got ${tapped})`);

  // Running: the beat light moves on, bar after bar, and stops with the button.
  await main.getByRole('button', { name: '3', exact: true }).click();
  await main.getByRole('button', { name: 'Start' }).click();
  const panel = main.locator('[data-beat]');
  const seen = new Set();
  const until = Date.now() + 4000;
  while (Date.now() < until && seen.size < 3) { const now = await panel.getAttribute('data-beat'); if (now !== '-1') seen.add(now); await page.waitForTimeout(40); }
  assert.ok(seen.has('0') && seen.has('1') && seen.has('2'), `the light goes round three beats (saw ${[...seen]})`);
  await main.getByRole('button', { name: 'Stop' }).click();
  await page.waitForFunction(() => document.querySelector('[data-beat]').dataset.beat === '-1');
  console.log('PASS: metronome: nudge, keys, tap tempo, beats per bar, start and stop');
}
