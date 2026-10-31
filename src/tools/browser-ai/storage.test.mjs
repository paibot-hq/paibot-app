import assert from 'node:assert/strict';
import test from 'node:test';
import { ownerOf } from './storage.ts';

test('a cached file belongs to the model its URL names', () => {
  assert.equal(ownerOf('https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX/resolve/main/onnx/model_q4f16.onnx'), 'qwen3-0.6b');
  assert.equal(ownerOf('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0/dist/ort-wasm-simd-threaded.asyncify.wasm'), 'qwen3-0.6b');
  // WebLLM: the weights, in either precision, and the compiled model.
  assert.equal(ownerOf('https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC/resolve/main/params_shard_7.bin'), 'Qwen3-1.7B');
  assert.equal(ownerOf('https://huggingface.co/mlc-ai/Qwen3-4B-q4f32_1-MLC/resolve/main/mlc-chat-config.json'), 'Qwen3-4B');
  assert.equal(ownerOf('https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_87/base/gemma-2-2b-jpn-it-q4f16_1_cs1k-webgpu.wasm'), 'gemma-2-2b-jpn-it');
  // Names that start alike stay apart; a compiled model several share counts as the first one's...
  assert.equal(ownerOf('https://huggingface.co/mlc-ai/Qwen3.5-4B-q4f16_1-MLC/resolve/main/params_shard_0.bin'), 'Qwen3.5-4B');
  assert.equal(ownerOf('https://huggingface.co/mlc-ai/gemma-2-2b-it-q4f16_1-MLC/resolve/main/params_shard_0.bin'), 'gemma-2-2b-it');
  assert.equal(ownerOf('https://huggingface.co/mlc-ai/Hermes-3-Llama-3.2-3B-q4f16_1-MLC/resolve/main/params_shard_0.bin'), 'Hermes-3-Llama-3.2-3B');
  const shared = 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_87/base/Qwen2-7B-Instruct-q4f16_1_cs1k-webgpu.wasm';
  assert.equal(ownerOf(shared), 'Qwen2.5-7B-Instruct');
  // ...unless another model that uses it has its own files saved.
  assert.equal(ownerOf(shared, new Set(['DeepSeek-R1-Distill-Qwen-7B'])), 'DeepSeek-R1-Distill-Qwen-7B');
  assert.equal(ownerOf(shared, new Set(['Qwen2.5-Coder-7B-Instruct', 'DeepSeek-R1-Distill-Qwen-7B'])), 'Qwen2.5-Coder-7B-Instruct');
  // Models the page no longer offers.
  assert.equal(ownerOf('https://huggingface.co/onnx-community/Qwen2.5-1.5B-Instruct/resolve/main/onnx/model_q4f16.onnx'), 'other');
  assert.equal(ownerOf('https://huggingface.co/onnx-community/Qwen3-1.7B-ONNX/resolve/main/onnx/model_q4f16.onnx'), 'other');
});
