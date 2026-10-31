// What the engines have saved in the browser (the Cache API, under this site's origin), so it can be shown and deleted.
// Each file is a cache entry keyed by its URL, and the URL names the model: Hugging Face's repository for the weights,
// and for WebLLM its compiled model on GitHub (".../Qwen3-4B-q4f16_1_cs1k-webgpu.wasm", see webllm-models.json).
import { MODELS, type ModelId, type ModelInfo } from "./models.ts";

// Transformers.js keeps everything in one cache (the ONNX runtime's wasm too); WebLLM splits it in three.
export const CACHE_NAMES = ["transformers-cache", "webllm/model", "webllm/wasm", "webllm/config"] as const;

const owns = (model: ModelInfo, url: string) => model.engine === "transformers"
  ? url.includes(`/${model.repo}/`)
  : url.includes(`/${model.mlc}-q4`) || model.libs.some(lib => url.endsWith(`/${lib}`));

// The models a cached file can belong to: one for its weights, several for a compiled model they share (Qwen2.5 7B's is
// DeepSeek R1 Distill Qwen 7B's too). The ONNX runtime (from jsDelivr) counts as the Transformers.js model's, the only
// one that runs on it.
function candidates(url: string): ModelId[] {
  if (url.includes("/onnxruntime-web@")) return MODELS.filter(model => model.engine === "transformers").map(model => model.id);
  return MODELS.filter(model => owns(model, url)).map(model => model.id);
}

// The model a cached file belongs to, or "other" (a model the page no longer offers). A shared file goes to a model whose
// own files are saved (present), so it is not listed under one never downloaded, else to the first.
export function ownerOf(url: string, present: ReadonlySet<ModelId> = new Set()): ModelId | "other" {
  const ids = candidates(url);
  return ids.find(id => present.has(id)) ?? ids[0] ?? "other";
}

type Entry = { cache: Cache; request: Request; bytes: number; owner: ModelId | "other" };

// Every file the engines saved, each with its size (Content-Length; a few small files have none and count as 0) and owner.
async function entries(): Promise<Entry[]> {
  const found: Omit<Entry, "owner">[] = [];
  if (typeof caches === "undefined") return [];
  for (const name of CACHE_NAMES) {
    if (!await caches.has(name)) continue;
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      found.push({ cache, request, bytes: Number(response?.headers.get("content-length") ?? 0) });
    }
  }
  const present = new Set(found.map(entry => candidates(entry.request.url)).filter(ids => ids.length === 1).map(ids => ids[0]));
  return found.map(entry => ({ ...entry, owner: ownerOf(entry.request.url, present) }));
}

export type Stored = Partial<Record<ModelId | "other", number>>;

// Bytes per owner. An owner is listed once it has any file, a download stopped halfway included.
export async function scanStored(): Promise<Stored> {
  const stored: Stored = {};
  for (const entry of await entries()) stored[entry.owner] = (stored[entry.owner] ?? 0) + entry.bytes;
  return stored;
}

// Deletes one owner's files, or (undefined) every cache the engines use.
export async function deleteStored(owner?: ModelId | "other") {
  if (owner === undefined) {
    for (const name of CACHE_NAMES) await caches.delete(name);
    return;
  }
  for (const entry of await entries()) {
    if (entry.owner === owner) await entry.cache.delete(entry.request);
  }
}
