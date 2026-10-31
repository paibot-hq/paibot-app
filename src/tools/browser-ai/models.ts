// The models the page offers, run by one of two engines in the worker:
// - Transformers.js (ONNX builds by onnx-community): the small model, the one that also runs on the CPU through WebAssembly.
// - WebLLM (MLC builds by mlc-ai): the larger ones, WebGPU only. Their weights come in shards of a few tens of MB; the larger
//   ONNX builds are single files of over a gigabyte, which ran out of memory (Qwen3 1.7B) or gave garbage (Qwen2.5 1.5B).
// The sizes are the weights each one downloads (rounded MB), for the note before loading.

export type Device = "webgpu" | "wasm";

// What the browser offers: a WebGPU adapter, and whether its shaders can use 16-bit floats (most can; without, the larger
// models use their 32-bit builds and the small one goes to the CPU).
export type Gpu = { f16: boolean } | null;

type Common = { id: "qwen3-0.6b" | "qwen3-1.7b" | "gemma2-2b-jpn" | "qwen3-4b"; name: string };
export type ModelInfo =
  | Common & { engine: "transformers"; repo: string; dtype: Partial<Record<Device, "q4f16" | "q8">>; sizeMB: Partial<Record<Device, number>> }
  | Common & { engine: "webllm"; mlc: string; sizeMB: number; thinks?: true };

export const MODELS: readonly ModelInfo[] = [
  { id: "qwen3-0.6b", name: "Qwen3 0.6B", engine: "transformers", repo: "onnx-community/Qwen3-0.6B-ONNX", dtype: { webgpu: "q4f16", wasm: "q8" }, sizeMB: { webgpu: 570, wasm: 618 } },
  { id: "qwen3-1.7b", name: "Qwen3 1.7B", engine: "webllm", mlc: "Qwen3-1.7B", sizeMB: 968, thinks: true },
  { id: "gemma2-2b-jpn", name: "Gemma 2 2B JPN", engine: "webllm", mlc: "gemma-2-2b-jpn-it", sizeMB: 1471 },
  { id: "qwen3-4b", name: "Qwen3 4B", engine: "webllm", mlc: "Qwen3-4B", sizeMB: 2263, thinks: true },
];

export type ModelId = ModelInfo["id"];

export const modelById = (id: string) => MODELS.find(model => model.id === id);

export type LoadRequest =
  | { engine: "transformers"; repo: string; dtype: string; device: Device }
  // thinks: the model can think before answering, which the page turns off.
  | { engine: "webllm"; model: string; thinks: boolean };

export type Plan = { device: Device; sizeMB: number; load: LoadRequest };

// How the model runs here, or undefined when it cannot.
export function plan(model: ModelInfo, gpu: Gpu): Plan | undefined {
  if (model.engine === "webllm") {
    if (!gpu) return undefined;
    return { device: "webgpu", sizeMB: model.sizeMB, load: { engine: "webllm", model: `${model.mlc}-${gpu.f16 ? "q4f16_1" : "q4f32_1"}-MLC`, thinks: model.thinks ?? false } };
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

// Qwen3 can think before answering; the page turns that off, but an empty <think></think> may still come first. Gemma ends
// with blank lines.
export const visibleText = (text: string) => text.replace(/^\s*<think>[\s\S]*?(<\/think>\s*|$)/, "").trimEnd();
