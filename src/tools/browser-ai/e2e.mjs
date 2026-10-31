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
    // The others are in a list by maker, each with what it needs.
    await main.getByLabel(/More models/).selectOption({ label: 'DeepSeek R1 Distill Qwen 7B · about 4284 MB' });
    assert.equal(await large.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('[data-ai="model-info"]').textContent(), 'DeepSeek R1 Distill Qwen 7B (DeepSeek) · GPU memory about 5.1 GB · Thinks before answering (takes longer)');
    await main.getByText(/A large model, for computers with 16 GB/).waitFor();
    await main.getByRole('button', { name: 'Load the model (about 4284 MB)' }).waitFor();
  }
  if (/WebAssembly/.test(device)) assert.ok(await page.locator('option', { hasText: 'Gemma 3 1B' }).evaluate(option => option.disabled));
  assert.equal(await page.locator('optgroup').count(), 10);
  // Nothing to type into until a model is loaded.
  assert.ok(await main.getByLabel('Message', { exact: true }).isDisabled());
  assert.ok(await main.getByRole('button', { name: 'Send' }).isDisabled());
  assert.match(await page.locator('[data-ai="log"]').textContent(), /Load a model first/);
  // Saved models: none yet; files put in the engines' caches show up by model, and can be deleted one by one or all at once.
  const stored = page.locator('[data-ai="stored"]');
  await stored.getByText('No models are saved.').waitFor();
  await page.evaluate(async () => {
    const put = async (name, url, bytes) => (await caches.open(name)).put(url, new Response('x', { headers: { 'content-length': String(bytes) } }));
    await put('webllm/model', 'https://huggingface.co/mlc-ai/Qwen3-4B-q4f16_1-MLC/resolve/main/params_shard_0.bin', 2.2e9);
    await put('webllm/wasm', 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_87/base/Qwen3-4B-q4f16_1_cs1k-webgpu.wasm', 6e6);
    await put('transformers-cache', 'https://huggingface.co/onnx-community/Qwen2.5-1.5B-Instruct/resolve/main/onnx/model_q4f16.onnx', 1.2e9);
  });
  await go('browser-ai');
  await stored.getByRole('listitem').nth(1).waitFor();
  assert.deepEqual(await stored.getByRole('listitem').allTextContents(), ['Qwen3 4B2.2 GBDelete', 'Other (models no longer offered, etc.)1.2 GBDelete']);
  page.once('dialog', dialog => dialog.accept());
  await stored.getByRole('button', { name: 'Delete Qwen3 4B' }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-ai="stored"] li').length === 1);
  page.once('dialog', dialog => dialog.dismiss());
  await stored.getByRole('button', { name: 'Delete all (1.2 GB in total)' }).click();
  assert.equal(await stored.getByRole('listitem').count(), 1);
  page.once('dialog', dialog => dialog.accept());
  await stored.getByRole('button', { name: 'Delete all (1.2 GB in total)' }).click();
  await stored.getByText('No models are saved.').waitFor();
  assert.deepEqual(await page.evaluate(() => caches.keys()), []);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1100, height: 900 });
  assert.deepEqual(errors, []);
  console.log('PASS: browser-ai: device found, model choice with its size, the list by maker, the GPU-only models, input waits for a model, saved models listed and deleted, mobile width');
}
