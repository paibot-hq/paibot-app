import assert from 'node:assert/strict';
import test from 'node:test';
import { MODELS, modelById, overall, plan, visibleText } from './models.ts';

test('the small model runs anywhere, the larger ones need WebGPU', () => {
  const small = modelById('qwen3-0.6b');
  assert.deepEqual(plan(small, { f16: true }).load, { engine: 'transformers', repo: 'onnx-community/Qwen3-0.6B-ONNX', dtype: 'q4f16', device: 'webgpu' });
  assert.equal(plan(small, { f16: true }).sizeMB, 570);
  // Without 16-bit floats in shaders, or without WebGPU, the CPU with 8-bit weights.
  for (const gpu of [{ f16: false }, null]) assert.deepEqual(plan(small, gpu), { device: 'wasm', sizeMB: 618, load: { engine: 'transformers', repo: 'onnx-community/Qwen3-0.6B-ONNX', dtype: 'q8', device: 'wasm' } });
  for (const model of MODELS.filter(m => m.engine === 'webllm')) {
    assert.equal(plan(model, null), undefined, model.id);
    assert.match(plan(model, { f16: true }).load.model, /-q4f16_1-MLC$/);
    assert.match(plan(model, { f16: false }).load.model, /-q4f32_1-MLC$/);
  }
  assert.deepEqual(plan(modelById('qwen3-4b'), { f16: true }).load, { engine: 'webllm', model: 'Qwen3-4B-q4f16_1-MLC', thinks: true });
  assert.equal(plan(modelById('gemma2-2b-jpn'), { f16: true }).load.thinks, false);
});

test('overall progress sums the files', () => {
  assert.deepEqual(overall({}), { loaded: 0, total: 0, ratio: 0 });
  assert.deepEqual(overall({ a: { loaded: 50, total: 100 }, b: { loaded: 0, total: 300 } }), { loaded: 50, total: 400, ratio: 0.125 });
  assert.equal(overall({ a: { loaded: 120, total: 100 } }).ratio, 1);
});

test('the thinking block is hidden, the answer is kept', () => {
  assert.equal(visibleText('<think>\n\n</think>\n\nHello'), 'Hello');
  assert.equal(visibleText('<think>still thinking'), '');
  assert.equal(visibleText('Plain answer with <think> inside'), 'Plain answer with <think> inside');
  assert.equal(visibleText('Tokyo.\n\n \n'), 'Tokyo.');
});
