import assert from 'node:assert/strict';
import test from 'node:test';
import { MODELS, modelById, overall, runsOn, visibleText } from './models.ts';

test('every model has a size for each device it runs on', () => {
  for (const model of MODELS) {
    assert.deepEqual(Object.keys(model.dtype).sort(), Object.keys(model.sizeMB).sort(), model.id);
    assert.ok(runsOn(model, 'webgpu'), model.id);
  }
  assert.ok(runsOn(modelById('qwen3-0.6b'), 'wasm'));
  assert.equal(runsOn(modelById('lfm2-1.2b'), 'wasm'), false);
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
});
