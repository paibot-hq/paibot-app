// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The camera is stood in for by a picture made
// in the page: grey (no finger) for a second, then red that dims with a pulse of 75 beats a minute, as a fingertip over
// the lens looks. It runs in real time (the picture is a live video stream, which the page's clock does not move): about
// twenty-five seconds.
import assert from 'node:assert/strict';

const BPM = 75;

export default async function ({ page, main, go }) {
  await page.addInitScript(bpm => {
    const tracks = [];
    window.__cameraTracks = tracks;
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      const started = performance.now();
      const paint = () => {
        const t = (performance.now() - started) / 1000;
        if (t < 1) ctx.fillStyle = 'rgb(120,120,120)';
        else {
          const phase = ((t * bpm) / 60) % 1;
          const beat = Math.exp(-((phase - 0.15) ** 2) / 0.006);
          ctx.fillStyle = `rgb(${Math.round(190 - 14 * beat)},20,25)`;
        }
        ctx.fillRect(0, 0, 64, 48);
        requestAnimationFrame(paint);
      };
      paint();
      const stream = canvas.captureStream(30);
      tracks.push(...stream.getVideoTracks());
      return stream;
    };
  }, BPM);
  await go('heart-rate');
  const status = main.locator('[data-heart="status"]');

  await main.locator('[data-heart="start"]').click();
  // No finger yet: asked to cover the camera; then the red: measuring, with the wave drawn and the seconds counting down.
  await page.waitForFunction(() => /cover the camera/.test(document.querySelector('[data-heart="status"]').textContent));
  await page.waitForFunction(() => document.querySelector('[data-heart="stage"]').dataset.phase === 'measuring', undefined, { timeout: 10000 });
  assert.match(await status.innerText(), /\d+s left/);
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-heart="stage"] canvas');
    return c && c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some(v => v > 0);
  });

  // After twenty seconds: the rate, near the pulse shown, and sharing it; the camera is off again.
  await main.locator('[data-heart="result"]').waitFor({ timeout: 40000 });
  const bpm = Number(await main.locator('[data-heart="bpm"]').evaluate(el => el.firstChild.textContent));
  assert.ok(Math.abs(bpm - BPM) <= 3, `${bpm} bpm`);
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), new RegExp(`${bpm} bpm`));
  assert.ok(await page.evaluate(() => window.__cameraTracks.every(track => track.readyState === 'ended')), 'the camera is stopped');
  console.log(`PASS: heart-rate: asked to cover the camera, the pulse wave while measuring, ${bpm} bpm from a ${BPM} bpm fingertip, shared, the camera stopped`);
}
