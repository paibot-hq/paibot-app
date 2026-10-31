// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The model itself (hundreds of MB from
// Hugging Face) is not downloaded here: the flow checks the page up to the point of loading it.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, errors }) {
  await go('browser-ai');
  // The device is found (the test browser has no WebGPU adapter, or has one: either is fine).
  await page.waitForFunction(() => !/Checking/.test(document.querySelector('[data-ai="device"]').textContent));
  const device = await page.locator('[data-ai="device"]').textContent();
  assert.match(device, /GPU \(WebGPU\)|CPU \(WebAssembly\)/);
  const small = main.getByRole('button', { name: /Qwen3 0\.6B/ });
  const large = main.getByRole('button', { name: /Qwen3 4B/ });
  assert.equal(await small.getAttribute('aria-pressed'), 'true');
  if (/WebAssembly/.test(device)) {
    // The larger models need a GPU and cannot be picked.
    assert.ok(await large.isDisabled());
    assert.match(await large.textContent(), /Needs a GPU/);
    await main.getByRole('button', { name: 'Load the model (about 618 MB)' }).waitFor();
  } else {
    await large.click();
    await main.getByRole('button', { name: 'Load the model (about 2263 MB)' }).waitFor();
  }
  // Nothing to type into until a model is loaded.
  assert.ok(await main.getByLabel('Message', { exact: true }).isDisabled());
  assert.ok(await main.getByRole('button', { name: 'Send' }).isDisabled());
  assert.match(await page.locator('[data-ai="log"]').textContent(), /Load a model first/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1100, height: 900 });
  assert.deepEqual(errors, []);
  console.log('PASS: browser-ai: device found, model choice with its size, the GPU-only model, input waits for a model, mobile width');
}
