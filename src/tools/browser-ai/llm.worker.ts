/// <reference lib="webworker" />
// Runs the language model off the page. Transformers.js downloads the weights from Hugging Face (kept in the browser's cache
// for the next visit) and the ONNX runtime's wasm from jsDelivr; this worker is a static asset, outside the site's CSP.
import { AutoModelForCausalLM, AutoTokenizer, InterruptableStoppingCriteria, TextStreamer, env } from "@huggingface/transformers";
import type { PreTrainedModel, PreTrainedTokenizer } from "@huggingface/transformers";
import type { Device } from "./models";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type WorkerRequest =
  | { type: "load"; repo: string; dtype: string; device: Device }
  | { type: "generate"; messages: ChatMessage[] }
  | { type: "stop" };

export type WorkerResponse =
  | { type: "progress"; file: string; loaded: number; total: number }
  | { type: "ready" }
  | { type: "token"; text: string }
  | { type: "done"; tokens: number; seconds: number }
  | { type: "error"; message: string };

env.allowLocalModels = false;

const post = (message: WorkerResponse) => self.postMessage(message);
const stopping = new InterruptableStoppingCriteria();
let tokenizer: PreTrainedTokenizer | undefined;
let model: PreTrainedModel | undefined;

async function load(repo: string, dtype: string, device: Device) {
  const progress_callback = (info: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (info.status === "progress" && info.file) post({ type: "progress", file: info.file, loaded: info.loaded ?? 0, total: info.total ?? 0 });
  };
  tokenizer = await AutoTokenizer.from_pretrained(repo, { progress_callback });
  model = await AutoModelForCausalLM.from_pretrained(repo, { dtype: dtype as "q4f16", device, progress_callback });
  // One short run first, so the GPU's shaders are compiled before the first question.
  await model.generate({ ...tokenizer("a"), max_new_tokens: 1 });
  post({ type: "ready" });
}

async function generate(messages: ChatMessage[]) {
  if (!tokenizer || !model) throw new Error("The model is not loaded");
  // enable_thinking is not in the options' type, but extra options reach the chat template (Qwen3's reads it).
  const options = { add_generation_prompt: true, return_dict: true, enable_thinking: false } as const;
  const inputs = tokenizer.apply_chat_template(messages, options) as Record<string, unknown>;
  let tokens = 0;
  let start = 0;
  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => post({ type: "token", text }),
    token_callback_function: () => {
      if (tokens++ === 0) start = performance.now();
    },
  });
  stopping.reset();
  await model.generate({ ...inputs, max_new_tokens: 1024, do_sample: true, temperature: 0.7, top_p: 0.8, repetition_penalty: 1.05, streamer, stopping_criteria: stopping });
  // Speed from the first token on: the time before it is reading the question.
  post({ type: "done", tokens, seconds: tokens > 1 ? (performance.now() - start) / 1000 : 0 });
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "stop") return stopping.interrupt();
  try {
    if (request.type === "load") await load(request.repo, request.dtype, request.device);
    else await generate(request.messages);
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
});
