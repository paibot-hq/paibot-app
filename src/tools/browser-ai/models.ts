// The models the page offers, run by one of two engines in the worker:
// - Transformers.js (ONNX builds by onnx-community): the small model, the one that also runs on the CPU through WebAssembly.
// - WebLLM (MLC builds by mlc-ai): the rest, WebGPU only, listed in webllm-models.json (scripts/browser-ai-models.mjs). Their
//   weights come in shards of a few tens of MB; the larger ONNX builds are single files of over a gigabyte, which ran out
//   of memory (Qwen3 1.7B) or gave garbage (Qwen2.5 1.5B).
// The sizes are the weights each one downloads (rounded MB), for the note before loading.
import WEBLLM_MODELS from "./webllm-models.json" with { type: "json" };

export type Device = "webgpu" | "wasm";

// What the browser offers: a WebGPU adapter, and whether its shaders can use 16-bit floats (most can; without, WebLLM's
// models use their 32-bit builds, when they have one, and the small one goes to the CPU).
export type Gpu = { f16: boolean } | null;

type Common = { id: string; name: string; maker: string };
export type ModelInfo =
  | Common & { engine: "transformers"; repo: string; dtype: Partial<Record<Device, "q4f16" | "q8">>; sizeMB: Partial<Record<Device, number>> }
  // thinks: can think before answering, which the page turns off. reasons: always thinks first, and only the answer is shown.
  // libs: the file names of its compiled model (in 16- and 32-bit), which several models can share.
  // english: made for English, not Japanese or Chinese.
  | Common & { engine: "webllm"; mlc: string; sizeMB: number; vramMB: number; f32: boolean; libs: string[]; thinks?: boolean; reasons?: boolean; english?: boolean };

export const MODELS: readonly ModelInfo[] = [
  { id: "qwen3-0.6b", name: "Qwen3 0.6B", maker: "Alibaba", engine: "transformers", repo: "onnx-community/Qwen3-0.6B-ONNX", dtype: { webgpu: "q4f16", wasm: "q8" }, sizeMB: { webgpu: 570, wasm: 618 } },
  ...WEBLLM_MODELS.map(model => ({ ...model, id: model.mlc, engine: "webllm" as const })),
];

// The ones shown as buttons; the rest are in a list by maker.
export const FEATURED = ["qwen3-0.6b", "gemma-2-2b-jpn-it", "Qwen3.5-2B", "Qwen3-4B"];

export type ModelId = string;

export const modelById = (id: string) => MODELS.find(model => model.id === id);

// The makers in the order their first model comes.
export const makers = () => [...new Set(MODELS.map(model => model.maker))];

export const reasons = (model: ModelInfo) => model.engine === "webllm" && model.reasons === true;

export type LoadRequest =
  | { engine: "transformers"; repo: string; dtype: string; device: Device }
  | { engine: "webllm"; model: string; thinks: boolean; reasons: boolean };

export type Plan = { device: Device; sizeMB: number; load: LoadRequest };

// How the model runs here, or undefined when it cannot.
export function plan(model: ModelInfo, gpu: Gpu): Plan | undefined {
  if (model.engine === "webllm") {
    if (!gpu || !gpu.f16 && !model.f32) return undefined;
    const load = { engine: "webllm" as const, model: `${model.mlc}-${gpu.f16 ? "q4f16_1" : "q4f32_1"}-MLC`, thinks: model.thinks ?? false, reasons: model.reasons ?? false };
    return { device: "webgpu", sizeMB: model.sizeMB, load };
  }
  const device: Device | undefined = gpu?.f16 && model.dtype.webgpu ? "webgpu" : model.dtype.wasm ? "wasm" : undefined;
  if (!device) return undefined;
  return { device, sizeMB: model.sizeMB[device]!, load: { engine: "transformers", repo: model.repo, dtype: model.dtype[device]!, device } };
}

// Download progress over several files, as Transformers.js reports it file by file (a file's total is known once it starts).
export type FileProgress = { loaded: number; total: number };

export function overall(files: Record<string, FileProgress>) {
  let loaded = 0;
  let total = 0;
  for (const file of Object.values(files)) {
    loaded += file.loaded;
    total += file.total;
  }
  return { loaded, total, ratio: total > 0 ? Math.min(1, loaded / total) : 0 };
}

// The answer without the thinking before it, and whether the model is still thinking. A model that always reasons
// (DeepSeek R1) may start without <think>, its chat template having written that; Qwen3 with thinking off may still give an
// empty <think></think> first. Gemma ends with blank lines.
export function splitThinking(text: string, reasoning = false): { answer: string; thinking: boolean } {
  const end = text.indexOf("</think>");
  if (end >= 0) return { answer: text.slice(end + "</think>".length).trim(), thinking: false };
  if (reasoning || /^\s*<think>/.test(text)) return { answer: "", thinking: true };
  return { answer: text.trimEnd(), thinking: false };
}
