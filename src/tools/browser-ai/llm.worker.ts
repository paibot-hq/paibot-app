/// <reference lib="webworker" />
// Runs the language model off the page, with Transformers.js or WebLLM (see models.ts), each imported only when used. The
// weights come from Hugging Face and stay in the browser's cache for the next visit; the ONNX runtime's wasm comes from
// jsDelivr and WebLLM's compiled models from GitHub. This worker is a static asset, outside the site's CSP.
import type { MLCEngine } from "@mlc-ai/web-llm";
import type { InterruptableStoppingCriteria, PreTrainedModel, PreTrainedTokenizer } from "@huggingface/transformers";
import type { LoadRequest } from "./models";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type WorkerRequest =
  | { type: "load"; load: LoadRequest }
  | { type: "generate"; messages: ChatMessage[] }
  | { type: "stop" };

export type WorkerResponse =
  // Transformers.js reports each file in bytes, WebLLM only a share of the whole.
  | { type: "progress"; file: string; loaded: number; total: number }
  | { type: "ratio"; ratio: number }
  | { type: "ready" }
  | { type: "token"; text: string }
  | { type: "done"; tokens: number; seconds: number }
  | { type: "error"; message: string };

const post = (message: WorkerResponse) => self.postMessage(message);

type Engine = { generate(messages: ChatMessage[]): Promise<void>; stop(): void };
let engine: Engine | undefined;

const SAMPLING = { temperature: 0.7, top_p: 0.8 };

async function transformers(repo: string, dtype: string, device: "webgpu" | "wasm"): Promise<Engine> {
  const { AutoModelForCausalLM, AutoTokenizer, InterruptableStoppingCriteria, TextStreamer, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  const progress_callback = (info: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (info.status === "progress" && info.file) post({ type: "progress", file: info.file, loaded: info.loaded ?? 0, total: info.total ?? 0 });
  };
  const tokenizer: PreTrainedTokenizer = await AutoTokenizer.from_pretrained(repo, { progress_callback });
  const model: PreTrainedModel = await AutoModelForCausalLM.from_pretrained(repo, { dtype: dtype as "q4f16", device, progress_callback });
  // One short run first, so the GPU's shaders are compiled before the first question.
  await model.generate({ ...tokenizer("a"), max_new_tokens: 1 });
  const stopping: InterruptableStoppingCriteria = new InterruptableStoppingCriteria();
  return {
    async generate(messages) {
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
      await model.generate({ ...inputs, max_new_tokens: 1024, do_sample: true, ...SAMPLING, repetition_penalty: 1.05, streamer, stopping_criteria: stopping });
      // Speed from the first token on: the time before it is reading the question.
      post({ type: "done", tokens, seconds: tokens > 1 ? (performance.now() - start) / 1000 : 0 });
    },
    stop: () => stopping.interrupt(),
  };
}

async function webllm(model: string, thinks: boolean, reasons: boolean): Promise<Engine> {
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  // Its progress starts again from 0 for each step after the download (onto the GPU, the shaders): those count as done.
  const initProgressCallback = (report: { progress: number; text: string }) => post({ type: "ratio", ratio: report.text.startsWith("Fetching") ? report.progress : 1 });
  const mlc: MLCEngine = await CreateMLCEngine(model, { initProgressCallback });
  return {
    async generate(messages) {
      const chunks = await mlc.chat.completions.create({
        messages,
        stream: true,
        stream_options: { include_usage: true },
        // A model that reasons first needs room for that before its answer.
        max_tokens: reasons ? 4096 : 1024,
        ...SAMPLING,
        // Only for a model that thinks (Qwen3): WebLLM otherwise still puts an empty <think></think> before the answer.
        ...thinks ? { extra_body: { enable_thinking: false } } : {},
      });
      let tokens = 0;
      let speed = 0;
      for await (const chunk of chunks) {
        const text = chunk.choices[0]?.delta.content;
        if (text) post({ type: "token", text });
        if (chunk.usage) {
          tokens = chunk.usage.completion_tokens;
          speed = chunk.usage.extra.decode_tokens_per_s ?? 0;
        }
      }
      post({ type: "done", tokens, seconds: speed > 0 ? tokens / speed : 0 });
    },
    stop: () => mlc.interruptGenerate(),
  };
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "stop") return engine?.stop();
  try {
    if (request.type === "load") {
      const load = request.load;
      engine = load.engine === "webllm" ? await webllm(load.model, load.thinks, load.reasons) : await transformers(load.repo, load.dtype, load.device);
      post({ type: "ready" });
    } else {
      if (!engine) throw new Error("The model is not loaded");
      await engine.generate(request.messages);
    }
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
});
