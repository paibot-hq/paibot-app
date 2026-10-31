// What the engines have saved in the browser (the Cache API, under this site's origin), so it can be shown and deleted.
// Each file is a cache entry keyed by its URL, and the URL names the model: Hugging Face's repository for the weights,
// and for WebLLM also its compiled model on GitHub (".../Qwen3-4B-q4f16_1_cs1k-webgpu.wasm").
import { MODELS, type ModelId, type ModelInfo } from "./models.ts";

// Transformers.js keeps everything in one cache (the ONNX runtime's wasm too); WebLLM splits it in three.
export const CACHE_NAMES = ["transformers-cache", "webllm/model", "webllm/wasm", "webllm/config"] as const;

const marker = (model: ModelInfo) => model.engine === "transformers" ? `/${model.repo}/` : `/${model.mlc}-q4`;

// The model a cached file belongs to, or "other" (a model the page no longer offers). The ONNX runtime (from jsDelivr)
// counts as the Transformers.js model's: it is the only one that runs on it.
export function ownerOf(url: string): ModelId | "other" {
  if (url.includes("/onnxruntime-web@")) return MODELS.find(model => model.engine === "transformers")!.id;
  return MODELS.find(model => url.includes(marker(model)))?.id ?? "other";
}

export type Stored = Partial<Record<ModelId | "other", number>>;

// Bytes per owner, from each response's Content-Length (a few small files have none and count as 0). An owner is listed
// once it has any file, a download stopped halfway included.
export async function scanStored(): Promise<Stored> {
  const stored: Stored = {};
  if (typeof caches === "undefined") return stored;
  for (const name of CACHE_NAMES) {
    if (!await caches.has(name)) continue;
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      const owner = ownerOf(request.url);
      stored[owner] = (stored[owner] ?? 0) + Number(response?.headers.get("content-length") ?? 0);
    }
  }
  return stored;
}

// Deletes one owner's files, or (undefined) every cache the engines use.
export async function deleteStored(owner?: ModelId | "other") {
  for (const name of CACHE_NAMES) {
    if (owner === undefined) {
      await caches.delete(name);
      continue;
    }
    if (!await caches.has(name)) continue;
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      if (ownerOf(request.url) === owner) await cache.delete(request);
    }
  }
}
