// The models the page offers, all ONNX builds on Hugging Face (onnx-community) that Transformers.js runs in the browser.
// The sizes are the weights each one downloads (rounded MB), for the note before loading.

export type Device = "webgpu" | "wasm";

export type ModelInfo = {
  id: "qwen3-0.6b" | "lfm2-1.2b";
  repo: string;
  name: string;
  // Weights per device: quantized to 4 bit with fp16 on the GPU, 8 bit on the CPU (wasm has no fp16). Missing: the model is too big for the CPU.
  dtype: Partial<Record<Device, "q4f16" | "q8">>;
  sizeMB: Partial<Record<Device, number>>;
};

export const MODELS: readonly ModelInfo[] = [
  { id: "qwen3-0.6b", repo: "onnx-community/Qwen3-0.6B-ONNX", name: "Qwen3 0.6B", dtype: { webgpu: "q4f16", wasm: "q8" }, sizeMB: { webgpu: 570, wasm: 618 } },
  { id: "lfm2-1.2b", repo: "onnx-community/LFM2-1.2B-ONNX", name: "LFM2 1.2B", dtype: { webgpu: "q4f16" }, sizeMB: { webgpu: 760 } },
];

export type ModelId = ModelInfo["id"];

export const modelById = (id: string) => MODELS.find(model => model.id === id);

// Whether the model can run on this device.
export const runsOn = (model: ModelInfo, device: Device) => model.dtype[device] !== undefined;

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

// Qwen3 can think before answering; the page turns that off, but an empty <think></think> may still come first.
export const visibleText = (text: string) => text.replace(/^\s*<think>[\s\S]*?(<\/think>\s*|$)/, "");
