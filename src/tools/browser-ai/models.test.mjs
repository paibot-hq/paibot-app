import assert from 'node:assert/strict';
import test from 'node:test';
import { FEATURED, MODELS, makers, modelById, overall, plan, splitThinking } from './models.ts';

test('the small model runs anywhere, the larger ones need WebGPU', () => {
  const small = modelById('qwen3-0.6b');
  assert.deepEqual(plan(small, { f16: true }).load, { engine: 'transformers', repo: 'onnx-community/Qwen3-0.6B-ONNX', dtype: 'q4f16', device: 'webgpu' });
  assert.equal(plan(small, { f16: true }).sizeMB, 570);
  // Without 16-bit floats in shaders, or without WebGPU, the CPU with 8-bit weights.
  for (const gpu of [{ f16: false }, null]) assert.deepEqual(plan(small, gpu), { device: 'wasm', sizeMB: 618, load: { engine: 'transformers', repo: 'onnx-community/Qwen3-0.6B-ONNX', dtype: 'q8', device: 'wasm' } });
  for (const model of MODELS.filter(m => m.engine === 'webllm')) {
    assert.equal(plan(model, null), undefined, model.id);
    assert.match(plan(model, { f16: true }).load.model, /-q4f16_1-MLC$/);
    // Without 16-bit floats, the 32-bit build where there is one (Gemma 3 1B has none).
    assert.equal(plan(model, { f16: false })?.load.model, model.f32 ? `${model.mlc}-q4f32_1-MLC` : undefined, model.id);
  }
  assert.equal(plan(modelById('gemma3-1b-it'), { f16: false }), undefined);
  assert.deepEqual(plan(modelById('Qwen3-4B'), { f16: true }).load, { engine: 'webllm', model: 'Qwen3-4B-q4f16_1-MLC', thinks: true, reasons: false });
  assert.deepEqual(plan(modelById('DeepSeek-R1-Distill-Qwen-7B'), { f16: true }).load, { engine: 'webllm', model: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC', thinks: false, reasons: true });
  assert.equal(plan(modelById('gemma-2-2b-jpn-it'), { f16: true }).load.thinks, false);
});

test('the list is whole: unique ids, sizes, the featured ones in it, makers in order', () => {
  assert.equal(new Set(MODELS.map(m => m.id)).size, MODELS.length);
  for (const model of MODELS) {
    assert.ok(model.name && model.maker, model.id);
    if (model.engine === 'webllm') assert.ok(model.sizeMB > 100 && model.vramMB > model.sizeMB / 2 && model.libs.length === (model.f32 ? 2 : 1), model.id);
  }
  for (const id of FEATURED) assert.ok(modelById(id), id);
  assert.equal(makers()[0], 'Alibaba');
  assert.ok(makers().includes('Google') && makers().includes('Meta'));
});

test('overall progress sums the files', () => {
  assert.deepEqual(overall({}), { loaded: 0, total: 0, ratio: 0 });
  assert.deepEqual(overall({ a: { loaded: 50, total: 100 }, b: { loaded: 0, total: 300 } }), { loaded: 50, total: 400, ratio: 0.125 });
  assert.equal(overall({ a: { loaded: 120, total: 100 } }).ratio, 1);
});

test('the thinking is held back, the answer is shown', () => {
  assert.deepEqual(splitThinking('<think>\n\n</think>\n\nHello'), { answer: 'Hello', thinking: false });
  assert.deepEqual(splitThinking('<think>still thinking'), { answer: '', thinking: true });
  assert.deepEqual(splitThinking('Plain answer with <think> inside'), { answer: 'Plain answer with <think> inside', thinking: false });
  assert.deepEqual(splitThinking('Tokyo.\n\n \n'), { answer: 'Tokyo.', thinking: false });
  // A model that always reasons may start without <think>.
  assert.deepEqual(splitThinking('Okay, the user asks', true), { answer: '', thinking: true });
  assert.deepEqual(splitThinking('Okay, the user asks...\n</think>\n\nTokyo.', true), { answer: 'Tokyo.', thinking: false });
});
