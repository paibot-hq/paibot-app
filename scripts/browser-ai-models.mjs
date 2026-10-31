import { writeFileSync } from 'node:fs';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';

// Writes src/tools/browser-ai/webllm-models.json, the WebLLM models the AI chat offers: the ones picked below, each with
// its download size (summed from the weights' index on Hugging Face), the GPU memory WebLLM says it needs and the file
// names of its compiled model (which several models can share: the page counts a saved one as the first's). Run it
// after updating @mlc-ai/web-llm (`node scripts/browser-ai-models.mjs`); a model the package no longer has is an error.
//
// thinks: can think before answering, which the page turns off. reasons: always thinks first (the page shows only the answer).
// english: made for English (and some European languages), not Japanese or Chinese; the page says so in those.
const PICKED = [
  ['Alibaba', 'Qwen3-1.7B', 'Qwen3 1.7B', { thinks: true }],
  ['Alibaba', 'Qwen3-4B', 'Qwen3 4B', { thinks: true }],
  ['Alibaba', 'Qwen3-8B', 'Qwen3 8B', { thinks: true }],
  ['Alibaba', 'Qwen3.5-0.8B', 'Qwen3.5 0.8B', { thinks: true }],
  ['Alibaba', 'Qwen3.5-2B', 'Qwen3.5 2B', { thinks: true }],
  ['Alibaba', 'Qwen3.5-4B', 'Qwen3.5 4B', { thinks: true }],
  ['Alibaba', 'Qwen3.5-9B', 'Qwen3.5 9B', { thinks: true }],
  ['Alibaba', 'Qwen2.5-0.5B-Instruct', 'Qwen2.5 0.5B'],
  ['Alibaba', 'Qwen2.5-1.5B-Instruct', 'Qwen2.5 1.5B'],
  ['Alibaba', 'Qwen2.5-3B-Instruct', 'Qwen2.5 3B'],
  ['Alibaba', 'Qwen2.5-7B-Instruct', 'Qwen2.5 7B'],
  ['Alibaba', 'Qwen2.5-Coder-1.5B-Instruct', 'Qwen2.5 Coder 1.5B'],
  ['Alibaba', 'Qwen2.5-Coder-7B-Instruct', 'Qwen2.5 Coder 7B'],
  ['Alibaba', 'Qwen2.5-Math-1.5B-Instruct', 'Qwen2.5 Math 1.5B'],
  ['Google', 'gemma-2-2b-jpn-it', 'Gemma 2 2B JPN'],
  ['Google', 'gemma-2-2b-it', 'Gemma 2 2B'],
  ['Google', 'gemma-2-9b-it', 'Gemma 2 9B'],
  ['Google', 'gemma3-1b-it', 'Gemma 3 1B'],
  ['Google', 'gemma-4-E2B-it', 'Gemma 4 E2B'],
  ['Meta', 'Llama-3.2-1B-Instruct', 'Llama 3.2 1B', { english: true }],
  ['Meta', 'Llama-3.2-3B-Instruct', 'Llama 3.2 3B', { english: true }],
  ['Meta', 'Llama-3.1-8B-Instruct', 'Llama 3.1 8B', { english: true }],
  ['Microsoft', 'Phi-3.5-mini-instruct', 'Phi-3.5 mini'],
  ['Microsoft', 'Phi-4-mini-instruct', 'Phi-4 mini'],
  ['Mistral AI', 'Ministral-3-3B-Instruct-2512-BF16', 'Ministral 3 3B'],
  ['Mistral AI', 'Ministral-3-3B-Reasoning-2512', 'Ministral 3 3B Reasoning', { reasons: true }],
  ['Mistral AI', 'Mistral-7B-Instruct-v0.3', 'Mistral 7B v0.3', { english: true }],
  ['DeepSeek', 'DeepSeek-R1-Distill-Qwen-7B', 'DeepSeek R1 Distill Qwen 7B', { reasons: true }],
  ['DeepSeek', 'DeepSeek-R1-Distill-Llama-8B', 'DeepSeek R1 Distill Llama 8B', { reasons: true }],
  ['Hugging Face', 'SmolLM2-360M-Instruct', 'SmolLM2 360M', { english: true }],
  ['Hugging Face', 'SmolLM2-1.7B-Instruct', 'SmolLM2 1.7B', { english: true }],
  ['Ai2', 'OLMo-2-0425-1B-Instruct', 'OLMo 2 1B', { english: true }],
  ['Ai2', 'OLMo-2-1124-7B-Instruct', 'OLMo 2 7B', { english: true }],
  ['Nous Research', 'Hermes-3-Llama-3.2-3B', 'Hermes 3 Llama 3.2 3B', { english: true }],
  ['TinyLlama', 'TinyLlama-1.1B-Chat-v1.0', 'TinyLlama 1.1B', { english: true }],
];

const byId = new Map(prebuiltAppConfig.model_list.map(record => [record.model_id, record]));

async function downloadBytes(repoUrl) {
  for (const index of ['tensor-cache.json', 'ndarray-cache.json']) {
    const response = await fetch(`${repoUrl}/resolve/main/${index}`);
    if (response.ok) return (await response.json()).records.reduce((sum, record) => sum + record.nbytes, 0);
  }
  throw new Error(`No weights index in ${repoUrl}`);
}

const models = [];
for (const [maker, mlc, name, flags = {}] of PICKED) {
  const record = byId.get(`${mlc}-q4f16_1-MLC`);
  if (!record) throw new Error(`WebLLM has no ${mlc}-q4f16_1-MLC`);
  const sizeMB = Math.round(await downloadBytes(record.model) / 1e6);
  const f32 = byId.get(`${mlc}-q4f32_1-MLC`);
  const libs = [record, f32].filter(Boolean).map(r => r.model_lib.split('/').at(-1));
  models.push({ mlc, name, maker, sizeMB, vramMB: Math.round(record.vram_required_MB), f32: Boolean(f32), libs, ...flags });
  console.log(`${name}: ${sizeMB} MB`);
}
writeFileSync(new URL('../src/tools/browser-ai/webllm-models.json', import.meta.url), JSON.stringify(models, null, 2) + '\n');
